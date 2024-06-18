/*
 * Themes instance
 */

const fs = require('fs-extra');
const path = require('path');
const slug = require('./helpers/slug');
const UtilsHelper = require('./helpers/utils.js');
const themeConfigValidator = require('./modules/render-html/validators/theme-config.js');
const normalizePath = require('normalize-path');
const Authors = require('./authors.js');

class Themes {
    constructor(appInstance, siteData = false) {
        this.basePath = appInstance.appDir;
        this.sitesDir = appInstance.sitesDir;
        this.themesPath = path.join(this.basePath, 'themes');
        this.sitePath = false;
        this.siteConfigPath = false;
        this.siteName = siteData.site;
        this.appInstance = appInstance;

        if(siteData) {
            this.sitePath = path.join(this.sitesDir, this.siteName, 'input', 'themes');
            this.siteInputPath = path.join(this.sitesDir, this.siteName, 'input');
            this.siteConfigPath = path.join(this.sitesDir, this.siteName, 'input', 'config', 'site.config.json');
        }
    }

    /*
     * Load themes from a specific path
     */
    loadThemes(pathToThemes = false) {
        if(!pathToThemes) {
            pathToThemes = this.themesPath;
        }

        let filesAndDirs = fs.readdirSync(pathToThemes);
        let output = [];

        let themeLocation = 'app';

        if (this.sitePath && pathToThemes === this.sitePath) {
            themeLocation = 'site';
        }

        for(let i = 0; i < filesAndDirs.length; i++) {
            if (filesAndDirs[i][0] === '.' || !UtilsHelper.dirExists(path.join(pathToThemes, filesAndDirs[i]))) {
                continue;
            }

            // Exclude overrided themes
            if(filesAndDirs[i].substr(-9) === '-override') {
                continue;
            }

            let configPath = path.join(pathToThemes, filesAndDirs[i], 'config.json');

            // Load only proper themes
            if (!fs.existsSync(configPath)) {
                continue;
            }

            // Load only properly configured themes
            if(themeConfigValidator(configPath) !== true) {
                continue;
            }

            let themeData = fs.readFileSync(configPath, 'utf8');
            themeData = JSON.parse(themeData);

            output.push({
                location: themeLocation,
                directory: filesAndDirs[i],
                name: themeData.name,
                version: themeData.version
            });
        }

        return output;
    }

    /*
     * Load informations about the current theme
     */
    currentTheme(returnDir = false) {
        let siteData = fs.readFileSync(this.siteConfigPath, 'utf8');
        siteData = JSON.parse(siteData);

        if(!returnDir && siteData.theme) {
            let themeData = fs.readFileSync(path.join(this.sitePath, siteData.theme, 'config.json'));
            themeData = JSON.parse(themeData);

            if(themeData.name) {
                return themeData.name.toLowerCase();
            }
        }

        if(returnDir && siteData.theme) {
            return siteData.theme.toLowerCase();
        }

        return "not selected";
    }

    /*
     * Load results and merge them
     */
    load() {
        let applicationThemes = this.loadThemes(this.themesPath);
        let siteThemes = this.loadThemes(this.sitePath);

        return [...applicationThemes, ...siteThemes];
    }

