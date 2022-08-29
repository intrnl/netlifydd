import process from 'node:process';
import path from 'node:path';
import chalk from 'chalk';

import { ConfigStore, getConfigPath } from './config.js';


// If you're looking to fork, please change this client ID, thanks!
export const CLIENT_ID = 'yqN6CB4ufvuMpkvtxiN-QJfe70ZLcHtQlgSknywHM-0';
export const USER_AGENT = 'netlifydd (https://codeberg.org/intrnl/netlifydd)';

const ENDPOINT_URL = 'https://api.netlify.com/api/v1';
export const ENDPOINT_HEADERS = new Headers({
	'User-Agent': USER_AGENT,
	'Accept': 'application/json',
});

export const globalConfigPath = path.join(getConfigPath('configstore'), `netlifydd.json`);
export const globalConfig = new ConfigStore(globalConfigPath);

export const localConfigPath = path.resolve('./netlifydd.json');
export const localConfig = new ConfigStore(localConfigPath);

export function getToken () {
	const envToken = process.env.NETLIFYDD_AUTH_TOKEN;
	if (envToken) {
		return [envToken, 'env'];
	}

	const configUserId = globalConfig.get('active_user');
	const configToken = configUserId && globalConfig.get(`users.${configUserId}.token`);
	if (configToken) {
		return [configToken, 'config'];
	}

	return [null, 'not found'];
}

export function assertAuthentication () {
	const [token] = getToken();

	if (!token) {
		console.log(chalk.red`You're currently not authenticated!`);
		console.log(`Run ${chalk.blue(`netlifydd login`)} to get started.`);

		return process.exit(1);
	}

	ENDPOINT_HEADERS.set('Authorization', `Bearer ${token}`);
}

export async function request (endpoint, config = {}) {
	const { method, body, headers = null, params } = config;

	const url = new URL(`${ENDPOINT_URL}${endpoint}`);

	if (params) {
		url.search = '?' + new URLSearchParams(params);
	}

	const response = await fetch(url, {
		method: method,
		body: body,
		headers: mergeHeaders([ENDPOINT_HEADERS, headers]),
	});

	let json;
	try {
		json = await response.json();
	} catch {}

	if (!response.ok) {
		throw new ResponseError(response, json);
	}

	return json;
}

function mergeHeaders (headers) {
	let head = null;
	let inherit = false;

	for (let idx = 0, len = headers.length; idx < len; idx++) {
		const value = headers[idx];

		if (!value) {
			continue;
		}

		const instance = value instanceof Headers;
		const header = instance ? value : new Headers(value);

		if (!head) {
			head = value;

			if (instance) {
				inherit = true;
			}

			continue;
		}

		if (inherit) {
			head = new Headers(head);
			inherit = false;
		}

		for (const [key, value] of header) {
			head.set(key, value);
		}
	}

	return head;
}

export class ResponseError extends Error {
	constructor (response, body) {
		super(`Response error ${response.status}`);
		this.response = response;
		this.body = body;
	}
}

export class TimeoutError extends Error {}
