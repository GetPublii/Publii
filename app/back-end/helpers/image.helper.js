/*
 * Image helper for posts
 */

const fs = require('fs-extra');
const path = require('path');
const normalizePath = require('normalize-path');
const Utils = require('./utils.js');
const slug = require('./slug');

class ImageHelper {
    constructor(postInstance) {
        this.application = postInstance.application;
        this.site = postInstance.site;
        this.featuredImage = normalizePath(postInstance.featuredImage);
        this.featuredImageData = postInstance.featuredImageData;
        this.fileName = postInstance.featuredImageFilename;
        this.postID = postInstance.id;
        this.db = postInstance.db;
        this.siteDir = postInstance.siteDir;
    }

    /*
     * Save image
     */
    save() {
        // Detect old image if existed
        let sqlQuery = `SELECT featured_image_id FROM posts WHERE id = ${this.postID}`;
        let featuredImageId = parseInt(this.db.exec(sqlQuery)[0].values[0][0], 10);

        // Check if user removed image or image was empty
        if(this.featuredImage === '' && featuredImageId > 0) {
            this.delete();
            return;
        }

        // Store a new image
        if(this.featuredImage) {
            // If previous image existed
            if(featuredImageId > 0) {
                // Remove them
                this.delete();
            }
            // And then we can store a new one
            this.store();
        }

        this.storeImageAdditionalData();
    }

    /*
     * Delete image
     */
    delete() {
        if(this.postID > 0) {
            let updateSqlQuery = `UPDATE posts SET featured_image_id = 0 WHERE id = ${this.postID}`;
            let updateRefsSqlQuery = `DELETE FROM posts_images WHERE post_id = ${this.postID}`;
            this.db.run(updateSqlQuery);
            this.db.run(updateRefsSqlQuery);
        }
    }

    /*
     * Store image on the app data
     */
    store() {
        let self = this;
        // Check if the image not exist
        let directoryPath = this.getMediaPath();
        let fileNameData = path.parse(this.fileName);
        let finalFileName = slug(fileNameData.name, false, true) + fileNameData.ext;
        let finalFilePath = path.join(directoryPath, finalFileName);

        // Save image data in DB
        let simplifiedFilePath = normalizePath(finalFilePath).replace(this.getMediaPath(), '');
        simplifiedFilePath = simplifiedFilePath.replace('/', '').replace('\\', '');

        let imagesSqlQuery = this.db.prepare(`INSERT INTO posts_images VALUES(null, ?, ?, "", "", ?)`);
        imagesSqlQuery.run([this.postID, simplifiedFilePath, JSON.stringify(this.featuredImageData)]);
        imagesSqlQuery.free();
        let featuredImageId = this.db.exec('SELECT last_insert_rowid()')[0].values[0][0];

        // Update post entry in DB
        let postsSqlQuery = `UPDATE posts SET featured_image_id = ${featuredImageId} WHERE id = ${this.postID}`;
        this.db.run(postsSqlQuery);
    }

    /*
     * Store image additional data
     */
    storeImageAdditionalData() {
        // Update featured image entry in DB
        let imageSqlQuery = this.db.prepare(`UPDATE posts_images SET additional_data = ? WHERE post_id = ?`);

        imageSqlQuery.run([
            JSON.stringify(this.featuredImageData),
            this.postID
        ]);

        imageSqlQuery.free();
    }

    /*
     * Retrieve media path
     */
    getMediaPath() {
        let mediaPath = path.join(this.siteDir, 'input', 'media', 'posts', (this.postID).toString());
        mediaPath = normalizePath(mediaPath);

        return mediaPath;
    }

    /*
     * Delete images connected with a specific post ID
     */
    static deleteImagesDirectory(siteDir, postID) {
        let dirPath = path.join(siteDir, 'input', 'media', 'posts', (postID).toString());
        let responsiveDirPath = path.join(siteDir, 'input', 'media', 'posts', (postID).toString(), 'responsive');
        let galleryDirPath = path.join(siteDir, 'input', 'media', 'posts', (postID).toString(), 'gallery');

        for(let directoryPath of [galleryDirPath, responsiveDirPath, dirPath]) {
            if (Utils.dirExists(directoryPath)) {
                fs.readdirSync(directoryPath).forEach(function (file) {
                    let curPath = path.join(directoryPath, file);

                    if (!fs.lstatSync(curPath).isDirectory()) {
                        fs.unlinkSync(curPath);
                    }
                });

                fs.rmdirSync(directoryPath);
            }
        }
    }

    /*
     * Copy images connected with a specific post ID to other post ID
     */
    static copyImagesDirectory(siteDir, postID, newPostID) {
        let dirPath = path.join(siteDir, 'input', 'media', 'posts', (postID).toString());
        let newDirPath = path.join(siteDir, 'input', 'media', 'posts', (newPostID).toString());

        // Copy files from the old directory to the new directory
        if(Utils.dirExists(dirPath)) {
            fs.copySync(dirPath, newDirPath);
        }
    }
}

module.exports = ImageHelper;
