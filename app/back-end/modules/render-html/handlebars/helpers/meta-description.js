const Handlebars = require('handlebars');

/**
 * Helper for generating meta_description
 *
 * {{metaDescription}}
 *
 * @returns {string} - <meta> tag with meta description
 */
function metaDescription(options) {
    if (options.data.root.metaDescriptionRaw !== '') {
        if (options.data.root.metaRobotsRaw.indexOf('noindex') !== -1) {
            return '';
        }

        let output = '<meta name="description" content="' + options.data.root.metaDescriptionRaw.replace(/"/g, "'") + '">';
        return new Handlebars.SafeString(output);
    }

    return '';
}

module.exports = metaDescription;
