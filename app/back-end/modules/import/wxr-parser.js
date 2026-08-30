const fs = require('fs');
const path = require('path');
const FileHelper = require('./../../helpers/file.js');
const moment = require('moment');
const { XMLParser } = require('fast-xml-parser');
const download = require('image-downloader');
const sizeOf = require('image-size');
const automaticParagraphs = require('./automatic-paragraphs.js');
const slug = require('./../../helpers/slug');
const Author = require('./../../author.js');
const Tag = require('./../../tag.js');
const Post = require('./../../post.js');
const Page = require('./../../page.js');
const Image = require('./../../image.js');
const WxrUtils = require('./wxr-utils.js');

const DYNAMIC_WORDPRESS_BLOCKS = new Set([
    'archives',
    'avatar',
    'block',
    'calendar',
    'categories',
    'comment-author-name',
    'comment-content',
    'comment-date',
    'comment-edit-link',
    'comment-reply-link',
    'comment-template',
    'comments',
    'comments-pagination',
    'comments-pagination-next',
    'comments-pagination-numbers',
    'comments-pagination-previous',
    'comments-title',
    'home-link',
    'latest-comments',
    'latest-posts',
    'loginout',
    'navigation',
    'page-list',
    'post-author',
    'post-author-biography',
    'post-author-name',
    'post-comments-form',
    'post-content',
    'post-date',
    'post-excerpt',
    'post-featured-image',
    'post-navigation-link',
    'post-template',
    'post-terms',
    'post-title',
    'query',
    'query-no-results',
    'query-pagination',
    'query-pagination-next',
    'query-pagination-numbers',
    'query-pagination-previous',
    'query-title',
    'read-more',
    'rss',
    'search',
    'shortcode',
    'site-logo',
    'site-tagline',
    'site-title',
    'tag-cloud',
    'term-description'
]);

const UNIMPORTED_MEDIA_EXTENSIONS = {
    audio: new Set(['aac', 'flac', 'm4a', 'mp3', 'oga', 'ogg', 'wav']),
    document: new Set([
        'csv', 'doc', 'docx', 'epub', 'key', 'numbers', 'odf', 'odp', 'ods', 'odt',
        'pages', 'pdf', 'ppt', 'pptx', 'rtf', 'txt', 'xls', 'xlsx', 'zip'
    ]),
    image: new Set(['avif', 'bmp', 'gif', 'ico', 'jpeg', 'jpg', 'png', 'svg', 'tif', 'tiff', 'webp']),
    video: new Set(['avi', 'm4v', 'mkv', 'mov', 'mp4', 'mpeg', 'mpg', 'ogv', 'webm', 'wmv'])
};

/**
 * Class used to parse WXR files
 */
class WxrParser {
    /**
     * Create an instance
     *
     * @param appInstance
     * @param siteName
     */
    constructor(appInstance, siteName) {
        this.appInstance = appInstance;
        this.siteName = siteName;
        this.importAuthors = false;
        this.autop = false;
        this.importMenus = true;
        this.usedTaxonomy = 'tags';
        this.postTypes = [];
        this.slugStrategy = 'wordpress';
        this.seoProvider = 'none';
        this.seoProviderStats = null;
        this.sourceBaseUrl = '';
        this.importedPostIDs = [];
        this.importedPageIDs = [];
        this.pageHierarchyItems = [];
        this.internalUrlMappings = new Map();
        this.menuLinkIssues = [];
        this.menuLinkIssueKeys = new Set();
        this.authorWarningKeys = new Set();
        this.ignoredSystemTypes = [];
        this.usedMediaFilenames = {};
        this.existingImportedItems = new Map();
        this.pendingSeoCanonicals = [];
        this.items = null;
        this.duplicateItemsCount = 0;
        this.summary = {
            authors: 0,
            tags: 0,
            posts: 0,
            pages: 0,
            menus: 0,
            menuItems: 0,
            images: 0,
            skipped: {
                posts: 0,
                pages: 0
            },
            seo: {
                requestedProvider: 'auto',
                provider: 'none',
                detectedProviders: [],
                imported: {
                    titles: 0,
                    descriptions: 0,
                    robots: 0,
                    canonicals: 0,
                    mainTags: 0
                },
                skippedExisting: 0,
                issues: []
            },
            imageErrors: [],
            ignoredSystemItems: 0,
            ignoredSystemTypes: [],
            warnings: [],
            report: null
        };
        this.temp = {
            authors: [],
            posts: [],
            pages: [],
            tags: [],
            images: [],
            mapping: {
                authors: [],
                tags: [],
                images: [],
                posts: [],
                pages: []
            },
            imagesQueue: {}
        };
    }

    /**
     * Load WXR file and parse it
     *
     * @param filePath
     */
    loadFile(filePath) {
        this.filePath = filePath;
        this.fileContent = FileHelper.readFileSync(this.filePath, 'utf8');
        this.fileContent = this.fileContent.trim();
        this.items = null;
        this.duplicateItemsCount = 0;

        if (!this.parseFile()) {
            throw new Error('An error occurred during parsing selected WXR file');
        }

        let channel = this.getChannel();
        this.sourceBaseUrl = WxrUtils.asString(
            channel['wp:base_blog_url'] || channel['wp:base_site_url'] || channel.link
        ).replace(/\/$/, '');
    }

    /**
     * Check if loaded WXR file is a WXR file
     *
     * @returns {boolean}
     */
    isWXR() {
        if(path.parse(this.filePath).ext.toLowerCase() !== '.xml') {
            return false;
        }

        if(
            this.fileContent.indexOf('<!-- generator="WordPress') === -1 &&
            this.fileContent.indexOf('<wp:wxr_version>') === -1
        ) {
            return false;
        }

        return true;
    }

    /**
     * Transform XML to JSON
     *
     * @returns {boolean}
     */
    parseFile() {
        let results = false;
        try {
            let xmlParser = new XMLParser({
                ignoreAttributes: false,
                attributeNamePrefix : "@_"
            });
            results = xmlParser.parse(this.fileContent);
        } catch(e) {
            console.log('An error occurred:', e);
            return false;
        }

        this.parsedContent = results;

        return true;
    }

    /**
     * Return a validated WXR channel object.
     */
    getChannel() {
        if (!this.parsedContent || !this.parsedContent.rss || !this.parsedContent.rss.channel) {
            throw new Error('Selected file does not contain a valid WXR channel.');
        }

        return this.parsedContent.rss.channel;
    }

    /**
     * Analyzes WXR content and returns its stats
     *
     * @returns {{authors: number, categories: number, tags: number, images: number, posts: number}}
     */
    getWxrStats() {
        let channel = this.getChannel();
        let authors = this.getAuthors();
        let primaryAuthor = authors[0] || {};
        let categories = WxrUtils.asArray(channel['wp:category']);
        let tags = WxrUtils.asArray(channel['wp:tag']);
        let items = this.getItems();

        let postTypes = this.getPostTypes(items);
        let ignoredSystemTypes = this.getIgnoredSystemTypes(items);
        let menus = this.getMenuDefinitions();
        let menuItems = this.getMenuItems();

        let stats = {
            site: {
                title: WxrUtils.sanitizeTitle(channel.title),
                description: WxrUtils.sanitizeTitle(channel.description),
                language: WxrUtils.asString(channel.language).trim(),
                url: this.sourceBaseUrl,
                author: WxrUtils.sanitizeTitle(
                    primaryAuthor['wp:author_display_name'] || primaryAuthor['wp:author_login']
                )
            },
            authors: this.getItemsCount(authors),
            categories: this.getItemsCount(categories),
            tags: this.getItemsCount(tags),
            menus: menus.length,
            menuItems: menuItems.length,
            duplicates: this.duplicateItemsCount,
            ignoredSystemItems: ignoredSystemTypes.reduce((total, item) => total + item.count, 0),
            ignoredSystemTypes,
            seo: WxrUtils.getSeoProviderStats(items),
            types: {
                image: this.getItemsCount(items, 'attachment'),
                post: this.getItemsCount(items, 'post'),
                page: this.getItemsCount(items, 'page')
            }
        };

        for(let postType of postTypes) {
            stats.types[postType] = this.getItemsCount(items, postType);
        }

        return stats;
    }

    /**
     * Return number of items of given type
     *
     * @param items
     * @param filterType
     * @returns {number}
     */
    getItemsCount(items, filterType = false) {
        items = WxrUtils.asArray(items);

        if(filterType) {
            items = items.filter(item => item['wp:post_type'] === filterType);
        }

        return items.length;
    }

    /**
     * Detects post types (without default post types)
     *
     * @param items
     * @returns {Array}
     */
    getPostTypes(items) {
        let skippedTypes = ['post', 'page', 'attachment', 'nav_menu_item'];
        let foundedTypes = [];

        for(let item of WxrUtils.asArray(items)) {
            if (!item || !item['wp:post_type']) {
                continue;
            }
            let postType = WxrUtils.asString(item['wp:post_type']).trim();

            if(skippedTypes.indexOf(postType) !== -1) {
                continue;
            }

            if (WxrUtils.isWordPressSystemPostType(postType)) {
                continue;
            }

            if(foundedTypes.indexOf(postType) !== -1) {
                continue;
            }

            foundedTypes.push(postType);
        }

        return foundedTypes;
    }

    getIgnoredSystemTypes(items = this.getItems()) {
        let types = new Map();

        for (let item of WxrUtils.asArray(items)) {
            let postType = WxrUtils.asString(item && item['wp:post_type']).trim().toLowerCase();

            if (WxrUtils.isWordPressSystemPostType(postType)) {
                types.set(postType, (types.get(postType) || 0) + 1);
            }
        }

        return [...types.entries()]
            .map(([type, count]) => ({ type, count }))
            .sort((a, b) => a.type.localeCompare(b.type));
    }

    getMenuItems() {
        return this.getItems().filter(item => {
            return WxrUtils.asString(item && item['wp:post_type']) === 'nav_menu_item' &&
                WxrUtils.asString(item && item['wp:status']).toLowerCase() !== 'trash';
        });
    }

    getMenuCategory(item) {
        return WxrUtils.asArray(item && item.category).find(category => {
            return category && category['@_domain'] === 'nav_menu';
        });
    }

    getMenuDefinitions() {
        let definitions = new Map();
        let addDefinition = (menuSlug, menuName) => {
            menuName = WxrUtils.sanitizeTitle(menuName);
            menuSlug = slug(WxrUtils.asString(menuSlug).trim() || menuName);

            if (!menuSlug) {
                return;
            }

            if (!definitions.has(menuSlug)) {
                definitions.set(menuSlug, {
                    slug: menuSlug,
                    name: menuName || menuSlug
                });
            } else if (menuName && definitions.get(menuSlug).name === menuSlug) {
                definitions.get(menuSlug).name = menuName;
            }
        };

        for (let term of WxrUtils.asArray(this.getChannel()['wp:term'])) {
            if (WxrUtils.asString(term && term['wp:term_taxonomy']) === 'nav_menu') {
                addDefinition(term['wp:term_slug'], term['wp:term_name']);
            }
        }

        for (let item of this.getMenuItems()) {
            let menuCategory = this.getMenuCategory(item);

            if (menuCategory) {
                addDefinition(menuCategory['@_nicename'], WxrUtils.asString(menuCategory));
            }
        }

        return [...definitions.values()];
    }

