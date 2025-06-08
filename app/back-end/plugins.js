/*
 * Plugins instance
 */

const fs = require('fs-extra');
const path = require('path');
const UtilsHelper = require('./helpers/utils.js');
const pluginConfigValidator = require('./helpers/validators/plugin-config.js');

class Plugins {
    constructor(appDir, sitesDir) {
        this.appDir = appDir;
        this.sitesDir = sitesDir;
        this.pluginsPath = path.join(this.appDir, 'plugins');
    }

    /*
     * Load plugins from a specific path
     */
    loadPlugins () {
        let pathToPlugins = this.pluginsPath;
        let output = [];
        let filesAndDirs = fs.readdirSync(pathToPlugins);

        for (let i = 0; i < filesAndDirs.length; i++) {
            if (filesAndDirs[i][0] === '.' || !UtilsHelper.dirExists(path.join(pathToPlugins, filesAndDirs[i]))) {
                continue;
            }

            let configPath = path.join(pathToPlugins, filesAndDirs[i], 'plugin.json');

            // Load only proper plugins
            if (!fs.existsSync(configPath)) {
                continue;
            }

            // Load only properly configured languages
            if(pluginConfigValidator(configPath) !== true) {
                continue;
            }

            let pluginData = fs.readFileSync(configPath, 'utf8');
            pluginData = JSON.parse(pluginData);

            output.push({
                scope: pluginData.scope,
                directory: filesAndDirs[i],
                name: pluginData.name,
                version: pluginData.version,
                author: pluginData.author,
                minimumPubliiVersion: pluginData.minimumPubliiVersion,
                assets: pluginData.assets,
                path: path.join(pathToPlugins, filesAndDirs[i])
            });
        }

        return output;
    }

    /*
     * Get plugins count
     */
    getExistingPluginsDirs () {
        let pathToPlugins = this.pluginsPath;
        let output = [];
        let filesAndDirs = fs.readdirSync(pathToPlugins);

        for (let i = 0; i < filesAndDirs.length; i++) {
            if (filesAndDirs[i][0] === '.' || !UtilsHelper.dirExists(path.join(pathToPlugins, filesAndDirs[i]))) {
                continue;
            }

            output.push(filesAndDirs[i]);
        }

        return output;
    }

    /**
     * Get status of site-specific plugins 
     */
    getSiteSpecificPluginsState (siteName) {
        let pluginsConfig = this.loadSitePluginsConfig(siteName);
        let pluginNames = typeof pluginsConfig === 'object' ? Object.keys(pluginsConfig) : [];
        let status = {};

        for (let i = 0; i < pluginNames.length; i++) {
            let pluginName = pluginNames[i];
            status[pluginName] = !!pluginsConfig[pluginName];
        }

        return status;
    }

    /**
     * Load plugins config for specific site
     */
    loadSitePluginsConfig (siteName) {
        let sitePath = path.join(this.sitesDir, siteName, 'input', 'config'); 
        let sitePluginsConfigPath = path.join(sitePath, 'site.plugins.json');

        if (!fs.existsSync(sitePluginsConfigPath)) {
            return {};
        }

        let pluginsConfig = fs.readFileSync(sitePluginsConfigPath);

        try {
            pluginsConfig = JSON.parse(pluginsConfig);
            let loadedPlugins = Object.keys(pluginsConfig);
            let existingPlugins = this.getExistingPluginsDirs();

            if (!UtilsHelper.arraysHaveTheSameContent(existingPlugins, loadedPlugins)) {
                this.validateLoadedPlugins(siteName, pluginsConfig, existingPlugins);
            }
        } catch (e) {
            console.log('(!) Error during loading plugins config for site ', siteName);
            console.log(e);
            return {};
        }

        return pluginsConfig;
    }

    /**
     * Check for non-existing plugins and resave config
     */
    validateLoadedPlugins (siteName, configToCheck, existingPlugins) {
        console.log('(i) Validate site.plugins.json due change of the plugins count');
        let loadedPlugins = Object.keys(configToCheck);

        for (let i = 0; i < loadedPlugins.length; i++) {
            let pluginDirectoryName = loadedPlugins[i];

            if (!UtilsHelper.dirExists(path.join(this.pluginsPath, pluginDirectoryName))) {
                delete configToCheck[pluginDirectoryName];
                console.log('(i) Removed plugin from site.plugins.json: ', pluginDirectoryName);
            }
        }

        for (let i = 0; i < existingPlugins.length; i++) {
            let existingPluginDirectoryName = existingPlugins[i];

            if (typeof configToCheck[existingPluginDirectoryName] === 'undefined') {
                configToCheck[existingPluginDirectoryName] = false;
                console.log('(i) Added disabled plugin to site.plugins.json: ', existingPluginDirectoryName);
            }
        }

        this.saveSitePluginsConfig(siteName, configToCheck);
    }

