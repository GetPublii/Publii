const path = require('path');
const ContentHelper = require('./../helpers/content');

/**
 * Post item for the renderer
 */
class PostItem {
    constructor(post, rendererInstance) {
        this.post = post;
        this.postID = parseInt(post[0], 10);
        this.renderer = rendererInstance;
        this.db = this.renderer.db;
        this.themeConfig = this.renderer.themeConfig;
        this.siteConfig = this.renderer.siteConfig;
        this.postData = {};

        this.prepareData();
        this.storeData();
    }

    prepareData() {
        let postURL = this.siteConfig.domain + '/' + this.post[3] + '.html';
        let preparedText = ContentHelper.prepareContent(this.post[0], this.post[4], this.siteConfig.domain, this.themeConfig, this.renderer);
        let hasCustomExcerpt = false;
        let readmoreMatches = this.post[4].match(/\<hr\s+id=["']{1}read-more["']{1}\s?\/?\>/gmi);

        if (readmoreMatches && readmoreMatches.length) {
            hasCustomExcerpt = true;
        }

        if(this.siteConfig.advanced.urls.cleanUrls) {
            postURL = this.siteConfig.domain + '/' + this.post[3] + '/';

            if(this.renderer.previewMode || this.renderer.siteConfig.advanced.urls.addIndex) {
                postURL += 'index.html';
            }
        }

        this.postData = {
            id: this.post[0],
            title: this.post[1],
            author: this.renderer.cachedItems.authors[this.post[2]],
            slug: this.post[3],
            url: postURL,
            text: preparedText.replace(/\<hr\s+id=["']{1}read-more["']{1}\s?\/?\>/gmi, ''),
            excerpt: ContentHelper.prepareExcerpt(this.themeConfig.config.excerptLength, preparedText),
            createdAt: this.post[6],
            modifiedAt: this.post[7],
            status: this.post[8],
            isFeatured: this.post[8].indexOf('featured') > -1,
            isHidden: this.post[8].indexOf('hidden') > -1,
            hasGallery: preparedText.indexOf('class="gallery') !== -1,
            template: this.post[9],
            hasCustomExcerpt: hasCustomExcerpt
        };

        this.postData.featuredImage = {};

        if(this.renderer.cachedItems.featuredImages[this.postData.id]) {
            this.postData.featuredImage = this.renderer.cachedItems.featuredImages[this.postData.id];
        }

        if(this.renderer.cachedItems.postTags[this.postID]) {
            this.postData.tags = this.renderer.cachedItems.postTags[this.postID].map(tagID => this.renderer.cachedItems.tags[tagID]);
            this.postData.tags.sort((tagA, tagB) => {
                if(tagA.name.toLowerCase() < tagB.name.toLowerCase()) {
                    return -1;
                }

                if(tagA.name.toLowerCase() > tagB.name.toLowerCase()) {
                    return 1;
                }

                return 0;
            });
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
