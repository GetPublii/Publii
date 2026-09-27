const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const getPluginSettingsLocks = require('../plugin-settings-locks.js');

describe('Plugin settings window locks', function () {
    let application;
    let locks;
    let destroyedListeners;

    function sender(id) {
        const webContents = new EventEmitter();
        webContents.id = id;
        webContents.isDestroyed = () => false;
        return webContents;
    }

    beforeEach(function () {
        destroyedListeners = [];
        application = {
            sites: {
                demo: { name: 'demo', displayName: 'Demo website' },
                second: { name: 'second', displayName: 'Second website' }
            },
            windowManager: {
                onWindowDestroyed(callback) {
                    destroyedListeners.push(callback);
                }
            }
        };
        locks = getPluginSettingsLocks(application);
    });

    it('shares a registry between handlers of one app and isolates another app', function () {
        const owner = sender(1);
        locks.open(owner, { siteName: 'demo', pluginName: 'example' });

        assert.equal(getPluginSettingsLocks(application), locks);
        assert.deepEqual(getPluginSettingsLocks(application).blockingSites('example'), ['Demo website']);
        assert.deepEqual(getPluginSettingsLocks({ sites: {} }).blockingSites('example'), []);
        assert.equal(destroyedListeners.length, 1);
    });

    it('blocks only the plugin open in settings and identifies all affected websites', function () {
        locks.open(sender(1), { siteName: 'demo', pluginName: 'example' });
        locks.open(sender(2), { siteName: 'second', pluginName: 'example' });
        locks.open(sender(3), { siteName: 'second', pluginName: 'other' });

        assert.deepEqual(locks.blockingSites('example').sort(), ['Demo website', 'Second website']);
        assert.deepEqual(locks.blockingSites('other'), ['Second website']);
        assert.deepEqual(locks.blockingSites('unrelated'), []);
    });

    it('lists one website once even if several owners hold its settings', function () {
        locks.open(sender(1), { siteName: 'demo', pluginName: 'example' });
        locks.open(sender(2), { siteName: 'demo', pluginName: 'example' });

        assert.deepEqual(locks.blockingSites('example'), ['Demo website']);
    });

    it('distinguishes websites with identical display names in the blocking message', function () {
        application.sites.demo.displayName = 'My website';
        application.sites.second.displayName = 'My website';
        locks.open(sender(1), { siteName: 'demo', pluginName: 'example' });
        locks.open(sender(2), { siteName: 'second', pluginName: 'example' });

        assert.deepEqual(locks.blockingSites('example').sort(), ['My website (demo)', 'My website (second)']);
    });

    it('clears a destroyed sender even if its window cleanup notification was missed', function () {
        const owner = sender(1);
        const lockId = locks.open(owner, { siteName: 'demo', pluginName: 'example' });
        owner.isDestroyed = () => true;

        assert.equal(locks.has(owner.id, { siteName: 'demo', pluginName: 'example', lockId }), false);
        assert.deepEqual(locks.blockingSites('example'), []);
    });

    it('keeps a replacement session when an earlier request closes late', function () {
        const owner = sender(1);
        const previous = locks.open(owner, { siteName: 'demo', pluginName: 'example' });
        const current = locks.open(owner, { siteName: 'demo', pluginName: 'other' });
        locks.close(owner.id, previous);

        assert.notEqual(current, previous);
        assert.deepEqual(locks.blockingSites('example'), []);
        assert.deepEqual(locks.blockingSites('other'), ['Demo website']);
        assert.equal(locks.has(owner.id, {
            siteName: 'demo',
            pluginName: 'other',
            lockId: current
        }), true);
    });

    it('binds saves and close requests to the exact owner, website, plugin and token', function () {
        const owner = sender(1);
        const lockId = locks.open(owner, { siteName: 'demo', pluginName: 'example' });
        const request = { siteName: 'demo', pluginName: 'example', lockId };

        assert.equal(locks.has(owner.id, request), true);
        assert.equal(locks.has(2, request), false);
        assert.equal(locks.has(owner.id, { ...request, siteName: 'second' }), false);
        assert.equal(locks.has(owner.id, { ...request, pluginName: 'other' }), false);
        assert.equal(locks.has(owner.id, { ...request, lockId: 'old-token' }), false);
        locks.close(2, lockId);
        locks.close(owner.id, 'old-token');
        assert.equal(locks.has(owner.id, request), true);
        locks.close(owner.id, lockId);
        assert.equal(locks.has(owner.id, request), false);
    });

    it('releases a destroyed window without releasing another window', function () {
        locks.open(sender(1), { siteName: 'demo', pluginName: 'example' });
        locks.open(sender(2), { siteName: 'second', pluginName: 'example' });
        destroyedListeners.forEach(callback => callback(1));

        assert.deepEqual(locks.blockingSites('example'), ['Second website']);
    });

    it('releases a session after a main document reload or navigation commits', function () {
        const owner = sender(1);
        locks.open(owner, { siteName: 'demo', pluginName: 'example' });
        owner.emit('did-navigate', {}, 'file:///app/index.html');

        assert.deepEqual(locks.blockingSites('example'), []);
    });

    it('keeps settings protected during a navigation attempt and child frame navigation', function () {
        const owner = sender(1);
        locks.open(owner, { siteName: 'demo', pluginName: 'example' });
        owner.emit('did-start-navigation', {}, 'file:///next.html', false, true);
        owner.emit('did-start-loading');
        owner.emit('did-frame-navigate', {}, 'file:///plugin.html', 200, 'OK', false);
        owner.emit('did-navigate-in-page', {}, 'file:///app/index.html#/site/demo/plugins', true);

        assert.deepEqual(locks.blockingSites('example'), ['Demo website']);
    });

    it('releases a crashed renderer while leaving other windows protected', function () {
        const owner = sender(1);
        locks.open(owner, { siteName: 'demo', pluginName: 'example' });
        locks.open(sender(2), { siteName: 'second', pluginName: 'example' });
        owner.emit('render-process-gone', {}, { reason: 'crashed' });

        assert.deepEqual(locks.blockingSites('example'), ['Second website']);
    });
});
