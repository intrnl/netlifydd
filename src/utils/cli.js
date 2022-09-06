import { createPrompt, useEffect, usePrefix } from '@inquirer/core';
import ansi from 'ansi-escapes';


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

/**
 * @template Value
 * @param {object} options
 * @param {Promise<Value>} options.promise
 * @param {string} [options.message]
 * @returns {Promise<Value>}
 */
export function promisify (options) {
	return _promisify(options, { clearPromptOnDone: true })
}
