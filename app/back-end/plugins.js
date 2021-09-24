/*
 * Plugins instance
 */

const fs = require('fs-extra');
const path = require('path');

class Plugins {
    constructor(appInstance) {
        this.basePath = appInstance.appDir;
        this.pluginsPath = path.join(this.basePath, 'plugins');
        this.appInstance = appInstance;
    }

    /*
     * Load plugins for specific site
     */
    loadSiteSpecificPlugins (siteName) {
        let sitePath = path.join(this.appInstance.sitesDir, siteName, 'input', 'config'); 
        let sitePluginsConfigPath = path.join(sitePath, 'site.plugins.json');

        if (!fs.existsSync(sitePluginsConfigPath)) {
            return;
        }

        let pluginsConfig = fs.readFileSync(sitePluginsConfigPath);

        try {
            pluginsConfig = JSON.parse(pluginsConfig);
        } catch (e) {
            console.log('(!) Error during loading plugins config for site ', siteName);
            return;
        }

        let pluginNames = Object.keys(pluginsConfig);

        for (let i = 0; i < pluginNames.length; i++) {
            let pluginName = pluginNames[i];

            if (!pluginsConfig[pluginName]) {
                continue;
            }

            let pluginPath = path.join(this.appInstance.appDir, 'plugins', pluginName, 'main.js');
            let PluginInstance = require(pluginPath);
            new PluginInstance(this.appInstance.pluginsAPI);
        }
    }

    /*
     * Load plugins for app
     */
    loadAppSpecificPlugins () {
        
    }
}

module.exports = Plugins;
