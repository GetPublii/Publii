const Handlebars = require('handlebars');

/**
 * Helper for creating additional useful tags
 *
 * {{publiiHead}}
 *
 * @returns {string} content of the Publii-specific meta tags
 */
function publiiHeadHelper(rendererInstance, Handlebars) {
    Handlebars.registerHelper('publiiHead', function (context) {
        let output  = '<meta name="generator" content="Publii Open-Source CMS for Static Site" />';

        return new Handlebars.SafeString(output);
    });
}

module.exports = publiiHeadHelper;
