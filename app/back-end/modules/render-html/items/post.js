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

        this.prepareData();
        this.storeData();
    }

    prepareData() {
        let postURL = this.siteConfig.domain + '/' + this.post.slug + '.html';
        let preparedText = ContentHelper.prepareContent(this.post.id, this.post.text, this.siteConfig.domain, this.themeConfig, this.renderer);
        let preparedExcerpt = ContentHelper.prepareExcerpt(this.themeConfig.config.excerptLength, preparedText);
        let hasCustomExcerpt = false;
        let readmoreMatches = this.post.text.match(/\<hr\s+id=["']{1}read-more["']{1}\s?\/?\>/gmi);

        if (readmoreMatches && readmoreMatches.length) {
            hasCustomExcerpt = true;

            // Detect if hide of the custom excerpt is enabled
            if (this.renderer.siteConfig.advanced.postUseTextWithoutCustomExcerpt) {
                preparedText = preparedText.split(/\<hr\s+id=["']{1}read-more["']{1}\s?\/?\>/gmi);
                preparedText = preparedText[1];
            } else {
                preparedText = preparedText.replace(/\<hr\s+id=["']{1}read-more["']{1}\s?\/?\>/gmi, '');
            }
        }

        if(this.siteConfig.advanced.urls.cleanUrls) {
            postURL = this.siteConfig.domain + '/' + this.post.slug + '/';

            if(this.renderer.previewMode || this.renderer.siteConfig.advanced.urls.addIndex) {
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
            hasGallery: preparedText.indexOf('class="gallery') !== -1,
            template: this.post.template,
            hasCustomExcerpt: hasCustomExcerpt
        };

        this.postData.featuredImage = {};

        if(this.renderer.cachedItems.featuredImages[this.postData.id]) {
            this.postData.featuredImage = this.renderer.cachedItems.featuredImages[this.postData.id];
        }

        if(this.renderer.cachedItems.postTags[this.postID]) {
            this.postData.tags = this.renderer.cachedItems.postTags[this.postID].map(tagID => this.renderer.cachedItems.tags[tagID]);
            this.postData.tags.sort((tagA, tagB) => tagA.name.localeCompare(tagB.name));
        } else {
            this.postData.tags = [];
        }
    }

    storeData() {
        this.renderer.cachedItems.posts[this.postID] = JSON.parse(JSON.stringify(this.postData));
    }

    setInternalLinks() {
        let postText = this.renderer.cachedItems.posts[this.postID].text;
        this.renderer.cachedItems.posts[this.postID].text = ContentHelper.setInternalLinks(postText, this.renderer);
    }

    setPostViewConfig(config) {
        this.renderer.cachedItems.posts[this.postID].postViewConfig = config;
    }
}

module.exports = PostItem;
