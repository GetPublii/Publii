class PubliiWindowManager {
    constructor (appInstance) {
        this.appInstance = appInstance;
        this.windows = new Map();      // webContentsId -> BrowserWindow
        this.windowSites = new Map();  // webContentsId -> siteName
        this.siteLocks = new Map();    // siteName -> webContentsId
        this.viewLocks = new Map();    // viewId (i.e. 'app-settings') -> webContentsId
        this.destroyedListeners = [];  // callbacks run with the webContentsId of every closed window
        this.focusedListeners = [];    // callbacks run with the webContentsId of every window which gets focus
        this.lastFocusedWindowId = null;
    }

    registerWindow (win) {
        const webContentsId = win.webContents.id;
        this.windows.set(webContentsId, win);

        win.webContents.on('destroyed', () => {
            this._onWindowDestroyed(webContentsId);
        });

        win.on('focus', () => {
            this.lastFocusedWindowId = webContentsId;
            this._runListeners(this.focusedListeners, webContentsId);
        });
    }

    _onWindowDestroyed (webContentsId) {
        const siteName = this.windowSites.get(webContentsId);

        if (siteName) {
            this.siteLocks.delete(siteName);
            this.windowSites.delete(webContentsId);
            this.appInstance.closeDbForSite(siteName);
        }

        this.releaseViewLocksForWindow(webContentsId);
        this.windows.delete(webContentsId);

        this._runListeners(this.destroyedListeners, webContentsId);
    }

    // A failing listener must not stop the other ones
    _runListeners (listeners, webContentsId) {
        for (const listener of listeners) {
            try {
                listener(webContentsId);
            } catch (error) {
                console.log('[WindowManager] Window listener failed:', error);
            }
        }
    }

    // Register a cleanup callback (i.e. aborting workers) run for every closed window
    onWindowDestroyed (callback) {
        this.destroyedListeners.push(callback);
    }

    // Register a callback run for every window which gets focus (i.e. to take over session-wide settings)
    onWindowFocused (callback) {
        this.focusedListeners.push(callback);
    }

    setWindowSite (webContentsId, siteName) {
        const prevSite = this.windowSites.get(webContentsId);

        if (prevSite && prevSite !== siteName) {
            this.siteLocks.delete(prevSite);
        }

        this.windowSites.set(webContentsId, siteName);

        if (siteName) {
            this.siteLocks.set(siteName, webContentsId);
        }
    }

    getSiteForWindow (webContentsId) {
        return this.windowSites.get(webContentsId) || null;
    }

    // Forget the website of a window (i.e. after the window deleted it), so its name is free again
    clearWindowSite (webContentsId) {
        const siteName = this.windowSites.get(webContentsId);

        if (siteName && this.siteLocks.get(siteName) === webContentsId) {
            this.siteLocks.delete(siteName);
        }

        this.windowSites.delete(webContentsId);
    }

    renameSiteLock (oldSiteName, newSiteName, webContentsId) {
        this.siteLocks.delete(oldSiteName);

        if (newSiteName) {
            this.siteLocks.set(newSiteName, webContentsId);
        }

        this.windowSites.set(webContentsId, newSiteName);
    }

    isSiteLockedByOther (siteName, requestingWebContentsId) {
        const owner = this.siteLocks.get(siteName);
        return owner !== undefined && owner !== requestingWebContentsId;
    }

    focusWindowBySite (siteName) {
        return this._focusWindow(this.siteLocks.get(siteName));
    }

    // Reserve an exclusive view for a window; fails when another window already owns it
    lockView (viewId, webContentsId) {
        const owner = this.viewLocks.get(viewId);

        if (owner !== undefined && owner !== webContentsId) {
            return false;
        }

        this.viewLocks.set(viewId, webContentsId);
        return true;
    }

    // Only the owner can release its exclusive view
    unlockView (viewId, webContentsId) {
        if (this.viewLocks.get(viewId) === webContentsId) {
            this.viewLocks.delete(viewId);
        }
    }

    releaseViewLocksForWindow (webContentsId) {
        for (const [viewId, owner] of this.viewLocks) {
            if (owner === webContentsId) {
                this.viewLocks.delete(viewId);
            }
        }
    }

    focusWindowByView (viewId) {
        return this._focusWindow(this.viewLocks.get(viewId));
    }

    _focusWindow (webContentsId) {
        if (webContentsId === undefined) {
            return false;
        }

        const win = this.windows.get(webContentsId);

        if (win && !win.isDestroyed()) {
            // Focusing alone does not bring back a minimized window on every platform
            if (win.isMinimized()) {
                win.restore();
            }

            win.focus();
            return true;
        }

        return false;
    }

    // Bring the most recently used window to the front (i.e. when the app is launched again)
    focusLastUsedWindow () {
        if (this._focusWindow(this.lastFocusedWindowId === null ? undefined : this.lastFocusedWindowId)) {
            return true;
        }

        const mainWindow = this.getMainWindow();
        return mainWindow ? this._focusWindow(mainWindow.webContents.id) : false;
    }

    // Send a message to every open window, optionally skipping one of them (i.e. the sender)
    broadcast (channel, payload, exceptWebContentsId = null) {
        for (const [webContentsId, win] of this.windows) {
            if (webContentsId === exceptWebContentsId || win.isDestroyed() || win.webContents.isDestroyed()) {
                continue;
            }

            win.webContents.send(channel, payload);
        }
    }

    getWindow (webContentsId) {
        return this.windows.get(webContentsId) || null;
    }

    getMainWindow () {
        return this.windows.values().next().value || null;
    }

    getAllWindows () {
        return Array.from(this.windows.values());
    }
}

module.exports = PubliiWindowManager;
