// Copied from Dart-Code
// https://github.com/Dart-Code/Dart-Code/blob/f65543c7924d4a3e2152c48d6aa3f2764b7f85db/src/shared/interfaces.ts

import * as child_process from "child_process";
import * as stream from "stream";

export type SpawnedProcess = child_process.ChildProcess & {
	stdin: stream.Writable,
	stdout: stream.Readable,
	stderr: stream.Readable,
};
