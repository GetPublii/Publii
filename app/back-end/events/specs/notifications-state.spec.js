const assert = require('node:assert/strict');
const fs = require('fs-extra');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { EventEmitter } = require('node:events');
const Utils = require('../../helpers/utils.js');
const defaultConfig = require('../../../config/AST.app.config.js');

describe('Notification center settings persistence', function () {
    let base;
    let application;
    let handlers;
    let failWrites;

    beforeEach(function () {
        base = fs.mkdtempSync(path.join(os.tmpdir(), 'publii-notification-state-'));
        handlers = new Map();
        failWrites = false;

        class MockWindow extends EventEmitter {
            constructor() {
                super();
                this.webContents = new EventEmitter();
                this.webContents.setWindowOpenHandler = () => {};
                this.webContents.setZoomFactor = () => {};
                this.webContents.isDestroyed = () => false;
                this.webContents.send = (channel, data) => {
                    if (channel === 'app-data-loaded') {
                        this.initialData = JSON.parse(JSON.stringify(data));
                    }
                };
            }

            loadURL() {}
        }

        const fileAPI = {
            readFileSync: fs.readFileSync,
            writeFileSync(...args) {
                if (failWrites) {
                    throw new Error('Simulated write failure');
                }

                return fs.writeFileSync(...args);
            }
        };

        function load(relativePath) {
            const filename = path.resolve(__dirname, relativePath);
            const context = {
                module: { exports: {} },
                __dirname: path.dirname(filename),
                console: { log() {} },
                process,
                URL,
                setTimeout,
                require(name) {
                    if (name === 'electron') {
                        return {
                            ipcMain: {
                                on(channel, handler) {
                                    handlers.set(channel, handler);
                                }
                            },
                            BrowserWindow: MockWindow,
                            screen: {
                                getAllDisplays() {
                                    return [{
                                        bounds: { x: 0, y: 0, width: 1920, height: 1080 },
                                        workAreaSize: { width: 1920, height: 1080 }
                                    }];
                                }
                            }
                        };
                    }

                    if (name === 'fs-extra' || name.endsWith('/file.js')) {
                        return fileAPI;
                    }

                    if (name === 'path' || name === 'os' || name === 'url') {
                        return require(name);
                    }

                    if (name === 'normalize-path') {
                        return value => value;
                    }

                    if (name.endsWith('/AST.app.config')) {
                        return defaultConfig;
                    }

                    if (name.endsWith('/utils.js')) {
                        return Utils;
                    }

                    if (name.endsWith('/context-menu-builder.js')) {
                        return class ContextMenuBuilder {};
                    }

                    return {};
                }
            };

            vm.runInNewContext(fs.readFileSync(filename, 'utf8'), context, { filename });
            return context.module.exports;
        }

        const App = load('../../app.js');
        const AppEvents = load('../app.js');
        application = Object.create(App.prototype);
        Object.assign(application, {
            appConfigPath: path.join(base, 'app-config.json'),
            initPath: path.join(base, 'window-config.json'),
            basedir: base,
            windowManager: { getAllWindows: () => [], releaseViewLocksForWindow () {}, broadcast () {} },
            initWindow() {
                this.mainWindow = this._createWindow({});
                this.mainWindow.webContents.emit('did-finish-load');
            }
        });
        fs.writeJsonSync(application.initPath, { x: 0, y: 0, width: 1200, height: 800 });
        fs.writeJsonSync(application.appConfigPath, {
            notificationsStatus: 'rejected',
            language: 'en-gb',
            languageType: 'default',
            editorFontSize: 20
        });
        application.loadConfig();
        new AppEvents(application);
    });

    afterEach(function () {
        fs.removeSync(base);
    });

    for (const status of ['accepted', 'rejected']) {
        it('keeps ' + status + ' after reopening a window and restarting the app', function () {
            const previousStatus = status === 'accepted' ? 'rejected' : 'accepted';
            application.appConfig.notificationsStatus = previousStatus;
            fs.writeJsonSync(application.appConfigPath, application.appConfig);

            handlers.get('app-set-notifications-center-state')({ sender: { id: 1 } },status);
            application.reopenMainWindow();
            assert.equal(application.mainWindow.initialData.config.notificationsStatus, status);
            assert.equal(fs.readJsonSync(application.appConfigPath).notificationsStatus, status);

            application.appConfig = null;
            application.loadConfig();
            application.initWindow();
            assert.equal(application.mainWindow.initialData.config.notificationsStatus, status);
            assert.equal(application.mainWindow.initialData.config.editorFontSize, 20);
        });
    }

    it('preserves the new notification setting when changing the application language', function () {
        handlers.get('app-set-notifications-center-state')({ sender: { id: 1 } },'accepted');
        application.setLanguage('pl', 'default');
        const savedConfig = fs.readJsonSync(application.appConfigPath);

        assert.equal(savedConfig.notificationsStatus, 'accepted');
        assert.equal(savedConfig.language, 'pl');
        assert.equal(savedConfig.editorFontSize, 20);
    });

    it('keeps the previous setting if writing the config fails', function () {
        failWrites = true;
        handlers.get('app-set-notifications-center-state')({ sender: { id: 1 } },'accepted');

        assert.equal(application.appConfig.notificationsStatus, 'rejected');
        assert.equal(fs.readJsonSync(application.appConfigPath).notificationsStatus, 'rejected');
    });

    it('removes leftovers of interrupted backup operations from the temp directory', function () {
        let tempDir = path.join(base, 'temp');

        application.appDir = base;
        fs.outputFileSync(path.join(tempDir, 'restore-abc123', 'input', 'db.sqlite'), 'leftover');
        fs.outputFileSync(path.join(tempDir, 'backup-to-restore-1', 'input', 'db.sqlite'), 'leftover');

        application.cleanTempDirectory();

        assert.deepEqual(fs.readdirSync(tempDir), []);

        // A missing directory is not an error
        fs.removeSync(tempDir);
        assert.doesNotThrow(() => application.cleanTempDirectory());
    });

    it('drops messages sent to a window which has been closed in the meantime', function () {
        let win = application._createWindow({});

        win.webContents.send('app-data-loaded', { delivered: 'before closing' });
        assert.deepEqual(win.initialData, { delivered: 'before closing' });

        win.webContents.isDestroyed = () => true;

        assert.doesNotThrow(() => {
            win.webContents.send('app-data-loaded', { delivered: 'after closing' });
        });
        assert.deepEqual(win.initialData, { delivered: 'before closing' });
    });

    it('closes only the window with unsaved changes unless it has blocked quitting the app', function () {
        let quits = 0;
        let closes = 0;
        let win = application._createWindow({});

        win.webContents.id = 7;
        win.isDestroyed = () => false;
        win.close = () => {
            closes++;
        };
        application.app = {
            quit () {
                quits++;
            }
        };
        application.quitRequested = false;
        application.windowsBlockingQuit = new Set();
        application.windowManager.getWindow = () => win;

        // Closing the window itself (i.e. Cmd+W)
        win.webContents.emit('will-prevent-unload');
        application.closeWindowAfterConfirmation(win.webContents);
        assert.deepEqual([closes, quits], [1, 0]);

        // Quitting the app blocked by this window
        application.quitRequested = true;
        win.webContents.emit('will-prevent-unload');
        assert.equal(application.quitRequested, false);
        application.closeWindowAfterConfirmation(win.webContents);
        assert.deepEqual([closes, quits], [1, 1]);

        // A quit cancelled by the user must not turn the next window close into quitting
        application.quitRequested = true;
        win.webContents.emit('will-prevent-unload');
        win.webContents.emit('will-prevent-unload');
        application.closeWindowAfterConfirmation(win.webContents);
        assert.deepEqual([closes, quits], [2, 1]);
    });

    it('saves the window position only for the primary window', function () {
        let primaryWindow = application._createWindow({});
        let secondaryWindow = application._createWindow({}, { isNewWindow: true });
        let initialBounds = { x: 0, y: 0, width: 1200, height: 800 };
        let primaryBounds = { x: 10, y: 20, width: 1300, height: 800 };

        application.mainWindow = primaryWindow;
        primaryWindow.getBounds = () => primaryBounds;
        secondaryWindow.getBounds = () => ({ x: 500, y: 500, width: 900, height: 700 });

        secondaryWindow.emit('close');
        assert.deepEqual(fs.readJsonSync(application.initPath), initialBounds);

        primaryWindow.emit('close');
        assert.deepEqual(fs.readJsonSync(application.initPath), primaryBounds);
        assert.equal(application.windowBounds, primaryBounds);
    });

    it('drops the legacy preview location and reports it to the first window only', function () {
        fs.writeJsonSync(application.appConfigPath, Object.assign({}, application.appConfig, {
            previewLocation: '  /custom/preview  '
        }));

        application.loadConfig();

        assert.equal('previewLocation' in application.appConfig, false);
        assert.equal('previewLocation' in fs.readJsonSync(application.appConfigPath), false);

        application.initWindow();
        assert.equal(application.mainWindow.initialData.removedPreviewLocation, '/custom/preview');

        application.initWindow();
        assert.equal(application.mainWindow.initialData.removedPreviewLocation, '');

        application.loadConfig();
        application.initWindow();
        assert.equal(application.mainWindow.initialData.removedPreviewLocation, '');
    });

    it('ignores an empty legacy preview location', function () {
        fs.writeJsonSync(application.appConfigPath, Object.assign({}, application.appConfig, {
            previewLocation: ''
        }));

        application.loadConfig();
        application.initWindow();

        assert.equal('previewLocation' in application.appConfig, false);
        assert.equal(application.mainWindow.initialData.removedPreviewLocation, '');
    });

    it('refuses to move the websites while other windows are open', function () {
        let replies = [];
        let databasesClosed = false;
        let currentLocation = path.join(base, 'sites');

        application.appConfig.sitesLocation = currentLocation;
        application.windowManager.getAllWindows = () => [{}, {}];
        application.closeAllDbs = () => {
            databasesClosed = true;
        };

        handlers.get('app-config-save')({
            sender: {
                send: (channel, data) => replies.push({ channel, data })
            }
        }, Object.assign({}, application.appConfig, {
            sitesLocation: path.join(base, 'moved-sites')
        }));

        // The reply is created in another VM context, so compare it by value only
        assert.deepEqual(JSON.parse(JSON.stringify(replies)), [{
            channel: 'app-config-saved',
            data: {
                status: false,
                message: 'error-save',
                reason: 'other-windows-open'
            }
        }]);
        assert.equal(databasesClosed, false);
        assert.equal(application.appConfig.sitesLocation, currentLocation);
    });

    it('broadcasts the changed config to the other windows and applies their zoom', function () {
        let broadcasts = [];
        let createWindow = id => ({
            webContents: {
                id,
                setZoomFactor (zoom) {
                    this.zoomFactor = zoom;
                }
            }
        });
        let ownWindow = createWindow(1);
        let otherWindow = createWindow(2);

        application.appConfig.uiZoomLevel = 1.25;
        application.windowManager.getAllWindows = () => [ownWindow, otherWindow];
        application.windowManager.broadcast = (channel, payload, exceptWebContentsId) => {
            broadcasts.push({ channel, status: payload.notificationsStatus, exceptWebContentsId });
        };

        handlers.get('app-set-notifications-center-state')({ sender: { id: 1 } }, 'accepted');

        assert.deepEqual(broadcasts, [{ channel: 'app-config-updated', status: 'accepted', exceptWebContentsId: 1 }]);
        assert.equal(otherWindow.webContents.zoomFactor, 1.25);
        assert.equal(ownWindow.webContents.zoomFactor, undefined);
    });

    it('hands the installed themes, languages and plugins over to the other windows', function () {
        let broadcasts = [];

        application.themes = [{ name: 'simple' }];
        application.languages = [{ name: 'pl' }];
        application.plugins = [];
        application.windowManager.broadcast = (channel, payload, exceptWebContentsId) => {
            broadcasts.push({ channel, payload, exceptWebContentsId });
        };

        application.notifyExtensionsChanged(3);

        assert.equal(broadcasts.length, 1);
        assert.equal(broadcasts[0].channel, 'app-extensions-updated');
        assert.equal(broadcasts[0].exceptWebContentsId, 3);
        assert.equal(broadcasts[0].payload.themes, application.themes);
        assert.equal(broadcasts[0].payload.languages, application.languages);
        assert.equal(broadcasts[0].payload.plugins, application.plugins);
    });

    it('saves the color theme and hands it over to the other windows', function () {
        let broadcasts = [];

        application.windowManager.broadcast = (channel, payload, exceptWebContentsId) => {
            broadcasts.push({ channel, payload, exceptWebContentsId });
        };

        handlers.get('app-save-color-theme')({ sender: { id: 1 } }, 'dark');
        handlers.get('app-save-color-theme')({ sender: { id: 1 } }, 'not-a-theme');

        assert.equal(application.appConfig.appTheme, 'dark');
        assert.equal(fs.readJsonSync(application.appConfigPath).appTheme, 'dark');
        assert.deepEqual(broadcasts, [{ channel: 'app-theme-updated', payload: 'dark', exceptWebContentsId: 1 }]);
    });

    it('does not broadcast the config when saving it fails', function () {
        let broadcasts = 0;

        application.windowManager.broadcast = () => {
            broadcasts++;
        };
        failWrites = true;

        handlers.get('app-set-notifications-center-state')({ sender: { id: 1 } }, 'accepted');

        assert.equal(broadcasts, 0);
    });

    it('refuses to change the backups location while other windows are open', function () {
        let replies = [];
        let sender = {
            id: 1,
            send: (channel, data) => replies.push({ channel, data })
        };
        let createWindow = id => ({ webContents: { id, setZoomFactor () {} } });

        application.appConfig.sitesLocation = path.join(base, 'sites');
        application.appConfig.backupsLocation = '';
        application.windowManager.getAllWindows = () => [createWindow(1), createWindow(2)];

        handlers.get('app-config-save')({ sender }, Object.assign({}, application.appConfig, {
            backupsLocation: path.join(base, 'backups')
        }));

        // The reply is created in another VM context, so compare it by value only
        assert.deepEqual(JSON.parse(JSON.stringify(replies)), [{
            channel: 'app-config-saved',
            data: {
                status: false,
                message: 'error-save',
                reason: 'backups-location-other-windows'
            }
        }]);
        assert.equal(application.appConfig.backupsLocation, '');

        // The same change is accepted once the other windows are closed
        replies = [];
        application.windowManager.getAllWindows = () => [createWindow(1)];

        handlers.get('app-config-save')({ sender }, Object.assign({}, application.appConfig, {
            backupsLocation: path.join(base, 'backups')
        }));

        assert.equal(replies[0].data.status, true);
        assert.equal(application.appConfig.backupsLocation, path.join(base, 'backups'));
    });

    it('handles an unreadable config without changing the in-memory setting', function () {
        application.appConfigPath = path.join(base, 'missing.json');

        assert.doesNotThrow(() => {
            handlers.get('app-set-notifications-center-state')({ sender: { id: 1 } },'accepted');
        });
        assert.equal(application.appConfig.notificationsStatus, 'rejected');
    });
});
