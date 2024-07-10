const path = require('path');
const normalizePath = require('normalize-path');
const AvatarHelper = require('./../../../helpers/avatar');
const URLHelper = require('./../helpers/url');
const UtilsHelper = require('./../../../helpers/utils');
const slug = require('./../../../helpers/slug');

/**
 * Author item for the renderer
 */
class AuthorItem {
    /**
     * Constructor
     *
     * @param author
     * @param rendererInstance
     */
    constructor(author, rendererInstance) {
        this.author = author;
        this.authorID = parseInt(author.id, 10);
        this.renderer = rendererInstance;
        this.db = this.renderer.db;
        this.themeConfig = this.renderer.themeConfig;
        this.authorData = {};

        this.prepareData();
        this.storeData();
    }

    /**
     * Prepares final author data
     */
    prepareData() {
        let addIndexHtml = this.renderer.previewMode || this.renderer.siteConfig.advanced.urls.addIndex ? 'index.html' : '';
        let authorConfig = this.author.config ? JSON.parse(this.author.config) : {};
        let additionalData = this.author.additional_data ? JSON.parse(this.author.additional_data) : {};

        this.authorData = {
            id: this.authorID,
            name: this.author.name,
            username: this.author.username,
            avatar: '',
            avatarImage: '',
            email: '',
            website: '',
            description: '',
            postsNumber: 0,
            url: '',
            featuredImage: {},
            config: authorConfig,
            additionalData: additionalData,
            template: authorConfig.template ? authorConfig.template : ''
        };

        if (this.renderer.cachedItems.featuredImages.authors[this.authorData.id]) {
            this.authorData.featuredImage = this.renderer.cachedItems.featuredImages.authors[this.authorData.id];
        }

        try {
            UtilsHelper.mergeObjects(this.authorData, JSON.parse(this.author.config));
        } catch(e) {
            console.log('[WARNING] renderer-context.js: wrong author JSON config data for author with ID: ' + this.authorID);
        }

        if(typeof this.authorData.avatar === 'string') {
            if (AvatarHelper.isLocalAvatar(this.authorData.avatar)) {
                let domain = this.renderer.siteConfig.domain;
                let avatarUrl = path.join(domain, 'media', 'website', this.authorData.avatar);
                avatarUrl = normalizePath(avatarUrl);
                this.authorData.avatar = URLHelper.fixProtocols(avatarUrl);

                if (this.authorData.avatar) {
                    let avatarPath = path.join(this.renderer.inputDir, 'media', 'website', path.parse(this.authorData.avatar).base);
                    this.authorData.avatarImage = AvatarHelper.getAvatarData(this.authorData, avatarPath);
                }
            } else {
                this.authorData.avatar = URLHelper.fixProtocols(this.authorData.avatar);
                this.authorData.avatarImage = AvatarHelper.getAvatarData(this.authorData);
            }
        } else {
            this.authorData.avatar = '';
            this.authorData.avatarImage = '';
        }

        this.authorData.postsNumber = this.getPostsNumber();
        this.authorData.url =   this.renderer.siteConfig.domain + '/' +
                                this.renderer.siteConfig.advanced.urls.authorsPrefix + '/' +
                                slug(this.authorData.username) + '/' +
                                addIndexHtml;

        if (this.renderer.siteConfig.advanced.urls.postsPrefix && this.renderer.siteConfig.advanced.urls.authorsPrefixAfterPostsPrefix) {
            this.authorData.url =   this.renderer.siteConfig.domain + '/' +
                                    this.renderer.siteConfig.advanced.urls.postsPrefix + '/' +
                                    this.renderer.siteConfig.advanced.urls.authorsPrefix + '/' +
                                    slug(this.authorData.username) + '/' +
                                    addIndexHtml;
        }
    }

    /**
     * Stores tag data in the cached items of renderer
     */
    storeData() {
        if (this.renderer.plugins.hasModifiers('authorItemData')) {
            this.authorData = this.renderer.plugins.runModifiers('authorItemData', this.renderer, this.authorData); 
        }

        // Store tag data without references
        this.renderer.cachedItems.authors[this.authorID] = JSON.parse(JSON.stringify(this.authorData));
    }

    /**
     * Returns number of posts connected with a given tag ID
     *
     * @returns {number}
     */
    getPostsNumber() {
        let postsNumber = this.renderer.cachedItems.authorsPostCounts[this.authorID];

        if(postsNumber) {
            return postsNumber;
        }

        return 0;
    }

    /**
     * Stores author view configuration in cached items
     * 
     * @param {*} config 
     */
    setAuthorViewConfig(config) {
        this.renderer.cachedItems.authors[this.authorID].authorViewConfig = config;
    }
}

module.exports = AuthorItem;
