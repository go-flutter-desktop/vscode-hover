// Copied from Dart-Code
// https://github.com/Dart-Code/Dart-Code/blob/f65543c7924d4a3e2152c48d6aa3f2764b7f85db/src/extension/commands/channels.ts

import * as vs from "vscode";
import { SpawnedProcess } from "./interfaces";

const channels: { [key: string]: vs.OutputChannel } = {};

export function createChannel(name: string): vs.OutputChannel {
	// Remove any pre-existing output channel with this name.
	if (channels[name]) {
		channels[name].hide();
		channels[name].dispose();
	}

	channels[name] = vs.window.createOutputChannel(name);
	return channels[name];
}

export function getChannel(name: string): vs.OutputChannel {
	if (!channels[name]) {
		return createChannel(name);
	}

	return channels[name];
}

export function runProcessInChannel(process: SpawnedProcess, channel: vs.OutputChannel) {
	process.stdout.on("data", (data: any) => channel.append(data.toString()));
	process.stderr.on("data", (data: any) => channel.append(data.toString()));
	process.on("close", (code: any) => channel.appendLine(`exit code ${code}`));
}
