'use strict';

const electron = require('electron');
const electronApp = electron.app;
const dialog = electron.dialog;
const ipcMain = electron.ipcMain;
const nativeTheme = electron.nativeTheme;
const fs = require('fs');
const os = require('os');
const App = require('./back-end/app.js');
const createSlug = require('./back-end/helpers/slug.js');
const passwordSafeStorage = require('keytar');

if (typeof process.env.NODE_ENV === 'undefined') {
    process.env.NODE_ENV = 'production';
}

// Keep a global reference of the window object for avoiding Garbage Collector
let mainWindow;
let appInstance;

electronApp.on('window-all-closed', function () {
    electronApp.quit();
});

electronApp.on('ready', function () {
    let startupSettings = {
        'mainWindow': mainWindow,
        'app': electronApp,
        'basedir': __dirname
    };

    appInstance = new App(startupSettings);

    ipcMain.on('publii-set-spellchecker-language', (event, language) => {
        global.spellCheckerLanguage = new String(language).replace(/[^a-z\-_]/gmi, '');
    });

    ipcMain.handle('app-theme-mode:set-light', () => {
        nativeTheme.themeSource = 'light';
    });

    ipcMain.handle('app-theme-mode:set-dark', () => {
        nativeTheme.themeSource = 'dark';
    });

    ipcMain.handle('app-theme-mode:get-theme', () => {
        return nativeTheme.shouldUseDarkColors ? 'dark' : 'default';
    });

    ipcMain.handle('app-theme-mode:set-system', () => {
        nativeTheme.themeSource = 'system';
    });

    nativeTheme.on('updated', () => {
        appInstance.getMainWindow().webContents.send('app-theme-mode:changed');
    });
});

// Export function to quit the app from the application menu on macOS
exports.quitApp = function () {
    electronApp.quit();
};

// Export OS version
exports.isOSX11orHigher = function () {
    let version = parseInt(os.release().split('.')[0], 10);
    
    if (process.platform === 'darwin' && version >= 20) {
        return true;
    }

    return false;
};

// Use Electron API to display directory selection dialog
exports.selectDirectory = function(fieldName = false) {
    let mainWindowHandler = appInstance.getMainWindow();

    dialog.showOpenDialog(mainWindowHandler, {
        properties: ['openDirectory']
    }).then(selectedPath => {
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
    }).then(selectedPath => {
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
    }).then(selectedPaths => {
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

// Load password from Keytar
exports.loadPassword = async function (type, passwordKey) {
    if (passwordKey.indexOf(type) === 0) {
        let passwordData = passwordKey.split(' ');
        let service = passwordData[0];
        let account = passwordData[1];
        let retrievedPassword = '';

        if (passwordSafeStorage) {
            try {
                retrievedPassword = await passwordSafeStorage.getPassword(service, account);
            } catch (e) {
                console.log('(!) Cannot retrieve password via keytar');
            }
        }

        if (retrievedPassword === null || retrievedPassword === true || retrievedPassword === false) {
            retrievedPassword = '';
        }

        return retrievedPassword;
    }

    return '';
}
