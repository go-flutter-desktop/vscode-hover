# VS Code Extension for Hover

Experimental VSCode Extension for Hover.

Install this plugin by opening the extensions tab (ctrl+shift+x) and search for `go-flutter.hover`.

After installing this extension you can execute `Hover: Run` from the command palette. The extension will execute `hover run` and starts the Flutter Debugger to attach to the running app.

Please file issues or requests at the [go-flutter issue tracker](https://github.com/go-flutter-desktop/go-flutter/issues).

## Contribute

All help is welcome!

If you want to add a feature, please start by opening an issue in the [go-flutter issue tracker](https://github.com/go-flutter-desktop/go-flutter/issues) so we can discuss the new feature.

### How to debug

- Run `npm install` in terminal to install dependencies
- Run the `Run Extension` target in the Debug View. This will:
  - Start a task `npm: watch` to compile the code
  - Run the extension in a new VS Code window