    /**
     * Set configuration of parser and importer
     *
     * @param authors
     * @param taxonomy
     * @param autop
     * @param postTypes
     * @param slugStrategy
     * @param importMenus
     * @param seoProvider
     */
    setConfig(authors, taxonomy, autop, postTypes, slugStrategy = 'wordpress', importMenus = true, seoProvider = 'auto') {
        this.importAuthors = false;
        this.usedTaxonomy = ['tags', 'categories', 'both'].includes(taxonomy) ? taxonomy : 'both';
        this.autop = autop === true;
        this.importMenus = importMenus === true;
        this.postTypes = (Array.isArray(postTypes) ? postTypes : [])
            .map(postType => WxrUtils.asString(postType).trim())
            .filter(postType => postType && !WxrUtils.isWordPressSystemPostType(postType));
        this.slugStrategy = slugStrategy === 'title' ? 'title' : 'wordpress';
        this.ignoredSystemTypes = this.getIgnoredSystemTypes();
        this.summary.ignoredSystemTypes = this.ignoredSystemTypes.map(item => ({ ...item }));
        this.summary.ignoredSystemItems = this.ignoredSystemTypes.reduce((total, item) => total + item.count, 0);
        this.summary.seo.requestedProvider = ['auto', 'yoast', 'rank-math', 'aioseo', 'none'].includes(seoProvider) ?
            seoProvider : 'auto';
        let seoResolution = WxrUtils.resolveSeoProvider(this.getItems(), this.summary.seo.requestedProvider);
        this.seoProvider = seoResolution.provider;
        this.seoProviderStats = seoResolution.stats;
        this.summary.seo.provider = this.seoProvider;
        this.summary.seo.detectedProviders = seoResolution.stats.detected.slice();

        if (this.summary.seo.requestedProvider === 'auto' && seoResolution.stats.ambiguous) {
            this.summary.warnings.push(
                'Multiple WordPress SEO metadata sources were detected. ' +
                'Only ' + this.seoProvider + ' data was imported; metadata from other SEO plugins was left untouched.'
            );
        } else if (this.seoProvider !== 'none' && !seoResolution.stats.detected.includes(this.seoProvider)) {
            this.summary.warnings.push(
                'The selected WordPress SEO source (' + this.seoProvider + ') was not found in this WXR file.'
            );
        }

        if(authors === 'wp-authors') {
            this.importAuthors = true;
        }

        console.log('(i) CONFIG:');
        console.log('- Import authors: ' + this.importAuthors);
        console.log('- Used taxonomy: ' + this.usedTaxonomy);
        console.log('- Use autop: '+ this.autop + "\n\n");
        console.log('- Import menus: ' + this.importMenus + "\n\n");
        console.log('- Post types: '+ this.postTypes.toString() + "\n\n");
        console.log('- Slug strategy: ' + this.slugStrategy + "\n\n");
        console.log('- SEO provider: ' + this.seoProvider + "\n\n");
    }

    sendProgress(translation, translationVars) {
        if (typeof process.send !== 'function') {
            return;
        }

        process.send({
            type: 'progress',
            message: {
                translation,
                translationVars
            }
        });
    }

    getItems() {
        if (this.items) {
            return this.items;
        }

        let items = WxrUtils.asArray(this.getChannel().item);
        let identities = new Set();

        this.items = items.filter(item => {
            let sourceID = this.getSourceID(item);

            if (!sourceID) {
                return true;
            }

            let postType = WxrUtils.asString(item && item['wp:post_type']).trim() || 'unknown';
            let identity = postType + '|' + sourceID;

            if (identities.has(identity)) {
                this.duplicateItemsCount++;
                return false;
            }

            identities.add(identity);
            return true;
        });

        return this.items;
    }

    getAuthors() {
        let authors = WxrUtils.asArray(this.getChannel()['wp:author']).slice();
        let knownAuthors = new Set();

        for (let author of authors) {
            let login = slug(WxrUtils.asString(author && author['wp:author_login']));
            let displayName = slug(WxrUtils.asString(author && author['wp:author_display_name']));

            if (login) {
                knownAuthors.add(login);
            }

            if (displayName) {
                knownAuthors.add(displayName);
            }
        }

        for (let item of this.getItems()) {
            let creator = WxrUtils.asString(item && item['dc:creator']).trim();
            let creatorKey = slug(creator);

            if (!creatorKey || knownAuthors.has(creatorKey)) {
                continue;
            }

            authors.push({
                'wp:author_id': '',
                'wp:author_login': creator,
                'wp:author_email': '',
                'wp:author_display_name': creator,
                inferredFromCreator: true
            });
            knownAuthors.add(creatorKey);
        }

        return authors;
    }

    getSourceID(item) {
        return WxrUtils.asString(item && item['wp:post_id']).trim();
    }

    getImportKey(item) {
        let sourceID = this.getSourceID(item);

        if (!sourceID || !this.sourceBaseUrl) {
            return '';
        }

        return this.sourceBaseUrl + '|' + sourceID;
    }

    loadExistingImportMappings() {
        if (!this.appInstance || !this.appInstance.db) {
            return;
        }

        let rows = this.appInstance.db.prepare(`
            SELECT pad.post_id AS postID, pad.value, p.status
            FROM posts_additional_data AS pad
            INNER JOIN posts AS p ON p.id = pad.post_id
            WHERE pad.key = '_core'
        `).all();

        for (let row of rows) {
            try {
                let data = JSON.parse(row.value || '{}');

                if (data.wpImport && data.wpImport.source && data.wpImport.id) {
                    this.existingImportedItems.set(
                        data.wpImport.source.replace(/\/$/, '') + '|' + data.wpImport.id,
                        {
                            id: row.postID,
                            isPage: (row.status || '').split(',').includes('is-page')
                        }
                    );
                }
            } catch (e) {
                // Ignore additional data created by older versions or plugins.
            }
        }
    }

    getExistingImportedItem(item, isPage) {
        let key = this.getImportKey(item);
        let existing = key ? this.existingImportedItems.get(key) : null;

        if (!existing || existing.isPage !== isPage) {
            return null;
        }

        return existing;
    }

    getItemTimestamp(item, type, fallback = Date.now()) {
        let gmtField = type === 'modified' ? 'wp:post_modified_gmt' : 'wp:post_date_gmt';
        let localField = type === 'modified' ? 'wp:post_modified' : 'wp:post_date';
        let gmtValue = WxrUtils.asString(item[gmtField]).trim();
        let localValue = WxrUtils.asString(item[localField]).trim();
        let parsedDate;

        if (gmtValue && !gmtValue.startsWith('0000-00-00')) {
            parsedDate = moment.utc(gmtValue, ['YYYY-MM-DD HH:mm:ss', moment.ISO_8601], true);
        }

        if ((!parsedDate || !parsedDate.isValid()) && localValue && !localValue.startsWith('0000-00-00')) {
            parsedDate = moment(localValue, ['YYYY-MM-DD HH:mm:ss', moment.ISO_8601], true);
        }

        return parsedDate && parsedDate.isValid() ? parsedDate.valueOf() : fallback;
    }

    getItemAuthor(item) {
        if (!this.importAuthors) {
            return '1';
        }

        let authorUsername = slug(WxrUtils.asString(item['dc:creator']));
        let authorID = this.temp.authors[authorUsername];

        if (!authorID) {
            let sourceID = this.getSourceID(item) || '?';
            let itemType = WxrUtils.asString(item && item['wp:post_type']) === 'page' ? 'page' : 'post';
            let itemTitle = WxrUtils.sanitizeTitle(item && item.title) || 'Untitled item';
            let warningKey = itemType + '|' + sourceID + '|' + authorUsername;

            if (!this.authorWarningKeys.has(warningKey)) {
                this.authorWarningKeys.add(warningKey);

                if (authorUsername) {
                    this.summary.warnings.push(
                        'Author "' + authorUsername + '" was not found for ' + itemType + ' #' + sourceID +
                        ' ("' + itemTitle + '"); the main Publii author was used.'
                    );
                } else {
                    this.summary.warnings.push(
                        'No WordPress author was assigned to ' + itemType + ' #' + sourceID +
                        ' ("' + itemTitle + '"); the main Publii author was used.'
                    );
                }
            }

            return '1';
        }

        return authorID.toString();
    }

    updateExistingItemAuthor(item, postID) {
        if (!this.importAuthors) {
            return;
        }

        this.appInstance.db.prepare(`
            UPDATE posts SET authors = @authorID WHERE id = @postID
        `).run({
            authorID: this.getItemAuthor(item),
            postID
        });
    }

    getItemTags(item) {
        let domains = {
            tags: ['post_tag'],
            categories: ['category'],
            both: ['post_tag', 'category']
        }[this.usedTaxonomy];
        let tags = WxrUtils.asArray(item.category)
            .filter(category => category && domains.includes(category['@_domain']))
            .map(category => WxrUtils.asString(category).trim())
            .filter(Boolean);
        let uniqueTags = new Map();

        for (let tagName of tags) {
            let tagSlug = slug(tagName);
            let matchingTag = this.appInstance.db.prepare(`
                SELECT id FROM tags WHERE name = @name OR slug = @slug
            `).get({ name: tagName, slug: tagSlug });
            let identity = matchingTag ? 'id:' + matchingTag.id : 'slug:' + tagSlug.toLowerCase();

            if (!uniqueTags.has(identity)) {
                uniqueTags.set(identity, tagName);
            }
        }

        return [...uniqueTags.values()];
    }

    recordSeoIssue(item, field, reason, value = '') {
        this.summary.seo.issues.push({
            sourceID: this.getSourceID(item),
            itemType: WxrUtils.asString(item && item['wp:post_type']) === 'page' ? 'page' : 'post',
            title: WxrUtils.sanitizeTitle(item && item.title),
            field,
            reason,
            value: WxrUtils.asString(value).slice(0, 1000)
        });
    }

    getPrimaryCategoryTagID(item, seoData) {
        let sourceTermID = WxrUtils.asString(seoData.primaryTermID).trim();

        if (!sourceTermID || sourceTermID === '0') {
            return '';
        }

        if (!['categories', 'both'].includes(this.usedTaxonomy)) {
            this.recordSeoIssue(item, 'mainTag', 'primary-category-not-imported', sourceTermID);
            return '';
        }

        let sourceTerm = WxrUtils.asArray(this.getChannel()['wp:category']).find(category => {
            return WxrUtils.asString(category && category['wp:term_id']).trim() === sourceTermID;
        });
        let sourceName = WxrUtils.asString(sourceTerm && (
            sourceTerm['wp:cat_name'] || sourceTerm['wp:term_name']
        )).trim();
        let sourceSlug = WxrUtils.asString(sourceTerm && (
            sourceTerm['wp:category_nicename'] || sourceTerm['wp:term_slug']
        )).trim();
        let assignedCategory = WxrUtils.asArray(item && item.category).some(category => {
            if (!category || category['@_domain'] !== 'category') {
                return false;
            }

            let assignedName = WxrUtils.asString(category).trim();
            let assignedSlug = WxrUtils.asString(category['@_nicename']).trim();

            return (sourceSlug && assignedSlug === sourceSlug) || (sourceName && assignedName === sourceName);
        });
        let tagID = this.temp.mapping.tags[sourceTermID];

        if (!sourceTerm || !assignedCategory || !tagID) {
            this.recordSeoIssue(item, 'mainTag', 'primary-category-not-resolved', sourceTermID);
            return '';
        }

        return Number(tagID);
    }

    getItemSeoData(item, isPage = false) {
        return WxrUtils.getSeoData(item, this.seoProvider, isPage ? 'page' : 'post');
    }

    createAdditionalData(item, isPage = false) {
        let seoData = this.getItemSeoData(item, isPage);

        for (let issue of seoData.issues) {
            this.recordSeoIssue(item, issue.field, issue.reason, issue.value);
        }

        let mainTag = !isPage ? this.getPrimaryCategoryTagID(item, seoData) : '';

        if (seoData.metaTitle) {
            this.summary.seo.imported.titles++;
        }

        if (seoData.metaDesc) {
            this.summary.seo.imported.descriptions++;
        }

        if (seoData.metaRobots) {
            this.summary.seo.imported.robots++;
        }

        if (mainTag) {
            this.summary.seo.imported.mainTags++;
        }

        return {
            metaTitle: seoData.metaTitle,
            metaDesc: seoData.metaDesc,
            metaRobots: seoData.metaRobots,
            canonicalUrl: '',
            mainTag,
            editor: 'tinymce',
            wpImport: {
                source: this.sourceBaseUrl,
                id: this.getSourceID(item),
                type: WxrUtils.asString(item['wp:post_type']),
                url: WxrUtils.asString(item.link),
                originalSlug: WxrUtils.asString(item['wp:post_name']),
                slugStrategy: this.slugStrategy,
                status: WxrUtils.asString(item['wp:status'])
            }
        };
    }

