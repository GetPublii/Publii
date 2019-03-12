// Necessary packages
const fs = require('fs');
const path = require('path');
const slug = require('./../../helpers/slug');
const URLHelper = require('./helpers/url');
const normalizePath = require('normalize-path');
const RendererCache = require('./renderer-cache');

/*
 * Class used create global context variables
 */

class RendererContext {
    constructor(rendererInstance) {
        this.db = rendererInstance.db;
        this.siteConfig = rendererInstance.siteConfig;
        this.themeConfig = rendererInstance.themeConfig;
        this.inputDir = rendererInstance.inputDir;
        this.renderer = rendererInstance;
        this.postsOrdering = 'created_at DESC';
        this.featuredPostsOrdering = 'created_at DESC';
        this.hiddenPostsOrdering = 'created_at DESC';

        if(
            typeof this.siteConfig.advanced.postsListingOrder === 'string' &&
            typeof this.siteConfig.advanced.postsListingOrderBy === 'string'
        ) {
            this.postsOrdering = this.siteConfig.advanced.postsListingOrderBy + ' ' +
                                 this.siteConfig.advanced.postsListingOrder;
        }

        if(
            typeof this.siteConfig.advanced.featuredPostsListingOrder === 'string' &&
            typeof this.siteConfig.advanced.featuredPostsListingOrderBy === 'string'
        ) {
            this.featuredPostsOrdering = this.siteConfig.advanced.featuredPostsListingOrderBy + ' ' +
                                         this.siteConfig.advanced.featuredPostsListingOrder;
        }

        if(
            typeof this.siteConfig.advanced.hiddenPostsListingOrder === 'string' &&
            typeof this.siteConfig.advanced.hiddenPostsListingOrderBy === 'string'
        ) {
            this.hiddenPostsOrdering = this.siteConfig.advanced.hiddenPostsListingOrderBy + ' ' +
                                         this.siteConfig.advanced.hiddenPostsListingOrder;
        }
    }

    getMenus() {
        // Retrieve necessary data
        let tagsData = this.getTagsMenuData();
        let postsData = this.getPostsMenuData();

        // Menu config
        let menuConfigPath = path.join(this.inputDir, 'config', 'menu.config.json');
        let menuConfigContent = fs.readFileSync(menuConfigPath);
        let menuData = JSON.parse(menuConfigContent);
        let menus = {
            assigned: {},
            unassigned: {}
        };

        for(let i = 0; i < menuData.length; i++) {
            menuData[i].items = this.prepareMenuItems(menuData[i].items, tagsData, postsData);

            if (menuData[i].position !== '') {
                menus.assigned[menuData[i].position] = menuData[i];
            } else {
                menus.unassigned[slug(menuData[i].name)] = menuData[i];
            }
        }

        return menus;
    }

    prepareMenuItems(items, tagsData, postsData, level = 2) {
        for(let i = 0; i < items.length; i++) {
            items[i].level = level;

            if(items[i].type === 'post') {
                let foundedPost = postsData.filter(post => post.id == items[i].link);

                if(foundedPost.length && foundedPost[0].status.indexOf('trashed') === -1) {
                    items[i].link = foundedPost[0].slug;
                } else {
                    items[i] = false;
                }
            }

            if(items[i].type === 'tag') {
                let foundedTag = tagsData.filter(tag => tag.id == items[i].link);

                if(foundedTag.length) {
                    items[i].link = foundedTag[0].slug;
                } else {
                    items[i] = false;
                }
            }

            if(items[i] && items[i].items.length > 0) {
                items[i].items = this.prepareMenuItems(items[i].items, tagsData, postsData, level + 1);
            }
        }

        items = items.filter(item => item !== false);

        return items;
    }

    getTagsMenuData() {
        // Retrieve all tags
        let tags = this.db.prepare(`
            SELECT
                t.id AS id,
                t.slug AS slug
            FROM
                tags AS t
            ORDER BY
                id ASC
        `).all();

        return tags;
    }

