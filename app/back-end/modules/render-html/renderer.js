// Necessary packages
const fs = require('fs-extra');
const listAll = require('ls-all');
const path = require('path');
const moment = require('moment');
const Handlebars = require('handlebars');
const CleanCSS = require('clean-css');
const normalizePath = require('normalize-path');

// Internal packages
const slug = require('./../../helpers/slug');
const sqlite = require('better-sqlite3');
const URLHelper = require('./helpers/url.js');
const FilesHelper = require('./helpers/files.js');
const PostViewSettingsHelper = require('./helpers/post-view-settings.js');
const Themes = require('../../themes.js');
const TemplateHelper = require('./helpers/template.js');
const RendererContext = require('./renderer-context.js');
const RendererContextPost = require('./contexts/post.js');
const RendererContextPostPreview = require('./contexts/post-preview.js');
const RendererContextTag = require('./contexts/tag.js');
const RendererContextTags = require('./contexts/tags.js');
const RendererContextAuthor = require('./contexts/author.js');
const RendererContextHome = require('./contexts/home.js');
const RendererContextFeed = require('./contexts/feed.js');
const RendererContext404 = require('./contexts/404.js');
const RendererContextSearch = require('./contexts/search.js');
const RendererHelpers = require('./helpers/helpers.js');
const themeConfigValidator = require('./validators/theme-config.js');
const UtilsHelper = require('./../../helpers/utils');
const Sitemap = require('./helpers/sitemap.js');
const Gdpr = require('./helpers/gdpr.js');

// Default config
const defaultAstCurrentSiteConfig = require('./../../../config/AST.currentSite.config');

/*
 * Class used to generate HTML output
 * from the site data
 */

class Renderer {
    constructor(appDir, sitesDir, siteConfig, itemID = false, postData = false) {
        this.appDir = appDir;
        this.sitesDir = sitesDir;
        this.siteConfig = siteConfig;
        this.siteName = this.siteConfig.name;
        this.themeName = this.siteConfig.theme;
        this.menuContext = '';
        this.errorLog = [];
        this.previewMode = false;
        this.ampMode = false;
        this.useRelativeUrls = siteConfig.deployment.relativeUrls;
        this.translations = {
            user: false,
            theme: false
        };
        this.contentStructure = {};
        this.commonData = {
            tags: [],
            authors: [],
            menus: [],
            featuredPosts: {
                homepage: [],
                tag: [],
                author: []
            },
            hiddenPosts: []
        };
        this.cachedItems = {
            postTags: {},
            posts: {},
            tags: {},
            tagsPostCounts: {},
            authors: {},
            authorsPostCounts: {},
            featuredImages: {
                authors: {},
                posts: {},
                tags: {}
            }
        };
        this.itemID = itemID;
        this.postData = postData;
    }

    /*
     * Renders the pages
     */
    async render(previewMode = false, previewLocation = '', mode = 'full') {
        this.previewMode = previewMode;
        this.previewLocation = previewLocation;
        this.singlePageMode = mode === 'post';
        this.homepageOnlyMode = mode === 'home';
        this.tagOnlyMode = mode === 'tag';
        this.authorOnlyMode = mode === 'author';
        this.setIO();
        this.emptyOutputDir();
        let themeValidationResults = this.themeIsValid();

        if (themeValidationResults === true) {
            await this.renderSite();

            if (this.errorLog.length === 0) {
                return true;
            }

            return this.errorLog;
        }
        
        this.errorLog.push({
            message: 'An error (1010) occurred during parsing config.json file of the theme.',
            desc: 'Please check your theme config.json file as it seems to be corrupted.'
        });

        return this.errorLog;
    }

    /*
     * Check if the theme is valid
     */
    themeIsValid() {
        let configFilePath = path.join(this.inputDir, 'themes', this.themeName, 'config.json');
        let overridedConfigFilePath = UtilsHelper.fileIsOverrided(this.inputDir, this.themeName, configFilePath);

        if(overridedConfigFilePath) {
            configFilePath = overridedConfigFilePath;
        }

        let configValidationResult = themeConfigValidator(configFilePath);

        if(configValidationResult !== true) {
            return 'Theme config.json file is invalid: ' + configValidationResult;
        }

        return true;
    }

    /*
     * Render the page content after removing the old output dir
     */
    async renderSite() {
        try {
            if (this.singlePageMode) {
                this.renderPostPreview();
            } else if (this.homepageOnlyMode) {
                this.renderHomepagePreview();
            } else if (this.tagOnlyMode) {
                this.renderTagPreview();
            } else if (this.authorOnlyMode) {
                this.renderAuthorPreview();
            } else {
                await this.renderFullPreview();
            }
        } catch (err) {
            this.errorLog.push({
                message: 'An error occurred during rendering process:',
                desc: err.message
            });
        }

        return true;
    }

    /**
     * Renders full preview of website
     */
    async renderFullPreview() {
        console.time("RENDERING");
        this.preparePageToRender();
        await this.generateWWW();
        this.generateAMP();
        console.timeEnd("RENDERING");

        if (this.siteConfig.deployment.relativeUrls) {
            console.time("RELATIVE URLS");
            await this.relativizeUrls();
            console.timeEnd("RELATIVE URLS");
        }

        this.sendProgress(100, 'Website files are ready to upload');
        this.db.close();
    }

    /**
     * Prepares website to be rendered
     */
    preparePageToRender() {
        this.loadSiteConfig();

        this.sendProgress(1, 'Loading website config');

        console.time("CONFIG");
        this.loadSiteTranslations();
        this.loadDataFromDB();
        this.loadThemeConfig();
        this.loadThemeFiles();
        this.registerHelpers();
        this.registerThemeHelpers();
        console.timeEnd("CONFIG");

        this.sendProgress(2, 'Loading website assets');
        this.loadContentStructure();
        this.sendProgress(5, 'Loading content structure');

        this.loadCommonData();
        this.sendProgress(10, 'Preloading common data');
        this.generatePartials();
    }

    /**
     * Creates website content
     */
    async generateWWW() {
        this.sendProgress(11, 'Generating frontpage');
        this.generateFrontpage();
        this.sendProgress(20, 'Generating posts');
        this.generatePosts();

        if (RendererHelpers.getRendererOptionValue('createTagPages', this.themeConfig)) {
            this.sendProgress(60, 'Generating tag pages');
            this.generateTags();
            this.generateTagsList();
        }

        if (RendererHelpers.getRendererOptionValue('createAuthorPages', this.themeConfig)) {
            this.sendProgress(70, 'Generating author pages');
            this.generateAuthors();
        }

        this.sendProgress(75, 'Generating other pages');

        if (RendererHelpers.getRendererOptionValue('create404page', this.themeConfig)) {
            this.generate404s();
        }

        if (RendererHelpers.getRendererOptionValue('createSearchPage', this.themeConfig)) {
            this.generateSearch();
        }
        
        if (!this.siteConfig.deployment.relativeUrls) {
            this.generateFeeds();
        }

        this.generateCSS();
        this.sendProgress(80, 'Copying files');
        await this.copyFiles();

        if (!this.siteConfig.deployment.relativeUrls) {
            await this.generateSitemap();
        }

        this.sendProgress(90, 'Finishing the render process');
    }

    /**
     * Renders post preview
     */
    renderPostPreview() {
        this.loadSiteConfig();
        this.loadSiteTranslations();
        this.loadDataFromDB();
        this.loadThemeConfig();
        this.loadThemeFiles();
        this.registerHelpers();
        this.registerThemeHelpers();
        this.loadContentStructure();
        this.loadCommonData();
        this.generatePartials();
        this.generatePost();
        this.generateCSS();

        FilesHelper.copyAssetsFiles(this.themeDir, this.outputDir, this.themeConfig);
        FilesHelper.copyMediaFiles(this.inputDir, this.outputDir, [this.itemID]);

        process.send({
            type: 'app-rendering-preview',
            result: true
        });
    }