    /**
     * Save plugins config 
     */
    saveSitePluginsConfig (siteName, config) {
        let sitePath = path.join(this.sitesDir, siteName, 'input', 'config'); 
        let sitePluginsConfigPath = path.join(sitePath, 'site.plugins.json');

        try {
            fs.writeFileSync(sitePluginsConfigPath, JSON.stringify(config, null, 4));
        } catch (error) {
            return false;
        }

        return true;
    }

    /**
     * Plugin activation
     */
    activatePlugin (siteName, pluginName) {
        let pluginsConfig = this.loadSitePluginsConfig(siteName);
        pluginsConfig[pluginName] = true;
        return this.saveSitePluginsConfig(siteName, pluginsConfig);
    }

    /**
     * Plugin deactivation
     */
    deactivatePlugin (siteName, pluginName) {
        let pluginsConfig = this.loadSitePluginsConfig(siteName);
        pluginsConfig[pluginName] = false;
        return this.saveSitePluginsConfig(siteName, pluginsConfig);
    }

    /*
     * Remove specific plugin from the app directory
     */
    removePlugin (directory) {
        fs.removeSync(path.join(this.pluginsPath, directory));
    }

    getPluginConfig (siteName, pluginName) {
        let pluginPath = path.join(this.appDir, 'plugins', pluginName, 'plugin.json');
        let pluginConfigPath = path.join(this.sitesDir, siteName, 'input', 'config', 'plugins', pluginName + '.json');
        let output = {
            pluginData: null,
            pluginConfig: null
        };

        if (fs.existsSync(pluginPath)) {
            try {
                let pluginData = fs.readFileSync(pluginPath, 'utf8');
                output.pluginData = JSON.parse(pluginData);
                output.pluginData.path = path.join(this.appDir, 'plugins', pluginName);
            } catch (e) {
                return 0;
            }
        } else {
            return pluginPath;
        }

        if (fs.existsSync(pluginConfigPath)) {
            try {
                let pluginConfig = fs.readFileSync(pluginConfigPath, 'utf8');
                output.pluginConfig = pluginConfig;
            } catch (e) {
                output.pluginConfig = {};
            }
        }

        return output;
    }

    savePluginConfig (siteName, pluginName, newConfig) {
        let pluginConfigPath = path.join(this.sitesDir, siteName, 'input', 'config', 'plugins', pluginName + '.json');

        try {
            fs.writeFileSync(pluginConfigPath, JSON.stringify(newConfig, null, 4));
        } catch (e) {
            return false;
        }

        this.checkAndCleanImages(siteName, pluginName, newConfig);

        return true;
    }

    loadPluginConfig (pluginName, siteName) {
        let pluginPath = path.join(this.appDir, 'plugins', pluginName, 'plugin.json');
        let pluginConfigPath = path.join(this.sitesDir, siteName, 'input', 'config', 'plugins', pluginName + '.json');
        let pluginData = null;
        let pluginSavedConfig = null;
        let output = {};

        if (fs.existsSync(pluginPath)) {
            try {
                pluginData = fs.readFileSync(pluginPath, 'utf8');
                pluginData = JSON.parse(pluginData);
            } catch (e) {
                pluginData = {};
            }
        } else {
            pluginData =  {};
        }

        if (fs.existsSync(pluginConfigPath)) {
            try {
                pluginSavedConfig = fs.readFileSync(pluginConfigPath, 'utf8');
                pluginSavedConfig = JSON.parse(pluginConfig);
            } catch (e) {
                pluginSavedConfig = {};
            }
        } else {
            pluginSavedConfig = {};
        }

        let settings = pluginData.config.map(field => {
            if (field.type !== 'separator') {
                if (pluginSavedConfig && typeof pluginSavedConfig[field.name] !== 'undefined') {
                    return {
                        name: field.name, 
                        value: savedConfig[field.name]
                    };
                }

                return {
                    name: field.name, 
                    value: field.value
                };
            }

            return false;
        });

        for (let setting of settings) {
            if (setting) {
                output[setting.name] = setting.value;
            }
        }

        return output;
    }

    checkAndCleanImages (siteName, pluginName, newConfig) {
        let configString = JSON.stringify(newConfig);
        let pluginImagesPath = path.join(this.sitesDir, siteName, 'input', 'media', 'plugins', pluginName);
        
        if (!fs.existsSync(pluginImagesPath)) {
            return;
        }
        
        let imagesInConfig = [];
        let imageRegex = /"([^"]+\.(svg|png|jpg|jpeg|gif|webp))"/gi;
        let match = null;

        while (match = imageRegex.exec(configString)) {
            let imageToPush = match[1];
            imageToPush = imageToPush.replace(/\\/g, '/').split('/').pop();
            imagesInConfig.push(imageToPush);
        }
 
        let files = fs.readdirSync(pluginImagesPath);
        
        for (let i = 0; i < files.length; i++) {
            let file = files[i];
            
            if (file.match(/\.(svg|png|jpg|jpeg|gif|webp)$/i) && imagesInConfig.indexOf(file) === -1) {
                fs.removeSync(path.join(pluginImagesPath, file));
            }
        }
    }
}

module.exports = Plugins;
