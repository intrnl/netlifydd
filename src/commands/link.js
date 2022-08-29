import crypto from 'node:crypto';
import { Command, Option } from '@intrnl/clippy';
import chalk from 'chalk';

import { assertAuthentication, localConfig, request } from '../utils/client.js';
import { AbortError, EnhancedCommand } from '../utils/cli.js';


export class LinkCommand extends EnhancedCommand {
	static paths = [['link']];

	static usage = Command.Usage({
		description: 'Link project folder to a site on Netlify',
	});

	renew = Option.Boolean(['--new']);

	async execute () {
		if (!this.renew && localConfig.get('site_id')) {
			console.log('This project is already linked!');
			return;
		}

		assertAuthentication();

		const { default: select } = await import('@inquirer/select');

		const result = await select({
			message: 'How do you want to link this folder?',
			choices: [
				{
					value: 'create',
					name: 'Create a new site',
				},
				{
					value: 'recent',
					name: 'Choose from a list of your recently updated sites'
				},
				{
					value: 'manual',
					name: 'Enter a site ID',
				},
			],
		});

		let siteId;

		switch (result) {
			case 'create': {
				siteId = await this.create();
				break;
			}
			case 'recent': {
				siteId = await this.recent();
				break;
			}
			case 'manual': {
				siteId = await this.manual();
				break;
			}
		}

		localConfig.set('site_id', siteId);
		console.log(`Project is now linked!`);
	}

	async create () {
		const { default: select } = await import('@inquirer/select');
		const { default: input } = await import('@inquirer/input');

		const { promisify } = await import('../utils/cli.js');

		const accounts = await promisify({
			message: 'Retrieving list of teams',
			promise: request('/accounts'),
		});

		let accountInput;

		if (accounts.length > 1) {
			accountInput = await select({
				message: 'Team:',
				choices: accounts.map((account) => ({
					value: account.slug,
					name: account.name,
				})),
			});
		}
		else {
			accountInput = accounts[0].slug;
		}

		const { default: adjectives } = await import('../words/adjectives.js');
		const { default: nouns } = await import('../words/nouns.js');

		let site;

		while (true) {
			const randomId = crypto.randomUUID().slice(0, 6);
			const defaultSlug = `${choose(adjectives)}-${choose(nouns)}-${randomId}`;

			const nameInput = await input({
				message: 'Site name (you can change this later):',
				default: defaultSlug,
				validate: validateSiteName,
			});

			try {
				site = await promisify({
					message: 'Creating site',
					promise: request(`/${accountInput}/sites`, {
						method: 'POST',
						body: JSON.stringify({
							name: nameInput,
						}),
						headers: {
							'Content-Type': 'application/json',
						},
					}),
				});

				break;
			}
			catch (error) {
				if (error.response?.status === 422) {
					console.error(chalk.red(`> ${chalk.bold(nameInput)}.netlify.app already exists, please try a different name.`));
					continue;
				}

				if (error.response?.status === 429) {
					console.error(chalk.red(`> Too many attempts, please try again.`));
					continue;
				}

				throw error;
			}
		}

		console.log(`> Site created!`);
		return site.id;
	}

	async recent () {
		const { default: select } = await import('@inquirer/select');

		const { promisify } = await import('../utils/cli.js');

		const list = await promisify({
			message: 'Retrieving list of sites',
			promise: request(`/sites`, {
				params: {
					filter: 'all',
					per_page: 20,
				},
			}),
		});

		if (list.length < 1) {
			console.log(`You don't have any sites yet.`);
			throw new AbortError();
		}

		const site = await select({
			message: 'Which site do you want to link?',
			choices: list.map((site) => ({
				value: site,
				name: site.name,
			})),
		});

		return site.id;
	}

	async manual () {
		const { default: input } = await import('@inquirer/input');

		const { promisify } = await import('../utils/cli.js');

		const siteInput = await input({
			message: 'Site ID:',
			validate: validateSiteName,
		});

		let site;

		try {
			site = await promisify({
				message: 'Checking site',
				promise: request(`/sites/${siteInput}`),
			});
		}
		catch (error) {
			if (error.response?.status === 404) {
				console.error(chalk.red(`> ${chalk.bold(siteInput)} cannot be found.`));
				throw new AbortError();
			}

			throw error;
		}

		return site.id;
	}

}

function choose (array) {
	const len = array.length;
	const idx = Math.floor(Math.random() * len);

	const item = array[idx];
	return item;
}

function validateSiteName (name) {
	if (name.trim() === '') {
		return 'Site name cannot be empty';
	}

	if ((/[^a-zA-Z0-9-]/).test(name)) {
		return 'Site name can only contain alphanumeric characters and hyphens';
	}

	return true;
}
