const Handlebars = require('handlebars');

/**
 * Helper for creating canonical link
 *
 * {{canonicalLink}}
 *
 * @returns {string} - <link> element with canonical URL
 */
function canonicalLinkHelper(rendererInstance, Handlebars) {
    Handlebars.registerHelper('canonicalLink', function (context) {
        // If current page is not indexed - skip canonical link
        if ((context.data.root.metaRobotsRaw.indexOf('noindex') > -1 || context.data.root.metaRobotsRaw.indexOf('nofollow') > -1) && !context.data.root.hasCustomCanonicalUrl) {
            return '';
        }

        if (
            Array.isArray(context.data.context) &&
            context.data.context[0] && (
                (
                    rendererInstance.siteConfig.advanced.homepageNoIndexPagination &&
                    context.data.context.indexOf('index-pagination') !== -1
                ) || (
                    rendererInstance.siteConfig.advanced.tagNoIndexPagination &&
                    context.data.context.indexOf('tag-pagination') !== -1
                ) || (
                    rendererInstance.siteConfig.advanced.authorNoIndexPagination &&
                    context.data.context.indexOf('author-pagination') !== -1
                )
            )
        ) {
            return '';
        }

        let pageUrl = context.data.website.pageUrl;

        // If current page is a post - check for canonical URL
        if (context.data.root.canonicalUrl) {
            pageUrl = context.data.root.canonicalUrl;
        }

        // Remove index.html from the end of URL
        pageUrl = pageUrl.replace(/index\.html$/, '', pageUrl);

        // Add trailing slash if not exists
        if(pageUrl[pageUrl.length - 1] !== '/' && pageUrl.substr(-5) !== '.html') {
            pageUrl = pageUrl + '/';
        }

        let output = '<link rel="canonical" href="' + pageUrl + '">';

        return new Handlebars.SafeString(output);
    });
}

module.exports = canonicalLinkHelper;
