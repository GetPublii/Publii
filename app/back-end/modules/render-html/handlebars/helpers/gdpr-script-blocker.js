const Handlebars = require('handlebars');

/**
 * Helper for creating proper script type value according to the
 *
 * {{gdprScriptBlocker "group-name"}}
 *
 * @returns {string} type attribute value with a proper value if GDRP is enabled or not
 */
function gdprScriptBlockerHelper(rendererInstance, Handlebars) {
    Handlebars.registerHelper('gdprScriptBlocker', function (groupName) {
        let output  = 'text/javascript';

        if (rendererInstance.siteConfig.advanced.gdpr.enabled) {
            output = 'gdpr-blocker/' + groupName;
        }

        return new Handlebars.SafeString(output);
    });
}

module.exports = gdprScriptBlockerHelper;