    /**
     * Renders homepage preview
     */
    renderHomepagePreview() {
        this.loadSiteConfig();
        this.loadSiteTranslations();
        this.loadDataFromDB();
        this.loadThemeConfig();
        this.loadThemeFiles();
        this.registerHelpers();
        this.registerThemeHelpers();
        this.loadContentStructure();
        this.loadCommonData();
        this.generatePartials();
        this.generateFrontpage();
        this.generateCSS();

        let postIDs = Object.keys(this.cachedItems.posts);
        FilesHelper.copyAssetsFiles(this.themeDir, this.outputDir, this.themeConfig);
        FilesHelper.copyMediaFiles(this.inputDir, this.outputDir, postIDs);

        process.send({
            type: 'app-rendering-preview',
            result: true
        });
    }

    /**
     * Renders tag page preview
     */
    renderTagPreview() {
        this.loadSiteConfig();
        this.loadSiteTranslations();
        this.loadDataFromDB();
        this.loadThemeConfig();
        this.loadThemeFiles();
        this.registerHelpers();
        this.registerThemeHelpers();
        this.loadContentStructure();
        this.loadCommonData();
        this.generatePartials();
        this.generateTags(this.itemID);
        this.generateCSS();

        let postIDs = Object.keys(this.cachedItems.posts);
        let postIDsToRender = [];

        for (let i = 0; i < postIDs.length; i++) {
            let postID = postIDs[i];
            let foundedTags = this.cachedItems.posts[postID].tags.filter(tag => tag.id === this.itemID);

            if (foundedTags.length) {
                postIDsToRender.push(postIDs[i]);
            }
        }

        FilesHelper.copyAssetsFiles(this.themeDir, this.outputDir, this.themeConfig);
        FilesHelper.copyMediaFiles(this.inputDir, this.outputDir, postIDsToRender);

        process.send({
            type: 'app-rendering-preview',
            result: true
        });
    }

    /**
     * Renders author page preview
     */
    renderAuthorPreview() {
        this.loadSiteConfig();
        this.loadSiteTranslations();
        this.loadDataFromDB();
        this.loadThemeConfig();
        this.loadThemeFiles();
        this.registerHelpers();
        this.registerThemeHelpers();
        this.loadContentStructure();
        this.loadCommonData();
        this.generatePartials();
        this.generateAuthors(this.itemID);
        this.generateCSS();

        let postIDs = Object.keys(this.cachedItems.posts);
        let postIDsToRender = [];

        for (let i = 0; i < postIDs.length; i++) {
            let postID = postIDs[i];
            let usesCurrentAuthor = this.cachedItems.posts[postID].author.id === this.itemID;

            if (usesCurrentAuthor) {
                postIDsToRender.push(postIDs[i]);
            }
        }

        FilesHelper.copyAssetsFiles(this.themeDir, this.outputDir, this.themeConfig);
        FilesHelper.copyMediaFiles(this.inputDir, this.outputDir, postIDsToRender);

        process.send({
            type: 'app-rendering-preview',
            result: true
        });
    }

    /**
     * Send progress to the renderer thread
     *
     * @param progress
     * @param message
     */
    sendProgress(progress, message = '') {
        process.send({
            type: 'app-rendering-progress',
            progress: progress,
            message: message
        });
    }

    /*
     * Make sure the output dir exists and is empty before generating the output files
     */
    emptyOutputDir() {
        if (UtilsHelper.dirExists(this.outputDir)) {
            let files = fs.readdirSync(this.outputDir);
            
            for (let file of files) {
                if (file === '.' || file === '..' || file === 'media') {
                    continue;
                }

                fs.rmdirSync(path.join(this.outputDir, file), { recursive: true });
            }
        } else {
            fs.mkdirSync(this.outputDir);
        }
    }

    /*
     * Set the directories used as an input and an output
     */
    setIO() {
        let basePath = path.join(this.sitesDir, this.siteName);
        this.inputDir = path.join(basePath, 'input');
        this.themeDir = path.join(this.inputDir, 'themes', this.themeName);
        this.outputDir = path.join(basePath, 'output');

        if(this.previewMode) {
            this.outputDir = path.join(basePath, 'preview');

            if(this.previewLocation !== '' && UtilsHelper.dirExists(this.previewLocation)) {
                this.outputDir = this.previewLocation;
            }
        }
    }

    /*
     * Create built-in helpers
     */
    registerHelpers() {
        const HandlebarsHelpers = require('./handlebars/helpers/_modules.js');

        // Get helpers names
        let helperNames = Object.keys(HandlebarsHelpers);

        // Register all helpers
        for(let helperName of helperNames) {
            if(helperName.substr(-6) !== 'Helper') {
                Handlebars.registerHelper(
                    helperName,
                    HandlebarsHelpers[helperName]
                );
            } else {
                HandlebarsHelpers[helperName](this, Handlebars);
            }
        }
    }

    /*
     * Create theme custom helpers
     */
    registerThemeHelpers() {
        let helpersFilePath = path.join(this.themeDir, 'helpers.js');
        let overridedHelpersFilePath = UtilsHelper.fileIsOverrided(this.themeDir, helpersFilePath);

        if(overridedHelpersFilePath) {
            helpersFilePath = overridedHelpersFilePath;
        }

        // Check if the helpers.js file exists
        if(!UtilsHelper.fileExists(helpersFilePath)) {
            return;
        }

        // Include the helpers from the helpers.js file
        let themeHelpers;
        
        if (this.themeConfig.renderer.includeHandlebarsInHelpers) {
            themeHelpers = UtilsHelper.requireWithNoCache(helpersFilePath, Handlebars);
        } else {
            themeHelpers = UtilsHelper.requireWithNoCache(helpersFilePath);
        }

        // Check if the returned value is an object
        if(themeHelpers.constructor !== Object) {
            return;
        }

        // Get helpers names
        let helperNames = Object.keys(themeHelpers);

        // Register all helpers
        for(let helperName of helperNames) {
            Handlebars.registerHelper(helperName, themeHelpers[helperName]);
        }
    }

    /*
     * Load site config
     */
    loadSiteConfig() {
        let defaultSiteConfig = JSON.parse(JSON.stringify(defaultAstCurrentSiteConfig));
        // Site config
        let configPath = path.join(this.inputDir, 'config', 'site.config.json');
        this.siteConfig = JSON.parse(fs.readFileSync(configPath));
        this.siteConfig = UtilsHelper.mergeObjects(defaultSiteConfig, this.siteConfig);

        if(this.previewMode) {
            this.siteConfig.domain = 'file://' + this.outputDir;
        } else if (this.siteConfig.domain === '/') {
            this.siteConfig.domain = '';
        }

        if (!this.previewMode && this.siteConfig.deployment.relativeUrls) {
            this.siteConfig.domain = '#PUBLII_RELATIVE_URL_BASE#';
        }

        this.siteConfig.originalDomain = this.siteConfig.domain;

        if(
            this.siteConfig.advanced &&
            this.siteConfig.advanced.openGraphImage !== '' &&
            this.siteConfig.advanced.openGraphImage.indexOf('http://') === -1 &&
            this.siteConfig.advanced.openGraphImage.indexOf('https://') === -1 &&
            this.siteConfig.advanced.openGraphImage.indexOf('media/website/') === -1
        ) {
            let openGraphImage = path.join(this.siteConfig.domain, 'media', 'website', this.siteConfig.advanced.openGraphImage);
            openGraphImage = normalizePath(openGraphImage);
            openGraphImage = URLHelper.fixProtocols(openGraphImage);
            this.siteConfig.advanced.openGraphImage = openGraphImage;
        } else {
            this.siteConfig.advanced.openGraphImage = URLHelper.fixProtocols(this.siteConfig.advanced.openGraphImage);
        }
    }

    /*
     * Load site translations
     */
    loadSiteTranslations() {
        // Path to the custom translations
        let userTranslationsPath = path.join(
            this.inputDir,
            'languages',
            this.themeName + '.lang.json'
        );

        // Path to the original translations
        let themeTranslationsPath = path.join(
            this.inputDir,
            'themes',
            this.themeName,
            this.themeName + '.lang.json'
        );

        // Load custom translations
        if(fs.existsSync(userTranslationsPath)) {
            this.translations.user = this.parseTranslations(userTranslationsPath);
        }

        // Load original translations
        if(fs.existsSync(themeTranslationsPath)) {
            this.translations.theme = this.parseTranslations(themeTranslationsPath);
        }
    }

    /*
     * Parse site translations
     */
    parseTranslations(path) {
        let translations = false;

        try {
            translations = JSON.parse(fs.readFileSync(path));
        } catch(e) {
            return false;
        }

        return translations;
    }

