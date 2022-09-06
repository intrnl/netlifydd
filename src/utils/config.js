import os from 'node:os';
import process from 'node:process';
import path from 'node:path';
import fs from 'node:fs';


export class ConfigStore {
	static read (pathname) {
		try {
			const source = fs.readFileSync(pathname, 'utf-8');
			return JSON.parse(source);
		}
		catch (error) {
			if (error.code === 'ENOENT' || error.name === 'SyntaxError') {
				return Object.create(null);
			}

			throw new Error('Failed to read configuration', { cause: error });
		}
	}

	static write (pathname, config) {
		try {
			fs.mkdirSync(path.dirname(pathname), { recursive: true });
			fs.writeFileSync(pathname, JSON.stringify(config, null, '\t') + '\n');
		}
		catch (error) {
			throw new Error('Failed to write configuration', { cause: error });
		}
	}

	constructor (pathname, defaults) {
		this._path = pathname;
		this._dirty = false;
		this._config = null;

		this.reload();

		if (defaults) {
			this._config = Object.assign(Object.create(null), defaults, this._config);
		}
	}

	reload () {
		this._dirty = false;
		this._config = ConfigStore.read(this._path);
	}

	save () {
		this._dirty = false;
		ConfigStore.write(this._path, this._config);
	}

	invalidate () {
		if (!this._dirty) {
			this._dirty = true;
			setImmediate(() => this._dirty && this.save());
		}
	}

	/**
	 * @param {string} key
	 * @param {string} [defaultValue]
	 */
	get (key, defaultValue) {
		return get(this._config, key, defaultValue);
	}

	/**
	 * @param {string} key
	 * @param {any} value
	 */
	set (key, value) {
		set(this._config, key, value);

		this.invalidate();
		return value;
	}

	/**
	 * @param {string} key
	 * @returns {boolean}
	 */
	has (key) {
		return has(this._config, key);
	}

	/**
	 * @param {string} key
	 * @returns {boolean}
	 */
	delete (key) {
		const ret = del(this._config, key);

		if (ret) {
			this.invalidate();
		}

		return ret;
	}

	clear () {
		this._config = Object.create(null);

		this.invalidate();
		return true;
	}
}

/**
 * @param {string} name
 * @returns {string}
 */
export function getConfigPath (name) {
	const homedir = os.homedir();

	switch (process.platform) {
		case 'darwin': {
			return path.join(homedir, 'Library', 'Preferences', name);
		}
		case 'win32': {
			const appData = process.env.APPDATA || path.join(homedir, 'AppData', 'Roaming');
			return path.join(appData, name, 'Config');
		}
		default: {
			const xdgConfig = process.env.XDG_CONFIG_HOME || path.join(homedir, '.config');
			return path.join(xdgConfig, name);
		}
	}
}

/**
 * @param {string} str
 * @returns {string[]}
 */
function split (str) {
	if (str === '') {
		return [];
	}

	return str.split('.');
}

/**
 * @param {any} value
 * @returns {value is Record<any, any>}
 */
function isObject (value) {
	return value && typeof value === 'object';
}

export function get (obj, path, defaultValue) {
	const segments = split(path);

	for (let i = 0, len = segments.length; i < len; i++) {
		const segment = segments[i];

		obj = obj[segment];

		if (!isObject(obj) && i !== len - 1) {
			return defaultValue;
		}
	}

	return obj === undefined ? defaultValue : obj;
}

export function set (obj, path, val) {
	const segments = split(path);

	for (let i = 0, len = segments.length; i < len; i++) {
		const segment = segments[i];

		if (!isObject(obj[segment])) {
			obj[segment] = {};
		}

		if (i === len - 1) {
			obj[segment] = val;
		}

		obj = obj[segment];
	}

	return obj;
}

export function del (obj, path) {
	const segments = split(path);

	for (let i = 0, len = segments.length; i < len; i++) {
		const segment = segments[i];

		if (i === len - 1) {
			delete obj[segment];
			return true;
		}

		obj = obj[segment];

		if (!isObject(obj) && i !== len - 1) {
			return false;
		}
	}

	return false;
}

export function has (obj, path) {
	const segments = split(path);

	for (let i = 0, len = segments.length; i < len; i++) {
		const segment = segments[i];

		if (i === len - 1) {
			return segment in obj;
		}

		obj = obj[segment];

		if (!isObject(obj) && i !== len - 1) {
			return false;
		}
	}

	return false;
}
