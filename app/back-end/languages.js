/*
 * Languages instance
 */

const fs = require('fs-extra');
const path = require('path');
const UtilsHelper = require('./helpers/utils.js');
const languageConfigValidator = require('./helpers/validators/language-config.js');
const normalizePath = require('normalize-path');

class Languages {
    constructor(appInstance) {
        this.basePath = appInstance.appDir;
        this.languagesPath = path.join(this.basePath, 'languages');
        this.appInstance = appInstance;
    }

    /*
     * Load languages from a specific path
     */
    loadLanguages(pathToLanguages = false) {
        if(!pathToLanguages) {
            pathToLanguages = this.languagesPath;
        }

        let filesAndDirs = fs.readdirSync(pathToLanguages);
        let output = [];

        for(let i = 0; i < filesAndDirs.length; i++) {
            if (filesAndDirs[i][0] === '.' || !UtilsHelper.dirExists(path.join(pathToLanguages, filesAndDirs[i]))) {
                continue;
            }

            let configPath = path.join(pathToLanguages, filesAndDirs[i], 'config.json');

            // Load only proper languages
            if (!fs.existsSync(configPath)) {
                continue;
            }

            // Load only properly configured languages
            if(languageConfigValidator(configPath) !== true) {
                continue;
            }

            let languageData = fs.readFileSync(configPath, 'utf8');
            languageData = JSON.parse(languageData);

            output.push({
                directory: filesAndDirs[i],
                name: languageData.name,
                version: languageData.version,
                author: languageData.author,
                publiiSupport: languageData.publiiSupport
            });
        }

        return output;
    }

    /*
     * Remove specific language from the app directory
     */
    removeLanguage(directory) {
        fs.removeSync(path.join(this.languagesPath, directory));
    }

    /*
     * Fixes path for the media file
     */
    normalizeLanguageImagePath(imagePath) {
        // Save the image if necessary
        imagePath = normalizePath(imagePath);
        imagePath = imagePath.replace('file:/', '');

        return imagePath;
    }
}

module.exports = Languages;
