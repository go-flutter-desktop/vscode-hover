import * as vscode from 'vscode';
import { isUndefined } from 'util';
import { runHoverRun } from './util';

export async function activate(context: vscode.ExtensionContext): Promise<void> {
	console.log('The Hover extension is being activated.');

	// Ensure we have a Flutter extension.
	const flutterExtensionIdentifier = "Dart-Code.flutter";
	const flutterExt = vscode.extensions.getExtension(flutterExtensionIdentifier);
	if (!flutterExt) {
		// This should not happen since the Hover extension has a dependency
		// on the Flutter one but just in case, we'd like to give a useful
		// error message.
		throw new Error("The Flutter extension is not installed, Hover extension is unable to activate.");
	}
	await flutterExt.activate();
	// if (!flutterExt.exports) {
	// 	console.error("The Flutter extension did not provide an exported API. Maybe it failed to activate?");
	// 	return;
	// }

	const dartExtensionIdentifier = "Dart-Code.dart-code";
	const dartExt = vscode.extensions.getExtension(dartExtensionIdentifier);
	if (!dartExt) {
		throw new Error("The Dart extension is not installed, Hover extension is unable to activate.");
	}
	await dartExt.activate();
	if (!dartExt.exports) {
		console.error("The Dart extension did not provide an exported API. Maybe it failed to activate?");
		return;
	}
	console.dir(dartExt.exports);

	// TODO: set this all up as a debugger, then we have the active workspace
	// and can hook the flutter attach under the hover debug session.
	//
	// Before doing that, may consider running `hover run` from the run command,
	// to get a first win.
	//
	// Also look at how commands and debug configs are built up in other tools.
	//
	// When setting up as a debugger (if that's even possible with flutter being
	// the actual debugger), we can also obtain the target through the 'program'
	// value in launch.json

	let disposable = vscode.commands.registerCommand('hover.run', () => {
		let workspaceFolders = vscode.workspace.workspaceFolders;
		if (isUndefined(workspaceFolders)) {
			vscode.window.showErrorMessage('No active workspace available to launch Hover for.');
			return;
		}

		const activeEditor = vscode.window.activeTextEditor;
		if (isUndefined(activeEditor)) {
			vscode.window.showErrorMessage('No active workspace open to launch Hover for.');
			return;
		}
		const activeDocumentUri = activeEditor.document.uri;
		let activeWorkspaceFolder: vscode.WorkspaceFolder;
		workspaceFolders.forEach(element => {
			console.log(element.uri.toString());
			console.log(activeDocumentUri.toString());
			if (activeDocumentUri.toString().startsWith(element.uri.toString())) {
				activeWorkspaceFolder = element;
			}
		});
		if (isUndefined(activeWorkspaceFolder)) {
			vscode.window.showErrorMessage('No active workspace found to launch Hover for.');
			return;
		}

		let cwd = activeWorkspaceFolder.uri.fsPath;
		let target = "lib/main_desktop.dart"; // TODO: make configurable, probably best done through launch configurations with a param...

		runHoverRun(
			[
				"--target", target,
				"--colors=false", // TODO: Fix colors in output stream, if possible.
			],
			cwd,
		).then((observatoryUri: string) => {
			console.log("runHover started, have observatoryUri");
			vscode.window.showInformationMessage('Starting application in debug mode');
			console.log("Attaching debugger (flutter attach)");
			vscode.debug.startDebugging(activeWorkspaceFolder, {
				name: "Flutter attached to Hover",
				type: "dart",
				request: "attach",
				deviceId: "flutter-tester",
				observatoryUri: observatoryUri,
				program: target,
			});
		}).catch((err: any) => {
			console.log("runHover exception");
			console.dir(err);
		});

	});

	context.subscriptions.push(disposable);
	console.log('The Hover extension is now active.');
}

export function deactivate() {
	console.log('The Hover extension is being deactivated.');
	console.log('The Hover extension is now deactivated.');
}
