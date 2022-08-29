import process from 'node:process';
import { Cli, Builtins } from '@intrnl/clippy';
import ansi from 'ansi-escapes';

import { DeployCommand } from './commands/deploy.js';
import { LinkCommand } from './commands/link.js';
import { LoginCommand } from './commands/login.js';
import { LogoutCommand } from './commands/logout.js';
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

// Inquirer currently doesn't reset the cursor visibility on CTRL+C
process.on('SIGINT', () => {
	console.log(`${ansi.cursorShow}`);
	process.exit(1);
});

process.on('exit', () => {
	console.log(`${ansi.cursorShow}`);
})

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
cli.register(LogoutCommand);
cli.register(SwitchCommand);

const exitCode = await cli.run(process.argv.slice(2));
process.exitCode = exitCode;
