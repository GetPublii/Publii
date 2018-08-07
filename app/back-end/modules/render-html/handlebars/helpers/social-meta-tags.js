/**
 * Helper for creating Open Graph and Twitter Cars metatags
 *
 * {{socialMetaTags}}
 *
 * @returns {string} - meta tags for Open Graph and Twitter
 */
function socialMetaTagsHelper(rendererInstance, Handlebars) {
    Handlebars.registerHelper('socialMetaTags', function (contextData) {
        let output = '';
        let openGraphEnabled = rendererInstance.siteConfig.advanced.openGraphEnabled;
        let openGraphImage = rendererInstance.siteConfig.advanced.openGraphImage;
        let siteName = contextData.data.website.name;
        let image = '';
        let title = '';
        let description = '';
        let openGraphType = 'website';
        let twitterUsername = rendererInstance.siteConfig.advanced.twitterUsername;
        let twitterCardsType = rendererInstance.siteConfig.advanced.twitterCardsType;
        let twitterCardsEnabled = rendererInstance.siteConfig.advanced.twitterCardsEnabled;

        // Get SEO title if exists
        if(
            rendererInstance.siteConfig.advanced.metaTitle &&
            rendererInstance.siteConfig.advanced.metaTitle != ''
        ) {
            let siteNameValue = rendererInstance.siteConfig.name;

            if(rendererInstance.siteConfig.displayName) {
                siteNameValue = rendererInstance.siteConfig.displayName;
            }

            siteName = rendererInstance.siteConfig.advanced.metaTitle.replace(/%sitename/g, siteNameValue);
        }

        // Get tag values according to the current context - listing or single post page
        if(contextData.data.context.indexOf('post') === -1) {
            // Data for the index/tag listing page
            image = contextData.data.website.logo;
            title = siteName;
            description = contextData.data.root.metaDescriptionRaw;

            if (contextData.data.context.indexOf('tag') !== -1) {
                title = contextData.data.root.tag.name;

                if (rendererInstance.siteConfig.advanced.usePageTitleInsteadItemName) {
                    title = contextData.data.root.title;
                }
            }

            if (contextData.data.context.indexOf('author') !== -1) {
                title = contextData.data.root.author.name;

                if (rendererInstance.siteConfig.advanced.usePageTitleInsteadItemName) {
                    title = contextData.data.root.title;
                }
            }
        } else {
            // Data for the single post page
            image = contextData.data.root.post.featuredImage.url;
            openGraphType = 'article';

            if(!image) {
                image = contextData.data.website.logo;
            }

            title = contextData.data.root.post.title;

            if (rendererInstance.siteConfig.advanced.usePageTitleInsteadItemName) {
                title = contextData.data.root.title;
            }

            description = contextData.data.root.metaDescriptionRaw;

            if(description === '') {
                description = contextData.data.root.post.excerpt;
            }
        }

        // Get fallback image if available
        if(openGraphImage && openGraphImage !== '' && image === contextData.data.website.logo) {
            image = openGraphImage;
        }

        // Generate Open Graph tags
        if(openGraphEnabled) {
            output += '<meta property="og:title" content="' + title.replace(/"/g, "'") + '" />';

            if (image) {
                output += '<meta property="og:image" content="' + image + '"/>';
            }

            output += '<meta property="og:site_name" content="' + siteName.replace(/"/g, "'") + '" />';
            output += '<meta property="og:description" content="' + description.replace(/"/g, "'") + '" />';
            output += '<meta property="og:url" content="' + contextData.data.website.pageUrl + '" />';
            output += '<meta property="og:type" content="' + openGraphType + '" />';

            if (rendererInstance.siteConfig.advanced.openGraphAppId !== '') {
                output += '<meta property="fb:app_id" content="' + rendererInstance.siteConfig.advanced.openGraphAppId + '" />';
            }
        }

        // If user set Twitter username - generate Twitter Cards tags
        if(twitterCardsEnabled && twitterUsername && twitterUsername !== '') {
            if(twitterUsername.indexOf('@') !== 0) {
                twitterUsername = '@' + twitterUsername;
            }

            output += '<meta name="twitter:card" content="' + twitterCardsType + '" />';
            output += '<meta name="twitter:site" content="' + twitterUsername + '" />';
            output += '<meta name="twitter:title" content="' + title.replace(/"/g, "'") + '" />';
            output += '<meta name="twitter:description" content="' + description.replace(/"/g, "'") + '" />';

            if(image) {
                output += '<meta name="twitter:image" content="' + image + '" />';
            }
        }

        return new Handlebars.SafeString(output);
    });
}

module.exports = socialMetaTagsHelper;
