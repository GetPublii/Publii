/*
 * SEO-related site settings returned to the plugins by window.app.getCurrentSiteSeoSettings()
 *
 * These are the default values used when an item does not have its own values,
 * plus the URL and theme settings needed to show how an item is rendered.
 */

// Values copied as they are stored - an empty string when the setting does not exist
const TEXT_KEYS = [
    'noIndexThisPage',
    'metaTitle',
    'metaDescription',
    'postMetaTitle',
    'postMetaDescription',
    'pageMetaTitle',
    'pageMetaDescription',
    'tagMetaTitle',
    'tagMetaDescription',
    'metaRobotsTags',
    'authorMetaTitle',
    'authorMetaDescription',
    'metaRobotsAuthors'
];

// Pagination pages with "noindex, follow" - see the metaRobots helper of the renderer
const PAGINATION_NOINDEX_KEYS = [
    'homepageNoIndexPagination',
    'tagNoIndexPagination',
    'authorNoIndexPagination'
];

/**
 * The same rules as in the tag form and the author form:
 * pages are not created when the theme does not support them, otherwise the theme renderer option decides
 */
function themeCreatesPages (themeSettings, featureName, rendererOption) {
    themeSettings = themeSettings || {};

    if (themeSettings.supportedFeatures && themeSettings.supportedFeatures[featureName] === false) {
        return false;
    }

    return !!(themeSettings.renderer && themeSettings.renderer[rendererOption]);
}

/**
 * @param {object} currentSite - state.currentSite from the store
 *
 * @returns {object}
 */
function getSeoSettings (currentSite) {
    currentSite = currentSite || {};

    let config = currentSite.config || {};
    let advanced = config.advanced || {};
    let urls = advanced.urls || {};
    let settings = {
        siteName: config.name || '',
        displayName: config.displayName || '',
        domain: typeof config.domain === 'string' ? config.domain : '',
        urls: {
            cleanUrls: !!urls.cleanUrls,
            postsPrefix: urls.postsPrefix || '',
            tagsPrefix: urls.tagsPrefix || '',
            authorsPrefix: urls.authorsPrefix || '',
            pageName: urls.pageName || '',
            tagsPrefixAfterPostsPrefix: !!urls.tagsPrefixAfterPostsPrefix,
            authorsPrefixAfterPostsPrefix: !!urls.authorsPrefixAfterPostsPrefix,
            addIndex: !!urls.addIndex
        }
    };

    TEXT_KEYS.forEach(key => {
        settings[key] = typeof advanced[key] === 'undefined' ? '' : advanced[key];
    });

    settings.noIndexThisPage = !!settings.noIndexThisPage;

    PAGINATION_NOINDEX_KEYS.forEach(key => {
        settings[key] = !!advanced[key];
    });

    settings.tagPagesEnabled = themeCreatesPages(currentSite.themeSettings, 'tagPages', 'createTagPages');
    settings.authorPagesEnabled = themeCreatesPages(currentSite.themeSettings, 'authorPages', 'createAuthorPages');

    return settings;
}

module.exports = {
    getSeoSettings
};
