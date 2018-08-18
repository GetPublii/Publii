/*
 * Note for the future: for big websites most probably the better solution
 * would be replace reading post files in searching of the "noindex" phrase
 * by analyzing of the DB records
 */

const fs = require('fs');
const path = require('path');
const util = require('util');
/**
 * Class used to generate sitemap.xml file
 */
class Sitemap {
    /**
     * Initializer
     *
     * @param directory
     * @param siteConfig
     * @param themeConfig
     */
    constructor(directory, siteConfig, themeConfig) {
        this.baseDirectory = directory;
        this.siteConfig = siteConfig;
        this.themeConfig = themeConfig;
        this.fileList = [];
        this.outputXML = '';
    }

    /**
     * Creates sitemap.xml file
     */
    async create() {
        await this.getFilesList().then(() => {
            this.renderXML();
            this.saveXML();
        });
    }

    /**
     * Retrieves list of files to parse
     */
    async getFilesList() {
        let files = fs.readdirSync(this.baseDirectory);
        let internals = this.getInternalsList();
        let excludedFiles = [];

        if (this.siteConfig.advanced.sitemapExcludedFiles && this.siteConfig.advanced.sitemapExcludedFiles.trim() !== '') {
            excludedFiles = this.siteConfig.advanced.sitemapExcludedFiles.split(',').map(file => file.trim());
        }

        for(let file of files) {
            // Skip hidden files and internal directories
            if(file.indexOf('.') === 0 || internals.indexOf(file) > -1 || excludedFiles.indexOf(file) > -1) {
                continue;
            }

            // Detect author pages
            if(file === this.siteConfig.advanced.urls.authorsPrefix) {
                this.getAuthorsFilesList();
                continue;
            }

            // Detect homepage pagination
            if(file === this.siteConfig.advanced.urls.pageName) {
                if (!this.siteConfig.advanced.homepageNoIndexPagination) {
                    this.getHomepagePaginationFilesList();
                }

                continue;
            }

            // Detect tag pages - when tags prefix is empty
            if(file.indexOf('.') === -1 && this.siteConfig.advanced.urls.tagsPrefix === '') {
                this.getTagsFilesList(file);
                continue;
            }

            // Detect tag pages - when tags prefix is not empty
            if(this.siteConfig.advanced.urls.tagsPrefix !== '' && file === this.siteConfig.advanced.urls.tagsPrefix) {
                this.getTagsFilesList(file, this.siteConfig.advanced.urls.tagsPrefix);
                continue;
            }

            // Detect post files
            if(!this.siteConfig.advanced.urls.cleanUrls && file.indexOf('.html') > 0) {
                await this.getPostsFilesList(file);
                continue;
            }

            // Detect post files
            if(this.siteConfig.advanced.urls.cleanUrls) {
                await this.getPostsFilesList(file, true);
            }
        }
    }

    /**
     * Prepares list of the items to skip
     *
     * @returns {array}
     */
    getInternalsList() {
        let internalsList = [
            'amp',
            'assets',
            'media',
            '.htaccess',
            '_redirects',
            'robots.txt',
            'feed.xml',
            'feed.json',
            'index.html'
        ];

        if(this.themeConfig.renderer.create404page && this.siteConfig.advanced.urls.errorPage) {
            internalsList.push(this.siteConfig.advanced.urls.errorPage);
        }

        if(this.themeConfig.renderer.createSearchPage && this.siteConfig.advanced.urls.searchPage) {
            internalsList.push(this.siteConfig.advanced.urls.searchPage);
        }

        return internalsList;
    }

    /**
     * Detects if author pages are no-indexed
     *
     * @returns {boolean}
     */
    shouldIndexAuthors() {
        return  this.siteConfig.advanced.sitemapAddAuthors &&
                this.siteConfig.advanced.metaRobotsAuthors.indexOf('noindex') === -1;
    }

    /**
     * Detects if homepage is no-indexed
     *
     * @returns {boolean}
     */
    shouldIndexHomepage() {
        return  this.siteConfig.advanced.sitemapAddHomepage &&
                this.siteConfig.advanced.metaRobotsIndex.indexOf('noindex') === -1;
    }

    /**
     * Detects if tag pages are no-indexed
     *
     * @returns {boolean}
     */
    shouldIndexTags() {
        return  this.siteConfig.advanced.sitemapAddTags &&
                this.siteConfig.advanced.metaRobotsTags.indexOf('noindex') === -1;
    }

    /**
     * Retrieves list of author pages to index
     */
    getAuthorsFilesList() {
        if(!this.shouldIndexAuthors()) {
            return;
        }

        let files = fs.readdirSync(path.join(this.baseDirectory, this.siteConfig.advanced.urls.authorsPrefix));

        for(let file of files) {
            // Skip files
            if(file.indexOf('.') > -1) {
                continue;
            }

            this.fileList.push(this.siteConfig.advanced.urls.authorsPrefix + '/' + file + '/index.html');

            if (this.siteConfig.advanced.authorNoIndexPagination) {
                continue;
            }

            let paginationPath = path.join(
                this.baseDirectory,
                this.siteConfig.advanced.urls.authorsPrefix,
                file,
                this.siteConfig.advanced.urls.pageName
            );

            if(fs.existsSync(paginationPath)) {
                let authorFiles = fs.readdirSync(paginationPath);

                for (let authorFile of authorFiles) {
                    // Skip files
                    if (authorFile.indexOf('.') > -1) {
                        continue;
                    }

                    // Add all pages of pagination
                    let pageName = this.siteConfig.advanced.urls.pageName;
                    this.fileList.push(this.siteConfig.advanced.urls.authorsPrefix + '/' + file + '/' + pageName + '/' + authorFile + '/index.html');
                }
            }
        }
    }

