import chalk from 'chalk';

import { globalConfig } from '../utils/client.js';
import { EnhancedCommand } from '../utils/command.js';


export class LogoutCommand extends EnhancedCommand {
	static paths = [['logout']];

	async execute () {
		const currentId = globalConfig.get('active_user');

		if (!currentId) {
			console.log(`You're currently not logged in.`);
			return;
		}

		const user = globalConfig.get(`users.${currentId}`);
		globalConfig.delete(`users.${currentId}`);

		console.log(`Logged out from ${chalk.bold(user.email)}${user.name ? ` (${chalk.bold(user.name)})` : ''}.`);
	}
}
