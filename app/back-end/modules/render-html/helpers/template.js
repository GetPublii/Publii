// Necessary packages
const fs = require('fs-extra');
const path = require('path');
const minifyHTML = require('html-minifier').minify;
const Utils = require('./../../../helpers/utils.js');

/*
 * Class used to load Theme files as a Handlebar templates
 */
class TemplateHelper {
    /*
     * Constructor retrieves necessary paths
     */
    constructor(themeDir, outputDir, siteConfig) {
        this.themeDir = themeDir;
        this.outputDir = outputDir;
        this.siteConfig = siteConfig;
        this.themeConfig = this.loadThemeConfig();
        this.loadedTemplates = {};
        this.loadedPartialTemplates = {};
    }

    /*
     * Loads theme configuration object
     */
    loadThemeConfig() {
        // Load theme's config file
        let themeConfig = Utils.loadThemeConfig(this.themeDir);

        // Load default config file
        let defaultConfigPath = path.join(__dirname, '..', '..', '..', '..', 'default-files', 'theme-files', 'config.json');
        let defaultConfig = JSON.parse(fs.readFileSync(defaultConfigPath, 'utf8'));

        // Return merged config
        return Utils.mergeObjects(defaultConfig, themeConfig);
    }

    /*
     * Loads a specific HBS file
     */
    loadTemplate(fileName) {
        let filePath = path.join(this.themeDir, fileName);
        let overrideFilePath = Utils.fileIsOverrided(this.themeDir, filePath);

        if (overrideFilePath) {
            filePath = overrideFilePath;
        }

        if (Utils.fileExists(filePath)) {
            if (this.loadedTemplates[filePath]) {
                return this.loadedTemplates[filePath];
            }

            this.loadedTemplates[filePath] = fs.readFileSync(filePath, 'utf8');
            return this.loadedTemplates[filePath];
        }

        return false;
    }

    /*
     * Loads a specific partial HBS file
     */
    loadPartialTemplate(fileName) {
        let filePath = path.join(this.themeDir, this.themeConfig.files.partialsPath, fileName);
        let overrideFilePath = Utils.fileIsOverrided(this.themeDir, filePath);

        if(overrideFilePath) {
            filePath = overrideFilePath;
        }

        if (Utils.fileExists(filePath)) {
            if (this.loadedPartialTemplates[filePath]) {
                return this.loadedPartialTemplates[filePath];
            }

            this.loadedPartialTemplates[filePath] = fs.readFileSync(filePath, 'utf8');
            return this.loadedPartialTemplates[filePath];
        }

        return false;
    }

    /*
     * Save a compiled Handlebars template under
     * a specified filename
     */
    saveOutputFile(fileName, content) {
        let filePath = path.join(this.outputDir, fileName);

        if(path.parse(filePath).ext !== '.xml' && path.parse(filePath).ext !== '.json') {
            content = this.compressHTML(content);
        }

        fs.ensureDirSync(path.parse(filePath).dir);
        fs.writeFile(filePath, content, {'flags': 'w'});
    }

    saveOutputPostFile (postSlug, content) {
        let suffix = '.html';
        let baseDir = this.outputDir;

        if (this.siteConfig.advanced.urls.postsPrefix) {
            baseDir += '/' + this.siteConfig.advanced.urls.postsPrefix;
        }

        if (this.siteConfig.advanced.urls.cleanUrls) {
            suffix = '/index.html';
        }

        let filePath = path.join(baseDir, postSlug + suffix);
        content = this.compressHTML(content);

        if (this.siteConfig.advanced.urls.cleanUrls) {
            let dirPath = path.join(baseDir, postSlug);
            fs.ensureDirSync(dirPath);
        }

        fs.writeFile(filePath, content, {'flags': 'w'});
    }

