// Necessary packages
const RendererContext = require('../renderer-context.js');
const URLHelper = require('./../helpers/url.js');
const ContentHelper = require('./../helpers/content.js');
const normalizePath = require('normalize-path');

/**
 * Class used create context
 * for the feed theme view
 */

class RendererContextFeed extends RendererContext {
    loadData() {
        // prepare query variables
        this.postsNumber = parseInt(this.postsNumber, 10);
        this.offset = parseInt(this.offset, 10);
        // Retrieve post
        this.posts = this.db.exec(`
            SELECT
                *
            FROM
                posts
            WHERE
                status LIKE "%published%" AND
                status NOT LIKE "%hidden%" AND
                status NOT LIKE "%trashed%"
            ORDER BY
                created_at DESC
            LIMIT
                ${this.postsNumber}
            OFFSET
                ${this.offset}
        `);
    }

    prepareData() {
        let self = this;
        this.posts = this.posts[0] ? this.posts[0].values : [];

        this.posts = this.posts.map(post => {
            let postURL = self.siteConfig.domain + '/' + post[3] + '.html';
            let domainMediaPath = self.siteConfig.domain + '/media/posts/' + post[0] + '/';
            let preparedText = post[4].split('#DOMAIN_NAME#').join(domainMediaPath);
            let contentMode = self.siteConfig.advanced.feed.showFullText ? 'fullText' : 'excerpt';
            let text = this.cleanUpText(preparedText);
            let excerpt = ContentHelper.prepareExcerpt(this.themeConfig.config.excerptLength, preparedText);
            let authorData = this.getAuthor('post', post[0]);

            if(contentMode !== 'fullText') {
                text = false;
            }

            if(self.siteConfig.advanced.urls.cleanUrls) {
                postURL = self.siteConfig.domain + '/' + post[3] + '/';

                if(self.renderer.previewMode || self.siteConfig.advanced.urls.addIndex) {
                    postURL += 'index.html';
                }
            }

            return {
                title: post[1],
                url: postURL,
                author: authorData,
                text: text,
                excerpt: excerpt,
                createdAt: post[6],
                // Get higher date - created_at or modified_at
                modifiedAt: post[6] > post[7] ? post[6] : post[7],
                categories: this.getPostCategories(post[0]),
                thumbnail: this.getPostThumbnail(post[0])
            }
        });
    }

    cleanUpText (text) {
        text = text.replace(/\<hr\s+id=["']{1}read-more["']{1}\s?\/?\>/gmi, '');
        text = text.replace(/contenteditable="false"/gmi, '');
        text = text.replace(/contenteditable="true"/gmi, '');
        text = text.replace(/data\-[a-z\-0-9]{1,}=".*?"/gmi, '');

        return text;
    }

    setContext() {
        this.loadData();
        this.prepareData();

        let siteOwnerData = this.renderer.cachedItems.authors[1];
        let logoUrl = normalizePath(this.themeConfig.config.logo);
        let siteName = this.siteConfig.name;

        if (this.siteConfig.advanced.feed.title === 'customTitle') {
            siteName = this.siteConfig.advanced.feed.titleValue;
        } else {
            if (this.siteConfig.displayName) {
                siteName = this.siteConfig.displayName;
            }
        }

        if(logoUrl !== '') {
            logoUrl = normalizePath(this.siteConfig.domain) + '/' + normalizePath(this.themeConfig.config.logo);
            logoUrl = URLHelper.fixProtocols(logoUrl);
        }

        logoUrl = logoUrl.replace('/amp/media/website/', '/media/website/');

        this.context = {
            siteName: siteName,
            siteAuthor: siteOwnerData,
            siteDomain: this.siteConfig.domain,
            siteLogo: logoUrl,
            siteLastUpdate: this.getLastUpdateDate(),
            posts: this.posts
        };
    }

    getContext(postsNumber = 10) {
        this.offset = 0;
        this.postsNumber = postsNumber;
        this.setContext();

        return this.context;
    }

    getLastUpdateDate() {
        let latestDate = 0;

        for(let i = 0; i < this.posts.length; i++) {
            if(this.posts[i].modifiedAt > latestDate) {
                latestDate = this.posts[i].modified_at;
            }
        }

        return latestDate;
    }

    getPostCategories(postID) {
        let tags = this.db.exec(`
            SELECT
                t.name
            FROM
                tags AS t
            LEFT JOIN
                posts_tags AS pt
                ON
                pt.tag_id = t.id
            WHERE
                pt.post_id = ${postID}
            ORDER BY
                name DESC
        `);

        tags = tags[0] ? tags[0].values : [];
        tags = tags.map(tag => ({name: tag[0]}));

        return tags;
    }

    getPostThumbnail(postID) {
        if(!this.siteConfig.advanced.feed.showFeaturedImage) {
            return false;
        }

        let thumbnailUrl = '';
        let thumbnailAlt = '';
        let thumbnail = this.db.exec(`
            SELECT
                pi.url,
                pi.additional_data
            FROM
                posts_images AS pi
            WHERE
                pi.post_id = ${postID}
            LIMIT 1
        `);

        let thumbnailResults = thumbnail[0] ? thumbnail[0].values : false;

        if(thumbnailResults[0]) {
            let additionalData = { alt: '' };
            thumbnailUrl = this.siteConfig.domain + '/media/posts/' + postID + '/' + thumbnailResults[0][0];

            try {
                additionalData = JSON.parse(thumbnailResults[0][1]);
                thumbnailAlt = additionalData.alt;
            } catch (e) {
                console.log('Malformed thumnail additional data');
            }
        } else {
            return false;
        }

        return {
            url: thumbnailUrl,
            alt: thumbnailAlt
        };
    }

    /**
     *
     * Function used to retrieve an author data
     *
     * @param dataType (string) - 'post' or 'author'
     * @param id (int) - ID of post or author
     *
     * @return object - author data
     *
     */
    getAuthor(dataType, id) {
        let postSqlQuery;
        let authorID = id;

        if(dataType === 'post') {
            postSqlQuery = this.db.exec(`SELECT authors FROM posts WHERE id = ${id} LIMIT 1;`);
            authorID = postSqlQuery[0] ? postSqlQuery[0].values[0][0] : 1;
        }

        return this.renderer.cachedItems.authors[authorID];
    }
}

module.exports = RendererContextFeed;
