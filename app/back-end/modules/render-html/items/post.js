const path = require('path');
const ContentHelper = require('./../helpers/content');

/**
 * Post item for the renderer
 */
class PostItem {
    constructor(post, rendererInstance) {
        this.post = post;
        this.postID = parseInt(post.id, 10);
        this.renderer = rendererInstance;
        this.db = this.renderer.db;
        this.themeConfig = this.renderer.themeConfig;
        this.siteConfig = this.renderer.siteConfig;
        this.postData = {};
        this.metaData = {};
        this.metaDescription = '';

        this.getMetaData();
        this.prepareData();
        this.storeData();
    }

    getMetaData () {
        let metaDataQuery = this.db.prepare(`SELECT value FROM posts_additional_data WHERE post_id = @postID AND key = '_core'`);
        let metaData = metaDataQuery.get({ postID: this.post.id});

        if (metaData && metaData.value) {
            this.metaData = JSON.parse(metaData.value);
        }

        if (!this.metaData.editor) {
            this.metaData.editor = 'tinymce';
        }

        if (this.metaData.metaDesc) {
            this.metaDescription = this.metaData.metaDesc; 
        }

        if (this.metaDescription === '') {
            this.metaDescription = this.siteConfig.advanced.metaDescription;
        }
    }

    prepareData() {
        let postURL = this.siteConfig.domain + '/' + this.post.slug + '.html';

        if (this.siteConfig.advanced.urls.postsPrefix) {
            postURL = this.siteConfig.domain + '/' + this.siteConfig.advanced.urls.postsPrefix + '/' + this.post.slug + '.html';
        }

        let preparedText = ContentHelper.prepareContent(this.post.id, this.post.text, this.siteConfig.domain, this.themeConfig, this.renderer, this.metaData.editor);
        let preparedExcerpt = ContentHelper.prepareExcerpt(this.themeConfig.config.excerptLength, preparedText);
        let hasCustomExcerpt = false;
        let readmoreMatches = preparedText.match(/\<hr\s+id=["']{1}read-more["']{1}[\s\S]*?\/?\>/gmi);

        if (readmoreMatches && readmoreMatches.length) {
            hasCustomExcerpt = true;

            // Detect if hide of the custom excerpt is enabled
            if (this.renderer.siteConfig.advanced.postUseTextWithoutCustomExcerpt) {
                preparedText = preparedText.split(/\<hr\s+id=["']{1}read-more["']{1}[\s\S]*?\/?\>/gmi);
                preparedText = preparedText[1];
            } else {
                preparedText = preparedText.replace(/\<hr\s+id=["']{1}read-more["']{1}[\s\S]*?\/?\>/gmi, '');
            }
        }

        if (this.siteConfig.advanced.urls.cleanUrls) {
            postURL = this.siteConfig.domain + '/' + this.post.slug + '/';

            if (this.siteConfig.advanced.urls.postsPrefix) {
                postURL = this.siteConfig.domain + '/' + this.siteConfig.advanced.urls.postsPrefix + '/' + this.post.slug + '/';
            }

            if (this.renderer.previewMode || this.renderer.siteConfig.advanced.urls.addIndex) {
                postURL += 'index.html';
            }
        }

        this.postData = {
            id: this.post.id,
            title: this.post.title,
            author: this.renderer.cachedItems.authors[this.post.authors],
            slug: this.post.slug,
            url: postURL,
            text: preparedText,
            excerpt: preparedExcerpt,
            createdAt: this.post.created_at,
            modifiedAt: this.post.modified_at,
            status: this.post.status,
            isFeatured: this.post.status.indexOf('featured') > -1,
            isHidden: this.post.status.indexOf('hidden') > -1,
            isExcludedOnHomepage: this.post.status.indexOf('excluded_homepage') > -1,
            hasGallery: preparedText.indexOf('class="gallery') !== -1,
            template: this.post.template,
            hasCustomExcerpt: hasCustomExcerpt,
            editor: this.metaData.editor || 'tinymce',
            metaDescription: this.metaDescription
        };

        if (this.postData.template === '*') {
            this.postData.template = this.themeConfig.defaultTemplates.post;
        }

        this.postData.featuredImage = {};

        if (this.renderer.cachedItems.featuredImages.posts[this.postData.id]) {
            this.postData.featuredImage = this.renderer.cachedItems.featuredImages.posts[this.postData.id];
        }

        if (this.renderer.cachedItems.postTags[this.postID]) {
            this.postData.tags = this.renderer.cachedItems.postTags[this.postID].map(tagID => this.renderer.cachedItems.tags[tagID]);
            this.postData.tags = this.postData.tags.filter(tag => !tag.additionalData || tag.additionalData.isHidden !== true);
            this.postData.tags.sort((tagA, tagB) => tagA.name.localeCompare(tagB.name));
            this.postData.hiddenTags = this.renderer.cachedItems.postTags[this.postID].map(tagID => this.renderer.cachedItems.tags[tagID]);
            this.postData.hiddenTags = this.postData.hiddenTags.filter(tag => tag.additionalData && tag.additionalData.isHidden === true);
            this.postData.hiddenTags.sort((tagA, tagB) => tagA.name.localeCompare(tagB.name));

            if (!this.postData.tags.length) {
                this.postData.tags = [];
                this.postData.mainTag = false;
            } else {
                if (this.metaData.mainTag && !isNaN(parseInt(this.metaData.mainTag, 10))) {
                    let mainTagID = parseInt(this.metaData.mainTag, 10);

                    if (this.renderer.cachedItems.tags[mainTagID]) {
                        if (this.renderer.cachedItems.tags[mainTagID].additionalData.isHidden === true) {
                            this.postData.mainTag = JSON.parse(JSON.stringify(this.postData.tags[0]));
                        } else {
                            this.postData.mainTag = JSON.parse(JSON.stringify(this.renderer.cachedItems.tags[mainTagID]));
                        }
                    } else {
                        this.postData.mainTag = JSON.parse(JSON.stringify(this.postData.tags[0]));
                    }
                } else {
                    this.postData.mainTag = JSON.parse(JSON.stringify(this.postData.tags[0]));
                }
            }
        } else {
            this.postData.tags = [];
            this.postData.hiddenTags = [];
            this.postData.mainTag = false;
        }

        if (this.renderer.plugins.hasModifiers('postTitle')) {
            this.postData.title = this.renderer.plugins.runModifiers('postTitle', this.renderer, this.postData.title, { postData: this.postData }); 
        }

        if (this.renderer.plugins.hasModifiers('postText')) {
            this.postData.text = this.renderer.plugins.runModifiers('postText', this.renderer, this.postData.text, { postData: this.postData }); 
        }

        if (this.renderer.plugins.hasModifiers('postExcerpt')) {
            this.postData.excerpt = this.renderer.plugins.runModifiers('postExcerpt', this.renderer, this.postData.excerpt, { postData: this.postData }); 
        }
    }

    storeData() {
        if (this.renderer.plugins.hasModifiers('postItemData')) {
            this.postData = this.renderer.plugins.runModifiers('postItemData', this.renderer, this.postData); 
        }

        this.renderer.cachedItems.posts[this.postID] = JSON.parse(JSON.stringify(this.postData));
    }

    setInternalLinks() {
        let postText = this.renderer.cachedItems.posts[this.postID].text;
        let postExcerpt = this.renderer.cachedItems.posts[this.postID].excerpt;
        this.renderer.cachedItems.posts[this.postID].text = ContentHelper.setInternalLinks(postText, this.renderer);
        this.renderer.cachedItems.posts[this.postID].excerpt = ContentHelper.setInternalLinks(postExcerpt, this.renderer);
    }

    setPostViewConfig(config) {
        this.renderer.cachedItems.posts[this.postID].postViewConfig = config;
    }
}

module.exports = PostItem;
