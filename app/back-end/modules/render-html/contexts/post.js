// Necessary packages
const RendererContext = require('../renderer-context.js');
const RendererHelpers = require('./../helpers/helpers.js');
const sqlString = require('sqlstring');
const stripTags = require('striptags');

/**
 * Class used create context
 * for the single post theme views
 */
class RendererContextPost extends RendererContext {
    loadData() {
        // Retrieve meta data
        let metaDataQuery = this.db.prepare(`SELECT value FROM posts_additional_data WHERE post_id = @postID AND key = '_core'`);
        this.metaData = metaDataQuery.get({ postID: this.postID});
        this.allTags = this.renderer.commonData.tags.filter(tag => tag.additionalData.isHidden !== true);
        this.mainTags = this.renderer.commonData.mainTags.filter(maintag => maintag.additionalData.isHidden !== true);
        this.menus = this.renderer.commonData.menus;
        this.unassignedMenus = this.renderer.commonData.unassignedMenus;
        this.authors = this.renderer.commonData.authors;
        this.featuredPosts = this.renderer.commonData.featuredPosts.homepage;
        this.hiddenPosts = this.renderer.commonData.hiddenPosts;
        this.pages = this.renderer.commonData.pages;

        // mark tags as main tags
        let mainTagsIds = this.mainTags.map(tag => tag.id);
        this.allTags = this.allTags.map(tag => {
            tag.isMainTag = mainTagsIds.includes(tag.id);
            return tag;
        });
    }

