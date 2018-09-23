const fs = require('fs');
const md5 = require('md5');
const path = require('path');
const memoize = require('fast-memoize');

/**
 *
 * Helper function used to calculate MD5 sum of the given file contents
 *
 * @param {string} localPath - path to the file
 *
 * @returns {string} - MD5 sum based on the given file contents
 */
function getMD5(localPath) {
    let fileContent = fs.readFileSync(localPath);
    return md5(fileContent);
}

const memoizedMD5 = memoize(getMD5);

/**
 * Helper for loading JS files from the assets directory
 *
 * It also adds MD5 sum hash as a v= param for preventing browser cache
 *
 * {{js "filepath.js"}}
 *
 * @returns {string} - path to the JS file with v= param based on the MD5 sume of the given file
 */
function JSHelper(rendererInstance, Handlebars) {
    Handlebars.registerHelper('js', function (filename) {
        let md5Sum = '';
        let localPath = path.join(
            rendererInstance.inputDir,
            'themes',
            rendererInstance.themeConfig.name.toLowerCase(),
            rendererInstance.themeConfig.files.assetsPath,
            'js',
            filename
        );
        let versionSuffix = '';

        if(rendererInstance.siteConfig.advanced.versionSuffix) {
            md5Sum = memoizedMD5(localPath);
            versionSuffix = '?v=' + md5Sum;
        }

        let url = [
                    rendererInstance.siteConfig.domain,
                    rendererInstance.themeConfig.files.assetsPath,
                    'js',
                    filename + versionSuffix
                ].join('/');

        return new Handlebars.SafeString(url);
    });
}

module.exports = JSHelper;