    /*
     * Change theme to the selected one
     */
    changeTheme(newTheme, oldTheme) {
        if(!newTheme) {
            return '';
        }

        if(
            newTheme.indexOf('use-') === -1 &&
            newTheme.indexOf('install-use-') === -1 &&
            newTheme.indexOf('uninstall-') === -1
        ) {
            return newTheme;
        }

        // Remove theme settings when the used theme is changed
        if(
            (
                newTheme.indexOf('use-') === 0 &&
                newTheme.replace('use-', '') !== oldTheme
            ) || (
                newTheme.indexOf('install-use-') > -1 &&
                newTheme.replace('install-use-', '') !== oldTheme
            )
        ) {
            let oldConfigPath = path.join(this.siteInputPath, 'config', 'theme.config.json');
            let basicConfig = false;

            if (UtilsHelper.fileExists(oldConfigPath)) {
                try {
                    let oldConfig = fs.readFileSync(oldConfigPath);
                    oldConfig = JSON.parse(oldConfig);
                    basicConfig = { 
                        config: {
                            logo: oldConfig.config.logo
                        }
                    };
                    basicConfig = JSON.stringify(basicConfig, null, 4);
                } catch (e) {
                    console.log('(!) Cannot parse old config');
                }

                fs.removeSync(oldConfigPath);

                if (basicConfig) {
                    fs.writeFileSync(oldConfigPath, basicConfig);
                }
            } else {
                fs.removeSync(oldConfigPath);
            }

            let newThemeName =  newTheme.replace('install-use-', '')
                                        .replace('uninstall-', '')
                                        .replace('use-', '');
            let backupConfigPath = path.join(this.siteInputPath, 'config', 'theme.' + newThemeName + '.config.json');

            if (UtilsHelper.fileExists(backupConfigPath)) {
                fs.copySync(
                    path.join(this.siteInputPath, 'config', 'theme.' + newThemeName + '.config.json'),
                    path.join(this.siteInputPath, 'config', 'theme.config.json')
                );
            }
        }

        // For changing just installed themes - return the theme name
        if(newTheme.indexOf('use-') === 0) {
            return newTheme.replace('use-', '');
        }

        // For uninstalling themes - return empty string or theme name (if the used theme was not removed)
        if(newTheme.indexOf('uninstall-') === 0) {
            let themeToRemove = newTheme.replace('uninstall-', '');

            // Remove theme dir
            let themeDirStat = false;

            try {
                themeDirStat = fs.statSync(path.join(this.sitePath, themeToRemove));
            } catch(e) {}

            if(themeDirStat && themeDirStat.isDirectory()) {
                // If yes - remove it
                fs.removeSync(path.join(this.sitePath, themeToRemove));
            }

            // If current theme is different than removed theme - return its name
            if(oldTheme !== themeToRemove) {
                return oldTheme;
            }

            // Otherwise - return empty string as there is currently no used theme
            return '';
        }

        // Prepare the theme directory name
        newTheme = newTheme.replace('install-use-', '');
        // For installing new themes:
        // Check if the theme exists
        let themeDirStat = false;

        try {
            themeDirStat = fs.statSync(path.join(this.sitePath, newTheme));
        } catch(e) {}

        if(themeDirStat && themeDirStat.isDirectory()) {
            // If yes - remove it
            fs.removeSync(path.join(this.sitePath, newTheme));
        }

        // Copy theme to the site directory
        fs.copySync(
            path.join(this.themesPath, newTheme),
            path.join(this.sitePath, newTheme)
        );

        // Return new name
        return newTheme;
    }

    /*
     * Load available post templates
     */
    loadPostTemplates() {
        let postTemplates = [];
        let siteData = fs.readFileSync(this.siteConfigPath, 'utf8');
        siteData = JSON.parse(siteData);

        if(siteData.theme) {
            let themeDir = path.join(this.sitePath, siteData.theme);
            let themeConfigPath = path.join(this.sitePath, 'input', 'config', 'theme.config.json');
            let themeData = Themes.loadThemeConfig(themeConfigPath, themeDir);

            if(themeData.postTemplates) {
                let templateFiles = Object.keys(themeData.postTemplates);

                for(let i = 0; i < templateFiles.length; i++) {
                    let fileName = templateFiles[i];
                    postTemplates.push(
                        [fileName, themeData.postTemplates[fileName]]
                    );
                }
            }
        }

        return postTemplates;
    }

    /*
     * Load available page templates
     */
    loadPageTemplates() {
        let pageTemplates = [];
        let siteData = fs.readFileSync(this.siteConfigPath, 'utf8');
        siteData = JSON.parse(siteData);

        if(siteData.theme) {
            let themeDir = path.join(this.sitePath, siteData.theme);
            let themeConfigPath = path.join(this.sitePath, 'input', 'config', 'theme.config.json');
            let themeData = Themes.loadThemeConfig(themeConfigPath, themeDir);

            if(themeData.pageTemplates) {
                let templateFiles = Object.keys(themeData.pageTemplates);

                for(let i = 0; i < templateFiles.length; i++) {
                    let fileName = templateFiles[i];
                    pageTemplates.push(
                        [fileName, themeData.pageTemplates[fileName]]
                    );
                }
            }
        }

        return pageTemplates;
    }