    prepareData() {
        this.post = this.renderer.cachedItems.posts[this.postID];
        this.post.tags = this.post.tags.filter(tag => tag.additionalData.isHidden !== true);
        this.featuredPosts = this.featuredPosts || [];
        this.featuredPosts = this.featuredPosts.map(post => this.renderer.cachedItems.posts[post.id]);
        this.hiddenPosts = this.hiddenPosts || [];
        this.hiddenPosts = this.hiddenPosts.map(post => this.renderer.cachedItems.posts[post.id]);
        this.pages = this.pages || [];
        this.pages = this.pages.map(page => this.renderer.cachedItems.pages[page.id]);
        this.metaTitle = this.siteConfig.advanced.postMetaTitle;
        this.metaDescription = this.siteConfig.advanced.postMetaDescription;
        this.canonicalUrl = this.post.url;
        this.hasCustomCanonicalUrl = false;
        this.metaRobots = '';

        if (this.siteConfig.advanced.postMetaDescription === '') {
            this.metaDescription = stripTags(this.post.excerpt).replace(/\n/gmi, '');
        }

        if(this.metaData && this.metaData.value) {
            let results = JSON.parse(this.metaData.value);

            if (results.metaTitle) {
                this.metaTitle = results.metaTitle;
            }

            if (results.metaDesc) {
                this.metaDescription = results.metaDesc;
            }

            if (results.metaRobots) {
                this.metaRobots = results.metaRobots;
            }

            if (results.canonicalUrl) {
                this.canonicalUrl = results.canonicalUrl;
                this.hasCustomCanonicalUrl = true;
                this.metaRobots = '';
            }
        }

        let siteName = this.siteConfig.name;

        if(this.siteConfig.displayName) {
            siteName = this.siteConfig.displayName;
        }

        if (this.metaTitle === '') {
            this.metaTitle = this.siteConfig.advanced.metaTitle.replace(/%sitename/g, siteName);
        }

        if (this.metaDescription === '') {
            this.metaDescription = this.siteConfig.advanced.metaDescription.replace(/%sitename/g, siteName);
        }

        // load related posts
        this.loadRelatedPosts();

        // load previous and next posts (only on the visible posts)
        let renderPrevNextPosts = RendererHelpers.getRendererOptionValue('renderPrevNextPosts', this.themeConfig);
        
        if(!renderPrevNextPosts || this.post.status.indexOf('hidden') > -1) {
            this.nextPost = false;
            this.previousPost = false;
        } else {
            this.loadPost('next', false);
            this.loadPost('previous', false);
        }

        // load previous and next similar posts (only on the visible posts)
        let renderSimilarPosts = RendererHelpers.getRendererOptionValue('renderSimilarPosts', this.themeConfig);

        if(!renderSimilarPosts || this.post.status.indexOf('hidden') > -1) {
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
        let sortColumn = this.siteConfig.advanced.postsListingOrderBy;

        if (typeof sortColumn !== 'string') {
            sortColumn = 'created_at';
        }

        let sortField = sortColumn;

        if (sortColumn === 'modified_at') {
            sortField = 'modifiedAt';
        } else if (sortColumn === 'created_at') {
            sortField = 'createdAt';
        }

        if(similarPost) {
            let tags = this.post.tags ? this.post.tags.map(tag => parseInt(tag.id, 10)) : [];

            if(tags.length) {
                tagsCondition = ' AND pt.tag_id IN(' + tags.join(',') + ') ';
            }

            let sortCondition = `p.${sortColumn} ${operator} ${this.post[sortField]}`;

            if (sortColumn === 'title') {
                sortCondition = `p.${sortColumn} ${operator} "${this.post[sortField].replace(/"/gmi, '')}"`;
            }

            // Retrieve post
            postData = this.db.prepare(`
                SELECT
                    p.id AS id
                FROM
                    posts AS p
                LEFT JOIN
                    posts_tags AS pt
                    ON
                    p.id = pt.post_id
                WHERE
                    ${sortCondition} AND
                    p.id != @postID AND
                    p.status LIKE '%published%' AND
                    p.status NOT LIKE '%trashed%'AND
                    p.status NOT LIKE '%is-page%' AND
                    p.status NOT LIKE '%hidden%'
                    ${tagsCondition}
                GROUP BY
                    p.id
                ORDER BY
                    ${temporaryPostsOrdering}
                LIMIT 1
            `).get({
                postID: this.post.id
            });
        } else {
            // Retrieve post
            let sortCondition = `${sortColumn} ${operator} ${this.post[sortField]}`;

            if (sortColumn === 'title') {
                sortCondition = `${sortColumn} ${operator} "${this.post[sortField].replace(/"/gmi, '')}"`;
            }

            try {
                postData = this.db.prepare(`
                    SELECT
                        id
                    FROM
                        posts
                    WHERE
                        ${sortCondition} AND
                        id != @postID AND
                        status LIKE '%published%' AND
                        status NOT LIKE '%trashed%' AND
                        status NOT LIKE '%is-page%' AND
                        status NOT LIKE '%hidden%'
                    ORDER BY
                        ${temporaryPostsOrdering}
                    LIMIT 1
                `).get({
                    postID: this.post.id
                });
            } catch (err) {
                console.log('ERR', err);
            }
        }

        if(!postData || !postData.id) {
            return false;
        }

        this[postType] = this.renderer.cachedItems.posts[postData.id];
    }

    loadRelatedPosts() {
        let renderRelatedPosts = RendererHelpers.getRendererOptionValue('renderRelatedPosts', this.themeConfig);
        let relatedPostsNumberFromConfig = RendererHelpers.getRendererOptionValue('relatedPostsNumber', this.themeConfig);

        if (!renderRelatedPosts || relatedPostsNumberFromConfig === 0) {
            this.relatedPosts = [];
            return;
        }

        this.post.id = parseInt(this.post.id, 10);
        let tags = this.post.tags ? this.post.tags.map(tag => parseInt(tag.id, 10)) : [];
        let relatedPostsNumber = 5;
        let postTitleConditions = [];
        let conditions = [];
        let conditionsLowerPriority = [];

        if (relatedPostsNumberFromConfig) {
            relatedPostsNumber = relatedPostsNumberFromConfig;
        }

        // Get tags
        if(tags.length) {
            conditions.push(' pt.tag_id IN(' + tags.join(',') + ') ');
            conditionsLowerPriority.push(' pt.tag_id NOT IN(' + tags.join(',') + ') ');
        }

        // Get words to compare (with length bigger than 3 chars)
        if (['titles', 'titles-and-tags'].indexOf(this.siteConfig.advanced.relatedPostsCriteria) > -1) {
            let stringsToCompare = this.post.title.split(' ');
            stringsToCompare = stringsToCompare.filter(word => word.length > 3);

            if(stringsToCompare.length) {
                for (let toCompare of stringsToCompare) {
                    postTitleConditions.push(' LOWER(p.title) LIKE LOWER(\'%' + sqlString.escape(toCompare).replace(/'/g, '').replace(/"/g, '') + '%\') ')
                }

                postTitleConditions = '(' + postTitleConditions.join('OR') + ')';
                conditions.push(postTitleConditions);
                conditionsLowerPriority.push(postTitleConditions);
            }
        }

        if(conditions.length > 1) {
            conditions = conditions.join(' AND ');
            conditions = ' ( ' + conditions + ' ) ';
        }

        if(conditions.length) {
            conditions = ' AND ' + conditions;
        }

        if(conditionsLowerPriority.length > 1) {
            conditionsLowerPriority = conditionsLowerPriority.join(' AND ');
            conditionsLowerPriority = ' ( ' + conditionsLowerPriority + ' ) ';
        }

        if(conditionsLowerPriority.length) {
            conditionsLowerPriority = ' AND ' + conditionsLowerPriority;
        }

        // Get related posts ordering
        let ordering = ' subquery.id DESC ';

        if (this.siteConfig.advanced.relatedPostsOrder === 'id-asc') {
            ordering = ' subquery.id ASC ';
        } else if (this.siteConfig.advanced.relatedPostsOrder === 'random') {
            ordering = ' RANDOM() ';
        }

        // Use second query
        let secondQuery = '';

        if (this.siteConfig.advanced.relatedPostsIncludeAllPosts) {
            secondQuery = `
                UNION
                SELECT
                    p.id AS id,
                    2 AS priority
                FROM
                    posts AS p
                LEFT JOIN
                    posts_tags AS pt
                    ON
                    p.id = pt.post_id
                WHERE
                    p.id != @postID AND
                    p.status LIKE '%published%' AND
                    p.status NOT LIKE '%trashed%' AND
                    p.status NOT LIKE '%is-page%' AND
                    p.status NOT LIKE '%hidden%'
                    ${conditionsLowerPriority}
            `;
        }

        // Retrieve post
        let postsData = this.db.prepare(`
            SELECT 
                subquery.id AS id
            FROM
                (
                    SELECT
                        p.id AS id,
                        1 AS priority
                    FROM
                        posts AS p
                    LEFT JOIN
                        posts_tags AS pt
                        ON
                        p.id = pt.post_id
                    WHERE
                        p.id != @postID AND
                        p.status LIKE '%published%' AND
                        p.status NOT LIKE '%trashed%' AND
                        p.status NOT LIKE '%is-page%' AND
                        p.status NOT LIKE '%hidden%'
                        ${conditions}
                    ${secondQuery}
                    GROUP BY
                        p.id
                    ORDER BY
                        priority ASC
                    LIMIT @relatedPostsNumber
                ) AS subquery
            ORDER BY
                ${ordering}
        `).all({
            postID: this.post.id,
            relatedPostsNumber: relatedPostsNumber * 2
        });

        this.relatedPosts = [];

        if (!postsData || !postsData.length) {
            return false;
        }

        postsData = postsData.map(postData => postData.id);
        postsData = [...new Set(postsData)]; 

        if (postsData.length > relatedPostsNumber) {
            postsData = postsData.slice(0, relatedPostsNumber);
        }

        for(let i = 0; i < postsData.length; i++) {
            this.relatedPosts[i] = this.renderer.cachedItems.posts[postsData[i]];
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

        this.metaDescription = this.metaDescription.replace(/%posttitle/g, this.post.title)
                                                    .replace(/%sitename/g, siteName)
                                                    .replace(/%authorname/g, this.post.author.name);

        this.context = {
            title: this.metaTitle,
            post: this.post,
            featuredPosts: this.featuredPosts,
            hiddenPosts: this.hiddenPosts,
            relatedPosts: this.relatedPosts,
            tags: this.allTags,
            mainTags: this.mainTags,
            authors: this.authors,
            pages: this.pages,
            metaTitleRaw: this.metaTitle,
            metaDescriptionRaw: this.metaDescription,
            metaRobotsRaw: metaRobotsValue,
            hasCustomCanonicalUrl: this.hasCustomCanonicalUrl,
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
