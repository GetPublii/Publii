const Handlebars = require('handlebars');

/**
 * Helper function for generating Google Fonts API URL based on a given font
 *
 * @param {string} path to the Google Font font
 *
 * @returns {string} URL to the Google Fonts API for a given font
 */

function font(path) {
    let url = 'https://fonts.googleapis.com/css?family=' + path;
    url = Handlebars.Utils.escapeExpression(url);

    return new Handlebars.SafeString(url);
}

/**
 * Helper for loading font files from the Google Fonts directory
 *
 * {{font @config.visual.font}}
 *
 * @returns {string} URL to the Google Fonts API for a given font
 */
function fontHelper(rendererInstance, Handlebars) {
    Handlebars.registerHelper('font', font.bind(rendererInstance));
}

module.exports = {
    fontHelper: fontHelper,
    __font: font
};
