const assert = require('node:assert/strict');
const fs = require('fs-extra');
const path = require('node:path');
const os = require('node:os');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const Plugins = require('../../plugins');

describe('Tools plugin state and metadata', () => {
    let base;
    let plugins;
    let appDirectory;
    let sitesDirectory;

    function statePath(siteName = 'demo') {
        return path.join(sitesDirectory, siteName, 'input/config/site.plugins.json');
    }

    function manifest(name, additions = {}) {
        fs.outputJsonSync(path.join(appDirectory, 'plugins', name, 'plugin.json'), {
            name,
            version: '1.0.0',
            author: { name: 'Plugin Author' },
            minimumPubliiVersion: '0.48.0',
            scope: 'site',
            ...additions
        });
    }

    beforeEach(() => {
        base = fs.mkdtempSync(path.join(os.tmpdir(), 'publii-plugin-list-'));
        appDirectory = path.join(base, 'app');
        sitesDirectory = path.join(base, 'sites');
        fs.ensureDirSync(path.dirname(statePath()));
        fs.ensureDirSync(path.dirname(statePath('second')));
        manifest('example', { description: 'A full description', config: [{ name: 'option' }] });
        manifest('future', { minimumPubliiVersion: '0.49.0' });
        manifest('simple');
        manifest('custom', { usePluginSettingsView: true });
        plugins = new Plugins(appDirectory, sitesDirectory);
        fs.writeJsonSync(statePath(), { example: false, future: true, retained: true });
        fs.writeJsonSync(statePath('second'), { example: false });
    });

    afterEach(() => fs.removeSync(base));

    it('loads optional descriptions and both settings types without changing older manifests', () => {
        const data = plugins.loadPlugins();
        assert.equal(data.find(item => item.directory === 'example').description, 'A full description');
        assert.equal(data.find(item => item.directory === 'example').hasSettings, true);
        assert.equal(data.find(item => item.directory === 'custom').hasSettings, true);
        assert.equal(data.find(item => item.directory === 'simple').hasSettings, false);
        assert.equal(data.find(item => item.directory === 'simple').description, '');
        const original = fs.readJsonSync(path.join(appDirectory, 'plugins/simple/plugin.json'));
        assert.equal(Object.hasOwn(original, 'description'), false);
    });

    it('preserves unrelated states, saved settings and other websites', () => {
        const settingsPath = path.join(sitesDirectory, 'demo/input/config/plugins/example.json');
        fs.outputJsonSync(settingsPath, { secret: 'fixture-setting' });
        assert.equal(plugins.setSitePluginState('demo', 'example', true, '0.48.0').status, true);
        assert.deepEqual(fs.readJsonSync(statePath()), { example: true, future: true, retained: true });
        assert.deepEqual(fs.readJsonSync(statePath('second')), { example: false });
        assert.deepEqual(fs.readJsonSync(settingsPath), { secret: 'fixture-setting' });
    });

    it('reads legacy disabled directory names without blocking valid plugins or rewriting the file', () => {
        const original = { example: true, 'Legacy plugin folder': false };
        fs.writeJsonSync(statePath(), original);
        const before = fs.readFileSync(statePath(), 'utf8');
        assert.deepEqual(plugins.readSitePluginsState('demo'), original);
        assert.equal(fs.readFileSync(statePath(), 'utf8'), before);
        assert.equal(plugins.setSitePluginState('demo', 'example', false, '0.48.0').status, true);
        assert.deepEqual(fs.readJsonSync(statePath()), { example: false, 'Legacy plugin folder': false });
        assert.equal(plugins.setSitePluginState('demo', '../outside', true, '0.48.0').status, false);
    });

    it('blocks incompatible activation while allowing an existing plugin to be disabled', () => {
        assert.equal(plugins.setSitePluginState('demo', 'future', true, '0.48.0').status, false);
        assert.equal(plugins.setSitePluginState('demo', 'future', false, '0.48.0').status, true);
        assert.equal(fs.readJsonSync(statePath()).future, false);
    });

    it('never overwrites malformed state with a new partial configuration', () => {
        for (const invalid of ['{broken', 'null', '[]', 'false']) {
            fs.writeFileSync(statePath(), invalid);
            assert.throws(() => plugins.readSitePluginsState('demo'));
            assert.throws(() => plugins.setSitePluginState('demo', 'example', true, '0.48.0'));
            assert.equal(fs.readFileSync(statePath(), 'utf8'), invalid);
        }
    });

    it('treats a missing state file as disabled without writing during a read', () => {
        fs.removeSync(statePath());
        assert.deepEqual(plugins.readSitePluginsState('demo'), {});
        assert.equal(fs.existsSync(statePath()), false);
        assert.equal(plugins.setSitePluginState('demo', 'example', true, '0.48.0').status, true);
    });

    it('rejects invalid paths, non-site plugins and non-boolean activation', () => {
        const before = fs.readFileSync(statePath(), 'utf8');
        assert.throws(() => plugins.readSitePluginsState('../demo'));
        assert.throws(() => plugins.readSitePluginsState('missing'));
        assert.equal(plugins.setSitePluginState('demo', '../example', true, '0.48.0').status, false);
        assert.equal(plugins.setSitePluginState('demo', 'example', 'false', '0.48.0').status, false);
        assert.equal(plugins.setSitePluginState('demo', 'missing', true, '0.48.0').status, false);
        manifest('global', { scope: 'app' });
        assert.equal(plugins.setSitePluginState('demo', 'global', true, '0.48.0').status, false);
        assert.equal(fs.readFileSync(statePath(), 'utf8'), before);
    });

    it('reports failed writes without changing the confirmed state', () => {
        plugins.saveSitePluginsConfig = () => false;
        assert.equal(plugins.setSitePluginState('demo', 'example', true, '0.48.0').status, false);
        assert.equal(fs.readJsonSync(statePath()).example, false);
    });

    it('keeps legacy IPC while isolating request-scoped state replies', () => {
        const filename = path.resolve(__dirname, '../plugin.js');
        const localRequire = createRequire(filename);
        const handlers = new Map();
        const legacy = new Map();
        const context = {
            module: { exports: {} },
            require(name) {
                if (name === 'electron') {
                    return {
                        ipcMain: {
                            on: (channel, handler) => legacy.set(channel, handler),
                            handle: (channel, handler) => handlers.set(channel, handler)
                        }
                    };
                }

                return localRequire(name);
            }
        };
        vm.runInNewContext(fs.readFileSync(filename, 'utf8'), context);
        new context.module.exports({ appDir: appDirectory, sitesDir: sitesDirectory });
        const event = { sender: { send() { throw new Error('New requests must not broadcast legacy replies'); } } };
        assert.ok(legacy.has('app-site-plugin-activate'));
        assert.ok(legacy.has('app-site-plugin-deactivate'));
        assert.equal(handlers.get('app-site-plugins:get-state')(event, { siteName: 'demo' }).status, true);
        assert.equal(handlers.get('app-site-plugins:get-state')(event, { siteName: '..' }).status, false);
        assert.equal(handlers.get('app-site-plugins:set-state')(event, {
            siteName: 'demo', pluginName: 'example', enabled: true
        }).status, true);
        const preload = fs.readFileSync(path.resolve(__dirname, '../../app-preload.js'), 'utf8');
        const invoke = preload.slice(preload.indexOf('    invoke:'));
        assert.ok(invoke.includes("'app-site-plugins:get-state'"));
        assert.ok(invoke.includes("'app-site-plugins:set-state'"));
    });
});