    /*
     * Load all data from the database
     */
    loadDataFromDB() {
        const dbPath = path.join(this.inputDir, 'db.sqlite');
        this.db = new sqlite(dbPath);
    }

    /*
     * Load and parse theme config file
     */
    loadThemeConfig() {
        let themeConfigPath = path.join(this.inputDir, 'config', 'theme.config.json');
        let tempThemeConfig = Themes.loadThemeConfig(themeConfigPath, this.themeDir);
        this.themeConfig = JSON.parse(JSON.stringify(tempThemeConfig));
        this.themeConfig.config = {};
        this.themeConfig.customConfig = {};
        this.themeConfig.postConfig = {};

        for(let i = 0; i < tempThemeConfig.config.length; i++) {
            let key = tempThemeConfig.config[i].name;
            this.themeConfig.config[key] = tempThemeConfig.config[i].value;
        }

        for(let i = 0; i < tempThemeConfig.customConfig.length; i++) {
            let key = tempThemeConfig.customConfig[i].name;
            this.themeConfig.customConfig[key] = tempThemeConfig.customConfig[i].value;
        }

        for(let i = 0; i < tempThemeConfig.postConfig.length; i++) {
            let key = tempThemeConfig.postConfig[i].name;
            this.themeConfig.postConfig[key] = tempThemeConfig.postConfig[i].value;
        }
    }

    /*
     * Load necessary theme files
     */
    loadThemeFiles() {
        this.templateHelper = new TemplateHelper(this.themeDir, this.outputDir, this.siteConfig);
    }

    /*
     * Generate partials
     */
    generatePartials() {
        console.time('PARTIALS GENERATION');
        let requiredPartials = ['header', 'footer'];
        let optionalPartials = [
            'pagination',
            'menu',
            'amp-footer',
            'amp-head',
            'amp-menu',
            'amp-pagination',
            'amp-share-buttons'
        ];
        let userPartials = this.templateHelper.getUserPartials(requiredPartials, optionalPartials);
        let allPartials = requiredPartials.concat(optionalPartials).concat(userPartials);

        for(let i = 0; i < allPartials.length; i++) {
            let template = this.templateHelper.loadPartialTemplate(allPartials[i] + '.hbs');

            if (!template && optionalPartials.indexOf(allPartials[i]) > -1) {
                let optionalPartialPath = path.join(__dirname, '..', '..', '..', 'default-files', 'theme-files', allPartials[i] + '.hbs');
                template = fs.readFileSync(optionalPartialPath, 'utf8');
            }

            if(!template) {
                continue;
            }

            try {
                Handlebars.registerPartial(allPartials[i], template);
            } catch (e) {
                this.errorLog.push({
                    message: 'An error (1001) occurred during parsing ' + allPartials[i] + '.hbs partial file.',
                    desc: e.message
                });
            }
        }

        console.timeEnd('PARTIALS GENERATION');
    }

    /*
     * Generate the main view of the theme
     */
    generateFrontpage(ampMode = false) {
        console.time(ampMode ? 'HOME-AMP' : 'HOME');
        // Load template
        let inputFile = ampMode ? 'amp-index.hbs' : 'index.hbs';
        let compiledTemplate = this.compileTemplate(inputFile);

        if (!compiledTemplate) {
            return false;
        }

        // Create global context
        let globalContext = this.createGlobalContext('index');

        // Render index site
        let contextGenerator = new RendererContextHome(this);

        // Detect if we have enough posts to create pagination
        let totalNumberOfPosts = contextGenerator.getPostsNumber();
        let postsPerPage = parseInt(this.themeConfig.config.postsPerPage, 10);

        if (isNaN(postsPerPage)) {
            postsPerPage = 5;
        }

        if (totalNumberOfPosts <= postsPerPage || postsPerPage <= 0) {
            let context = contextGenerator.getContext(0, postsPerPage);
            let output = '';

            this.menuContext = ['frontpage'];
            globalContext.website.pageUrl = this.siteConfig.domain + '/';
            globalContext.website.ampUrl = this.siteConfig.domain + '/amp/';
            globalContext.renderer.isFirstPage = true;
            globalContext.renderer.isLastPage = true;
            globalContext.pagination = false;

            if (!this.siteConfig.advanced.ampIsEnabled) {
                globalContext.website.ampUrl = '';
            }

            try {
                output = compiledTemplate(context, {
                    data: globalContext
                });
            } catch (e) {
                this.errorLog.push({
                    message: 'An error (1002) occurred during parsing ' + inputFile + ' file.',
                    desc: e.message
                });
                return;
            }

            this.templateHelper.saveOutputFile('index.html', output);
        } else {
            let addIndexHtml = this.previewMode || this.siteConfig.advanced.urls.addIndex;

            // If user set postsPerPage field to -1 - set it for calculations to 999
            postsPerPage = postsPerPage == -1 ? 999 : postsPerPage;

            for (let offset = 0; offset < totalNumberOfPosts; offset += postsPerPage) {
                globalContext.context = ['index'];
                let context = contextGenerator.getContext(offset, postsPerPage);

                // Add pagination data to the global context
                let currentPage = 1;
                let totalPages = 0;

                if (postsPerPage > 0) {
                    currentPage = parseInt(offset / postsPerPage, 10) + 1;
                    totalPages = Math.ceil(totalNumberOfPosts / postsPerPage)
                }

                let nextPage = (currentPage < totalPages) ? currentPage + 1 : false;
                let previousPage = (currentPage > 1) ? currentPage - 1 : false;

                globalContext.pagination = {
                    context: '',
                    pages: Array.from({length: totalPages}, (v, k) => k + 1),
                    totalPosts: totalNumberOfPosts,
                    totalPages: totalPages,
                    currentPage: currentPage,
                    postsPerPage: postsPerPage,
                    nextPage: nextPage,
                    previousPage: previousPage,
                    nextPageUrl: URLHelper.createPaginationPermalink(this.siteConfig.domain, this.siteConfig.advanced.urls, nextPage, 'home', false, addIndexHtml),
                    previousPageUrl: URLHelper.createPaginationPermalink(this.siteConfig.domain, this.siteConfig.advanced.urls, previousPage, 'home', false, addIndexHtml)
                };

                globalContext.renderer.isFirstPage = currentPage === 1;
                globalContext.renderer.isLastPage = currentPage === totalPages;

                if (currentPage > 1) {                    
                    let pagePart = this.siteConfig.advanced.urls.pageName;
                    globalContext.website.pageUrl = this.siteConfig.domain + '/' + pagePart +  '/' + currentPage + '/';
                    globalContext.website.ampUrl = this.siteConfig.domain + '/amp/' + pagePart + '/' + currentPage + '/';
                } else {                    
                    globalContext.website.pageUrl = this.siteConfig.domain + '/';
                    globalContext.website.ampUrl = this.siteConfig.domain + '/amp/';
                }

                if (!this.siteConfig.advanced.ampIsEnabled) {
                    globalContext.website.ampUrl = '';
                }

                if (offset > 0) {
                    if (globalContext.context.indexOf('pagination') === -1) {
                        globalContext.context.push('pagination');
                    }

                    if (globalContext.context.indexOf('index-pagination') === -1) {
                        globalContext.context.push('index-pagination');
                    }
                }

                this.menuContext = ['frontpage'];
                let output = this.renderTemplate(compiledTemplate, context, globalContext, inputFile);

                if (offset === 0) {
                    this.templateHelper.saveOutputFile('index.html', output);
                } else {
                    // We increase the current page number as we need to start URLs from page/2
                    this.templateHelper.saveOutputHomePaginationFile(currentPage, output);
                }
            }
        }
        console.timeEnd(ampMode ? 'HOME-AMP' : 'HOME');
    }

