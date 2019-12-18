'use strict';

const electron = require('electron');
const loadDevtool = (process.env.NODE_ENV !== 'production') ? require('electron-load-devtool') : false;
const electronApp = electron.app;
const dialog = electron.dialog;
const globalShortcut = electron.globalShortcut;
const ipcMain = electron.ipcMain;
const fs = require('fs');
const App = require('./back-end/app.js');
const createSlug = require('./back-end/helpers/slug.js');

if (typeof process.env.NODE_ENV === 'undefined') {
    process.env.NODE_ENV = 'production';
}

// Keep a global reference of the window object for avoiding Garbage Collector
let mainWindow;
let appInstance;

electronApp.on('window-all-closed', function () {
    electronApp.quit();
});

electronApp.on('will-quit', function () {
    globalShortcut.unregister('CommandOrControl+F');
});

electronApp.on('ready', function () {
    let startupSettings = {
        'mainWindow': mainWindow,
        'app': electronApp,
        'basedir': __dirname
    };

    if (process.env.NODE_ENV !== 'production') {
        loadDevtool(loadDevtool.VUEJS_DEVTOOLS);
    }

    appInstance = new App(startupSettings);

    // Register search shortcut listener
    globalShortcut.register('CommandOrControl+F', () => {
        appInstance.getMainWindow().webContents.send('app-show-search-form'); 
    });

    ipcMain.on('publii-set-spellchecker-language', (event, language) => {
        global.spellCheckerLanguage = new String(language).replace(/[^a-z\-_]/gmi, '');
    });
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
