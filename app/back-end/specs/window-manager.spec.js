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
});
