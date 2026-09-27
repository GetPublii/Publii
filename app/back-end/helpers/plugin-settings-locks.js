const crypto = require('crypto');

const registries = new WeakMap();

class PluginSettingsLocks {
    constructor(app) {
        this.app = app;
        this.entries = new Map();
        this.observedWindows = new WeakSet();

        if (app.windowManager) {
            app.windowManager.onWindowDestroyed(owner => this.entries.delete(owner));
        }
    }

    open(webContents, { siteName, pluginName }) {
        if (!this.observedWindows.has(webContents)) {
            this.observedWindows.add(webContents);
            // Only a completed main-frame navigation replaces the settings page.
            // Starting or cancelling navigation, and loading an iframe, must keep its lock.
            webContents.on('did-navigate', () => this.entries.delete(webContents.id));
            webContents.on('render-process-gone', () => this.entries.delete(webContents.id));
        }

        const lockId = crypto.randomUUID();
        this.entries.set(webContents.id, {
            lockId,
            siteName,
            pluginName,
            webContents
        });

        return lockId;
    }

    close(owner, lockId) {
        const entry = this.entries.get(owner);

        if (entry && entry.lockId === lockId) {
            this.entries.delete(owner);
        }
    }

    has(owner, { lockId, siteName, pluginName }) {
        const entry = this.entries.get(owner);

        return !!entry && entry.lockId === lockId && entry.siteName === siteName &&
            entry.pluginName === pluginName && !entry.webContents.isDestroyed();
    }

    blockingSites(pluginName) {
        const names = new Set();

        for (const [owner, entry] of this.entries) {
            if (entry.webContents.isDestroyed()) {
                this.entries.delete(owner);
                continue;
            }

            if (entry.pluginName === pluginName) {
                names.add(entry.siteName);
            }
        }

        const sites = this.app.sites || {};
        const titles = Array.from(names, name => ({
            name,
            title: sites[name] && sites[name].displayName || name
        }));

        return titles.map(site => {
            if (titles.some(other => other.name !== site.name && other.title === site.title)) {
                return site.title + ' (' + site.name + ')';
            }

            return site.title;
        });
    }
}

module.exports = function getPluginSettingsLocks(app) {
    if (!registries.has(app)) {
        registries.set(app, new PluginSettingsLocks(app));
    }

    return registries.get(app);
};