    /*
     * Load available tag templates
     */
    loadTagTemplates() {
        let tagTemplates = [];
        let siteData = fs.readFileSync(this.siteConfigPath, 'utf8');
        siteData = JSON.parse(siteData);

        if(siteData.theme) {
            let themeDir = path.join(this.sitePath, siteData.theme);
            let themeConfigPath = path.join(this.sitePath, 'input', 'config', 'theme.config.json');
            let themeData = Themes.loadThemeConfig(themeConfigPath, themeDir);

            if(themeData.tagTemplates) {
                let templateFiles = Object.keys(themeData.tagTemplates);

                for(let i = 0; i < templateFiles.length; i++) {
                    let fileName = templateFiles[i];
                    tagTemplates.push(
                        [fileName, themeData.tagTemplates[fileName]]
                    );
                }
            }
        }

        return tagTemplates;
    }

    /*
     * Load available author templates
     */
    loadAuthorTemplates() {
        let authorTemplates = [];
        let siteData = fs.readFileSync(this.siteConfigPath, 'utf8');
        siteData = JSON.parse(siteData);

        if(siteData.theme) {
            let themeDir = path.join(this.sitePath, siteData.theme);
            let themeConfigPath = path.join(this.sitePath, 'input', 'config', 'theme.config.json');
            let themeData = Themes.loadThemeConfig(themeConfigPath, themeDir);

            if(themeData.authorTemplates) {
                let templateFiles = Object.keys(themeData.authorTemplates);

                for(let i = 0; i < templateFiles.length; i++) {
                    let fileName = templateFiles[i];
                    authorTemplates.push(
                        [fileName, themeData.authorTemplates[fileName]]
                    );
                }
            }
        }

        return authorTemplates;
    }

    /*
     * Remove specific theme from the app directory
     */
    removeTheme(directory) {
        fs.removeSync(path.join(this.themesPath, directory));
    }

    updateThemeConfig(newConfig) {
        let themeConfigPath = path.join(this.sitesDir, this.siteName, 'input', 'config', 'theme.config.json');
        let themeBackupConfigPath = path.join(this.sitesDir, this.siteName, 'input', 'config', 'theme.' + this.currentTheme(true) + '.config.json');
        let themeDefaultConfig = UtilsHelper.loadThemeConfig(path.join(this.sitesDir, this.siteName, 'input'), this.currentTheme(true));
        let themeConfig = {
            config: newConfig.config,
            customConfig: newConfig.customConfig,
            postConfig: newConfig.postConfig,
            pageConfig: newConfig.pageConfig,
            tagConfig: newConfig.tagConfig,
            authorConfig: newConfig.authorConfig,
            defaultTemplates: newConfig.defaultTemplates
        };

        // Check all options for the media fields
        let groups = ['config', 'customConfig', 'postConfig', 'pageConfig', 'tagConfig', 'authorConfig'];

        for(let i = 0; i < groups.length; i++) {
            let options = themeDefaultConfig[groups[i]];

            if(!options) {
                continue;
            }

            for (let j = 0; j < options.length; j++) {
                if (
                    themeDefaultConfig[groups[i]][j] &&
                    (
                        themeDefaultConfig[groups[i]][j].type === 'upload' ||
                        themeDefaultConfig[groups[i]][j].type === 'smallupload'
                    )
                ) {
                    let mediaPathKey = themeDefaultConfig[groups[i]][j].name;

                    if (themeConfig[groups[i]] && themeConfig[groups[i]][mediaPathKey]) {
                        let mediaPath = themeConfig[groups[i]][mediaPathKey];
                        themeConfig[groups[i]][mediaPathKey] = this.normalizeThemeImagePath(mediaPath);
                    }
                }
            }
        }

        let configString = JSON.stringify(themeConfig, null, 4);

        // Save config
        fs.writeFileSync(themeConfigPath, configString);
        fs.writeFileSync(themeBackupConfigPath, configString);

        // Remove unused config images
        this.checkAndCleanImages(configString);
    }

    /*
     * Fixes path for the media file
     */
    normalizeThemeImagePath(imagePath) {
        // Save the image if necessary
        imagePath = normalizePath(imagePath);
        imagePath = imagePath.replace('file:/', '');

        return imagePath;
    }

