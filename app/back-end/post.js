/*
 * Post instance
 */

const fs = require('fs-extra');
const path = require('path');
const slug = require('./helpers/slug');
const Model = require('./model.js');
const ImageHelper = require('./helpers/image.helper.js');
const Posts = require('./posts.js');
const Tags = require('./tags.js');
const Authors = require('./authors.js');
const Themes = require('./themes.js');
const Utils = require('./helpers/utils.js');
const normalizePath = require('normalize-path');

class Post extends Model {
    constructor(appInstance, postData, storeMode = true) {
        super(appInstance, postData);
        this.id = parseInt(postData.id, 10);
        this.postsData = new Posts(appInstance, postData);
        this.tagsData = new Tags(appInstance, postData);
        this.authorsData = new Authors(appInstance, postData);
        this.storeMode = storeMode;

        if(postData.title) {
            this.title = postData.title;
            this.slug = slug(postData.slug);
            this.author = Number(postData.author).toString();
            this.status = postData.status;
            this.tags = postData.tags;
            this.creationDate = postData.creationDate;
            this.modificationDate = postData.modificationDate;
            this.template = postData.template;
            this.additionalData = postData.additionalData;
            this.postViewSettings = postData.postViewSettings;
        }

        // Separated for the case of use the cancel post event
        this.text = postData.text ? postData.text : '';
        this.featuredImage = postData.featuredImage ? postData.featuredImage : '';
        this.featuredImageFilename = postData.featuredImageFilename ? postData.featuredImageFilename : '';
        this.featuredImageData = postData.featuredImageData ? postData.featuredImageData : false;
    }

    /*
     * Load post
     */
    load() {
        let results = {
            "posts": [],
            "tags": [],
            "featuredImage": '',
            "mediaPath": path.join(this.siteDir, 'input', 'media', 'posts'),
            "author": ''
        };
        // Get post data
        let postsSqlQuery = `SELECT * FROM posts WHERE id = @id`;
        results.posts = this.db.prepare(postsSqlQuery).all({ id: this.id });

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

        // Get tags data
        let tagsSqlQuery = `
            SELECT
                t.id AS id,
                t.name AS name
            FROM
                tags AS t
            LEFT JOIN
                posts_tags AS pt
                ON
                    t.id = pt.tag_id
            LEFT JOIN
                posts AS p
                ON
                    p.id = pt.post_id
            WHERE
                p.id = @id
            ORDER BY
                t.name ASC;
        `;
        results.tags = this.db.prepare(tagsSqlQuery).all({ id: this.id });

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
        // Get post view settings
        let postViewSqlQuery = `
            SELECT
                *
            FROM
                posts_additional_data
            WHERE
                post_id = @id
                AND
                key = 'postViewSettings'
        `;
        let postViewResult = this.db.prepare(postViewSqlQuery).get({ id: this.id });

        if(postViewResult && postViewResult.value) {
            results.postViewSettings = JSON.parse(postViewResult.value);
            let postViewSettingsKeys = Object.keys(results.postViewSettings);

            for(let i = 0; i < postViewSettingsKeys.length; i++) {
                if(results.postViewSettings[postViewSettingsKeys[i]].type) {
                    results.postViewSettings[postViewSettingsKeys[i]] = results.postViewSettings[postViewSettingsKeys[i]].value;
                }
            }
        } else {
            results.postViewSettings = {};
        }

        // Return all results
        return results;
    }

