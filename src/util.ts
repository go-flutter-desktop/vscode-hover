import vscode = require('vscode');
import cp = require('child_process');
import kill = require('tree-kill');

import * as path from "path";
import * as channels from './channels';
import { SpawnedProcess } from './interfaces';

/**
 * Runs `hover run`
 * @param args Arguments to be passed while running given tool
 * @param cwd cwd that will passed in the env object while running given tool
 * @returns Promise with the observatory Uri once hover has started the
 * application.
 */
export function runHoverRun(
	runArgs: string[],
	cwd: string,
): Promise<string> {
	let cmd = "hover";
	let args = ["run", ...runArgs];
	let env = process.env;

	console.log(cwd);

	return new Promise((resolveRunning, rejectRunning) => {
		let shortPath = path.basename(cwd);
		const commandName = path.basename(cmd);

		const channel = channels.createChannel(`${commandName} (${shortPath})`);
		channel.show();

		return vscode.window.withProgress({
			cancellable: true,
			location: vscode.ProgressLocation.Notification,
			title: `${commandName} ${args.join(" ")}`,
		}, (progress, token) => {
			channel.clear();
			channel.appendLine(`[${shortPath}] ${commandName} ${args.join(" ")}`);
			progress.report({ message: "running..." });
			const proc = safeSpawn(cwd, cmd, args, env);
			channels.runProcessInChannel(proc, channel);
			console.info(`(PROC ${proc.pid}) Spawned ${cmd} ${args.join(" ")} in ${cwd}`);
			proc.on("close", (code) => {
				if (code) {
					channel.show(true);
				}
			});
			token.onCancellationRequested(() => kill(proc.pid));
			return new Promise<void>((resolveProgress, rejectProgress) => {
				const regexObservatoryUri = new RegExp(String.raw`.*Observatory\slistening\son\s(http:[^:]*:\d*/)`);
				proc.stdout.on("data", (data: any) => {
					const line = data.toString();
					const match = regexObservatoryUri.exec(line);
					if (match) {
						console.warn('matched line: ' + line);
						resolveProgress();
						resolveRunning(match[1]);
					}
				});
				proc.addListener("exit", (code) => {
					if (code === 0) {
						resolveProgress();
						rejectRunning();
					} else {
						rejectProgress();
						rejectRunning();
					}
				});
			});
		});
	});
}



export function safeSpawn(workingDirectory: string | undefined, binPath: string, args: string[], env: { [key: string]: string | undefined }): SpawnedProcess {
	// Spawning processes on Windows with funny symbols in the path requires quoting. However if you quote an
	// executable with a space in its path and an argument also has a space, you have to then quote all of the
	// arguments too!\
	// https://github.com/nodejs/node/issues/7367
	const customEnv = Object.assign({}, process.env, env);
	const quotedArgs = args.map((a) => `"${a.replace(/"/g, `\\"`)}"`);
	return cp.spawn(`"${binPath}"`, quotedArgs, { cwd: workingDirectory, env: customEnv, shell: true }) as SpawnedProcess;
}

// Workaround for issue in https://github.com/Microsoft/vscode/issues/9448#issuecomment-244804026
export function fixDriveCasingInWindows(pathToFix: string): string {
	return process.platform === 'win32' && pathToFix
		? pathToFix.substr(0, 1).toUpperCase() + pathToFix.substr(1)
		: pathToFix;
}
