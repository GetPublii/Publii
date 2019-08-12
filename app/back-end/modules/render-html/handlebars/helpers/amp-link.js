const Handlebars = require('handlebars');

/**
 * Helper for creating AMP link
 *
 * {{ampLink}}
 *
 * @returns {string} - <link> element with AMP version URL
 */
function ampLink(context) {
    let ampUrl = context.data.website.ampUrl;
    let output = '';

    if (
        this.siteConfig.advanced.ampIsEnabled && 
        context.data.root.metaRobotsRaw.indexOf('noindex') === -1
    ) {
        if (
            Array.isArray(context.data.context) &&
            context.data.context[0] && (
                (
                    this.siteConfig.advanced.homepageNoIndexPagination &&
                    context.data.context.indexOf('index-pagination') !== -1
                ) || (
                    this.siteConfig.advanced.tagNoIndexPagination &&
                    context.data.context.indexOf('tag-pagination') !== -1
                ) || (
                    this.siteConfig.advanced.authorNoIndexPagination &&
                    context.data.context.indexOf('author-pagination') !== -1
                )
            )
        ) {
            return '';
        }
       
        output = '<link rel="amphtml" href="' + ampUrl + '">';
    }

    return new Handlebars.SafeString(output);
}

function ampLinkHelper(rendererInstance, Handlebars) {
    Handlebars.registerHelper('ampLink', ampLink.bind(rendererInstance));
}

module.exports = {
    __ampLink: ampLink,
    ampLinkHelper: ampLinkHelper
};
