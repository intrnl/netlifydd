import { Command, Option } from '@intrnl/clippy';
import chalk from 'chalk';

import { CLIENT_ID, globalConfig, getToken, request, TimeoutError } from '../utils/client.js';
import { EnhancedCommand } from '../utils/cli.js';
import { delay } from '../utils/misc.js';


export class LoginCommand extends EnhancedCommand {
	static paths = [['login']];

	static usage = Command.Usage({
		description: 'Login to your Netlify account',
	});

	renew = Option.Boolean(['--new'], {
		description: 'Login to a new Netlify account',
	});

	async execute () {
		const [token, location] = getToken();

		if (!this.renew && token) {
			console.log(`You're already logged in (via ${location})`);
			return;
		}

		return await this.authenticate();
	}

	async authenticate () {
		const webUI = process.env.NETLIFY_WEB_UI || 'https://app.netlify.com';

		const { promisify } = await import('../utils/cli.js');

		let ticket = await promisify({
			message: 'Retrieving authorization link',
			promise: request('/oauth/tickets', {
				method: 'POST',
				params: {
					client_id: CLIENT_ID,
				},
			}),
		});

		const ticketId = ticket.id;
		const authLink = `${webUI}/authorize?response_type=ticket&ticket=${ticketId}`;

		console.log(`Please open the following link in your web browser:`);
		console.log(chalk.blue.underline(authLink));
		console.log(``);

		try {
			ticket = await promisify({
				message: 'Waiting for authorization response',
				promise: this.pollTicket(ticketId),
			});
		}
		catch (error) {
			if (error instanceof TimeoutError) {
				console.error(chalk.red(`Authentication timed out, please try again.`));
				return 1;
			}

			throw error;
		}

		const exchange = await promisify({
			message: 'Finalizing authorization',
			promise: request(`/oauth/tickets/${ticketId}/exchange`, {
				method: 'POST',
			}),
		});

		const accessToken = exchange.access_token;

		const user = await promisify({
			message: 'Retrieving user information',
			promise: request('/user', {
				headers: {
					'Authorization': `Bearer ${accessToken}`,
				},
			}),
		});

		const userId = user.id;
		const userName = user.full_name;
		const userEmail = user.email;

		globalConfig.set('active_user', userId);
		globalConfig.set(`users.${userId}`, {
			name: userName,
			email: userEmail,
			token: accessToken,
		});

		console.log(`You're now logged in!`);
		return 0;
	}

	async pollTicket (ticketId) {
		const POLL = 1000 * 1.5; // 1.5 seconds
		const TIMEOUT = 1000 * 60 * 3; // 3 minutes

		const deadline = Date.now() + TIMEOUT;

		while (true) {
			const ticket = await request(`/oauth/tickets/${ticketId}`);

			if (ticket.authorized) {
				return ticket;
			}

			const future = Date.now() + POLL;

			if (future >= deadline) {
				throw new TimeoutError();
			}

			await delay(POLL);
		}
	}
}
