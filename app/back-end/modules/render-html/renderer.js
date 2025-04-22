// Necessary packages
const fs = require('fs-extra');
const listAll = require('ls-all');
const path = require('path');
const Handlebars = require('handlebars');
const CleanCSS = require('clean-css');
const normalizePath = require('normalize-path');
const os = require('os');

// Internal packages
const DBUtils = require('./../../helpers/db.utils.js');
const Database = os.platform() === 'linux' ? require('node-sqlite3-wasm').Database : require('better-sqlite3');
const URLHelper = require('./helpers/url.js');
const FilesHelper = require('./helpers/files.js');
const ViewSettingsHelper = require('./helpers/view-settings.js');
const Themes = require('../../themes.js');
const TemplateHelper = require('./helpers/template.js');
const RendererContext = require('./renderer-context.js');
const RendererContextPage = require('./contexts/page.js');
const RendererContextPost = require('./contexts/post.js');
const RendererContextPagePreview = require('./contexts/page-preview.js');
const RendererContextPostPreview = require('./contexts/post-preview.js');
const RendererContextTag = require('./contexts/tag.js');
const RendererContextTags = require('./contexts/tags.js');
const RendererContextAuthor = require('./contexts/author.js');
const RendererContextHome = require('./contexts/home.js');
const RendererContextFeed = require('./contexts/feed.js');
const RendererContext404 = require('./contexts/404.js');
const RendererContextSearch = require('./contexts/search.js');
const RendererHelpers = require('./helpers/helpers.js');
const RendererPlugins = require('./renderer-plugins.js');
const themeConfigValidator = require('./validators/theme-config.js');
const UtilsHelper = require('./../../helpers/utils');
const Sitemap = require('./helpers/sitemap.js');
const Gdpr = require('./helpers/gdpr.js');
const Git = require('./../deploy/git.js');

