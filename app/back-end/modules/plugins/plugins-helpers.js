const fs = require('fs');
const path = require('path');

class PluginsHelpers {
    // Returns a list of active plugins for given site plugins config file;
    static getActivePluginsList (sitePluginsConfigPath) {
        let fileContent;
        let allPlugins;
        let activePlugins = [];

        try {
            fileContent = fs.readFileSync(sitePluginsConfigPath);
            fileContent = fileContent.toString();
            fileContent = JSON.parse(fileContent);
        } catch (e) {
            console.log('(!) Unable to find site plugins config JSON');
            return [];
        }

        allPlugins = Object.keys(fileContent);

        for (let i = 0; i < allPlugins.length; i++) {
            let pluginName = allPlugins[i];

            if (fileContent[pluginName]) {
                activePlugins.push(pluginName);
            }
        }

        return activePlugins;
    }

    // Returns a list of files which should be copied to the website
    static getPluginFrontEndFiles (pluginName, pluginsDir) {
        let pluginConfigPath = path.join(pluginsDir, pluginName, 'plugin.json');
        let pluginConfig;

        try {
            pluginConfig = fs.readFileSync(pluginConfigPath);
            pluginConfig = pluginConfig.toString();
            pluginConfig = JSON.parse(pluginConfig);
        } catch (e) {
            console.log('(!) Unable to read plugin config file (plugin.json): ' + pluginName);
            return [];
        }

        if (pluginConfig.assets && pluginConfig.assets.front) {
            pluginConfig.assets.front = pluginConfig.assets.front.map(fileName => fileName.split('/'));
            return pluginConfig.assets.front.map(fileName => ({
                input: path.join(pluginsDir, pluginName, 'front-assets', ...fileName),
                output: fileName.join('/')
            }));
        }

        return [];
    }
}

module.exports = PluginsHelpers;
