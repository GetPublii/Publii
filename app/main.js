'use strict';

const electron = require('electron');
const webContents = electron.webContents;
const BrowserWindow = electron.BrowserWindow;
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
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const normalizePath = require('normalize-path');

// Wrapper to handle UNC paths on Windows only
function normalizePathPreserveUNC (pathToNormalize) {
    if (process.platform !== 'win32' || typeof pathToNormalize !== 'string') {
        return normalizePath(pathToNormalize);
    }

    let isUNC = /^[\\/]{2}/.test(pathToNormalize);
    let normalized = normalizePath(pathToNormalize);

    if (isUNC && normalized.charAt(0) === '/' && normalized.charAt(1) !== '/') {
        normalized = '/' + normalized;
    }

    return normalized;
}

if (typeof process.env.NODE_ENV === 'undefined') {
    process.env.NODE_ENV = 'production';
}

// Keep a global reference of the app instance for avoiding Garbage Collector
let appInstance;

electronApp.on('window-all-closed', function () {
    electronApp.quit();
});

electronApp.on('ready', function () {
    // Start the app
    let startupSettings = {
        'app': electronApp,
        'basedir': __dirname
    };

    appInstance = new App(startupSettings);
    
    ipcMain.on('publii-set-spellchecker-language', (event, language) => {
        global.spellCheckerLanguage = new String(language).replace(/[^a-z\-_]/gmi, '');
    });

    ipcMain.handle('publii-shell-show-item-in-folder', (event, url) => electron.shell.showItemInFolder(url));

    const blockedExtensions = new Set([
        // Windows
        '.exe', '.bat', '.cmd', '.com', '.msi', '.msp', '.scr', '.lnk', '.reg',
        '.ps1', '.psm1', '.psd1', '.ps1xml', '.psc1',
        '.vbs', '.vbe', '.wsf', '.wsh', '.js', '.jse', '.hta', '.cpl',
        // macOS
        '.app', '.command', '.scpt', '.tool',
        // Unix
        '.sh', '.bash', '.zsh', '.fish', '.csh', '.tcsh', '.ksh',
        // Other
        '.jar', '.py', '.pyc', '.pyw', '.rb', '.pl', '.php'
    ]);

    const allowedSubdirs = ['root-files', 'media'];

    ipcMain.handle('publii-shell-open-path', (event, filePath) => {
        if (typeof filePath !== 'string' || !filePath) {
            return '';
        }

        let sitesDir = appInstance && appInstance.sitesDir;

        if (!sitesDir) {
            return '';
        }

        let resolvedSitesDir = path.resolve(sitesDir);
        let resolvedTarget = path.resolve(filePath);
        let relative = path.relative(resolvedSitesDir, resolvedTarget);

        if (relative.startsWith('..') || path.isAbsolute(relative) || relative === '') {
            return '';
        }

        let segments = relative.split(path.sep);

        if (segments.length < 4 ||
            segments[1] !== 'input' ||
            allowedSubdirs.indexOf(segments[2]) === -1) {
            return '';
        }

        let ext = path.extname(resolvedTarget).toLowerCase();

        if (blockedExtensions.has(ext)) {
            return '';
        }

        return electron.shell.openPath(resolvedTarget);
    });

    const ALLOWED_EXTERNAL_PROTOCOLS = new Set([
        'http:',
        'https:',
        'mailto:',
        'file:',
        'dat:',
        'ipfs:',
        'dweb:'
    ]);

    ipcMain.handle('publii-shell-open-external', (event, url) => {
        if (typeof url !== 'string' || !url) {
            return;
        }

        let parsed;

        try {
            parsed = new URL(url);
        } catch (e) {
            return;
        }

        if (!ALLOWED_EXTERNAL_PROTOCOLS.has(parsed.protocol)) {
            return;
        }

        if (parsed.protocol === 'file:') {
            if (parsed.host) {
                return;
            }

            let decodedPath;

            try {
                decodedPath = decodeURIComponent(parsed.pathname);
            } catch (e) {
                return;
            }

            if (path.extname(decodedPath).toLowerCase() !== '.html') {
                return;
            }
        }

        return electron.shell.openExternal(parsed.href);
    });

    ipcMain.handle('publii-native-exists-sync', (event, pathToCheck) => fs.existsSync(pathToCheck));
    ipcMain.handle('publii-native-md5', (event, value) => crypto.createHash('md5').update(value).digest('hex'));
    ipcMain.handle('publii-native-normalize-path', (event, pathToNormalize) => normalizePathPreserveUNC(pathToNormalize));
    ipcMain.handle('publii-get-spellchecker-language', (event) => global.spellCheckerLanguage);
    ipcMain.handle('app-main-webview-search-find-in-page', (event, searchPhrase, searchConfig = null) => {
        if (searchConfig) {
            event.sender.findInPage(searchPhrase, searchConfig);
        } else {
            event.sender.findInPage(searchPhrase);
        }
    });

    ipcMain.handle('app-main-webview-search-stop-find-in-page', (event) => {
        event.sender.stopFindInPage('clearSelection');
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
        BrowserWindow.getAllWindows().forEach(win => {
            win.webContents.send('app-theme-mode:changed');
        });
    });

    // App window
    ipcMain.handle('app-window:minimize', (event) => {
        BrowserWindow.fromWebContents(event.sender)?.minimize();
    });

    ipcMain.handle('app-window:maximize', (event) => {
        BrowserWindow.fromWebContents(event.sender)?.maximize();
    });

    ipcMain.handle('app-window:unmaximize', (event) => {
        BrowserWindow.fromWebContents(event.sender)?.unmaximize();
    });

    ipcMain.handle('app-window:close', (event) => {
        BrowserWindow.fromWebContents(event.sender)?.close();
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
    let availablePasswordTypes = new Set([
        'publii',
        'publii-git-password',
        'publii-passphrase',
        'publii-s3-id',
        'publii-s3-key',
        'publii-gh-token',
        'publii-gl-token',
        'publii-netlify-id',
        'publii-netlify-token'
    ]);

    ipcMain.handle('app-main-process-load-password', async (event, type, passwordKey) => {
        if (!availablePasswordTypes.has(type)) {
            return '';
        }

        let prefix = type + ' ';

        if (typeof passwordKey !== 'string' || !passwordKey.startsWith(prefix)) {
            return '';
        }

        let account = passwordKey.slice(prefix.length);

        if (!account || !/^[A-Za-z0-9_-]+$/.test(account)) {
            return '';
        }

        let retrievedPassword = '';

        if (passwordSafeStorage) {
            try {
                retrievedPassword = await passwordSafeStorage.getPassword(type, account);
            } catch (e) {
                console.log('(!) Cannot retrieve password via keytar');
            }
        }

        if (retrievedPassword === null || retrievedPassword === true || retrievedPassword === false) {
            retrievedPassword = '';
        }

        return retrievedPassword;
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
        let win = BrowserWindow.fromWebContents(event.sender);

        dialog.showOpenDialog(win, {
            properties: ['openDirectory']
        }).then(selectedPath => {
            event.sender.send('app-directory-selected', {
                path: selectedPath,
                fieldName: fieldName
            });
        });
    });

    // Use Electron API to display file selection dialog
    ipcMain.handle('app-main-process-select-file', (event, fieldName = false) => {
        let win = BrowserWindow.fromWebContents(event.sender);

        dialog.showOpenDialog(win, {
            properties: ['openFile', 'showHiddenFiles']
        }).then(selectedPath => {
            event.sender.send('app-file-selected', {
                path: selectedPath,
                fieldName: fieldName
            });
        });
    });

    // Use Electron API to display files selection dialog
    ipcMain.handle('app-main-process-select-files', (event, fieldName = false, filters = []) => {
        let win = BrowserWindow.fromWebContents(event.sender);

        dialog.showOpenDialog(win, {
            properties: ['openFile', 'multiSelections'],
            filters: filters
        }).then(selectedPaths => {
            event.sender.send('app-files-selected', {
                paths: selectedPaths,
                fieldName: fieldName
            });
        });
    });

    // Get available spellchecker languages
    ipcMain.handle('app-main-get-spellchecker-languages', (event) => event.sender.session.availableSpellCheckerLanguages);

    const template = [{
            label: "Publii",
            submenu: [{
                label: "About Application",
                selector: "orderFrontStandardAboutPanel:"
            }, 
            {
                type: "separator"
            }, 
            { 
            role: 'hide' 
            },
            { 
                role: 'hideOthers' 
            },
            { 
                role: 'unhide' 
            },
            {
                type: "separator"
            }, 
            {
                label: "Quit",
                accelerator: "CmdOrCtrl+Q",
                click: () => { 
                    electronApp.quit();
                }
            }]
        }, {
            label: "File",
            submenu: [{
                label: "New Window",
                accelerator: "CmdOrCtrl+N",
                click: () => {
                    appInstance.openNewWindow();
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

    // Remove application menu on Linux
    if (process.platform === 'linux') {
        Menu.setApplicationMenu(null);
    }

    // macOS dock menu
    if (process.platform === 'darwin' && electronApp.dock) {
        const dockMenu = Menu.buildFromTemplate([{
            label: 'New Window',
            click: () => {
                appInstance.openNewWindow();
            }
        }]);
        electronApp.dock.setMenu(dockMenu);
    }

    // Load language translations and set language as used in the app
    ipcMain.handle('app-main-load-language', (event, lang, type) => {
        if (typeof lang !== 'string' ||
            lang.length === 0 ||
            lang === '.' ||
            lang === '..' ||
            lang.startsWith('.') ||
            !/^[a-zA-Z0-9\-_.]+$/.test(lang)) {
            return false;
        }

        if (type !== 'default' && type !== 'installed') {
            return false;
        }

        try {
            appInstance.loadLanguage(lang, type);
            let languageChanged = false;
            
            if (!appInstance.languageLoadingError) {
                languageChanged = appInstance.setLanguage(lang, type);
            }

            return {
                languageChanged: languageChanged,
                lang: appInstance.currentLanguageName,
                type: appInstance.currentLanguageType,
                translations: appInstance.currentLanguageTranslations,
                momentLocale: appInstance.currentLanguageMomentLocale,
                wysiwygTranslation: appInstance.currentWysiwygTranslation,
                languageLoadingError: appInstance.languageLoadingError
            };
        } catch (error) {
            return false;
        }
    });
});
