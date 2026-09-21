const assert = require('node:assert/strict');
const fs = require('fs-extra');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const getDirectorySize = require('../../helpers/directory-size.js');

describe('Local preview files IPC', function () {
    let sitesDir;
    let application;
    let handlers;
    let events;
    let broadcasts;
    let disabledPreviews;
    let sizeChecks;
    let pendingSizeCheck;
    let appliedMimeTypes;
    let configNotifications;

    // Results come from another realm, so they are compared as plain data
    function plain (value) {
        return JSON.parse(JSON.stringify(value));
    }

    function invoke (channel, ...args) {
        return handlers.get(channel)({ sender: { id: 1 } }, ...args);
    }

    beforeEach(function () {
        sitesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'publii-preview-files-'));
        fs.outputFileSync(path.join(sitesDir, 'demo', 'preview', 'index.html'), '12345');
        fs.outputFileSync(path.join(sitesDir, 'demo', 'preview', 'media', 'image.jpg'), '1234567890');
        fs.outputFileSync(path.join(sitesDir, 'blog', 'preview', 'index.html'), '123');
        fs.ensureDirSync(path.join(sitesDir, 'empty-preview', 'preview'));
        fs.ensureDirSync(path.join(sitesDir, 'no-preview', 'input'));

        handlers = new Map();
        broadcasts = [];
        disabledPreviews = [];
        sizeChecks = [];
        pendingSizeCheck = null;
        appliedMimeTypes = [];
        configNotifications = [];

        application = {
            sitesDir: sitesDir,
            sites: { 'demo': {}, 'blog': {}, 'empty-preview': {}, 'no-preview': {} },
            appConfig: { previewServerPort: 3000, previewServerMimeTypes: [] },
            appConfigPath: path.join(sitesDir, 'app-config.json'),
            notifyAppConfigChanged (exceptWebContentsId) {
                configNotifications.push(exceptWebContentsId);
            },
            previewServer: {
                async disableSite (siteName) {
                    disabledPreviews.push(siteName);
                },
                setCustomMimeTypes (mimeTypes) {
                    appliedMimeTypes.push(mimeTypes);
                }
            },
            windowManager: {
                onWindowDestroyed () {},
                broadcast (channel, payload) {
                    broadcasts.push({ channel, payload });
                }
            }
        };

        const context = {
            module: { exports: {} },
            console: { log () {} },
            require (name) {
                if (name === 'electron') {
                    return {
                        shell: {},
                        ipcMain: {
                            on () {},
                            handle (channel, handler) {
                                handlers.set(channel, handler);
                            }
                        }
                    };
                }

                if (name === '../helpers/directory-size.js') {
                    return function (dir) {
                        sizeChecks.push(dir);
                        return pendingSizeCheck || getDirectorySize(dir);
                    };
                }

                if (name === 'fs-extra' || name === 'path') {
                    return require(name);
                }

                if (name === '../helpers/path-validator.js' || name === '../modules/preview-server/preview-server.js') {
                    return require(path.join(__dirname, '..', name));
                }

                return {};
            }
        };

        vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../preview.js'), 'utf8'), context);
        events = new context.module.exports(application);
    });

    afterEach(function () {
        fs.removeSync(sitesDir);
    });

    it('lists websites with preview files without checking their sizes', async function () {
        let files = plain(await invoke('app-local-preview:get-files-overview'));

        assert.deepEqual(files, [{ name: 'demo', size: null }, { name: 'blog', size: null }]);
        assert.deepEqual(sizeChecks, []);
    });

    it('checks the size on demand and keeps it', async function () {
        assert.deepEqual(plain(await invoke('app-local-preview:get-size', 'demo')), { status: true, size: 15 });

        // Files changed outside of Publii are not tracked - the size is valid until the next rendering or clearing
        fs.outputFileSync(path.join(sitesDir, 'demo', 'preview', 'new.html'), '12345');

        assert.deepEqual(plain(await invoke('app-local-preview:get-size', 'demo')), { status: true, size: 15 });
        assert.equal(sizeChecks.length, 1);
        assert.deepEqual(plain(await invoke('app-local-preview:get-files-overview')), [
            { name: 'demo', size: 15 },
            { name: 'blog', size: null }
        ]);
    });

    it('shares one check between all windows', async function () {
        let results = await Promise.all([
            invoke('app-local-preview:get-size', 'demo'),
            invoke('app-local-preview:get-size', 'demo'),
            invoke('app-local-preview:get-size', 'demo')
        ]);

        assert.deepEqual(plain(results), [{ status: true, size: 15 }, { status: true, size: 15 }, { status: true, size: 15 }]);
        assert.equal(sizeChecks.length, 1);
    });

    it('checks the size again when the preview files were changed', async function () {
        await invoke('app-local-preview:get-size', 'demo');
        fs.outputFileSync(path.join(sitesDir, 'demo', 'preview', 'new.html'), '12345');
        events.invalidatePreviewSize('demo');

        assert.deepEqual(plain(await invoke('app-local-preview:get-size', 'demo')), { status: true, size: 20 });
        assert.equal(sizeChecks.length, 2);
        assert.deepEqual(broadcasts, [{ channel: 'app-local-preview-files-changed', payload: 'demo' }]);
    });

    it('drops the result of a check when the files were changed in the meantime', async function () {
        let finishCheck;
        pendingSizeCheck = new Promise(resolve => finishCheck = resolve);

        let result = invoke('app-local-preview:get-size', 'demo');
        events.invalidatePreviewSize('demo');
        finishCheck(15);

        assert.deepEqual(plain(await result), { status: false, reason: 'outdated' });

        pendingSizeCheck = null;
        assert.deepEqual(plain(await invoke('app-local-preview:get-files-overview'))[0], { name: 'demo', size: null });
    });

    it('does not check websites which are being rendered', async function () {
        events.renderingSites.set('demo', 1);

        assert.deepEqual(plain(await invoke('app-local-preview:get-size', 'demo')), { status: false, reason: 'rendering-in-progress' });
        assert.deepEqual(sizeChecks, []);

        events.releaseRenderingSite('demo');

        assert.deepEqual(plain(await invoke('app-local-preview:get-size', 'demo')), { status: true, size: 15 });
    });

    it('rejects unknown and unsafe websites', async function () {
        for (let siteName of ['unknown', '../demo', '', null, undefined]) {
            assert.deepEqual(plain(await invoke('app-local-preview:get-size', siteName)), { status: false, reason: 'site-not-exists' });
            assert.deepEqual(plain(await invoke('app-local-preview:clear', siteName)), { status: false, reason: 'site-not-exists' });
        }

        assert.deepEqual(sizeChecks, []);
        assert.equal(fs.existsSync(path.join(sitesDir, 'demo', 'preview', 'index.html')), true);
    });

    it('clears preview files of the website and disables its preview', async function () {
        await invoke('app-local-preview:get-size', 'demo');

        assert.deepEqual(plain(await invoke('app-local-preview:clear', 'demo')), { status: true });
        assert.equal(fs.existsSync(path.join(sitesDir, 'demo', 'preview')), false);
        assert.equal(fs.existsSync(path.join(sitesDir, 'demo')), true);
        assert.deepEqual(disabledPreviews, ['demo']);
        assert.deepEqual(plain(await invoke('app-local-preview:get-files-overview')), [{ name: 'blog', size: null }]);
        assert.deepEqual(broadcasts, [{ channel: 'app-local-preview-files-changed', payload: 'demo' }]);
    });

    it('saves file types added by the user and applies them to the server', async function () {
        let result = plain(await invoke('app-local-preview:set-mime-types', [{ extension: 'ZIP', mimeType: 'Application/Zip' }]));
        let expected = [{ extension: '.zip', mimeType: 'application/zip' }];

        assert.deepEqual(result, { status: true, mimeTypes: expected });
        assert.deepEqual(fs.readJsonSync(application.appConfigPath).previewServerMimeTypes, expected);
        assert.deepEqual(plain(appliedMimeTypes), [expected]);
        assert.deepEqual(configNotifications, [1]);
        assert.deepEqual(plain(await invoke('app-local-preview:get-mime-types')).custom, expected);
        assert.ok(plain(await invoke('app-local-preview:get-mime-types')).builtIn.some(item => item.extension === '.html'));
    });

    it('does not save an invalid list of file types', async function () {
        for (let mimeTypes of [[{ extension: '../x', mimeType: 'application/zip' }], [{ extension: '.html', mimeType: 'text/plain' }], 'zip', null]) {
            assert.equal(plain(await invoke('app-local-preview:set-mime-types', mimeTypes)).status, false);
        }

        assert.equal(fs.existsSync(application.appConfigPath), false);
        assert.deepEqual(plain(application.appConfig.previewServerMimeTypes), []);
        assert.deepEqual(appliedMimeTypes, []);
        assert.deepEqual(configNotifications, []);
    });

    it('ignores invalid file types stored in the config file', async function () {
        application.appConfig.previewServerMimeTypes = [{ extension: '.zip', mimeType: 'application/zip' }, { extension: '../x', mimeType: 'x/y' }, null];

        assert.deepEqual(plain(await invoke('app-local-preview:get-mime-types')).custom, [{ extension: '.zip', mimeType: 'application/zip' }]);
    });

    it('does not clear preview files during the rendering', async function () {
        events.renderingSites.set('demo', 1);

        assert.deepEqual(plain(await invoke('app-local-preview:clear', 'demo')), { status: false, reason: 'rendering-in-progress' });
        assert.equal(fs.existsSync(path.join(sitesDir, 'demo', 'preview', 'index.html')), true);
        assert.deepEqual(disabledPreviews, []);
    });
});