    /*
     * Create post sites
     */
    generatePosts(ampMode = false) {
        console.time(ampMode ? 'POSTS-AMP' : 'POSTS');
        let postIDs = [];
        let postSlugs = [];
        let postTemplates = [];
        let inputFile = ampMode ? 'amp-post.hbs' : 'post.hbs';

        // Get posts
        let postData = this.db.prepare(`
            SELECT
                id,
                slug,
                template
            FROM
                posts
            WHERE
                status LIKE '%published%' AND
                status NOT LIKE '%trashed%'
            ORDER BY
                id ASC
        `).all();

        if (postData && postData.length) { 
            postIDs = postData.map(row => row.id);
            postSlugs = postData.map(row => row.slug);
            postTemplates = postData.map(row => {
                if (row.template === '*') {
                    return this.themeConfig.defaultTemplates.post
                }

                return row.template;
            });
        } else {
            postIDs = [];
            postSlugs = [];
            postTemplates = [];
        }

        // Load templates
        let compiledTemplates = {};
        compiledTemplates['DEFAULT'] = this.compileTemplate(inputFile);

        if (!compiledTemplates['DEFAULT']) {
            return false;
        }

        if (!ampMode) {
            for (let i = 0; i < postTemplates.length; i++) {
                let fileSlug = postTemplates[i];

                // When we meet default template - skip the compilation process
                if (fileSlug === '' || !this.themeConfig.postTemplates[fileSlug]) {
                    continue;
                }

                compiledTemplates[fileSlug] = this.compileTemplate('post-' + fileSlug + '.hbs');

                if (!compiledTemplates[fileSlug]) {
                    return false;
                }
            }
        }

        // Create global context
        let globalContext = this.createGlobalContext('post');
        let progressIncrease = 40 / postIDs.length;

        if(ampMode) {
            progressIncrease = 7 / postIDs.length;
        }

        // Render post sites
        for (let i = 0; i < postIDs.length; i++) {
            globalContext.context = ['post'];
            let contextGenerator = new RendererContextPost(this);
            let context = contextGenerator.getContext(postIDs[i]);
            let fileSlug = 'DEFAULT';

            if (!ampMode) {
                fileSlug = postTemplates[i] === '' ? 'DEFAULT' : postTemplates[i];
            }

            this.menuContext = ['post', postSlugs[i]];    
            globalContext.website.pageUrl = this.siteConfig.domain + '/' + postSlugs[i] + '.html';
            globalContext.website.ampUrl = this.siteConfig.domain + '/amp/' + postSlugs[i] + '.html';

            if (this.siteConfig.advanced.urls.cleanUrls) {                
                globalContext.website.pageUrl = this.siteConfig.domain + '/' + postSlugs[i] + '/';
                globalContext.website.ampUrl = this.siteConfig.domain + '/amp/' + postSlugs[i] + '/';
            }

            globalContext.config.post = this.cachedItems.posts[postIDs[i]].postViewConfig;

            if (!this.siteConfig.advanced.ampIsEnabled) {
                globalContext.website.ampUrl = '';
            }

            let ampPrefix = ampMode ? 'amp-' : '';

            if (!compiledTemplates[fileSlug]) {
                fileSlug = 'DEFAULT';
            }

            inputFile = inputFile.replace('.hbs', '') + ampPrefix + (fileSlug === 'DEFAULT' ? '' : '-' + fileSlug) + '.hbs';
            let output = this.renderTemplate(compiledTemplates[fileSlug], context, globalContext, inputFile);

            this.templateHelper.saveOutputPostFile(postSlugs[i], output);

            if(ampMode) {
                this.sendProgress(Math.ceil(90 + (progressIncrease * i)), 'Generating posts (' + (i + 1) + '/' + postIDs.length + ')');
            } else {
                this.sendProgress(Math.ceil(20 + (progressIncrease * i)), 'Generating posts (' + (i + 1) + '/' + postIDs.length + ')');
            }
        }
        console.timeEnd(ampMode ? 'POSTS-AMP' : 'POSTS');
    }

    /*
     * Create post preview
     */
    generatePost() {
        let postID = this.itemID;
        let postSlug = 'preview';
        let postTemplate = this.postData.template;
        let inputFile = 'post.hbs';

        if (postTemplate === '*') {
            postTemplate = this.themeConfig.defaultTemplates.post;
        }

        // Load templates
        let compiledTemplates = {};
        compiledTemplates['DEFAULT'] = this.compileTemplate(inputFile);

        if(!compiledTemplates['DEFAULT']) {
            return false;
        }

        if(typeof postTemplate === "string" && postTemplate !== '') {
            postTemplate = [postTemplate];
        }

        for (let i = 0; i < postTemplate.length; i++) {
            let fileSlug = postTemplate[i];

            // When we meet default template - skip the compilation process
            if (fileSlug === '') {
                continue;
            }

            compiledTemplates[fileSlug] = this.compileTemplate('post-' + fileSlug + '.hbs');

            if(!compiledTemplates[fileSlug]) {
                return false;
            }
        }

        // Create global context
        let globalContext = this.createGlobalContext('post');

        // Render post site
        let contextGenerator = new RendererContextPostPreview(this);
        let context = contextGenerator.getContext(postID);
        let fileSlug = 'DEFAULT';
        fileSlug = postTemplate === '' ? 'DEFAULT' : postTemplate;

        this.menuContext = ['post', postSlug];
        globalContext.website.pageUrl = this.siteConfig.domain + '/' + postSlug + '.html';
        globalContext.website.ampUrl = this.siteConfig.domain + '/amp/' + postSlug + '.html';
        globalContext.config.post = this.overridePostViewSettings(JSON.parse(JSON.stringify(this.themeConfig.postConfig)), postID, true);

        if(!this.siteConfig.advanced.ampIsEnabled) {
            globalContext.website.ampUrl = '';
        }

        if(!compiledTemplates[fileSlug]) {
            fileSlug = 'DEFAULT';
        }

        inputFile = inputFile.replace('.hbs', '') + (fileSlug === 'DEFAULT' ? '' : '-' + fileSlug) + '.hbs';
        let output = this.renderTemplate(compiledTemplates[fileSlug], context, globalContext, inputFile);
        this.templateHelper.saveOutputFile(postSlug + '.html', output);
    }

    /*
     * Override post view settings with the settings of the posts
     */
    overridePostViewSettings(defaultPostViewConfig, postID, postPreview = false) {
        let postViewData = false;
        let postViewSettings = {};

        if(postPreview) {
            postViewSettings = this.postData.postViewSettings;
        } else {
            postViewData = this.db.prepare(`
                SELECT
                    value
                FROM
                    posts_additional_data
                WHERE
                    post_id = @postID
                    AND
                    key = 'postViewSettings'
            `).get({
                postID: postID
            });

            if (postViewData && postViewData.length) {
                postViewSettings = JSON.parse(postViewData.value);
            }
        }

        return PostViewSettingsHelper.override(postViewSettings, defaultPostViewConfig);
    }

    /*
     * Generate tag pages
     */
    generateTagsList(ampMode = false) {
        // Check if we should render tags list
        if (
            this.siteConfig.advanced.urls.tagsPrefix === '' ||
            !this.themeConfig.supportedFeatures ||
            !this.themeConfig.supportedFeatures.tagsList ||
            !this.themeConfig.renderer.createTagsList
        ) {
            return false;
        }
        
        console.time(ampMode ? 'TAGS-LIST-AMP' : 'TAGS-LIST');
        let inputFile = ampMode ? 'amp-tags.hbs' : 'tags.hbs';
        
        // Load template
        let compiledTemplate = this.compileTemplate(inputFile);

        if (!compiledTemplate) {
            return false;
        }

        // Create global context
        let globalContext = this.createGlobalContext('tags');

        // Render tags list
        globalContext.context = ['tags'];
        let contextGenerator = new RendererContextTags(this);
        let context = contextGenerator.getContext();
        this.menuContext = ['tags'];

        if (this.siteConfig.advanced.urls.tagsPrefix !== '') {            
            globalContext.website.pageUrl = this.siteConfig.domain + '/' + this.siteConfig.advanced.urls.tagsPrefix + '/';
            globalContext.website.ampUrl = this.siteConfig.domain + '/amp/' + this.siteConfig.advanced.urls.tagsPrefix + '/';
        }

        globalContext.renderer.isFirstPage = true;
        globalContext.renderer.isLastPage = true;
        globalContext.pagination = false;

        if (!this.siteConfig.advanced.ampIsEnabled) {
            globalContext.website.ampUrl = '';
        }

        let output = this.renderTemplate(compiledTemplate, context, globalContext, inputFile);
        this.templateHelper.saveOutputTagsListFile(output);
        console.timeEnd(ampMode ? 'TAGS-LIST-AMP' : 'TAGS-LIST');
    }

