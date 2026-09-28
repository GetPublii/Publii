const ipcMain = require('electron').ipcMain;
const Plugins = require('../plugins.js');
const PathValidator = require('../helpers/path-validator.js');
const getPluginSettingsLocks = require('../helpers/plugin-settings-locks.js');

const { isValidDirSegment } = PathValidator;

/*
 * Events for the IPC communication regarding plugins
 */

class PluginEvents {
    constructor(appInstance) {
        const settingsLocks = getPluginSettingsLocks(appInstance);
        const ownsSite = (owner, data) => data &&
            isValidDirSegment(data.siteName) &&
            isValidDirSegment(data.pluginName) &&
            (!appInstance.windowManager || appInstance.windowManager.getSiteForWindow(owner) === data.siteName);

        ipcMain.handle('app-site-plugin-settings:open', (event, data) => {
            if (!ownsSite(event.sender.id, data)) {
                return { status: false };
            }

            try {
                const plugins = new Plugins(appInstance.appDir, appInstance.sitesDir);
                const config = plugins.getPluginConfig(data.siteName, data.pluginName);

                if (!config || !config.pluginData || event.sender.isDestroyed()) {
                    return { status: false };
                }

                return {
                    status: true,
                    lockId: settingsLocks.open(event.sender, data),
                    config
                };
            } catch (error) {
                return { status: false };
            }
        });

        ipcMain.on('app-site-plugin-settings-close', (event, data) => {
            if (data && typeof data.lockId === 'string') {
                settingsLocks.close(event.sender.id, data.lockId);
            }
        });

        ipcMain.handle('app-site-plugin-settings:save', (event, data) => {
            if (!ownsSite(event.sender.id, data) || !settingsLocks.has(event.sender.id, data)) {
                return false;
            }

            try {
                const plugins = new Plugins(appInstance.appDir, appInstance.sitesDir);
                const config = plugins.getPluginConfig(data.siteName, data.pluginName);

                return !!(config && config.pluginData) &&
                    plugins.savePluginConfig(data.siteName, data.pluginName, data.newConfig);
            } catch (error) {
                return false;
            }
        });

        ipcMain.handle('app-plugin:get-usage', (event, data) => {
            if (!data || !isValidDirSegment(data.pluginName)) {
                return { status: false };
            }

            try {
                const blockingSites = settingsLocks.blockingSites(data.pluginName);

                if (blockingSites.length) {
                    return {
                        status: false,
                        code: 'settings-open',
                        sites: blockingSites
                    };
                }

                if (appInstance.sitesLocationMissing) {
                    return { status: false };
                }

                const plugins = new Plugins(appInstance.appDir, appInstance.sitesDir);
                const sites = Object.entries(appInstance.sites).map(([name, site]) => ({
                    name,
                    title: site.displayName || name
                }));
                const enabledSites = sites.filter(site => {
                    const states = plugins.readSitePluginsState(site.name);

                    return Object.prototype.hasOwnProperty.call(states, data.pluginName) &&
                        !!states[data.pluginName];
                });

                return {
                    status: true,
                    sites: enabledSites.map(site => {
                        const duplicateTitle = sites.some(other =>
                            other.name !== site.name && other.title === site.title
                        );

                        return duplicateTitle ? site.title + ' (' + site.name + ')' : site.title;
                    })
                };
            } catch (error) {
                return { status: false };
            }
        });

        // Request-scoped replies cannot be consumed by an older Tools view.
        ipcMain.handle('app-site-plugins:get-state', (event, data) => {
            try {
                const plugins = new Plugins(appInstance.appDir, appInstance.sitesDir);
                const states = plugins.readSitePluginsState(data && data.siteName);

                return { status: true, states };
            } catch (error) {
                return { status: false };
            }
        });

        ipcMain.handle('app-site-plugins:set-state', (event, data) => {
            try {
                if (!data) {
                    return { status: false };
                }

                const plugins = new Plugins(appInstance.appDir, appInstance.sitesDir);

                return plugins.setSitePluginState(
                    data.siteName,
                    data.pluginName,
                    data.enabled,
                    require('../../package.json').version
                );
            } catch (error) {
                return { status: false };
            }
        });

        // Get plugins status
        ipcMain.on('app-site-get-plugins-state', function (event, data) {
            if (!data || !isValidDirSegment(data.siteName)) {
                event.sender.send('app-site-plugins-state-loaded', {});
                return;
            }

            let pluginsInstance = new Plugins(appInstance.appDir, appInstance.sitesDir);
            let pluginsStatus = pluginsInstance.getSiteSpecificPluginsState(data.siteName);
            event.sender.send('app-site-plugins-state-loaded', pluginsStatus);
        });

        // Activate
        ipcMain.on('app-site-plugin-activate', function (event, data) {
            if (!data ||
                !isValidDirSegment(data.siteName) ||
                !isValidDirSegment(data.pluginName)) {
                event.sender.send('app-site-plugin-activated', false);
                return;
            }

            let pluginsInstance = new Plugins(appInstance.appDir, appInstance.sitesDir);
            let result = pluginsInstance.activatePlugin(data.siteName, data.pluginName);
            event.sender.send('app-site-plugin-activated', result);
        });

        // Deactivate
        ipcMain.on('app-site-plugin-deactivate', function (event, data) {
            if (!data ||
                !isValidDirSegment(data.siteName) ||
                !isValidDirSegment(data.pluginName)) {
                event.sender.send('app-site-plugin-deactivated', false);
                return;
            }

            let pluginsInstance = new Plugins(appInstance.appDir, appInstance.sitesDir);
            let result = pluginsInstance.deactivatePlugin(data.siteName, data.pluginName);
            event.sender.send('app-site-plugin-deactivated', result);
        });

        // Get plugin info and config
        ipcMain.on('app-site-get-plugin-config', function (event, data) {
            if (!data ||
                !isValidDirSegment(data.siteName) ||
                !isValidDirSegment(data.pluginName)) {
                event.sender.send('app-site-get-plugin-config-retrieved', 0);
                return;
            }

            let pluginsInstance = new Plugins(appInstance.appDir, appInstance.sitesDir);
            let result = pluginsInstance.getPluginConfig(data.siteName, data.pluginName);
            event.sender.send('app-site-get-plugin-config-retrieved', result);
        });

        // Save plugin config
        ipcMain.on('app-site-save-plugin-config', function (event, data) {
            if (!data ||
                !isValidDirSegment(data.siteName) ||
                !isValidDirSegment(data.pluginName)) {
                event.sender.send('app-site-plugin-config-saved', false);
                return;
            }

            let pluginsInstance = new Plugins(appInstance.appDir, appInstance.sitesDir);
            const config = pluginsInstance.getPluginConfig(data.siteName, data.pluginName);
            const canSave = config && config.pluginData &&
                (!data.lockId || settingsLocks.has(event.sender.id, data));
            let result = !!canSave && pluginsInstance.savePluginConfig(data.siteName, data.pluginName, data.newConfig);
            event.sender.send('app-site-plugin-config-saved', result);
        });
    }
}

module.exports = PluginEvents;
