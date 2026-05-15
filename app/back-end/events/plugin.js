const ipcMain = require('electron').ipcMain;
const Plugins = require('../plugins.js');
const PathValidator = require('../helpers/path-validator.js');

const { isValidDirSegment } = PathValidator;

/*
 * Events for the IPC communication regarding plugins
 */

class PluginEvents {
    constructor(appInstance) {
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
            let result = pluginsInstance.savePluginConfig(data.siteName, data.pluginName, data.newConfig);
            event.sender.send('app-site-plugin-config-saved', result);
        });
    }
}

module.exports = PluginEvents;
