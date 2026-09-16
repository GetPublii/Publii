class PubliiWindowManager {
    constructor (appInstance) {
        this.appInstance = appInstance;
        this.windows = new Map();      // webContentsId -> BrowserWindow
        this.windowSites = new Map();  // webContentsId -> siteName
        this.siteLocks = new Map();    // siteName -> webContentsId
        this.viewLocks = new Map();    // viewId (i.e. 'app-settings') -> webContentsId
    }

    registerWindow (win) {
        this.windows.set(win.webContents.id, win);

        win.webContents.on('destroyed', () => {
            this._onWindowDestroyed(win.webContents.id);
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
            win.focus();
            return true;
        }

        return false;
    }

    getMainWindow () {
        return this.windows.values().next().value || null;
    }

    getAllWindows () {
        return Array.from(this.windows.values());
    }
}

module.exports = PubliiWindowManager;