    getPostsMenuData() {
        // Retrieve all tags
        let posts = this.db.prepare(`
            SELECT
                p.id AS id,
                p.slug AS slug,
                p.status AS status
            FROM
                posts AS p
            ORDER BY
                id ASC
        `).all();

        return posts;
    }

    getAllTags() {
        // Retrieve post tags
        let tags = this.db.prepare(`
            SELECT
                id
            FROM
                tags
            ORDER BY
                name ASC
        `).all();

        tags = tags.map(tag => this.renderer.cachedItems.tags[tag.id]);

        if(!this.siteConfig.advanced.displayEmptyTags) {
            tags = tags.filter(tag => tag.postsNumber > 0);
        }

        tags.sort((tagA, tagB) => tagA.name.localeCompare(tagB.name));

        return tags;
    }

    getAuthors() {
        let authorData = this.db.prepare(`SELECT id FROM authors ORDER BY id ASC;`).all();
        let authors = [];

        for(let i = 0; i < authorData.length; i++) {
            authors.push(this.renderer.cachedItems.authors[authorData[i].id]);
        }

        if(!this.siteConfig.advanced.displayEmptyAuthors) {
            authors = authors.filter(author => author.postsNumber > 0);
        }

        authors.sort((authorA, authorB) => authorA.name.localeCompare(authorB.name));

        return authors;
    }

    setGlobalContext() {
        let addIndexHtml = this.renderer.previewMode || this.siteConfig.advanced.urls.addIndex;
        let fullURL = normalizePath(this.siteConfig.domain);
        let searchUrl = fullURL + '/' + this.siteConfig.advanced.urls.searchPage;
        let errorUrl = fullURL + '/' + this.siteConfig.advanced.urls.errorPage;
        let logoUrl = normalizePath(this.themeConfig.config.logo);
        let assetsUrl = normalizePath(this.siteConfig.domain) + '/' +
                        normalizePath(this.themeConfig.files.assetsPath);
        let postsOrdering = 'desc';
        
        if (typeof this.siteConfig.advanced.postsListingOrder === 'string') {
            postsOrdering = this.siteConfig.advanced.postsListingOrder.toLowerCase();
        }

        assetsUrl = URLHelper.fixProtocols(assetsUrl);

        if(addIndexHtml) {
            fullURL += '/index.html';
        }

        fullURL = URLHelper.fixProtocols(fullURL);
        searchUrl = URLHelper.fixProtocols(searchUrl);
        errorUrl = URLHelper.fixProtocols(errorUrl);

        if(logoUrl !== '') {
            logoUrl = normalizePath(this.siteConfig.domain) + '/' +
                      normalizePath(this.themeConfig.config.logo);
            logoUrl = URLHelper.fixProtocols(logoUrl);
        }

        logoUrl = logoUrl.replace('/amp/media/website/', '/media/website/');

        let siteNameValue = this.siteConfig.name;

        if(this.siteConfig.displayName) {
            siteNameValue = this.siteConfig.displayName;
        }

        this.context = {
            website: {
                url: fullURL,
                baseUrl: fullURL.replace('/index.html', ''),
                searchUrl: searchUrl,
                errorUrl: errorUrl,
                pageUrl: '',
                ampUrl: '',
                name: siteNameValue,
                logo: logoUrl,
                assetsUrl: assetsUrl,
                postsOrdering: postsOrdering,
                lastUpdate: Date.now(),
                contentStructure: {}
            },
            renderer: {
                previewMode: this.renderer.previewMode,
                ampMode: this.renderer.ampMode
            },
            pagination: false,
            headCustomCode: this.siteConfig.advanced.customHeadCode || '',
            headAmpCustomCode: this.siteConfig.advanced.customHeadAmpCode || '',
            bodyCustomCode: this.siteConfig.advanced.customBodyCode || '',
            footerCustomCode: this.siteConfig.advanced.customFooterCode || '',
            footerAmpCustomCode: this.siteConfig.advanced.customFooterAmpCode || '',
            customHTML: this.siteConfig.advanced.customHTML || false,
            utils: {
                currentYear: new Date().getFullYear()
            }
        };

        // In AMP mode create special global @amp variable
        if(this.renderer.ampMode) {
            let ampImage = '';

            if(
                this.siteConfig.advanced.ampImage !== '' &&
                this.siteConfig.advanced.ampImage.indexOf('http://') === -1 &&
                this.siteConfig.advanced.ampImage.indexOf('https://') === -1 &&
                this.siteConfig.advanced.ampImage.indexOf('media/website/') === -1
            ) {
                ampImage = path.join(this.siteConfig.domain, 'media', 'website', this.siteConfig.advanced.ampImage);
                ampImage = normalizePath(ampImage);
                ampImage = URLHelper.fixProtocols(ampImage);
            } else {
                ampImage = URLHelper.fixProtocols(this.siteConfig.advanced.ampImage);
            }

            ampImage = ampImage.replace('/amp/media/website/', '/media/website/');

            if(this.siteConfig.advanced.ampPrimaryColor) {
                this.context.amp = {
                    primaryColor: this.siteConfig.advanced.ampPrimaryColor,
                    image: ampImage,
                    shareButtons: this.siteConfig.advanced.ampShare,
                    shareSystem: this.siteConfig.advanced.ampShareSystem,
                    shareFacebook: this.siteConfig.advanced.ampShareFacebook,
                    shareFacebookId: this.siteConfig.advanced.ampShareFacebookId,
                    shareTwitter: this.siteConfig.advanced.ampShareTwitter,
                    shareGooglePlus: this.siteConfig.advanced.ampShareGooglePlus,
                    sharePinterest: this.siteConfig.advanced.ampSharePinterest,
                    shareLinkedIn: this.siteConfig.advanced.ampShareLinkedIn,
                    shareTumblr: this.siteConfig.advanced.ampShareTumblr,
                    shareWhatsapp: this.siteConfig.advanced.ampShareWhatsapp,
                    footerText: this.siteConfig.advanced.ampFooterText || 'Powered by Publii',
                    GAID: this.siteConfig.advanced.ampGaId || '',
                    originalWebsiteUrl: this.siteConfig.domain.replace(/amp$/, '')
                }
            } else {
                // Default configuration for AMP
                this.context.amp = {
                    primaryColor: '#039be5',
                    image: '',
                    shareButtons: 1,
                    shareSystem: 1,
                    shareFacebook: 1,
                    shareFacebookId: '',
                    shareTwitter: 1,
                    shareGooglePlus: 1,
                    sharePinterest: 1,
                    shareLinkedIn: 1,
                    shareTumblr: 1,
                    shareWhatsapp: 1,
                    footerText: 'Powered by Publii',
                    GAID: '',
                    originalWebsiteUrl: this.siteConfig.domain.replace(/amp$/, '')
                }
            }
        }
    }

