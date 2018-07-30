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
        let pageUrl = context.data.website.pageUrl;

        // If current page is a post - check for canonical URL
        if (context.data.root.canonicalUrl) {
            pageUrl = context.data.root.canonicalUrl;
        }

        // We need to remove amp directory from the url in AMP renderer mode
        if(rendererInstance.ampMode) {
            pageUrl = pageUrl.replace('/amp/', '/');
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
