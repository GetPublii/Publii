const fs = require('fs');
const md5 = require('md5');
const path = require('path');
const memoize = require('fast-memoize');

/**
 *
 * Helper function for getting MD5 sum based on the specific file contents
 *
 * @param {string} localPath - path to the file
 *
 * @returns {string} MD5 sum based on the file contents under specified path
 */
function getMD5(localPath) {
    let fileContent = fs.readFileSync(localPath);
    return md5(fileContent);
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
        let localPath = path.join(
            rendererInstance.inputDir,
            'themes',
            rendererInstance.themeConfig.name.toLowerCase(),
            rendererInstance.themeConfig.files.assetsPath,
            'css',
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
                    'css',
                    filename + versionSuffix
                ].join('/');

        return new Handlebars.SafeString(url);
    });
}

module.exports = CSSHelper;
