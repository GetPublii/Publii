const ipcMain = require('electron').ipcMain;
const Plugins = require('../plugins.js');

/*
 * Events for the IPC communication regarding plugins
 */

class PluginEvents {
    constructor(appInstance) {
        // Get plugins status
        ipcMain.on('app-site-get-plugins-state', function (event, data) {
            let pluginsInstance = new Plugins(appInstance.appDir, appInstance.sitesDir);
            let siteName = data.siteName.replace(/[\/\\]/gmi, '');
            let pluginsStatus = pluginsInstance.getSiteSpecificPluginsState(siteName);
            event.sender.send('app-site-plugins-state-loaded', pluginsStatus);
        });

        // Activate
        ipcMain.on('app-site-plugin-activate', function (event, data) {
            let pluginsInstance = new Plugins(appInstance.appDir, appInstance.sitesDir);
            let siteName = data.siteName.replace(/[\/\\]/gmi, '');
            let pluginName = data.pluginName.replace(/[\/\\]/gmi, '');
            let result = pluginsInstance.activatePlugin(siteName, pluginName);
            event.sender.send('app-site-plugin-activated', result);
        });

        // Deactivate
        ipcMain.on('app-site-plugin-deactivate', function (event, data) {
            let pluginsInstance = new Plugins(appInstance.appDir, appInstance.sitesDir);
            let siteName = data.siteName.replace(/[\/\\]/gmi, '');
            let pluginName = data.pluginName.replace(/[\/\\]/gmi, '');
            let result = pluginsInstance.deactivatePlugin(siteName, pluginName);
            event.sender.send('app-site-plugin-deactivated', result);
        });

        // Get plugin info and config
        ipcMain.on('app-site-get-plugin-config', function (event, data) {
            let pluginsInstance = new Plugins(appInstance.appDir, appInstance.sitesDir);
            let siteName = data.siteName.replace(/[\/\\]/gmi, '');
            let pluginName = data.pluginName.replace(/[\/\\]/gmi, '');
            let result = pluginsInstance.getPluginConfig(siteName, pluginName);
            event.sender.send('app-site-get-plugin-config-retrieved', result);
        });

        // Save plugin config
        ipcMain.on('app-site-save-plugin-config', function (event, data) {
            let pluginsInstance = new Plugins(appInstance.appDir, appInstance.sitesDir);
            let siteName = data.siteName.replace(/[\/\\]/gmi, '');
            let pluginName = data.pluginName.replace(/[\/\\]/gmi, '');
            let result = pluginsInstance.savePluginConfig(siteName, pluginName, data.newConfig);
            event.sender.send('app-site-plugin-config-saved', result);
        });
    }
}

module.exports = PluginEvents;
