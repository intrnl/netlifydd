import { createPrompt, useEffect, useState, usePrefix } from '@inquirer/core';
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

export const promisify = createPrompt((config, done) => {
	const { message = 'Please wait', finished, promise } = config;

	const [resolved, setResolved] = useState(false);
	const prefix = usePrefix(true);

	useEffect(() => {
		Promise.resolve(promise).then(
			(val) => {
				setResolved(true);
				done(val);
			},
			(err) => {
				setResolved(true);
				done(Promise.reject(err));
			},
		);
	}, []);

	if (resolved) {
		if (finished) {
			return `- ${finished}`;
		}

		return `${ansi.cursorMove(0, -2)}`;
	}

	return `${prefix} ${message}${ansi.cursorHide}`;
});
