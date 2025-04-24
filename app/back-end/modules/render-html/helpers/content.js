/*
 * Class used to help with operations on
 * the URLs and slugs
 */

const slug = require('./../../../helpers/slug');
const path = require('path');
const MarkdownToHtml = require('./../text-renderers/markdown');
const BlocksToHtml = require('./../text-renderers/blockeditor');
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
    static prepareContent(postID, originalText, siteDomain, themeConfig, renderer, editor = 'tinymce') {
        let domain = normalizePath(siteDomain);
        domain = URLHelper.fixProtocols(domain);

        // Get media URL
        let domainMediaPath = domain + '/media/posts/' + postID + '/';

        // Detect forced WebP images
        let useWebp = false;

        if (renderer.siteConfig?.advanced?.forceWebp) {
            useWebp = true;
        }

        // Replace domain name constant with real URL to media directory
        let preparedText = originalText.split('#DOMAIN_NAME#').join(domainMediaPath);
        preparedText = ContentHelper.parseText(preparedText, editor);
        preparedText = ContentHelper.setWebpCompatibility(useWebp, preparedText);

        // Remove content for AMP or non-AMP depending from ampMode value
        preparedText = preparedText.replace(/<publii-amp>[\s\S]*?<\/publii-amp>/gmi, '');
        preparedText = preparedText.replace(/<publii-non-amp>/gmi, '');
        preparedText = preparedText.replace(/<\/publii-non-amp>/gmi, '');

        // Remove TOC plugin ID attributes when TOC does not exist
        if (preparedText.indexOf('class="post__toc') === -1) {
           preparedText = preparedText.replace(/\sid="mcetoc_[a-z0-9]*?"/gmi, '');
        }

        // Reduce download="download" to download
        preparedText = preparedText.replace(/download="download"/gmi, 'download');

        // Remove the last empty paragraph
        preparedText = preparedText.replace(/<p>&nbsp;<\/p>\s?$/gmi, '');

        // Find all images and add srcset and sizes attributes
        if (renderer.siteConfig.advanced.responsiveImages) {
            preparedText = preparedText.replace(/<img[\s\S]*?src="(.*?)"[\s\S]*?>/gmi, function(matches, url) {
                if (matches.indexOf('data-responsive="false"') > -1) {
                    return matches;
                }

                return ContentHelper._addResponsiveAttributes(matches, url, themeConfig, useWebp, domain);
            });
        }

        // Add loading="lazy" attributes to img, video, audio, iframe tags
        if (renderer.siteConfig.advanced.mediaLazyLoad) {
            preparedText = preparedText.replace(/<img\s/gmi, '<img loading="lazy" ');
            preparedText = preparedText.replace(/<video\s/gmi, '<video loading="lazy" ');
            preparedText = preparedText.replace(/<audio\s/gmi, '<audio loading="lazy" ');
            preparedText = preparedText.replace(/<iframe\s/gmi, '<iframe loading="lazy" ');
            preparedText = preparedText.replace(/<img\sloading="lazy"([^>].*?\sloading="[^>].*?>)/gmi, '<img$1');
            preparedText = preparedText.replace(/<video\sloading="lazy"([^>].*?\sloading="[^>].*?>)/gmi, '<video$1');
            preparedText = preparedText.replace(/<audio\sloading="lazy"([^>].*?\sloading="[^>].*?>)/gmi, '<audio$1');
            preparedText = preparedText.replace(/<iframe\sloading="lazy"([^>].*?\sloading="[^>].*?>)/gmi, '<iframe$1');
        }

        if (editor === 'tinymce' || editor === 'markdown') {
            // Wrap images with classes into <figure>
            preparedText = preparedText.replace(/(<p.*?>\s*?)?<img[^>]*?(class=".*?").*?>(\s*?<\/p>)?/gmi, function(matches, p1, classes) {
                return '<figure ' + classes + '>' + matches.replace('</p>', '').replace(/<p.*?>/, '').replace(classes, '') + '</figure>';
            });

            // Fix some specific syntax cases for double figure elements
            preparedText = preparedText.replace(/<figure contenteditable="false">[\s]*?<figure class="post__image">([\s\S]*?)<\/figure>[\s]*?<\/figure>/gmi, '<figure class="post__image">$1</figure>');
            preparedText = preparedText.replace(/<figure contenteditable="false">[\s]*?<figure class="post__image">([\s\S]*?)<\/figure>[\s]*?<figcaption contentEditable="true">([\s\S]*?)<\/figcaption>[\s]*?<\/figure>/gmi, '<figure class="post__image">$1<figcaption>$2</figcaption></figure>');
        }

        // Remove contenteditable attributes
        preparedText = preparedText.replace(/contenteditable=".*?"/gi, '');

        if (editor === 'tinymce') {
            // Wrap galleries with classes into div with gallery-wrapper CSS class
            preparedText = preparedText.replace(/<div class="gallery([\s\S]*?)"[\s\S]*?<\/div>?/gmi, function(matches, classes) {
                return '<div class="gallery-wrapper' + classes + '">' + matches.replace(classes, '') + '</div>';
            });
        }

        // Remove double slashes from the gallery URLs (if they appears)
        preparedText = preparedText.replace(/\/\/gallery\/$/gmi, '/gallery/');

        // Remove paragraphs around <iframe>'s
        preparedText = preparedText.replace(/\<p\>\<iframe/gmi, '<iframe');
        preparedText = preparedText.replace(/\<\/iframe\>\<\/p\>/gmi, '</iframe>');

        // Wrap iframes into <div class="post__iframe">
        preparedText = preparedText.replace(/(?<!<figure[\s\S]*?class="post__video">[\s\S]*?)(<iframe.*?>[\s\S]*?<\/iframe>)/gmi, function(matches) {
            if (matches.indexOf('data-responsive="false"') > -1) {
                return matches;
            }

            return '<div class="post__iframe">' + matches + '</div>';
        });

        // Remove CDATA sections inside scripts added by TinyMCE
        preparedText = preparedText.replace(/\<script\>\/\/ \<\!\[CDATA\[/g, '<script>');
        preparedText = preparedText.replace(/\/\/ \]\]\>\<\/script\>/g, '</script>');

        // Add embed consents
        if (
            themeConfig.supportedFeatures &&
            themeConfig.supportedFeatures.embedConsents &&
            renderer.siteConfig.advanced.gdpr.enabled &&
            renderer.siteConfig.advanced.gdpr.allowAdvancedConfiguration &&
            renderer.siteConfig.advanced.gdpr.embedConsents &&
            renderer.siteConfig.advanced.gdpr.embedConsents.length
        ) {
            preparedText = ContentHelper.addEmbedConsents(preparedText, renderer.siteConfig.advanced.gdpr.embedConsents);
        }

        // Add dnt=1 for Vimeo links
        if (renderer.siteConfig.advanced.gdpr.vimeoNoTrack) {
            preparedText = preparedText.replace(/src="(http[s]?\:\/\/player\.vimeo\.com\/video\/.*?)"/gmi, function (url, matches) {
                if (matches.indexOf('dnt=') > -1) {
                    return 'src="' + matches + '"';
                }
            
                if (matches.indexOf('?') > -1) {
                    return 'src="' + matches + '&dnt=1"';
                }
            
                return 'src="' + matches + '?dnt=1"';
            });

            preparedText = preparedText.replace(/src='(http[s]?\:\/\/player\.vimeo\.com\/video\/.*?)'/gmi, function (url, matches) {
                if (matches.indexOf('dnt=') > -1) {
                    return 'src=\'' + matches + '\'';
                }
            
                if (matches.indexOf('?') > -1) {
                    return 'src=\'' + matches + '&dnt=1\'';
                }
            
                return 'src=\'' + matches + '?dnt=1\'';
            });
        }
        
        // Add youtube-nocookie.com domain for YouTube videos
        if (renderer.siteConfig.advanced.gdpr.ytNoCookies) {
            preparedText = preparedText.replace(/src="http[s]?\:\/\/www\.youtube\.com\/embed\//gmi, 'src="https://www.youtube-nocookie.com/embed/');
            preparedText = preparedText.replace(/src='http[s]?\:\/\/www\.youtube\.com\/embed\//gmi, 'src=\'https://www.youtube-nocookie.com/embed/');
        }

        return preparedText;
    }

    /**
     * Parse text using a editor-specific parser
     *
     * @param {*} inputText
     * @param {*} editor
     */
    static parseText (inputText, editor = 'tinymce') {
        if (editor === 'tinymce') {
            return inputText;
        }

        if (editor === 'markdown') {
            inputText = ContentHelper.prepareMarkdown(inputText);
            return MarkdownToHtml.parse(inputText);
        }

        if (editor === 'blockeditor') {
            return BlocksToHtml.parse(inputText);
        }
    }

    /**
     * Prepares markdown code to display
     * @param input
     */
    static prepareMarkdown (input) {
        input = input.replace(/\-\-\-READMORE\-\-\-/gmi, '<hr id="read-more">');
        return input;
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
        let readmoreMatches = text.match(/\<hr\s+id=["']{1}read-more["']{1}[\s\S]*?\/?\>/gmi);

        if(readmoreMatches && readmoreMatches.length) {
            text = text.split(/\<hr\s+id=["']{1}read-more["']{1}[\s\S]*?\/?\>/gmi);
            text = text[0];
            return text;
        }

        length = parseInt(length, 10);
        text = text.replace(/\<script\>\/\/ \<\!\[CDATA\[/g, '<script>');
        text = text.replace(/\/\/ \]\]\>\<\/script\>/g, '</script>');
        text = text.replace(/\<div class="post__toc"\>[\s\S]*?\<\/div\>/gmi, ''); // Remove ToC
        text = text.replace(/<script>[\s\S]*?<\/script>/gmi, ''); // Remove scripts
        text = text.replace(/\r?\n/g, ' '); // Replace newline characters with spaces
        text = text.replace(/<\/p>.*?<p/gi, '</p> <p'); // Replace paragraphs spaces into real space
        text = text.replace(/<br.*?>/gi, ' '); // Replace BR tags with spaces
        text = text.replace(/<publii-non-amp>[\s\S]*?<\/publii-non-amp>/gmi, ''); // Remove conditional content
        text = text.replace(/<publii-amp>[\s\S]*?<\/publii-amp>/gmi, ''); // Remove conditional content
        text = text.replace(/<(?:.|\s)*?>/g, ''); // Remove HTML tags
        text = text.replace(/\s{2,}/g, ' '); // Shrink multiple spaces into one space
        text = text.split(' '); // Create an array of words
        text = text.filter(word => !!word);
        let textLength = text.length;
        text = text.slice(0, parseInt(length, 10)); // Select first X elements
        text = text.join(' ');  // Merge the text with spaces and return

        // Add dots at the end if the text was longer than the limit
        if(textLength > length && text.trim().substr(-1) !== '.') {
            text += '&hellip;';
        }

        if (text.trim() === '&hellip;') {
            return '';
        }

        return text;
    }

    /**
     * Returns srcset for featured image
     */
    static getFeaturedImageSrcset(baseUrl, themeConfig, useWebp, type = 'post') {
        if(!ContentHelper._isImage(baseUrl) || !UtilsHelper.responsiveImagesConfigExists(themeConfig)) {
            return false;
        }

        let dimensions = UtilsHelper.responsiveImagesDimensions(themeConfig, 'featuredImages');
        let dimensionsData = UtilsHelper.responsiveImagesData(themeConfig, 'featuredImages');
        let groups = UtilsHelper.responsiveImagesGroups(themeConfig, 'featuredImages');

        if (type === 'tag') {
            dimensions = UtilsHelper.responsiveImagesDimensions(themeConfig, 'tagImages');
            dimensionsData = UtilsHelper.responsiveImagesData(themeConfig, 'tagImages');
            groups = UtilsHelper.responsiveImagesGroups(themeConfig, 'tagImages');
        } else if (type === 'author') {
            dimensions = UtilsHelper.responsiveImagesDimensions(themeConfig, 'authorImages');
            dimensionsData = UtilsHelper.responsiveImagesData(themeConfig, 'authorImages');
            groups = UtilsHelper.responsiveImagesGroups(themeConfig, 'authorImages');
        }

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
                let responsiveImage = ContentHelper._getSrcSet(baseUrl, dimension, useWebp);
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

                    let responsiveImage = ContentHelper._getSrcSet(baseUrl, dimension, useWebp);
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
    static getFeaturedImageSizes(themeConfig, type = 'post') {
        if(!UtilsHelper.responsiveImagesConfigExists(themeConfig)) {
            return false;
        }

        if (type === 'tag' && UtilsHelper.responsiveImagesConfigExists(themeConfig, 'tagImages')) {
            return themeConfig.files.responsiveImages.tagImages.sizes;
        } else if (type === 'author' && UtilsHelper.responsiveImagesConfigExists(themeConfig, 'authorImages')) {
            return themeConfig.files.responsiveImages.authorImages.sizes;
        } else if (type === 'post' && UtilsHelper.responsiveImagesConfigExists(themeConfig, 'featuredImages')) {
            return themeConfig.files.responsiveImages.featuredImages.sizes;
        } else if (UtilsHelper.responsiveImagesConfigExists(themeConfig, 'contentImages')) {
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
    static getContentImageSrcset(baseUrl, themeConfig, useWebp) {
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
            let responsiveImage = ContentHelper._getSrcSet(baseUrl, dimension, useWebp);
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
    static _getSrcSet(url, dimension, useWebp) {
        let filename = url.split('/');
        filename = filename[filename.length-1];
        let filenameFile = path.parse(filename).name;
        let filenameExtension = path.parse(filename).ext;

        if (useWebp && ['.jpg', '.jpeg', '.png'].indexOf(filenameExtension.toLowerCase()) > -1) {
            filenameExtension = '.webp';
        }

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
        if (
            url.toLowerCase().indexOf('.jpg') === -1 &&
            url.toLowerCase().indexOf('.jpeg') === -1 &&
            url.toLowerCase().indexOf('.png') === -1 &&
            url.toLowerCase().indexOf('.webp') === -1
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
    static _addResponsiveAttributes(matches, url, themeConfig, useWebp, domain) {
        matches = matches.replace('/>', '');
        matches = matches.replace('>', '');

        if (
            url.indexOf('media/posts') === -1 &&
            url.indexOf('media\posts') === -1 &&
            url.indexOf('media/website') === -1 &&
            url.indexOf('media\website') === -1
        ) {
            return matches + ' data-is-external-image="true">';
        }

        if(
            ContentHelper.getContentImageSrcset(url, themeConfig, useWebp) !== false &&
            ContentHelper._imageIsLocal(url, domain) &&
            !(
                url.toLowerCase().indexOf('.jpg') === -1 &&
                url.toLowerCase().indexOf('.jpeg') === -1 &&
                url.toLowerCase().indexOf('.png') === -1 &&
                url.toLowerCase().indexOf('.webp') === -1
            ) &&
            url.toLowerCase().indexOf('/gallery/') === -1
        ) {
            if(ContentHelper.getContentImageSizes(themeConfig)) {
                return matches +
                    ' sizes="' + ContentHelper.getContentImageSizes(themeConfig) + '"' +
                    ' srcset="' + ContentHelper.getContentImageSrcset(url, themeConfig, useWebp) + '">';
            } else {
                return matches +
                    ' srcset="' + ContentHelper.getContentImageSrcset(url, themeConfig, useWebp) + '">';
            }
        } else if (!ContentHelper._imageIsLocal(url, domain)) {
            return matches + ' data-is-external-image="true">';
        } else {
            return matches + '>';
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
            if (domain.indexOf('/') === 0 || domain === '') {
                return false;
            }

            if (url.indexOf(domain) > -1 || url.toLowerCase().indexOf(domain) > -1) {
                return true;
            }
        } else {
            return true;
        }

        return false;
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
        text = ContentHelper.prepareInternalLinks(text, renderer, 'page');
        text = ContentHelper.prepareInternalLinks(text, renderer, 'tag');
        text = ContentHelper.prepareInternalLinks(text, renderer, 'tags');
        text = ContentHelper.prepareInternalLinks(text, renderer, 'author');
        text = ContentHelper.prepareInternalLinks(text, renderer, 'frontpage');
        text = ContentHelper.prepareInternalLinks(text, renderer, 'blogpage');
        text = ContentHelper.prepareInternalLinks(text, renderer, 'file');

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

        if (type === 'file' || type === 'author') {
            regexp = new RegExp('#INTERNAL_LINK#\/' + type + '\/.*?[\"\']{1,1}', 'gmi');
        }

        let urls = [...new Set(text.match(regexp))];

        // We need to remove trailing '"' char from the files matches
        if (type === 'file' || type === 'author') {
            urls = urls.map(file => file.replace(/"$/, ''));
        }

        // When there is no internal links of given type - return unmodified text
        if (urls.length === 0) {
            return text;
        }

        // Get proper URLs for frontpage
        if (type === 'frontpage') {
            let url = '#INTERNAL_LINK#/frontpage/1';
            let link = renderer.siteConfig.domain;

            if (renderer.previewMode || renderer.siteConfig.advanced.urls.addIndex) {
                link = link + '/index.html';
            }

            text = text.split(url).join(link);

            return text;
        }

        // Get proper URLs for blog page
        if (type === 'blogpage') {
            let url = '#INTERNAL_LINK#/blogpage/1';
            let link = renderer.siteConfig.domain;

            if (renderer.siteConfig.advanced.usePageAsFrontpage && renderer.siteConfig.advanced.urls.postsPrefix) {
                link = renderer.siteConfig.domain + '/' + renderer.siteConfig.advanced.urls.postsPrefix + '/';
            }

            if (renderer.previewMode || renderer.siteConfig.advanced.urls.addIndex) {
                link = link + 'index.html';
            }

            text = text.split(url).join(link);

            return text;
        }

        // Get proper URLs for frontpage
        if (type === 'tags') {
            let url = '#INTERNAL_LINK#/tags/1';
            let link = renderer.siteConfig.domain + '/' + renderer.siteConfig.advanced.urls.tagsPrefix + '/';

            if (renderer.siteConfig.advanced.urls.postsPrefix && renderer.siteConfig.advanced.urls.tagsPrefixAfterPostsPrefix) {
                link = renderer.siteConfig.domain + '/' + renderer.siteConfig.advanced.urls.postsPrefix + '/' + renderer.siteConfig.advanced.urls.tagsPrefix + '/';
            }

            if (renderer.previewMode || renderer.siteConfig.advanced.urls.addIndex) {
                link = link + 'index.html';
            }

            text = text.split(url).join(link);

            return text;
        }

        // Get proper URLs for the files
        if (type === 'file') {
            for (let url of urls) {
                let link = url.replace('#INTERNAL_LINK#/file/', renderer.siteConfig.domain + '/');
                text = text.split(url).join(link);
            }

            return text;
        }

        // Get proper URLs for authors
        if (type === 'author') {
            for (let url of urls) {
                let authorSlug = url.replace('#INTERNAL_LINK#/author/', '');
                let authorIDs = Object.keys(renderer.cachedItems.authors);

                for (let authorID of authorIDs) {
                    if (renderer.cachedItems.authors[authorID].username === authorSlug) {
                        let link = renderer.cachedItems.authors[authorID].url;
                        text = text.split(url).join(link);
                    }
                }
            }

            return text;
        }

        // Get proper URLs for other types of content
        let ids = urls.map(url => url.replace('#INTERNAL_LINK#/' + type + '/', ''));
        let links = {};

        for (let id of ids) {
            let baseUrl = '#INTERNAL_LINK#/' + type + '/' + id;
            let pluralName = type + 's';

            if (renderer.cachedItems[pluralName][id]) {
                links[baseUrl] = renderer.cachedItems[pluralName][id].url;
            } else {
                console.log('(i) Non-existing link: ' + pluralName + ' (' + id + ')');
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

    /**
     * Add overlays for the embed items 
     * 
     * @param {string} text 
     * @param {Array} embedConsents 
     * 
     * @returns {string} - modified text
     */
    static addEmbedConsents (text, embedConsents) {
        for (let i = 0; i < embedConsents.length; i++) {
            let embedConsent = embedConsents[i];
            text = text.replace(/\<iframe[^\>]*?src="([^"]*?)"[^\>]*?\>\<\/iframe\>/gmi, function (iframe, url) {
                if (url.indexOf(embedConsent.rule) === -1) {
                    return iframe;
                }

                if (embedConsent.cookieGroup === '-' || embedConsent.cookieGroup === '') {
                    return iframe;
                }

                if (iframe.indexOf('data-consent-overlay-added="true"') > -1) {
                    return iframe;
                }

                iframe = iframe.replace('src="', 'data-consent-src="');
                iframe = iframe.replace('<iframe ', '<iframe data-consent-overlay-added="true" ');
                iframe = `
                <div 
                    class="pec-wrapper" 
                    data-consent-group-id="${embedConsent.cookieGroup}">
                    ${iframe}
                    <div class="pec-overlay is-active" aria-hidden="false">
                        <div class="pec-overlay-inner">
                            <p>${embedConsent.text}</p>
                            <button 
                                class="pec-button" 
                                onclick="window.publiiEmbedConsentGiven('${embedConsent.cookieGroup}'); return false;">
                                ${embedConsent.buttonLabel}
                            </button>
                        </div>
                    </div>
                    <script>window.publiiEmbedConsentCheck('${embedConsent.cookieGroup}');</script>
                </div>
                `;

                return iframe;
            });   
        }

        return text;
    }

    /**
     * Replaces non-WebP images to WebP or WebP images to non-WebP images in gallery thumbnails if necessary
     * @param {boolean} forceWebp - state of force WebP option
     * @param {string} text - text to modify
     * @returns {string} - modified text
     */
    static setWebpCompatibility (forceWebp, text) {
        text = text.replace(/\<figure class="gallery__item">[\s\S]*?<a[\s\S]*?href="(.*?)"[\s\S]+?>[\s\S]*?<img[\s\S]*?src="(.*?)"/gmi, (matches, linkUrl, imgUrl) => {
            if (linkUrl && imgUrl) {
                if (
                    forceWebp && 
                    ContentHelper.getImageType(linkUrl) === 'webp-compatible' && 
                    !ContentHelper.isWebpImage(imgUrl)
                ) {
                    let imgExtension = ContentHelper.getImageExtension(imgUrl);
                    let newImgUrl = imgUrl.substr(0, imgUrl.length + (-1 * imgExtension.length)) + '.webp';
                    matches = matches.replace(imgUrl, newImgUrl);
                } else if (
                    !forceWebp && 
                    ContentHelper.getImageType(linkUrl) === 'webp-compatible' && 
                    ContentHelper.isWebpImage(imgUrl)
                ) {
                    let imgExtension = ContentHelper.getImageExtension(linkUrl);
                    let newImgUrl = imgUrl.substr(0, imgUrl.length - 5) + imgExtension;
                    matches = matches.replace(imgUrl, newImgUrl);
                }
            }

            return matches;
        });

        return text;
    }

    /**
     * Checks if given URL is a WebP image
     * @param {string} url 
     * @returns {boolean}
     */
    static isWebpImage (url) {
        if (url.substr(-5).toLowerCase() === '.webp') {
            return true;
        }

        return false;
    }

    /**
     * Checks the given URL image type
     * @param {string} url 
     * @returns {string} - webp, webp-compatible or other
     */
    static getImageType (url) {
        if (url.substr(-5).toLowerCase() === '.webp') {
            return 'webp';
        }

        if (
            url.substr(-5).toLowerCase() === '.jpeg' ||
            url.substr(-4).toLowerCase() === '.jpg' ||
            url.substr(-4).toLowerCase() === '.png'
        ) {
            return 'webp-compatible';
        }

        return 'other';
    }

    /**
     * Returns image extension - only for webp, jpg, jpeg, png
     * @param {string} url 
     * @returns {string|boolean} - extension or false if non-compatible image extension
     */
    static getImageExtension (url) {
        if (url.substr(-5).toLowerCase() === '.webp' || url.substr(-5).toLowerCase() === '.jpeg') {
            return url.substr(-5);
        } 

        if (url.substr(-4).toLowerCase() === '.jpg' || url.substr(-4).toLowerCase() === '.png') {
            return url.substr(-4);
        } 

        return false;
    }
}

module.exports = ContentHelper;
