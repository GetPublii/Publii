// Necessary packages
const RendererContext = require('../renderer-context.js');
const sqlString = require('sqlstring');

/**
 * Class used create context
 * for the single post theme views
 */

class RendererContextPost extends RendererContext {
    loadData() {
        // Retrieve meta data
        let metaDataQuery = this.db.prepare(`SELECT value FROM posts_additional_data WHERE post_id = ? AND key = "_core"`);
        this.metaData = metaDataQuery.get([this.postID]);
        metaDataQuery.free();

        this.allTags = this.renderer.commonData.tags;
        this.menus = this.renderer.commonData.menus;
        this.unassignedMenus = this.renderer.commonData.unassignedMenus;
        this.authors = this.renderer.commonData.authors;
        this.featuredPosts = this.renderer.commonData.featuredPosts.homepage;
        this.hiddenPosts = this.renderer.commonData.hiddenPosts;
    }

    prepareData() {
        this.post = this.renderer.cachedItems.posts[this.postID];
        this.featuredPosts = this.featuredPosts[0] ? this.featuredPosts[0].values : [];
        this.featuredPosts = this.featuredPosts.map(post => this.renderer.cachedItems.posts[post[0]]);
        this.hiddenPosts = this.hiddenPosts[0] ? this.hiddenPosts[0].values : [];
        this.hiddenPosts = this.hiddenPosts.map(post => this.renderer.cachedItems.posts[post[0]]);
        this.metaTitle = this.siteConfig.advanced.postMetaTitle;
        this.metaDescription = this.siteConfig.advanced.postMetaDescription;
        this.canonicalUrl = this.post.url;
        this.metaRobots = '';

        if(this.metaData && this.metaData[0]) {
            let results = JSON.parse(this.metaData[0]);

            if (results.metaTitle) {
                this.metaTitle = results.metaTitle;
            }

            if (results.metaDesc) {
                this.metaDescription = results.metaDesc;
            }

            if(results.metaRobots) {
                this.metaRobots = results.metaRobots;
            }

            if(results.canonicalUrl) {
                this.canonicalUrl = results.canonicalUrl;
            }
        }

        // load related posts
        this.loadRelatedPosts();

        // load previous and next posts (only on the visible posts)
        if((this.themeConfig.renderer && !this.themeConfig.renderer.renderPrevNextPosts) || this.post.status.indexOf('hidden') > -1) {
            this.nextPost = false;
            this.previousPost = false;
        } else {
            this.loadPost('next', false);
            this.loadPost('previous', false);
        }

        // load previous and next similar posts (only on the visible posts)
        if((this.themeConfig.renderer && !this.themeConfig.renderer.renderSimilarPosts) || this.post.status.indexOf('hidden') > -1) {
            this.nextSimilarPost = false;
            this.previousSimilarPost = false;
        } else {
            this.loadPost('next', true);
            this.loadPost('previous', true);
        }
    }

    loadPost(type, similarPost = false) {
        let postType = similarPost ? type + 'SimilarPost' : type + 'Post';
        let operator = type === 'previous' ? '<=' : '>=';
        let postData = false;
        let temporaryPostsOrdering = this.postsOrdering;

        // Reverse operator when post ordering is reversed
        if(temporaryPostsOrdering.indexOf('ASC') > -1) {
            if(operator === '>=') {
                operator = '<=';
            } else {
                operator = '>=';
            }
        }

        // For the next posts we have to reverse the results
        if(type === 'next') {
            if(temporaryPostsOrdering.indexOf('ASC') > -1) {
                temporaryPostsOrdering = temporaryPostsOrdering.replace('ASC', 'DESC');
            } else {
                temporaryPostsOrdering = temporaryPostsOrdering.replace('DESC', 'ASC');
            }
        }

        this.post.createdAt = parseInt(this.post.createdAt, 10);
        this.post.id = parseInt(this.post.id, 10);

        let tagsCondition = '';

        if(similarPost) {
            let tags = this.post.tags ? this.post.tags.map(tag => parseInt(tag.id, 10)) : [];

            if(tags.length) {
                tagsCondition = ' AND pt.tag_id IN(' + tags.join(',') + ') ';
            }

            // Retrieve post
            postData = this.db.exec(`
                SELECT
                    p.id AS id
                FROM
                    posts AS p
                LEFT JOIN
                    posts_tags AS pt
                    ON
                    p.id = pt.post_id
                WHERE
                    p.created_at ${operator} ${this.post.createdAt} AND
                    p.id != ${this.post.id} AND
                    p.status LIKE "%published%" AND
                    p.status NOT LIKE "%trashed%" AND
                    p.status NOT LIKE "%hidden%"
                    ${tagsCondition}
                GROUP BY
                    p.id
                ORDER BY
                    ${temporaryPostsOrdering}
                LIMIT 1
            `);
        } else {
            // Retrieve post
            postData = this.db.exec(`
                SELECT
                    id
                FROM
                    posts
                WHERE
                    created_at ${operator} ${this.post.createdAt} AND
                    id != ${this.post.id} AND
                    status LIKE "%published%" AND
                    status NOT LIKE "%trashed%" AND
                    status NOT LIKE "%hidden%"
                ORDER BY
                    ${temporaryPostsOrdering}
                LIMIT 1
            `);
        }

        postData = postData[0] ? postData[0].values[0] : false;

        if(!postData) {
            return false;
        }

        this[postType] = this.renderer.cachedItems.posts[postData[0]];
    }