    /**
     * Retrieves list of tag pages files to index for given tag slug
     *
     * @param tagName
     * @param prefix
     */
    getTagsFilesList(tagName, prefix = '') {
        if(!this.shouldIndexTags()) {
            return;
        }

        if(prefix === '') {
            // Add main file to the list
            this.fileList.push(tagName + '/index.html');

            let paginationPath = path.join(this.baseDirectory, tagName, this.siteConfig.advanced.urls.pageName);

            if (fs.existsSync(paginationPath)) {
                let files = fs.readdirSync(paginationPath);

                for (let file of files) {
                    // Skip files
                    if (file.indexOf('.') > -1) {
                        continue;
                    }

                    // Add all pages of pagination
                    this.fileList.push(tagName + '/' + file + '/index.html');
                }
            }

            return;
        }

        let files = fs.readdirSync(path.join(this.baseDirectory, this.siteConfig.advanced.urls.tagsPrefix));

        for(let file of files) {
            // Skip files
            if(file.indexOf('.') > -1) {
                continue;
            }

            this.fileList.push(this.siteConfig.advanced.urls.tagsPrefix + '/' + file + '/index.html');

            if (this.siteConfig.advanced.tagNoIndexPagination) {
                continue;
            }

            let paginationPath = path.join(
                this.baseDirectory,
                this.siteConfig.advanced.urls.tagsPrefix,
                file,
                this.siteConfig.advanced.urls.pageName
            );

            if(fs.existsSync(paginationPath)) {
                let tagsFiles = fs.readdirSync(paginationPath);

                for (let tagFile of tagsFiles) {
                    // Skip files
                    if (tagFile.indexOf('.') > -1) {
                        continue;
                    }

                    // Add all pages of pagination
                    let pageName = this.siteConfig.advanced.urls.pageName;
                    this.fileList.push(this.siteConfig.advanced.urls.tagsPrefix + '/' + file + '/' + pageName + '/' + tagFile + '/index.html');
                }
            }
        }
    }

    /**
     * Retrieves homepage files to index
     */
    getHomepagePaginationFilesList() {
        if(!this.shouldIndexHomepage()) {
            return;
        }

        let files = fs.readdirSync(path.join(this.baseDirectory, this.siteConfig.advanced.urls.pageName));

        for(let file of files) {
            // Skip files
            if(file.indexOf('.') > -1) {
                continue;
            }

            let pageName = this.siteConfig.advanced.urls.pageName;
            this.fileList.push(pageName + '/' + file + '/index.html');
        }
    }

    /**
     * Retrieves single post files to index
     *
     * @param file
     * @param cleanUrlsEnabled
     */
    async getPostsFilesList(file, cleanUrlsEnabled = false) {
        const readFile = util.promisify(fs.readFile);

        if (!cleanUrlsEnabled) {
            // Read post file
            let postFileContent = await readFile(path.join(this.baseDirectory, file), 'utf8');

            // Detect if noindex does not exist in the post file
            if (postFileContent.indexOf('name="robots" content="noindex') === -1) {
                this.fileList.push(file);
            }

            return Promise.resolve();
        }

        // Read post file
        let filePath = path.join(this.baseDirectory, file, 'index.html');

        if (fs.existsSync(filePath)) {
            let postFileContent = await readFile(filePath, 'utf8');

            // Detect if noindex does not exist in the post file
            if (postFileContent.indexOf('name="robots" content="noindex') === -1) {
                if (file === 'index.html') {
                    this.fileList.push('');
                } else {
                    this.fileList.push(file + '/');
                }
            }
        }

        return Promise.resolve()
    }

    /**
     * Returns sitemap XML file
     */
    renderXML() {
        let domain = this.siteConfig.domain + '/';
        this.outputXML = '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">' + "\n";

        this.outputXML += '<url>' + "\n";
        this.outputXML += '<loc>' + domain + '</loc>' + "\n";
        this.outputXML += '</url>' + "\n";

        for(let url of this.fileList) {
            this.outputXML += '<url>' + "\n";
            this.outputXML += '<loc>' + domain + url.replace(/index\.html$/, '') + '</loc>' + "\n";
            this.outputXML += '</url>' + "\n";
        }

        this.outputXML += '</urlset>';
    }

    /**
     * Save sitemap.xml file
     */
    saveXML() {
        let filePath = path.join(this.baseDirectory, 'sitemap.xml');
        fs.writeFileSync(filePath, this.outputXML, 'utf8');
    }
}

module.exports = Sitemap;
