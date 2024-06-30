const path = require('path');
const sizeOf = require('image-size');
const URLHelper = require('./../helpers/url');
const ContentHelper = require('./../helpers/content');
const UtilsHelper = require('./../../../helpers/utils');

/**
 * Featured image item for the renderer
 */
class FeaturedImageItem {
    constructor(image, rendererInstance, type = 'featuredImages', cacheItemType = 'post') {
        this.image = image;
        this.itemID = parseInt(image.item_id, 10);
        this.renderer = rendererInstance;
        this.db = this.renderer.db;
        this.themeConfig = this.renderer.themeConfig;
        this.imageData = {};
        this.imageType = type;
        this.itemType = 'post';
        this.cacheItemType = cacheItemType;

        if (type === 'tagImages') {
            this.itemType = 'tag';
        } else if (type === 'authorImages') {
            this.itemType = 'author';
        }

        this.prepareData();
        this.storeData();
    }

    /**
     * Prepare data of image
     */
    prepareData() {
        if(isNaN(this.itemID)) {
            this.imageData = false;
            return;
        }

        let url = '';
        let alt = '';
        let caption = '';
        let credits = '';
        let imageDimensions = {
            width: 0,
            height: 0
        };

        let data = JSON.parse(this.image.additional_data);
        let imagePath = URLHelper.createImageURL(this.renderer.inputDir, this.itemID, this.image.url, this.itemType);
        let domain = this.renderer.siteConfig.domain;

        url = URLHelper.createImageURL(domain, this.itemID, this.image.url, this.itemType);
        alt = data.alt;
        caption = data.caption;
        credits = data.credits;

        try {
            if (this.image.url) {
                imageDimensions = sizeOf(imagePath);
            } else {
                this.imageData = false;
            }
        } catch(err) {
            console.log('[WARNING] renderer-context.js: wrong image path - missing dimensions for: ' + imagePath);
            this.imageData = false;
            return;
        }

        if (!this.imageData) {
            return;
        }

        let featuredImageSrcSets = '';
        let useWebp = false;

        if (this.renderer.siteConfig?.advanced?.forceWebp) {
            useWebp = true;
        }

        if(!this.isGifOrSvg(url)) {
            featuredImageSrcSets = ContentHelper.getFeaturedImageSrcset(url, this.themeConfig, useWebp, this.itemType);
        }

        let featuredImageSizes = false;

        if(featuredImageSrcSets !== false && !this.isGifOrSvg(url)) {
            featuredImageSizes = ContentHelper.getFeaturedImageSizes(this.themeConfig, this.itemType);
        }

        if(!featuredImageSrcSets) {
            featuredImageSrcSets = '';
        }

        if(!featuredImageSizes) {
            featuredImageSizes = '';
        }

        let featuredImageData = {
            id: this.image.id,
            url: url,
            alt: alt,
            caption: caption,
            credits: credits,
            height: imageDimensions.height,
            width: imageDimensions.width,
            srcset: featuredImageSrcSets,
            sizes: featuredImageSizes
        };

        // Create alternative names for dimensions
        let dimensions = false;

        if(UtilsHelper.responsiveImagesConfigExists(this.themeConfig)) {
            dimensions = UtilsHelper.responsiveImagesDimensions(this.themeConfig, this.imageType);

            if (!dimensions) {
                dimensions = UtilsHelper.responsiveImagesDimensions(this.themeConfig, 'contentImages');
            }

            if(dimensions !== false && typeof dimensions !== "boolean") {
                for(let dimensionName of dimensions) {
                    let base = path.parse(url).base;
                    let filename = path.parse(url).name;
                    let extension = path.parse(url).ext;

                    if (useWebp) {
                        extension = '.webp';
                    }

                    let newFilename = filename + '-' + dimensionName + extension;
                    let capitalizedDimensionName = dimensionName.charAt(0).toUpperCase() + dimensionName.slice(1);

                    if(!this.isGifOrSvg(url)) {
                        featuredImageData['url' + capitalizedDimensionName] = url.replace(base, 'responsive/' + newFilename);
                    } else {
                        featuredImageData['url' + capitalizedDimensionName] = url;
                    }
                }
            }
        }

        this.imageData = featuredImageData;
    }

    /**
     * Stores image data in the cached items
     */
    storeData() {
        if (this.renderer.plugins.hasModifiers('featuredImageItemData')) {
            this.imageData = this.renderer.plugins.runModifiers('featuredImageItemData', this.renderer, this.imageData, this.itemType, this.cacheItemType); 
        }

        // Store tag data without references
        this.renderer.cachedItems.featuredImages[this.cacheItemType + 's'][this.itemID] = JSON.parse(JSON.stringify(this.imageData));
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

module.exports = FeaturedImageItem;
