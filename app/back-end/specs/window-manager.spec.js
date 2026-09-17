const assert = require('assert');
const PubliiWindowManager = require('../window-manager.js');

function createWindow (id) {
    let listeners = {};
    let windowListeners = {};

    let win = {
        focused: false,
        minimized: false,
        received: [],
        isMinimized () {
            return this.minimized;
        },
        restore () {
            this.minimized = false;
        },
        on (eventName, callback) {
            windowListeners[eventName] = callback;
        },
        emitWindow (eventName) {
            if (windowListeners[eventName]) {
                windowListeners[eventName]();
            }
        },
        webContents: {
            id,
            destroyed: false,
            on (eventName, callback) {
                listeners[eventName] = callback;
            },
            isDestroyed () {
                return this.destroyed;
            },
            send (channel, payload) {
                win.received.push({ channel, payload });
            }
        },
        emitWebContents (eventName) {
            if (listeners[eventName]) {
                listeners[eventName]();
            }
        },
        focus () {
            this.focused = true;
        },
        isDestroyed () {
            return false;
        }
    };

    return win;
}

describe('Publii window manager', function() {
    it('should focus the window which owns a website', function() {
        let manager = new PubliiWindowManager({ closeDbForSite () {} });
        let win = createWindow(10);

        manager.registerWindow(win);
        manager.setWindowSite(win.webContents.id, 'my-website');

        assert.strictEqual(manager.focusWindowBySite('my-website'), true);
        assert.strictEqual(win.focused, true);
    });

    it('should forget the website of a window which deleted it', function() {
        let manager = new PubliiWindowManager({ closeDbForSite () {} });
        let win = createWindow(12);

        manager.registerWindow(win);
        manager.setWindowSite(win.webContents.id, 'my-website');
        manager.clearWindowSite(win.webContents.id);

        assert.strictEqual(manager.getSiteForWindow(win.webContents.id), null);
        assert.strictEqual(manager.isSiteLockedByOther('my-website', 99), false);
        assert.strictEqual(manager.focusWindowBySite('my-website'), false);
    });

    it('should release a reserved website when its window is destroyed', function() {
        let closedSite = '';
        let manager = new PubliiWindowManager({
            closeDbForSite (siteName) {
                closedSite = siteName;
            }
        });
        let win = createWindow(11);

        manager.registerWindow(win);
        manager.setWindowSite(win.webContents.id, 'reserved-website');
        win.emitWebContents('destroyed');

        assert.strictEqual(manager.focusWindowBySite('reserved-website'), false);
        assert.strictEqual(closedSite, 'reserved-website');
    });

    it('should reserve an exclusive view for a single window only', function() {
        let manager = new PubliiWindowManager({ closeDbForSite () {} });
        let first = createWindow(20);
        let second = createWindow(21);

        manager.registerWindow(first);
        manager.registerWindow(second);

        assert.strictEqual(manager.lockView('app-settings', first.webContents.id), true);
        assert.strictEqual(manager.lockView('app-settings', first.webContents.id), true);
        assert.strictEqual(manager.lockView('app-settings', second.webContents.id), false);
        assert.strictEqual(manager.lockView('app-themes', second.webContents.id), true);
        assert.strictEqual(manager.focusWindowByView('app-settings'), true);
        assert.strictEqual(first.focused, true);
        assert.strictEqual(second.focused, false);
    });

    it('should release an exclusive view only for its owner', function() {
        let manager = new PubliiWindowManager({ closeDbForSite () {} });
        let first = createWindow(22);
        let second = createWindow(23);

        manager.registerWindow(first);
        manager.registerWindow(second);
        manager.lockView('app-settings', first.webContents.id);
        manager.unlockView('app-settings', second.webContents.id);

        assert.strictEqual(manager.lockView('app-settings', second.webContents.id), false);

        manager.unlockView('app-settings', first.webContents.id);

        assert.strictEqual(manager.lockView('app-settings', second.webContents.id), true);
        assert.strictEqual(manager.focusWindowByView('app-languages'), false);
    });

    it('should release exclusive views when their window is destroyed', function() {
        let manager = new PubliiWindowManager({ closeDbForSite () {} });
        let first = createWindow(24);
        let second = createWindow(25);

        manager.registerWindow(first);
        manager.registerWindow(second);
        manager.lockView('app-settings', first.webContents.id);
        manager.lockView('app-plugins', first.webContents.id);
        first.emitWebContents('destroyed');

        assert.strictEqual(manager.focusWindowByView('app-settings'), false);
        assert.strictEqual(manager.lockView('app-settings', second.webContents.id), true);
        assert.strictEqual(manager.lockView('app-plugins', second.webContents.id), true);
    });

    it('should run cleanup listeners for a destroyed window', function() {
        let manager = new PubliiWindowManager({ closeDbForSite () {} });
        let win = createWindow(26);
        let cleanedWindows = [];
        let originalLog = console.log;

        manager.registerWindow(win);
        manager.onWindowDestroyed(() => {
            throw new Error('listener failure');
        });
        manager.onWindowDestroyed(webContentsId => cleanedWindows.push(webContentsId));

        console.log = () => {};

        try {
            win.emitWebContents('destroyed');
        } finally {
            console.log = originalLog;
        }

        assert.deepStrictEqual(cleanedWindows, [26]);
        assert.strictEqual(manager.getAllWindows().length, 0);
    });

    it('should run focus listeners with the focused window only', function() {
        let manager = new PubliiWindowManager({ closeDbForSite () {} });
        let first = createWindow(27);
        let second = createWindow(28);
        let focusedWindows = [];

        manager.registerWindow(first);
        manager.registerWindow(second);
        manager.onWindowFocused(webContentsId => focusedWindows.push(webContentsId));

        second.emitWindow('focus');
        first.emitWindow('focus');

        assert.deepStrictEqual(focusedWindows, [28, 27]);
    });

    it('should bring the most recently used window to the front', function() {
        let manager = new PubliiWindowManager({ closeDbForSite () {} });
        let first = createWindow(40);
        let second = createWindow(41);

        assert.strictEqual(manager.focusLastUsedWindow(), false);

        manager.registerWindow(first);
        manager.registerWindow(second);

        // Nothing was focused yet, so the primary window is used
        assert.strictEqual(manager.focusLastUsedWindow(), true);
        assert.strictEqual(first.focused, true);
        assert.strictEqual(second.focused, false);

        first.focused = false;
        second.emitWindow('focus');
        second.minimized = true;

        assert.strictEqual(manager.focusLastUsedWindow(), true);
        assert.strictEqual(second.focused, true);
        assert.strictEqual(second.minimized, false);
        assert.strictEqual(first.focused, false);

        // The last used window was closed in the meantime
        second.focused = false;
        second.emitWebContents('destroyed');

        assert.strictEqual(manager.focusLastUsedWindow(), true);
        assert.strictEqual(first.focused, true);
    });

    it('should broadcast a message to every other live window', function() {
        let manager = new PubliiWindowManager({ closeDbForSite () {} });
        let sender = createWindow(30);
        let other = createWindow(31);
        let closed = createWindow(32);

        manager.registerWindow(sender);
        manager.registerWindow(other);
        manager.registerWindow(closed);
        closed.webContents.destroyed = true;

        manager.broadcast('app-sites-updated', { 'my-website': {} }, sender.webContents.id);

        assert.deepStrictEqual(sender.received, []);
        assert.deepStrictEqual(other.received, [{ channel: 'app-sites-updated', payload: { 'my-website': {} } }]);
        assert.deepStrictEqual(closed.received, []);
    });
});
