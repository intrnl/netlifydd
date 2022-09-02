import { createPrompt, useEffect, usePrefix } from '@inquirer/core';
import { Command } from '@intrnl/clippy';
import ansi from 'ansi-escapes';


export class EnhancedCommand extends Command {
	async catch (error) {
		if (error instanceof AbortError) {
			return;
		}

		return super.catch(error);
	}
}

export class AbortError extends Error {}

export const _promisify = createPrompt((config, done) => {
	const { message = 'Please wait', promise } = config;

	const prefix = usePrefix(true);

	useEffect(() => {
		Promise.resolve(promise).then(
			(val) => {
				done(val);
			},
			(err) => {
				done(Promise.reject(err));
			},
		);
	}, []);

	return `${prefix} ${message}${ansi.cursorHide}`;
});

export function promisify (options) {
	return _promisify(options, { clearPromptOnDone: true })
}
