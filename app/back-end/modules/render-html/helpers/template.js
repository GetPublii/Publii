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

        fs.writeFile(filePath, content, {'flags': 'w'});
    }

    saveOutputPostFile(postSlug, content) {
        let suffix = '.html';

        if(this.siteConfig.advanced.urls.cleanUrls) {
            suffix = '/index.html';
        }

        let filePath = path.join(this.outputDir, postSlug + suffix);
        content = this.compressHTML(content);

        if(this.siteConfig.advanced.urls.cleanUrls) {
            let dirPath = path.join(this.outputDir, postSlug);

            if(!Utils.dirExists(dirPath)) {
                fs.mkdirSync(dirPath);
            }
        }

        fs.writeFile(filePath, content, {'flags': 'w'});
    }

    saveOutputHomePaginationFile(pageNumber, content) {
        let filePath = path.join(this.outputDir, this.siteConfig.advanced.urls.pageName, pageNumber.toString(), 'index.html');
        let pageDirPath = path.join(this.outputDir, this.siteConfig.advanced.urls.pageName);
        let dirPath = path.join(pageDirPath, pageNumber.toString());
        content = this.compressHTML(content);

        // Create page directory if not exists
        let pageDirStat = false;

        try {
            pageDirStat = fs.statSync(pageDirPath);
        } catch(e) {}

        if(!pageDirStat) {
            fs.mkdirSync(pageDirPath);
        }

        // Create dir for specific page
        fs.mkdirSync(dirPath);

        // Create index.html file in the created dir
        fs.writeFile(filePath, content, {'flags': 'w'});
    }

    /*
     * Save a compiled Handlebars template for tags list
     */
    saveOutputTagsListFile(content) {
        let filePath = path.join(this.outputDir, this.siteConfig.advanced.urls.tagsPrefix, 'index.html');
        let dirPath = path.join(this.outputDir, this.siteConfig.advanced.urls.tagsPrefix);

        if(!Utils.dirExists(dirPath)) {
            fs.mkdirSync(dirPath);
        }

        content = this.compressHTML(content);
        fs.writeFile(filePath, content, {'flags': 'w'});
    }
    
    /*
     * Save a compiled Handlebars template under
     * a specified tag filename
     */
    saveOutputTagFile(tagSlug, content, isTagPreview = false) {
        let filePath = path.join(this.outputDir, tagSlug, 'index.html');
        let dirPath = path.join(this.outputDir, tagSlug);
        let tagsPath = false;

        if (isTagPreview) {
            filePath = path.join(this.outputDir, 'preview.html');
            content = this.compressHTML(content);
            fs.writeFile(filePath, content, {'flags': 'w'});
            return;
        } else if (this.siteConfig.advanced.urls.tagsPrefix !== '') {
            filePath = path.join(this.outputDir, this.siteConfig.advanced.urls.tagsPrefix, tagSlug, 'index.html');
            dirPath = path.join(this.outputDir, this.siteConfig.advanced.urls.tagsPrefix, tagSlug);
            tagsPath = path.join(this.outputDir, this.siteConfig.advanced.urls.tagsPrefix);

            if(!Utils.dirExists(tagsPath)) {
                fs.mkdirSync(tagsPath);
            }
        }

        content = this.compressHTML(content);
        fs.mkdirSync(dirPath);
        fs.writeFile(filePath, content, {'flags': 'w'});
    }

    saveOutputTagPaginationFile(tagSlug, pageNumber, content) {
        let filePath = path.join(this.outputDir, tagSlug, this.siteConfig.advanced.urls.pageName, pageNumber.toString(), 'index.html');
        let pageDirPath = path.join(this.outputDir, tagSlug, this.siteConfig.advanced.urls.pageName);
        let dirPath = path.join(pageDirPath, pageNumber.toString());
        let tagsPath = false;

        if(this.siteConfig.advanced.urls.tagsPrefix !== '') {
            filePath = path.join(this.outputDir, this.siteConfig.advanced.urls.tagsPrefix, tagSlug, this.siteConfig.advanced.urls.pageName, pageNumber.toString(), 'index.html');
            pageDirPath = path.join(this.outputDir, this.siteConfig.advanced.urls.tagsPrefix, tagSlug, this.siteConfig.advanced.urls.pageName);
            dirPath = path.join(pageDirPath, pageNumber.toString());
            tagsPath = path.join(this.outputDir, this.siteConfig.advanced.urls.tagsPrefix);

            if(!Utils.dirExists(tagsPath)) {
                fs.mkdirSync(tagsPath);
            }
        }

        content = this.compressHTML(content);

        // Create page directory if not exists
        if(!Utils.dirExists(pageDirPath)) {
            fs.mkdirSync(pageDirPath);
        }

        // Create dir for specific page
        if(!Utils.dirExists(dirPath)) {
            fs.mkdirSync(dirPath);
        }

        // Create index.html file in the created dir
        fs.writeFile(filePath, content, {'flags': 'w'});
    }

    /*
     * Save a compiled Handlebars template under
     * a specified author filename
     */
    saveOutputAuthorFile(authorSlug, content, isAuthorPreview = false) {
        let filePath = path.join(this.outputDir, this.siteConfig.advanced.urls.authorsPrefix, authorSlug, 'index.html');
        let dirPath = path.join(this.outputDir, this.siteConfig.advanced.urls.authorsPrefix, authorSlug);
        
        if (isAuthorPreview) {
            filePath = path.join(this.outputDir, 'preview.html');
            content = this.compressHTML(content);
            fs.writeFile(filePath, content, {'flags': 'w'});
            return;
        }

        content = this.compressHTML(content);
        fs.mkdirSync(dirPath);
        fs.writeFile(filePath, content, {'flags': 'w'});
    }

    saveOutputAuthorPaginationFile(authorSlug, pageNumber, content) {
        let filePath = path.join(this.outputDir, this.siteConfig.advanced.urls.authorsPrefix, authorSlug, this.siteConfig.advanced.urls.pageName, pageNumber.toString(), 'index.html');
        let pageDirPath = path.join(this.outputDir, this.siteConfig.advanced.urls.authorsPrefix, authorSlug, this.siteConfig.advanced.urls.pageName);
        let dirPath = path.join(pageDirPath, pageNumber.toString());
        content = this.compressHTML(content);

        // Create page directory if not exists
        let pageDirStat = false;

        try {
            pageDirStat = fs.statSync(pageDirPath);
        } catch(e) {}

        if(!pageDirStat) {
            fs.mkdirSync(pageDirPath);
        }

        // Create dir for specific page
        fs.mkdirSync(dirPath);

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
            filesAndDirs = fs.readdirSync(partialsPath);
        }

        if(Utils.dirExists(overridedPartialsPath)) {
            overridedFilesAndDirs = fs.readdirSync(overridedPartialsPath);
        }

        if(!filesAndDirs && !overridedFilesAndDirs) {
            return userPartials;
        }

        for(let i = 0; i < filesAndDirs.length; i++) {
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

        for(let i = 0; i < overridedFilesAndDirs.length; i++) {
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

        return userPartials;
    }
}

module.exports = TemplateHelper;