    queueSeoCanonical(item, postID, isPage = false) {
        let seoData = this.getItemSeoData(item, isPage);

        if (!seoData.canonicalUrl) {
            return;
        }

        this.pendingSeoCanonicals.push({
            item,
            postID: Number(postID),
            isPage,
            url: seoData.canonicalUrl,
            robots: seoData.metaRobots
        });
    }

    recordSkippedExistingSeo(item) {
        if (this.seoProvider !== 'none' && WxrUtils.itemHasSeoProviderData(item, this.seoProvider)) {
            this.summary.seo.skippedExisting++;
        }
    }

    /**
     * Import authors related data
     */
    importAuthorsData() {
        if(!this.importAuthors) {
            return;
        }

        let authors = this.getAuthors();

        for(let i = 0; i < authors.length; i++) {
            this.createAuthor(authors[i], i, authors.length);
        }
    }

    /**
     * Creates an author
     *
     * @param authorData
     * @param index
     * @param totalNumber
     */
    createAuthor(authorData, index, totalNumber) {
        let displayName = WxrUtils.asString(authorData['wp:author_display_name']).trim();
        let sourceLogin = WxrUtils.asString(authorData['wp:author_login']).trim();
        let authorUsername = slug(sourceLogin || displayName);

        if (!displayName) {
            displayName = authorUsername || 'Imported author';
        }

        let newAuthor = new Author(this.appInstance, {
            id: 0,
            site: this.siteName,
            name: displayName,
            username: authorUsername,
            config: JSON.stringify({
                email: WxrUtils.asString(authorData['wp:author_email']),
                avatar: '',
                useGravatar: false,
                description: '',
                metaTitle: '',
                metaDescription: '',
                template: ''
            }),
            additionalData: {}
        }, false);

        let newAuthorResult = newAuthor.save();
        let author = WxrUtils.asArray(newAuthorResult.authors).find(item => item.username === authorUsername);

        if (!author) {
            author = this.appInstance.db.prepare(`
                SELECT id, username, name FROM authors
                WHERE username = @username OR name = @name
                ORDER BY CASE WHEN username = @username THEN 0 ELSE 1 END
                LIMIT 1
            `).get({ username: authorUsername, name: displayName });
        }

        if (!author) {
            this.summary.warnings.push('Author "' + displayName + '" could not be imported.');
            return;
        }

        let authorAliases = [sourceLogin, displayName, author.username, author.name]
            .map(authorAlias => slug(WxrUtils.asString(authorAlias)))
            .filter(Boolean);

        for (let authorAlias of authorAliases) {
            this.temp.authors[authorAlias] = author.id;
        }

        let sourceAuthorID = WxrUtils.asString(authorData['wp:author_id']).trim();

        if (sourceAuthorID) {
            this.temp.mapping.authors[sourceAuthorID] = author.id;
        }

        if (newAuthorResult.status === true) {
            this.summary.authors++;
        }

        this.sendProgress('core.wpImport.authorsProgressInfo', {
            progress: index + 1,
            total: totalNumber
        });

        console.log('-> Imported author (' + (index + 1) + ' / ' + totalNumber + '): ' + authorUsername);
    }

    /**
     * Import tags related data
     */
    importTagsData() {
        let channel = this.getChannel();
        let items = [];

        if (this.usedTaxonomy === 'tags' || this.usedTaxonomy === 'both') {
            items.push(...WxrUtils.asArray(channel['wp:tag']).map(data => ({ data, taxonomy: 'tags' })));
        }

        if (this.usedTaxonomy === 'categories' || this.usedTaxonomy === 'both') {
            items.push(...WxrUtils.asArray(channel['wp:category']).map(data => ({ data, taxonomy: 'categories' })));
        }

        for (let i = 0; i < items.length; i++) {
            this.createTag(items[i].data, i, items.length, items[i].taxonomy);
        }
    }

    /**
     * Creates tag
     *
     * @param tagData
     * @param index
     * @param totalNumber
     * @param taxonomy
     */
    createTag(tagData, index, totalNumber, taxonomy = this.usedTaxonomy) {
        let itemName;
        let itemSlug;
        let description;
        let termID = WxrUtils.asString(tagData['wp:term_id']);

        if(taxonomy === 'tags') {
            itemName = WxrUtils.asString(tagData['wp:tag_name']).trim();
            itemSlug = WxrUtils.asString(tagData['wp:tag_slug']).trim();
            description = WxrUtils.asString(tagData['wp:tag_description']);
        } else {
            itemName = WxrUtils.asString(tagData['wp:cat_name']).trim();
            itemSlug = WxrUtils.asString(tagData['wp:category_nicename']).trim();
            description = WxrUtils.asString(tagData['wp:category_description']);
        }

        if (!itemName) {
            return;
        }

        let newItem = new Tag(this.appInstance, {
            id: 0,
            site: this.siteName,
            name: itemName,
            slug: itemSlug,
            description,
            additionalData: {}
        }, false);

        let newItemResult = newItem.save();
        let importedSlug = slug(itemSlug || itemName);
        let importedTag = WxrUtils.asArray(newItemResult.tags).find(tagItem => tagItem.slug === importedSlug);

        if (!importedTag) {
            importedTag = this.appInstance.db.prepare(`
                SELECT id, name, slug FROM tags
                WHERE name = @name OR slug = @slug
                ORDER BY CASE WHEN slug = @slug THEN 0 ELSE 1 END
                LIMIT 1
            `).get({ name: itemName, slug: importedSlug });
        }

        if (!importedTag) {
            this.summary.warnings.push('Tag or category "' + itemName + '" could not be imported.');
            return;
        }

        this.temp.tags[importedSlug] = importedTag.id;
        this.temp.mapping.tags[termID] = importedTag.id;
        this.registerImportedTaxonomyUrl(taxonomy, itemSlug || importedSlug, importedTag.id);

        if (newItemResult.status === true) {
            this.summary.tags++;
        }

        this.sendProgress('core.wpImport.tagsProgressInfo', {
            progress: index + 1,
            total: totalNumber
        });

        console.log('-> Imported tag (' + (index + 1) + ' / ' + totalNumber + '): ' + itemName);
    }

    registerImportedTaxonomyUrl(taxonomy, sourceSlug, importedID) {
        sourceSlug = WxrUtils.asString(sourceSlug).trim().replace(/^\/+|\/+$/g, '');

        if (!this.sourceBaseUrl || !sourceSlug || !importedID) {
            return;
        }

        let prefix = taxonomy === 'categories' ? 'category' : 'tag';
        let sourceUrl = this.sourceBaseUrl + '/' + prefix + '/' + sourceSlug + '/';
        let marker = '#INTERNAL_LINK#/tag/' + importedID;

        for (let sourceVariant of WxrUtils.sourceUrlVariants(sourceUrl, this.sourceBaseUrl + '/')) {
            this.internalUrlMappings.set(sourceVariant, marker);
        }
    }

    /**
     * Import posts data
     */
    importPostsData() {
        let posts = this.getItems().filter(item => {
            let postType = WxrUtils.asString(item['wp:post_type']);
            return postType !== 'page' &&
                !WxrUtils.isWordPressSystemPostType(postType) &&
                this.postTypes.includes(postType);
        });

        if (!posts.length) {
            return;
        }

        let untitledPostsCount = 1;

        for(let i = 0; i < posts.length; i++) {
            let item = posts[i];
            let postTitle = WxrUtils.sanitizeTitle(item.title);

            if (!postTitle) {
                console.log('(!) Empty post title detected - fallback to "Untitled #X" title');
                postTitle = 'Untitled #' + untitledPostsCount++;
                item.title = postTitle;
            }

            let existing = this.getExistingImportedItem(item, false);

            if (existing) {
                this.updateExistingItemAuthor(item, existing.id);
                this.registerImportedItem(item, existing.id, false);
                this.queueMissingImages(item, existing.id);
                this.recordSkippedExistingSeo(item);
                this.summary.skipped.posts++;
                this.sendProgress('core.wpImport.postsProgressInfo', { progress: i + 1, total: posts.length });
                continue;
            }

            let postSlug = WxrUtils.createItemSlug(item, this.slugStrategy) || 'post-' + (this.getSourceID(item) || (i + 1));
            let creationDate = this.getItemTimestamp(item, 'created');
            let postText = this.preparePostText(item['content:encoded'], item);
            let postImages = this.getPostImageReferences(postText);
            let newPost = new Post(this.appInstance, {
                id: 0,
                site: this.siteName,
                title: postTitle,
                slug: postSlug,
                author: this.getItemAuthor(item),
                status: WxrUtils.createPubliiStatus(item, false),
                tags: this.getItemTags(item),
                text: postText,
                creationDate,
                modificationDate: this.getItemTimestamp(item, 'modified', creationDate),
                template: '',
                additionalData: this.createAdditionalData(item, false),
                postViewSettings: {}
            }, false);

            let newPostResult = newPost.save();
            let newPostID = newPostResult.postID;
            let savedPost = this.appInstance.db.prepare('SELECT slug FROM posts WHERE id = @id').get({ id: newPostID });

            this.temp.posts[savedPost ? savedPost.slug : postSlug] = newPostID;
            this.registerImportedItem(item, newPostID, false);
            this.queueSeoCanonical(item, newPostID, false);

            for (let image of postImages) {
                this.queueImage(newPostID, image.url, { gallery: image.gallery });
            }

            let featuredImage = this.getFeaturedPostImage(item);

            if (featuredImage) {
                this.queueImage(newPostID, featuredImage.url, { ...featuredImage, featured: true });
            }

            this.summary.posts++;
            this.sendProgress('core.wpImport.postsProgressInfo', { progress: i + 1, total: posts.length });

            console.log('-> Imported post (' + (i+1) + ' / ' + posts.length + '): ' + postTitle);
        }
    }

    /**
     * Import pages data
     */
    importPagesData() {
        if (this.postTypes.indexOf('page') === -1) {
            console.log('(!) Pages import is disabled');
            return;
        }

        let pages = this.getItems().filter(item => WxrUtils.asString(item['wp:post_type']) === 'page');

        if(!pages.length) {
            console.log('(!) No pages to import');
            return;
        }

        let untitledPagesCount = 1;

        for(let i = 0; i < pages.length; i++) {
            let item = pages[i];
            let pageTitle = WxrUtils.sanitizeTitle(item.title);

            if (!pageTitle) {
                console.log('(!) Empty page title detected - fallback to "Untitled #X" title');
                pageTitle = 'Untitled #' + untitledPagesCount++;
                item.title = pageTitle;
            }

            let existing = this.getExistingImportedItem(item, true);

            if (existing) {
                this.updateExistingItemAuthor(item, existing.id);
                this.registerImportedItem(item, existing.id, true);
                this.recordPageHierarchy(item, existing.id);
                this.queueMissingImages(item, existing.id);
                this.recordSkippedExistingSeo(item);
                this.summary.skipped.pages++;
                this.sendProgress('core.wpImport.pagesProgressInfo', { progress: i + 1, total: pages.length });
                continue;
            }

            let pageSlug = WxrUtils.createItemSlug(item, this.slugStrategy) || 'page-' + (this.getSourceID(item) || (i + 1));
            let creationDate = this.getItemTimestamp(item, 'created');
            let pageText = this.preparePostText(item['content:encoded'], item);
            let pageImages = this.getPostImageReferences(pageText);
            let newPage = new Page(this.appInstance, {
                id: 0,
                site: this.siteName,
                title: pageTitle,
                slug: pageSlug,
                author: this.getItemAuthor(item),
                status: WxrUtils.createPubliiStatus(item, true),
                text: pageText,
                creationDate,
                modificationDate: this.getItemTimestamp(item, 'modified', creationDate),
                template: '',
                additionalData: this.createAdditionalData(item, true),
                pageViewSettings: {}
            }, false);

            let newPageResult = newPage.save();
            let newPageID = newPageResult.pageID;

            let savedPage = this.appInstance.db.prepare('SELECT slug FROM posts WHERE id = @id').get({ id: newPageID });
            this.temp.pages[savedPage ? savedPage.slug : pageSlug] = newPageID;
            this.registerImportedItem(item, newPageID, true);
            this.recordPageHierarchy(item, newPageID, i);
            this.queueSeoCanonical(item, newPageID, true);

            for (let image of pageImages) {
                this.queueImage(newPageID, image.url, { gallery: image.gallery });
            }

            let featuredImage = this.getFeaturedPostImage(item);

            if (featuredImage) {
                this.queueImage(newPageID, featuredImage.url, { ...featuredImage, featured: true });
            }

            this.summary.pages++;
            this.sendProgress('core.wpImport.pagesProgressInfo', { progress: i + 1, total: pages.length });

            console.log('-> Imported page (' + (i+1) + ' / ' + pages.length + '): ' + pageTitle);
        }
    }

