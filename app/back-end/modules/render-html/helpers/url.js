/*
 * Class used to help with operations on
 * the URLs and slugs
 */

const slug = require('./../../../helpers/slug');
const path = require('path');
const normalizePath = require('normalize-path');

/**
 * Class used to load Theme files as a Handlebar templates
 */
class URLHelper {
    /**
     * Creates a slug for a given URL part
     *
     * @param string
     * @returns {*}
     */
    static createSlug(string) {
        // Note: It also transliterate the slug content
        return slug(string);
    }

    /**
     * Creates an URL for a given tag
     *
     * @param domain
     * @param urlsConfig
     * @param tagName
     * @returns {string}
     */
    static createTagPermalink(domain, urlsConfig, tagName, addIndexHtml = false) {
        let url = domain + '/' + URLHelper.createSlug(tagName) + '/';

        if(urlsConfig.tagsPrefix) {
            url = domain + '/' + urlsConfig.tagsPrefix + '/' + URLHelper.createSlug(tagName) + '/';

            if (urlsConfig.postsPrefix && urlsConfig.tagsPrefixAfterPostsPrefix) {
                url = domain + '/' + urlsConfig.postsPrefix + '/' + urlsConfig.tagsPrefix + '/' + URLHelper.createSlug(tagName) + '/';
            }
        }

        if(addIndexHtml) {
            url += 'index.html';
        }

        return url;
    }

    /**
     * Creates pagination link for a given URL type
     *
     * @param siteConfig
     * @param themeConfig
     * @param pageNumber
     * @param pageType
     * @param pageSlug
     * @returns {*}
     */
    static createPaginationPermalink(siteConfig, themeConfig, pageNumber, pageType, pageSlug, addIndexHtml = false) {
        let domain = siteConfig.domain;
        let config = siteConfig.advanced;
        
        // When there is no link - skip the operations
        if(pageNumber === false) {
            return false;
        }

        // We need to add tag name for all tag pages
        let pagePrefix = '';

        if(pageSlug !== false) {
            pagePrefix = pageSlug + '/';
        }

        // We need to add the page/X only for page > 1
        let pageSuffix = '';

        if(pageNumber > 1) {
            pageSuffix = config.urls.pageName + '/' + pageNumber + '/';
        }

        let optionalPrefix = '';

        if (pageType === 'home') {
            if (config.urls.postsPrefix) {
                optionalPrefix = config.urls.postsPrefix + '/';
            } 
            
            if (config.urls.postsPrefix && !config.usePageAsFrontpage && !themeConfig.supportedFeatures.postsPage && pageNumber === 1) {
                optionalPrefix = '';
            }
        }

        if(pageType === 'author') {
            optionalPrefix = config.urls.authorsPrefix + '/';

            if (config.urls.postsPrefix && config.urls.authorsPrefixAfterPostsPrefix) {
                optionalPrefix = config.urls.postsPrefix + '/' + config.urls.authorsPrefix + '/';
            }
        }

        if(pageType === 'tag' && config.urls.tagsPrefix !== '') {
            optionalPrefix = config.urls.tagsPrefix + '/';

            if (config.urls.postsPrefix && config.urls.tagsPrefixAfterPostsPrefix) {
                optionalPrefix = config.urls.postsPrefix + '/' + config.urls.tagsPrefix + '/';
            }
        }

        let url = domain + '/' + optionalPrefix + pagePrefix + pageSuffix;

        if(addIndexHtml) {
            if(url.substr(-1) === '/') {
                url += 'index.html';
            } else {
                url += '/index.html';
            }
        }

        return url;
    }

    /**
     * Creates an image URL
     *
     * @param domain
     * @param itemID
     * @param imageURL
     * @param type
     * @returns {string}
     */
    static createImageURL(domain, itemID, imageURL, type = 'post') {
        let output = [domain, 'media', type + 's', itemID, imageURL];
        output = normalizePath(output.join('/'));
        output = URLHelper.fixProtocols(output);

        return output;
    }

    /**
     * Changes given asset URL into file path to this asset
     *
     * @param inputDir
     * @param assetUrl
     * @param websiteUrl
     * @returns {string}
     */
    static transformAssetURLIntoPath(inputDir, assetUrl, websiteUrl) {
        websiteUrl = normalizePath(websiteUrl);
        websiteUrl = websiteUrl.replace('index.html', '');
        assetUrl = normalizePath(assetUrl);
        assetUrl = assetUrl.replace(websiteUrl, '');
        assetUrl = assetUrl.split('/');

        return path.join(inputDir, ...assetUrl);
    }

    /**
     * Fixes known problems with protocols in a given URL
     *
     * @param input
     * @returns {*}
     */
    static fixProtocols(input) {
        if(input.substr(0,6) === 'http:/' && input.substr(0,7) !== 'http://') {
            input = input.replace('http:/', 'http://');
        }

        if(input.substr(0,8) === 'http:///') {
            input = input.replace('http:///', 'http://');
        }

        if(input.substr(0,7) === 'https:/' && input.substr(0,8) !== 'https://') {
            input = input.replace('https:/', 'https://');
        }

        if(input.substr(0,9) === 'https:///') {
            input = input.replace('https:///', 'https://');
        }

        if(input.substr(0,6) === 'file:/' && input.substr(0,7) !== 'file://') {
            input = input.replace('file:/', 'file:///');
        }

        if(input.substr(0,7) === 'file://' && input.substr(0,8) !== 'file:///') {
            input = input.replace('file://', 'file:///');
        }

        return input;
    }

    /**
     * Adapts URLs of images in the settings to use on the preview or a final website
     *
     * @param domain
     * @param settings
     * @returns {*}
     */
    static prepareSettingsImages(domain, settings) {
        let groups = Object.keys(settings);

        for (let i = 0; i < groups.length; i++) {
            let options = Object.keys(settings[groups[i]]);

            for (let j = 0; j < options.length; j++) {
                if (Array.isArray(settings[groups[i]][options[j]])) {
                    let items = settings[groups[i]][options[j]];

                    for (let k = 0; k < items.length; k++) {
                        let item = items[k];
                        
                        if (typeof item === 'object') {
                            let keys = Object.keys(item);

                            for (let l = 0; l < keys.length; l++) {
                                let key = keys[l];

                                if (typeof item[key] === 'string' && item[key].indexOf('media/website') > -1) {
                                    item[key] = URLHelper.fixProtocols(normalizePath(domain + '/' + item[key]));
                                }
                            }
                        }
                    }
                }
                
                if (typeof settings[groups[i]][options[j]] !== "string") {
                    continue;
                }

                if (settings[groups[i]][options[j]].indexOf('media/website') > -1) {
                    settings[groups[i]][options[j]] = URLHelper.fixProtocols(normalizePath(domain + '/' + settings[groups[i]][options[j]]));
                }
            }
        }

        return settings;
    }
}

module.exports = URLHelper;
