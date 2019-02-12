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
    constructor(tag, rendererInstance) {
        this.tag = tag;
        this.tagID = parseInt(tag.id, 10);
        this.renderer = rendererInstance;
        this.db = this.renderer.db;
        this.themeConfig = this.renderer.themeConfig;
        this.tagData = {};

        this.prepareData();
        this.storeData();
    }

    /**
     * Prepares final tag data
     */
    prepareData() {
        let addIndexHtml = this.renderer.previewMode;
        this.tagData = {
            id: this.tag.id,
            name: this.tag.name,
            slug: this.tag.slug,
            description: this.tag.description,
            additionalData: this.tag.additional_data ? JSON.parse(this.tag.additional_data) : {},
            postsNumber: this.getPostsNumber(),
            url: URLHelper.createTagPermalink(this.renderer.siteConfig.domain, this.renderer.siteConfig.advanced.urls, this.tag.slug, addIndexHtml)
        };
    }

    /**
     * Stores tag data in the cached items of renderer
     */
    storeData() {
        // Store tag data without references
        this.renderer.cachedItems.tags[this.tagID] = JSON.parse(JSON.stringify(this.tagData));
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
}

module.exports = TagItem;
