import fs, { promises as fsp } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { Command, Option } from '@intrnl/clippy';
import chalk from 'chalk';

import { assertAuthentication, localConfig, request } from '../utils/client.js';
import { EnhancedCommand } from '../utils/cli.js';
import { delay } from '../utils/misc.js';


export class DeployCommand extends EnhancedCommand {
	static paths = [['deploy']];

	static usage = Command.Usage({
		description: 'Create a new deployment',
	});

	directory = Option.String({
		required: true,
		description: 'Asset directory to deploy',
	});

	message = Option.String(['-m', '--message']);
	production = Option.Boolean(['-p', '--production']);

	async execute () {
		assertAuthentication();

		const { promisify } = await import('../utils/cli.js');

		const siteId = localConfig.get('site_id');
		const directory = this.directory;
		const isProduction = this.production;

		if (!siteId) {
			console.log('This project has not been linked yet!');
			return 1;
		}

		const { files, hashes, digests } = await promisify({
			message: 'Traversing asset directory',
			promise: this.traverseDirectory(directory),
		});

		const isAsync = files.length > 100;

		let deployment = await promisify({
			message: 'Creating a deployment',
			promise: request(`/sites/${siteId}/deploys`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				params: {
					title: this.message ? this.message.trim() : '',
				},
				body: JSON.stringify({
					async: isAsync,
					draft: !isProduction,
					files: hashes,
				}),
			}),
		});

		console.log(chalk.gray(`- Deployment created`));

		const deployId = deployment.id;

		if (isAsync) {
			deployment = await promisify({
				message: `Waiting for deployment to be ready`,
				promise: this.pollDeployStatus(siteId, deployId, ['prepared', 'uploading', 'uploaded', 'ready']),
			});
		}

		const deployFiles = deployment.required;

		try {
			for (let idx = 0, len = deployFiles.length; idx < len; idx++) {
				const digest = deployFiles[idx];
				const filename = digests[digest];

				await promisify({
					message: `Uploading files (${idx}/${len})`,
					promise: request(`/deploys/${deployId}/files/${filename}`, {
						method: 'PUT',
						headers: {
							'Content-Type': 'application/octet-stream',
						},
						body: fs.createReadStream(path.join(directory, filename)),
					}),
				});
			}
		}
		catch (error) {
			await promisify({
				message: `Reverting deployment`,
				promise: request(`/deploys/${deployId}/cancel`, {
					method: 'POST',
				}),
			});

			console.log(chalk.gray(`- Deployment reverted`));

			console.error(`Deployment failed!`);
			console.error(error);

			return;
		}

		if (deployment.status !== 'ready') {
			deployment = await promisify({
				message: `Waiting for deployment to go live`,
				promise: this.pollDeployStatus(siteId, deployId, ['ready']),
			});
		}

		console.log(chalk.gray(`- Deployment is now live`));

		const deployUrl = deployment.deploy_ssl_url || deployment.deploy_url;
		const siteUrl = deployment.ssl_url || deployment.url;

		console.log(`Done, deployed ${isProduction ? `to production` : `as draft`}.`);
		console.log(``);

		console.log(`Deployment is now live at ${isProduction ? siteUrl : deployUrl}`);
	}

	async traverseDirectory (directory) {
		const files = [];

		for await (const file of traverse(directory)) {
			files.push(file);
		}

		const hashes = Object.create(null);
		const digests = Object.create(null);

		for (let idx = 0, len = files.length; idx < len; idx++) {
			const filename = files[idx];

			const hash = crypto.createHash('sha1');
			const fd = fs.createReadStream(path.join(directory, filename));

			const digest = await new Promise((resolve) => {
				fd.on('end', () => resolve(hash.digest('hex')));
				fd.pipe(hash);
			});

			hashes[filename] = digest;
			digests[digest] = filename;
		}

		return { files, hashes, digests };
	}

	async pollDeployStatus (siteId, deployId, statuses) {
		const POLL = 1000 * 1.5; // 1.5 seconds
		const TIMEOUT = 1000 * 60 * 3; // 3 minutes

		const deadline = Date.now() + TIMEOUT;

		while (true) {
			const deployment = await request(`/sites/${siteId}/deploys/${deployId}`);
			const deployState = deployment.state;

			if (statuses.includes(deployState)) {
				return deployment;
			}

			if (deployState === 'error') {
				throw new Error(`Deployment ${deployId} had an error`);
			}

			const future = Date.now() + POLL;

			if (future >= deadline) {
				throw new Error(`Timeout while waiting for deployment ${deployId}`);
			}

			await delay(POLL);
		}
	}
}

async function* traverse (pathname, prefix = '.') {
	const listing = await fsp.readdir(pathname, { withFileTypes: true });

	for (const entry of listing) {
		const name = entry.name;

		if (entry.isDirectory()) {
			yield* traverse(path.join(pathname, name), path.join(prefix, name));
		}
		else {
			yield path.join(prefix, name);
		}
	}
}
