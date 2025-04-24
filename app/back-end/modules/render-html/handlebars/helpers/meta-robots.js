const Handlebars = require('handlebars');

/**
 * Helper for generating meta_robots
 *
 * {{metaRobots}}
 *
 * @returns {string} <meta> tag with the meta robots value
 */
function metaRobotsHelper(rendererInstance, Handlebars) {
    Handlebars.registerHelper('metaRobots', function (options) {
        // If canonical is set - skip meta robots tag
        if (options.data.root.hasCustomCanonicalUrl) {
            return '';
        }

        if (
            Array.isArray(options.data.context) &&
            options.data.context[0] && (
                (
                    rendererInstance.siteConfig.advanced.homepageNoIndexPagination &&
                    options.data.context.indexOf('index-pagination') !== -1
                ) || (
                    rendererInstance.siteConfig.advanced.tagNoIndexPagination &&
                    options.data.context.indexOf('tag-pagination') !== -1
                ) || (
                    rendererInstance.siteConfig.advanced.authorNoIndexPagination &&
                    options.data.context.indexOf('author-pagination') !== -1
                )
            )
        ) {
            return new Handlebars.SafeString('<meta name="robots" content="noindex, follow">');
        }

        if (options.data.root.metaRobotsRaw === 'index, follow') {
            return '';
        }

        if (options.data.root.metaRobotsRaw !== '') {
            return new Handlebars.SafeString('<meta name="robots" content="' + options.data.root.metaRobotsRaw + '">');
        }

        return '';
    });
}

module.exports = metaRobotsHelper;
