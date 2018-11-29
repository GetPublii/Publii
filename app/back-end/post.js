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
        let postsSqlQuery = `SELECT * FROM posts WHERE id = ${this.id}`;
        let postsResult = this.db.exec(postsSqlQuery);
        results.posts = [];

        if(postsResult[0] && postsResult[0].values) {
            results.posts = postsResult[0].values[0];
        }

        // Get author data
        let authorSqlQuery = `
            SELECT
                a.id,
                a.name
            FROM
                authors AS a
            LEFT JOIN
                posts AS p
                ON
                p.authors = a.id
            WHERE
                p.id = ${this.id}
        `;

        let authorResult = this.db.exec(authorSqlQuery);

        if(authorResult[0] && authorResult[0].values) {
            results.author = {
                id: authorResult[0].values[0][0],
                name: authorResult[0].values[0][1]
            };
        }

        // Get tags data
        let tagsSqlQuery = `
            SELECT
                t.id,
                t.name
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
                p.id = ${this.id}
            ORDER BY
                t.name ASC;
        `;
        let tagsResult = this.db.exec(tagsSqlQuery);
        results.tags = tagsResult;
        // Get image data
        let imageSqlQuery = `
            SELECT
                pi.url,
                pi.additional_data
            FROM
                posts AS p
            LEFT JOIN
                posts_images AS pi
                ON
                    p.featured_image_id = pi.id
            WHERE
                p.id = ${this.id};
        `;
        let imageResult = this.db.exec(imageSqlQuery);
        results.featuredImage = imageResult;
        // Get the additional data
        let additionalDataSqlQuery = `
            SELECT
                *
            FROM
                posts_additional_data
            WHERE
                post_id = ${this.id}
                AND
                key = "_core"
        `;
        let additionalDataResult = this.db.exec(additionalDataSqlQuery);

        if(additionalDataResult[0] && additionalDataResult[0].values[0]) {
            results.additionalData = JSON.parse(additionalDataResult[0].values[0][3]);
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
                post_id = ${this.id}
                AND
                key = "postViewSettings"
        `;
        let postViewResult = this.db.exec(postViewSqlQuery);

        if(postViewResult[0] && postViewResult[0].values[0]) {
            results.postViewSettings = JSON.parse(postViewResult[0].values[0][3]);
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
            sqlQuery = this.db.prepare(`INSERT INTO posts VALUES(null, ?, ?, ?, ?, 0, ?, ?, ?, ?)`);
            sqlQuery.run([
                this.title,
                this.author,
                this.slug,
                this.text,
                this.creationDate,
                this.modificationDate,
                this.status,
                this.template
            ]);
            sqlQuery.free();
        } else {
            // Update post data
            sqlQuery = this.db.prepare(`UPDATE posts
                        SET
                            title = ?,
                            authors = ?,
                            slug = ?,
                            text = ?,
                            status = ?,
                            created_at = ?,
                            modified_at = ?,
                            template = ?
                        WHERE
                            id = ?`);
            sqlQuery.run([
                this.title,
                this.author,
                this.slug,
                this.text,
                this.status,
                this.creationDate,
                this.modificationDate,
                this.template,
                this.id
            ]);
            sqlQuery.free();
        }

        // Get the newly added item ID if necessary
        if(this.id === 0) {
            this.id = this.db.exec('SELECT last_insert_rowid()')[0].values[0][0];

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

                this.text = this.text.split(normalizePath(tempImagesDir)).join('#DOMAIN_NAME#');
                sqlQuery = this.db.prepare(`UPDATE posts
                        SET
                            text = ?
                        WHERE
                            id = ?`);
                sqlQuery.run([
                    this.text,
                    this.id
                ]);
                sqlQuery.free();
            }
        }

        // Save tags
        this.saveTags();

        // Save images
        if(this.featuredImage) {
            let image = new ImageHelper(this);
            image.save();

            if(this.storeMode) {
                this.storeDB();
            }
        } else if(this.id > 0) {
            let image = new ImageHelper(this);
            image.delete();

            if(this.storeMode) {
                this.storeDB();
            }
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
        let postSqlQuery = `DELETE FROM posts WHERE id=${this.id}`;
        let tagsSqlQuery = `DELETE FROM posts_tags WHERE post_id=${this.id}`;
        let imagesSqlQuery = `DELETE FROM posts_images WHERE post_id=${this.id}`;
        let additionalDataSqlQuery = `DELETE FROM posts_additional_data WHERE post_id=${this.id}`;
        this.db.run(postSqlQuery);
        this.db.run(tagsSqlQuery);
        this.db.run(imagesSqlQuery);
        this.db.run(additionalDataSqlQuery);
        ImageHelper.deleteImagesDirectory(this.siteDir, this.id);

        if(this.storeMode) {
            this.storeDB();
        }

        return true;
    }

    /*
     * Duplicate post
     */
    duplicate() {
        // Get the post data
        let postToDuplicate = this.db.exec(`SELECT * FROM posts WHERE id = ${this.id} LIMIT 1`);
        let postTagsToDuplicate = this.db.exec(`SELECT * FROM posts_tags WHERE post_id = ${this.id}`);
        let postImagesToDuplicate = this.db.exec(`SELECT * FROM posts_images WHERE post_id = ${this.id}`);
        let postAdditionalDataToDuplicate = this.db.exec(`SELECT * FROM posts_additional_data WHERE post_id = ${this.id}`);

        // Add duplicate post row
        if(postToDuplicate[0] && postToDuplicate[0].values[0]) {
            postToDuplicate = postToDuplicate[0].values[0];
            // Change title (suffix with " Copy")
            let modifiedTitle = postToDuplicate[1] + " Copy";
            let modifiedSlug = postToDuplicate[3] + '-copy';

            let newCopyPostSqlQuery = this.db.prepare(`INSERT INTO posts VALUES(null, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
            newCopyPostSqlQuery.run([
                modifiedTitle,
                postToDuplicate[2],
                modifiedSlug,
                postToDuplicate[4],
                postToDuplicate[5],
                Date.now(),
                Date.now(),
                postToDuplicate[8],
                postToDuplicate[9]
            ]);
            newCopyPostSqlQuery.free();
        } else {
            return false;
        }

        // Get newly inserted post ID
        let copiedPostId = this.db.exec('SELECT last_insert_rowid()')[0].values[0][0];

        // Add tags row
        if(postTagsToDuplicate[0] && postTagsToDuplicate[0].values[0]) {
            let tagsCount = postTagsToDuplicate[0].values.length;

            for(let i = 0; i < tagsCount; i++) {
                let newCopyPostTagsSqlQuery = this.db.prepare(`INSERT INTO posts_tags VALUES(?, ?)`);
                newCopyPostTagsSqlQuery .run([
                    postTagsToDuplicate[0].values[i][0],
                    copiedPostId
                ]);
                newCopyPostTagsSqlQuery.free();
            }
        }

        // Add posts_images row
        if(postImagesToDuplicate[0] && postImagesToDuplicate[0].values[0]) {
            let imagesCount = postImagesToDuplicate[0].values.length;

            for(let i = 0; i < imagesCount; i++) {
                let newCopyPostImagesSqlQuery = this.db.prepare(`INSERT INTO posts_images VALUES(NULL, ?, ?, ?, ?, ?)`);
                newCopyPostImagesSqlQuery.run([
                    copiedPostId,
                    postImagesToDuplicate[0].values[i][2],
                    postImagesToDuplicate[0].values[i][3],
                    postImagesToDuplicate[0].values[i][4],
                    postImagesToDuplicate[0].values[i][5]
                ]);
                newCopyPostImagesSqlQuery.free();
            }
        }

        // Add posts_additional_data
        if(postAdditionalDataToDuplicate[0] && postAdditionalDataToDuplicate[0].values[0]) {
            let additionalDataCount = postAdditionalDataToDuplicate[0].values.length;

            for(let i = 0; i < additionalDataCount; i++) {
                let newCopyPostAdditionalDataSqlQuery = this.db.prepare(`INSERT INTO posts_additional_data VALUES(NULL, ?, ?, ?)`);
                newCopyPostAdditionalDataSqlQuery.run([
                    copiedPostId,
                    postAdditionalDataToDuplicate[0].values[i][2],
                    postAdditionalDataToDuplicate[0].values[i][3],
                ]);
                newCopyPostAdditionalDataSqlQuery.free();
            }
        }

        // Save changes in the database
        if(this.storeMode) {
            this.storeDB();
        }

        // Copy images
        ImageHelper.copyImagesDirectory(this.siteDir, this.id, copiedPostId);

        return true;
    }

    /*
     * Change post status
     */
    changeStatus(status, inverse = false) {
        let selectQuery = this.db.exec(`SELECT status FROM posts WHERE id = ${this.id}`);
        let currentStatus = selectQuery[0].values[0][0].split(',');

        if(!inverse) {
            if(currentStatus.indexOf(status) === -1) {
                currentStatus.push(status);
            }
        } else {
            if(currentStatus.indexOf(status) > -1) {
                currentStatus = currentStatus.filter((postStatus) => postStatus !== status);
            }
        }

        currentStatus = currentStatus.filter(status => status.trim() !== '');

        let updateQuery = this.db.prepare(`UPDATE
                                        posts
                                    SET
                                        status = ?
                                    WHERE
                                        id = ?`);
        updateQuery.run([
            currentStatus.join(','),
            this.id
        ]);

        if(this.storeMode) {
            this.storeDB();
        }

        updateQuery.free();

        return true;
    }

    /*
     * Save tags
     */
    saveTags() {
        // Remove tags connected previously with an item
        let sqlQuery = `DELETE FROM posts_tags WHERE post_id = ${this.id}`;
        this.db.run(sqlQuery);

        // For case when there is no tags - check it
        if(this.tags) {
            // Split tags into an array
            let tagsToSave = this.tags.split(',');

            // Remove empty tags
            tagsToSave = tagsToSave.filter(function (item) {
                return item.replace(/\s/g, '') !== '';
            });

            for (let tagName of tagsToSave) {
                this.saveTag(tagName);
            }

            // Save the changes
            if(this.storeMode) {
                this.storeDB();
            }
        }
    }

    /*
     * Save tag
     */
    saveTag(tagName) {
        // Check if the tag exists
        let sqlQuery = `SELECT id FROM tags WHERE name = "${this.escape(tagName)}" OR slug = "${this.escape(slug(tagName))}"`;
        let result = this.db.exec(sqlQuery);
        let tagID = 0;
        // If not - add the tag
        if(!result[0] || result[0].values.length === 0) {
            let sqlQuery = this.db.prepare(`INSERT INTO tags VALUES(null, ?, ?, "", "")`);
            sqlQuery.run([tagName, slug(tagName)]);
            tagID = this.db.exec('SELECT last_insert_rowid()')[0].values[0][0];
        } else {
            tagID = result[0].values[0][0];
        }

        // Save binding between post and tag
        sqlQuery = this.db.prepare(`INSERT INTO posts_tags VALUES(?, ?)`);
        sqlQuery.run([tagID, this.id]);
        sqlQuery.free();
    }

    /*
     * Check and prepare post slug
     */
    checkAndPrepareSlug(suffix = 0) {
        let postSlug = this.slug;
        let restrictedSlugs = [];

        if(this.application.sites[this.site].advanced.urls.cleanUrls) {
            restrictedSlugs = [
                'amp',
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

        let result = this.db.exec(`SELECT slug FROM posts WHERE slug LIKE "${postSlug}" AND id != ${this.id}`);

        if(result[0] && result[0].values) {
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
                        id = ${postDir}
                `;

            let textResult = this.db.exec(textSqlQuery);

            if(textResult[0] && textResult[0].values) {
                this.text = textResult[0].values[0][0];
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
                        post_id = ${this.id}
                `;

            let featuredImageResult = this.db.exec(featuredImageSqlQuery);

            if(featuredImageResult[0] && featuredImageResult[0].values) {
                featuredImage = featuredImageResult[0].values[0][0];
            }
        }

        if(this.id === 0) {
            postDir = 'temp';
        }

        // Iterate through images
        for (let i in images) {
            let imagePath = images[i];
            let fullPath = path.join(imagesDir, imagePath);

            // Skip dirs and symlinks
            if(imagePath === '.' || imagePath === '..' || imagePath === 'responsive' || imagePath === 'gallery') {
                continue;
            }

            // Remove files which does not exist in the post text
            if(
                (cancelEvent && postDir === 'temp') ||
                (this.text.indexOf(imagePath) === -1 && featuredImage !== imagePath)
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

            // Remove responsive images of each size
            for(let dimensionName of dimensions) {
                let filename = path.parse(originalPath).name;
                let extension = path.parse(originalPath).ext;
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
        let sqlQuery = `DELETE FROM posts_additional_data WHERE post_id = ${this.id} AND key = "_core"`;
        this.db.run(sqlQuery);

        // Convert data to JSON string
        if(typeof this.additionalData !== 'object') {
            this.additionalData = {};
        }

        let additionalDataToSave = JSON.stringify(this.additionalData);

        // Store the data
        let storeSqlQuery = this.db.prepare(`INSERT INTO posts_additional_data VALUES(null, ?, "_core", ?)`);
        storeSqlQuery.run([this.id, additionalDataToSave]);
        storeSqlQuery.free();

        // Save the changes
        if(this.storeMode) {
            this.storeDB();
        }
    }

    /*
     * Save additional data
     */
    savePostViewSettings() {
        // Remove old _core additional data
        let sqlQuery = `DELETE FROM posts_additional_data WHERE post_id = ${this.id} AND key = "postViewSettings"`;
        this.db.run(sqlQuery);

        // Convert data to JSON string
        if(typeof this.postViewSettings !== 'object') {
            this.postViewSettings = {};
        }

        let dataToSave = JSON.stringify(this.postViewSettings);

        // Store the data
        let storeSqlQuery = this.db.prepare(`INSERT INTO posts_additional_data VALUES(null, ?, "postViewSettings", ?)`);
        storeSqlQuery.run([this.id, dataToSave]);
        storeSqlQuery.free();

        // Save the changes
        if(this.storeMode) {
            this.storeDB();
        }
    }
}

module.exports = Post;