    getGlobalContext() {
        this.setGlobalContext();

        return this.context;
    }

    getContentStructure() {
        if(this.themeConfig.renderer && !this.themeConfig.renderer.createContentStructure) {
            return false;
        }

        let postsOrdering = 'created_at DESC';

        if(
            typeof this.siteConfig.advanced.postsListingOrder === 'string' &&
            typeof this.siteConfig.advanced.postsListingOrderBy === 'string'
        ) {
            postsOrdering = this.siteConfig.advanced.postsListingOrderBy + ' ' +
                            this.siteConfig.advanced.postsListingOrder;
        }

        let posts = this.db.prepare(`
                SELECT
                    id
                FROM
                    posts
                WHERE
                    status LIKE "%published%" AND
                    status NOT LIKE "%hidden%" AND
                    status NOT LIKE "%trashed%"
                ORDER BY
                    ${postsOrdering}
        `).all();
        let tags = this.db.prepare(`SELECT id FROM tags`).all();
        let authors = this.db.prepare(`SELECT id FROM authors`).all();

        posts = posts.map(post => JSON.parse(JSON.stringify(this.renderer.cachedItems.posts[post.id])));
        tags = tags.map(tag => JSON.parse(JSON.stringify(this.renderer.cachedItems.tags[tag.id])));
        authors = authors.map(author => JSON.parse(JSON.stringify(this.renderer.cachedItems.authors[author.id])));

        for(let i = 0; i < tags.length; i++) {
            tags[i].posts = this.getContentStructureTagPosts(tags[i].id);
        }

        for(let i = 0; i < authors.length; i++) {
            authors[i].posts = this.getContentStructureAuthorPosts(authors[i].id);
        }

        return {
            posts: posts,
            tags: tags,
            authors: authors
        };
    }

