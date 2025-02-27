/*
 * Note for the future: for big websites most probably the better solution
 * would be replace reading post files in searching of the "noindex" phrase
 * by analyzing of the DB records
 */

const fs = require('fs');
const path = require('path');
const util = require('util');
const moment = require('moment');
const normalizePath = require('normalize-path');
const RendererHelpers = require('./../helpers/helpers.js');
const UtilsHelper = require('./../../../helpers/utils');

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
    constructor (db, directory, siteConfig, themeConfig) {
        this.db = db;
        this.baseDirectory = directory;
        this.siteConfig = siteConfig;
        this.themeConfig = themeConfig;
        this.fileList = [];
        this.outputXML = '';
        this.postData = {};
        this.excludedFiles = [];

        if (this.siteConfig.advanced.sitemapExcludedFiles && this.siteConfig.advanced.sitemapExcludedFiles.trim() !== '') {
            this.excludedFiles = this.siteConfig.advanced.sitemapExcludedFiles.split(',').map(file => {
                return '/' + file.trim() + '/';
            });
        }
    }

    /**
     * Creates sitemap.xml file
     */
    async create () {
        this.getData();

        await this.getFilesList().then(() => {
            this.renderXML();
            this.saveXML();
        });
    }

    /**
     * Get post data
     */
    getData () {
        let momentOriginalLocale = moment.locale();
        moment.locale('en');

        let postDbData = this.db.prepare(`
            SELECT
                posts.id,
                posts.slug,
                posts.text,
                posts.modified_at,
                posts_images.url,
                posts_images.additional_data,
                posts_additional_data.value AS core_post_data
            FROM
                posts
            LEFT JOIN
                posts_images
                ON
                posts.featured_image_id = posts_images.id
            LEFT JOIN
                posts_additional_data
                on
                posts.id = posts_additional_data.post_id
            WHERE
                posts_additional_data.key = '_core'
            ORDER BY
                posts.id ASC
        `).all();

        if (postDbData && postDbData.length) { 
            postDbData.forEach(post => {
                let featuredImageUrl = false;
                let featuredImageAlt = false;
                let images = [];
                
                if (post.url) {
                    featuredImageUrl = this.getMediaPath(post) + post.url;

                    try {
                        let imageData = JSON.parse(post.additional_data);
                        featuredImageAlt = imageData.alt;
                    } catch (e) {
                        console.log('Sitemap: featured image additional JSON data parse error.');
                    }
                }

                if (post.text.indexOf('<img') > -1) {
                    let imgMatches = post.text.match(/\<img[\s\S]*?\>/gmi);

                    for (let i = 0; i < imgMatches.length; i++) {
                        let url = imgMatches[i].match(/src="(.*?)"/mi);
                        let alt = imgMatches[i].match(/alt="(.*?)"/mi);

                        if (url && url[1]) {
                            url = url[1].replace('#DOMAIN_NAME#', this.getMediaPath(post));
                        } else {
                            url = false;
                        }

                        if (alt && alt[1]) {
                            alt = alt[1];
                        } else {
                            alt = '';
                        }

                        if (url) {
                            images.push({
                                url: url,
                                alt: alt
                            });
                        }
                    }
                }

                // detect block editor images
                if (post.core_post_data.indexOf('"editor":"blockeditor"') > -1) {
                    try {
                        let parsedPostStructure = JSON.parse(post.text);

                        for (let i = 0; i < parsedPostStructure.length; i++) {
                            let block = parsedPostStructure[i];

                            if (block.type === 'publii-image' && block.content) {
                                images.push({
                                    url: block.content.image.replace('#DOMAIN_NAME#', this.getMediaPath(post)),
                                    alt: block.content.alt
                                });
                            } else if (block.type === 'publii-gallery' && block.content && block.content.images) {
                                for (let j = 0; j < block.content.images.length; j++) {
                                    let imageData = block.content.images[j];

                                    images.push({
                                        url: imageData.src.replace('#DOMAIN_NAME#', this.getMediaPath(post)),
                                        alt: imageData.alt
                                    });
                                }
                            }
                        }
                    } catch (e) {
                        console.log('(!) An error occurred during parsing images in the block editor post');
                    }
                }

                // detect markdown editor images
                if (post.core_post_data.indexOf('"editor":"markdown"') > -1) {
                    let imagesRegexp = /!\[([^\]]*)\]\(([^\)]*)\)/gmi;
                    let foundedImages = [...post.text.matchAll(imagesRegexp)];
                    
                    for (let imageMatch of foundedImages) {
                        images.push({
                            url: imageMatch[2].replace('#DOMAIN_NAME#', this.getMediaPath(post)).replace(/\s=\d+x\d+$/, ''),
                            alt: imageMatch[1]
                        });
                    }                
                }

                if (featuredImageUrl) {
                    images.unshift({
                        url: featuredImageUrl,
                        alt: featuredImageAlt
                    });
                }
                
                this.postData[post.slug] = {
                    lastMod: moment(post.modified_at).format('YYYY-MM-DDTHH:mm:ssZ'),
                    images: images
                };
            });
        }

        moment.locale(momentOriginalLocale);
    }

    /**
     * Get matches of the regex
     */
    getMatches (string, regex, index = 1) {
        let matches = [];
        let match;
        
        while (match = regex.exec(string)) {
            matches.push(match[index]);
        }

        return matches;
    }

    /**
     * Retrieves media path for the website
     */
    getMediaPath (postObject) {
        return this.siteConfig.domain + '/' + normalizePath(path.join('media', 'posts', (postObject.id).toString())) + '/';
    }

    /**
     * Retrieves list of files to parse
     */
    async getFilesList () {
        let files;
        let internals = this.getInternalsList();

        if (this.siteConfig.advanced.urls.postsPrefix) {
            files = fs.readdirSync(path.join(this.baseDirectory, this.siteConfig.advanced.urls.postsPrefix));

            for (let file of files) {
                // Skip hidden files and internal directories
                if (file.indexOf('.') === 0 || internals.indexOf(file) > -1) {
                    continue;
                }
    
                // Detect author pages
                if (file === this.siteConfig.advanced.urls.authorsPrefix && this.siteConfig.advanced.urls.authorsPrefixAfterPostsPrefix) {
                    await this.getAuthorsFilesList();
                    continue;
                }
    
                // Detect homepage pagination
                if (file === this.siteConfig.advanced.urls.pageName) {
                    if (!this.siteConfig.advanced.homepageNoIndexPagination && !this.siteConfig.advanced.homepageNoPagination) {
                        await this.getHomepagePaginationFilesList();
                    }
    
                    continue;
                }
    
                // Detect tag pages - when tags prefix is empty
                if (file.indexOf('.') === -1 && this.siteConfig.advanced.urls.tagsPrefix === '' && this.siteConfig.advanced.urls.tagsPrefixAfterPostsPrefix) {
                    await this.getTagsFilesList(file);
                    continue;
                }
    
                // Detect tag pages - when tags prefix is not empty
                if (this.siteConfig.advanced.urls.tagsPrefix !== '' && file === this.siteConfig.advanced.urls.tagsPrefix && this.siteConfig.advanced.urls.tagsPrefixAfterPostsPrefix) {
                    await this.getTagsFilesList(file, this.siteConfig.advanced.urls.tagsPrefix);
                    continue;
                }
    
                // Detect post/pages files
                await this.getPostsAndPagesFilesList(file, true);
            }
        }

        files = fs.readdirSync(this.baseDirectory);
        
        for (let file of files) {
            // Skip hidden files and internal directories
            if (file.indexOf('.') === 0 || internals.indexOf(file) > -1) {
                continue;
            }

            // Skip posts prefix directory
            if (file === this.siteConfig.advanced.urls.postsPrefix) {  
                continue;
            }

            // Detect author pages
            if (file === this.siteConfig.advanced.urls.authorsPrefix && !this.siteConfig.advanced.urls.authorsPrefixAfterPostsPrefix) {
                await this.getAuthorsFilesList();
                continue;
            }

            // Detect homepage pagination
            if (file === this.siteConfig.advanced.urls.pageName && !this.siteConfig.advanced.urls.postsPrefix) {
                if (!this.siteConfig.advanced.homepageNoIndexPagination && !this.siteConfig.advanced.homepageNoPagination) {
                    await this.getHomepagePaginationFilesList();
                }

                continue;
            }

            // Detect tag pages - when tags prefix is empty
            if (file.indexOf('.') === -1 && this.siteConfig.advanced.urls.tagsPrefix === '' && !this.siteConfig.advanced.urls.tagsPrefixAfterPostsPrefix) {
                await this.getTagsFilesList(file);
                continue;
            }

            // Detect tag pages - when tags prefix is not empty
            if (this.siteConfig.advanced.urls.tagsPrefix !== '' && file === this.siteConfig.advanced.urls.tagsPrefix && !this.siteConfig.advanced.urls.tagsPrefixAfterPostsPrefix) {
                await this.getTagsFilesList(file, this.siteConfig.advanced.urls.tagsPrefix);
                continue;
            }

            // Detect post/pages files with clean URLs disabled
            if (!this.siteConfig.advanced.urls.cleanUrls && file.indexOf('.html') > 0) {
                await this.getPostsAndPagesFilesList(file, false, true);
                continue;
            }

            // Detect post/pages files
            if (this.siteConfig.advanced.urls.cleanUrls) {
                await this.getPostsAndPagesFilesList(file, true, true);
            }
        }
    }

    /**
     * Prepares list of the items to skip
     *
     * @returns {array}
     */
    getInternalsList () {
        let internalsList = [
            'assets',
            'media',
            '.htaccess',
            '.htpasswd',
            '_redirects',
            'robots.txt',
            'feed.xml',
            'feed.json',
            'index.html'
        ];

        if (RendererHelpers.getRendererOptionValue('create404page', this.themeConfig) && this.siteConfig.advanced.urls.errorPage) {
            internalsList.push(this.siteConfig.advanced.urls.errorPage);
        }

        if (RendererHelpers.getRendererOptionValue('createSearchPage', this.themeConfig) && this.siteConfig.advanced.urls.searchPage) {
            internalsList.push(this.siteConfig.advanced.urls.searchPage);
        }

        return internalsList;
    }

    /**
     * Detects if author pages are no-indexed
     *
     * @returns {boolean}
     */
    shouldIndexAuthors () {
        return this.siteConfig.advanced.sitemapAddAuthors;
    }

    /**
     * Detects if homepage is no-indexed
     *
     * @returns {boolean}
     */
    shouldIndexHomepage () {
        return this.siteConfig.advanced.sitemapAddHomepage;
    }

    /**
     * Detects if tag pages are no-indexed
     *
     * @returns {boolean}
     */
    shouldIndexTags () {
        return this.siteConfig.advanced.sitemapAddTags;
    }

    /**
     * Retrieves list of author pages to index
     */
    async getAuthorsFilesList () {
        const readFile = util.promisify(fs.readFile);

        if (!this.shouldIndexAuthors()) {
            return;
        }

        let authorsPathToCheck = path.join(this.baseDirectory, this.siteConfig.advanced.urls.authorsPrefix);
        let usePostsPrefix = this.siteConfig.advanced.urls.postsPrefix && this.siteConfig.advanced.urls.authorsPrefixAfterPostsPrefix;

        if (usePostsPrefix) {
            authorsPathToCheck = path.join(this.baseDirectory, this.siteConfig.advanced.urls.postsPrefix, this.siteConfig.advanced.urls.authorsPrefix);
        }

        let files = fs.readdirSync(authorsPathToCheck);

        for (let file of files) {
            // Skip files
            if (file.indexOf('.') > -1) {
                continue;
            }

            let authorFileContent = await readFile(path.join(authorsPathToCheck, file, 'index.html'), 'utf8');
            
            if (authorFileContent.indexOf('name="robots" content="noindex') === -1) {
                if (usePostsPrefix) {
                    this.fileList.push(this.siteConfig.advanced.urls.postsPrefix + '/' + this.siteConfig.advanced.urls.authorsPrefix + '/' + file + '/index.html');
                } else {
                    this.fileList.push(this.siteConfig.advanced.urls.authorsPrefix + '/' + file + '/index.html');
                }

                if (this.siteConfig.advanced.authorNoIndexPagination || this.siteConfig.advanced.authorNoPagination) {
                    continue;
                }

                let paginationPath = path.join(
                    authorsPathToCheck,
                    file,
                    this.siteConfig.advanced.urls.pageName
                );

                if (fs.existsSync(paginationPath)) {
                    let authorFiles = fs.readdirSync(paginationPath);

                    for (let authorFile of authorFiles) {
                        // Skip files
                        if (authorFile.indexOf('.') > -1) {
                            continue;
                        }

                        // Add all pages of pagination
                        let pageName = this.siteConfig.advanced.urls.pageName;
                       
                        if (usePostsPrefix) {
                            this.fileList.push(this.siteConfig.advanced.urls.postsPrefix + '/' + this.siteConfig.advanced.urls.authorsPrefix + '/' + file + '/' + pageName + '/' + authorFile + '/index.html');
                        } else {
                            this.fileList.push(this.siteConfig.advanced.urls.authorsPrefix + '/' + file + '/' + pageName + '/' + authorFile + '/index.html');
                        }
                    }
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
    async getTagsFilesList (tagName, prefix = '') {
        const readFile = util.promisify(fs.readFile);
        let postsPrefix = this.siteConfig.advanced.urls.postsPrefix;
        let tagsPrefix = this.siteConfig.advanced.urls.tagsPrefix;
        let usePostsPrefix = this.siteConfig.advanced.urls.postsPrefix && this.siteConfig.advanced.urls.tagsPrefixAfterPostsPrefix;

        if (!this.shouldIndexTags()) {
            return Promise.resolve();
        }

        if (prefix === '') {
            let tagFileContent;
            
            if (usePostsPrefix) {
                tagFileContent = await readFile(path.join(this.baseDirectory, postsPrefix, tagName, 'index.html'), 'utf8');
            } else {
                tagFileContent = await readFile(path.join(this.baseDirectory, tagName, 'index.html'), 'utf8');
            }

            // Detect if noindex does not exist in the post file
            if (tagFileContent.indexOf('name="robots" content="noindex') === -1) {
                // Add main file to the list
                this.fileList.push(tagName + '/index.html');

                if (this.siteConfig.advanced.tagNoIndexPagination || this.siteConfig.advanced.tagNoPagination) {
                    return Promise.resolve();
                }

                let paginationPath = path.join(this.baseDirectory, tagName, this.siteConfig.advanced.urls.pageName);

                if (usePostsPrefix) {
                    paginationPath = path.join(this.baseDirectory, postsPrefix, tagName, this.siteConfig.advanced.urls.pageName);
                }

                if (fs.existsSync(paginationPath)) {
                    let files = fs.readdirSync(paginationPath);

                    for (let file of files) {
                        // Skip files
                        if (file.indexOf('.') > -1) {
                            continue;
                        }

                        // Add all pages of pagination
                        let pageName = this.siteConfig.advanced.urls.pageName;

                        if (usePostsPrefix) {
                            this.fileList.push(postsPrefix + '/' + tagName + '/' + pageName + '/' + file + '/index.html');
                        } else {
                            this.fileList.push(tagName + '/' + pageName + '/' + file + '/index.html');
                        }
                    }
                }
            }

            return Promise.resolve();
        }

        let tagsPath = path.join(this.baseDirectory, tagsPrefix);

        if (usePostsPrefix) {
            tagsPath = path.join(this.baseDirectory, postsPrefix, tagsPrefix);
        }

        if (UtilsHelper.fileExists(path.join(tagsPath, 'index.html'))) {
            let tagsFileContent = await readFile(path.join(tagsPath, 'index.html'), 'utf8');

            if (usePostsPrefix && tagsFileContent.indexOf('name="robots" content="noindex') === -1) {
                this.fileList.push(postsPrefix + '/' + tagsPrefix + '/index.html');
            } else if (tagsFileContent.indexOf('name="robots" content="noindex') === -1) {
                this.fileList.push(tagsPrefix + '/index.html');
            }
        }

        let files = fs.readdirSync(tagsPath);

        for (let file of files) {
            // Skip files
            if (file.indexOf('.') > -1) {
                continue;
            }

            let tagFileContent = await readFile(path.join(tagsPath, file, 'index.html'), 'utf8');

            // Detect if noindex does not exist in the post file
            if (tagFileContent.indexOf('name="robots" content="noindex') === -1) {
                if (usePostsPrefix) {
                    this.fileList.push(postsPrefix + '/' + tagsPrefix + '/' + file + '/index.html');
                } else {
                    this.fileList.push(tagsPrefix + '/' + file + '/index.html');
                }

                if (this.siteConfig.advanced.tagNoIndexPagination || this.siteConfig.advanced.tagNoPagination) {
                    continue;
                }

                let paginationPath = path.join(
                    tagsPath,
                    file,
                    this.siteConfig.advanced.urls.pageName
                );

                if (fs.existsSync(paginationPath)) {
                    let tagsFiles = fs.readdirSync(paginationPath);

                    for (let tagFile of tagsFiles) {
                        // Skip files
                        if (tagFile.indexOf('.') > -1) {
                            continue;
                        }

                        // Add all pages of pagination
                        let pageName = this.siteConfig.advanced.urls.pageName;

                        if (usePostsPrefix) {
                            this.fileList.push(postsPrefix + '/' + tagsPrefix + '/' + file + '/' + pageName + '/' + tagFile + '/index.html');
                        } else {
                            this.fileList.push(tagsPrefix + '/' + file + '/' + pageName + '/' + tagFile + '/index.html');
                        }
                    }
                }
            }
        }
    }

    /**
     * Retrieves homepage files to index
     */
    async getHomepagePaginationFilesList () {
        if (!this.shouldIndexHomepage()) {
            return;
        }

        let postsPrefix = this.siteConfig.advanced.urls.postsPrefix;
        let files; 
        let filesPath;
        let homeIndexPath;
        const readFile = util.promisify(fs.readFile);
        
        if (postsPrefix) {
            filesPath = path.join(this.baseDirectory, postsPrefix, this.siteConfig.advanced.urls.pageName);
            files = fs.readdirSync(filesPath);
            homeIndexPath = path.join(this.baseDirectory, postsPrefix);
        } else {
            filesPath = path.join(this.baseDirectory, this.siteConfig.advanced.urls.pageName);
            files = fs.readdirSync(filesPath);
            homeIndexPath = this.baseDirectory;
        }

        if (postsPrefix) {
            let homeIndexFileContent = await readFile(path.join(homeIndexPath, 'index.html'), 'utf8');

            if (homeIndexFileContent.indexOf('name="robots" content="noindex') === -1) {
                this.fileList.push(postsPrefix + '/index.html');
            }
        }

        for (let file of files) {
            // Skip files
            if (file.indexOf('.') > -1) {
                continue;
            }

            let homeFileContent = await readFile(path.join(filesPath, file, 'index.html'), 'utf8');

            if (homeFileContent.indexOf('name="robots" content="noindex') === -1) {
                let pageName = this.siteConfig.advanced.urls.pageName;

                if (postsPrefix) {
                    this.fileList.push(postsPrefix + '/' + pageName + '/' + file + '/index.html');
                } else {
                    this.fileList.push(pageName + '/' + file + '/index.html');
                }
            }
        }
    }

    /**
     * Retrieves single post files to index
     *
     * @param file
     * @param cleanUrlsEnabled
     */
    async getPostsAndPagesFilesList (file, cleanUrlsEnabled = false, skipPostsPrefix = false) {
        const readFile = util.promisify(fs.readFile);

        if (!skipPostsPrefix && this.siteConfig.advanced.urls.postsPrefix) {
            file = path.join(this.siteConfig.advanced.urls.postsPrefix, file);
        }

        if (!cleanUrlsEnabled) {
            // Read post file
            let postFileContent = await readFile(path.join(this.baseDirectory, file), 'utf8');

            // Detect if noindex does not exist in the post file
            if (postFileContent.indexOf('name="robots" content="noindex') === -1) {
                let fileNameWithoutExt = file.replace('.html', '');

                if (this.postData[fileNameWithoutExt]) {
                    this.fileList.push({
                        images: this.postData[fileNameWithoutExt].images,
                        lastMod: this.postData[fileNameWithoutExt].lastMod,
                        url: file
                    });
                } else {
                    this.fileList.push(file);
                }
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
                    if (this.postData[file]) {
                        this.fileList.push({
                            images: this.postData[file].images,
                            lastMod: this.postData[file].lastMod,
                            url: file + '/'
                        });
                    } else {
                        this.fileList.push(file + '/');
                    }
                }
            }
        }

        // Look for subpages
        let baseDir = path.join(this.baseDirectory, file);

        if (fs.lstatSync(baseDir).isDirectory()) {
            let subpages = fs.readdirSync(baseDir);
            this.scanSubpages(subpages, file);
        }

        return Promise.resolve()
    }

    // recusive function to scan subpages
    scanSubpages (subpages, currentPath) {
        for (let subpage of subpages) {
            if (subpage.indexOf('.') > -1) {
                continue;
            }

            let filePath = path.join(this.baseDirectory, currentPath, subpage, 'index.html');

            if (fs.existsSync(filePath)) {
                let postFileContent = fs.readFileSync(filePath, 'utf8');

                if (postFileContent.indexOf('name="robots" content="noindex') === -1) {
                    this.fileList.push(currentPath + '/' + subpage + '/');
                }
            }

            let pathToScan = path.join(this.baseDirectory, currentPath, subpage);
            
            if (!fs.lstatSync(pathToScan).isDirectory()) {
                continue;
            }

            let subpagesList = fs.readdirSync(pathToScan);

            if (subpagesList.length) {
                this.scanSubpages(subpagesList, path.join(currentPath, subpage));
            }
        }
    }

    /**
     * Returns sitemap XML file
     */
    renderXML() {
        let domain = this.siteConfig.domain + '/';
        this.outputXML = '<?xml version="1.0" encoding="UTF-8"?>' + "\n";
        this.outputXML += '<?xml-stylesheet type="text/xsl" href="' + domain + 'sitemap.xsl"?>' + "\n";
        this.outputXML += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">' + "\n";
        this.outputXML += '<url>' + "\n";
        this.outputXML += '<loc>' + domain + '</loc>' + "\n";
        this.outputXML += '</url>' + "\n";

        for (let item of this.fileList) {
            let url = '';
            let lastMod = false;
            let images = false;

            if (typeof item === 'string') {
                url = item;
            } else {
                url = item.url;
                lastMod = item.lastMod;
                images = item.images;
            }

            if (this.isExcluded(url)) {
                continue;
            }

            this.outputXML += '<url>' + "\n";
            this.outputXML += '<loc>' + (domain + url.replace(/index\.html$/, '')).replace(/\\/gmi, '/') + '</loc>' + "\n";

            if (lastMod) {
                this.outputXML += '<lastmod>' + lastMod + '</lastmod>' + "\n";
            }

            if (images) {
                for (let i = 0; i < images.length; i++) {
                    if (!this.siteConfig.advanced.sitemapAddExternalImages && images[i].url.indexOf(domain) === -1) {
                        continue;
                    }

                    this.outputXML += '<image:image>' + "\n";
                    this.outputXML += '<image:loc>' + (images[i].url).replace(/\\/gmi, '/') + '</image:loc>' + "\n";
                    this.outputXML += '<image:title><![CDATA[' + images[i].alt + ']]></image:title>' + "\n";
                    this.outputXML += '</image:image>' + "\n";
                }
            }

            this.outputXML += '</url>' + "\n";
        }

        this.outputXML += '</urlset>';
    }

    /**
     * Save sitemap.xml and sitemap.xsl files
     */
    saveXML () {
        let xslContent = fs.readFileSync(__dirname + '/../../../../default-files/theme-files/sitemap.xsl');
        let xslFilePath = path.join(this.baseDirectory, 'sitemap.xsl');
        let sitemapFilePath = path.join(this.baseDirectory, 'sitemap.xml');

        // Check if sitemap.xsl exists - if yes, generate only sitemap
        if (UtilsHelper.fileExists(xslFilePath)) {
            fs.writeFileSync(sitemapFilePath, this.outputXML, 'utf8');
            return;
        }

        fs.writeFileSync(sitemapFilePath, this.outputXML, 'utf8');
        fs.writeFileSync(xslFilePath, xslContent, 'utf8');
    }

    /**
     * Check if the gived URL should be excluded from the sitemap
     */
    isExcluded (url) {
        url = '/' + url + '/';

        for (let i = 0; i < this.excludedFiles.length; i++) {
            if (url.indexOf(this.excludedFiles[i]) > -1) {
                return true;
            }
        }

        return false;
    }
}

module.exports = Sitemap;