    /*
     * Save post
     */
    save() {
        let sqlQuery = '';
        this.checkAndPrepareSlug();

        if(this.id === 0) {
            // Add post data
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
            // Update post data
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
        if(this.id === 0) {
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

        // Save tags
        this.saveTags();

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

        // Save post view settings
        this.savePostViewSettings();

        // Remove unused images
        this.checkAndCleanImages();

        // Return new list of the posts
        return {
            postID: this.id,
            posts: this.postsData.load(),
            tags: this.tagsData.load(),
            postsTags: this.postsData.loadTagsXRef(),
            postsAuthors: this.postsData.loadAuthorsXRef(),
            authors: this.authorsData.load()
        };
    }

    /*
     * Delete post
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
     * Duplicate post
     */
    duplicate() {
        // Get the post data
        let postToDuplicate = this.db.prepare(`SELECT * FROM posts WHERE id = @id LIMIT 1`).get({ id: this.id });
        let postTagsToDuplicate = this.db.prepare(`SELECT * FROM posts_tags WHERE post_id = @id`).all({ id: this.id });
        let postImagesToDuplicate = this.db.prepare(`SELECT * FROM posts_images WHERE post_id = @id`).all({ id: this.id });
        let postAdditionalDataToDuplicate = this.db.prepare(`SELECT * FROM posts_additional_data WHERE post_id = @id`).all({ id: this.id });

        // Add duplicate post row
        if(postToDuplicate && postToDuplicate.id) {
            // Change title (suffix with " (copy)")
            let copySuffix = 1;
            let modifiedTitle = postToDuplicate.title;
            let postWithTheSameSlug = false;
            let modifiedSlug = postToDuplicate.slug;
            
            if (modifiedTitle.substr(-7) !== ' (copy)') {
                modifiedTitle += ' (copy)';
            }

            if (modifiedSlug.substr(-2).match(/-\d/)) {
                modifiedSlug = modifiedSlug.substr(0, modifiedSlug.length - 2);
            }

            do {
                copySuffix++;
                postWithTheSameSlug = this.db.prepare(`SELECT id FROM posts WHERE slug = @slug LIMIT 1`).get({ slug: modifiedSlug + '-' + copySuffix });
            } while (postWithTheSameSlug && postWithTheSameSlug.id);

            modifiedSlug = modifiedSlug + '-' + copySuffix;
            let postStatus = postToDuplicate.status;

            if (postStatus.indexOf('draft') === -1) {
                postStatus = postStatus.replace('published', 'draft');

                if (postStatus.indexOf('draft') === -1) {
                    postStatus += ',draft';
                }
            }

            let newCopyPostSqlQuery = this.db.prepare(`INSERT INTO posts VALUES(null, @title, @authors, @slug, @text, @featured_image_id, @created_at, @modified_at, @status, @template)`);
            newCopyPostSqlQuery.run({
                title: modifiedTitle,
                authors: postToDuplicate.authors,
                slug: modifiedSlug,
                text: postToDuplicate.text,
                featured_image_id: postToDuplicate.featured_image_id,
                created_at: Date.now(),
                modified_at: Date.now(),
                status: postStatus,
                template: postToDuplicate.template
            });
        } else {
            return false;
        }

        // Get newly inserted post ID
        let copiedPostId = this.db.prepare('SELECT last_insert_rowid() AS id').get().id;

        // Add tags row
        if(postTagsToDuplicate.length) {
            let tagsCount = postTagsToDuplicate.length;

            for(let i = 0; i < tagsCount; i++) {
                let newCopyPostTagsSqlQuery = this.db.prepare(`INSERT INTO posts_tags VALUES(@tag_id, @copied_post_id)`);
                newCopyPostTagsSqlQuery.run({
                    tag_id: postTagsToDuplicate[i].tag_id,
                    copied_post_id: copiedPostId
                });
            }
        }

        // Add posts_images row
        if(postImagesToDuplicate.length) {
            let imagesCount = postImagesToDuplicate.length;

            for(let i = 0; i < imagesCount; i++) {
                let newCopyPostImagesSqlQuery = this.db.prepare(`INSERT INTO posts_images VALUES(NULL, @copied_post_id, @url, @title, @caption, @additional_data)`);
                newCopyPostImagesSqlQuery.run({
                    copied_post_id: copiedPostId,
                    url: postImagesToDuplicate[i].url,
                    title: postImagesToDuplicate[i].title,
                    caption: postImagesToDuplicate[i].caption,
                    additional_data: postImagesToDuplicate[i].additional_data
                });
            }

            // Get newly inserted post ID
            let copiedFeaturedImageId = this.db.prepare('SELECT last_insert_rowid() AS id').get().id;
            
            this.db.prepare(`UPDATE posts SET featured_image_id = @featuredImageID WHERE id = @postID`).run({
                featuredImageID: copiedFeaturedImageId,
                postID: copiedPostId
            });
        }

        // Add posts_additional_data
        if(postAdditionalDataToDuplicate.length) {
            let additionalDataCount = postAdditionalDataToDuplicate.length;

            for(let i = 0; i < additionalDataCount; i++) {
                let newCopyPostAdditionalDataSqlQuery = this.db.prepare(`INSERT INTO posts_additional_data VALUES(NULL, @copied_post_id, @key, @value)`);
                newCopyPostAdditionalDataSqlQuery.run({
                    copied_post_id: copiedPostId,
                    key: postAdditionalDataToDuplicate[i].key,
                    value: postAdditionalDataToDuplicate[i].value
                });
            }
        }

        // Copy images
        ImageHelper.copyImagesDirectory(this.siteDir, this.id, copiedPostId);

        return true;
    }

    /*
     * Change post status
     */
    changeStatus(status, inverse = false) {
        let selectQuery = this.db.prepare(`SELECT status FROM posts WHERE id = @id`).all({ id: this.id });
        let currentStatus = selectQuery[0].status.split(',');
        let resetTemplateIfNeeded = status === 'is-page' ? ', template = \'*\'' : '';

        if(!inverse) {
            if(currentStatus.indexOf(status) === -1) {
                currentStatus.push(status);
            }
        } else {
            if(currentStatus.indexOf(status) > -1) {
                currentStatus = currentStatus.filter((postStatus) => postStatus !== status);
            }
        }

        if (status === 'is-page') {
            currentStatus = currentStatus.filter(status => ['excluded_homepage', 'featured', 'hidden'].indexOf(status) === -1 && status.trim() !== '');
        } else {
            currentStatus = currentStatus.filter(status => status.trim() !== '');
        }
        
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
     * Save tags
     */
    saveTags() {
        // Remove tags connected previously with an item
        this.db.exec(`DELETE FROM posts_tags WHERE post_id = ${parseInt(this.id, 10)}`);

        // For case when there is no tags - check it
        if (this.tags) {
            // Split tags into an array
            let tagsToSave = JSON.parse(JSON.stringify(this.tags));

            // Remove empty tags
            tagsToSave = tagsToSave.filter(function (item) {
                if (typeof item === 'string') {
                    return item.replace(/\s/g, '') !== '';
                }

                return false;
            });

            for (let tagName of tagsToSave) {
                this.saveTag(tagName);
            }
        }
    }

    /*
     * Save tag
     */
    saveTag(tagName) {
        // Check if the tag exists
        let result = this.db.prepare(`SELECT id FROM tags WHERE name = @name OR slug = @slug`).all({
            name: this.escape(tagName),
            slug: this.escape(slug(tagName))
        });
        let tagID = 0;
        // If not - add the tag
        if(result && result.length) {
            tagID = result[0].id;
        } else {
            let sqlQuery = this.db.prepare(`INSERT INTO tags VALUES(null, @name, @slug, '', '')`);
            sqlQuery.run({
                name: tagName, 
                slug: slug(tagName)
            });
            tagID = this.db.prepare('SELECT last_insert_rowid() AS id').get().id;
        }

        // Save binding between post and tag
        let sqlQuery = this.db.prepare(`INSERT INTO posts_tags VALUES(@tagID, @postID)`);
        sqlQuery.run({
            tagID: tagID, 
            postID: this.id
        });
    }

    /*
     * Check and prepare post slug
     */
    checkAndPrepareSlug(suffix = 0) {
        let postSlug = this.slug;
        let restrictedSlugs = [];

        if(this.application.sites[this.site].advanced.urls.cleanUrls) {
            restrictedSlugs = [
                'assets',
                'media',
                this.application.sites[this.site].advanced.urls.authorsPrefix
            ];

            if(this.application.sites[this.site].advanced.urls.tagsPrefix !== '') {
                restrictedSlugs.push(this.application.sites[this.site].advanced.urls.tagsPrefix);
            }
        }

        if(suffix > 0) {
            postSlug = this.escape(this.slug + '-' + suffix);
        }

        if(restrictedSlugs.indexOf(postSlug) > -1) {
            this.checkAndPrepareSlug(2);
            return;
        }

        let result = this.db.prepare(`SELECT slug FROM posts WHERE slug LIKE @slug AND id != @id`).all({
            slug: postSlug,
            id: this.id
        });

        if(result && result.length) {
            if(suffix === 0) {
                suffix = 2;
            } else {
                suffix++;
            }

            this.checkAndPrepareSlug(suffix);
        } else {
            this.slug = postSlug;
        }
    }

    /*
     * Remove unused images
     */
    checkAndCleanImages(cancelEvent = false) {
        let postDir = this.id;

        if(this.id === 0) {
            postDir = 'temp';
        }

        let imagesDir = path.join(this.siteDir, 'input', 'media', 'posts', (postDir).toString());
        let galleryImagesDir = path.join(imagesDir, 'gallery');
        let postDirectoryExists = true;

        try {
            fs.statSync(imagesDir).isDirectory();
        } catch (err) {
            postDirectoryExists = false;
        }

        if(!postDirectoryExists) {
            return;
        }

        let images = fs.readdirSync(imagesDir);
        let galleryImages = false;

        if(Utils.dirExists(galleryImagesDir)) {
            galleryImages = fs.readdirSync(galleryImagesDir);
        }

        // Get previous text if the post is cancelled and it is a not a new post
        if(cancelEvent && postDir !== 'temp') {
            let textSqlQuery = `
                    SELECT
                        text
                    FROM
                        posts
                    WHERE
                        id = @id
                `;

            let textResult = this.db.prepare(textSqlQuery).get({ id: postDir });

            if(textResult && textResult.text) {
                this.text = textResult.text;
            }
        }

        this.cleanImages(images, imagesDir, cancelEvent);

        if(galleryImages) {
            this.cleanImages(galleryImages, galleryImagesDir, cancelEvent);
        }
    }

    /*
     * Removes images from a given image dir
     */
    cleanImages(images, imagesDir, cancelEvent) {
        let postDir = this.id;
        let featuredImage = path.parse(this.featuredImageFilename).base;

        // If post is cancelled - get the previous featured image
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

            if(featuredImageResult && featuredImageResult.url) {
                featuredImage = featuredImageResult.url;
            }
        }

        if(this.id === 0) {
            postDir = 'temp';
        }

        let imagesInPostViewSettings = [];
        
        if (this.postViewSettings) {
            imagesInPostViewSettings = Object.values(this.postViewSettings).filter(item => item.type === "image").map(item => item.value);
        }
        
        // Iterate through images
        for (let i in images) {
            let imagePath = images[i];
            let fullPath = path.join(imagesDir, imagePath);

            // Skip dirs and symlinks
            if(imagePath === '.' || imagePath === '..' || imagePath === 'responsive' || imagePath === 'gallery') {
                continue;
            }

            // Remove files which does not exist in the post text, as featured image and postViewSettings
            if(
                (cancelEvent && postDir === 'temp') ||
                (
                    this.text.indexOf(imagePath) === -1 && 
                    imagesInPostViewSettings.indexOf(imagePath) === -1 &&
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
        if(currentTheme === 'not selected') {
            return;
        }

        // Load theme config
        let themeConfig = Utils.loadThemeConfig(path.join(this.siteDir, 'input'), currentTheme);

        // check if responsive images config exists
        if(Utils.responsiveImagesConfigExists(themeConfig)) {
            let dimensions = Utils.responsiveImagesDimensions(themeConfig, 'contentImages');
            let featuredDimensions = Utils.responsiveImagesDimensions(themeConfig, 'featuredImages');

            if(featuredDimensions !== false) {
                featuredDimensions.forEach(item => {
                    if (dimensions.indexOf(item) === -1) {
                        dimensions.push(item);
                    }
                });
            }

            let responsiveImagesDir = path.parse(originalPath).dir;
            responsiveImagesDir = path.join(responsiveImagesDir, 'responsive');

            if(typeof dimensions === "boolean") {
                return;
            }

            let forceWebp = !!this.application.sites[this.site]?.advanced?.forceWebp;

            // Remove responsive images of each size
            for(let dimensionName of dimensions) {
                let filename = path.parse(originalPath).name;
                let extension = path.parse(originalPath).ext;

                if (forceWebp && ['.png', '.jpg', '.jpeg'].indexOf(extension.toLowerCase()) > -1) {
                    extension = '.webp'; 
                }

                let responsiveImagePath = path.join(responsiveImagesDir, filename + '-' + dimensionName + extension);

                if(Utils.fileExists(responsiveImagePath)){
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

        if (typeof this.additionalData.mainTag === 'string' && this.additionalData.mainTag !== '') {
            let tagSqlQuery = `
                    SELECT 
                        id 
                    FROM
                        tags
                    WHERE
                        name = @name
                `;

            let tagResult = this.db.prepare(tagSqlQuery).get({ name: this.additionalData.mainTag });

            if (tagResult && tagResult.id) {
                this.additionalData.mainTag = parseInt(tagResult.id, 10);
            }
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
    savePostViewSettings() {
        // Remove old _core additional data
        this.db.exec(`DELETE FROM posts_additional_data WHERE post_id = ${parseInt(this.id, 10)} AND key = 'postViewSettings'`);

        // Convert data to JSON string
        if(typeof this.postViewSettings !== 'object') {
            this.postViewSettings = {};
        }

        let dataToSave = JSON.stringify(this.postViewSettings);

        // Store the data
        let storeSqlQuery = this.db.prepare(`INSERT INTO posts_additional_data VALUES(null, @id, 'postViewSettings', @data)`);
        storeSqlQuery.run({
            id: this.id, 
            data: dataToSave
        });
    }

    /**
     * Clean up post content from wrong code
     */
    cleanUpContent (content) {
        return content.replace(/\<figure\sclass=\"post__image\spost__image\s/gmi, '<figure class="post__image ');
    }
}

module.exports = Post;
