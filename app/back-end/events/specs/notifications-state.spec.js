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
            windowManager: { getAllWindows: () => [] },
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

            handlers.get('app-set-notifications-center-state')({}, status);
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
        handlers.get('app-set-notifications-center-state')({}, 'accepted');
        application.setLanguage('pl', 'default');
        const savedConfig = fs.readJsonSync(application.appConfigPath);

        assert.equal(savedConfig.notificationsStatus, 'accepted');
        assert.equal(savedConfig.language, 'pl');
        assert.equal(savedConfig.editorFontSize, 20);
    });

    it('keeps the previous setting if writing the config fails', function () {
        failWrites = true;
        handlers.get('app-set-notifications-center-state')({}, 'accepted');

        assert.equal(application.appConfig.notificationsStatus, 'rejected');
        assert.equal(fs.readJsonSync(application.appConfigPath).notificationsStatus, 'rejected');
    });

    it('handles an unreadable config without changing the in-memory setting', function () {
        application.appConfigPath = path.join(base, 'missing.json');

        assert.doesNotThrow(() => {
            handlers.get('app-set-notifications-center-state')({}, 'accepted');
        });
        assert.equal(application.appConfig.notificationsStatus, 'rejected');
    });
});
