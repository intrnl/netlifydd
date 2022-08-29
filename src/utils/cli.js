import { createPrompt, useEffect, useState, usePrefix } from '@inquirer/core';
import ansi from 'ansi-escapes';


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
