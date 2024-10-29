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
        // Handle "only featured posts" mode
        let featuredPostsCondition = '';

        if (this.siteConfig.advanced.feed.showOnlyFeatured) {
            featuredPostsCondition = 'status LIKE \'%featured%\' AND';
        } else if (this.siteConfig.advanced.feed.excludeFeatured) {
            featuredPostsCondition = 'status NOT LIKE \'%featured%\' AND';
        }

        // Retrieve post
        this.posts = this.db.prepare(`
            SELECT
                *
            FROM
                posts
            WHERE
                status LIKE '%published%' AND
                ${featuredPostsCondition}
                status NOT LIKE '%hidden%' AND
                status NOT LIKE '%is-page%' AND
                status NOT LIKE '%trashed%' AND
                status NOT LIKE '%excluded_homepage%'
            ORDER BY
                created_at DESC
            LIMIT
                @postsNumber
            OFFSET
                @offset
        `).all({
            postsNumber: this.postsNumber,
            offset: this.offset
        });
    }

    prepareData() {
        let self = this;
        this.posts = this.posts || [];
        this.posts = this.posts.map(post => this.renderer.cachedItems.posts[post.id]);

        this.posts = this.posts.map(post => {
            let contentMode = self.siteConfig.advanced.feed.showFullText ? 'fullText' : 'excerpt';

            return {
                title: post.title,
                url: post.url,
                author: this.getAuthor('post', post.id),
                text: contentMode === 'fullText' ? post.text : false,
                excerpt: post.excerpt,
                createdAt: post.createdAt,
                modifiedAt: post.createdAt > post.modifiedAt ? post.createdAt : post.modifiedAt, // Get higher date - created_at or modified_at
                categories: this.getPostCategories(post.id),
                thumbnail: this.getPostThumbnail(post.id)
            }
        });
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

        this.context = {
            siteName: siteName,
            siteAuthor: siteOwnerData,
            siteDomain: this.siteConfig.domain,
            siteLogo: logoUrl,
            updatedDateType: this.siteConfig.advanced.feed.updatedDateType,
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
                latestDate = this.posts[i].modifiedAt;
            }
        }

        return latestDate;
    }

    getPostCategories(postID) {
        let tags = this.db.prepare(`
            SELECT
                t.name AS name
            FROM
                tags AS t
            LEFT JOIN
                posts_tags AS pt
                ON
                pt.tag_id = t.id
            WHERE
                pt.post_id = @postID
                AND (
        			(json_valid(t.additional_data) AND json_extract(t.additional_data, '$.isHidden') = false)
        			OR t.additional_data IS NULL
        			OR t.additional_data = ''
    			)
            ORDER BY
                name DESC
        `).all({
            postID: postID
        });

        return tags;
    }

    getPostThumbnail(postID) {
        if(!this.siteConfig.advanced.feed.showFeaturedImage) {
            return false;
        }

        let thumbnailUrl = '';
        let thumbnailAlt = '';
        let thumbnail = this.db.prepare(`
            SELECT
                pi.url AS url,
                pi.additional_data AS additionalData
            FROM
                posts_images AS pi
            WHERE
                pi.post_id = @postID
            LIMIT 1
        `).get({
            postID: postID            
        });

        if(thumbnail && thumbnail.url) {
            let additionalData = { alt: '' };
            thumbnailUrl = this.siteConfig.domain + '/media/posts/' + postID + '/' + thumbnail.url;

            try {
                additionalData = JSON.parse(thumbnail.additionalData);
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
        let authorID = id;

        if(dataType === 'post') {
            let result = this.db.prepare(`SELECT authors FROM posts WHERE id = @id LIMIT 1;`).get({ id: id });
            
            if (result && result.authors) {
                authorID = parseInt(result.authors, 10);
            } else {
                authorID = 1;
            }
        }

        return this.renderer.cachedItems.authors[authorID];
    }
}

module.exports = RendererContextFeed;
