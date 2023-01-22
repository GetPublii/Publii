const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const memoize = require('fast-memoize');

/**
 *
 * Helper function used to calculate MD5 sum of the given file contents
 *
 * @param {string} localPath - path to the file
 * @param {string} overridedLocalPath - path to the overrided version of the file
 *
 * @returns {string} - MD5 sum based on the given file contents
 */
function getMD5(localPath, overridedLocalPath) {
    let fileContent = '';
    
    if (fs.existsSync(overridedLocalPath)) {
        fileContent = fs.readFileSync(overridedLocalPath);
    } else {
        fileContent = fs.readFileSync(localPath);
    }

    return crypto.createHash('md5').update(fileContent).digest('hex');
}

const memoizedMD5 = memoize(getMD5);

/**
 * Helper for loading CSS files from the assets directory
 *
 * It also adds MD5 sum hash as a v= param for preventing browser cache
 *
 * {{css "filepath.css"}}
 *
 * @returns {string} path to the CSS file with assigned v= param based on the file MD5 sum
 */
function CSSHelper(rendererInstance, Handlebars) {
    Handlebars.registerHelper('css', function (filename) {
        let md5Sum = '';
        let localPath = path.join(rendererInstance.inputDir, 'themes', rendererInstance.themeConfig.name.toLowerCase(), rendererInstance.themeConfig.files.assetsPath, 'css', filename);
        let overridedLocalPath = path.join(rendererInstance.inputDir, 'themes', rendererInstance.themeConfig.name.toLowerCase() + '-override', rendererInstance.themeConfig.files.assetsPath, 'css', filename);
        let versionSuffix = '';

        if (rendererInstance.siteConfig.advanced.versionSuffix) {
            md5Sum = memoizedMD5(localPath, overridedLocalPath);
            versionSuffix = '?v=' + md5Sum;
        }

        let url = [
            rendererInstance.siteConfig.domain,
            rendererInstance.themeConfig.files.assetsPath,
            'css',
            filename + versionSuffix
        ].join('/');

        return new Handlebars.SafeString(url);
    });
}

module.exports = CSSHelper;