    loadRelatedPosts() {
        if(this.themeConfig.renderer && (!this.themeConfig.renderer.renderRelatedPosts || this.themeConfig.renderer.relatedPostsNumber === 0)) {
            this.relatedPosts = [];
            return;
        }

        this.post.id = parseInt(this.post.id, 10);
        let tags = this.post.tags ? this.post.tags.map(tag => parseInt(tag.id, 10)) : [];
        let relatedPostsNumber = 5;
        let tagsCondition = '';
        let postTitleConditions = [];
        let conditions = [];

        if(this.themeConfig.renderer && this.themeConfig.renderer.relatedPostsNumber) {
            relatedPostsNumber = this.themeConfig.renderer.relatedPostsNumber;
        }

        // Get tags
        if(tags.length) {
            tagsCondition = ' pt.tag_id IN(' + tags.join(',') + ') ';
            conditions.push(tagsCondition);
        }

        // Get words to compare (with length bigger than 3 chars)
        let stringsToCompare = this.post.title.split(' ');
        stringsToCompare = stringsToCompare.filter(word => word.length > 3);

        if(stringsToCompare.length) {
            for (let toCompare of stringsToCompare) {
                postTitleConditions.push(' LOWER(p.title) LIKE LOWER("%' + sqlString.escape(toCompare).replace(/'/g, '').replace(/"/g, '') + '%") ')
            }

            postTitleConditions = '(' + postTitleConditions.join('OR') + ')';
            conditions.push(postTitleConditions);
        }

        if(conditions.length > 1) {
            conditions = conditions.join(' OR ');
            conditions = ' ( ' + conditions + ' ) ';
        }

        if(conditions.length) {
            conditions = ' AND ' + conditions;
        }

        // Retrieve post
        let postsData = this.db.exec(`
            SELECT
                p.id AS id
            FROM
                posts AS p
            LEFT JOIN
                posts_tags AS pt
                ON
                p.id = pt.post_id
            WHERE
                p.id != ${this.post.id} AND
                p.status LIKE "%published%" AND
                p.status NOT LIKE "%trashed%" AND
                p.status NOT LIKE "%hidden%"
                ${conditions}
            GROUP BY
                p.id
            LIMIT ${relatedPostsNumber}
        `);

        postsData = postsData[0] ? postsData[0].values : false;

        this.relatedPosts = [];

        if(!postsData) {
            return false;
        }

        for(let i = 0; i < postsData.length; i++) {
            this.relatedPosts[i] = this.renderer.cachedItems.posts[postsData[i][0]];
        }
    }

    setContext() {
        this.loadData();
        this.prepareData();

        let metaRobotsValue = this.metaRobots;

        if(this.siteConfig.advanced.noIndexThisPage) {
            metaRobotsValue = 'noindex,nofollow';
        }

        let siteName = this.siteConfig.name;

        if(this.siteConfig.displayName) {
            siteName = this.siteConfig.displayName;
        }

        // Detect if the post title is empty
        if(this.metaTitle === '') {
            this.metaTitle = this.siteConfig.advanced.postMetaTitle.replace(/%posttitle/g, this.post.title)
                                                                   .replace(/%sitename/g, siteName)
                                                                   .replace(/%authorname/g, this.post.author.name);
        } else {
            this.metaTitle = this.metaTitle.replace(/%posttitle/g, this.post.title)
                                           .replace(/%sitename/g, siteName)
                                           .replace(/%authorname/g, this.post.author.name);
        }

        // If still meta title is empty - use post title
        if(this.metaTitle === '') {
            this.metaTitle = this.post.title;
        }

        this.context = {
            title: this.metaTitle,
            post: this.post,
            featuredPosts: this.featuredPosts,
            hiddenPosts: this.hiddenPosts,
            relatedPosts: this.relatedPosts,
            tags: this.allTags,
            authors: this.authors,
            metaTitleRaw: this.metaTitle,
            metaDescriptionRaw: this.metaDescription,
            metaRobotsRaw: metaRobotsValue,
            canonicalUrl: this.canonicalUrl,
            previousPost: this.previousPost,
            previousSimilarPost: this.previousSimilarPost,
            nextPost: this.nextPost,
            nextSimilarPost: this.nextSimilarPost,
            siteOwner: this.renderer.cachedItems.authors[1],
            menus: this.menus,
            unassignedMenus: this.unassignedMenus
        };
    }

    getContext(postID) {
        this.postID = postID;
        this.setContext();

        return this.context;
    }
}

module.exports = RendererContextPost;
