// Necessary packages
const fs = require('fs');
const path = require('path');
const sizeOf = require('image-size');
const sqlString = require('sqlstring');
const normalizePath = require('normalize-path');
const slug = require('./../../../helpers/slug');
const RendererContext = require('../renderer-context.js');
const RendererHelpers = require('./../helpers/helpers.js');
const URLHelper = require('../helpers/url.js');
const ContentHelper = require('../helpers/content.js');

/**
 * Class used create context
 * for the single page theme previews
 */

class RendererContextPagePreview extends RendererContext {
    loadData() {
        // Prepare data
        this.pageID = parseInt(this.renderer.postData.postID, 10);
        this.title = this.renderer.postData.title;
        this.pageImage = this.renderer.postData.featuredImage;
        this.editor = this.renderer.postData.additionalData.editor;
        // Retrieve all tags
        this.allTags = this.getAllTags();
        // Retrieve menu data
        this.menus = this.getMenus();
    }

    prepareData() {
        let pageURL = this.siteConfig.domain + '/preview.html';
        let preparedText = this.prepareContent(this.renderer.postData.text, this.renderer.postData.id);
        let hasCustomExcerpt = false;
        let readmoreMatches = preparedText.match(/\<hr\s+id=["']{1}read-more["']{1}[\s\S]*?\/?\>/gmi);

        if (readmoreMatches && readmoreMatches.length) {
            hasCustomExcerpt = true;
        }

        this.page = {
            id: this.renderer.postData.id,
            title: this.renderer.postData.title,
            slug: this.renderer.postData.slug,
            author: this.renderer.cachedItems.authors[this.renderer.postData.author],
            url: pageURL,
            text: preparedText.replace(/\<hr\s+id=["']{1}read-more["']{1}[\s\S]*?\/?\>/gmi, ''),
            excerpt: ContentHelper.prepareExcerpt(this.themeConfig.config.excerptLength, preparedText),
            createdAt: this.renderer.postData.creationDate,
            modifiedAt: this.renderer.postData.modificationDate,
            status: this.renderer.postData.status,
            featuredImage: {},
            hasGallery: preparedText.indexOf('class="gallery') !== -1,
            isFeatured: this.renderer.postData.status.indexOf('featured') > -1,
            isHidden: this.renderer.postData.status.indexOf('hidden') > -1,
            isExcludedOnHomepage: this.renderer.postData.status.indexOf('excluded_homepage') > -1,
            hasGallery: preparedText.indexOf('class="gallery') !== -1,
            template: this.renderer.postData.template,
            hasCustomExcerpt: hasCustomExcerpt
        };

        if (this.pageImage) {
            this.page.featuredImage = this.getPageFeaturedImages(this.page.id, true);
        }

        this.metaTitle = 'It is an example value for the preview mode';
        this.metaDescription = 'It is an example value for the preview mode';
        this.metaRobots = 'It is an example value for the preview mode';
    }

    setContext() {
        this.loadData();
        this.prepareData();

        let metaRobotsValue = this.metaRobots;

        if(this.siteConfig.advanced.noIndexThisPage) {
            metaRobotsValue = 'noindex,nofollow';
        }

        this.context = {
            title: this.metaTitle !== '' ? this.metaTitle : this.title,
            page: this.page,
            tags: this.allTags,
            metaTitleRaw: this.metaTitle,
            metaDescriptionRaw: this.metaDescription,
            metaRobotsRaw: metaRobotsValue,
            siteOwner: this.renderer.cachedItems.authors[1],
            menus: this.menus.assigned
        };
    }

    getContext(pageID) {
        this.pageID = pageID;
        this.setContext();

        return this.context;
    }

    getPageFeaturedImages(pageID, mainPage = false) {
        let pageImage = false;

        // Retrieve post image
        if(mainPage === true) {
            pageImage = {
                id: 0,
                url: this.renderer.postData.featuredImageFilename,
                additional_data: JSON.stringify(this.renderer.postData.featuredImageData)
            };
        } else {
            pageImage = this.db.prepare(`
                SELECT
                    pi.id AS id,
                    pi.url AS url,
                    pi.additional_data AS additional_data
                FROM
                    posts as p
                LEFT JOIN
                    posts_images as pi
                    ON
                    p.featured_image_id = pi.id
                WHERE
                    p.id = @pageID
                ORDER BY
                    pi.id DESC
                LIMIT 1
            `).get({
                pageID: pageID
            });
        }

        if (pageImage && pageImage.url) {
            let url = '';
            let alt = '';
            let caption = '';
            let credits = '';
            let imageDimensions = false;

            if (pageImage.additional_data) {
                let data = JSON.parse(pageImage.additional_data);
                let pageDirectory = pageID;

                if(pageDirectory === 0) {
                    pageDirectory = 'temp';
                }

                let imagePath = URLHelper.createImageURL(this.inputDir, pageDirectory, pageImage.url);
                let domain = this.siteConfig.domain;

                url = URLHelper.createImageURL(domain, pageDirectory, pageImage.url);
                alt = data.alt;
                caption = data.caption;
                credits = data.credits;

                try {
                    imageDimensions = sizeOf(imagePath);
                } catch(e) {
                    console.log('page-preview.js: wrong image path - missing dimensions');
                    imageDimensions = false;
                }
            } else {
                return false;
            }

            let featuredImageSrcSet = false;
            let featuredImageSizes = false;

            if(!this.isGifOrSvg(url)) {
                let useWebp = false;

                if (this.renderer.siteConfig?.advanced?.forceWebp) {
                    useWebp = true;
                }

                featuredImageSrcSet = ContentHelper.getFeaturedImageSrcset(url, this.themeConfig, useWebp);
                featuredImageSizes = ContentHelper.getFeaturedImageSizes(this.themeConfig);
            } else {
                featuredImageSrcSet = '';
                featuredImageSizes = '';
            }

            let featuredImageData = {
                id: pageImage.id,
                url: url,
                alt: alt,
                caption: caption,
                credits: credits,
                height: imageDimensions.height,
                width: imageDimensions.width,
                srcset: featuredImageSrcSet,
                sizes: featuredImageSizes
            };

            // Create alternative names for dimensions
            let dimensions = false;

            if (
                this.themeConfig.files &&
                this.themeConfig.files.responsiveImages
            ) {
                if (
                    this.themeConfig.files.responsiveImages.featuredImages &&
                    this.themeConfig.files.responsiveImages.featuredImages.dimensions
                ) {
                    dimensions = this.themeConfig.files.responsiveImages.featuredImages.dimensions;
                } else if (
                    this.themeConfig.files.responsiveImages.contentImages &&
                    this.themeConfig.files.responsiveImages.contentImages.dimensions
                ) {
                    dimensions = this.themeConfig.files.responsiveImages.featuredImages.dimensions;
                }

                if (dimensions) {
                    let dimensionNames = Object.keys(dimensions);

                    for (let dimensionName of dimensionNames) {
                        let base = path.parse(url).base;
                        let filename = path.parse(url).name;
                        let extension = path.parse(url).ext;
                        let newFilename = filename + '-' + dimensionName + extension;
                        let capitalizedDimensionName = dimensionName.charAt(0).toUpperCase() + dimensionName.slice(1);

                        if(!this.isGifOrSvg(url)) {
                            featuredImageData['url' + capitalizedDimensionName] = url.replace(base, newFilename);
                        } else {
                            featuredImageData['url' + capitalizedDimensionName] = url;
                        }
                    }
                }
            }

            return featuredImageData;
        }

        return false;
    }

    prepareContent(originalText, pageID) {
        let self = this;
        let domain = normalizePath(self.siteConfig.domain);
        domain = URLHelper.fixProtocols(domain);

        // Get media URL
        let pageDirectory = pageID;

        if(pageDirectory === 0) {
            pageDirectory = 'temp';
        }

        let domainMediaPath = domain + '/media/posts/' + pageDirectory + '/';

        // Replace domain name constat with real URL to media directory
        let preparedText = originalText.split('#DOMAIN_NAME#').join(domainMediaPath);
        preparedText = ContentHelper.parseText(preparedText, this.editor);

        // Remove TOC plugin ID attributes when TOC does not exist
        if (preparedText.indexOf('class="post__toc') === -1) {
            preparedText = preparedText.replace(/\sid="mcetoc_[a-z0-9]*?"/gmi, ''); 
        }

        // Reduce download="download" to download
        preparedText = preparedText.replace(/download="download"/gmi, 'download');

        // Remove content for AMP or non-AMP depending from ampMode value
        preparedText = preparedText.replace(/<publii-amp>.*<\/publii-amp>/gmi, '');
        preparedText = preparedText.replace(/<publii-non-amp>/gmi, '');
        preparedText = preparedText.replace(/<\/publii-non-amp>/gmi, '');

        // Remove read more text
        preparedText = preparedText.replace(/\<hr\s+id=["']{1}read-more["']{1}[\s\S]*?\/?\>/gmi, '');

        // Remove the last empty paragraph
        preparedText = preparedText.replace(/<p>&nbsp;<\/p>\s?$/gmi, '');

        let useWebp = false;

        if (this.renderer.siteConfig?.advanced?.forceWebp) {
            useWebp = true;
        }

        // Find all images and add srcset and sizes attributes
        if (this.siteConfig.responsiveImages) {
            preparedText = preparedText.replace(/<img.*?src="(.*?)"/gmi, function(matches, url) {
                if(
                    ContentHelper.getContentImageSrcset(url, self.themeConfig, useWebp) !== false &&
                    !(
                        url.toLowerCase().indexOf('.jpg') === -1 &&
                        url.toLowerCase().indexOf('.jpeg') === -1 &&
                        url.toLowerCase().indexOf('.png') === -1 && 
                        url.toLowerCase().indexOf('.webp') === -1
                    ) &&
                    url.toLowerCase().indexOf('/gallery/') === -1
                ) {
                    if(ContentHelper.getContentImageSizes(self.themeConfig)) {
                        return matches +
                            ' sizes="' + ContentHelper.getContentImageSizes(self.themeConfig) + '"' +
                            ' srcset="' + ContentHelper.getContentImageSrcset(url, self.themeConfig, useWebp) + '" ';
                    } else {
                        return matches +
                            ' srcset="' + ContentHelper.getContentImageSrcset(url, self.themeConfig, useWebp) + '" ';
                    }
                } else {
                    return matches;
                }
            });
        }

        // Add loading="lazy" attributes to img, video, audio, iframe tags
        if (self.siteConfig.advanced.mediaLazyLoad) {
            preparedText = preparedText.replace(/<img\s/gmi, '<img loading="lazy" ');
            preparedText = preparedText.replace(/<video\s/gmi, '<video loading="lazy" ');
            preparedText = preparedText.replace(/<audio\s/gmi, '<audio loading="lazy" ');
            preparedText = preparedText.replace(/<iframe\s/gmi, '<iframe loading="lazy" ');
            preparedText = preparedText.replace(/<img\sloading="lazy"([^>].*?\sloading="[^>].*?>)/gmi, '<img$1');
            preparedText = preparedText.replace(/<video\sloading="lazy"([^>].*?\sloading="[^>].*?>)/gmi, '<video$1');
            preparedText = preparedText.replace(/<audio\sloading="lazy"([^>].*?\sloading="[^>].*?>)/gmi, '<audio$1');
            preparedText = preparedText.replace(/<iframe\sloading="lazy"([^>].*?\sloading="[^>].*?>)/gmi, '<iframe$1');
        }

        if (this.editor === 'tinymce' || this.editor === 'markdown') {
            // Wrap images with classes into <figure>
            preparedText = preparedText.replace(/(<p.*?>\s*?)?<img[^>]*?(class=".*?").*?>(\s*?<\/p>)?/gmi, function(matches, p1, classes) {
                return '<figure ' + classes + '>' + matches.replace('</p>', '').replace(/<p.*?>/, '').replace(classes, '') + '</figure>';
            });

            // Fix some specific syntax cases for double figure elements
            preparedText = preparedText.replace(/<figure contenteditable="false">[\s]*?<figure class="post__image">([\s\S]*?)<\/figure>[\s]*?<\/figure>/gmi, '<figure class="post__image">$1</figure>');
            preparedText = preparedText.replace(/<figure contenteditable="false">[\s]*?<figure class="post__image">([\s\S]*?)<\/figure>[\s]*?<figcaption contentEditable="true">([\s\S]*?)<\/figcaption>[\s]*?<\/figure>/gmi, '<figure class="post__image">$1<figcaption>$2</figcaption></figure>');
        }

        // Remove contenteditable attributes
        preparedText = preparedText.replace(/contentEditable=".*?"/gi, '');

        if (this.editor === 'tinymce') {
            // Wrap galleries with classes into div with gallery-wrapper CSS class
            preparedText = preparedText.replace(/<div class="gallery([\s\S]*?)"[\s\S]*?<\/div>?/gmi, function(matches, classes) {
                return '<div class="gallery-wrapper' + classes + '">' + matches.replace(classes, '') + '</div>';
            });
        }

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

        return preparedText;
    }

    /**
     * Detects if image is a GIF or SVG
     */
    isGifOrSvg(url) {
        if(url.slice(-4) === '.gif' || url.slice(-4) === '.svg') {
            return true;
        }

        return false;
    }
}

module.exports = RendererContextPagePreview;