    saveOutputHomePaginationFile(pageNumber, content) {
        let baseDir = this.outputDir;

        if (this.siteConfig.advanced.urls.postsPrefix) {
            baseDir += '/' + this.siteConfig.advanced.urls.postsPrefix;
        }

        let filePath = path.join(baseDir, this.siteConfig.advanced.urls.pageName, pageNumber.toString(), 'index.html');
        let pageDirPath = path.join(baseDir, this.siteConfig.advanced.urls.pageName);
        let dirPath = path.join(pageDirPath, pageNumber.toString());
        content = this.compressHTML(content);

        // Create page directory if not exists
        fs.ensureDirSync(pageDirPath);
        // Create dir for specific page
        fs.ensureDirSync(dirPath);
        // Create index.html file in the created dir
        fs.writeFile(filePath, content, {'flags': 'w'});
    }

    saveOutputPageFile (pageID, pageSlug, content, renderer) {
        let suffix = '.html';
        let parentItems = renderer.cachedItems.pagesStructureHierarchy[pageID];
        
        if (this.siteConfig.advanced.urls.cleanUrls) {
            suffix = '/index.html';
        }

        // If page is set as frontpage - render it in the root directory
        if (this.siteConfig.advanced.usePageAsFrontpage && this.siteConfig.advanced.pageAsFrontpage === pageID) {
            let filePath = path.join(this.outputDir, 'index.html');
            content = this.compressHTML(content);
            fs.writeFile(filePath, content, {'flags': 'w'});
            return;
        }

        if (parentItems && parentItems.length) {
            let slugs = [];

            for (let i = 0; i < parentItems.length; i++) {
                if (renderer.cachedItems.pages[parentItems[i]]) {
                    slugs.push(renderer.cachedItems.pages[parentItems[i]].slug);
                }
            }

            slugs.push(pageSlug);
            pageSlug = slugs.join('/');
        }

        let filePath = path.join(this.outputDir, pageSlug + suffix);
        content = this.compressHTML(content);

        if (this.siteConfig.advanced.urls.cleanUrls) {
            let dirPath = path.join(this.outputDir, pageSlug);
            fs.ensureDirSync(dirPath);
        }

        fs.writeFile(filePath, content, {'flags': 'w'});
    }

    /*
     * Save a compiled Handlebars template for tags list
     */
    saveOutputTagsListFile(content) {
        let usePostsPrefix = this.siteConfig.advanced.urls.postsPrefix && this.siteConfig.advanced.urls.tagsPrefixAfterPostsPrefix;
        let postsPrefix = this.siteConfig.advanced.urls.postsPrefix;
        let baseDir = usePostsPrefix ? path.join(this.outputDir, postsPrefix) : this.outputDir;
        let tagsPrefix = this.siteConfig.advanced.urls.tagsPrefix;
        let filePath = path.join(baseDir, tagsPrefix, 'index.html');
        let dirPath = path.join(baseDir, tagsPrefix);
        fs.ensureDirSync(dirPath);
        content = this.compressHTML(content);
        fs.writeFile(filePath, content, {'flags': 'w'});
    }
    
    /*
     * Save a compiled Handlebars template under
     * a specified tag filename
     */
    saveOutputTagFile(tagSlug, content, isTagPreview = false) {
        let usePostsPrefix = this.siteConfig.advanced.urls.postsPrefix && this.siteConfig.advanced.urls.tagsPrefixAfterPostsPrefix;
        let postsPrefix = this.siteConfig.advanced.urls.postsPrefix;
        let baseDir = usePostsPrefix ? path.join(this.outputDir, postsPrefix) : this.outputDir;
        let filePath = path.join(baseDir, tagSlug, 'index.html');
        let dirPath = path.join(baseDir, tagSlug);
        let tagsPath = usePostsPrefix ? baseDir : false;
        let tagsPrefix = this.siteConfig.advanced.urls.tagsPrefix;

        if (isTagPreview) {
            filePath = path.join(this.outputDir, 'preview.html');
            content = this.compressHTML(content);
            fs.writeFile(filePath, content, {'flags': 'w'});
            return;
        } else if (tagsPrefix) {
            filePath = path.join(baseDir, tagsPrefix, tagSlug, 'index.html');
            dirPath = path.join(baseDir, tagsPrefix, tagSlug);
            tagsPath = path.join(baseDir, tagsPrefix);
        }

        if (tagsPath && !Utils.dirExists(tagsPath)) {
            fs.ensureDirSync(tagsPath);
        }

        content = this.compressHTML(content);
        fs.ensureDirSync(dirPath);
        fs.writeFile(filePath, content, {'flags': 'w'});
    }

