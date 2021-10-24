const ipcMain = require('electron').ipcMain;
const Plugins = require('../plugins.js');

/*
 * Events for the IPC communication regarding plugins
 */

class PluginEvents {
    constructor(appInstance) {
        // Get plugins status
        ipcMain.on('app-site-get-plugins-state', function (event, data) {
            let pluginsInstance = new Plugins(appInstance);
            let pluginsStatus = pluginsInstance.getSiteSpecificPluginsState(data.siteName);
            event.sender.send('app-site-plugins-state-loaded', pluginsStatus);
        });

        // Activate
        ipcMain.on('app-site-plugin-activate', function (event, data) {
            let pluginsInstance = new Plugins(appInstance);
            let result = pluginsInstance.activatePlugin(data.siteName, data.pluginName);
            event.sender.send('app-site-plugin-activated', result);
        });

        // Deactivate
        ipcMain.on('app-site-plugin-deactivate', function (event, data) {
            let pluginsInstance = new Plugins(appInstance);
            let result = pluginsInstance.deactivatePlugin(data.siteName, data.pluginName);
            event.sender.send('app-site-plugin-deactivated', result);
        });
    }
}

module.exports = PluginEvents;