    getContentStructureTagPosts(tagID) {
        let postsOrdering = 'created_at DESC';

        if(
            typeof this.siteConfig.advanced.postsListingOrder === 'string' &&
            typeof this.siteConfig.advanced.postsListingOrderBy === 'string'
        ) {
            postsOrdering = this.siteConfig.advanced.postsListingOrderBy + ' ' +
                this.siteConfig.advanced.postsListingOrder;
        }

        let posts = this.db.prepare(`
                SELECT
                    posts_tags.post_id AS id
                FROM
                    posts_tags
                LEFT JOIN
                    posts
                ON
                    posts_tags.post_id = posts.id
                WHERE
                    posts_tags.tag_id = @tagID AND
                    posts.status LIKE "%published%" AND
                    posts.status NOT LIKE "%hidden%" AND
                    posts.status NOT LIKE "%trashed%"
                ORDER BY
                    ${postsOrdering}
        `).all({
            tagID: tagID
        });

        posts = posts.map(post => this.renderer.cachedItems.posts[post.id]);
        return posts;
    }

    getContentStructureAuthorPosts(authorID) {
        let postsOrdering = 'created_at DESC';

        if(
            typeof this.siteConfig.advanced.postsListingOrder === 'string' &&
            typeof this.siteConfig.advanced.postsListingOrderBy === 'string'
        ) {
            postsOrdering = this.siteConfig.advanced.postsListingOrderBy + ' ' +
                this.siteConfig.advanced.postsListingOrder;
        }

        let posts = this.db.prepare(`
                SELECT
                    id
                FROM
                    posts
                WHERE
                    status LIKE "%published%" AND
                    status NOT LIKE "%hidden%" AND
                    status NOT LIKE "%trashed%" AND
                    authors LIKE @authorID
                ORDER BY
                    ${postsOrdering}
        `).all({
            authorID: authorID.toString()
        });

        posts = posts.map(post => this.renderer.cachedItems.posts[post.id]);
        return posts;
    }

    getCachedItems() {
        let cache = new RendererCache(this.renderer, this.themeConfig);
        cache.create();
    }

    getFeaturedPosts(type) {
        let postsLimit = 'LIMIT 5';

        if(this.themeConfig.renderer) {
            if (type === 'homepage' && this.themeConfig.renderer.featuredPostsNumber) {
                postsLimit = 'LIMIT ' + this.themeConfig.renderer.featuredPostsNumber;
            } else if (type === 'author' && this.themeConfig.renderer.authorsFeaturedPostsNumber) {
                postsLimit = 'LIMIT ' + this.themeConfig.renderer.authorsFeaturedPostsNumber;
            } else if (type === 'tag' && this.themeConfig.renderer.tagsFeaturedPostsNumber) {
                postsLimit = 'LIMIT ' + this.themeConfig.renderer.tagsFeaturedPostsNumber;
            }

            if (postsLimit === 'LIMIT -1') {
                postsLimit = '';
            }
        }

        let results = this.db.prepare(`
            SELECT
                id
            FROM
                posts
            WHERE
                status LIKE "%published%" AND
                status LIKE "%featured%" AND
                status NOT LIKE "%trashed%" AND
                status NOT LIKE "%hidden%"
            ORDER BY
                ${this.featuredPostsOrdering}
            ${postsLimit}
        `).all();

        return results;
    }

    getHiddenPosts() {
        let results = this.db.prepare(`
            SELECT
                id
            FROM
                posts
            WHERE
                status LIKE "%published%" AND
                status LIKE "%hidden%" AND
                status NOT LIKE "%trashed%"
            ORDER BY
                ${this.hiddenPostsOrdering}
        `).all();

        return results;
    }
}

module.exports = RendererContext;