    /*
     * Generate tag pages
     */
    generateTags(tagID = false, ampMode = false) {
        console.time(ampMode ? 'TAGS-AMP' : 'TAGS');
        // Get tags
        let inputFile = ampMode ? 'amp-tag.hbs' : 'tag.hbs';
        let queryCondition = '';

        if (tagID !== false) {
            queryCondition = `
                WHERE 
                    t.id = ${parseInt(tagID, 10)}
            `;
        }

        let tagsData = this.db.prepare(`
            SELECT
                t.id AS id
            FROM
                tags AS t
            ${queryCondition}
            ORDER BY
                name ASC
        `).all();
        tagsData = tagsData.map(tag => this.cachedItems.tags[tag.id]);

        // Skip hidden tags
        tagsData = tagsData.filter(tagData => {
            return tagData.additionalData.isHidden !== true;
        });

        // Remove empty tags - without posts
        if (!this.siteConfig.advanced.displayEmptyTags && tagID === false) {
            tagsData = tagsData.filter(tagData => {
                return tagData.postsNumber > 0;
            });
        }

        // Simplify the structure - change arrays into single value
        let tagIDs = tagsData.map(tagData => tagData.id);
        let tagSlugs = tagsData.map(tagData => tagData.slug);
        let tagTemplates = tagsData.map(tagData => {
            if (!tagData.additionalData) {
                return 'DEFAULT';
            }

            if (tagData.additionalData.template) {
                if (tagData.additionalData.template === '' || !this.themeConfig.tagTemplates[tagData.additionalData.template]) {
                    return 'DEFAULT';
                } else {
                    return tagData.additionalData.template;
                }
            }

            return 'DEFAULT';
        });

        // Load templates
        let compiledTemplates = {};
        compiledTemplates['DEFAULT'] = this.compileTemplate(inputFile);

        if (!compiledTemplates['DEFAULT']) {
            return false;
        }

        if (!ampMode) {
            for (let i = 0; i < tagTemplates.length; i++) {
                let fileSlug = tagTemplates[i];

                // When we meet default template - skip the compilation process
                if (fileSlug === '' || fileSlug === 'DEFAULT') {
                    continue;
                }

                compiledTemplates[fileSlug] = this.compileTemplate('tag-' + fileSlug + '.hbs');

                if (!compiledTemplates[fileSlug]) {
                    return false;
                }
            }
        }

        // Create global context
        let globalContext = this.createGlobalContext('tag');
        let progressIncrease = 10 / tagsData.length;

        if(ampMode) {
            progressIncrease = 2 / tagsData.length;
        }

        // Render tag sites
        for (let i = 0; i < tagsData.length; i++) {
            globalContext.context = ['tag'];
            let contextGenerator = new RendererContextTag(this);
            let fileSlug = 'DEFAULT';

            if (!ampMode) {
                fileSlug = tagTemplates[i] === '' ? 'DEFAULT' : tagTemplates[i];
            }

            // Detect if we have enough posts to create pagination
            let totalNumberOfPosts = this.cachedItems.tags[tagIDs[i]].postsNumber;
            let postsPerPage = parseInt(this.themeConfig.config.tagsPostsPerPage, 10);
            let tagSlug = URLHelper.createSlug(tagSlugs[i]);

            if (isNaN(postsPerPage)) {
                postsPerPage = 5;
            }

            // Check for disabled tag pagination, tag posts amount or tag preview mode to avoid pagination files
            if (totalNumberOfPosts <= postsPerPage || postsPerPage <= 0 || this.siteConfig.advanced.tagNoPagination || tagID !== false) {
                let context = contextGenerator.getContext(tagIDs[i], 0, postsPerPage);

                this.menuContext = ['tag', tagSlug];
                globalContext.website.pageUrl = this.siteConfig.domain + '/' + tagSlug + '/';
                globalContext.website.ampUrl = this.siteConfig.domain + '/amp/' + tagSlug + '/';

                if (this.siteConfig.advanced.urls.tagsPrefix !== '') {                   
                    globalContext.website.pageUrl = this.siteConfig.domain + '/' + this.siteConfig.advanced.urls.tagsPrefix + '/' + tagSlug + '/';
                    globalContext.website.ampUrl = this.siteConfig.domain + '/amp/' + this.siteConfig.advanced.urls.tagsPrefix + '/' + tagSlug + '/';
                }

                globalContext.renderer.isFirstPage = true;
                globalContext.renderer.isLastPage = true;
                globalContext.pagination = false;

                if (!this.siteConfig.advanced.ampIsEnabled) {
                    globalContext.website.ampUrl = '';
                }

                if (!compiledTemplates[fileSlug]) {
                    fileSlug = 'DEFAULT';
                }

                inputFile = inputFile.replace('.hbs', '') + (fileSlug === 'DEFAULT' ? '' : '-' + fileSlug) + '.hbs';
                let output = this.renderTemplate(compiledTemplates[fileSlug], context, globalContext, inputFile);
                this.templateHelper.saveOutputTagFile(tagSlug, output, tagID !== false);
            } else {
                let addIndexHtml = this.previewMode || this.siteConfig.advanced.urls.addIndex;

                // If user set postsPerPage field to -1 - set it for calculations to 999
                postsPerPage = postsPerPage == -1 ? 999 : postsPerPage;

                for (let offset = 0; offset < totalNumberOfPosts; offset += postsPerPage) {
                    globalContext.context = ['tag'];
                    let context = contextGenerator.getContext(tagIDs[i], offset, postsPerPage);

                    // Add pagination data to the global context
                    let currentPage = 1;
                    let totalPages = 0;

                    if (postsPerPage > 0) {
                        currentPage = parseInt(offset / postsPerPage, 10) + 1;
                        totalPages = Math.ceil(totalNumberOfPosts / postsPerPage);
                    }

                    let nextPage = (currentPage < totalPages) ? currentPage + 1 : false;
                    let previousPage = (currentPage > 1) ? currentPage - 1 : false;
                    let tagsContextInUrl = tagSlug;

                    if (this.siteConfig.advanced.urls.tagsPrefix !== '') {
                        tagsContextInUrl = this.siteConfig.advanced.urls.tagsPrefix + '/' + tagSlug;
                    }

                    globalContext.pagination = {
                        context: tagsContextInUrl,
                        pages: Array.from({length: totalPages}, (v, k) => k + 1),
                        totalPosts: totalNumberOfPosts,
                        totalPages: totalPages,
                        currentPage: currentPage,
                        postsPerPage: postsPerPage,
                        nextPage: nextPage,
                        previousPage: previousPage,
                        nextPageUrl: URLHelper.createPaginationPermalink(this.siteConfig.domain, this.siteConfig.advanced.urls, nextPage, 'tag', tagSlug, addIndexHtml),
                        previousPageUrl: URLHelper.createPaginationPermalink(this.siteConfig.domain, this.siteConfig.advanced.urls, previousPage, 'tag', tagSlug, addIndexHtml)
                    };

                    globalContext.renderer.isFirstPage = currentPage === 1;
                    globalContext.renderer.isLastPage = currentPage === totalPages;

                    if (offset > 0) {
                        if (globalContext.context.indexOf('pagination') === -1) {
                            globalContext.context.push('pagination');
                        }

                        if (globalContext.context.indexOf('tag-pagination') === -1) {
                            globalContext.context.push('tag-pagination');
                        }
                    }

                    this.menuContext = ['tag', tagSlug];

                    if (currentPage > 1) {
                        let pagePart = this.siteConfig.advanced.urls.pageName;
                        globalContext.website.pageUrl = this.siteConfig.domain + '/' + tagSlug + '/' + pagePart + '/' + currentPage + '/';
                        globalContext.website.ampUrl = this.siteConfig.domain + '/amp/' + tagSlug + '/' + pagePart + '/' + currentPage + '/';

                        if (this.siteConfig.advanced.urls.tagsPrefix !== '') {
                            globalContext.website.pageUrl = this.siteConfig.domain + '/' + this.siteConfig.advanced.urls.tagsPrefix + '/' + tagSlug + '/' + pagePart + '/' + currentPage + '/';
                            globalContext.website.ampUrl = this.siteConfig.domain + '/amp/' + this.siteConfig.advanced.urls.tagsPrefix + '/' + tagSlug + '/' + pagePart + '/' + currentPage + '/';
                        }
                    } else {
                        globalContext.website.pageUrl = this.siteConfig.domain + '/' + tagSlug + '/';
                        globalContext.website.ampUrl = this.siteConfig.domain + '/amp/' + tagSlug + '/';

                        if (this.siteConfig.advanced.urls.tagsPrefix !== '') {
                            globalContext.website.pageUrl = this.siteConfig.domain + '/' + this.siteConfig.advanced.urls.tagsPrefix + '/' + tagSlug + '/';
                            globalContext.website.ampUrl = this.siteConfig.domain + '/amp/' + this.siteConfig.advanced.urls.tagsPrefix + '/' + tagSlug + '/';
                        }
                    }

                    if (!this.siteConfig.advanced.ampIsEnabled) {
                        globalContext.website.ampUrl = '';
                    }

                    if (!compiledTemplates[fileSlug]) {
                        fileSlug = 'DEFAULT';
                    }

                    inputFile = inputFile.replace('.hbs', '') + (fileSlug === 'DEFAULT' ? '' : '-' + fileSlug) + '.hbs';
                    let output = this.renderTemplate(compiledTemplates[fileSlug], context, globalContext, inputFile);

                    if (offset === 0) {
                        this.templateHelper.saveOutputTagFile(tagSlug, output, tagID !== false);
                    } else if (tagID === false) {
                        // We increase the current page number as we need to start URLs from tag-slug/page/2
                        this.templateHelper.saveOutputTagPaginationFile(tagSlug, currentPage, output);
                    }
                }
            }

            if(ampMode) {
                this.sendProgress(Math.ceil(97 + (progressIncrease * i)), 'Generating tag pages (' + (i+1) + '/' + tagIDs.length + ')');
            } else {
                this.sendProgress(Math.ceil(60 + (progressIncrease * i)), 'Generating tag pages (' + (i + 1) + '/' + tagIDs.length + ')');
            }
        }
        console.timeEnd(ampMode ? 'TAGS-AMP' : 'TAGS');
    }

