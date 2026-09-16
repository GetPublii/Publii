const assert = require('assert');
const PubliiWindowManager = require('../window-manager.js');

function createWindow (id) {
    let listeners = {};

    return {
        focused: false,
        webContents: {
            id,
            on (eventName, callback) {
                listeners[eventName] = callback;
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
});
