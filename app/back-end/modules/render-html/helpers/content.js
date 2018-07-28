/*
 * Class used to help with operations on
 * the URLs and slugs
 */

const slug = require('./../../../helpers/slug');
const path = require('path');
const normalizePath = require('normalize-path');
const URLHelper = require('./url');
const UtilsHelper = require('./../../../helpers/utils');

/**
 * Class used to prepare content in data items
 */
class ContentHelper {
    /**
     * Prepares post content
     *
     * @param postID
     * @param originalText
     * @param siteDomain
     * @param themeConfig
     * @param renderer
     * @returns {string}
     */
    static prepareContent(postID, originalText, siteDomain, themeConfig, renderer) {
        let ampMode = renderer.ampMode;
        let domain = normalizePath(siteDomain);
        domain = URLHelper.fixProtocols(domain);

        if(ampMode) {
            domain = domain.substr(0, domain.length - 4);
        }

        // Get media URL
        let domainMediaPath = domain + '/media/posts/' + postID + '/';

        // Replace domain name constant with real URL to media directory
        let preparedText = originalText.split('#DOMAIN_NAME#').join(domainMediaPath);

        // Detect if hide of the custom excerpt is enabled
        if (renderer.siteConfig.advanced.postUseTextWithoutCustomExcerpt) {
            let readmoreMatches = preparedText.match(/\<hr\s+id=["']{1}read-more["']{1}\s?\/?\>/gmi);

            if(readmoreMatches && readmoreMatches.length) {
                preparedText = preparedText.split(/\<hr\s+id=["']{1}read-more["']{1}\s?\/?\>/gmi);
                preparedText = preparedText[1];
            }
        }

        // Remove content for AMP or non-AMP depending from ampMode value
        if(ampMode) {
            preparedText = preparedText.replace(/<publii-non-amp>[\s\S]*?<\/publii-non-amp>/gmi, '');
            preparedText = preparedText.replace(/<publii-amp>/gmi, '');
            preparedText = preparedText.replace(/<\/publii-amp>/gmi, '');
        } else {
            preparedText = preparedText.replace(/<publii-amp>[\s\S]*?<\/publii-amp>/gmi, '');
            preparedText = preparedText.replace(/<publii-non-amp>/gmi, '');
            preparedText = preparedText.replace(/<\/publii-non-amp>/gmi, '');
        }

        // Remove contenteditable attributes
        preparedText = preparedText.replace(/contenteditable=".*?"/gi, '');

        // Remove read more text
        preparedText = preparedText.replace(/\<hr\s+id=["']{1}read-more["']{1}\s?\/?\>/gmi, '');

        // Remove the last empty paragraph
        preparedText = preparedText.replace(/<p>&nbsp;<\/p>\s?$/gmi, '');

        // Find all images and add srcset and sizes attributes
        preparedText = preparedText.replace(/<img.*?src="(.*?)"/gmi, function(matches, url) {
            return ContentHelper._addResponsiveAttributes(matches, url, themeConfig, domain);
        });

        // Wrap images with classes into <figure>
        preparedText = preparedText.replace(/(<p.*?>\s*?)?<img.*?(class=".*?").*?>(\s*?<\/p>)?/gmi, function(matches, p1, classes) {
            return '<figure ' + classes + '>' + matches.replace('</p>', '').replace(/<p.*?>/, '').replace(classes, '') + '</figure>';
        });

        // Remove CDATA sections inside scripts added by TinyMCE
        preparedText = preparedText.replace(/\<script\>\/\/ \<\!\[CDATA\[/g, '<script>');
        preparedText = preparedText.replace(/\/\/ \]\]\>\<\/script\>/g, '</script>');

        // Additional AMP related operations
        if(ampMode) {
            preparedText = ContentHelper._prepareAmpContent(preparedText);
        }

        return preparedText;
    }

    /**
     * Prepares post excerpt
     *
     * @param length
     * @param text
     * @returns {*}
     */
    static prepareExcerpt(length, text) {
        // Detect readmore
        let readmoreMatches = text.match(/\<hr\s+id=["']{1}read-more["']{1}\s?\/?\>/gmi);

        if(readmoreMatches && readmoreMatches.length) {
            text = text.split(/\<hr\s+id=["']{1}read-more["']{1}\s?\/?\>/gmi);
            text = text[0];
            return text;
        }

        length = parseInt(length, 10);
        text = text.replace(/\<script\>\/\/ \<\!\[CDATA\[/g, '<script>');
        text = text.replace(/\/\/ \]\]\>\<\/script\>/g, '</script>');
        text = text.replace(/<script>[\s\S]*<\/script>/gmi, ''); // Remove scripts
        text = text.replace(/\r?\n/g, ''); // Remove newline characters
        text = text.replace(/<\/p>.*?<p/gi, '</p> <p'); // Replace paragraphs spaces into real space
        text = text.replace(/<br.*?>/gi, ' '); // Replace BR tags with spaces
        text = text.replace(/<publii-non-amp>[\s\S]*?<\/publii-non-amp>/gmi, ''); // Remove conditional content
        text = text.replace(/<publii-amp>[\s\S]*?<\/publii-amp>/gmi, ''); // Remove conditional content
        text = text.replace(/<(?:.|\s)*?>/g, ''); // Remove HTML tags
        text = text.replace(/\s{2,}/g, ' '); // Shrink multiple spaces into one space
        text = text.split(' '); // Create an array of words
        let textLength = text.length;
        text = text.slice(0, parseInt(length, 10)); // Select first X elements
        text = text.join(' ');  // Merge the text with spaces and return

        // Add dots at the end if the text was longer than the limit
        if(textLength > length && text.trim().substr(-1) !== '.') {
            text += '&hellip;';
        }

        return text;
    }

    /**
     * Returns srcset for featured image
     *
     * @param baseUrl
     * @returns {*}
     */
    static getFeaturedImageSrcset(baseUrl, themeConfig) {
        if(!ContentHelper._isImage(baseUrl) || !UtilsHelper.responsiveImagesConfigExists(themeConfig)) {
            return false;
        }

        let dimensions = UtilsHelper.responsiveImagesDimensions(themeConfig, 'featuredImages');
        let dimensionsData = UtilsHelper.responsiveImagesData(themeConfig, 'featuredImages');
        let groups = UtilsHelper.responsiveImagesGroups(themeConfig, 'featuredImages');

        if(!dimensions) {
            dimensions = UtilsHelper.responsiveImagesDimensions(themeConfig, 'contentImages');
            dimensionsData = UtilsHelper.responsiveImagesData(themeConfig, 'contentImages');
            groups = false;
        }

        if(!dimensions) {
            return false;
        }

        let srcset = [];

        if(groups === false) {
            for(let dimension of dimensions) {
                let responsiveImage = ContentHelper._getSrcSet(baseUrl, dimension);
                srcset.push(responsiveImage + ' ' + dimensionsData[dimension].width + 'w');
            }

            return srcset.join(' ,');
        } else {
            srcset = {};

            for(let dimension of dimensions) {
                let groupNames = dimensionsData[dimension].group.split(',');

                for(let groupName of groupNames) {
                    if (!srcset[groupName]) {
                        srcset[groupName] = [];
                    }

                    let responsiveImage = ContentHelper._getSrcSet(baseUrl, dimension);
                    srcset[groupName].push(responsiveImage + ' ' + dimensionsData[dimension].width + 'w');
                }
            }

            let srcsetKeys = Object.keys(srcset);

            for(let key of srcsetKeys) {
                srcset[key] = srcset[key].join(' ,');
            }

            return srcset;
        }
    }

    /**
     * Returns content of the sizes attribute for featured image
     */
    static getFeaturedImageSizes(themeConfig) {
        if(!UtilsHelper.responsiveImagesConfigExists(themeConfig)) {
            return false;
        }

        if(UtilsHelper.responsiveImagesConfigExists(themeConfig, 'featuredImages')) {
            return themeConfig.files.responsiveImages.featuredImages.sizes;
        }

        if(UtilsHelper.responsiveImagesConfigExists(themeConfig, 'contentImages')) {
            return themeConfig.files.responsiveImages.contentImages.sizes;
        }

        return false;
    }

    /**
     * Returns image srcset attribute
     *
     * @param baseUrl
     * @param themeConfig
     * @returns {*}
     */
    static getContentImageSrcset(baseUrl, themeConfig) {
        if(!UtilsHelper.responsiveImagesConfigExists(themeConfig)) {
            return false;
        }

        let dimensions = UtilsHelper.responsiveImagesDimensions(themeConfig, 'contentImages');
        let dimensionsData = UtilsHelper.responsiveImagesData(themeConfig, 'contentImages');

        if(!dimensions) {
            return false;
        }

        let srcset = [];

        for(let dimension of dimensions) {
            let responsiveImage = ContentHelper._getSrcSet(baseUrl, dimension);
            srcset.push(responsiveImage + ' ' + dimensionsData[dimension].width + 'w');
        }

        return srcset.join(' ,');
    }

    /**
     * Returns image sizes attribute
     *
     * @param themeConfig
     * @returns {*}
     */
    static getContentImageSizes(themeConfig) {
        if(!UtilsHelper.responsiveImagesConfigExists(themeConfig)) {
            return false;
        }

        if(UtilsHelper.responsiveImagesConfigExists(themeConfig, 'contentImages')) {
            return themeConfig.files.responsiveImages.contentImages.sizes;
        }

        return false;
    }

    /**
     * Returns srcset attribute
     *
     * @param url
     * @param dimension
     * @returns {string}
     * @private
     */
    static _getSrcSet(url, dimension) {
        let filename = url.split('/');
        filename = filename[filename.length-1];
        let filenameFile = path.parse(filename).name;
        let filenameExtension = path.parse(filename).ext;
        let baseUrlWithoutFilename = url.replace(filename, '');
        let responsiveImage = baseUrlWithoutFilename + 'responsive/' + filenameFile + '-' + dimension + filenameExtension;
        responsiveImage = responsiveImage.replace(/\s/g, '%20');

        return responsiveImage;
    }

    /**
     * Checks if specified URL is an image
     *
     * @param url
     * @returns {boolean}
     * @private
     */
    static _isImage(url) {
        if(
            url.toLowerCase().indexOf('.jpg') === -1 &&
            url.toLowerCase().indexOf('.jpeg') === -1 &&
            url.toLowerCase().indexOf('.png') === -1
        ) {
            return false;
        }

        return true;
    }

    /**
     * Adds responsive-related image attributes
     *
     * @param matches
     * @param url
     * @param themeConfig
     * @param domain
     * @returns {*}
     * @private
     */
    static _addResponsiveAttributes(matches, url, themeConfig, domain) {
        if(
            ContentHelper.getContentImageSrcset(url, themeConfig) !== false &&
            ContentHelper._imageIsLocal(url, domain) &&
            !(
                url.toLowerCase().indexOf('.jpg') === -1 &&
                url.toLowerCase().indexOf('.jpeg') === -1 &&
                url.toLowerCase().indexOf('.png') === -1
            ) &&
            url.toLowerCase().indexOf('/gallery/') === -1
        ) {
            if(ContentHelper.getContentImageSizes(themeConfig)) {
                return matches +
                    ' sizes="' + ContentHelper.getContentImageSizes(themeConfig) + '"' +
                    ' srcset="' + ContentHelper.getContentImageSrcset(url, themeConfig) + '" ';
            } else {
                return matches +
                    ' srcset="' + ContentHelper.getContentImageSrcset(url, themeConfig) + '" ';
            }
        } else if (!ContentHelper._imageIsLocal(url, domain)) {
            return matches + ' data-is-external-image="true" ';
        } else {
            return matches;
        }
    }

    /**
     * Detect if image is an local image
     *
     * @param url - image URL
     * @param domain - site domain
     * @returns {bool}
     * @private
     */
    static _imageIsLocal (url, domain) {
        if (url.toLowerCase().indexOf('http://') > -1 || url.toLowerCase().indexOf('https://') > -1) {
            if (url.indexOf(domain) > -1 || url.toLowerCase().indexOf(domain) > -1) {
                return true;
            }
        } else {
            return true;
        }

        return false;
    }

    /**
     * Prepares content for AMP
     *
     * Replaces:
     * - remove all style="" attributes
     * - <img> with <amp-img>,
     * - <video> with <amp-video>,
     * - <audio> with <amp-audio>
     *
     * @param text
     * @returns {*}
     * @private
     */
    static _prepareAmpContent(text) {
        text = text.replace(/style=".*?"/gmi, '');

        text = text.replace(/(<img).*?(\/?>)/gmi, function(whole, start, end) {
            return whole.replace(start, '<amp-img')
                        .replace(end, ' layout="responsive"></amp-img>');
        });

        text = text.replace(/(<video).*?(<\/video>)/gmi, function(whole, start, end) {
            return whole.replace(start, '<amp-video')
                        .replace(end, '<div fallback><p>Your browser doesn\'t support HTML5 video</p></div></amp-video>');
        });

        text = text.replace(/(<audio).*?(<\/audio>)/gmi, function(whole, start, end) {
            return whole.replace(start, '<amp-audio')
                        .replace(end, '<div fallback><p>Your browser doesn\'t support HTML5 audio</p></div></amp-audio>');
        });

        text = text.replace(/(<iframe).*?(<\/iframe>)/gmi, function(whole, start, end) {
            return whole.replace(start, '<amp-iframe layout="responsive" ')
                        .replace(end, '</amp-iframe>');
        });

        return text;
    }

    /**
     * Creates internal linking for a given text
     *
     * @param text
     * @param renderer
     * @returns {string}
     */
    static setInternalLinks(text, renderer) {
        text = ContentHelper.prepareInternalLinks(text, renderer, 'post');
        text = ContentHelper.prepareInternalLinks(text, renderer, 'tag');
        text = ContentHelper.prepareInternalLinks(text, renderer, 'author');

        return text;
    }

    /**
     * Prepares internal links in the text
     *
     * @param text
     * @param renderer
     * @param type
     *
     * @returns {string} - modified text
     */
    static prepareInternalLinks(text, renderer, type) {
        // Extract URLs
        let regexp = new RegExp('#INTERNAL_LINK#\/' + type + '\/[0-9]{1,}', 'gmi');
        let urls = [...new Set(text.match(regexp))];

        // When there is no internal links of given type - return unmodified text
        if(urls.length === 0) {
            return text;
        }

        // Get proper URLs for frontpage
        if(type === 'frontpage') {
            let url = '#INTERNAL_LINK#/frontpage/1';
            let link = renderer.siteConfig.domain;
            text = text.split(url).join(link);

            return text;
        }

        // Get proper URLs for other types of content
        let ids = urls.map(url => url.replace('#INTERNAL_LINK#/' + type + '/', ''));
        let links = {};

        for(let id of ids) {
            let baseUrl = '#INTERNAL_LINK#/' + type + '/' + id;
            let pluralName = type + 's';

            if(renderer.cachedItems[pluralName][id]) {
                links[baseUrl] = renderer.cachedItems[pluralName][id].url;
            } else {
                console.log('(i) Non-existing link: ' + pluralName + ' (' + id + ')');
                console.log(JSON.stringify(renderer.cachedItems));
                links[baseUrl] = '#non-existing-' + type + '-with-id-' + id;
            }
        }

        // Sort urls by length descending - to avoid issues when shorter URLs are used to replace longer URLs
        urls.sort((urlA, urlB) => {
            return urlB.length - urlA.length;
        });

        // Replace original URLs with proper URLs
        for(let url of urls) {
            text = text.split(url).join(links[url]);
        }

        return text;
    }
}

module.exports = ContentHelper;