    /*
     * Generate author pages
     */
    generateAuthors(authorID = false, ampMode = false) {
        console.time(ampMode ? 'AUTHORS-AMP' : 'AUTHORS');
        // Create directory for authors
        let authorsDirPath = path.join(this.outputDir, this.siteConfig.advanced.urls.authorsPrefix);
        fs.mkdirSync(authorsDirPath);

        // Get authors
        let authorsIDs = [];
        let authorsUsernames = [];
        let inputFile = ampMode ? 'amp-author.hbs' : 'author.hbs';
        let authorTemplates = [];
        let queryCondition = '';

        if (authorID !== false) {
            queryCondition = `
                WHERE 
                    a.id = ${parseInt(authorID, 10)}
            `;
        }
        let authorsData = this.db.prepare(`
            SELECT
                a.id AS id,
                a.username AS slug,
                a.config AS config,
                a.additional_data AS additional_data,
                COUNT(p.id) AS posts_number
            FROM
                authors AS a
            LEFT JOIN
                posts AS p
            ON
                CAST(p.authors AS INTEGER) = a.id
            ${queryCondition}
            GROUP BY
                a.id
            ORDER BY
                a.username ASC
        `).all();
        
        authorsData = authorsData.map(authorData => {
            try {
                authorData.config = JSON.parse(authorData.config);
            } catch (e) {
                authorData.config = '';
                console.log('[WARNING] Wrong author #' + authorData.id + ' config - invalid JSON value');
            }

            return authorData;
        });

        // Remove empty authors - without posts
        if (!this.siteConfig.advanced.displayEmptyAuthors && authorID === false) {
            authorsData = authorsData.filter(authorData => {
                return authorData.posts_number > 0;
            });
        }

        // Simplify the structure - change arrays into single value
        authorsIDs = authorsData.map(authorData => authorData.id);
        authorsUsernames = authorsData.map(authorData => authorData.slug);
        authorTemplates = authorsData.map(authorData => {
            if (authorData.config && authorData.config.template) {
                if (authorData.config.template === '' || !this.themeConfig.authorTemplates[authorData.config.template]) {
                    return 'DEFAULT';
                } else {
                    return authorData.config.template;
                }
            }

            return 'DEFAULT';
        });


        // Load templates
        let compiledTemplates = {};
        compiledTemplates['DEFAULT'] = this.compileTemplate(inputFile);

        if (!compiledTemplates['DEFAULT']) {
            return false;
        }

        if (!ampMode) {
            for (let i = 0; i < authorTemplates.length; i++) {
                let fileSlug = authorTemplates[i];

                // When we meet default template - skip the compilation process
                if (fileSlug === '' || fileSlug === 'DEFAULT') {
                    continue;
                }

                compiledTemplates[fileSlug] = this.compileTemplate('author-' + fileSlug + '.hbs');

                if (!compiledTemplates[fileSlug]) {
                    return false;
                }
            }
        }

        // Create global context
        let globalContext = this.createGlobalContext('author');

        // Render author sites
        for (let i = 0; i < authorsData.length; i++) {
            globalContext.context = ['author'];
            let contextGenerator = new RendererContextAuthor(this);
            let fileSlug = 'DEFAULT';

            if (!ampMode) {
                fileSlug = authorTemplates[i] === '' ? 'DEFAULT' : authorTemplates[i];
            }

            // Detect if we have enough posts to create pagination
            let totalNumberOfPosts = this.cachedItems.authors[authorsIDs[i]].postsNumber;
            let postsPerPage = parseInt(this.themeConfig.config.authorsPostsPerPage, 10);
            let authorUsername = URLHelper.createSlug(authorsUsernames[i]);

            if (isNaN(postsPerPage)) {
                postsPerPage = 5;
            }

            if (totalNumberOfPosts <= postsPerPage || postsPerPage <= 0 || this.siteConfig.advanced.authorNoPagination || authorID !== false) {
                let context = contextGenerator.getContext(authorsIDs[i], 0, postsPerPage);

                this.menuContext = ['author', authorUsername];
                globalContext.website.pageUrl = this.siteConfig.domain + '/' + this.siteConfig.advanced.urls.authorsPrefix + '/' + authorUsername + '/';
                globalContext.website.ampUrl = this.siteConfig.domain + '/amp/' + this.siteConfig.advanced.urls.authorsPrefix + '/' + authorUsername + '/';
                globalContext.renderer.isFirstPage = true;
                globalContext.renderer.isLastPage = true;
                globalContext.pagination = false;

                if (!this.siteConfig.advanced.ampIsEnabled) {
                    globalContext.website.ampUrl = '';
                }

                if (!compiledTemplates[fileSlug]) {
                    fileSlug = 'DEFAULT';
                }

                inputFile = inputFile.replace('.hbs', '') + (fileSlug === 'DEFAULT' ? '' : '-' + fileSlug) + '.hbs';
                let output = this.renderTemplate(compiledTemplates[fileSlug], context, globalContext, inputFile);
                this.templateHelper.saveOutputAuthorFile(authorUsername, output, authorID !== false);
            } else {
                let addIndexHtml = this.previewMode || this.siteConfig.advanced.urls.addIndex;

                // If user set postsPerPage field to -1 - set it for calculations to 999
                postsPerPage = postsPerPage == -1 ? 999 : postsPerPage;

                for (let offset = 0; offset < totalNumberOfPosts; offset += postsPerPage) {
                    globalContext.context = ['author'];
                    let context = contextGenerator.getContext(authorsIDs[i], offset, postsPerPage);

                    // Add pagination data to the global context
                    let currentPage = 1;
                    let totalPages = 0;

                    if (postsPerPage > 0) {
                        currentPage = parseInt(offset / postsPerPage, 10) + 1;
                        totalPages = Math.ceil(totalNumberOfPosts / postsPerPage);
                    }

                    let nextPage = (currentPage < totalPages) ? currentPage + 1 : false;
                    let previousPage = (currentPage > 1) ? currentPage - 1 : false;
                    let authorsContextInUrl = this.siteConfig.advanced.urls.authorsPrefix + '/' + authorUsername;

                    globalContext.pagination = {
                        context: authorsContextInUrl,
                        pages: Array.from({length: totalPages}, (v, k) => k + 1),
                        totalPosts: totalNumberOfPosts,
                        totalPages: totalPages,
                        currentPage: currentPage,
                        postsPerPage: postsPerPage,
                        nextPage: nextPage,
                        previousPage: previousPage,
                        nextPageUrl: URLHelper.createPaginationPermalink(this.siteConfig.domain, this.siteConfig.advanced.urls, nextPage, 'author', authorUsername, addIndexHtml),
                        previousPageUrl: URLHelper.createPaginationPermalink(this.siteConfig.domain, this.siteConfig.advanced.urls, previousPage, 'author', authorUsername, addIndexHtml)
                    };

                    globalContext.renderer.isFirstPage = currentPage === 1;
                    globalContext.renderer.isLastPage = currentPage === totalPages;

                    if (offset > 0) {
                        if (globalContext.context.indexOf('pagination') === -1) {
                            globalContext.context.push('pagination');
                        }

                        if (globalContext.context.indexOf('author-pagination') === -1) {
                            globalContext.context.push('author-pagination');
                        }
                    }

                    this.menuContext = ['author', authorUsername];

                    if (currentPage > 1) {
                        let pagePart = this.siteConfig.advanced.urls.pageName;
                        globalContext.website.pageUrl = this.siteConfig.domain + '/' + this.siteConfig.advanced.urls.authorsPrefix + '/' + authorUsername + '/' + pagePart + '/' + currentPage + '/';
                        globalContext.website.ampUrl = this.siteConfig.domain + '/amp/' + this.siteConfig.advanced.urls.authorsPrefix + '/' + authorUsername + '/' + pagePart + '/' + currentPage + '/';
                    } else {
                        globalContext.website.pageUrl = this.siteConfig.domain + '/' + this.siteConfig.advanced.urls.authorsPrefix + '/' + authorUsername + '/';
                        globalContext.website.ampUrl = this.siteConfig.domain + '/amp/' + this.siteConfig.advanced.urls.authorsPrefix + '/' + authorUsername + '/';
                    }

                    if (!this.siteConfig.advanced.ampIsEnabled) {
                        globalContext.website.ampUrl = '';
                    }

                    if (!compiledTemplates[fileSlug]) {
                        fileSlug = 'DEFAULT';
                    }

                    inputFile = inputFile.replace('.hbs', '') + (fileSlug === 'DEFAULT' ? '' : '-' + fileSlug) + '.hbs';
                    let output = this.renderTemplate(compiledTemplates[fileSlug], context, globalContext, inputFile);

                    if (offset === 0) {
                        this.templateHelper.saveOutputAuthorFile(authorUsername, output, authorID !== false);
                    } else if (authorID === false) {
                        // We increase the current page number as we need to start URLs from /authors/author-username/page/2
                        this.templateHelper.saveOutputAuthorPaginationFile(authorUsername, currentPage, output);
                    }
                }
            }
        }
        console.timeEnd(ampMode ? 'AUTHORS-AMP' : 'AUTHORS');
    }

