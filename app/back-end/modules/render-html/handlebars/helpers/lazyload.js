const Handlebars = require('handlebars');

/**
 * Helper for creating loading attributes
 *
 * {{ lazyload eager }}
 *
 * @returns {string} loading attribute with a value specified as a param
 */
function lazyloadHelper(rendererInstance, Handlebars) {
    Handlebars.registerHelper('lazyload', function(value) {
        let output = '';

        if (rendererInstance.siteConfig.advanced.mediaLazyLoad && ['eager', 'lazy', 'auto'].indexOf(value) > -1) {
            output = ' loading="' + value + '"';
        }

        return new Handlebars.SafeString(output);
    });
}

module.exports = lazyloadHelper;