// Default config
const defaultAstCurrentSiteConfig = require('./../../../config/AST.currentSite.config');
const { advanced } = require('./../../../config/AST.currentSite.config');

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
        this.useRelativeUrls = siteConfig.deployment.relativeUrls;
        let sitePath = path.join(this.sitesDir, this.siteName);
        this.plugins = new RendererPlugins(sitePath);
        this.translations = {
            user: false,
            theme: false
        };
        this.viewConfigStructure = {};
        this.contentStructure = {};
        this.commonData = {
            tags: [],
            mainTags: [],
            authors: [],
            menus: [],
            pages: [],
            featuredPosts: {
                homepage: [],
                tag: [],
                author: []
            },
            hiddenPosts: []
        };
        this.cachedItems = {
            pages: {},
            pagesStructure: {},
            postTags: {},
            posts: {},
            tags: {},
            mainTags: {},
            tagsPostCounts: {},
            authors: {},
            authorsPostCounts: {},
            featuredImages: {
                authors: {},
                pages: {},
                posts: {},
                tags: {}
            }
        };
        this.globalContext = null;
        this.itemID = itemID;
        this.postData = postData;
        this.pluginsDir = path.join(this.appDir, 'plugins');
        this.loadPlugins();
    }

    /*
     * Renders the pages
     */
    async render(previewMode = false, previewLocation = '', mode = 'full') {
        this.previewMode = previewMode;
        this.previewLocation = previewLocation;
        this.singlePageMode = mode === 'post' || mode === 'page';
        this.itemType = mode;
        this.homepageOnlyMode = mode === 'home';
        this.tagOnlyMode = mode === 'tag';
        this.authorOnlyMode = mode === 'author';
        this.setIO();
        await this.emptyOutputDir();
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
                if (this.itemType === 'post') {
                    await this.renderPostPreview();
                } else if (this.itemType === 'page') {
                    await this.renderPagePreview();
                }
            } else if (this.homepageOnlyMode && !this.siteConfig.advanced.usePageAsFrontpage) {
                await this.renderHomepagePreview();
            } else if (this.tagOnlyMode) {
                await this.renderTagPreview();
            } else if (this.authorOnlyMode) {
                await this.renderAuthorPreview();
            } else {
                await this.renderFullPreview();
            }
        } catch (e) {
            this.errorLog.push({
                message: 'An error occurred during rendering process:',
                desc: e.message + "\n\n" + e.stack
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
        this.triggerEvent('beforeRender');
        await this.generateWWW();
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
        // We must generate CSS before any HTML files to receive correct checksum if version param is used to solve issues with browser cache
        this.generateCSS();
        
        if ((this.homepageOnlyMode && !this.siteConfig.advanced.usePageAsFrontpage) || !this.homepageOnlyMode) {
            this.sendProgress(11, 'Generating frontpage');
            this.generateFrontpage();
            this.sendProgress(20, 'Generating posts');
            this.generatePosts();
            this.sendProgress(50, 'Generating pages');
            this.generatePages();

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
        } else {
            this.generatePages();
        }
        
        if (!this.siteConfig.deployment.relativeUrls) {
            this.generateFeeds();
        }

        this.sendProgress(80, 'Copying files');
        await this.copyFiles();

        if (!this.siteConfig.deployment.relativeUrls && !this.siteConfig.advanced.noIndexThisPage) {
            await this.generateSitemap();
        }

        this.createRobotsTxt();
        this.triggerEvent('afterRender');
        this.sendProgress(90, 'Finishing the render process');
    }

    preparePreview (type) {
        this.loadSiteConfig();
        this.loadSiteTranslations();
        this.loadDataFromDB();
        this.loadThemeConfig();
        this.loadThemeFiles();
        this.registerHelpers();
        this.registerThemeHelpers();
        this.loadContentStructure();
        this.loadCommonData();
        this.triggerEvent('beforeRender');
        this.generatePartials();

        if (type === 'post') {
            this.generatePost();
        } else if (type === 'page') {
            this.generatePage();
        } else if (type === 'frontpage') {
            this.generateFrontpage();
        } else if (type === 'tag') {
            this.generateTags(this.itemID);
        } else if (type === 'author') {
            this.generateAuthors(this.itemID);
        }

        this.generateCSS();
    }

    /**
     * Renders post preview
     */
    async renderPostPreview () {
        this.preparePreview('post');

        await FilesHelper.copyAssetsFiles(this.themeDir, this.outputDir, this.themeConfig);
        FilesHelper.copyDynamicAssetsFiles(this.themeDir, this.outputDir, this.themeConfig);
        await FilesHelper.copyMediaFiles(this.inputDir, this.outputDir, [this.itemID], []);
        FilesHelper.copyPluginFiles(this.inputDir, this.outputDir, this.pluginsDir);

        this.triggerEvent('afterRender');
    }

    /**
     * Renders page preview
     */
    async renderPagePreview () {
        this.preparePreview('page');

        await FilesHelper.copyAssetsFiles(this.themeDir, this.outputDir, this.themeConfig);
        FilesHelper.copyDynamicAssetsFiles(this.themeDir, this.outputDir, this.themeConfig);
        await FilesHelper.copyMediaFiles(this.inputDir, this.outputDir, [this.itemID], []);
        FilesHelper.copyPluginFiles(this.inputDir, this.outputDir, this.pluginsDir);

        this.triggerEvent('afterRender');
    }

    /**
     * Renders homepage preview
     */
    async renderHomepagePreview () {
        this.preparePreview('frontpage');

        let postIDs = Object.keys(this.cachedItems.posts);
        let pageIDs = Object.keys(this.cachedItems.pages);
        await FilesHelper.copyAssetsFiles(this.themeDir, this.outputDir, this.themeConfig);
        FilesHelper.copyDynamicAssetsFiles(this.themeDir, this.outputDir, this.themeConfig);
        await FilesHelper.copyMediaFiles(this.inputDir, this.outputDir, postIDs, pageIDs);
        FilesHelper.copyPluginFiles(this.inputDir, this.outputDir, this.pluginsDir);

        this.triggerEvent('afterRender');
    }

    /**
     * Renders tag page preview
     */
    async renderTagPreview () {
        this.preparePreview('tag');

        let postIDs = Object.keys(this.cachedItems.posts);
        let pageIDs = Object.keys(this.cachedItems.pages);
        let postIDsToRender = [];

        for (let i = 0; i < postIDs.length; i++) {
            let postID = postIDs[i];
            let foundedTags = this.cachedItems.posts[postID].tags.filter(tag => tag.id === this.itemID);

            if (foundedTags.length) {
                postIDsToRender.push(postIDs[i]);
            }
        }

        await FilesHelper.copyAssetsFiles(this.themeDir, this.outputDir, this.themeConfig);
        FilesHelper.copyDynamicAssetsFiles(this.themeDir, this.outputDir, this.themeConfig);
        await FilesHelper.copyMediaFiles(this.inputDir, this.outputDir, postIDsToRender, pageIDs);
        FilesHelper.copyPluginFiles(this.inputDir, this.outputDir, this.pluginsDir);

        this.triggerEvent('afterRender');
    }

    /**
     * Renders author page preview
     */
    async renderAuthorPreview () {
        this.preparePreview('author');

        let postIDs = Object.keys(this.cachedItems.posts);
        let pageIDs = Object.keys(this.cachedItems.pages);
        let postIDsToRender = [];

        for (let i = 0; i < postIDs.length; i++) {
            let postID = postIDs[i];
            let usesCurrentAuthor = this.cachedItems.posts[postID].author.id === this.itemID;

            if (usesCurrentAuthor) {
                postIDsToRender.push(postIDs[i]);
            }
        }

        await FilesHelper.copyAssetsFiles(this.themeDir, this.outputDir, this.themeConfig);
        FilesHelper.copyDynamicAssetsFiles(this.themeDir, this.outputDir, this.themeConfig);
        await FilesHelper.copyMediaFiles(this.inputDir, this.outputDir, postIDsToRender, pageIDs);
        FilesHelper.copyPluginFiles(this.inputDir, this.outputDir, this.pluginsDir);

        this.triggerEvent('afterRender');
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
    async emptyOutputDir() {
        if (UtilsHelper.dirExists(this.outputDir)) {
            if (this.previewMode === false && this.siteConfig.deployment.protocol === 'git') {
                let gitClient = new Git(false);
                await gitClient.prepareToSync(this.siteConfig, this.siteName, this.outputDir, this.sendProgress);
            }

            let files = fs.readdirSync(this.outputDir);
            
            for (let file of files) {
                if (file === '.git' || file === '.' || file === '..' || file === 'media') {
                    continue;
                }

                fs.rmSync(path.join(this.outputDir, file), { recursive: true });
            }
        } else {
            fs.mkdirSync(this.outputDir, { recursive: true });

            if (this.previewMode === false && this.siteConfig.deployment.protocol === 'git') {
                let gitClient = new Git(false);
                let result = await gitClient.prepareToSync(this.siteConfig, this.siteName, this.outputDir, this.sendProgress);

                if (result === 'merge-error') {
                    fs.rmSync(path.join(this.outputDir, '.git'), { recursive: true });
                    console.log('[i] Git Debug: remove .git folder due merge errors');
                    await gitClient.prepareToSync(this.siteConfig, this.siteName, this.outputDir, this.sendProgress);
                }
            }
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
        
        if (RendererHelpers.getRendererOptionValue('includeHandlebarsInHelpers', this.themeConfig)) {
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
            this.siteConfig.domain = 'file:///' + this.outputDir;
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
        this.db = new DBUtils(new Database(dbPath));
    }

    /*
     * Load and parse theme config file
     */
    loadThemeConfig() {
        let themeConfigPath = path.join(this.inputDir, 'config', 'theme.config.json');
        let tempThemeConfig = Themes.loadThemeConfig(themeConfigPath, this.themeDir);
        this.themeConfig = JSON.parse(JSON.stringify(tempThemeConfig));
        
        let configNames = [
            'config',
            'customConfig',
            'postConfig',
            'pageConfig',
            'tagConfig',
            'authorConfig'
        ];
        
        for (let configName of configNames) {
            this.themeConfig[configName] = {};
            this.viewConfigStructure[configName] = {};
        
            for (let i = 0; i < tempThemeConfig[configName].length; i++) {
                let key = tempThemeConfig[configName][i].name;
                this.themeConfig[configName][key] = tempThemeConfig[configName][i].value;
                this.viewConfigStructure[configName][key] = { type: tempThemeConfig[configName][i].type };
            }
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
            'menu'
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
                    desc: e.message + "\n\n" + e.stack
                });
            }
        }

        console.timeEnd('PARTIALS GENERATION');
    }

    /*
     * Generate the main view of the theme
     */
    generateFrontpage() {
        // Load template
        let inputFile = 'index.hbs';
        let homeCompiledTemplate = this.compileTemplate(inputFile);
        let postsCompiledTemplate;
        let compiledTemplate;

        if (this.themeConfig.supportedFeatures && this.themeConfig.supportedFeatures.postsPage) {
            postsCompiledTemplate = this.compileTemplate('posts.hbs');
        } else {
            postsCompiledTemplate = this.compileTemplate('index.hbs');
        }

        // Don't render homepage and it's pagination if we use page as frontpage and posts prefix is empty
        if (this.siteConfig.advanced.usePageAsFrontpage && !this.siteConfig.advanced.urls.postsPrefix) {
            return false;
        }

        // Render index site
        let contextGenerator = new RendererContextHome(this);

        // Detect if we have enough posts to create pagination
        let totalNumberOfPosts = contextGenerator.getPostsNumber();
        let postsPerPage = parseInt(this.themeConfig.config.postsPerPage, 10);

        if (isNaN(postsPerPage)) {
            postsPerPage = 5;
        }

        let hasBlogPagination = !(totalNumberOfPosts <= postsPerPage || postsPerPage <= 0 || this.siteConfig.advanced.homepageNoPagination);
        
        // When we have blog pagination
        if (hasBlogPagination) {
            console.time('BLOG PAGINATION');
            let addIndexHtml = this.previewMode || this.siteConfig.advanced.urls.addIndex;

            // If user set postsPerPage field to -1 - set it for calculations to 999
            postsPerPage = postsPerPage == -1 ? 999 : postsPerPage;

            for (let offset = 0; offset < totalNumberOfPosts; offset += postsPerPage) {
                // Add pagination data to the global context
                let currentPage = 1;
                let totalPages = 0;

                if (postsPerPage > 0) {
                    currentPage = parseInt(offset / postsPerPage, 10) + 1;
                    totalPages = Math.ceil(totalNumberOfPosts / postsPerPage)
                }

                let nextPage = (currentPage < totalPages) ? currentPage + 1 : false;
                let previousPage = (currentPage > 1) ? currentPage - 1 : false;

                let pagination = {
                    context: '',
                    pages: Array.from({length: totalPages}, (v, k) => k + 1),
                    totalPosts: totalNumberOfPosts,
                    totalPages: totalPages,
                    currentPage: currentPage,
                    postsPerPage: postsPerPage,
                    nextPage: nextPage,
                    previousPage: previousPage,
                    nextPageUrl: URLHelper.createPaginationPermalink(this.siteConfig, this.themeConfig, nextPage, 'home', false, addIndexHtml),
                    previousPageUrl: URLHelper.createPaginationPermalink(this.siteConfig, this.themeConfig, previousPage, 'home', false, addIndexHtml)
                };

                let additionalContexts = [];

                if (offset > 0) {
                    additionalContexts = ['pagination', 'index-pagination'];
                }

                // detect frontpage/blog index
                if (offset === 0) {
                    if (this.siteConfig.advanced.urls.postsPrefix === '' && !this.siteConfig.advanced.usePageAsFrontpage) {
                        compiledTemplate = homeCompiledTemplate;
                        this.menuContext = ['frontpage'];
                        let context = contextGenerator.getContext(offset, postsPerPage);
                        additionalContexts.push('homepage');
                        this.globalContext = this.createGlobalContext('index', additionalContexts, {
                            pagination,
                            isFirstPage: currentPage === 1,
                            isLastPage: currentPage === totalPages,
                            currentPage
                        }, false, false, context);

                        let output = this.renderTemplate(compiledTemplate, context, this.globalContext, inputFile);

                        if (this.plugins.hasModifiers('htmlOutput')) {
                            output = this.plugins.runModifiers('htmlOutput', this, output, [this.globalContext, context]); 
                        }
                        
                        this.templateHelper.saveOutputFile('index.html', output);
                    } else if (this.siteConfig.advanced.urls.postsPrefix !== '') {
                        compiledTemplate = postsCompiledTemplate;
                        this.menuContext = ['blogpage'];
                        let context = contextGenerator.getContext(offset, postsPerPage);
                        this.globalContext = this.createGlobalContext('blogindex', additionalContexts, {
                            pagination,
                            isFirstPage: currentPage === 1,
                            isLastPage: currentPage === totalPages,
                            currentPage
                        }, false, false, context);

                        let output = this.renderTemplate(compiledTemplate, context, this.globalContext, inputFile);

                        if (this.plugins.hasModifiers('htmlOutput')) {
                            output = this.plugins.runModifiers('htmlOutput', this, output, [this.globalContext, context]); 
                        }
                        
                        this.templateHelper.saveOutputFile(path.join(this.siteConfig.advanced.urls.postsPrefix, 'index.html'), output);

                        if (!this.siteConfig.advanced.usePageAsFrontpage) {
                            compiledTemplate = homeCompiledTemplate;

                            this.menuContext = ['frontpage'];
                            let context = contextGenerator.getContext(offset, postsPerPage);
                            additionalContexts.push('homepage');
                            this.globalContext = this.createGlobalContext('index', additionalContexts, {
                                pagination,
                                isFirstPage: currentPage === 1,
                                isLastPage: currentPage === totalPages,
                                currentPage
                            }, false, false, context);

                            let output = this.renderTemplate(compiledTemplate, context, this.globalContext, inputFile);

                            if (this.plugins.hasModifiers('htmlOutput')) {
                                output = this.plugins.runModifiers('htmlOutput', this, output, [this.globalContext, context]); 
                            }
                            
                            this.templateHelper.saveOutputFile('index.html', output);
                        }
                    }
                } else {
                    this.menuContext = ['frontpage'];

                    if (this.siteConfig.advanced.urls.postsPrefix !== '') {
                        this.menuContext = ['blogpage'];
                    }
                    let context = contextGenerator.getContext(offset, postsPerPage);
                    this.globalContext = this.createGlobalContext('blogindex', additionalContexts, {
                        pagination,
                        isFirstPage: currentPage === 1,
                        isLastPage: currentPage === totalPages,
                        currentPage
                    }, false, false, context);

                    let templateToUse = this.siteConfig.advanced.urls.postsPrefix !== '' ? postsCompiledTemplate : homeCompiledTemplate;
                    let output = this.renderTemplate(templateToUse, context, this.globalContext, inputFile);

                    if (this.plugins.hasModifiers('htmlOutput')) {
                        output = this.plugins.runModifiers('htmlOutput', this, output, [this.globalContext, context]); 
                    }

                    // We increase the current page number as we need to start URLs from page/2
                    this.templateHelper.saveOutputHomePaginationFile(currentPage, output);
                }
            }
            
            console.timeEnd('BLOG PAGINATION');
        }

        // When there is no blog pagination
        if (!hasBlogPagination) {
            console.time('HOMEPAGE');
            
            let output = '';

            if (this.siteConfig.advanced.urls.postsPrefix === '' && !this.siteConfig.advanced.usePageAsFrontpage) {
                this.menuContext = ['frontpage'];
                let context = contextGenerator.getContext(0, postsPerPage);
                this.globalContext = this.createGlobalContext('index', ['homepage'], false, false, false, context);

                output = homeCompiledTemplate(context, {
                    data: this.globalContext
                });
    
                if (this.plugins.hasModifiers('htmlOutput')) {
                    output = this.plugins.runModifiers('htmlOutput', this, output, [this.globalContext, context]); 
                }
    
                this.templateHelper.saveOutputFile('index.html', output);
            } else if (this.siteConfig.advanced.urls.postsPrefix !== '') {
                this.menuContext = ['blogpage'];
                let context = contextGenerator.getContext(0, postsPerPage);
                this.globalContext = this.createGlobalContext('blogindex', [], false, false, false, context);

                output = postsCompiledTemplate(context, {
                    data: this.globalContext
                });
    
                if (this.plugins.hasModifiers('htmlOutput')) {
                    output = this.plugins.runModifiers('htmlOutput', this, output, [this.globalContext, context]); 
                }
    
                this.templateHelper.saveOutputFile(path.join(this.siteConfig.advanced.urls.postsPrefix, 'index.html'), output);

                if (!this.siteConfig.advanced.usePageAsFrontpage) {
                    this.menuContext = ['frontpage'];
                    let context = contextGenerator.getContext(0, postsPerPage);
                    this.globalContext = this.createGlobalContext('index', [], false, false, false, context);

                    output = homeCompiledTemplate(context, {
                        data: this.globalContext
                    });
        
                    if (this.plugins.hasModifiers('htmlOutput')) {
                        output = this.plugins.runModifiers('htmlOutput', this, output, [this.globalContext, context]); 
                    }
        
                    this.templateHelper.saveOutputFile('index.html', output);
                }
            }

            console.timeEnd('HOMEPAGE');
        }
    }

    /*
     * Create post sites
     */
    generatePosts() {
        console.time('POSTS');
        let postIDs = [];
        let postSlugs = [];
        let postTemplates = [];
        let inputFile = 'post.hbs';

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
                status NOT LIKE '%is-page%' AND
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

        // Create global context
        let progressIncrease = 40 / postIDs.length;

        // Render post sites
        for (let i = 0; i < postIDs.length; i++) {
            let contextGenerator = new RendererContextPost(this);
            let context = contextGenerator.getContext(postIDs[i]);
            let fileSlug = 'DEFAULT';
            fileSlug = postTemplates[i] === '' ? 'DEFAULT' : postTemplates[i];

            this.menuContext = ['post', postSlugs[i], 'post-' + postIDs[i]];    
            
            if (!compiledTemplates[fileSlug]) {
                fileSlug = 'DEFAULT';
            }

            inputFile = inputFile.replace('.hbs', '') + (fileSlug === 'DEFAULT' ? '' : '-' + fileSlug) + '.hbs';
            let postViewConfig = this.cachedItems.posts[postIDs[i]].postViewConfig;
            this.globalContext = this.createGlobalContext('post', [], false, postSlugs[i], postViewConfig, context);
            let output = this.renderTemplate(compiledTemplates[fileSlug], context, this.globalContext, inputFile);

            if (this.plugins.hasModifiers('htmlOutput')) {
                output = this.plugins.runModifiers('htmlOutput', this, output, [this.globalContext, context]); 
            }

            this.templateHelper.saveOutputPostFile(postSlugs[i], output);
            this.sendProgress(Math.ceil(20 + (progressIncrease * i)), 'Generating posts (' + (i + 1) + '/' + postIDs.length + ')');
        }
        console.timeEnd('POSTS');
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

        // Render post site
        let contextGenerator = new RendererContextPostPreview(this);
        let context = contextGenerator.getContext(postID);
        let fileSlug = 'DEFAULT';
        fileSlug = postTemplate === '' ? 'DEFAULT' : postTemplate;

        this.menuContext = ['post', postSlug];

        if(!compiledTemplates[fileSlug]) {
            fileSlug = 'DEFAULT';
        }

        inputFile = inputFile.replace('.hbs', '') + (fileSlug === 'DEFAULT' ? '' : '-' + fileSlug) + '.hbs';
        let postConfig = this.overrideItemViewSettings(JSON.parse(JSON.stringify(this.themeConfig.postConfig)), postID, 'post', true);
        this.globalContext = this.createGlobalContext('post', [], false, postSlug, postConfig, context);
        let output = this.renderTemplate(compiledTemplates[fileSlug], context, this.globalContext, inputFile);

        if (this.plugins.hasModifiers('htmlOutput')) {
            output = this.plugins.runModifiers('htmlOutput', this, output, [this.globalContext, context]); 
        }

        this.templateHelper.saveOutputFile(postSlug + '.html', output);
    }

    /*
     * Create page preview
     */
    generatePage() {
        let pageID = this.itemID;
        let pageSlug = 'preview';
        let pageTemplate = this.postData.template;
        let inputFile = 'page.hbs';

        if (pageTemplate === '*') {
            if (this.themeConfig.defaultTemplates.page) {
                pageTemplate = this.themeConfig.defaultTemplates.page;
            } else {
                pageTemplate = '';
            }
        }

        // Load templates
        let compiledTemplates = {};
        compiledTemplates['DEFAULT'] = this.compileTemplate(inputFile);

        if(!compiledTemplates['DEFAULT']) {
            return false;
        }

        if(typeof pageTemplate === "string" && pageTemplate !== '') {
            pageTemplate = [pageTemplate];
        }

        for (let i = 0; i < pageTemplate.length; i++) {
            let fileSlug = pageTemplate[i];

            // When we meet default template - skip the compilation process
            if (fileSlug === '') {
                continue;
            }

            compiledTemplates[fileSlug] = this.compileTemplate('page-' + fileSlug + '.hbs');

            if (!compiledTemplates[fileSlug]) {
                return false;
            }
        }

        // Render page site
        let contextGenerator = new RendererContextPagePreview(this);
        let context = contextGenerator.getContext(pageID);
        let fileSlug = 'DEFAULT';
        fileSlug = pageTemplate === '' ? 'DEFAULT' : pageTemplate;

        this.menuContext = ['page', pageSlug];

        if(!compiledTemplates[fileSlug]) {
            fileSlug = 'DEFAULT';
        }

        inputFile = inputFile.replace('.hbs', '') + (fileSlug === 'DEFAULT' ? '' : '-' + fileSlug) + '.hbs';
        let pageConfig = this.overrideItemViewSettings(JSON.parse(JSON.stringify(this.themeConfig.pageConfig)), pageID, 'page', true);
        let additionalContexts = [];

        if (this.siteConfig.advanced.usePageAsFrontpage && parseInt(pageID, 10) === parseInt(this.siteConfig.advanced.pageAsFrontpage, 10)) {
            additionalContexts = ['homepage'];
        }

        this.globalContext = this.createGlobalContext('page', additionalContexts, false, pageSlug, pageConfig, context);
        let output = this.renderTemplate(compiledTemplates[fileSlug], context, this.globalContext, inputFile);

        if (this.plugins.hasModifiers('htmlOutput')) {
            output = this.plugins.runModifiers('htmlOutput', this, output, [this.globalContext, context]); 
        }

        this.templateHelper.saveOutputFile(pageSlug + '.html', output);
    }

    /*
     * Override post view settings with the settings of the posts
     */
    overrideItemViewSettings(defaultViewConfig, itemID, itemType, itemPreview = false) {
        let itemViewData = false;
        let itemViewSettings = {};

        if (itemPreview) {
            itemViewSettings = this.postData[itemType === 'post' ? 'postViewSettings' : 'pageViewSettings'];
        } else {
            itemViewData = this.db.prepare(`
                SELECT
                    value
                FROM
                    posts_additional_data
                WHERE
                    post_id = @itemID
                    AND
                    key = @itemType
            `).get({
                itemID: itemID,
                itemType: itemType + 'ViewSettings'
            });

            if (itemViewData && itemViewData.length) {
                itemViewSettings = JSON.parse(itemViewData.value);
            }
        }

        return ViewSettingsHelper.override(itemViewSettings, defaultViewConfig, {
            type: itemType,
            id: itemID
        }, this);
    }

    /*
     * Create page sites
     */
    generatePages() {
        if (!this.themeConfig.supportedFeatures || !this.themeConfig.supportedFeatures.pages) {
            console.log('[i] Pages are not supported by the theme');
            return;
        }

        console.time('PAGES');
        let pageIDs = [];
        let pageSlugs = [];
        let pageTemplates = [];
        let inputFile = 'page.hbs';

        // Get pages
        let pageData;
        
        if (this.homepageOnlyMode && this.siteConfig.advanced.usePageAsFrontpage && this.siteConfig.advanced.pageAsFrontpage) {
            pageData = this.db.prepare(`
                SELECT
                    id,
                    slug,
                    template
                FROM
                    posts
                WHERE
                    status LIKE '%published%' AND
                    status LIKE '%is-page%' AND
                    status NOT LIKE '%trashed%' AND
                    id = ${parseInt(this.siteConfig.advanced.pageAsFrontpage, 10)}
                ORDER BY
                    id ASC
            `).all();
        } else {
            pageData = this.db.prepare(`
                SELECT
                    id,
                    slug,
                    template
                FROM
                    posts
                WHERE
                    status LIKE '%published%' AND
                    status LIKE '%is-page%' AND
                    status NOT LIKE '%trashed%'
                ORDER BY
                    id ASC
            `).all();
        }

        if (pageData && pageData.length) { 
            pageIDs = pageData.map(row => row.id);
            pageSlugs = pageData.map(row => row.slug);
            pageTemplates = pageData.map(row => {
                if (row.template === '*') {
                    return this.themeConfig.defaultTemplates.page
                }

                return row.template;
            });
        } else {
            pageIDs = [];
            pageSlugs = [];
            pageTemplates = [];
        }

        // Load templates
        let compiledTemplates = {};
        compiledTemplates['DEFAULT'] = this.compileTemplate(inputFile);

        if (!compiledTemplates['DEFAULT']) {
            return false;
        }

        for (let i = 0; i < pageTemplates.length; i++) {
            let fileSlug = pageTemplates[i];

            // When we meet default template - skip the compilation process
            if (fileSlug === '' || !this.themeConfig.pageTemplates[fileSlug]) {
                continue;
            }

            compiledTemplates[fileSlug] = this.compileTemplate('page-' + fileSlug + '.hbs');

            if (!compiledTemplates[fileSlug]) {
                return false;
            }
        }

        // Create global context
        let progressIncrease = 40 / pageIDs.length;

        // Render page sites
        for (let i = 0; i < pageIDs.length; i++) {
            let contextGenerator = new RendererContextPage(this);
            let context = contextGenerator.getContext(pageIDs[i]);
            let fileSlug = 'DEFAULT';
            fileSlug = pageTemplates[i] === '' ? 'DEFAULT' : pageTemplates[i];

            this.menuContext = ['page', pageSlugs[i], 'page-' + pageIDs[i]];    
            
            if (!compiledTemplates[fileSlug]) {
                fileSlug = 'DEFAULT';
            }

            inputFile = inputFile.replace('.hbs', '') + (fileSlug === 'DEFAULT' ? '' : '-' + fileSlug) + '.hbs';
            let pageViewConfig = this.cachedItems.pages[pageIDs[i]].pageViewConfig;
            let additionalContexts = [];

            if (this.siteConfig.advanced.usePageAsFrontpage && parseInt(pageIDs[i], 10) === parseInt(this.siteConfig.advanced.pageAsFrontpage, 10)) {
                additionalContexts = ['homepage'];
            }

            this.globalContext = this.createGlobalContext('page', additionalContexts, false, pageSlugs[i], pageViewConfig, context);
            let output = this.renderTemplate(compiledTemplates[fileSlug], context, this.globalContext, inputFile);

            if (this.plugins.hasModifiers('htmlOutput')) {
                output = this.plugins.runModifiers('htmlOutput', this, output, [this.globalContext, context]); 
            }

            this.templateHelper.saveOutputPageFile(pageIDs[i], pageSlugs[i], output, this);
            this.sendProgress(Math.ceil(20 + (progressIncrease * i)), 'Generating pages (' + (i + 1) + '/' + pageIDs.length + ')');
        }
        console.timeEnd('PAGES');
    }

    /*
     * Generate tag pages
     */
    generateTagsList() {
        // Check if we should render tags list
        if (
            this.siteConfig.advanced.urls.tagsPrefix === '' ||
            !this.themeConfig.supportedFeatures ||
            !this.themeConfig.supportedFeatures.tagsList ||
            !RendererHelpers.getRendererOptionValue('createTagsList', this.themeConfig)
        ) {
            return false;
        }
        
        console.time('TAGS-LIST');
        let inputFile = 'tags.hbs';
        
        // Load template
        let compiledTemplate = this.compileTemplate(inputFile);

        if (!compiledTemplate) {
            return false;
        }

        // Render tags list
        let contextGenerator = new RendererContextTags(this);
        let context = contextGenerator.getContext();
        this.menuContext = ['tags'];
        this.globalContext = this.createGlobalContext('tags', [], false, false, false, context);
        let output = this.renderTemplate(compiledTemplate, context, this.globalContext, inputFile);

        if (this.plugins.hasModifiers('htmlOutput')) {
            output = this.plugins.runModifiers('htmlOutput', this, output, [this.globalContext, context]); 
        }

        this.templateHelper.saveOutputTagsListFile(output);
        console.timeEnd('TAGS-LIST');
    }

    /*
     * Generate tag pages
     */
    generateTags(tagID = false) {
        if (
            (
                this.themeConfig.supportedFeatures && 
                this.themeConfig.supportedFeatures.tagPages === false
            ) || RendererHelpers.getRendererOptionValue('createTagPages', this.themeConfig) === false
        ) {
            return false;
        }
        
        console.time('TAGS');
        // Get tags
        let inputFile = 'tag.hbs';
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

        let progressIncrease = 10 / tagsData.length;

        // Render tag sites
        for (let i = 0; i < tagsData.length; i++) {
            let contextGenerator = new RendererContextTag(this);
            let fileSlug = 'DEFAULT';
            fileSlug = tagTemplates[i] === '' ? 'DEFAULT' : tagTemplates[i];

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
                
                if (!compiledTemplates[fileSlug]) {
                    fileSlug = 'DEFAULT';
                }

                inputFile = inputFile.replace('.hbs', '') + (fileSlug === 'DEFAULT' ? '' : '-' + fileSlug) + '.hbs';
                let tagViewConfig = this.cachedItems.tags[tagIDs[i]].tagViewConfig;
                this.globalContext = this.createGlobalContext('tag', [], false, tagSlug, tagViewConfig, context);
                let output = this.renderTemplate(compiledTemplates[fileSlug], context, this.globalContext, inputFile);

                if (this.plugins.hasModifiers('htmlOutput')) {
                    output = this.plugins.runModifiers('htmlOutput', this, output, [this.globalContext, context]); 
                }

                this.templateHelper.saveOutputTagFile(tagSlug, output, tagID !== false);
            } else {
                let addIndexHtml = this.previewMode || this.siteConfig.advanced.urls.addIndex;

                // If user set postsPerPage field to -1 - set it for calculations to 999
                postsPerPage = postsPerPage == -1 ? 999 : postsPerPage;

                for (let offset = 0; offset < totalNumberOfPosts; offset += postsPerPage) {
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

                    if (this.siteConfig.advanced.urls.postsPrefix && this.siteConfig.advanced.urls.tagsPrefixAfterPostsPrefix) {
                        tagsContextInUrl = this.siteConfig.advanced.urls.postsPrefix + '/' + tagsContextInUrl;
                    }

                    let pagination = {
                        context: tagsContextInUrl,
                        pages: Array.from({length: totalPages}, (v, k) => k + 1),
                        totalPosts: totalNumberOfPosts,
                        totalPages: totalPages,
                        currentPage: currentPage,
                        postsPerPage: postsPerPage,
                        nextPage: nextPage,
                        previousPage: previousPage,
                        nextPageUrl: URLHelper.createPaginationPermalink(this.siteConfig, this.themeConfig, nextPage, 'tag', tagSlug, addIndexHtml),
                        previousPageUrl: URLHelper.createPaginationPermalink(this.siteConfig, this.themeConfig, previousPage, 'tag', tagSlug, addIndexHtml)
                    };

                    let additionalContexts = [];

                    if (offset > 0) {
                        additionalContexts = ['pagination', 'tag-pagination'];
                    }

                    this.menuContext = ['tag', tagSlug];

                    if (!compiledTemplates[fileSlug]) {
                        fileSlug = 'DEFAULT';
                    }

                    inputFile = inputFile.replace('.hbs', '') + (fileSlug === 'DEFAULT' ? '' : '-' + fileSlug) + '.hbs';
                    let tagViewConfig = this.cachedItems.tags[tagIDs[i]].tagViewConfig;
                    this.globalContext = this.createGlobalContext('tag', additionalContexts, {
                        pagination, 
                        isFirstPage: currentPage === 1,
                        isLastPage: currentPage === totalPages,
                        currentPage
                    }, tagSlug, tagViewConfig, context);
                    let output = this.renderTemplate(compiledTemplates[fileSlug], context, this.globalContext, inputFile);

                    if (this.plugins.hasModifiers('htmlOutput')) {
                        output = this.plugins.runModifiers('htmlOutput', this, output, [this.globalContext, context]); 
                    }

                    if (offset === 0) {
                        this.templateHelper.saveOutputTagFile(tagSlug, output, tagID !== false);
                    } else if (tagID === false) {
                        // We increase the current page number as we need to start URLs from tag-slug/page/2
                        this.templateHelper.saveOutputTagPaginationFile(tagSlug, currentPage, output);
                    }
                }
            }

            this.sendProgress(Math.ceil(60 + (progressIncrease * i)), 'Generating tag pages (' + (i + 1) + '/' + tagIDs.length + ')');
        }

        console.timeEnd('TAGS');
    }

    /*
     * Generate author pages
     */
    generateAuthors(authorID = false) {
        if (
            (
                this.themeConfig.supportedFeatures && 
                this.themeConfig.supportedFeatures.authorPages === false
            ) || RendererHelpers.getRendererOptionValue('createAuthorPages', this.themeConfig) === false
        ) {
            return false;
        }

        console.time('AUTHORS');
        // Create directory for authors
        let authorsDirPath = path.join(this.outputDir, this.siteConfig.advanced.urls.authorsPrefix);

        if (this.siteConfig.advanced.urls.authorsPrefixAfterPostsPrefix && this.siteConfig.advanced.urls.postsPrefix) {
            authorsDirPath = path.join(
                this.outputDir, 
                this.siteConfig.advanced.urls.postsPrefix, 
                this.siteConfig.advanced.urls.authorsPrefix
            );
        }

        fs.ensureDirSync(authorsDirPath);

        // Get authors
        let authorsIDs = [];
        let authorsUsernames = [];
        let inputFile = 'author.hbs';
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

        // Render author sites
        for (let i = 0; i < authorsData.length; i++) {
            let contextGenerator = new RendererContextAuthor(this);
            let fileSlug = 'DEFAULT';
            fileSlug = authorTemplates[i] === '' ? 'DEFAULT' : authorTemplates[i];

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
                
                if (!compiledTemplates[fileSlug]) {
                    fileSlug = 'DEFAULT';
                }

                inputFile = inputFile.replace('.hbs', '') + (fileSlug === 'DEFAULT' ? '' : '-' + fileSlug) + '.hbs';
                let authorViewConfig = this.cachedItems.authors[authorsIDs[i]].authorViewConfig;
                this.globalContext = this.createGlobalContext('author', [], false, authorUsername, authorViewConfig, context);
                let output = this.renderTemplate(compiledTemplates[fileSlug], context, this.globalContext, inputFile);

                if (this.plugins.hasModifiers('htmlOutput')) {
                    output = this.plugins.runModifiers('htmlOutput', this, output, [this.globalContext, context]); 
                }

                this.templateHelper.saveOutputAuthorFile(authorUsername, output, authorID !== false);
            } else {
                let addIndexHtml = this.previewMode || this.siteConfig.advanced.urls.addIndex;

                // If user set postsPerPage field to -1 - set it for calculations to 999
                postsPerPage = postsPerPage == -1 ? 999 : postsPerPage;

                for (let offset = 0; offset < totalNumberOfPosts; offset += postsPerPage) {
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

                    if (this.siteConfig.advanced.urls.postsPrefix && this.siteConfig.advanced.urls.authorsPrefixAfterPostsPrefix) {
                        authorsContextInUrl = this.siteConfig.advanced.urls.postsPrefix + '/' + authorsContextInUrl;
                    }

                    let pagination = {
                        context: authorsContextInUrl,
                        pages: Array.from({length: totalPages}, (v, k) => k + 1),
                        totalPosts: totalNumberOfPosts,
                        totalPages: totalPages,
                        currentPage: currentPage,
                        postsPerPage: postsPerPage,
                        nextPage: nextPage,
                        previousPage: previousPage,
                        nextPageUrl: URLHelper.createPaginationPermalink(this.siteConfig, this.themeConfig, nextPage, 'author', authorUsername, addIndexHtml),
                        previousPageUrl: URLHelper.createPaginationPermalink(this.siteConfig, this.themeConfig, previousPage, 'author', authorUsername, addIndexHtml)
                    };

                    let additionalContexts = [];

                    if (offset > 0) {
                        additionalContexts = ['pagination', 'author-pagination'];
                    }

                    this.menuContext = ['author', authorUsername];

                    if (!compiledTemplates[fileSlug]) {
                        fileSlug = 'DEFAULT';
                    }

                    inputFile = inputFile.replace('.hbs', '') + (fileSlug === 'DEFAULT' ? '' : '-' + fileSlug) + '.hbs';
                    let authorViewConfig = this.cachedItems.authors[authorsIDs[i]].authorViewConfig;
                    this.globalContext = this.createGlobalContext('author', additionalContexts, {
                        pagination,
                        isFirstPage: currentPage === 1,
                        isLastPage: currentPage === totalPages,
                        currentPage
                    }, authorUsername, authorViewConfig, context);
                    let output = this.renderTemplate(compiledTemplates[fileSlug], context, this.globalContext, inputFile);

                    if (this.plugins.hasModifiers('htmlOutput')) {
                        output = this.plugins.runModifiers('htmlOutput', this, output, [this.globalContext, context]); 
                    }

                    if (offset === 0) {
                        this.templateHelper.saveOutputAuthorFile(authorUsername, output, authorID !== false);
                    } else if (authorID === false) {
                        // We increase the current page number as we need to start URLs from /authors/author-username/page/2
                        this.templateHelper.saveOutputAuthorPaginationFile(authorUsername, currentPage, output);
                    }
                }
            }
        }
        console.timeEnd('AUTHORS');
    }

    /*
     * Generate the 404 error page (if supported in the theme)
     */
    generate404s() {
        if (
            (
                this.themeConfig.supportedFeatures && 
                this.themeConfig.supportedFeatures.errorPage === false
            ) || !RendererHelpers.getRendererOptionValue('create404Page', this.themeConfig) === false
        ) {
            return false;
        }

        console.time("404");
        // Load template
        let inputFile = '404.hbs';
        let template = this.templateHelper.loadTemplate(inputFile);
        let compiledTemplate = this.compileTemplate(inputFile);

        if (!compiledTemplate) {
            return false;
        }

        // Render index site
        let contextGenerator = new RendererContext404(this);
        let context = contextGenerator.getContext();
        this.menuContext = ['404'];
        this.globalContext = this.createGlobalContext('404', [], false, false, false, context);
        let output = this.renderTemplate(compiledTemplate, context, this.globalContext, inputFile);

        if (this.plugins.hasModifiers('htmlOutput')) {
            output = this.plugins.runModifiers('htmlOutput', this, output, [this.globalContext, context]); 
        }

        this.templateHelper.saveOutputFile(this.siteConfig.advanced.urls.errorPage, output);
        console.timeEnd("404");
    }

    /*
     * Generate the 404 error page (if supported in the theme)
     */
    generateSearch() {
        if (
            (
                this.themeConfig.supportedFeatures && 
                this.themeConfig.supportedFeatures.searchPage === false
            ) || RendererHelpers.getRendererOptionValue('createSearchPage', this.themeConfig) === false
        ) {
            return false;
        }

        console.time("SEARCH");
        // Load template
        let inputFile = 'search.hbs';
        let compiledTemplate = this.compileTemplate('search.hbs');

        if (!compiledTemplate) {
            return false;
        }

        // Render index site
        let contextGenerator = new RendererContextSearch(this);
        let context = contextGenerator.getContext();
        this.menuContext = ['search'];
        this.globalContext = this.createGlobalContext('search', [], false, false, false, context);
        let output = this.renderTemplate(compiledTemplate, context, this.globalContext, inputFile);

        if (this.plugins.hasModifiers('htmlOutput')) {
            output = this.plugins.runModifiers('htmlOutput', this, output, [this.globalContext, context]); 
        }

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
                let customConfig = JSON.parse(JSON.stringify(this.themeConfig.customConfig));
                let pageConfig = JSON.parse(JSON.stringify(this.themeConfig.pageConfig));
                let postConfig = JSON.parse(JSON.stringify(this.themeConfig.postConfig));
                let commonConfig = JSON.parse(JSON.stringify(this.themeConfig.config));
                return generateOverride(customConfig, postConfig, commonConfig, pageConfig);
            } catch(e) {
                this.errorLog.push({
                    message: 'An error (1003) occurred during preparing CSS theme variables.',
                    desc: e.message + "\n\n" + e.stack
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
                let customConfig = JSON.parse(JSON.stringify(this.themeConfig.customConfig));
                let pageConfig = JSON.parse(JSON.stringify(this.themeConfig.pageConfig));
                let postConfig = JSON.parse(JSON.stringify(this.themeConfig.postConfig));
                let commonConfig = JSON.parse(JSON.stringify(this.themeConfig.config));
                return generateOverride(customConfig, postConfig, commonConfig, pageConfig);
            } catch(e) {
                this.errorLog.push({
                    message: 'An error (1003) occurred during preparing CSS overrides.',
                    desc: e.message + "\n\n" + e.stack
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

        if (format === 'xml' && this.plugins.hasModifiers('feedXmlOutput')) {
            output = this.plugins.runModifiers('feedXmlOutput', this, output, context); 
        }

        if (format === 'json' && this.plugins.hasModifiers('feedJsonOutput')) {
            output = this.plugins.runModifiers('feedJsonOutput', this, output, context); 
        }

        this.templateHelper.saveOutputFile('feed.' + format, output);
    }

    async generateSitemap() {
        if (!this.siteConfig.advanced.sitemapEnabled) {
            return;
        }

        console.time("SITEMAP");
        let sitemapGenerator = new Sitemap(this.db, this.outputDir, this.siteConfig, this.themeConfig);
        await sitemapGenerator.create();
        console.timeEnd("SITEMAP");
    }

    /**
     * Copy input files to the output directory
     */
    async copyFiles() {
        console.time("FILES");
        let postIDs = Object.keys(this.cachedItems.posts);
        let pageIDs = Object.keys(this.cachedItems.pages);

        FilesHelper.copyRootFiles(this.inputDir, this.outputDir);
        await FilesHelper.copyAssetsFiles(this.themeDir, this.outputDir, this.themeConfig);
        FilesHelper.copyDynamicAssetsFiles(this.themeDir, this.outputDir, this.themeConfig);
        await FilesHelper.copyMediaFiles(this.inputDir, this.outputDir, postIDs, pageIDs);
        await FilesHelper.copyPluginFiles(this.inputDir, this.outputDir, this.pluginsDir);
        await FilesHelper.removeEmptyDirectories(this.outputDir);
        console.timeEnd("FILES");
    }

    loadContentStructure() {
        console.time("CONTENT DATA");
        let globalContextGenerator = new RendererContext(this);
        this.cachedItems = {
            pages: {},
            pagesStructure: {},
            postTags: {},
            posts: {},
            tags: {},
            mainTags: {},
            tagsPostCounts: {},
            authors: {},
            authorsPostCounts: {},
            featuredImages: {
                authors: {},
                pages: {},
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
        let menus = menusData.assigned;
        let unassignedMenus = menusData.unassigned;

        this.commonData = {
            tags: globalContextGenerator.getAllTags(),
            mainTags: globalContextGenerator.getAllMainTags(),
            authors: globalContextGenerator.getAuthors(),
            pages: globalContextGenerator.getPages(),
            menus: menus,
            unassignedMenus: unassignedMenus,
            featuredPosts: {
                homepage: globalContextGenerator.getFeaturedPosts('homepage'),
                tag: globalContextGenerator.getFeaturedPosts('tag'),
                author: globalContextGenerator.getFeaturedPosts('author')
            },
            hiddenPosts: globalContextGenerator.getHiddenPosts()
        };
        console.timeEnd("COMMON DATA");
    }

    createGlobalContext(context, additionalContexts = [], paginationData = false, itemSlug = false, itemConfig = false, itemContext = false) {
        let globalContextGenerator = new RendererContext(this);
        return globalContextGenerator.getGlobalContext(context, additionalContexts, paginationData, itemSlug, itemConfig, itemContext);
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
                desc: e.message + "\n\n" + e.stack
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
                desc: e.message + "\n\n" + e.stack
            });

            return '';
        }

        return output;
    }

    /**
     * Create robots.txt file if it is not created by user
     */
    createRobotsTxt () {
        let robotsTxtPath = path.join(this.outputDir, 'robots.txt');

        // Check if robots.txt exists - if yes, do nothing
        if (UtilsHelper.fileExists(robotsTxtPath)) {
            return;
        }

        // Create robots.txt 
        let robotsTxtContent = '';

        if (this.siteConfig.advanced && this.siteConfig.advanced.noIndexThisPage) {
            robotsTxtContent = `User-agent: *\nDisallow: /`;
        } else {
            if (this.siteConfig.advanced && this.siteConfig.advanced.noIndexForChatGPTUser) {
                robotsTxtContent += `User-agent: ChatGPT-User\nDisallow: /\n`;
            }

            if (this.siteConfig.advanced && this.siteConfig.advanced.noIndexForChatGPTBot) {
                robotsTxtContent += `User-agent: GPTBot\nDisallow: /\n`;
            }

            if (this.siteConfig.advanced && this.siteConfig.advanced.noIndexForCommonCrawlBots) {
                robotsTxtContent += `User-agent: CCBot\nDisallow: /\n`;
            }

            robotsTxtContent += `User-agent: *\nDisallow:\n`;

            if (this.siteConfig.advanced.sitemapEnabled && !this.siteConfig.deployment.relativeUrls) {
                robotsTxtContent += `Sitemap: ${this.siteConfig.originalDomain}/sitemap.xml`;
            }
        }

        fs.writeFileSync(robotsTxtPath, robotsTxtContent, 'utf8');
    }

    /**
     * Make URLs in the HTML files relative
     */
    async relativizeUrls () {
        let catalog = this.outputDir;
        let files = await listAll([catalog], { recurse: true, flatten: true });
        files = files.filter(file => file.path.substr(-5) === '.html' && file.mode.dir === false);
        files = files.map(file => file.path);
        files = files.map(file => file.replace(catalog, ''));

        for (let file of files) {
            this.relativizeUrlsInFile(file, catalog);
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
        let depth = file.replace(/\\/gmi, '/').split('/').length - 2;
        let relativeDomain = './' + '../'.repeat(depth);

        if (relativeDomain.length) {
            relativeDomain = relativeDomain.slice(0, -1);
        }

        content = content.replace(/#PUBLII_RELATIVE_URL_BASE#/gmi, relativeDomain);
        fs.writeFileSync(filePath, content, 'utf8');
    }

    /**
     * Load plugins
     */
    loadPlugins () {
        let sitePath = path.join(this.sitesDir, this.siteName, 'input', 'config'); 
        let sitePluginsConfigPath = path.join(sitePath, 'site.plugins.json');

        if (!fs.existsSync(sitePluginsConfigPath)) {
            return;
        }

        let pluginsConfig = fs.readFileSync(sitePluginsConfigPath);

        try {
            pluginsConfig = JSON.parse(pluginsConfig);
        } catch (e) {
            console.log('(!) Error during loading plugins config for site ', siteName);
            return;
        }

        let pluginNames = Object.keys(pluginsConfig);

        for (let i = 0; i < pluginNames.length; i++) {
            let pluginName = pluginNames[i];

            if (!pluginsConfig[pluginName]) {
                continue;
            }

            let pluginPath = path.join(this.appDir, 'plugins', pluginName, 'main.js');
            let PluginInstance = require(pluginPath);
            let pluginSavedConfig = this.loadPluginConfig(pluginName, this.siteName);
            let plugin = new PluginInstance(this.plugins, pluginName, pluginSavedConfig);
            
            if (typeof plugin.addInsertions !== 'undefined') {
                plugin.addInsertions();
            }

            if (typeof plugin.addModifiers !== 'undefined') {
                plugin.addModifiers();
            }

            if (typeof plugin.addEvents !== 'undefined') {
                plugin.addEvents();
            }
        }
    }

    loadPluginConfig (pluginName, siteName) {
        let pluginPath = path.join(this.appDir, 'plugins', pluginName, 'plugin.json');
        let pluginConfigPath = path.join(this.sitesDir, siteName, 'input', 'config', 'plugins', pluginName + '.json');
        let pluginData = null;
        let pluginSavedConfig = null;
        let output = {};

        if (fs.existsSync(pluginPath)) {
            try {
                pluginData = fs.readFileSync(pluginPath, 'utf8');
                pluginData = JSON.parse(pluginData);
            } catch (e) {
                pluginData = {};
            }
        } else {
            pluginData =  {};
        }

        if (fs.existsSync(pluginConfigPath)) {
            try {
                pluginSavedConfig = fs.readFileSync(pluginConfigPath, 'utf8');
                pluginSavedConfig = JSON.parse(pluginSavedConfig);
            } catch (e) {
                pluginSavedConfig = {};
            }
        } else {
            pluginSavedConfig = {};
        }

        let settings = pluginData.config.map(field => {
            if (field.type !== 'separator') {
                if (pluginSavedConfig && typeof pluginSavedConfig[field.name] !== 'undefined') {
                    return {
                        name: field.name, 
                        value: pluginSavedConfig[field.name]
                    };
                }

                return {
                    name: field.name, 
                    value: field.value
                };
            }

            return false;
        });

        for (let setting of settings) {
            if (setting) {
                output[setting.name] = setting.value;
            }
        }

        return output;
    }

    /**
     * Trigger events during rendering process
     */
    triggerEvent (eventName) {
        if (this.plugins.hasEvents(eventName)) {
            this.plugins.runEvents(eventName, this); 
        }
    }
}

module.exports = Renderer;
