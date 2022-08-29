import process from 'node:process';
import { Cli, Builtins } from '@intrnl/clippy';
import ansi from 'ansi-escapes';

import { DeployCommand } from './commands/deploy.js';
import { LinkCommand } from './commands/link.js';
import { LoginCommand } from './commands/login.js';
import { SwitchCommand } from './commands/switch.js';


// Ignore experimental warning for fetch API.
const _emitWarning = process.emitWarning;
process.emitWarning = function (warning, ...args) {
	if (args[0] === 'ExperimentalWarning') {
		return;
	}

	if (args[0] && typeof args[0] === 'object' && args[0].type === 'ExperimentalWarning') {
		return;
	}

	return _emitWarning.apply(this, [warning, ...args]);
};

process.on('exit', () => {
	// Inquirer currently doesn't reset the cursor visibility on CTRL+C
	console.log(`${ansi.cursorShow}`);
});

const cli = new Cli({
	binaryLabel: 'netlifydd',
	binaryName: 'netlifydd',
	binaryVersion: '0.1.0',
});

cli.register(Builtins.DefinitionsCommand);
cli.register(Builtins.HelpCommand);
cli.register(Builtins.VersionCommand);

cli.register(DeployCommand);
cli.register(LinkCommand);
cli.register(LoginCommand);
cli.register(SwitchCommand);

const exitCode = await cli.run(process.argv.slice(2));
process.exitCode = exitCode;
