/*
 * Page instance
 */

const fs = require('fs-extra');
const path = require('path');
const slug = require('./helpers/slug');
const Model = require('./model.js');
const ImageHelper = require('./helpers/image.helper.js');
const Pages = require('./pages.js');
const Authors = require('./authors.js');
const Themes = require('./themes.js');
const Utils = require('./helpers/utils.js');
const normalizePath = require('normalize-path');

class Page extends Model {
    constructor(appInstance, pageData, storeMode = true) {
        super(appInstance, pageData);
        this.id = parseInt(pageData.id, 10);
        this.pagesData = new Pages(appInstance, pageData);
        this.authorsData = new Authors(appInstance, pageData);
        this.storeMode = storeMode;

        if (pageData.title) {
            this.title = pageData.title;
            this.slug = slug(pageData.slug);
            this.author = Number(pageData.author).toString();
            this.status = pageData.status;
            this.creationDate = pageData.creationDate;
            this.modificationDate = pageData.modificationDate;
            this.template = pageData.template;
            this.additionalData = pageData.additionalData;
            this.pageViewSettings = pageData.pageViewSettings;
        }

        // Separated for the case of use the cancel page event
        this.text = pageData.text ? pageData.text : '';
        this.featuredImage = pageData.featuredImage ? pageData.featuredImage : '';
        this.featuredImageFilename = pageData.featuredImageFilename ? pageData.featuredImageFilename : '';
        this.featuredImageData = pageData.featuredImageData ? pageData.featuredImageData : false;
    }

    /*
     * Load page
     */
    load() {
        let results = {
            "pages": [],
            "featuredImage": '',
            "mediaPath": path.join(this.siteDir, 'input', 'media', 'posts'),
            "author": ''
        };
        // Get page data
        let pagesSqlQuery = `SELECT * FROM posts WHERE id = @id`;
        results.pages = this.db.prepare(pagesSqlQuery).all({ id: this.id });

        // Get author data
        let authorSqlQuery = `
            SELECT
                a.id AS id,
                a.name AS name
            FROM
                authors AS a
            LEFT JOIN
                posts AS p
                ON
                p.authors = a.id
            WHERE
                p.id = @id
        `;

        results.author = this.db.prepare(authorSqlQuery).all({ id: this.id });

        // Get image data
        let imageSqlQuery = `
            SELECT
                pi.url AS url,
                pi.additional_data AS additional_data
            FROM
                posts AS p
            LEFT JOIN
                posts_images AS pi
                ON
                    p.featured_image_id = pi.id
            WHERE
                p.id = @id;
        `;
        results.featuredImage = this.db.prepare(imageSqlQuery).get({ id: this.id });

        // Get the additional data
        let additionalDataSqlQuery = `
            SELECT
                *
            FROM
                posts_additional_data
            WHERE
                post_id = @id
                AND
                key = '_core'
        `;
        let additionalDataResult = this.db.prepare(additionalDataSqlQuery).get({ id: this.id });

        if(additionalDataResult && additionalDataResult.value) {
            results.additionalData = JSON.parse(additionalDataResult.value);
        } else {
            results.additionalData = {};
        }
        // Get page view settings
        let pageViewSqlQuery = `
            SELECT
                *
            FROM
                posts_additional_data
            WHERE
                post_id = @id
                AND
                key = 'pageViewSettings'
        `;
        let pageViewResult = this.db.prepare(pageViewSqlQuery).get({ id: this.id });

        if (pageViewResult && pageViewResult.value) {
            results.pageViewSettings = JSON.parse(pageViewResult.value);
            let pageViewSettingsKeys = Object.keys(results.pageViewSettings);

            for (let i = 0; i < pageViewSettingsKeys.length; i++) {
                if (results.pageViewSettings[pageViewSettingsKeys[i]].type) {
                    results.pageViewSettings[pageViewSettingsKeys[i]] = results.pageViewSettings[pageViewSettingsKeys[i]].value;
                }
            }
        } else {
            results.pageViewSettings = {};
        }

        // Return all results
        return results;
    }