    getSourceContentItem(sourceID) {
        sourceID = WxrUtils.asString(sourceID).trim();

        return this.getItems().find(item => {
            return this.getSourceID(item) === sourceID &&
                WxrUtils.asString(item && item['wp:post_type']) !== 'nav_menu_item';
        });
    }

    getSourceTerm(sourceID) {
        sourceID = WxrUtils.asString(sourceID).trim();
        let channel = this.getChannel();
        let terms = [
            ...WxrUtils.asArray(channel['wp:tag']),
            ...WxrUtils.asArray(channel['wp:category']),
            ...WxrUtils.asArray(channel['wp:term'])
        ];

        return terms.find(term => {
            let termID = term && (term['wp:term_id'] || term['wp:tag_id'] || term['wp:category_id']);
            return WxrUtils.asString(termID).trim() === sourceID;
        });
    }

    getSourceTermName(sourceID) {
        let term = this.getSourceTerm(sourceID);

        if (!term) {
            return '';
        }

        return WxrUtils.sanitizeTitle(
            term['wp:term_name'] || term['wp:tag_name'] || term['wp:cat_name'] || ''
        );
    }

    parseMenuCSSClasses(value) {
        value = WxrUtils.asString(value).trim();

        if (!value) {
            return '';
        }

        let classes = [];
        let serializedClass;
        let serializedClassRegexp = /s:\d+:"([^"]*)";/g;

        while ((serializedClass = serializedClassRegexp.exec(value)) !== null) {
            classes.push(serializedClass[1]);
        }

        if (!classes.length && !/^a:\d+:/i.test(value)) {
            classes = value.split(/\s+/);
        }

        return [...new Set(classes
            .flatMap(className => className.split(/\s+/))
            .map(className => className.trim())
            .filter(className => /^[a-zA-Z0-9_-]+$/.test(className))
        )].join(' ');
    }

    getMappedMenuTargetFromURL(sourceUrl) {
        let sourceVariants = WxrUtils.sourceUrlVariants(
            sourceUrl,
            this.sourceBaseUrl ? this.sourceBaseUrl + '/' : ''
        );

        for (let sourceVariant of sourceVariants) {
            let marker = this.internalUrlMappings.get(sourceVariant);
            let markerMatch = WxrUtils.asString(marker).match(/^#INTERNAL_LINK#\/(post|page|tag)\/(\d+)$/);

            if (markerMatch) {
                return {
                    type: markerMatch[1],
                    link: Number(markerMatch[2])
                };
            }
        }

        return null;
    }

    getWordPressSourceRelativeUrl(sourceUrl) {
        if (!this.sourceBaseUrl || !sourceUrl) {
            return null;
        }

        try {
            let source = new URL(sourceUrl, this.sourceBaseUrl + '/');
            let homepage = new URL(this.sourceBaseUrl + '/');
            let sourceHost = source.hostname.toLowerCase().replace(/^www\./, '');
            let homepageHost = homepage.hostname.toLowerCase().replace(/^www\./, '');
            let basePath = homepage.pathname.replace(/\/+$/, '');
            let belongsToBasePath = !basePath || basePath === '/' ||
                source.pathname === basePath || source.pathname.startsWith(basePath + '/');

            if (!['http:', 'https:'].includes(source.protocol) ||
                sourceHost !== homepageHost || source.port !== homepage.port || !belongsToBasePath) {
                return null;
            }

            let relativePath = basePath && basePath !== '/' ? source.pathname.slice(basePath.length) : source.pathname;

            return relativePath.replace(/^\/+/, '') + source.search + source.hash;
        } catch (e) {
            return null;
        }
    }

    isWordPressSearchURL(sourceUrl) {
        if (this.getWordPressSourceRelativeUrl(sourceUrl) === null) {
            return false;
        }

        try {
            let parsed = new URL(sourceUrl, this.sourceBaseUrl + '/');
            return parsed.searchParams.has('s');
        } catch (e) {
            return false;
        }
    }

    isWordPressHomeURL(sourceUrl) {
        if (!this.sourceBaseUrl || !sourceUrl) {
            return false;
        }

        try {
            return this.getWordPressSourceRelativeUrl(sourceUrl) === '';
        } catch (e) {
            return false;
        }
    }

    createFallbackMenuLinkData(sourceUrl, unresolvedReason = 'same-site-menu-path-preserved') {
        sourceUrl = WxrUtils.asString(sourceUrl).trim();
        let mappedTarget = this.getMappedMenuTargetFromURL(sourceUrl);

        if (mappedTarget) {
            return mappedTarget;
        }

        if (sourceUrl[0] === '#') {
            return { type: 'external', link: sourceUrl };
        }

        if (this.isWordPressHomeURL(sourceUrl)) {
            return { type: 'frontpage', link: 'empty' };
        }

        if (!sourceUrl || /^(?:javascript|data|vbscript):/i.test(sourceUrl)) {
            return { type: 'separator', link: '' };
        }

        if (/^(?:mailto|tel):/i.test(sourceUrl)) {
            return { type: 'external', link: sourceUrl };
        }

        let sourceRelativeUrl = this.getWordPressSourceRelativeUrl(sourceUrl);

        if (sourceRelativeUrl !== null) {
            return {
                type: 'internal',
                link: sourceRelativeUrl,
                reportIssue: {
                    url: sourceUrl,
                    targetPath: '/' + sourceRelativeUrl,
                    reason: this.isWordPressSearchURL(sourceUrl) ?
                        'wordpress-search-url' : unresolvedReason
                }
            };
        }

        if (/^(?:https?:)?\/\//i.test(sourceUrl)) {
            return { type: 'external', link: sourceUrl };
        }

        if (/^[a-z][a-z0-9+.-]*:/i.test(sourceUrl)) {
            return { type: 'separator', link: '' };
        }

        return {
            type: 'internal',
            link: sourceUrl.replace(/^\/+/, ''),
            reportIssue: {
                url: sourceUrl,
                targetPath: '/' + sourceUrl.replace(/^\/+/, ''),
                reason: this.isWordPressSearchURL(sourceUrl) ?
                    'wordpress-search-url' : unresolvedReason
            }
        };
    }

    createMenuLinkData(item, postMeta) {
        let sourceType = WxrUtils.asString(postMeta._menu_item_type).trim();
        let sourceObject = WxrUtils.asString(postMeta._menu_item_object).trim();
        let sourceObjectID = WxrUtils.asString(postMeta._menu_item_object_id).trim();

        if (sourceType === 'post_type') {
            let isPage = sourceObject === 'page';
            let importedID = this.temp.mapping[isPage ? 'pages' : 'posts'][sourceObjectID];

            if (importedID) {
                return {
                    type: isPage ? 'page' : 'post',
                    link: Number(importedID)
                };
            }

            let sourceItem = this.getSourceContentItem(sourceObjectID);
            let sourceLink = WxrUtils.asString(sourceItem && sourceItem.link).trim();

            return sourceLink ?
                this.createFallbackMenuLinkData(sourceLink, 'menu-target-not-imported') :
                { type: 'separator', link: '' };
        }

        if (sourceType === 'taxonomy') {
            let importedTagID = this.temp.mapping.tags[sourceObjectID];

            if (importedTagID) {
                return { type: 'tag', link: Number(importedTagID) };
            }

            let sourceTerm = this.getSourceTerm(sourceObjectID);
            let sourceTermSlug = WxrUtils.asString(sourceTerm && (
                sourceTerm['wp:term_slug'] || sourceTerm['wp:tag_slug'] || sourceTerm['wp:category_nicename']
            )).trim();

            if (sourceTermSlug && ['category', 'post_tag'].includes(sourceObject)) {
                let prefix = sourceObject === 'category' ? 'category' : 'tag';
                return this.createFallbackMenuLinkData(
                    this.sourceBaseUrl + '/' + prefix + '/' + sourceTermSlug + '/',
                    'taxonomy-not-imported'
                );
            }

            return { type: 'separator', link: '' };
        }

        if (sourceType === 'post_type_archive') {
            return sourceObject === 'post' ?
                { type: 'blogpage', link: 'empty' } :
                { type: 'separator', link: '' };
        }

        let sourceUrl = WxrUtils.asString(postMeta._menu_item_url).trim();
        return this.createFallbackMenuLinkData(sourceUrl);
    }

    recordMenuLinkIssue(menuDefinition, sourceID, label, issue) {
        if (!issue || !issue.url) {
            return;
        }

        let key = menuDefinition.slug + '|' + sourceID + '|' + issue.url + '|' + issue.reason;

        if (this.menuLinkIssueKeys.has(key)) {
            return;
        }

        this.menuLinkIssueKeys.add(key);
        this.menuLinkIssues.push({
            itemID: sourceID,
            sourceID,
            itemType: 'menu',
            menuName: menuDefinition.name,
            title: label,
            url: issue.url,
            targetPath: issue.targetPath || '',
            reason: issue.reason || 'not-mapped-to-imported-content'
        });
    }

    createMenuItemLabel(item, postMeta, linkData) {
        let label = WxrUtils.sanitizeTitle(item && item.title);

        if (label) {
            return label;
        }

        let sourceObjectID = WxrUtils.asString(postMeta._menu_item_object_id).trim();

        if (WxrUtils.asString(postMeta._menu_item_type) === 'post_type') {
            let sourceItem = this.getSourceContentItem(sourceObjectID);
            label = WxrUtils.sanitizeTitle(sourceItem && sourceItem.title);
        } else if (WxrUtils.asString(postMeta._menu_item_type) === 'taxonomy') {
            label = this.getSourceTermName(sourceObjectID);
        }

        if (!label && ['post', 'page'].includes(linkData.type)) {
            let row = this.appInstance.db.prepare('SELECT title FROM posts WHERE id = @id').get({ id: linkData.link });
            label = WxrUtils.sanitizeTitle(row && row.title);
        }

        if (!label && linkData.type === 'tag') {
            let row = this.appInstance.db.prepare('SELECT name FROM tags WHERE id = @id').get({ id: linkData.link });
            label = WxrUtils.sanitizeTitle(row && row.name);
        }

        return label || 'Untitled menu item';
    }

    collectMenuItemIDs(items, usedIDs, importedIDs = null) {
        for (let item of WxrUtils.asArray(items)) {
            let itemID = Number(item && item.id);

            if (Number.isSafeInteger(itemID) && itemID > 0) {
                usedIDs.add(itemID);
            }

            if (importedIDs && item && item.wpImport && item.wpImport.id) {
                importedIDs.set(WxrUtils.asString(item.wpImport.id), itemID);
            }

            this.collectMenuItemIDs(item && item.items, usedIDs, importedIDs);
        }
    }

    buildImportedMenuItems(menuDefinition, existingMenu, allocateID) {
        let records = this.getMenuItems().map((item, index) => {
            let menuCategory = this.getMenuCategory(item);
            let menuSlug = slug(WxrUtils.asString(menuCategory && (menuCategory['@_nicename'] || menuCategory)));

            if (menuSlug !== menuDefinition.slug) {
                return null;
            }

            let postMeta = WxrUtils.getPostMeta(item);
            let sourceID = this.getSourceID(item) || menuDefinition.slug + '-' + index;
            let linkData = this.createMenuLinkData(item, postMeta);
            let label = this.createMenuItemLabel(item, postMeta, linkData);

            this.recordMenuLinkIssue(menuDefinition, sourceID, label, linkData.reportIssue);

            return {
                sourceID,
                parentSourceID: WxrUtils.asString(postMeta._menu_item_menu_item_parent).trim(),
                order: Number.parseInt(WxrUtils.asString(item['wp:menu_order']), 10) || 0,
                index,
                data: {
                    label,
                    title: WxrUtils.sanitizeTitle(item['excerpt:encoded']),
                    type: linkData.type,
                    target: postMeta._menu_item_target === '_blank' ? '_blank' : '_self',
                    rel: WxrUtils.sanitizeTitle(postMeta._menu_item_xfn),
                    link: linkData.link,
                    cssClass: this.parseMenuCSSClasses(postMeta._menu_item_classes),
                    isHidden: WxrUtils.asString(item['wp:status']).toLowerCase() !== 'publish'
                }
            };
        }).filter(Boolean);
        let existingImportedIDs = new Map();
        let ignoredUsedIDs = new Set();
        this.collectMenuItemIDs(existingMenu && existingMenu.items, ignoredUsedIDs, existingImportedIDs);
        let recordsByID = new Map(records.map(record => [record.sourceID, record]));
        let children = new Map();

        for (let record of records) {
            if (!children.has(record.parentSourceID)) {
                children.set(record.parentSourceID, []);
            }

            children.get(record.parentSourceID).push(record);
        }

        let sortRecords = items => items.sort((a, b) => a.order - b.order || a.index - b.index);
        let built = new Set();
        let buildNode = (record, ancestors = new Set()) => {
            if (!record || ancestors.has(record.sourceID) || built.has(record.sourceID)) {
                return null;
            }

            let nextAncestors = new Set(ancestors);
            nextAncestors.add(record.sourceID);
            built.add(record.sourceID);

            return {
                id: existingImportedIDs.get(record.sourceID) || allocateID(),
                ...record.data,
                items: sortRecords(children.get(record.sourceID) || [])
                    .map(child => buildNode(child, nextAncestors))
                    .filter(Boolean),
                wpImport: {
                    source: this.sourceBaseUrl,
                    id: record.sourceID
                }
            };
        };
        let roots = sortRecords(records.filter(record => {
            return !record.parentSourceID || record.parentSourceID === '0' || !recordsByID.has(record.parentSourceID);
        })).map(record => buildNode(record)).filter(Boolean);

        for (let record of sortRecords([...records])) {
            if (!built.has(record.sourceID)) {
                let node = buildNode(record);

                if (node) {
                    roots.push(node);
                }
            }
        }

        return roots;
    }

    createUniqueMenuName(name, usedNames) {
        let candidate = name;
        let suffix = 1;

        while (usedNames.has(candidate.toLowerCase())) {
            candidate = name + ' (WordPress' + (suffix > 1 ? ' ' + suffix : '') + ')';
            suffix++;
        }

        usedNames.add(candidate.toLowerCase());
        return candidate;
    }

    importMenusData() {
        if (!this.importMenus) {
            console.log('(!) Menus import is disabled');
            return;
        }

        let menuDefinitions = this.getMenuDefinitions();

        if (!menuDefinitions.length) {
            return;
        }

        let configDir = path.join(this.appInstance.sitesDir, this.siteName, 'input', 'config');
        let menuFile = path.join(configDir, 'menu.config.json');
        let existingMenus = [];

        try {
            if (fs.existsSync(menuFile)) {
                existingMenus = JSON.parse(fs.readFileSync(menuFile, 'utf8'));

                if (!Array.isArray(existingMenus)) {
                    throw new Error('Menu configuration is not an array.');
                }
            }
        } catch (e) {
            this.summary.warnings.push('Navigation menus could not be imported because menu.config.json is invalid.');
            return;
        }

        let source = this.sourceBaseUrl.replace(/\/$/, '');
        let existingByImportKey = new Map();
        let usedIDs = new Set();
        let usedNames = new Set(existingMenus.map(menu => WxrUtils.asString(menu && menu.name).toLowerCase()));

        for (let index = 0; index < existingMenus.length; index++) {
            let menu = existingMenus[index];
            this.collectMenuItemIDs(menu && menu.items, usedIDs);

            if (menu && menu.wpImport && menu.wpImport.type === 'wordpress-menu') {
                let menuSource = WxrUtils.asString(menu.wpImport.source).replace(/\/$/, '');
                let menuSlug = slug(WxrUtils.asString(menu.wpImport.slug));

                if (menuSource && menuSlug) {
                    existingByImportKey.set(menuSource + '|' + menuSlug, index);
                }
            }
        }

        let nextID = Date.now() + 1;

        for (let usedID of usedIDs) {
            if (usedID >= nextID) {
                nextID = usedID + 1;
            }
        }

        let allocateID = () => {
            while (usedIDs.has(nextID)) {
                nextID++;
            }

            let id = nextID++;
            usedIDs.add(id);
            return id;
        };

        for (let index = 0; index < menuDefinitions.length; index++) {
            let definition = menuDefinitions[index];
            let importKey = source + '|' + definition.slug;
            let existingIndex = existingByImportKey.has(importKey) ? existingByImportKey.get(importKey) : -1;
            let existingMenu = existingIndex > -1 ? existingMenus[existingIndex] : null;
            let menuName = existingMenu && existingMenu.name ?
                existingMenu.name :
                this.createUniqueMenuName(definition.name, usedNames);
            let importedMenu = {
                ...(existingMenu || {}),
                name: menuName,
                position: existingMenu && typeof existingMenu.position === 'string' ? existingMenu.position : '',
                items: this.buildImportedMenuItems(definition, existingMenu, allocateID),
                wpImport: {
                    type: 'wordpress-menu',
                    source,
                    slug: definition.slug
                }
            };

            if (existingIndex > -1) {
                existingMenus[existingIndex] = importedMenu;
            } else {
                existingMenus.push(importedMenu);
            }

            this.summary.menus++;
            this.summary.menuItems += importedMenu.items.reduce(function countItems(total, item) {
                return total + 1 + WxrUtils.asArray(item.items).reduce(countItems, 0);
            }, 0);
            this.sendProgress('core.wpImport.menusProgressInfo', {
                progress: index + 1,
                total: menuDefinitions.length
            });
            console.log('-> Imported menu (' + (index + 1) + ' / ' + menuDefinitions.length + '): ' + menuName);
        }

        let temporaryFile = menuFile + '.importing';
        fs.mkdirSync(configDir, { recursive: true });
        fs.writeFileSync(temporaryFile, JSON.stringify(existingMenus, null, 4), 'utf8');
        fs.renameSync(temporaryFile, menuFile);
    }

    /**
     * Create array with all available images for download
     */
    getImageURLs() {
        let items = this.getItems().filter(item => WxrUtils.asString(item['wp:post_type']) === 'attachment');

        for (let item of items) {
            let attachmentID = this.getSourceID(item);
            let postMeta = WxrUtils.getPostMeta(item);
            let attachmentUrl = WxrUtils.asString(item['wp:attachment_url'] || item.guid).trim();

            if (!attachmentID || !attachmentUrl) {
                continue;
            }

            this.temp.images[attachmentID] = {
                sourceID: attachmentID,
                url: attachmentUrl,
                alt: postMeta._wp_attachment_image_alt || '',
                caption: WxrUtils.asString(item['excerpt:encoded']),
                title: WxrUtils.asString(item.title),
                credits: '',
                parentID: WxrUtils.asString(item['wp:post_parent']).trim(),
                menuOrder: Number(WxrUtils.asString(item['wp:menu_order'])) || 0
            };
        }
    }

    parseGalleryShortcodeAttributes(attributesText) {
        let attributes = {};
        let attributeRegexp = /([a-z][a-z0-9_-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"']+))/gmi;
        let match;

        while ((match = attributeRegexp.exec(WxrUtils.asString(attributesText))) !== null) {
            attributes[match[1].toLowerCase()] = match[2] || match[3] || match[4] || '';
        }

        return attributes;
    }

    replaceGalleryShortcodes(text, item) {
        if (typeof text !== 'string' || !/\[gallery\b/i.test(text)) {
            return text;
        }

        let sourcePostID = this.getSourceID(item);

        return text.replace(/\[gallery\b([^\]]*)\](?:\s*\[\/gallery\])?/gmi, (shortcode, attributesText) => {
            let attributes = this.parseGalleryShortcodeAttributes(attributesText);
            let explicitIDs = WxrUtils.asString(attributes.ids || attributes.include)
                .split(',')
                .map(id => id.trim())
                .filter(Boolean);
            let excludedIDs = new Set(
                WxrUtils.asString(attributes.exclude)
                    .split(',')
                    .map(id => id.trim())
                    .filter(Boolean)
            );
            let images;

            if (explicitIDs.length) {
                images = explicitIDs.map(id => this.temp.images[id]).filter(Boolean);
            } else {
                images = this.temp.images
                    .filter(image => image && image.parentID === sourcePostID)
                    .sort((first, second) => {
                        return first.menuOrder - second.menuOrder || Number(first.sourceID) - Number(second.sourceID);
                    });

                if (WxrUtils.asString(attributes.order).toLowerCase() === 'desc') {
                    images.reverse();
                }
            }

            images = images.filter(image => !excludedIDs.has(WxrUtils.asString(image.sourceID)));

            if (!images.length) {
                return shortcode;
            }

            return WxrUtils.createPubliiGalleryMarkup(images, attributes.columns);
        });
    }

    /**
     * Retrieve images connected with a given post text
     *
     * @param postText
     */
    getPostImages(postText) {
        return WxrUtils.getImageUrls(WxrUtils.asString(postText));
    }

    /**
     * Retrieve images and whether they belong to a Publii gallery.
     *
     * @param postText
     * @returns {Array<{url: string, gallery: boolean}>}
     */
    getPostImageReferences(postText) {
        return WxrUtils.getImageReferences(WxrUtils.asString(postText));
    }

    /**
     * Retrieve featured post image
     *
     * @param postObject
     * @returns {boolean}
     */
    getFeaturedPostImage(postObject) {
        let featuredImageID = WxrUtils.getPostMeta(postObject)._thumbnail_id;
        return featuredImageID ? this.temp.images[featuredImageID] || null : null;
    }

    queueImage(postID, sourceUrl, imageData = {}) {
        let remoteUrl = WxrUtils.resolveRemoteUrl(sourceUrl, this.sourceBaseUrl ? this.sourceBaseUrl + '/' : '');
        let isGalleryImage = imageData.gallery === true;

        if (!remoteUrl) {
            this.summary.imageErrors.push({
                url: WxrUtils.asString(sourceUrl),
                reason: 'Invalid URL',
                postID: Number(postID) || 0
            });
            return;
        }

        if (!this.temp.imagesQueue[postID]) {
            this.temp.imagesQueue[postID] = [];
            this.usedMediaFilenames[postID] = new Set();
        }

        let existing = this.temp.imagesQueue[postID].find(item => {
            return item.remoteUrl === remoteUrl && item.gallery === isGalleryImage;
        });

        if (existing) {
            existing.featured = existing.featured || imageData.featured === true;
            existing.alt = existing.alt || imageData.alt || '';
            existing.caption = existing.caption || imageData.caption || '';
            existing.title = existing.title || imageData.title || '';
            existing.credits = existing.credits || imageData.credits || '';
            return;
        }

        this.temp.imagesQueue[postID].push({
            postID: Number(postID),
            sourceUrl: WxrUtils.asString(sourceUrl),
            remoteUrl,
            filename: WxrUtils.createMediaFilename(remoteUrl, this.usedMediaFilenames[postID]),
            featured: imageData.featured === true,
            gallery: isGalleryImage,
            alt: imageData.alt || '',
            caption: imageData.caption || '',
            title: imageData.title || '',
            credits: imageData.credits || ''
        });
    }

    queueMissingImages(item, postID) {
        let row = this.appInstance.db.prepare(`
            SELECT text, featured_image_id AS featuredImageID FROM posts WHERE id = @id
        `).get({ id: postID });

        if (!row) {
            return;
        }

        let normalizedText = this.replaceGalleryShortcodes(WxrUtils.asString(item['content:encoded']), item);
        normalizedText = WxrUtils.normalizeWordPressImageMarkup(normalizedText);

        for (let image of this.getPostImageReferences(normalizedText)) {
            let remoteUrl = WxrUtils.resolveRemoteUrl(image.url, this.sourceBaseUrl ? this.sourceBaseUrl + '/' : '');

            if ((row.text || '').includes(image.url) || (remoteUrl && (row.text || '').includes(remoteUrl))) {
                this.queueImage(postID, image.url, { gallery: image.gallery });
            }
        }

        let featuredImage = this.getFeaturedPostImage(item);

        if (featuredImage && !Number(row.featuredImageID)) {
            this.queueImage(postID, featuredImage.url, { ...featuredImage, featured: true });
        }
    }

    registerImportedItem(item, newID, isPage) {
        let sourceID = this.getSourceID(item);
        let type = isPage ? 'page' : 'post';
        let importKey = this.getImportKey(item);

        if (sourceID) {
            this.temp.mapping[isPage ? 'pages' : 'posts'][sourceID] = newID;
        }

        if (importKey) {
            this.existingImportedItems.set(importKey, {
                id: newID,
                isPage
            });
        }

        let importedIDs = isPage ? this.importedPageIDs : this.importedPostIDs;

        if (!importedIDs.includes(newID)) {
            importedIDs.push(newID);
        }

        let marker = '#INTERNAL_LINK#/' + type + '/' + newID;
        let sourceLink = WxrUtils.asString(item.link).trim();

        for (let sourceVariant of WxrUtils.sourceUrlVariants(sourceLink, this.sourceBaseUrl ? this.sourceBaseUrl + '/' : '')) {
            this.internalUrlMappings.set(sourceVariant, marker);
        }
    }

    rewriteImportedInternalLinks() {
        let importedIDs = [...this.importedPostIDs, ...this.importedPageIDs];

        if (this.sourceBaseUrl) {
            for (let sourceVariant of WxrUtils.sourceUrlVariants(
                this.sourceBaseUrl + '/',
                this.sourceBaseUrl + '/'
            )) {
                this.internalUrlMappings.set(sourceVariant, '#INTERNAL_LINK#/frontpage/1');
            }
        }

        let mappings = [...this.internalUrlMappings.entries()].sort((a, b) => b[0].length - a[0].length);

        if (!importedIDs.length || !mappings.length) {
            return;
        }

        for (let postID of importedIDs) {
            let row = this.appInstance.db.prepare('SELECT text FROM posts WHERE id = @id').get({ id: postID });
            let text = row ? row.text || '' : '';
            let updatedText = text;

            for (let [sourceUrl, marker] of mappings) {
                updatedText = WxrUtils.replaceInternalUrl(updatedText, sourceUrl, marker);
            }

            if (updatedText !== text) {
                this.appInstance.db.prepare('UPDATE posts SET text = @text WHERE id = @id').run({
                    id: postID,
                    text: updatedText
                });
            }
        }
    }

    getImportedReportItems() {
        let reportItems = [];
        let query = this.appInstance.db.prepare(`
            SELECT id, title, slug, text, status FROM posts WHERE id = @id
        `);

        for (let item of this.getItems()) {
            let postType = WxrUtils.asString(item && item['wp:post_type']);
            let isPage = postType === 'page';
            let isSelected = isPage ? this.postTypes.includes('page') : this.postTypes.includes(postType);

            if (!isSelected || ['attachment', 'nav_menu_item'].includes(postType)) {
                continue;
            }

            let sourceID = this.getSourceID(item);
            let newID = this.temp.mapping[isPage ? 'pages' : 'posts'][sourceID];

            if (!newID) {
                continue;
            }

            let row = query.get({ id: Number(newID) });

            if (!row) {
                continue;
            }

            reportItems.push({
                item,
                sourceID,
                postType,
                isPage,
                newID: Number(newID),
                title: WxrUtils.sanitizeTitle(row.title),
                slug: WxrUtils.asString(row.slug),
                text: WxrUtils.asString(row.text),
                status: WxrUtils.asString(row.status),
                sourceUrl: WxrUtils.asString(item.link).trim()
            });
        }

        return reportItems;
    }

    getReportUrlSettings() {
        let siteConfig = this.appInstance && this.appInstance.sites ?
            this.appInstance.sites[this.siteName] || {} : {};
        let advanced = siteConfig.advanced || {};
        let urls = advanced.urls || {};
        let deployment = siteConfig.deployment || {};
        let domain = WxrUtils.asString(siteConfig.domain).replace(/\/$/, '');

        return {
            domain,
            relativeUrls: deployment.relativeUrls === true,
            cleanUrls: urls.cleanUrls === true,
            addIndex: urls.addIndex === true,
            postsPrefix: WxrUtils.asString(urls.postsPrefix).replace(/^\/+|\/+$/g, ''),
            usePageAsFrontpage: advanced.usePageAsFrontpage === true,
            pageAsFrontpage: Number(advanced.pageAsFrontpage) || 0
        };
    }

    getPageTargetSlugs(reportItem, reportItems) {
        let hierarchyBySourceID = new Map(this.pageHierarchyItems.map(item => [item.oldID, item]));
        let itemByNewID = new Map(reportItems.filter(item => item.isPage).map(item => [item.newID, item]));
        let hierarchyItem = hierarchyBySourceID.get(reportItem.sourceID);
        let parentSlugs = [];
        let visited = new Set([reportItem.sourceID]);

        while (hierarchyItem && hierarchyItem.oldParent && !visited.has(hierarchyItem.oldParent)) {
            visited.add(hierarchyItem.oldParent);
            let parentHierarchyItem = hierarchyBySourceID.get(hierarchyItem.oldParent);

            if (!parentHierarchyItem) {
                break;
            }

            let parentItem = itemByNewID.get(parentHierarchyItem.newID);

            if (parentItem && parentItem.slug) {
                parentSlugs.unshift(parentItem.slug);
            }

            hierarchyItem = parentHierarchyItem;
        }

        return parentSlugs.concat(reportItem.slug);
    }

    createReportTargetPath(reportItem, reportItems, settings) {
        if (reportItem.isPage && settings.usePageAsFrontpage && settings.pageAsFrontpage === reportItem.newID) {
            return settings.addIndex ? '/index.html' : '/';
        }

        if (!settings.cleanUrls) {
            let prefix = !reportItem.isPage && settings.postsPrefix ? settings.postsPrefix + '/' : '';
            return '/' + prefix + reportItem.slug + '.html';
        }

        let segments = reportItem.isPage ?
            this.getPageTargetSlugs(reportItem, reportItems) :
            [settings.postsPrefix, reportItem.slug].filter(Boolean);
        let targetPath = '/' + segments.filter(Boolean).join('/') + '/';

        return settings.addIndex ? targetPath + 'index.html' : targetPath;
    }

    getReportAbsoluteUrl(targetPath, settings) {
        if (settings.relativeUrls || !settings.domain || settings.domain === '/' || settings.domain === '.') {
            return '';
        }

        return settings.domain + (targetPath.startsWith('/') ? targetPath : '/' + targetPath);
    }

    getSeoComparableUrl(value) {
        try {
            let parsed = new URL(value);

            if (!['http:', 'https:'].includes(parsed.protocol)) {
                return '';
            }

            let hostname = parsed.hostname.toLowerCase().replace(/^www\./, '');
            let port = parsed.port ? ':' + parsed.port : '';
            let pathname = (parsed.pathname || '/').replace(/\/+$/, '') || '/';

            return hostname + port + pathname + parsed.search;
        } catch (e) {
            return '';
        }
    }

    getSeoAbsoluteUrl(targetPath, settings) {
        let domain = WxrUtils.asString(settings && settings.domain).replace(/\/$/, '');

        if (domain.startsWith('//')) {
            domain = 'https:' + domain;
        }

        try {
            let parsed = new URL(domain);

            if (!['http:', 'https:'].includes(parsed.protocol)) {
                return '';
            }

            return domain + (targetPath.startsWith('/') ? targetPath : '/' + targetPath);
        } catch (e) {
            return '';
        }
    }

    isSourceSeoUrl(value) {
        try {
            let sourceBase = new URL(this.sourceBaseUrl + '/');
            let parsed = new URL(value);
            let sourceHost = sourceBase.hostname.toLowerCase().replace(/^www\./, '');
            let parsedHost = parsed.hostname.toLowerCase().replace(/^www\./, '');
            let basePath = sourceBase.pathname.replace(/\/+$/, '');

            return parsedHost === sourceHost && (!basePath || basePath === '/' ||
                parsed.pathname === basePath || parsed.pathname.startsWith(basePath + '/'));
        } catch (e) {
            return false;
        }
    }

    updateImportedAdditionalData(postID, values) {
        let row = this.appInstance.db.prepare(`
            SELECT value FROM posts_additional_data WHERE post_id = @postID AND key = '_core'
        `).get({ postID });

        if (!row) {
            return false;
        }

        try {
            let additionalData = JSON.parse(row.value || '{}');
            Object.assign(additionalData, values);
            this.appInstance.db.prepare(`
                UPDATE posts_additional_data SET value = @value
                WHERE post_id = @postID AND key = '_core'
            `).run({
                postID,
                value: JSON.stringify(additionalData)
            });
            return true;
        } catch (e) {
            return false;
        }
    }

    applyImportedSeoCanonicals() {
        if (!this.pendingSeoCanonicals.length) {
            return;
        }

        let reportItems = this.getImportedReportItems();
        let settings = this.getReportUrlSettings();
        let reportItemsBySourceUrl = new Map();

        for (let reportItem of reportItems) {
            let comparable = this.getSeoComparableUrl(reportItem.sourceUrl);

            if (comparable) {
                reportItemsBySourceUrl.set(comparable, reportItem);
            }
        }

        for (let pending of this.pendingSeoCanonicals) {
            let sourceUrl = WxrUtils.asString(pending.item && pending.item.link).trim();
            let canonicalUrl = WxrUtils.asString(pending.url).trim();
            let comparableCanonical = this.getSeoComparableUrl(canonicalUrl);

            if (!comparableCanonical) {
                this.recordSeoIssue(pending.item, 'canonical', 'invalid-canonical-url', canonicalUrl);
                continue;
            }

            if (comparableCanonical === this.getSeoComparableUrl(sourceUrl)) {
                continue;
            }

            if (WxrUtils.asString(pending.robots).includes('noindex')) {
                this.recordSeoIssue(pending.item, 'canonical', 'canonical-conflicts-with-noindex', canonicalUrl);
                continue;
            }

            let finalCanonical = canonicalUrl;

            if (this.isSourceSeoUrl(canonicalUrl)) {
                let targetItem = reportItemsBySourceUrl.get(comparableCanonical);

                if (!targetItem) {
                    this.recordSeoIssue(pending.item, 'canonical', 'internal-canonical-not-resolved', canonicalUrl);
                    continue;
                }

                let targetPath = this.createReportTargetPath(targetItem, reportItems, settings);
                finalCanonical = this.getSeoAbsoluteUrl(targetPath, settings);

                if (!finalCanonical) {
                    this.recordSeoIssue(pending.item, 'canonical', 'internal-canonical-needs-domain', canonicalUrl);
                    continue;
                }
            }

            try {
                let parsed = new URL(finalCanonical);
                parsed.hash = '';
                finalCanonical = parsed.toString();
            } catch (e) {
                this.recordSeoIssue(pending.item, 'canonical', 'invalid-canonical-url', canonicalUrl);
                continue;
            }

            if (!this.updateImportedAdditionalData(pending.postID, { canonicalUrl: finalCanonical })) {
                this.recordSeoIssue(pending.item, 'canonical', 'canonical-save-failed', canonicalUrl);
                continue;
            }

            this.summary.seo.imported.canonicals++;
        }
    }

    parseReportSourceUrl(sourceUrl) {
        try {
            let parsed = new URL(sourceUrl, this.sourceBaseUrl ? this.sourceBaseUrl + '/' : undefined);

            if (!['http:', 'https:'].includes(parsed.protocol)) {
                return null;
            }

            return {
                url: parsed.toString(),
                origin: parsed.origin,
                path: (parsed.pathname || '/') + parsed.search
            };
        } catch (e) {
            return null;
        }
    }

    createOldSlugUrl(sourceUrl, oldSlug) {
        try {
            let parsed = new URL(sourceUrl);
            let segments = parsed.pathname.split('/').filter(Boolean);

            if (!segments.length) {
                return '';
            }

            segments[segments.length - 1] = slug(oldSlug);
            parsed.pathname = '/' + segments.join('/') + (parsed.pathname.endsWith('/') ? '/' : '');
            parsed.search = '';
            parsed.hash = '';

            return parsed.toString();
        } catch (e) {
            return '';
        }
    }

    buildRedirectMap(reportItems, settings) {
        let redirects = [];
        let conflicts = [];
        let redirectsBySourcePath = new Map();
        let targetOrigin = '';

        try {
            if (!settings.relativeUrls && settings.domain) {
                targetOrigin = new URL(
                    settings.domain.startsWith('//') ? 'https:' + settings.domain : settings.domain
                ).origin;
            }
        } catch (e) {
            targetOrigin = '';
        }

        let addRedirect = (reportItem, sourceUrl, sourceKind) => {
            let source = this.parseReportSourceUrl(sourceUrl);

            if (!source) {
                return;
            }

            let targetPath = this.createReportTargetPath(reportItem, reportItems, settings);
            let targetUrl = this.getReportAbsoluteUrl(targetPath, settings);
            let targetComparisonPath = targetPath;
            let sourceStatus = WxrUtils.asString(reportItem.item && reportItem.item['wp:status']).trim().toLowerCase();
            let active = sourceStatus === 'publish' &&
                WxrUtils.asString(reportItem.status).split(',').includes('published');

            try {
                if (targetUrl) {
                    let comparableTargetUrl = targetUrl.startsWith('//') ? 'https:' + targetUrl : targetUrl;
                    let parsedTarget = new URL(comparableTargetUrl);
                    targetComparisonPath = parsedTarget.pathname + parsedTarget.search;
                }
            } catch (e) {
                targetComparisonPath = targetPath;
            }

            let needed = source.path !== targetComparisonPath || (!!targetOrigin && source.origin !== targetOrigin);
            let entry = {
                sourceUrl: source.url,
                sourcePath: source.path,
                targetUrl,
                targetPath,
                needed,
                active,
                sourceStatus,
                sourceKind,
                itemID: reportItem.newID,
                sourceID: reportItem.sourceID,
                itemType: reportItem.isPage ? 'page' : 'post',
                title: reportItem.title
            };
            let existing = redirectsBySourcePath.get(source.path);

            if (existing) {
                if (existing.targetPath !== targetPath) {
                    conflicts.push({
                        sourcePath: source.path,
                        firstTarget: existing.targetPath,
                        secondTarget: targetPath,
                        firstTitle: existing.title,
                        secondTitle: reportItem.title
                    });
                }

                return;
            }

            redirectsBySourcePath.set(source.path, entry);
            redirects.push(entry);
        };

        for (let reportItem of reportItems) {
            addRedirect(reportItem, reportItem.sourceUrl, 'permalink');

            for (let oldSlug of WxrUtils.getPostMetaValues(reportItem.item, '_wp_old_slug')) {
                let oldSlugUrl = this.createOldSlugUrl(reportItem.sourceUrl, oldSlug);

                if (oldSlugUrl) {
                    addRedirect(reportItem, oldSlugUrl, 'old-slug');
                }
            }
        }

        redirects.sort((a, b) => a.sourcePath.localeCompare(b.sourcePath));

        return { redirects, conflicts };
    }

    classifyUnimportedMediaLink(link) {
        try {
            let parsed = new URL(link, this.sourceBaseUrl ? this.sourceBaseUrl + '/' : undefined);
            let belongsToWordPress = this.getWordPressSourceRelativeUrl(link) !== null ||
                /\/wp-content\/uploads\//i.test(parsed.pathname);

            if (!belongsToWordPress) {
                return null;
            }

            let filename = decodeURIComponent(parsed.pathname.split('/').pop() || '');
            let extensionMatch = filename.match(/\.([a-zA-Z0-9]{2,8})$/);

            if (!extensionMatch) {
                return null;
            }

            let extension = extensionMatch[1].toLowerCase();

            for (let [mediaType, extensions] of Object.entries(UNIMPORTED_MEDIA_EXTENSIONS)) {
                if (extensions.has(extension)) {
                    return { mediaType, extension };
                }
            }
        } catch (e) {
            return null;
        }

        return null;
    }

    isUnresolvedSourceLink(link) {
        if (!link || link.startsWith('#') || link.startsWith('#INTERNAL_LINK#/')) {
            return false;
        }

        return this.getWordPressSourceRelativeUrl(link) !== null;
    }

    buildImportReport() {
        let reportItems = this.getImportedReportItems();
        let settings = this.getReportUrlSettings();
        let unsupportedShortcodes = [];
        let unsupportedShortcodeKeys = new Map();
        let dynamicBlocks = [];
        let unimportedMedia = [];
        let unimportedMediaKeys = new Set();
        let unresolvedLinks = [];
        let unresolvedLinkKeys = new Set();

        for (let reportItem of reportItems) {
            let itemData = {
                itemID: reportItem.newID,
                sourceID: reportItem.sourceID,
                itemType: reportItem.isPage ? 'page' : 'post',
                title: reportItem.title,
                sourceUrl: reportItem.sourceUrl
            };

            for (let shortcode of WxrUtils.extractShortcodes(reportItem.text)) {
                let key = reportItem.newID + '|' + shortcode.name + '|' + shortcode.markup;
                let existingShortcode = unsupportedShortcodeKeys.get(key);

                if (existingShortcode) {
                    existingShortcode.occurrences += 1;
                    continue;
                }

                let unsupportedShortcode = {
                    ...itemData,
                    name: shortcode.name,
                    markup: shortcode.markup,
                    occurrences: 1
                };

                unsupportedShortcodeKeys.set(key, unsupportedShortcode);
                unsupportedShortcodes.push(unsupportedShortcode);
            }

            for (let block of WxrUtils.extractWordPressBlocks(reportItem.text)) {
                if (!DYNAMIC_WORDPRESS_BLOCKS.has(block.name) && !block.name.includes('/')) {
                    continue;
                }

                dynamicBlocks.push({
                    ...itemData,
                    name: block.name,
                    markup: block.markup
                });
            }

            for (let link of WxrUtils.extractLinkUrls(reportItem.text)) {
                let media = this.classifyUnimportedMediaLink(link);

                if (media) {
                    let mediaKey = reportItem.newID + '|' + link;

                    if (!unimportedMediaKeys.has(mediaKey)) {
                        unimportedMediaKeys.add(mediaKey);
                        unimportedMedia.push({
                            ...itemData,
                            url: link,
                            mediaType: media.mediaType,
                            extension: media.extension,
                            reason: 'linked-media-not-imported'
                        });
                    }

                    continue;
                }

                if (!this.isUnresolvedSourceLink(link)) {
                    continue;
                }

                let key = reportItem.newID + '|' + link;

                if (unresolvedLinkKeys.has(key)) {
                    continue;
                }

                unresolvedLinkKeys.add(key);
                unresolvedLinks.push({
                    ...itemData,
                    url: link,
                    reason: this.isWordPressSearchURL(link) ?
                        'wordpress-search-url' : 'not-mapped-to-imported-content'
                });
            }
        }

        for (let menuIssue of this.menuLinkIssues) {
            let key = 'menu|' + menuIssue.sourceID + '|' + menuIssue.url + '|' + menuIssue.reason;

            if (!unresolvedLinkKeys.has(key)) {
                unresolvedLinkKeys.add(key);
                unresolvedLinks.push({ ...menuIssue });
            }
        }

        let redirectData = this.buildRedirectMap(reportItems, settings);
        let reportItemsBySource = new Map(reportItems.map(item => [
            (item.isPage ? 'page' : 'post') + '|' + item.sourceID,
            item
        ]));
        let seo = {
            requestedProvider: this.summary.seo.requestedProvider,
            provider: this.summary.seo.provider,
            detectedProviders: this.summary.seo.detectedProviders.slice(),
            imported: { ...this.summary.seo.imported },
            skippedExisting: this.summary.seo.skippedExisting,
            issues: this.summary.seo.issues.map(issue => {
                let reportItem = reportItemsBySource.get(issue.itemType + '|' + issue.sourceID);

                return {
                    ...issue,
                    itemID: reportItem ? reportItem.newID : 0,
                    title: reportItem ? reportItem.title : issue.title
                };
            })
        };
        let imageErrors = [];
        let imageErrorKeys = new Set();

        for (let imageError of this.summary.imageErrors) {
            let normalizedError = typeof imageError === 'string' ?
                { url: imageError, reason: '', postID: 0 } :
                {
                    url: WxrUtils.asString(imageError && imageError.url),
                    reason: WxrUtils.asString(imageError && imageError.reason),
                    postID: Number(imageError && imageError.postID) || 0
                };
            let key = normalizedError.postID + '|' + normalizedError.url + '|' + normalizedError.reason;

            if (!imageErrorKeys.has(key)) {
                imageErrorKeys.add(key);
                imageErrors.push(normalizedError);
            }
        }

        let failedImageUrlVariants = new Set();

        for (let imageError of imageErrors) {
            let resolvedErrorUrl = WxrUtils.resolveRemoteUrl(
                imageError.url,
                this.sourceBaseUrl ? this.sourceBaseUrl + '/' : ''
            );

            for (let variant of WxrUtils.imageDownloadUrlVariants(resolvedErrorUrl)) {
                failedImageUrlVariants.add(variant);
            }
        }

        unimportedMedia = unimportedMedia.filter(item => {
            if (item.mediaType !== 'image') {
                return true;
            }

            let resolvedMediaUrl = WxrUtils.resolveRemoteUrl(
                item.url,
                this.sourceBaseUrl ? this.sourceBaseUrl + '/' : ''
            );

            return !WxrUtils.imageDownloadUrlVariants(resolvedMediaUrl)
                .some(variant => failedImageUrlVariants.has(variant));
        });

        this.summary.report = {
            generatedAt: new Date().toISOString(),
            source: this.sourceBaseUrl,
            urlSettings: settings,
            imageErrors,
            unimportedMedia,
            unsupportedShortcodes,
            dynamicBlocks,
            unresolvedLinks,
            redirects: redirectData.redirects,
            redirectConflicts: redirectData.conflicts,
            seo,
            ignoredSystemTypes: this.summary.ignoredSystemTypes.map(item => ({ ...item })),
            warnings: [...this.summary.warnings]
        };

        return this.summary.report;
    }

    recordPageHierarchy(item, newID, index = 0) {
        this.pageHierarchyItems.push({
            oldID: this.getSourceID(item),
            newID: Number(newID),
            oldParent: WxrUtils.asString(item['wp:post_parent']).trim(),
            order: Number.parseInt(WxrUtils.asString(item['wp:menu_order']), 10) || 0,
            index
        });
    }

    createImportedPagesHierarchy() {
        let records = new Map(this.pageHierarchyItems.map(item => [item.oldID, item]));
        let children = new Map();

        for (let record of this.pageHierarchyItems) {
            if (!children.has(record.oldParent)) {
                children.set(record.oldParent, []);
            }

            children.get(record.oldParent).push(record);
        }

        let sortRecords = items => items.sort((a, b) => a.order - b.order || a.index - b.index);
        let built = new Set();
        let buildNode = (record, ancestors = new Set()) => {
            if (!record || ancestors.has(record.oldID) || built.has(record.oldID)) {
                return null;
            }

            let nextAncestors = new Set(ancestors);
            nextAncestors.add(record.oldID);
            built.add(record.oldID);

            return {
                id: record.newID,
                subpages: sortRecords(children.get(record.oldID) || [])
                    .map(child => buildNode(child, nextAncestors))
                    .filter(Boolean)
            };
        };

        let roots = sortRecords(this.pageHierarchyItems.filter(record => !record.oldParent || !records.has(record.oldParent)))
            .map(record => buildNode(record))
            .filter(Boolean);

        for (let record of sortRecords([...this.pageHierarchyItems])) {
            if (!built.has(record.oldID)) {
                let node = buildNode(record);

                if (node) {
                    roots.push(node);
                }
            }
        }

        return roots;
    }

    savePagesHierarchy() {
        if (!this.pageHierarchyItems.length) {
            return;
        }

        let configDir = path.join(this.appInstance.sitesDir, this.siteName, 'input', 'config');
        let pagesFile = path.join(configDir, 'pages.config.json');
        let existingHierarchy = [];

        try {
            if (fs.existsSync(pagesFile)) {
                let loadedHierarchy = JSON.parse(fs.readFileSync(pagesFile, 'utf8'));
                existingHierarchy = Array.isArray(loadedHierarchy) ? loadedHierarchy : [];
            }
        } catch (e) {
            this.summary.warnings.push('The existing pages hierarchy was invalid and was rebuilt.');
        }

        let importedIDs = new Set(this.pageHierarchyItems.map(item => item.newID));
        let configuredIDs = new Set();
        let retainedChildren = new Map();
        let cleanHierarchy = nodes => {
            let result = [];

            for (let node of WxrUtils.asArray(nodes)) {
                if (!node || !Number.isInteger(Number(node.id))) {
                    continue;
                }

                let id = Number(node.id);
                let subpages = cleanHierarchy(node.subpages);

                if (importedIDs.has(id)) {
                    retainedChildren.set(id, subpages);
                    continue;
                }

                configuredIDs.add(id);
                result.push({ id, subpages });
            }

            return result;
        };

        existingHierarchy = cleanHierarchy(existingHierarchy);

        let existingPages = this.appInstance.db.prepare(`
            SELECT id FROM posts WHERE status LIKE '%is-page%' ORDER BY id ASC
        `).all();

        for (let page of existingPages) {
            if (!importedIDs.has(page.id) && !configuredIDs.has(page.id)) {
                existingHierarchy.push({ id: page.id, subpages: [] });
            }
        }

        let importedHierarchy = this.createImportedPagesHierarchy();
        let attachRetainedChildren = nodes => nodes.forEach(node => {
            node.subpages = node.subpages.concat(retainedChildren.get(node.id) || []);
            attachRetainedChildren(node.subpages);
        });
        attachRetainedChildren(importedHierarchy);

        let hierarchy = existingHierarchy.concat(importedHierarchy);
        let temporaryFile = pagesFile + '.importing';
        fs.mkdirSync(configDir, { recursive: true });
        fs.writeFileSync(temporaryFile, JSON.stringify(hierarchy, null, 4), 'utf8');
        fs.renameSync(temporaryFile, pagesFile);
    }

    /**
     * Import images data
     */
    async importImages() {
        let imagesQueue = Object.values(this.temp.imagesQueue).flat();
        let destinationPath = path.join(
            this.appInstance.sitesDir,
            this.siteName,
            'input',
            'media',
            'posts'
        );
        this.downloadImagesProgress = 0;
        this.totalImages = imagesQueue.length;

        if (!imagesQueue.length) {
            return;
        }

        let queueIndex = 0;
        let worker = async () => {
            while (queueIndex < imagesQueue.length) {
                let imageData = imagesQueue[queueIndex++];
                await this.downloadImage(imageData, destinationPath);
            }
        };

        let concurrency = Math.min(3, imagesQueue.length);
        await Promise.all(Array.from({ length: concurrency }, () => worker()));
    }

    /**
     * Downloads images from queue
     *
     * @param imagesQueue
     * @param destinationPath
     */
    async downloadImage(imageData, destinationPath) {
        let dirPath = path.join(
            destinationPath,
            imageData.postID.toString(),
            imageData.gallery ? 'gallery' : ''
        );
        let targetPath = path.join(dirPath, imageData.filename);
        let downloadError = null;
        let downloadedFrom = '';

        try {
            fs.mkdirSync(dirPath, { recursive: true });

            for (let candidateUrl of WxrUtils.imageDownloadUrlVariants(imageData.remoteUrl)) {
                try {
                    await download.image({
                        url: candidateUrl,
                        dest: targetPath,
                        extractFilename: false,
                        timeout: 30000,
                        maxRedirects: 5,
                        headers: {
                            'User-Agent': 'Publii WordPress Importer'
                        }
                    });
                    let fileStats = fs.statSync(targetPath);

                    if (!fileStats.isFile() || fileStats.size === 0) {
                        throw new Error('Downloaded file is empty.');
                    }

                    downloadedFrom = candidateUrl;
                    break;
                } catch (e) {
                    downloadError = e;

                    if (fs.existsSync(targetPath)) {
                        fs.unlinkSync(targetPath);
                    }
                }
            }

            if (!downloadedFrom) {
                throw downloadError || new Error('No valid image download URL was found.');
            }

            let galleryThumbnail = imageData.gallery ? await this.createGalleryThumbnail(imageData, targetPath) : null;
            this.storeDownloadedImage(imageData, targetPath, galleryThumbnail);
            this.summary.images++;
            console.log('-> Downloaded image: ' + targetPath + ' (source: ' + downloadedFrom + ')');
        } catch (e) {
            if (fs.existsSync(targetPath)) {
                fs.unlinkSync(targetPath);
            }

            this.summary.imageErrors.push({
                url: imageData.remoteUrl,
                reason: WxrUtils.getDownloadErrorReason(e),
                postID: imageData.postID
            });
            this.sendProgress('core.wpImport.imageDownloadError', { image: imageData.remoteUrl });
            console.log('(!) An error occurred during downloading the image: ' + imageData.remoteUrl);
            console.log(e);
        } finally {
            this.downloadImagesProgress++;
            this.sendProgress('core.wpImport.imagesProgressInfo', {
                progress: this.downloadImagesProgress,
                total: this.totalImages
            });
        }
    }

    /**
     * Generate a gallery thumbnail with Publii's native image pipeline.
     * The original image remains a valid fallback for unsupported formats.
     */
    async createGalleryThumbnail(imageData, targetPath) {
        try {
            let appInstance = {
                ...this.appInstance,
                appConfig: this.appInstance.appConfig || {}
            };
            let image = new Image(appInstance, {
                id: imageData.postID,
                site: this.siteName,
                path: targetPath,
                imageType: 'galleryImages'
            });
            let promises = image.createResponsiveImages(targetPath, 'galleryImages');

            if (!Array.isArray(promises) || !promises.length) {
                return null;
            }

            let results = await Promise.all(promises);
            let unprocessable = results.some(result => result && result.error === 'IMAGE_UNPROCESSABLE');

            if (unprocessable) {
                for (let result of results) {
                    if (typeof result === 'string' && result !== targetPath && fs.existsSync(result)) {
                        fs.unlinkSync(result);
                    }
                }

                return null;
            }

            let thumbnailPath = results.find(result => typeof result === 'string' && fs.existsSync(result));

            if (!thumbnailPath) {
                return null;
            }

            let dimensions = this.getImageDimensions(thumbnailPath);

            return {
                filename: path.basename(thumbnailPath),
                width: dimensions.width,
                height: dimensions.height
            };
        } catch (e) {
            console.log('(!) Unable to create a gallery thumbnail: ' + targetPath);
            console.log(e);
            return null;
        }
    }

    getImageDimensions(imagePath) {
        try {
            let dimensions = sizeOf(imagePath);

            return {
                width: Number(dimensions.width) || 0,
                height: Number(dimensions.height) || 0
            };
        } catch (e) {
            return { width: 0, height: 0 };
        }
    }

    storeDownloadedImage(imageData, targetPath, galleryThumbnail = null) {
        let localUrl = '#DOMAIN_NAME#' + imageData.filename;
        let row = this.appInstance.db.prepare('SELECT text FROM posts WHERE id = @id').get({ id: imageData.postID });

        if (row) {
            let text = row.text || '';

            if (imageData.gallery) {
                let fullDimensions = this.getImageDimensions(targetPath);
                let thumbnailFilename = galleryThumbnail ? galleryThumbnail.filename : imageData.filename;
                let thumbnailDimensions = galleryThumbnail || fullDimensions;

                text = WxrUtils.replaceGalleryImageUrls(
                    text,
                    [imageData.sourceUrl, imageData.remoteUrl],
                    {
                        fullUrl: '#DOMAIN_NAME#gallery/' + imageData.filename,
                        thumbnailUrl: '#DOMAIN_NAME#gallery/' + thumbnailFilename,
                        fullWidth: fullDimensions.width,
                        fullHeight: fullDimensions.height,
                        thumbnailWidth: thumbnailDimensions.width,
                        thumbnailHeight: thumbnailDimensions.height
                    }
                );
            } else {
                text = WxrUtils.replaceContentImageUrls(
                    text,
                    [imageData.sourceUrl, imageData.remoteUrl],
                    localUrl
                );
                text = WxrUtils.removeSelfLinkedImageAnchor(
                    text,
                    [imageData.sourceUrl, imageData.remoteUrl],
                    localUrl
                );
                text = WxrUtils.stripWordPressResponsiveAttributes(text, localUrl);
            }

            this.appInstance.db.prepare('UPDATE posts SET text = @text WHERE id = @id').run({
                id: imageData.postID,
                text
            });
        }

        if (!imageData.featured) {
            return;
        }

        let imageConfig = JSON.stringify({
            alt: imageData.alt,
            caption: imageData.caption,
            credits: imageData.credits
        });
        let imageInsert = this.appInstance.db.prepare(`
            INSERT INTO posts_images (post_id, url, title, caption, additional_data)
            VALUES (@postID, @url, @title, @caption, @additionalData)
        `);
        imageInsert.run({
            postID: imageData.postID,
            url: imageData.filename,
            title: imageData.title,
            caption: imageData.caption,
            additionalData: imageConfig
        });

        let imageID = this.appInstance.db.prepare('SELECT last_insert_rowid() AS id').get().id;
        this.appInstance.db.prepare('UPDATE posts SET featured_image_id = @imageID WHERE id = @postID').run({
            imageID,
            postID: imageData.postID
        });
    }

    /**
     * Prepares post text to import
     *
     * @param text
     */
    preparePostText(text, item = null) {
        if(typeof text !== 'string') {
            return '';
        }

        // Resolve classic [gallery] shortcodes while WXR attachment metadata is available.
        text = this.replaceGalleryShortcodes(text, item);

        // Convert WordPress oEmbed URLs and blocks to Publii video markup.
        text = WxrUtils.replaceStandaloneVideoEmbeds(text);

        // Convert WordPress image markup and classes to the format used by Publii.
        text = WxrUtils.normalizeWordPressImageMarkup(text);

        // Replace <!-- more --> with Publii separator
        text = text.replace(/<!--more-->/g, '<hr id="read-more">');

        if(this.autop) {
            console.log('(i) Used automatic paragraphs for the post content');
            text = automaticParagraphs(text);
        }

        return text;
    }

    getSummary() {
        return this.summary;
    }
}

module.exports = WxrParser;
