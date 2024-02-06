const URLHelper = require('./../helpers/url');

/**
 * Tag item for the renderer
 */
class TagItem {
    /**
     * Constructor
     *
     * @param tagData
     * @param rendererInstance
     */
    constructor(tag, rendererInstance, mainTagIDs = []) {
        this.tag = tag;
        this.tagID = parseInt(tag.id, 10);
        this.renderer = rendererInstance;
        this.db = this.renderer.db;
        this.themeConfig = this.renderer.themeConfig;
        this.tagData = {};
        this.mainTagIDs = mainTagIDs;

        this.prepareData();
        this.storeData();
    }

    /**
     * Prepares final tag data
     */
    prepareData() {
        let addIndexHtml = this.renderer.previewMode || this.renderer.siteConfig.advanced.urls.addIndex;
        let tagAdditionalData = this.tag.additional_data ? JSON.parse(this.tag.additional_data) : {};
        let tagURL = URLHelper.createTagPermalink(this.renderer.siteConfig.domain, this.renderer.siteConfig.advanced.urls, this.tag.slug, addIndexHtml);

        if (tagAdditionalData.isHidden === true) {
            tagURL = '';
        }

        this.tagData = {
            id: this.tag.id,
            name: this.tag.name,
            slug: this.tag.slug,
            description: this.tag.description,
            additionalData: tagAdditionalData,
            featuredImage: {},
            postsNumber: this.getPostsNumber(),
            url: tagURL,
            template: tagAdditionalData.template ? tagAdditionalData.template : '' 
        };

        if (this.renderer.cachedItems.featuredImages.tags[this.tagData.id]) {
            this.tagData.featuredImage = this.renderer.cachedItems.featuredImages.tags[this.tagData.id];
        }
    }

    /**
     * Stores tag data in the cached items of renderer
     */
    storeData() {
        if (this.renderer.plugins.hasModifiers('tagItemData')) {
            this.tagData = this.renderer.plugins.runModifiers('tagItemData', this.renderer, this.tagData); 
        }

        // Store tag data without references
        this.renderer.cachedItems.tags[this.tagID] = JSON.parse(JSON.stringify(this.tagData));

        if (this.mainTagIDs.indexOf(this.tagID) > -1) {
            this.renderer.cachedItems.mainTags[this.tagID] = JSON.parse(JSON.stringify(this.tagData));
        }
    }

    /**
     * Returns number of posts connected with a given tag ID
     *
     * @returns {number}
     */
    getPostsNumber() {
        let postsNumber = this.renderer.cachedItems.tagsPostCounts[this.tagID];

        if(postsNumber) {
            return postsNumber;
        }

        return 0;
    }

    /**
     * Stores tag view configuration in cached items
     * 
     * @param {*} config 
     */
    setTagViewConfig(config) {
        this.renderer.cachedItems.tags[this.tagID].tagViewConfig = config;
    }
}

module.exports = TagItem;
