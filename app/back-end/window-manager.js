class PubliiWindowManager {
    constructor (appInstance) {
        this.appInstance = appInstance;
        this.windows = new Map();      // webContentsId -> BrowserWindow
        this.windowSites = new Map();  // webContentsId -> siteName
        this.siteLocks = new Map();    // siteName -> webContentsId
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
        const webContentsId = this.siteLocks.get(siteName);

        if (webContentsId !== undefined) {
            const win = this.windows.get(webContentsId);

            if (win && !win.isDestroyed()) {
                win.focus();
                return true;
            }
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
