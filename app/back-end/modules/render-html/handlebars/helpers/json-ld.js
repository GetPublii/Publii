const Handlebars = require('handlebars');
const moment = require('moment');
const sizeOf = require('image-size');
const path = require('path');
const URLHelper = require('../../helpers/url');

/**
 * Helper for creating JSON-LD data
 *
 * {{jsonLD}}
 *
 * @returns {string} <script> tag with JSON-LD data inside it
 */
function jsonLDHelper(rendererInstance, Handlebars) {
    Handlebars.registerHelper('jsonLD', function(context) {
        let output = '';
        let jsonLDObject = {};
        jsonLDObject['@context'] = 'http://schema.org';

        // Detect if the page is not a post page
        if(context.data.context.indexOf('post') === -1) {
            jsonLDObject['@type'] = 'Organization';
            jsonLDObject['name'] = context.data.website.name;

            if(context.data.website.logo) {
                jsonLDObject['logo'] = context.data.website.logo;
            }

            jsonLDObject['url'] = context.data.website.url;

            if(context.data.config.custom && context.data.config.custom.socialButtons) {
                jsonLDObject['sameAs'] = [];

                if(context.data.config.custom.socialFacebook) {
                    jsonLDObject['sameAs'].push(context.data.config.custom.socialFacebook);
                }

                if(context.data.config.custom.socialTwitter) {
                    jsonLDObject['sameAs'].push(context.data.config.custom.socialTwitter);
                }

                if(context.data.config.custom.socialGoogleplus) {
                    jsonLDObject['sameAs'].push(context.data.config.custom.socialGoogleplus);
                }

                if(context.data.config.custom.socialInstagram) {
                    jsonLDObject['sameAs'].push(context.data.config.custom.socialInstagram);
                }

                if(context.data.config.custom.socialLinkedin) {
                    jsonLDObject['sameAs'].push(context.data.config.custom.socialLinkedin);
                }

                if(context.data.config.custom.socialVimeo) {
                    jsonLDObject['sameAs'].push(context.data.config.custom.socialVimeo);
                }

                if(context.data.config.custom.socialPinterest) {
                    jsonLDObject['sameAs'].push(context.data.config.custom.socialPinterest);
                }

                if(context.data.config.custom.socialYoutube) {
                    jsonLDObject['sameAs'].push(context.data.config.custom.socialYoutube);
                }
            }
        } else { // JSON-LD for posts
            jsonLDObject['@type'] = 'Article';
            jsonLDObject['mainEntityOfPage'] = {
                "@type": "WebPage",
                "@id": context.data.root.post.url,
            };
            jsonLDObject['headline'] = context.data.root.post.title;
            jsonLDObject['datePublished'] = moment(context.data.root.post.createdAt).format('YYYY-MM-DDTHH:mm');
            jsonLDObject['dateModified'] = moment(context.data.root.post.modifiedAt).format('YYYY-MM-DDTHH:mm');

            if(
                context.data.root.post.featuredImage.url ||
                context.data.website.logo
            ) {
                let imageUrl = '';

                if(context.data.root.post.featuredImage && context.data.root.post.featuredImage.url) {
                    imageUrl = context.data.root.post.featuredImage.url;
                } else {
                    imageUrl = context.data.website.logo;
                }

                let websiteUrl = context.data.website.url;
                let imagePath = URLHelper.transformAssetURLIntoPath(rendererInstance.inputDir, imageUrl, websiteUrl);
                let imageDimensions = {
                    height: false,
                    width: false
                };

                try {
                    if (path.extname(imageUrl)) {
                        imageDimensions = sizeOf(imagePath);
                    } else {
                        imageDimensions = {
                            height: false,
                            width: false
                        };
                    }
                } catch(e) {
                    console.log('JSON-LD HBS helper: wrong image path - missing dimensions: ', imageUrl);

                    imageDimensions = {
                        height: false,
                        width: false
                    };
                }

                jsonLDObject['image'] = {
                    "@type": "ImageObject",
                    "url": imageUrl,
                    "height": imageDimensions.height,
                    "width": imageDimensions.width
                };
            }

            if (context.data.root.metaDescriptionRaw) {
                jsonLDObject['description'] = context.data.root.metaDescriptionRaw.replace(/"/g, "'");
            } else {
                jsonLDObject['description'] = context.data.root.post.excerpt;
            }

            if (context.data.root.post.author && context.data.root.post.author.name) {
                let authorUrl = context.data.website.baseUrl + context.data.config.site.urls.authorsPrefix + '/' + context.data.root.post.author.username + '/';
                
                jsonLDObject['author'] = {
                    "@type": "Person",
                    "name": context.data.root.post.author.name,
                    "url": authorUrl
                };
            }

            jsonLDObject['publisher'] = {
                "@type": "Organization",
                "name": context.data.root.siteOwner.name
            };

            if(context.data.website.logo) {
                let logoUrl = context.data.website.logo;
                let websiteUrl = context.data.website.url;
                let imagePath = URLHelper.transformAssetURLIntoPath(rendererInstance.inputDir, logoUrl, websiteUrl);
                let imageDimensions = {
                    height: false,
                    width: false
                };

                try {
                    imageDimensions = sizeOf(imagePath);
                } catch(e) {
                    console.log('JSON-LD HBS helper: wrong image path - missing dimensions');

                    imageDimensions = {
                        height: false,
                        width: false
                    };
                }

                if (logoUrl.trim() !== '') {
                    jsonLDObject['publisher']['logo'] = {
                        "@type": "ImageObject",
                        "url": logoUrl,
                        "height": imageDimensions.height,
                        "width": imageDimensions.width,
                    };
                }
            }
        }

        if (rendererInstance.plugins.hasModifiers('jsonLD')) {
            jsonLDObject = rendererInstance.plugins.runModifiers('jsonLD', rendererInstance, jsonLDObject); 
        }

        output += '<script type="application/ld+json">';
        output += JSON.stringify(jsonLDObject);
        output += '</script>';

        return new Handlebars.SafeString(output);
    });
}

module.exports = jsonLDHelper;