    /*
     * Generate the 404 error page (if supported in the theme)
     */
    generate404s() {
        console.time("404");
        // Load template
        let inputFile = '404.hbs';
        let template = this.templateHelper.loadTemplate(inputFile);
        let compiledTemplate = this.compileTemplate(inputFile);

        if (!compiledTemplate) {
            return false;
        }

        // Create global context
        let globalContext = this.createGlobalContext('404');

        // Render index site
        let contextGenerator = new RendererContext404(this);
        let context = contextGenerator.getContext();

        this.menuContext = ['404'];
        globalContext.website.pageUrl = this.siteConfig.domain + '/';
        globalContext.website.ampUrl = '';
        globalContext.renderer.isFirstPage = true;
        globalContext.renderer.isLastPage = true;

        let output = this.renderTemplate(compiledTemplate, context, globalContext, inputFile);
        this.templateHelper.saveOutputFile(this.siteConfig.advanced.urls.errorPage, output);
        console.timeEnd("404");
    }

    /*
     * Generate the 404 error page (if supported in the theme)
     */
    generateSearch() {
        console.time("SEARCH");
        // Load template
        let inputFile = 'search.hbs';
        let compiledTemplate = this.compileTemplate('search.hbs');

        if(!compiledTemplate) {
            return false;
        }

        // Create global context
        let globalContext = this.createGlobalContext('search');

        // Render index site
        let contextGenerator = new RendererContextSearch(this);
        let context = contextGenerator.getContext();

        this.menuContext = ['search'];
        globalContext.website.pageUrl = this.siteConfig.domain + '/';
        globalContext.website.ampUrl = '';
        globalContext.renderer.isFirstPage = true;
        globalContext.renderer.isLastPage = true;

        let output = this.renderTemplate(compiledTemplate, context, globalContext, inputFile);
        this.templateHelper.saveOutputFile(this.siteConfig.advanced.urls.searchPage, output);
        console.timeEnd("SEARCH");
    }

    /*
     * Create the override.css file and merge it with main.css file
     */
    generateCSS() {
        console.time('CSS');

        let themeVariablesCSS = this.getThemeVariablesCSS();
        let mainCSS = this.getMainCSS();
        let gdprPopupCSS = this.getGdprPopupCSS();
        let overrideCSS = this.getOverrideCSS();
        let customCSS = this.getCustomCSS();
        // Concatenate all CSS codes into one codebase
        let styleCSS = themeVariablesCSS + mainCSS + gdprPopupCSS + overrideCSS + customCSS;
        let newFileName = path.join(this.themeDir, this.themeConfig.files.assetsPath, 'css', 'style.css');
        let overridedNewFileName = UtilsHelper.fileIsOverrided(this.themeDir, newFileName);

        if (overridedNewFileName) {
            newFileName = overridedNewFileName;
        }

        // minify CSS if user enabled it
        if (this.siteConfig.advanced.cssCompression) {
            styleCSS = new CleanCSS({ compatibility: '*', rebase: false }).minify(styleCSS);
            console.log('CSS stats: ' + styleCSS.stats.efficiency + ' (' + styleCSS.stats.minifiedSize + '/' + styleCSS.stats.originalSize + ')');
            styleCSS = styleCSS.styles;
        }

        fs.writeFileSync(newFileName, styleCSS, {'flags': 'w'});
        console.timeEnd('CSS');
    }

    /**
     * Returns compiled CSS based on theme-variables.js
     */
    getThemeVariablesCSS() {
        let themeVariablesPath = path.join(this.themeDir, 'theme-variables.js');
        let overridedThemeVariablesPath = UtilsHelper.fileIsOverrided(this.themeDir, themeVariablesPath);
        
        if (overridedThemeVariablesPath) {
            themeVariablesPath = overridedThemeVariablesPath;
        }

        // check if the theme contains theme-variables.js file
        if (UtilsHelper.fileExists(themeVariablesPath)) {
            try {
                let generateOverride = UtilsHelper.requireWithNoCache(themeVariablesPath);
                let visualParams = JSON.parse(JSON.stringify(this.themeConfig.customConfig));
                return generateOverride(visualParams) + styleCSS;
            } catch(e) {
                this.errorLog.push({
                    message: 'An error (1003) occurred during preparing CSS theme variables.',
                    desc: e.message
                });
            }
        }

        return '';
    }

    /**
     * Returns the main CSS of the theme
     */
    getMainCSS () {
        let cssPath = path.join(this.themeDir, this.themeConfig.files.assetsPath, 'css', 'main.css');
        let overridedCssPath = UtilsHelper.fileIsOverrided(this.themeDir, cssPath);

        if (overridedCssPath) {
            cssPath = overridedCssPath;
        }

        return fs.readFileSync(cssPath, 'utf8');
    }

    /**
     * Creates CSS for GDPR popup
     */
    getGdprPopupCSS () {
        if (this.siteConfig.advanced.gdpr.enabled) {
            return Gdpr.popupCssOutput();
        }

        return '';
    }

