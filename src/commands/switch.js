import chalk from 'chalk';

import { globalConfig } from '../utils/client.js';
import { EnhancedCommand } from '../utils/cli.js';


export class SwitchCommand extends EnhancedCommand {
	static paths = [['switch']];

	async execute () {
		const currentId = globalConfig.get('active_user');
		const current = currentId && globalConfig.get(`users.${currentId}`);

		const users = globalConfig.get('users');

		const options = [];

		for (const id in users) {
			const user = users[id];

			options.push({
				value: id,
				name: `${user.email}${user.name ? ` (${user.name})` : ''}`,
			});
		}

		if (current) {
			console.log(`Currently logged in as ${chalk.bold(current.email)}${current.name ? ` (${chalk.bold(current.name)})` : ''}`);
		}
		else {
			console.log(`Currently not logged in.`);
		}

		if (options.length < (current ? 2 : 1)) {
			console.log(`There are no other accounts to switch to.`);
			return;
		}

		const { default: select } = await import('@inquirer/select');

		const next = await select({
			message: 'Switch accounts to?',
			choices: options,
		});

		globalConfig.set('active_user', next);
	}
}
