// Necessary packages
const fs = require('fs');
const path = require('path');
const slug = require('./../../helpers/slug');
const ContentHelper = require('./helpers/content');
const URLHelper = require('./helpers/url');
const normalizePath = require('normalize-path');
const Plugins = require('./../../plugins.js');
const RendererCache = require('./renderer-cache');
const RendererHelpers = require('./helpers/helpers.js');
const sizeOf = require('image-size');
const UtilsHelper = require('./../../helpers/utils');

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
        this.pluginsConfig = this.getPluginsConfig(rendererInstance, rendererInstance);

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
        let pagesData = this.getPagesMenuData();

        // Menu config
        let menuConfigPath = path.join(this.inputDir, 'config', 'menu.config.json');
        let menuConfigContent = fs.readFileSync(menuConfigPath);
        let menuData = JSON.parse(menuConfigContent);
        let menus = {
            assigned: {},
            unassigned: {}
        };

        for (let i = 0; i < menuData.length; i++) {
            let positions = menuData[i].position.split(';');
            let maxLevels = menuData[i].maxLevels;

            if (maxLevels) {
                maxLevels = maxLevels.split(';').map(level => parseInt(level, 10));
            } else {
                maxLevels = Array.from({length: positions.length}, () => -1);
            }

            if (positions[0] === '') {
                menuData[i].items = this.prepareMenuItems(menuData[i].items, tagsData, postsData, pagesData);
                menus.unassigned[slug(menuData[i].name)] = menuData[i];
            } else {
                for (let j = 0; j < positions.length; j++) {
                    let maxLevel = maxLevels[j];
                    let position = positions[j];

                    if (!maxLevel) {
                        if (typeof this.themeConfig.menus[position] === 'object' && this.themeConfig.menus[position].maxLevels) {
                            maxLevel = parseInt(this.themeConfig.menus[position].maxLevels, 10);
                        } else {
                            maxLevel = -1;
                        }
                    } else {
                        let themeMaxLevel = -1;
                        
                        if (typeof this.themeConfig.menus[position] === 'object' && this.themeConfig.menus[position].maxLevels) {
                            themeMaxLevel = parseInt(this.themeConfig.menus[position].maxLevels, 10);
                        }

                        if (themeMaxLevel > -1 && maxLevel > -1 && maxLevel > themeMaxLevel) {
                            maxLevel = themeMaxLevel;
                        }
                    }

                    let positionMenuData = JSON.parse(JSON.stringify(menuData[i]));
                    positionMenuData.items = this.prepareMenuItems(positionMenuData.items, tagsData, postsData, pagesData, 2, maxLevel + 1);
                    menus.assigned[position] = positionMenuData;
                }
            }
        }

        if (this.renderer.plugins.hasModifiers('menuStructure')) {
            menus.assigned = this.renderer.plugins.runModifiers('menuStructure', this.renderer, menus.assigned); 
        }

        if (this.renderer.plugins.hasModifiers('unassignedMenuStructure')) {
            menus.unassigned = this.renderer.plugins.runModifiers('unassignedMenuStructure', this.renderer, menus.unassigned); 
        }

        return menus;
    }

    prepareMenuItems(items, tagsData, postsData, pagesData, level = 2, maxLevel = false) {
        // When max level is exceed - return items
        if (maxLevel && maxLevel !== -1 && maxLevel < level) {
            return [];
        }

        for (let i = 0; i < items.length; i++) {
            items[i].level = level;
            items[i].linkID = items[i].link;

            if (items[i].type === 'post') {
                let foundedPost = postsData.filter(post => post.id == items[i].link);

                if(foundedPost.length && foundedPost[0].status.indexOf('trashed') === -1) {
                    items[i].link = foundedPost[0].slug;
                } else {
                    items[i] = false;
                }
            }

            if (items[i].type === 'page') {
                let foundedPage = pagesData.filter(page => page.id == items[i].link);

                if (foundedPage.length && foundedPage[0].status.indexOf('trashed') === -1) {
                    items[i].link = foundedPage[0].slug;
                } else {
                    items[i] = false;
                }
            }

            if (items[i].type === 'tag') {
                let foundedTag = tagsData.filter(tag => tag.id == items[i].link);

                if (foundedTag.length) {
                    items[i].link = foundedTag[0].slug;
                } else {
                    items[i] = false;
                }
            }

            if (items[i].isHidden) {
                items[i] = false;
            }

            if (items[i] && !items[i].isHidden && items[i].items.length > 0) {
                items[i].items = this.prepareMenuItems(items[i].items, tagsData, postsData, pagesData, level + 1, maxLevel);
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

    getPostsMenuData () {
        // Retrieve all tags
        let posts = this.db.prepare(`
            SELECT
                p.id AS id,
                p.slug AS slug,
                p.status AS status
            FROM
                posts AS p
            WHERE
                p.status NOT LIKE '%is-page%'
            ORDER BY
                id ASC
        `).all();

        return posts;
    }

    getPagesMenuData () {
        // Retrieve all tags
        let pages = this.db.prepare(`
            SELECT
                p.id AS id,
                p.slug AS slug,
                p.status AS status
            FROM
                posts AS p
            WHERE
                p.status LIKE '%is-page%'
            ORDER BY
                id ASC
        `).all();

        return pages;
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

    getAllMainTags() {
        // Retrieve post main tags
        let mainTags = this.db.prepare(`
            SELECT DISTINCT 
                json_extract(value, '$.mainTag') AS id
            FROM 
                posts_additional_data
            WHERE 
                key = '_core' AND 
                json_extract(value, '$.mainTag') IS NOT NULL AND 
                json_extract(value, '$.mainTag') != '';
        `).all();

        mainTags = mainTags.map(mainTag => {
            if (this.renderer.cachedItems.tags[mainTag.id]) {
                return JSON.parse(JSON.stringify(this.renderer.cachedItems.tags[mainTag.id]));
            }

            return false;
        }).filter(mainTag => !!mainTag);

        if(!this.siteConfig.advanced.displayEmptyTags) {
            mainTags = mainTags.filter(mainTag => mainTag.postsNumber > 0);
        }

        mainTags.sort((mainTagA, mainTagB) => mainTagA.name.localeCompare(mainTagB.name));

        return mainTags;
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

    setGlobalContext(context, additionalContexts, paginationData, itemSlug, itemConfig, itemContext) {
        let addIndexHtml = this.renderer.previewMode || this.siteConfig.advanced.urls.addIndex;
        let fullURL = normalizePath(this.siteConfig.domain);
        let searchUrl = fullURL + '/' + this.siteConfig.advanced.urls.searchPage;
        let errorUrl = fullURL + '/' + this.siteConfig.advanced.urls.errorPage;
        let logoUrl = normalizePath(this.themeConfig.config.logo);
        let logoSize = false;
        let assetsUrl = normalizePath(this.siteConfig.domain) + '/' +
                        normalizePath(this.themeConfig.files.assetsPath);
        let rootUrl = normalizePath(this.siteConfig.domain) + '/';
        let mediaFilesUrl = normalizePath(this.siteConfig.domain) + '/media/files/';
        let postsOrdering = 'desc';
        
        if (typeof this.siteConfig.advanced.postsListingOrder === 'string') {
            postsOrdering = this.siteConfig.advanced.postsListingOrder.toLowerCase();
        }

        assetsUrl = URLHelper.fixProtocols(assetsUrl);
        rootUrl = URLHelper.fixProtocols(rootUrl);
        mediaFilesUrl = URLHelper.fixProtocols(mediaFilesUrl);

        if(addIndexHtml) {
            fullURL += '/index.html';
        }

        fullURL = URLHelper.fixProtocols(fullURL);
        searchUrl = URLHelper.fixProtocols(searchUrl);
        errorUrl = URLHelper.fixProtocols(errorUrl);

        if (logoUrl !== '') {
            try {
                logoSize = sizeOf(path.join(this.inputDir, logoUrl));
            } catch(e) {
                logoSize = {
                    width: '',
                    height: ''
                };
            }

            logoUrl = normalizePath(this.siteConfig.domain) + '/' +
                      normalizePath(this.themeConfig.config.logo);
            logoUrl = URLHelper.fixProtocols(logoUrl);
        }

        let siteNameValue = this.siteConfig.name;

        if(this.siteConfig.displayName) {
            siteNameValue = this.siteConfig.displayName;
        }

        if (fullURL.substr(-1) !== '/' && fullURL.substr(-5) !== '.html') {
            fullURL = fullURL + '/';
        }

        let contextItems = [context].concat(additionalContexts);
        contextItems = [...new Set(contextItems)];

        this.context = {
            context: contextItems,
            config: URLHelper.prepareSettingsImages(this.siteConfig.domain, {
                basic: JSON.parse(JSON.stringify(this.themeConfig.config)),
                site: JSON.parse(JSON.stringify(this.siteConfig.advanced)),
                custom: JSON.parse(ContentHelper.setInternalLinks(JSON.stringify(this.themeConfig.customConfig), this.renderer))
            }),
            website: {
                url: fullURL,
                baseUrl: fullURL.replace('/index.html', '/'),
                searchUrl: searchUrl,
                errorUrl: errorUrl,
                tagsUrl: this.getTagsUrl(),
                pageUrl: this.getPageUrl(context, paginationData, itemSlug, itemContext),
                name: siteNameValue,
                logo: logoUrl,
                logoSize: logoSize,
                assetsUrl: assetsUrl,
                rootUrl: rootUrl,
                mediaFilesUrl: mediaFilesUrl,
                postsOrdering: postsOrdering,
                lastUpdate: Date.now(),
                contentStructure: this.renderer.contentStructure,
                language: this.siteConfig.language
            },
            renderer: {
                previewMode: this.renderer.previewMode,
                theme: {
                    name: this.themeConfig.name,
                    version: this.themeConfig.version,
                    author: this.themeConfig.author
                },
                createAuthorPages: RendererHelpers.getRendererOptionValue('createAuthorPages', this.themeConfig),
                createTagPages: RendererHelpers.getRendererOptionValue('createTagPages', this.themeConfig),
                createSearchPage: RendererHelpers.getRendererOptionValue('createSearchPage', this.themeConfig),
                create404page: RendererHelpers.getRendererOptionValue('create404page', this.themeConfig),
                isFirstPage: this.getFirstPageContextData(paginationData),
                isLastPage: this.getLastPageContextData(paginationData)
            },
            pagination: this.getPaginationContextData(paginationData),
            plugins: this.pluginsConfig,
            utils: {
                currentYear: new Date().getFullYear(),
                buildDate: +new Date()
            }
        };

        if (context === 'post' && itemConfig) {
            this.context.config.post = JSON.parse(ContentHelper.setInternalLinks(JSON.stringify(itemConfig), this.renderer));
        }

        if (context === 'page' && itemConfig) {
            this.context.config.page = JSON.parse(ContentHelper.setInternalLinks(JSON.stringify(itemConfig), this.renderer));
        }

        this.renderer.globalContext = this.context;

        if (itemContext) {
            if (itemContext.post && itemContext.post.id) {
                this.renderer.globalContext.itemID = itemContext.post.id;
            } else if (itemContext.tag && itemContext.tag.id) {
                this.renderer.globalContext.itemID = itemContext.tag.id;
            } else if (itemContext.author && itemContext.author.id) {
                this.renderer.globalContext.itemID = itemContext.author.id;
            }
        }

        this.context.headCustomCode = this.getCustomHTMLCode('customHeadCode', itemContext);
        this.context.bodyCustomCode = this.getCustomHTMLCode('customBodyCode', itemContext);
        this.context.commentsCustomCode = this.getCustomHTMLCode('customCommentsCode', itemContext);
        this.context.customSearchInput = this.getCustomHTMLCode('customSearchInput', itemContext);
        this.context.customSearchContent = this.getCustomHTMLCode('customSearchContent', itemContext);
        this.context.customSocialSharing = this.getCustomHTMLCode('customSocialSharing', itemContext);
        this.context.footerCustomCode = this.getCustomHTMLCode('customFooterCode', itemContext);
        this.context.customHTML = this.getCustomHTMLCodeObject(this.siteConfig.advanced.customHTML, itemContext);

        if (this.renderer.plugins.hasModifiers('globalContext')) {
            this.context = this.renderer.plugins.runModifiers('globalContext', this.renderer, this.context); 
        }
    }

    getCustomHTMLCode (optionName, context) {
        let baseCode = this.siteConfig.advanced[optionName] || '';

        if (this.renderer.plugins.hasInsertions(optionName)) {
            baseCode += "\n";
            baseCode += this.renderer.plugins.runInsertions(optionName, this.renderer, context);
        }

        return baseCode.trim();
    }

    getCustomHTMLCodeObject (object, context) {
        if (!object) {
            return false;
        }

        object = JSON.parse(JSON.stringify(object));

        let keys = Object.keys(object);

        for (let i = 0; i < keys.length; i++) {
            let key = keys[i];
            let code = object[key];

            if (this.renderer.plugins.hasInsertions('customHTML.' + key)) {
                code += "\n";
                code += this.renderer.plugins.runInsertions('customHTML.' + key, this.renderer, context);
            }

            if (this.renderer.plugins.hasModifiers('customHTML.' + key)) {
                code = this.renderer.plugins.runModifiers('customHTML.' + key, this.renderer, code, context);
            }

            object[key] = code.trim();
        }

        return object;
    }

    getGlobalContext(context, additionalContexts, paginationData, itemSlug, itemConfig, itemContext) {
        this.setGlobalContext(context, additionalContexts, paginationData, itemSlug, itemConfig, itemContext);
        return this.context;
    }

    getContentStructure() {
        if (!RendererHelpers.getRendererOptionValue('createContentStructure', this.themeConfig)) {
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
                    status LIKE '%published%' AND
                    status NOT LIKE '%trashed%' AND
                    status NOT LIKE '%is-page%'
                ORDER BY
                    ${postsOrdering}
        `).all();
        let pages = this.db.prepare(`
                SELECT
                    id
                FROM
                    posts
                WHERE
                    status LIKE '%published%' AND
                    status NOT LIKE '%trashed%' AND
                    status LIKE '%is-page%'
        `).all();
        let tags = this.db.prepare(`SELECT id FROM tags`).all();
        let authors = this.db.prepare(`SELECT id FROM authors`).all();

        posts = posts.map(post => JSON.parse(JSON.stringify(this.renderer.cachedItems.posts[post.id])));
        pages = pages.map(page => JSON.parse(JSON.stringify(this.renderer.cachedItems.pages[page.id])));
        tags = tags.map(tag => JSON.parse(JSON.stringify(this.renderer.cachedItems.tags[tag.id])));
        authors = authors.map(author => JSON.parse(JSON.stringify(this.renderer.cachedItems.authors[author.id])));

        for(let i = 0; i < tags.length; i++) {
            tags[i].posts = this.getContentStructureTagPosts(tags[i].id);
        }

        for(let i = 0; i < authors.length; i++) {
            authors[i].posts = this.getContentStructureAuthorPosts(authors[i].id);
        }

        let pagesStructure = this.renderer.cachedItems.pagesStructure;
        let finalContentStructure = {
            pages,
            pagesStructure,
            posts,
            tags,
            authors
        };

        if (this.renderer.plugins.hasModifiers('contentStructure')) {
            finalContentStructure = this.renderer.plugins.runModifiers('contentStructure', this.renderer, finalContentStructure); 
        }

        return finalContentStructure;
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
                    posts.status LIKE '%published%' AND
                    posts.status NOT LIKE '%hidden%' AND
                    posts.status NOT LIKE '%trashed%'
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
                    status LIKE '%published%' AND
                    status NOT LIKE '%hidden%' AND
                    status NOT LIKE '%trashed%' AND
                    status NOT LIKE '%is-page%' AND
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
            if (type === 'homepage' && RendererHelpers.getRendererOptionValue('featuredPostsNumber', this.themeConfig)) {
                postsLimit = 'LIMIT ' + RendererHelpers.getRendererOptionValue('featuredPostsNumber', this.themeConfig);
            } else if (type === 'author' && RendererHelpers.getRendererOptionValue('authorsFeaturedPostsNumber', this.themeConfig)) {
                postsLimit = 'LIMIT ' + RendererHelpers.getRendererOptionValue('authorsFeaturedPostsNumber', this.themeConfig);
            } else if (type === 'tag' && RendererHelpers.getRendererOptionValue('tagsFeaturedPostsNumber', this.themeConfig)) {
                postsLimit = 'LIMIT ' + RendererHelpers.getRendererOptionValue('tagsFeaturedPostsNumber', this.themeConfig);
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
                status LIKE '%published%' AND
                status LIKE '%featured%' AND
                status NOT LIKE '%trashed%' AND
                status NOT LIKE '%is-page%' AND
                status NOT LIKE '%hidden%'
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
                status LIKE '%published%' AND
                status LIKE '%hidden%' AND
                status NOT LIKE '%is-page%' AND
                status NOT LIKE '%trashed%'
            ORDER BY
                ${this.hiddenPostsOrdering}
        `).all();

        return results;
    }

    getPages() {
        let results = this.db.prepare(`
            SELECT
                id
            FROM
                posts
            WHERE
                status LIKE '%is-page%' AND
                status NOT LIKE '%trashed%'
        `).all();

        return results;
    }

    getPageUrl (context, paginationData, itemSlug, itemContext) {
        let pagePart = this.siteConfig.advanced.urls.pageName;
        let blogBaseUrl = this.siteConfig.domain;

        if (context === 'index' || context === 'blogindex' || context === '404' || context === 'search') {
            if (!paginationData || paginationData.currentPage === 1) {
                if (this.siteConfig.advanced.usePageAsFrontpage || context === 'blogindex') {
                    if (this.siteConfig.advanced.urls.postsPrefix) {
                        return blogBaseUrl + '/' + this.siteConfig.advanced.urls.postsPrefix + '/';
                    }

                    return blogBaseUrl + '/';
                }

                return this.siteConfig.domain + '/';
            } else {
                if (this.siteConfig.advanced.urls.postsPrefix) {
                    return blogBaseUrl + '/' + this.siteConfig.advanced.urls.postsPrefix + '/' + pagePart +  '/' + paginationData.currentPage + '/';
                }

                return blogBaseUrl + '/' + pagePart +  '/' + paginationData.currentPage + '/';
            }
        } else if (context === 'tags') {
            if (this.siteConfig.advanced.urls.tagsPrefix !== '') {    
                if (this.siteConfig.advanced.urls.postsPrefix && this.siteConfig.advanced.urls.tagsPrefixAfterPostsPrefix) {
                    return blogBaseUrl + '/' + this.siteConfig.advanced.urls.postsPrefix + '/' + this.siteConfig.advanced.urls.tagsPrefix + '/'; 
                }

                return blogBaseUrl + '/' + this.siteConfig.advanced.urls.tagsPrefix + '/';
            } else {
                return blogBaseUrl + '/';
            }
        } else if (context === 'author') {
            if (!paginationData || paginationData.currentPage === 1) {
                if (this.siteConfig.advanced.urls.postsPrefix && this.siteConfig.advanced.urls.authorsPrefixAfterPostsPrefix) {
                    return this.siteConfig.domain + '/' + this.siteConfig.advanced.urls.postsPrefix + '/' + this.siteConfig.advanced.urls.authorsPrefix + '/' + itemSlug + '/';
                }
                
                return this.siteConfig.domain + '/' + this.siteConfig.advanced.urls.authorsPrefix + '/' + itemSlug + '/';
            } else {
                if (this.siteConfig.advanced.urls.postsPrefix && this.siteConfig.advanced.urls.authorsPrefixAfterPostsPrefix) {
                    return this.siteConfig.domain + '/' + this.siteConfig.advanced.urls.postsPrefix + '/' + this.siteConfig.advanced.urls.authorsPrefix + '/' + itemSlug + '/' + pagePart + '/' + paginationData.currentPage + '/';
                }

                return this.siteConfig.domain + '/' + this.siteConfig.advanced.urls.authorsPrefix + '/' + itemSlug + '/' + pagePart + '/' + paginationData.currentPage + '/';
            }
        } else if (context === 'tag') {
            if (!paginationData || paginationData.currentPage === 1) {
                if (this.siteConfig.advanced.urls.tagsPrefix !== '') {  
                    if (this.siteConfig.advanced.urls.postsPrefix && this.siteConfig.advanced.urls.tagsPrefixAfterPostsPrefix) {
                        return blogBaseUrl + '/' + this.siteConfig.advanced.urls.postsPrefix + '/' + this.siteConfig.advanced.urls.tagsPrefix + '/' + itemSlug + '/';
                    }

                    return blogBaseUrl + '/' + this.siteConfig.advanced.urls.tagsPrefix + '/' + itemSlug + '/';
                } else {
                    if (this.siteConfig.advanced.urls.postsPrefix && this.siteConfig.advanced.urls.tagsPrefixAfterPostsPrefix) {
                        return blogBaseUrl + '/' + this.siteConfig.advanced.urls.postsPrefix + '/' + itemSlug + '/';    
                    }

                    return blogBaseUrl + '/' + itemSlug + '/';
                }
            } else {
                if (this.siteConfig.advanced.urls.tagsPrefix !== '') {
                    if (this.siteConfig.advanced.urls.postsPrefix && this.siteConfig.advanced.urls.tagsPrefixAfterPostsPrefix) {
                        return blogBaseUrl + '/' + this.siteConfig.advanced.urls.postsPrefix + '/' + this.siteConfig.advanced.urls.tagsPrefix + '/' + itemSlug + '/' + pagePart + '/' + paginationData.currentPage + '/';    
                    }

                    return blogBaseUrl + '/' + this.siteConfig.advanced.urls.tagsPrefix + '/' + itemSlug + '/' + pagePart + '/' + paginationData.currentPage + '/';
                } else {
                    if (this.siteConfig.advanced.urls.postsPrefix && this.siteConfig.advanced.urls.tagsPrefixAfterPostsPrefix) {
                        return blogBaseUrl + '/' + this.siteConfig.advanced.urls.postsPrefix + '/' + itemSlug + '/' + pagePart + '/' + paginationData.currentPage + '/';    
                    }

                    return blogBaseUrl + '/' + itemSlug + '/' + pagePart + '/' + paginationData.currentPage + '/';
                }
            }
        } else if (context === 'post') {
            if (!this.siteConfig.advanced.urls.cleanUrls) { 
                if (this.siteConfig.advanced.urls.postsPrefix) {
                    return blogBaseUrl + '/' + this.siteConfig.advanced.urls.postsPrefix + '/' + itemSlug + '.html';
                }

                return blogBaseUrl + '/' + itemSlug + '.html';
            } else {
                if (this.siteConfig.advanced.urls.postsPrefix) {
                    return blogBaseUrl + '/' + this.siteConfig.advanced.urls.postsPrefix + '/' + itemSlug + '/';
                }

                return blogBaseUrl + '/' + itemSlug + '/';
            }
        } else if (context === 'page') {
            if (this.siteConfig.advanced.usePageAsFrontpage && itemContext.page && this.siteConfig.advanced.pageAsFrontpage === itemContext.page.id) {
                return this.siteConfig.domain + '/';    
            }
         
            return this.renderer.cachedItems.pages[itemContext.page.id].url;
        }
    }

    getPaginationContextData (paginationData) {
        if (!paginationData) {
            return false;
        }
       
        return paginationData.pagination;
    }

    getFirstPageContextData (paginationData) {
        if (!paginationData) {
            return true;
        }
        
        return paginationData.isFirstPage;
    }

    getLastPageContextData (paginationData) {
        if (!paginationData) {
            return true;
        }
        
        return paginationData.isLastPage;
    }

    getTagsUrl () {
        let tagsUrl = this.siteConfig.domain + '/';

        if (this.siteConfig.advanced.urls.tagsPrefix !== '') {       
            if (this.siteConfig.advanced.urls.postsPrefix && this.siteConfig.advanced.urls.tagsPrefixAfterPostsPrefix) {
                tagsUrl = this.siteConfig.domain + '/' + this.siteConfig.advanced.urls.postsPrefix + '/' + this.siteConfig.advanced.urls.tagsPrefix + '/';
            } else {
                tagsUrl = this.siteConfig.domain + '/' + this.siteConfig.advanced.urls.tagsPrefix + '/';
            }
        }

        if (this.renderer.previewMode) {
            tagsUrl += 'index.html';
        }

        return tagsUrl;
    }

    getPluginsConfig (rendererInstance) {
        let pluginsHelper = new Plugins(rendererInstance.appDir, rendererInstance.sitesDir);
        let pluginsConfig = pluginsHelper.loadSitePluginsConfig(this.siteConfig.name);
        let pluginNames = Object.keys(pluginsConfig);
        let siteName = this.siteConfig.name;
        let config = {};

        for (let i = 0; i < pluginNames.length; i++) {
            let pluginName = pluginNames[i];
            
            config[pluginName] = {
                state: pluginsConfig[pluginName]
            };

            if (pluginsConfig[pluginName]) {
                config[pluginName].config = rendererInstance.loadPluginConfig(pluginName, siteName)
            };
        }

        return config;
    }
}

module.exports = RendererContext;
