const Handlebars = require('handlebars');
const Gdpr = require('./../../helpers/gdpr.js');

/**
 * Helper for creating additional useful tags
 *
 * {{{ publiiFooter }}}
 *
 * @returns {string} content of the Publii-specific element like GDPR popup
 */
function publiiFooterHelper(rendererInstance, Handlebars) {
    Handlebars.registerHelper('publiiFooter', function (context) {
        let output  = '';

        if (rendererInstance.plugins.hasInsertions('publiiFooter')) {
            output += "\n";
            output += rendererInstance.plugins.runInsertions('publiiFooter', rendererInstance);
        }

        if (rendererInstance.siteConfig.advanced.gdpr.enabled) {
            output += Gdpr.popupHtmlOutput(rendererInstance.siteConfig.advanced.gdpr, rendererInstance);
            output += Gdpr.popupJsOutput(rendererInstance.siteConfig.advanced.gdpr);
        }

        return new Handlebars.SafeString(output);
    });
}

module.exports = publiiFooterHelper;