    /**
     * Returns compiled CSS based on visual-override.js
     */
    getOverrideCSS () {
        let overridePath = path.join(this.themeDir, 'visual-override.js');
        let overridedOverridePath = UtilsHelper.fileIsOverrided(this.themeDir, overridePath);

        if (overridedOverridePath) {
            overridePath = overridedOverridePath;
        }

        // check if the theme contains visual-override.js file
        if (UtilsHelper.fileExists(overridePath)) {
            try {
                let generateOverride = UtilsHelper.requireWithNoCache(overridePath);
                let visualParams = JSON.parse(JSON.stringify(this.themeConfig.customConfig));
                return generateOverride(visualParams);
            } catch(e) {
                this.errorLog.push({
                    message: 'An error (1003) occurred during preparing CSS overrides.',
                    desc: e.message
                });
            }
        }

        return '';
    }

    /**
     * Returns additional custom CSS code
     */
    getCustomCSS () {
        let customCSSPath = path.join(this.sitesDir, this.siteName, 'input', 'config', 'custom-css.css');

        if (UtilsHelper.fileExists(customCSSPath)) {
            return fs.readFileSync(customCSSPath, 'utf8');
        }

        return '';
    }

    /*
     * Create feeds
     */
    generateFeeds() {
        if (!this.siteConfig.advanced.feed.enableRss && !this.siteConfig.advanced.feed.enableJson) {
            return;
        }

        console.time('FEEDS');

        if (this.siteConfig.advanced.feed.enableRss) {
            this.generateFeed('xml');
        }

        if (this.siteConfig.advanced.feed.enableJson) {
            this.generateFeed('json');
        }

        console.timeEnd('FEEDS');
    }

    /*
     * Create XML/JSON feed file
     */
    generateFeed(format = 'xml') {
        let compiledTemplate = this.compileTemplate('feed-' + format + '.hbs');

        if(!compiledTemplate) {
            return false;
        }

        // Render feed view
        let contextGenerator = new RendererContextFeed(this);
        let numberOfPosts = this.siteConfig.advanced.feed.numberOfPosts;

        if(typeof numberOfPosts === "undefined") {
            numberOfPosts = 10;
        }

        let context = contextGenerator.getContext(numberOfPosts);
        let output = this.renderTemplate(compiledTemplate, context, false, 'feed-' + format + '.hbs');
        this.templateHelper.saveOutputFile('feed.' + format, output);
    }

    async generateSitemap() {
        if(!this.siteConfig.advanced.sitemapEnabled) {
            return;
        }

        console.time("SITEMAP");
        let sitemapGenerator = new Sitemap(this.db, this.outputDir, this.siteConfig, this.themeConfig);
        await sitemapGenerator.create();
        console.timeEnd("SITEMAP");
    }

    generateAMP() {
        if(!this.siteConfig.advanced.ampIsEnabled) {
            return;
        }

        console.time("AMP");
        // Prepared directory
        fs.mkdirSync(path.join(this.outputDir, 'amp'));
        // Enable amp mode
        this.ampMode = true;
        // Change template helper output dir
        this.outputDir = path.join(this.outputDir, 'amp');
        this.templateHelper.outputDir = path.join(this.templateHelper.outputDir, 'amp');
        // Extend domain with /amp/ directory
        this.siteConfig.domain += '/amp';
        // Regenerate data for AMP mode
        this.loadContentStructure();
        // Prepare files
        this.generateFrontpage(true);
        this.generatePosts(true);

        if (RendererHelpers.getRendererOptionValue('createTagPages', this.themeConfig)) {
            this.generateTags(false, true);
        }

        if (RendererHelpers.getRendererOptionValue('createAuthorPages', this.themeConfig)) {
            this.generateAuthors(false, true);
        }

        console.timeEnd("AMP");
    }

    /**
     * Copy input files to the output directory
     */
    async copyFiles() {
        console.time("FILES");
        let postIDs = Object.keys(this.cachedItems.posts);
        FilesHelper.copyRootFiles(this.inputDir, this.outputDir);
        FilesHelper.copyAssetsFiles(this.themeDir, this.outputDir, this.themeConfig);
        await FilesHelper.copyMediaFiles(this.inputDir, this.outputDir, postIDs);
        console.timeEnd("FILES");
    }

    loadContentStructure() {
        console.time("CONTENT DATA");
        let globalContextGenerator = new RendererContext(this);
        this.cachedItems = {
            postTags: {},
            posts: {},
            tags: {},
            tagsPostCounts: {},
            authors: {},
            authorsPostCounts: {},
            featuredImages: {
                authors: {},
                posts: {},
                tags: {}
            }
        };
        globalContextGenerator.getCachedItems();
        this.contentStructure = globalContextGenerator.getContentStructure();
        console.timeEnd("CONTENT DATA");
    }

    loadCommonData() {
        console.time("COMMON DATA");
        let globalContextGenerator = new RendererContext(this);
        let menusData = globalContextGenerator.getMenus();

        this.commonData = {
            tags: globalContextGenerator.getAllTags(),
            authors: globalContextGenerator.getAuthors(),
            menus: menusData.assigned,
            unassignedMenus: menusData.unassigned,
            featuredPosts: {
                homepage: globalContextGenerator.getFeaturedPosts('homepage'),
                tag: globalContextGenerator.getFeaturedPosts('tag'),
                author: globalContextGenerator.getFeaturedPosts('author')
            },
            hiddenPosts: globalContextGenerator.getHiddenPosts()
        };
        console.timeEnd("COMMON DATA");
    }

    createGlobalContext(context) {
        let globalContextGenerator = new RendererContext(this);
        let globalContext = globalContextGenerator.getGlobalContext();
        globalContext.context = [context];
        globalContext.config = URLHelper.prepareSettingsImages(this.siteConfig.domain, {
            basic: JSON.parse(JSON.stringify(this.themeConfig.config)),
            site: JSON.parse(JSON.stringify(this.siteConfig.advanced)),
            custom: JSON.parse(JSON.stringify(this.themeConfig.customConfig))
        });
        globalContext.website.language = this.siteConfig.language;
        globalContext.website.contentStructure = this.contentStructure;

        return globalContext;
    }

    compileTemplate(inputFile) {
        let compiledTemplate = false;
        let template = this.templateHelper.loadTemplate(inputFile);

        if((inputFile === 'feed-xml.hbs' || inputFile === 'feed-json.hbs') && !template) {
            // Load default feed.hbs file if it not exists inside the theme directory
            let feedPath = path.join(__dirname, '..', '..', '..', 'default-files', 'theme-files', inputFile);
            template = fs.readFileSync(feedPath, 'utf8');
        }

        if(!template) {
            this.errorLog.push({
                message: 'File ' + inputFile + ' does not exist.',
                desc: ''
            });
        }

        try {
            compiledTemplate = Handlebars.compile(template);
        } catch(e) {
            this.errorLog.push({
                message: 'An error (1001) occurred during parsing ' + inputFile + ' file.',
                desc: e.message
            });

            return false;
        }

        return compiledTemplate;
    }

    renderTemplate(compiledTemplate, context, globalContext, inputFile) {
        let output = '';

        try {
            output = compiledTemplate(context, {
                data: globalContext
            });
        } catch(e) {
            this.errorLog.push({
                message: 'An error (1002) occurred during parsing ' + inputFile + ' file.',
                desc: e.message
            });

            return '';
        }

        return output;
    }

    /**
     * Make URLs in the HTML files relative
     */
    async relativizeUrls () {
        let files = await listAll([this.outputDir], { recurse: true, flatten: true });
        files = files.filter(file => file.path.substr(-5) === '.html' && file.mode.dir === false);
        files = files.map(file => file.path.replace(this.outputDir, ''));
        
        for (let file of files) {
            this.relativizeUrlsInFile(file, this.outputDir);
        }
    }

    /**
     * Make URLs relative in a given HTML file
     * 
     * @param {string} file - relative path to file
     * @param {string} outputDir - output dir
     */
    relativizeUrlsInFile (file, outputDir) {
        let filePath = path.join(outputDir, file);
        let content = fs.readFileSync(filePath, 'utf8');
        let depth = file.split('/').length - 2;
        let relativeDomain = './' + '../'.repeat(depth);

        if (relativeDomain.length) {
            relativeDomain = relativeDomain.slice(0, -1);
        }

        content = content.replace(/#PUBLII_RELATIVE_URL_BASE#/gmi, relativeDomain);
        fs.writeFileSync(filePath, content, 'utf8');
    }
}

module.exports = Renderer;
