const fs = require('fs-extra');
const path = require('path');
const normalizePath = require('normalize-path');

/*
 * Other helper functions
 */
class UtilsHelper {
    /*
     *
     *  Object helper functions
     *
     */

    /*
     * Deep merge for objects as Object.assign not merge objects properly
     */
    static mergeObjects(target, source) {
        if (typeof target !== 'object') {
            target = {};
        }

        for (let property in source) {
            if (source.hasOwnProperty(property)) {
                let sourceProperty = source[property];

                if (typeof sourceProperty === 'object' && !Array.isArray(sourceProperty) && !(sourceProperty instanceof Date)) {
                    target[property] = UtilsHelper.mergeObjects(target[property], sourceProperty);
                    continue;
                } else if(sourceProperty instanceof Date) {
                    target[property] = new Date(sourceProperty.getTime());
                    continue;
                }

                target[property] = sourceProperty;
            }
        }

        for (let a = 2, l = arguments.length; a < l; a++) {
            UtilsHelper.mergeObjects(target, arguments[a]);
        }

        return target;
    }

    /*
     *
     *  Filesystem helper functions
     *
     */

    /*
     * Check if the dir exists
     */
    static dirExists(dirPath) {
        let dirStat = false;

        try {
            dirStat = fs.statSync(dirPath);
        } catch(e) {}

        if(dirStat && dirStat.isDirectory()) {
            return true;
        }

        return false;
    }

    /*
     * Check if file exists
     */
    static fileExists(filePath) {
        let fileStat = false;

        try {
            fileStat = fs.statSync(filePath);
        } catch(e) {}

        if(fileStat && !fileStat.isDirectory()) {
            return true;
        }

        return false;
    }

    /*
     *
     *  Responsive images helper functions
     *
     */

    /*
     * Return true if responsive images config exists
     */
    static responsiveImagesConfigExists(themeConfig, type = false) {
        let files = themeConfig.files;

        if(type === false) {
            return !!files &&
                   !!files.responsiveImages &&
                   !!files.responsiveImages.contentImages &&
                   !!files.responsiveImages.contentImages.dimensions;
        }

        // When we want to check if configuration for a specific images exists
        return !!files &&
               !!files.responsiveImages &&
               !!files.responsiveImages[type] &&
               !!files.responsiveImages[type].dimensions;
    }

    /*
     * Return responsive image dimensions for given config
     */
    static responsiveImagesDimensions(themeConfig, type, group = false) {
        if(!UtilsHelper.responsiveImagesConfigExists(themeConfig)) {
            return false;
        }

        if(UtilsHelper.responsiveImagesConfigExists(themeConfig, type)) {
            let dimensions = false;

            if(themeConfig.files.responsiveImages[type]) {
                dimensions = themeConfig.files.responsiveImages[type].dimensions;
            } else {
                return false;
            }

            if(!group) {
                return UtilsHelper.responsiveImagesDimensionNames(dimensions);
            }

            return UtilsHelper.responsiveImagesDimensionNames(dimensions, group);
        }

        return false;
    }

    /*
     * Return responsive image dimensions data
     */
    static responsiveImagesData(themeConfig, type, group = false) {
        if(!UtilsHelper.responsiveImagesConfigExists(themeConfig)) {
            return false;
        }

        if(UtilsHelper.responsiveImagesConfigExists(themeConfig, type)) {
            let dimensions = false;

            if(themeConfig.files.responsiveImages[type]) {
                dimensions = themeConfig.files.responsiveImages[type].dimensions;
            } else {
                console.log('TYPE: ' + type + ' NOT EXISTS!');
                return false;
            }

            let filteredDimensions = false;
            let dimensionNames = Object.keys(dimensions);

            if(!group) {
                return dimensions;
            }

            for(let name of dimensionNames) {
                if(dimensions[name].group.split(',').indexOf(group) > -1) {
                    if(filteredDimensions === false) {
                        filteredDimensions = {};
                    }

                    filteredDimensions[name] = Object.assign({}, dimensions[name]);
                }
            }

            return filteredDimensions;
        }

        return false;
    }

    /*
     * Return responsive images groups
     */
    static responsiveImagesGroups(themeConfig, type) {
        if (!UtilsHelper.responsiveImagesConfigExists(themeConfig)) {
            return false;
        }

        if (UtilsHelper.responsiveImagesConfigExists(themeConfig, type)) {
            let groups = false;
            let dimensions = false;

            if(themeConfig.files.responsiveImages[type]) {
                dimensions = themeConfig.files.responsiveImages[type].dimensions;
            } else {
                return false;
            }

            let keys = Object.keys(dimensions);

            for(let key of keys) {
                if(dimensions[key].group) {
                    if(groups === false) {
                        groups = [];
                    }

                    let foundedGroups = dimensions[key].group.split(',');

                    for(let foundedGroup of foundedGroups) {
                        if (groups.indexOf(foundedGroup)) {
                            groups.push(foundedGroup);
                        }
                    }
                }
            }

            return groups;
        }

        return false;
    }

    /*
     * Return responsive image dimensions for given config
     */
    static responsiveImagesDimensionNames(dimensions, group = false) {
        // Get object keys for group type check
        let keys = Object.keys(dimensions);
        let dimensionNames = false;

        // When we have groups and the group param is set - filter results to a specific group
        if(group !== false) {
            for(let key of keys) {
                if(dimensions[key].group.split(',').indexOf(group) > -1) {
                    if(dimensionNames === false) {
                        dimensionNames = [];
                    }

                    dimensionNames.push(key);
                }
            }
        } else {
            // When there is no groups
            dimensionNames = Object.keys(dimensions);
        }

        return dimensionNames;
    }

    /*
     * Return file when there is no override or file path if the override exists
     */
    static fileIsOverrided(inputDir, themeName, filePath) {
        let basePath;
        let overridesDir;
        let overridedFilePath;

        if(!filePath) {
            basePath = normalizePath(path.join(inputDir));
            overridesDir = normalizePath(inputDir.replace(/[\\\/]{1,1}$/, '') + '-override');
            overridedFilePath = normalizePath(themeName).replace(basePath, overridesDir);
        } else {
            basePath = normalizePath(path.join(inputDir, 'themes', themeName));
            overridesDir = normalizePath(path.join(inputDir, 'themes', themeName + '-override'));
            overridedFilePath = normalizePath(filePath).replace(basePath, overridesDir);
        }

        if(!UtilsHelper.dirExists(overridesDir)) {
            return false;
        }

        if(!UtilsHelper.fileExists(overridedFilePath)) {
            return false;
        }

        return overridedFilePath;
    }

    /*
     * Loads theme config JSON
     */
    static loadThemeConfig(inputDir, themeName) {
        let themeConfig;
        let themeConfigPath;
        let overridedThemeConfigPath;

        if(!themeName) {
            themeConfigPath = path.join(inputDir, 'config.json');
            overridedThemeConfigPath = UtilsHelper.fileIsOverrided(inputDir, themeConfigPath);
        } else {
            themeName = themeName.toLowerCase();
            themeConfigPath = path.join(inputDir, 'themes', themeName, 'config.json');
            overridedThemeConfigPath = UtilsHelper.fileIsOverrided(inputDir, themeName, themeConfigPath);
        }

        if(overridedThemeConfigPath) {
            themeConfigPath = overridedThemeConfigPath;
        }

        try {
            themeConfig = JSON.parse(fs.readFileSync(themeConfigPath));
        } catch(e) {
            console.log('The theme config.json file is corrupted');
            return {};
        }

        return themeConfig;
    }
}

module.exports = UtilsHelper;