    saveOutputTagPaginationFile(tagSlug, pageNumber, content) {
        let usePostsPrefix = this.siteConfig.advanced.urls.postsPrefix && this.siteConfig.advanced.urls.tagsPrefixAfterPostsPrefix;
        let postsPrefix = this.siteConfig.advanced.urls.postsPrefix;
        let baseDir = usePostsPrefix ? path.join(this.outputDir, postsPrefix) : this.outputDir;
        let pageName = this.siteConfig.advanced.urls.pageName;
        let filePath = path.join(baseDir, tagSlug, pageName, pageNumber.toString(), 'index.html');
        let pageDirPath = path.join(baseDir, tagSlug, pageName);
        let dirPath = path.join(pageDirPath, pageNumber.toString());
        let tagsPath = usePostsPrefix ? baseDir : false;
        let tagsPrefix = this.siteConfig.advanced.urls.tagsPrefix;

        if (tagsPrefix) {
            filePath = path.join(baseDir, tagsPrefix, tagSlug, pageName, pageNumber.toString(), 'index.html');
            pageDirPath = path.join(baseDir, tagsPrefix, tagSlug, pageName);
            dirPath = path.join(pageDirPath, pageNumber.toString());
            tagsPath = path.join(baseDir, tagsPrefix);
        }

        if (tagsPath && !Utils.dirExists(tagsPath)) {
            fs.ensureDirSync(tagsPath);
        }

        content = this.compressHTML(content);

        // Create page directory if not exists
        if(!Utils.dirExists(pageDirPath)) {
            fs.ensureDirSync(pageDirPath);
        }

        // Create dir for specific page
        if(!Utils.dirExists(dirPath)) {
            fs.ensureDirSync(dirPath);
        }

        // Create index.html file in the created dir
        fs.writeFile(filePath, content, {'flags': 'w'});
    }

    /*
     * Save a compiled Handlebars template under
     * a specified author filename
     */
    saveOutputAuthorFile(authorSlug, content, isAuthorPreview = false) {
        let usePostsPrefix = this.siteConfig.advanced.urls.postsPrefix && this.siteConfig.advanced.urls.authorsPrefixAfterPostsPrefix;
        let postsPrefix = this.siteConfig.advanced.urls.postsPrefix;
        let baseDir = usePostsPrefix ? path.join(this.outputDir, postsPrefix) : this.outputDir;
        let filePath = path.join(baseDir, this.siteConfig.advanced.urls.authorsPrefix, authorSlug, 'index.html');
        let dirPath = path.join(baseDir, this.siteConfig.advanced.urls.authorsPrefix, authorSlug);
        
        if (isAuthorPreview) {
            filePath = path.join(this.outputDir, 'preview.html');
            content = this.compressHTML(content);
            fs.writeFile(filePath, content, {'flags': 'w'});
            return;
        }

        content = this.compressHTML(content);
        fs.ensureDirSync(dirPath);
        fs.writeFile(filePath, content, {'flags': 'w'});
    }

