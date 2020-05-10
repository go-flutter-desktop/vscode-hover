import * as vscode from 'vscode';
import { isUndefined } from 'util';
import { runHoverRun } from './util';
import * as path from 'path';
import * as fs from 'fs';
import * as jsyaml from 'js-yaml';

// detectPubspecFromDir recursively scans up from a directory for the pubspec.yaml
// this lets us detect the flutter root directory. returns empty string if not found.
function detectPubspecFromDir(dir: string): string {
	console.debug("detectPubspecFromDir", dir)

	let previous = undefined
	for (let current = dir; current != previous; current = path.dirname(current)) {
		try {
			fs.statSync(path.join(current, "pubspec.yaml"))
			return current
		} catch (error) {
			if (error.code !== "ENOENT") {
				throw error
			}
		}

		previous = current
	}

	return ""
}

// detectRootFromHoverConfig if current editor is the hover.yaml use that to determine the base path.
// special case, no need to scan workspace if current editor is hover.yaml
function detectRootFromHoverConfig(currentPath: vscode.Uri): string {
	if (currentPath.fsPath.endsWith("hover.yaml")) {
		console.debug("detected hover yaml", currentPath.fsPath)
		return detectPubspecFromDir(path.dirname(currentPath.fsPath))
	}

	return ""
}

// detectRootFromWorkspace detects the root flutter directory from the workspace.
function detectRootFromWorkspaces(currentPath: vscode.Uri, workspaces: vscode.WorkspaceFolder[]): string {
	console.debug("detecting flutter root from workspaces", currentPath, workspaces)
	let workspace = workspaces.find((element) => {
		return currentPath.toString().startsWith(element.uri.toString())
	})

	if (isUndefined(workspace)) {
		return "";
	}

	return workspace.uri.fsPath
}

function detectWorkspaceFor(dir: string, workspaces: vscode.WorkspaceFolder[]): vscode.WorkspaceFolder | undefined {
	console.debug("detectWorkspaceFor", dir, workspaces)
	let workspace = workspaces.find((element) => {
		return dir.startsWith(element.uri.fsPath)
	})

	return workspace
}

function configOrDefault(p: string, fallback: any): any {
	try {
		return {...fallback, ...jsyaml.load(fs.readFileSync(p, "utf8"))}
	} catch (error) {
		vscode.window.showWarningMessage(`failed to read hover.yaml falling back to defaults: ${path}`)
		return fallback
	}
}

function logException(msg: string, cb: () => void): () => void {
	return () => {
		try {
			cb()
		} catch (error) {
			console.error(msg, error)
			throw error
		}
	}
}

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

	let disposable = vscode.commands.registerCommand('hover.run', logException("hover.run failed", () => {
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


		let cwd = detectRootFromHoverConfig(activeDocumentUri) ||
			detectPubspecFromDir(path.dirname(activeDocumentUri.fsPath)) ||
			detectRootFromWorkspaces(activeDocumentUri, workspaceFolders)

		if (cwd == "") {
			vscode.window.showErrorMessage('No active workspace found to launch Hover for.');
			return;
		}

		let workspace = detectWorkspaceFor(cwd, workspaceFolders)

		if (isUndefined(workspace)) {
			vscode.window.showErrorMessage('No active workspace found to launch Hover for.');
			return;
		}

		const config = configOrDefault(path.join(cwd, "go", "hover.yaml"), {target: "lib/main_desktop.dart"})

		runHoverRun(
			[
				"--target", config.target,
				"--colors=false", // TODO: Fix colors in output stream, if possible.
			],
			cwd,
		).then((observatoryUri: string) => {
			console.log("runHover started, have observatoryUri");
			vscode.window.showInformationMessage('Starting application in debug mode');
			console.log("Attaching debugger (flutter attach)");
			vscode.debug.startDebugging(workspace, {
				name: "Flutter attached to Hover",
				type: "dart",
				request: "attach",
				deviceId: "flutter-tester",
				observatoryUri: observatoryUri,
				program: config.target,
			});
		}).catch((err: any) => {
			console.log("runHover exception");
			console.dir(err);
		});
	}));

	context.subscriptions.push(disposable);
	console.log('The Hover extension is now active.');
}

export function deactivate() {
	console.log('The Hover extension is being deactivated.');
	console.log('The Hover extension is now deactivated.');
}
