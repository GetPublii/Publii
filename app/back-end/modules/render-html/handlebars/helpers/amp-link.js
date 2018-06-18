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

    if(this.siteConfig.advanced.ampIsEnabled) {
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
