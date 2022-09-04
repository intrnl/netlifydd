import { Command } from '@intrnl/clippy';


export class EnhancedCommand extends Command {
	async catch (error) {
		if (error instanceof AbortError) {
			return;
		}

		return super.catch(error);
	}
}

export class AbortError extends Error {}
