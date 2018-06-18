const Handlebars = require('handlebars');

/**
 * Helper for creating link element with feed URL
 *
 * {{feedLink}}
 *
 * @returns {string} <link> element with URL to the RSS feed
 */
function feedLink() {
    let output = '';
    let url = this.siteConfig.domain + '/feed.xml';
    url = Handlebars.Utils.escapeExpression(url);
    output = '<link type="application/atom+xml" rel="alternate" href="' + url + '"/>';

    return new Handlebars.SafeString(output);
}


function feedLinkHelper(rendererInstance, Handlebars) {
    Handlebars.registerHelper('feedLink', feedLink.bind(rendererInstance));
}

module.exports = {
    __feedLink: feedLink,
    feedLinkHelper: feedLinkHelper
};
