const Handlebars = require('handlebars');

/**
 * Helper function for generating asset URL based on a given path
 *
 * @param {string} path
 *
 * @returns {string} URL to the assets directory
 */

function asset(filePath) {
    let url = [
        this.siteConfig.domain,
        this.themeConfig.files.assetsPath,
        filePath
    ].join('/');
    
    url = Handlebars.Utils.escapeExpression(url);

    return new Handlebars.SafeString(url);
}

/**
 * Helper for loading asset files
 *
 * @returns {string} URL to the asset
 */
function assetHelper(rendererInstance, Handlebars) {
    Handlebars.registerHelper('asset', asset.bind(rendererInstance));
}

module.exports = {
    assetHelper: assetHelper,
    __asset: asset
};