    /*
     * Load theme config
     */
    static loadThemeConfig(themeConfigPath, themeDir) {
        if(themeDir === 'not selected') {
            return false;
        }

        // Load default config
        let defaultConfigPath = path.join(__dirname, '..', 'default-files', 'theme-files', 'config.json');
        let defaultThemeConfig = JSON.parse(fs.readFileSync(defaultConfigPath));

        // Load basic theme config
        let themeLocalConfig = UtilsHelper.loadThemeConfig(themeDir);

        if (!themeLocalConfig.customConfig) {
            themeLocalConfig.customConfig = [];
        }

        defaultThemeConfig = UtilsHelper.mergeObjects(defaultThemeConfig, themeLocalConfig);

        // Load theme config overrides
        if(UtilsHelper.fileExists(themeConfigPath)) {
            let themeSavedConfig;
            
            try {
                themeSavedConfig = JSON.parse(fs.readFileSync(themeConfigPath));
            } catch (err) {
                console.log('(!) The saved theme config is malformed. Loading default theme config instead.');
                return;
            }

            let optionGroups = ['config', 'customConfig', 'postConfig', 'pageConfig', 'tagConfig', 'authorConfig'];

            for(let k = 0; k < optionGroups.length; k++) {
                let group = optionGroups[k];

                if (themeSavedConfig[optionGroups[k]]) {
                    for (let i = 0; i < defaultThemeConfig[group].length; i++) {
                        let name = defaultThemeConfig[group][i].name;

                        if (typeof themeSavedConfig[group][name] === 'undefined') {
                            continue;
                        }

                        if (themeSavedConfig[group][name] !== '') {
                            defaultThemeConfig[group][i].value = themeSavedConfig[group][name];
                        }
                    }
                }
            }

            if (themeSavedConfig.defaultTemplates) {
                defaultThemeConfig.defaultTemplates = JSON.parse(JSON.stringify(themeSavedConfig.defaultTemplates));
            }
        }

        let computedOptionsConfig = Themes.loadComputedOptions(themeDir, defaultThemeConfig);
        defaultThemeConfig.customConfig = defaultThemeConfig.customConfig.concat(computedOptionsConfig);

        return defaultThemeConfig;
    }

    /*
     * Remove unused images
     */
    checkAndCleanImages(configString) {
        let siteData = fs.readFileSync(this.siteConfigPath, 'utf8');
        siteData = JSON.parse(siteData);
        let authors = new Authors(this.appInstance, {site: siteData.name});
        let authorsData = authors.load();
        let authorAvatars = [];
        let ogFallbackImage = '';

        if(authorsData && authorsData.length) {
            for(let i = 0; i < authorsData.length; i++) {
                let authorConfig = authorsData[i].config;
                let avatar = '';

                try {
                    authorConfig = JSON.parse(authorConfig);
                    avatar = authorConfig.avatar;
                } catch(e) {
                    console.log('Getting user avatar in themes.js:');
                    console.log(e);
                }

                if(avatar !== '') {
                    authorAvatars.push(avatar);
                }
            }
        }

        if(siteData && siteData.advanced && siteData.advanced.openGraphImage) {
            ogFallbackImage = siteData.advanced.openGraphImage;
        }

        // Parse json before slashes normalization
        let configObject = JSON.parse(configString);
        // Make sure that all slashes are in the same direction
        configString = normalizePath(configString);

        // Get images dir
        let imagesDir = path.join(this.siteInputPath, 'media', 'website');

        if(!UtilsHelper.dirExists(imagesDir)) {
            return;
        }

        let images = fs.readdirSync(imagesDir);

        // Iterate through images
        for (let i in images) {
            let imagePath = images[i];
            let fullPath = path.join(imagesDir, imagePath);

            // Skip dirs and symlinks
            if(imagePath === '.' || imagePath === '..' || imagePath === 'responsive' || imagePath === 'gallery') {
                continue;
            }

            // Remove files which does not exist in the config string and as avatars/OG fallback image
            if(
                configString.indexOf('/' + imagePath) === -1 &&
                configString.indexOf('"' + imagePath + '"') === -1 &&
                authorAvatars.indexOf(imagePath) === -1 &&
                imagePath !== ogFallbackImage
            ) {
                try {
                    fs.unlinkSync(fullPath);
                } catch(e) {
                    console.error(e);
                }

                // Remove responsive images
                this.removeResponsiveImages(fullPath);
            }
        }

        // clean up unnecessary default images
        let assetsToCheck = [
            {
                dir: 'posts', 
                configType: 'postConfig'
            },
            {
                dir: 'tags', 
                configType: 'tagConfig'
            },
            {
                dir: 'authors', 
                configType: 'authorConfig'
            }
        ];

        for (let i = 0; i < assetsToCheck.length; i++) {
            let dirToCheck = assetsToCheck[i].dir;
            let configToCheck = assetsToCheck[i].configType;
            let viewImagesDir = path.join(this.siteInputPath, 'media', dirToCheck, 'defaults');

            if(!UtilsHelper.dirExists(viewImagesDir)) {
                return;
            }

            let viewImages = fs.readdirSync(viewImagesDir);
            let configImages = Object.values(configObject[configToCheck]);

            // Iterate through images
            for (let i in viewImages) {
                let imagePath = viewImages[i];
                let fullPath = path.join(viewImagesDir, imagePath);

                // Skip dirs and symlinks
                if (imagePath === '.' || imagePath === '..' || imagePath === 'responsive' || imagePath === 'gallery') {
                    continue;
                }

                // Remove files which does not exist in the post text
                if (configImages.indexOf(imagePath) === -1) {
                    try {
                        fs.unlinkSync(fullPath);
                    } catch(e) {
                        console.error(e);
                    }

                    // Remove responsive images
                    this.removeResponsiveImages(fullPath);
                }
            }
        }
    }

