const Handlebars = require('handlebars');

/**
 * Helper for creating link element with feed URL (for RSS and JSON)
 *
 * {{feedLink}}
 *
 * @returns {string} <link> elements with URL to the RSS/JSON feeds
 */
function feedLink() {
    let output = '';

    if (!this.siteConfig.deployment || !this.siteConfig.deployment.relativeUrls) {
        let feedTitle = this.siteConfig.displayName;

        if (
            this.siteConfig.advanced && 
            this.siteConfig.advanced.feed && 
            this.siteConfig.advanced.feed.title === 'customTitle'
        ) {
            feedTitle = this.siteConfig.advanced.feed.titleValue;
        }

        let rssFeedTitle = '';
        let jsonFeedTitle = '';

        if (feedTitle) {
            rssFeedTitle = 'title="' + Handlebars.Utils.escapeExpression(feedTitle) + ' - RSS"';
            jsonFeedTitle = 'title="' + Handlebars.Utils.escapeExpression(feedTitle) + ' - JSON"';
        }

        if (this.siteConfig.advanced.feed.enableRss) {
            let rssUrl = Handlebars.Utils.escapeExpression(this.siteConfig.domain + '/feed.xml');
            output += '<link rel="alternate" type="application/atom+xml" href="' + rssUrl + '" ' + rssFeedTitle + '>' + "\n";
        }

        if (this.siteConfig.advanced.feed.enableJson) {
            let jsonUrl = Handlebars.Utils.escapeExpression(this.siteConfig.domain + '/feed.json');
            output += '<link rel="alternate" type="application/json" href="' + jsonUrl + '" ' + jsonFeedTitle + '>' + "\n";
        }
    }

    return new Handlebars.SafeString(output);
}

function feedLinkHelper(rendererInstance, Handlebars) {
    Handlebars.registerHelper('feedLink', feedLink.bind(rendererInstance));
}

module.exports = {
    __feedLink: feedLink,
    feedLinkHelper: feedLinkHelper
};