    saveOutputAuthorPaginationFile(authorSlug, pageNumber, content) {
        let usePostsPrefix = this.siteConfig.advanced.urls.postsPrefix && this.siteConfig.advanced.urls.authorsPrefixAfterPostsPrefix;
        let postsPrefix = this.siteConfig.advanced.urls.postsPrefix;
        let baseDir = usePostsPrefix ? path.join(this.outputDir, postsPrefix) : this.outputDir;
        let filePath = path.join(baseDir, this.siteConfig.advanced.urls.authorsPrefix, authorSlug, this.siteConfig.advanced.urls.pageName, pageNumber.toString(), 'index.html');
        let pageDirPath = path.join(baseDir, this.siteConfig.advanced.urls.authorsPrefix, authorSlug, this.siteConfig.advanced.urls.pageName);
        let dirPath = path.join(pageDirPath, pageNumber.toString());
        content = this.compressHTML(content);

        // Create page directory if not exists
        fs.ensureDirSync(pageDirPath);
        // Create dir for specific page
        fs.ensureDirSync(dirPath);
        // Create index.html file in the created dir
        fs.writeFile(filePath, content, {'flags': 'w'});
    }

    /*
     * Compress the output HTML if necessary
     */
    compressHTML(content) {
        if(!this.siteConfig.advanced.htmlCompression) {
            return content;
        }

        let compressedContent = '';

        try {
            compressedContent = minifyHTML(content, {
                collapseWhitespace: true,
                removeComments: !!this.siteConfig.advanced.htmlCompressionRemoveComments,
                removeEmptyAttributes: true
            });
        } catch(e) {
            // Return original content without compression and log an error message
            compressedContent = content;
            // @LOGTHIS
            console.log('A HTML parsing error occurred during the compression - uncompressed HTML returned. Error details: ' + JSON.stringify(e));
        }

        return compressedContent;
    }

    /*
     * Loads user partials from the theme
     */
    getUserPartials(requiredPartials, optionalPartials) {
        let userPartials = [];
        let partialsPath = path.join(this.themeDir, this.themeConfig.files.partialsPath);
        let overridedPartialsPath = path.join(this.themeDir.replace(/[\\\/]{1,1}$/, '') + '-override', this.themeConfig.files.partialsPath);
        let filesAndDirs = false;
        let overridedFilesAndDirs = false;

        if(Utils.dirExists(partialsPath)) {
            filesAndDirs = this.getHbsFilesRecursively(partialsPath);
            filesAndDirs = filesAndDirs.map(file => file.replace(partialsPath + '/', '').replace(partialsPath + '\\', ''));
        }

        if(Utils.dirExists(overridedPartialsPath)) {
            overridedFilesAndDirs = this.getHbsFilesRecursively(overridedPartialsPath);
            overridedFilesAndDirs = overridedFilesAndDirs.map(file => file.replace(overridedPartialsPath + '/', '').replace(overridedPartialsPath + '\\', ''));
        }

        if (!filesAndDirs.length && !overridedFilesAndDirs.length) {
            return userPartials;
        }

        for (let i = 0; i < filesAndDirs.length; i++) {
            if (filesAndDirs[i].substr(-4) !== '.hbs') {
                continue;
            }

            let partialFile = filesAndDirs[i].replace('.hbs', '');

            if(
                requiredPartials.indexOf(partialFile) === -1 &&
                optionalPartials.indexOf(partialFile) === -1
            ) {
                userPartials.push(partialFile);
            }
        }

        for (let i = 0; i < overridedFilesAndDirs.length; i++) {
            if (overridedFilesAndDirs[i].substr(-4) !== '.hbs') {
                continue;
            }

            let partialFile = overridedFilesAndDirs[i].replace('.hbs', '');

            if(
                requiredPartials.indexOf(partialFile) === -1 &&
                optionalPartials.indexOf(partialFile) === -1
            ) {
                userPartials.push(partialFile);
            }
        }

        // Fix for Windows
        userPartials = userPartials.map(partial => partial.replace(/\\/gmi, '/'));
        return userPartials;
    }

    getHbsFilesRecursively (dir) {
        let results = [];
        let list = fs.readdirSync(dir);
      
        list.forEach(file => {
            let filePath = path.join(dir, file);
            let stat = fs.statSync(filePath);
        
            if (stat.isDirectory()) {
                results = results.concat(this.getHbsFilesRecursively(filePath));
            } else {
                if (path.extname(file) === '.hbs') {
                    results.push(filePath);
                }
            }
        });

        return results;
    }
}

module.exports = TemplateHelper;