    /*
     * Remove unused responsive images
     */
    removeResponsiveImages(originalPath) {
        let currentTheme = this.currentTheme();
        let dimensions = false;

        // If there is no selected theme
        if(currentTheme === 'not selected') {
            return;
        }

        // Load theme config
        let themeConfig = UtilsHelper.loadThemeConfig(this.siteInputPath, currentTheme);
        let forceWebp = !!this.appInstance.sites[this.siteName]?.advanced?.forceWebp;
        
        // check if responsive images config exists
        if(UtilsHelper.responsiveImagesConfigExists(themeConfig)) {
            dimensions = UtilsHelper.responsiveImagesDimensions(themeConfig, 'optionImages');

            if(dimensions === false) {
                dimensions = UtilsHelper.responsiveImagesDimensions(themeConfig, 'contentImages');
            }

            if(dimensions === false) {
                return;
            }

            let responsiveImagesDir = path.parse(originalPath).dir;
            responsiveImagesDir = path.join(responsiveImagesDir, 'responsive');

            // create responsive images for each size
            for(let dimensionName of dimensions) {
                let filename = path.parse(originalPath).name;
                let extension = path.parse(originalPath).ext;
                
                if (forceWebp && ['.png', '.jpg', '.jpeg'].indexOf(extension.toLowerCase()) > -1) {
                    extension = '.webp'; 
                }

                let responsiveImagePath = path.join(responsiveImagesDir, filename + '-' + dimensionName + extension);

                if(UtilsHelper.fileExists(responsiveImagePath)) {
                    fs.unlinkSync(responsiveImagePath);
                }
            }
        }
    }

    /**
     * Load option values from computed-options.js file (if exists)
     */
    static loadComputedOptions(inputDir, themeConfig) {
        let computedOptionsConfig = [];
        let computedOptionsPath = path.join(inputDir, 'computed-options.js');
        let overridedComputedOptionsPath = UtilsHelper.fileIsOverrided(inputDir, computedOptionsPath);

        if (overridedComputedOptionsPath) {
            computedOptionsPath = overridedComputedOptionsPath;
        }

        if (!UtilsHelper.fileExists(computedOptionsPath)) {
            return computedOptionsConfig;
        }

        try {
            computedOptionsConfig = UtilsHelper.requireWithNoCache(computedOptionsPath, themeConfig);
        } catch(e) {
            console.log('The theme computed-options.js file is corrupted');
            return [];
        }

        return computedOptionsConfig;
    }
}

module.exports = Themes;