    /*
     * Save page
     */
    save() {
        let sqlQuery = '';
        this.checkAndPrepareSlug();

        if (this.id === 0) {
            // Add page data
            sqlQuery = this.db.prepare(`INSERT INTO posts VALUES(null, @title, @author, @slug, @text, 0, @creationDate, @modificationDate, @status, @template)`);
            sqlQuery.run({
                title: this.title,
                author: this.author,
                slug: this.slug,
                text: this.cleanUpContent(this.text),
                creationDate: this.creationDate,
                modificationDate: this.modificationDate,
                status: this.status,
                template: this.template
            });
        } else {
            // Update page data
            sqlQuery = this.db.prepare(`UPDATE posts
                        SET
                            title = @title,
                            authors = @author,
                            slug = @slug,
                            text = @text,
                            status = @status,
                            created_at = @createdAt,
                            modified_at = @modifiedAt,
                            template = @template
                        WHERE
                            id = @id`);
            sqlQuery.run({
                title: this.title,
                author: this.author,
                slug: this.slug,
                text: this.cleanUpContent(this.text),
                status: this.status,
                createdAt: this.creationDate,
                modifiedAt: this.modificationDate,
                template: this.template,
                id: this.id
            });
        }

        // Get the newly added item ID if necessary
        if (this.id === 0) {
            this.id = this.db.prepare('SELECT last_insert_rowid() AS id').get().id;

            // Move images from the temp directory
            let tempDirectoryExists = true;
            let tempImagesDir = path.join(this.siteDir, 'input', 'media', 'posts', 'temp');

            try {
                fs.statSync(tempImagesDir).isDirectory();
            } catch (err) {
                tempDirectoryExists = false;
            }

            if (tempDirectoryExists) {
                let finalImagesDir = path.join(this.siteDir, 'input', 'media', 'posts', (this.id).toString());
                fs.copySync(tempImagesDir, finalImagesDir);
                fs.removeSync(tempImagesDir);

                // Update text
                if(!this.text) {
                    this.text = '';
                }

                this.text = this.text.replace(/file:(\/){1,}/gmi, 'file:///');
                this.text = this.text.split(normalizePath(tempImagesDir)).join('#DOMAIN_NAME#');
                this.text = this.text.replace(/file:(\/){1,}\#DOMAIN_NAME\#/gmi, '#DOMAIN_NAME#');
                sqlQuery = this.db.prepare(`UPDATE posts
                        SET
                            text = @text
                        WHERE
                            id = @id`);
                sqlQuery.run({
                    text: this.text,
                    id: this.id
                });
            }
        }

        // Save images
        if(this.featuredImage) {
            let image = new ImageHelper(this);
            image.save();
        } else if(this.id > 0) {
            let image = new ImageHelper(this);
            image.delete();
        }

        // Save additional data
        this.saveAdditionalData();

        // Save page view settings
        this.savePageViewSettings();

        // Remove unused images
        this.checkAndCleanImages();

        // Return new list of the pages
        return {
            pageID: this.id,
            pages: this.pagesData.load(),
            pagesAuthors: this.pagesData.loadAuthorsXRef(),
            authors: this.authorsData.load()
        };
    }

    /*
     * Delete page
     */
    delete() {
        this.db.exec(`DELETE FROM posts WHERE id = ${parseInt(this.id, 10)}`);
        this.db.exec(`DELETE FROM posts_tags WHERE post_id = ${parseInt(this.id, 10)}`);
        this.db.exec(`DELETE FROM posts_images WHERE post_id = ${parseInt(this.id, 10)}`);
        this.db.exec(`DELETE FROM posts_additional_data WHERE post_id = ${parseInt(this.id, 10)}`);
        ImageHelper.deleteImagesDirectory(this.siteDir, 'posts', this.id);

        return true;
    }

    /*
     * Duplicate page
     */
    duplicate() {
        // Get the page data
        let pageToDuplicate = this.db.prepare(`SELECT * FROM posts WHERE id = @id LIMIT 1`).get({ id: this.id });
        let pageImagesToDuplicate = this.db.prepare(`SELECT * FROM posts_images WHERE post_id = @id`).all({ id: this.id });
        let pageAdditionalDataToDuplicate = this.db.prepare(`SELECT * FROM posts_additional_data WHERE post_id = @id`).all({ id: this.id });

        // Add duplicate page row
        if (pageToDuplicate && pageToDuplicate.id) {
            // Change title (suffix with " (copy)")
            let copySuffix = 1;
            let modifiedTitle = pageToDuplicate.title;
            let pageWithTheSameSlug = false;
            let modifiedSlug = pageToDuplicate.slug;
            
            if (modifiedTitle.substr(-7) !== ' (copy)') {
                modifiedTitle += ' (copy)';
            }

            if (modifiedSlug.substr(-2).match(/-\d/)) {
                modifiedSlug = modifiedSlug.substr(0, modifiedSlug.length - 2);
            }

            do {
                copySuffix++;
                pageWithTheSameSlug = this.db.prepare(`SELECT id FROM posts WHERE slug = @slug LIMIT 1`).get({ slug: modifiedSlug + '-' + copySuffix });
            } while (pageWithTheSameSlug && pageWithTheSameSlug.id);

            modifiedSlug = modifiedSlug + '-' + copySuffix;
            let pageStatus = pageToDuplicate.status;

            if (pageStatus.indexOf('draft') === -1) {
                pageStatus = pageStatus.replace('published', 'draft');

                if (pageStatus.indexOf('draft') === -1) {
                    pageStatus += ',draft';
                }
            }

            let newCopyPageSqlQuery = this.db.prepare(`INSERT INTO posts VALUES(null, @title, @authors, @slug, @text, @featured_image_id, @created_at, @modified_at, @status, @template)`);
            newCopyPageSqlQuery.run({
                title: modifiedTitle,
                authors: pageToDuplicate.authors,
                slug: modifiedSlug,
                text: pageToDuplicate.text,
                featured_image_id: pageToDuplicate.featured_image_id,
                created_at: Date.now(),
                modified_at: Date.now(),
                status: pageStatus,
                template: pageToDuplicate.template
            });
        } else {
            return false;
        }

        // Get newly inserted page ID
        let copiedPageId = this.db.prepare('SELECT last_insert_rowid() AS id').get().id;

        // Add posts_images row
        if (pageImagesToDuplicate.length) {
            let imagesCount = pageImagesToDuplicate.length;

            for (let i = 0; i < imagesCount; i++) {
                let newCopyPageImagesSqlQuery = this.db.prepare(`INSERT INTO posts_images VALUES(NULL, @copied_page_id, @url, @title, @caption, @additional_data)`);
                newCopyPageImagesSqlQuery.run({
                    copied_page_id: copiedPageId,
                    url: pageImagesToDuplicate[i].url,
                    title: pageImagesToDuplicate[i].title,
                    caption: pageImagesToDuplicate[i].caption,
                    additional_data: pageImagesToDuplicate[i].additional_data
                });
            }

            // Get newly inserted page ID
            let copiedFeaturedImageId = this.db.prepare('SELECT last_insert_rowid() AS id').get().id;
            
            this.db.prepare(`UPDATE posts SET featured_image_id = @featuredImageID WHERE id = @pageID`).run({
                featuredImageID: copiedFeaturedImageId,
                pageID: copiedPageId
            });
        }

        // Add posts_additional_data
        if (pageAdditionalDataToDuplicate.length) {
            let additionalDataCount = pageAdditionalDataToDuplicate.length;

            for (let i = 0; i < additionalDataCount; i++) {
                let newCopyPageAdditionalDataSqlQuery = this.db.prepare(`INSERT INTO posts_additional_data VALUES(NULL, @copied_page_id, @key, @value)`);
                newCopyPageAdditionalDataSqlQuery.run({
                    copied_page_id: copiedPageId,
                    key: pageAdditionalDataToDuplicate[i].key,
                    value: pageAdditionalDataToDuplicate[i].value
                });
            }
        }

        // Copy images
        ImageHelper.copyImagesDirectory(this.siteDir, this.id, copiedPageId);

        return true;
    }

    /*
     * Change page status
     */
    changeStatus(status, inverse = false) {
        let selectQuery = this.db.prepare(`SELECT status FROM posts WHERE id = @id`).all({ id: this.id });
        let currentStatus = selectQuery[0].status.split(',');
        let resetTemplateIfNeeded = status === 'is-page' ? ', template = \'*\'' : '';

        if (!inverse) {
            if(currentStatus.indexOf(status) === -1) {
                currentStatus.push(status);
            }
        } else {
            if(currentStatus.indexOf(status) > -1) {
                currentStatus = currentStatus.filter((pageStatus) => pageStatus !== status);
            }
        }

        currentStatus = currentStatus.filter(status => status.trim() !== '');

        let updateQuery = this.db.prepare(`UPDATE
                                        posts
                                    SET
                                        status = @status
                                        ${resetTemplateIfNeeded}
                                    WHERE
                                        id = @id`);
        updateQuery.run({
            status: currentStatus.join(','),
            id: this.id
        });

        return true;
    }

    /*
     * Check and prepare page slug
     */
    checkAndPrepareSlug(suffix = 0) {
        let pageSlug = this.slug;
        let restrictedSlugs = [];

        if (this.application.sites[this.site].advanced.urls.cleanUrls) {
            restrictedSlugs = [
                'assets',
                'media',
                this.application.sites[this.site].advanced.urls.authorsPrefix
            ];

            if (this.application.sites[this.site].advanced.urls.postsPrefix !== '') {
                restrictedSlugs.push(this.application.sites[this.site].advanced.urls.postsPrefix);
            }

            if (this.application.sites[this.site].advanced.urls.tagsPrefix !== '') {
                restrictedSlugs.push(this.application.sites[this.site].advanced.urls.tagsPrefix);
            }
        }

        if (suffix > 0) {
            pageSlug = this.escape(this.slug + '-' + suffix);
        }

        if (restrictedSlugs.indexOf(pageSlug) > -1) {
            this.checkAndPrepareSlug(2);
            return;
        }

        let result = this.db.prepare(`SELECT slug FROM posts WHERE slug LIKE @slug AND id != @id`).all({
            slug: pageSlug,
            id: this.id
        });

        if (result && result.length) {
            if(suffix === 0) {
                suffix = 2;
            } else {
                suffix++;
            }

            this.checkAndPrepareSlug(suffix);
        } else {
            this.slug = pageSlug;
        }
    }

    /*
     * Remove unused images
     */
    checkAndCleanImages(cancelEvent = false) {
        let pageDir = this.id;

        if(this.id === 0) {
            pageDir = 'temp';
        }

        let imagesDir = path.join(this.siteDir, 'input', 'media', 'posts', (pageDir).toString());
        let galleryImagesDir = path.join(imagesDir, 'gallery');
        let pageDirectoryExists = true;

        try {
            fs.statSync(imagesDir).isDirectory();
        } catch (err) {
            pageDirectoryExists = false;
        }

        if(!pageDirectoryExists) {
            return;
        }

        let images = fs.readdirSync(imagesDir);
        let galleryImages = false;

        if (Utils.dirExists(galleryImagesDir)) {
            galleryImages = fs.readdirSync(galleryImagesDir);
        }

        // Get previous text if the page is cancelled and it is a not a new page
        if (cancelEvent && pageDir !== 'temp') {
            let textSqlQuery = `
                    SELECT
                        text
                    FROM
                        posts
                    WHERE
                        id = @id
                `;

            let textResult = this.db.prepare(textSqlQuery).get({ id: pageDir });

            if (textResult && textResult.text) {
                this.text = textResult.text;
            }
        }

        this.cleanImages(images, imagesDir, cancelEvent);

        if (galleryImages) {
            this.cleanImages(galleryImages, galleryImagesDir, cancelEvent);
        }
    }

    /*
     * Removes images from a given image dir
     */
    cleanImages(images, imagesDir, cancelEvent) {
        let pageDir = this.id;
        let featuredImage = path.parse(this.featuredImageFilename).base;

        // If page is cancelled - get the previous featured image
        if (cancelEvent && this.id !== 0) {
            let featuredImageSqlQuery = `
                    SELECT
                        url
                    FROM
                        posts_images
                    WHERE
                        post_id = @id
                `;

            let featuredImageResult = this.db.prepare(featuredImageSqlQuery).all({ 
                id: this.id 
            });

            if (featuredImageResult && featuredImageResult.url) {
                featuredImage = featuredImageResult.url;
            }
        }

        if (this.id === 0) {
            pageDir = 'temp';
        }

        let imagesInPageViewSettings = [];
        
        if (this.pageViewSettings) {
            imagesInPageViewSettings = Object.values(this.pageViewSettings).filter(item => item.type === "image").map(item => item.value);
        }
        
        // Iterate through images
        for (let i in images) {
            let imagePath = images[i];
            let fullPath = path.join(imagesDir, imagePath);

            // Skip dirs and symlinks
            if(imagePath === '.' || imagePath === '..' || imagePath === 'responsive' || imagePath === 'gallery') {
                continue;
            }

            // Remove files which does not exist in the page text, as featured image and pageViewSettings
            if(
                (cancelEvent && pageDir === 'temp') ||
                (
                    this.text.indexOf(imagePath) === -1 && 
                    imagesInPageViewSettings.indexOf(imagePath) === -1 &&
                    featuredImage !== imagePath
                )
            ) {
                try {
                    fs.unlinkSync(fullPath);
                } catch(e) {
                    console.error(e);
                }

                // Remove responsive images
                this.removeResponsiveImages(fullPath);
            }
        }
    }

    /*
     * Remove unused responsive images
     */
    removeResponsiveImages(originalPath) {
        let themesHelper = new Themes(this.application, { site: this.site });
        let currentTheme = themesHelper.currentTheme();

        // If there is no selected theme
        if (currentTheme === 'not selected') {
            return;
        }

        // Load theme config
        let themeConfig = Utils.loadThemeConfig(path.join(this.siteDir, 'input'), currentTheme);

        // check if responsive images config exists
        if (Utils.responsiveImagesConfigExists(themeConfig)) {
            let dimensions = Utils.responsiveImagesDimensions(themeConfig, 'contentImages');
            let featuredDimensions = Utils.responsiveImagesDimensions(themeConfig, 'featuredImages');

            if (featuredDimensions !== false) {
                featuredDimensions.forEach(item => {
                    if (dimensions.indexOf(item) === -1) {
                        dimensions.push(item);
                    }
                });
            }

            let responsiveImagesDir = path.parse(originalPath).dir;
            responsiveImagesDir = path.join(responsiveImagesDir, 'responsive');

            if (typeof dimensions === "boolean") {
                return;
            }

            let forceWebp = !!this.application.sites[this.site]?.advanced?.forceWebp;

            // Remove responsive images of each size
            for (let dimensionName of dimensions) {
                let filename = path.parse(originalPath).name;
                let extension = path.parse(originalPath).ext;

                if (forceWebp && ['.png', '.jpg', '.jpeg'].indexOf(extension.toLowerCase()) > -1) {
                    extension = '.webp'; 
                }

                let responsiveImagePath = path.join(responsiveImagesDir, filename + '-' + dimensionName + extension);

                if (Utils.fileExists(responsiveImagePath)){
                    fs.unlinkSync(responsiveImagePath);
                }
            }
        }
    }

    /*
     * Save additional data
     */
    saveAdditionalData() {
        // Remove old _core additional data
        this.db.exec(`DELETE FROM posts_additional_data WHERE post_id = ${parseInt(this.id, 10)} AND key = '_core'`);

        // Convert data to JSON string
        if (typeof this.additionalData !== 'object') {
            this.additionalData = {};
        }

        let additionalDataToSave = JSON.stringify(this.additionalData);

        // Store the data
        let storeSqlQuery = this.db.prepare(`INSERT INTO posts_additional_data VALUES(null, @id, '_core', @data)`);
        storeSqlQuery.run({
            id: this.id, 
            data: additionalDataToSave
        });
    }

    /*
     * Save additional data
     */
    savePageViewSettings() {
        // Remove old _core additional data
        this.db.exec(`DELETE FROM posts_additional_data WHERE post_id = ${parseInt(this.id, 10)} AND key = 'pageViewSettings'`);

        // Convert data to JSON string
        if(typeof this.pageViewSettings !== 'object') {
            this.pageViewSettings = {};
        }

        let dataToSave = JSON.stringify(this.pageViewSettings);

        // Store the data
        let storeSqlQuery = this.db.prepare(`INSERT INTO posts_additional_data VALUES(null, @id, 'pageViewSettings', @data)`);
        storeSqlQuery.run({
            id: this.id, 
            data: dataToSave
        });
    }

    /**
     * Clean up page content from wrong code
     */
    cleanUpContent (content) {
        return content.replace(/\<figure\sclass=\"post__image\spost__image\s/gmi, '<figure class="post__image ');
    }
}

module.exports = Page;
