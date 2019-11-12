'use strict';

const electron = require('electron');
const loadDevtool = (process.env.NODE_ENV !== 'production') ? require('electron-load-devtool') : false;
const electronApp = electron.app;
const dialog = electron.dialog;
const App = require('./back-end/app.js');
const createSlug = require('./back-end/helpers/slug.js');

if (typeof process.env.NODE_ENV === 'undefined') {
    process.env.NODE_ENV = 'production';
}

// this should be placed at top of main.js to handle setup events quickly
if ((/^win/).test(process.platform) && handleSquirrelEvent()) {
  // squirrel event handled and app will exit in 1000ms, so don't do anything else
  return;
}

function handleSquirrelEvent() {
  if (process.argv.length === 1) {
    return false;
  }

  let ChildProcess = require('child_process');
  let path = require('path');
  let appFolder = path.resolve(process.execPath, '..');
  let rootAtomFolder = path.resolve(appFolder, '..');
  let updateDotExe = path.resolve(path.join(rootAtomFolder, 'Update.exe'));
  let exeName = path.basename(process.execPath);
  let spawn = function(command, args) {
    let spawnedProcess, error;

    try {
      spawnedProcess = ChildProcess.spawn(command, args, {detached: true});
    } catch (error) {}

    return spawnedProcess;
  };

  let spawnUpdate = function(args) {
    return spawn(updateDotExe, args);
  };

  let squirrelEvent = process.argv[1];
  switch (squirrelEvent) {
    case '--squirrel-install':
    case '--squirrel-updated':
      // Optionally do things such as:
      // - Add your .exe to the PATH
      // - Write to the registry for things like file associations and
      //   explorer context menus

      // Install desktop and start menu shortcuts
      spawnUpdate(['--createShortcut', exeName]);

      setTimeout(electronApp.quit, 1000);
      return true;

    case '--squirrel-uninstall':
      // Undo anything you did in the --squirrel-install and
      // --squirrel-updated handlers

      // Remove desktop and start menu shortcuts
      spawnUpdate(['--removeShortcut', exeName]);

      setTimeout(electronApp.quit, 1000);
      return true;

    case '--squirrel-obsolete':
      // This is called on the outgoing version of your app before
      // we update to the new version - it's the opposite of
      // --squirrel-updated

      electronApp.quit();
      return true;
  }
}

// Keep a global reference of the window object for avoiding Garbage Collector
let mainWindow;
let appInstance;

electronApp.on('window-all-closed', function() {
    electronApp.quit();
});

electronApp.on('ready', function() {
    let startupSettings = {
        'mainWindow': mainWindow,
        'app': electronApp,
        'basedir': __dirname
    };

    if (process.env.NODE_ENV !== 'production') {
        loadDevtool(loadDevtool.VUEJS_DEVTOOLS);
    }

    appInstance = new App(startupSettings);
});

// Export function to quit the app from the application menu on macOS
exports.quitApp = function() {
    electronApp.quit();
};

// Use Electron API to display directory selection dialog
exports.selectDirectory = function(fieldName = false) {
    let mainWindowHandler = appInstance.getMainWindow();

    dialog.showOpenDialog(mainWindowHandler, {
        properties: ['openDirectory']
    }, function(selectedPath) {
        mainWindowHandler.webContents.send('app-directory-selected', {
            path: selectedPath,
            fieldName: fieldName
        });
    });
};

// Use Electron API to display file selection dialog
exports.selectFile = function(fieldName = false) {
    let mainWindowHandler = appInstance.getMainWindow();

    dialog.showOpenDialog(mainWindowHandler, {
        properties: ['openFile', 'showHiddenFiles']
    }, function(selectedPath) {
        mainWindowHandler.webContents.send('app-file-selected', {
            path: selectedPath,
            fieldName: fieldName
        });
    });
};

// Use Electron API to display files selection dialog
exports.selectFiles = function (fieldName = false, filters = []) {
    let mainWindowHandler = appInstance.getMainWindow();

    dialog.showOpenDialog(mainWindowHandler, {
        properties: ['openFile', 'multiSelections'],
        filters: filters
    }, function(selectedPaths) {
        mainWindowHandler.webContents.send('app-files-selected', {
            paths: selectedPaths,
            fieldName: fieldName
        });
    });
};

// Use Electron API to create slugs
exports.slug = function (input) {
    return createSlug(input);
};
