const assert = require('node:assert/strict');
const fs = require('fs-extra');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { EventEmitter } = require('node:events');
const { createRequire } = require('node:module');
const { zipSync, strToU8 } = require('fflate');
const Plugins = require('../../plugins.js');
const getPluginSettingsLocks = require('../../helpers/plugin-settings-locks.js');

describe('Central plugin manager settings protection', function () {
    let base;
    let application;
    let invokeHandlers;
    let eventHandlers;
    let notifications;
    let windows;
    let editor;
    let manager;

    function pluginDirectory(name = 'example') {
        return path.join(application.appDir, 'plugins', name);
    }

    function configPath(siteName = 'demo', pluginName = 'example') {
        return path.join(application.sitesDir, siteName, 'input', 'config', 'plugins', pluginName + '.json');
    }

    function manifest(name, version = '1.0.0') {
        return {
            name,
            version,
            scope: 'site',
            minimumPubliiVersion: '0.48.0',
            author: { name: 'Test fixture' },
            config: [{ name: 'title', type: 'text', value: 'Default' }]
        };
    }

    function createPlugin(directory, name, version = '1.0.0') {
        fs.outputJsonSync(path.join(directory, 'plugin.json'), manifest(name, version));
        fs.outputFileSync(path.join(directory, 'main.js'), 'module.exports = class Plugin {};');
    }

    function sender(id, siteName) {
        const webContents = new EventEmitter();
        webContents.id = id;
        webContents.isDestroyed = () => false;
        webContents.replies = [];
        webContents.send = (channel, data) => webContents.replies.push({ channel, data });
        windows.set(id, siteName);
        return webContents;
    }

    function invoke(channel, webContents, payload) {
        return invokeHandlers.get(channel)({ sender: webContents }, payload);
    }

    function send(channel, webContents, payload) {
        eventHandlers.get(channel)({ sender: webContents }, payload);
        return webContents.replies[webContents.replies.length - 1];
    }

    function open(webContents = editor, pluginName = 'example', siteName = 'demo') {
        return invoke('app-site-plugin-settings:open', webContents, { siteName, pluginName });
    }

    function close(webContents, lockId) {
        send('app-site-plugin-settings-close', webContents, { lockId });
    }

    function loadHandlers(filename) {
        const localRequire = createRequire(filename);
        const dependencies = new Set([
            'fs-extra',
            'path',
            '../plugins.js',
            '../helpers/path-validator.js',
            '../helpers/utils.js',
            './../helpers/zip.helper.js',
            '../helpers/plugin-settings-locks.js',
            '../../package.json'
        ]);
        const context = {
            module: { exports: {} },
            console,
            setTimeout,
            clearTimeout,
            require(name) {
                if (name === 'electron') {
                    return {
                        ipcMain: {
                            on(channel, handler) {
                                eventHandlers.set(channel, handler);
                            },
                            handle(channel, handler) {
                                invokeHandlers.set(channel, handler);
                            }
                        }
                    };
                }

                return dependencies.has(name) ? localRequire(name) : {};
            }
        };
        vm.runInNewContext(fs.readFileSync(filename, 'utf8'), context, { filename });
        new context.module.exports(application);
    }

    beforeEach(function () {
        base = fs.mkdtempSync(path.join(os.tmpdir(), 'publii-settings-guard-'));
        invokeHandlers = new Map();
        eventHandlers = new Map();
        notifications = [];
        windows = new Map();
        application = {
            appDir: path.join(base, 'app'),
            sitesDir: path.join(base, 'sites'),
            sites: {
                demo: { name: 'demo', displayName: 'Demo website' },
                second: { name: 'second', displayName: 'Second website' }
            },
            windowManager: {
                onWindowDestroyed() {},
                getSiteForWindow(owner) {
                    return windows.get(owner);
                }
            },
            notifyExtensionsChanged(owner) {
                notifications.push(owner);
            }
        };
        createPlugin(pluginDirectory(), 'example');
        createPlugin(pluginDirectory('other'), 'other');
        fs.outputJsonSync(configPath(), { title: 'Original' });
        fs.outputJsonSync(configPath('second'), { title: 'Second original' });
        application.plugins = new Plugins(application.appDir, application.sitesDir).loadPlugins();
        editor = sender(10, 'demo');
        manager = sender(20, null);
        loadHandlers(path.resolve(__dirname, '../plugin.js'));
        loadHandlers(path.resolve(__dirname, '../app.js'));
    });

    afterEach(function () {
        fs.removeSync(base);
    });

    it('opens real settings and blocks only their installed plugin', function () {
        const result = open();

        assert.equal(result.status, true);
        assert.equal(typeof result.lockId, 'string');
        assert.equal(result.config.pluginData.name, 'example');
        assert.equal(JSON.parse(result.config.pluginConfig).title, 'Original');
        assert.deepEqual(getPluginSettingsLocks(application).blockingSites('example'), ['Demo website']);
        assert.deepEqual(getPluginSettingsLocks(application).blockingSites('other'), []);
    });

    it('does not lock missing plugins, corrupt manifests or another window\'s website', function () {
        assert.equal(open(editor, 'missing').status, false);
        fs.writeFileSync(path.join(pluginDirectory(), 'plugin.json'), '{broken');
        assert.equal(open().status, false);
        assert.equal(open(editor, 'other', 'second').status, false);

        assert.deepEqual(getPluginSettingsLocks(application).blockingSites('missing'), []);
        assert.deepEqual(getPluginSettingsLocks(application).blockingSites('example'), []);
        assert.deepEqual(getPluginSettingsLocks(application).blockingSites('other'), []);
    });

    it('saves only the matching live session and never writes with a closed token', function () {
        const result = open();
        const payload = {
            siteName: 'demo',
            pluginName: 'example',
            lockId: result.lockId,
            newConfig: { title: 'Changed' }
        };

        assert.equal(invoke('app-site-plugin-settings:save', editor, payload), true);
        assert.deepEqual(fs.readJsonSync(configPath()), { title: 'Changed' });
        close(editor, result.lockId);
        payload.newConfig.title = 'Stale';
        assert.equal(invoke('app-site-plugin-settings:save', editor, payload), false);
        assert.deepEqual(fs.readJsonSync(configPath()), { title: 'Changed' });
    });

    it('rejects saves for another owner, website or plugin without touching configurations', function () {
        const result = open();
        const payload = {
            siteName: 'demo',
            pluginName: 'example',
            lockId: result.lockId,
            newConfig: { title: 'Wrong target' }
        };

        assert.equal(invoke('app-site-plugin-settings:save', manager, payload), false);
        assert.equal(invoke('app-site-plugin-settings:save', editor, { ...payload, siteName: 'second' }), false);
        assert.equal(invoke('app-site-plugin-settings:save', editor, { ...payload, pluginName: 'other' }), false);
        assert.deepEqual(fs.readJsonSync(configPath()), { title: 'Original' });
        assert.deepEqual(fs.readJsonSync(configPath('second')), { title: 'Second original' });
        assert.equal(fs.existsSync(configPath('demo', 'other')), false);
    });

    it('rejects an old settings save after its window switches to a different website', function () {
        const result = open();
        windows.set(editor.id, 'second');
        const payload = {
            siteName: 'demo',
            pluginName: 'example',
            lockId: result.lockId,
            newConfig: { title: 'After switching sites' }
        };

        assert.equal(invoke('app-site-plugin-settings:save', editor, payload), false);
        assert.deepEqual(fs.readJsonSync(configPath()), { title: 'Original' });
        assert.deepEqual(fs.readJsonSync(configPath('second')), { title: 'Second original' });
    });

    it('ignores a late close and save after a newer settings session opens', function () {
        const previous = open();
        const current = open();
        close(editor, previous.lockId);
        const payload = {
            siteName: 'demo',
            pluginName: 'example',
            lockId: previous.lockId,
            newConfig: { title: 'Old form' }
        };

        assert.equal(invoke('app-site-plugin-settings:save', editor, payload), false);
        assert.equal(invoke('app-site-plugin-settings:save', editor, { ...payload, lockId: current.lockId }), true);
        assert.deepEqual(getPluginSettingsLocks(application).blockingSites('example'), ['Demo website']);
    });

    it('does not claim a successful save after the installed plugin disappears', function () {
        const result = open();
        fs.removeSync(pluginDirectory());
        const payload = {
            siteName: 'demo',
            pluginName: 'example',
            lockId: result.lockId,
            newConfig: { title: 'After removal' }
        };

        assert.equal(invoke('app-site-plugin-settings:save', editor, payload), false);
        assert.deepEqual(fs.readJsonSync(configPath()), { title: 'Original' });
        const reply = send('app-site-save-plugin-config', editor, payload);
        assert.equal(reply.channel, 'app-site-plugin-config-saved');
        assert.equal(reply.data, false);
    });

    it('blocks removal until the last affected settings window closes', function () {
        const secondEditor = sender(30, 'second');
        const first = open();
        const second = open(secondEditor, 'example', 'second');
        const payload = { name: 'example', directory: 'example' };
        let reply = send('app-plugin-delete', manager, payload);

        assert.equal(reply.data.status, false);
        assert.equal(reply.data.code, 'settings-open');
        assert.deepEqual(Array.from(reply.data.sites).sort(), ['Demo website', 'Second website']);
        assert.equal(fs.existsSync(pluginDirectory()), true);
        assert.equal(notifications.length, 0);
        close(editor, first.lockId);
        reply = send('app-plugin-delete', manager, payload);
        assert.equal(reply.data.status, false);
        assert.deepEqual(Array.from(reply.data.sites), ['Second website']);
        close(secondEditor, second.lockId);
        reply = send('app-plugin-delete', manager, payload);
        assert.equal(reply.data.status, true);
        assert.equal(fs.existsSync(pluginDirectory()), false);
        assert.deepEqual(notifications, [manager.id]);
        assert.deepEqual(fs.readJsonSync(configPath()), { title: 'Original' });
    });

    for (const sourceType of ['directory', 'ZIP']) {
        it('protects installed files from a ' + sourceType + ' update and permits retry after closing settings', function () {
            const result = open();
            let sourcePath;

            if (sourceType === 'ZIP') {
                sourcePath = path.join(base, 'example.zip');
                fs.writeFileSync(sourcePath, zipSync({
                    'example/plugin.json': strToU8(JSON.stringify(manifest('example', '2.0.0'))),
                    'example/main.js': strToU8('module.exports = class UpdatedPlugin {};')
                }));
            } else {
                sourcePath = path.join(base, 'incoming', 'example');
                createPlugin(sourcePath, 'example', '2.0.0');
            }

            const originalMain = fs.readFileSync(path.join(pluginDirectory(), 'main.js'), 'utf8');
            let reply = send('app-plugin-upload', manager, { sourcePath });
            assert.equal(reply.data.status, 'blocked');
            assert.equal(reply.data.code, 'settings-open');
            assert.deepEqual(Array.from(reply.data.sites), ['Demo website']);
            assert.equal(fs.readJsonSync(path.join(pluginDirectory(), 'plugin.json')).version, '1.0.0');
            assert.equal(fs.readFileSync(path.join(pluginDirectory(), 'main.js'), 'utf8'), originalMain);
            assert.equal(fs.existsSync(path.join(application.appDir, 'plugins', '__TEMP__')), false);
            assert.equal(notifications.length, 0);
            close(editor, result.lockId);
            reply = send('app-plugin-upload', manager, { sourcePath });
            assert.equal(reply.data.status, 'updated');
            assert.equal(fs.readJsonSync(path.join(pluginDirectory(), 'plugin.json')).version, '2.0.0');
            assert.deepEqual(notifications, [manager.id]);
            assert.deepEqual(fs.readJsonSync(configPath()), { title: 'Original' });
        });
    }

    it('allows another plugin to be installed or removed while settings stay open', function () {
        open();
        const sourcePath = path.join(base, 'incoming', 'unrelated');
        createPlugin(sourcePath, 'unrelated');
        const upload = send('app-plugin-upload', manager, { sourcePath });
        const removal = send('app-plugin-delete', manager, { name: 'other', directory: 'other' });

        assert.equal(upload.data.status, 'added');
        assert.equal(removal.data.status, true);
        assert.equal(fs.existsSync(pluginDirectory('unrelated')), true);
        assert.equal(fs.existsSync(pluginDirectory('other')), false);
        assert.deepEqual(getPluginSettingsLocks(application).blockingSites('example'), ['Demo website']);
    });
});
