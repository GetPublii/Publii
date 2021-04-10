'use strict';

const electron = require('electron');
const webContents = electron.webContents;
const Menu = electron.Menu;
const electronApp = electron.app;
const dialog = electron.dialog;
const ipcMain = electron.ipcMain;
const nativeTheme = electron.nativeTheme;
const os = require('os');
const App = require('./back-end/app.js');
const createSlug = require('./back-end/helpers/slug.js');
const passwordSafeStorage = require('keytar');
const ContextMenuBuilder = require('./back-end/helpers/context-menu-builder.js');

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

    ipcMain.handle('publii-get-spellchecker-language', (event) => global.spellCheckerLanguage);

    ipcMain.handle('app-main-set-spellchecker-language-for-webview', (event, webContentsID, languages) => webContents.fromId(webContentsID).session.setSpellCheckerLanguages(languages));

    // Init context menu for webviews
    ipcMain.handle('app-main-initialize-context-menu-for-webview', (event, webContentsID) => {
        let webView = webContents.fromId(webContentsID);
        let contextMenuBuilder = new ContextMenuBuilder(webView);
            
        webView.on('context-menu', (event, params) => {
            event.preventDefault();
            contextMenuBuilder.showPopupMenu(params);
        }); 
    });

    // App theme mode
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

    // App window
    ipcMain.handle('app-window:minimize', () => {
        appInstance.getMainWindow().minimize();
    });

    ipcMain.handle('app-window:maximize', () => {
        appInstance.getMainWindow().maximize();
    });

    ipcMain.handle('app-window:unmaximize', () => {
        appInstance.getMainWindow().unmaximize();
    });

    ipcMain.handle('app-window:close', () => {
        appInstance.getMainWindow().close();
    });

    // App credits list
    ipcMain.handle('app-credits-list:get-app-path', () => {
        return electronApp.getAppPath();
    });

    // Use Electron API to create slugs
    ipcMain.handle('app-main-process-create-slug', (event, input) => {
        return createSlug(input);
    });

    // Load password from Keytar
    ipcMain.handle('app-main-process-load-password', async (event, type, passwordKey) => {
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
    });

    // Export OS version
    ipcMain.handle('app-main-process-is-osx11-or-higher', () => {
        let version = parseInt(os.release().split('.')[0], 10);
        
        if (process.platform === 'darwin' && version >= 20) {
            return true;
        }

        return false;
    });

    // Use Electron API to display directory selection dialog
    ipcMain.handle('app-main-process-select-directory', (event, fieldName = false) => {
        let mainWindowHandler = appInstance.getMainWindow();

        dialog.showOpenDialog(mainWindowHandler, {
            properties: ['openDirectory']
        }).then(selectedPath => {
            mainWindowHandler.webContents.send('app-directory-selected', {
                path: selectedPath,
                fieldName: fieldName
            });
        });
    });

    // Use Electron API to display file selection dialog
    ipcMain.handle('app-main-process-select-file', (event, fieldName = false) => {
        let mainWindowHandler = appInstance.getMainWindow();

        dialog.showOpenDialog(mainWindowHandler, {
            properties: ['openFile', 'showHiddenFiles']
        }).then(selectedPath => {
            mainWindowHandler.webContents.send('app-file-selected', {
                path: selectedPath,
                fieldName: fieldName
            });
        });
    });

    // Use Electron API to display files selection dialog
    ipcMain.handle('app-main-process-select-files', (event, fieldName = false, filters = []) => {
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
    });

    // Get available spellchecker languages
    ipcMain.handle('app-main-get-spellchecker-languages', (event) => appInstance.getMainWindow().webContents.session.availableSpellCheckerLanguages);

    // Remove application menu on Linux
    if (process.platform === 'linux') {
        Menu.setApplicationMenu(null);
    }

    if (process.env.NODE_ENV !== 'development') {
        const template = [{
            label: "Publii",
            submenu: [{
                label: "About Application",
                selector: "orderFrontStandardAboutPanel:"
            }, {
                type: "separator"
            }, {
                label: "Quit",
                accelerator: "CmdOrCtrl+Q",
                click: () => { 
                    electronApp.quit();
                }
            }]
        }, {
            label: "Edit",
            submenu: [
                {
                    label: "Undo",
                    accelerator: "CmdOrCtrl+Z",
                    selector: "undo:"
                },
                {
                    label: "Redo",
                    accelerator: "Shift+CmdOrCtrl+Z",
                    selector: "redo:"
                },
                {
                    type: "separator"
                },
                {
                    label: "Cut",
                    accelerator: "CmdOrCtrl+X",
                    selector: "cut:"
                },
                {
                    label: "Copy",
                    accelerator: "CmdOrCtrl+C",
                    selector: "copy:"
                },
                {
                    label: "Paste",
                    accelerator: "CmdOrCtrl+V",
                    selector: "paste:"
                },
                {
                    label: "Select All",
                    accelerator: "CmdOrCtrl+A",
                    selector: "selectAll:"
                }
            ]
        }];

        const menu = Menu.buildFromTemplate(template);
        Menu.setApplicationMenu(menu);
    }
});
