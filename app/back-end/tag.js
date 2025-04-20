/*
 * Tag instance
 */

const fs = require('fs-extra');
const path = require('path');
const Model = require('./model.js');
const Tags = require('./tags.js');
const slug = require('./helpers/slug');
const ImageHelper = require('./helpers/image.helper.js');
const Themes = require('./themes.js');
const Utils = require('./helpers/utils.js');

class Tag extends Model {
    constructor(appInstance, tagData, storeMode = true) {
        super(appInstance, tagData);
        this.id = parseInt(tagData.id, 10);
        this.tagsData = new Tags(appInstance, tagData);
        this.storeMode = storeMode;

        if (tagData.additionalData) {
            this.additionalData = tagData.additionalData;
        }

        if (tagData.imageConfigFields) {
            this.imageConfigFields = tagData.imageConfigFields;
        }

        if(tagData.name || tagData.name === '') {
            this.name = (tagData.name).toString();
            this.slug = tagData.slug;
            this.description = tagData.description;
            this.additionalData = tagData.additionalData;
            this.prepareTagName();
        }
    }

    /*
     * Save tag
     */
    save() {
        if(this.name === '') {
            return {
                status: false,
                message: 'tag-empty-name'
            };
        }

        if(this.slug === '' || this.createSlug(this.slug) === '') {
            this.slug = this.createSlug(this.name);
        }

        if(!this.isTagNameUnique()) {
            return {
                status: false,
                message: 'tag-duplicate-name'
            };
        }

        if(this.isTagRestrictedSlug()) {
            return {
                status: false,
                message: 'tag-restricted-slug'
            };
        }

        if(!this.isTagSlugUnique()) {
            return {
                status: false,
                message: 'tag-duplicate-slug'
            };
        }

        if(this.id !== 0) {
            this.checkAndCleanImages();
            return this.updateTag();
        }

        this.checkAndCleanImages();
        return this.addTag();
    }

    /*
     * Add new tag
     */
    addTag() {
        let sqlQuery = this.db.prepare(`INSERT INTO tags VALUES(null, @name, @slug, @desc, @data)`);
        sqlQuery.run({
            name: this.name,
            slug: this.createSlug(this.slug),
            desc: this.description,
            data: JSON.stringify(this.additionalData)
        });

        // Get the newly added item ID if necessary
        if (this.id === 0) {
            this.id = this.db.prepare('SELECT last_insert_rowid() AS id').get().id;

            // Move images from the temp directory
            let tempDirectoryExists = true;
            let tempImagesDir = path.join(this.siteDir, 'input', 'media', 'tags', 'temp');
           
            try {
                fs.statSync(tempImagesDir).isDirectory();
            } catch (err) {
                tempDirectoryExists = false;
            }

            if (tempDirectoryExists) {
                let finalImagesDir = path.join(this.siteDir, 'input', 'media', 'tags', (this.id).toString());
                fs.copySync(tempImagesDir, finalImagesDir);
                fs.removeSync(tempImagesDir);
            }
        }

        return {
            status: true,
            message: 'tag-added',
            tagID: this.id,
            tags: this.tagsData.load()
        };
    }

    /*
     * Update existing tag
     */
    updateTag() {
        let sqlQuery = this.db.prepare(`UPDATE tags
                        SET
                            name = @name,
                            slug = @slug,
                            description = @desc,
                            additional_data = @data
                        WHERE
                            id = @id`);
        sqlQuery.run({
            name: this.name,
            slug: this.createSlug(this.slug),
            desc: this.description,
            data: JSON.stringify(this.additionalData),
            id: this.id
        });

        return {
            status: true,
            message: 'tag-updated',
            tags: this.tagsData.load()
        };
    }

    /*
     * Prepare tag name to save
     */
    prepareTagName() {
        if(typeof this.name == 'undefined') {
            this.name = '';
        }
        // Remove leading and ending spaces (trim it)
        // it will also exclude case when tag name contains only
        // whitespaces
        this.name = this.name.replace(/^\s+/, '').replace(/\s+$/, '');
    }

    /*
     * Check if the tag name is unique
     */
    isTagNameUnique() {
        let query = this.db.prepare('SELECT * FROM tags WHERE name LIKE @name AND id != @id');
        let queryParams = {
            name: this.escape(this.name),
            id: this.id
        };
        let foundedTags = query.all(queryParams);

        if (foundedTags.length) {
            for (const tag of foundedTags) {
                if (tag.name === this.name) {
                    return false;
                }
            }
        }

        return true;
    }

    isTagSlugUnique() {
        let query = this.db.prepare('SELECT slug FROM tags WHERE id != @id');
        let queryParams = {
            id: this.id
        };
        let foundedSlugs = query.all(queryParams);

        if (foundedSlugs.length) {
            for (const tag of foundedSlugs) {
                if (this.slug === tag.slug) {
                    return false;
                }
            }
        }

        return true;
    }

    /*
     * Check if the tag slug is not restricted
     */
    isTagRestrictedSlug() {
        let slug = this.createSlug(this.slug);

        if(this.application.sites[this.site].advanced.urls.tagsPrefix !== '') {
            return false;
        }

        let restrictedSlugs = [
            'assets',
            this.application.sites[this.site].advanced.urls.authorsPrefix,
            'media',
            this.application.sites[this.site].advanced.urls.pageName
        ];

        return restrictedSlugs.indexOf(slug) > -1;
    }

    /*
     * Delete tag
     */
    delete() {
        this.db.exec(`DELETE FROM tags WHERE id = ${parseInt(this.id, 10)}`);
        this.db.exec(`DELETE FROM posts_tags WHERE tag_id = ${parseInt(this.id, 10)}`);
        ImageHelper.deleteImagesDirectory(this.siteDir, 'tags', this.id);
        
        return {
            status: true,
            message: 'tag-deleted'
        };
    }

    /*
     * Create slug for given string
     */
    createSlug(string) {
        return slug(string);
    }

    /*
     * Remove unused images
     */
    checkAndCleanImages (cancelEvent = false) {
        let tagDir = this.id;

        if(this.id === 0) {
            tagDir = 'temp';
        }

        let imagesDir = path.join(this.siteDir, 'input', 'media', 'tags', (tagDir).toString());
        let tagDirectoryExists = true;

        try {
            fs.statSync(imagesDir).isDirectory();
        } catch (err) {
            tagDirectoryExists = false;
        }

        if(!tagDirectoryExists) {
            return;
        }

        let images = fs.readdirSync(imagesDir);
        this.cleanImages(images, imagesDir, cancelEvent);
    }

    /*
     * Removes images from a given image dir
     */
    cleanImages(images, imagesDir, cancelEvent) {
        let tagDir = this.id;
        let featuredImage = '';
        let viewConfig = {};
        
        if (this.additionalData && this.additionalData.featuredImage) {
            featuredImage = path.parse(this.additionalData.featuredImage).base;
        }

        if (this.additionalData && this.additionalData.viewConfig) {
            viewConfig = this.additionalData.viewConfig;
        }

        // If tag is cancelled - get the previous featured image and option images data
        if (cancelEvent && this.id !== 0) {
            let additionalDataQuery = `SELECT additional_data FROM tags WHERE id = @id`;
            let additionalDataResult = this.db.prepare(additionalDataQuery).all({ id: this.id });

            if (additionalDataResult) {
                try {
                    featuredImage = JSON.parse(additionalDataResult[0].additional_data).featuredImage;
                    viewConfig = JSON.parse(additionalDataResult[0].additional_data).viewConfig;
                } catch (e) {
                    console.log('(!) An issue occurred during parsing tag additional data', this.id);
                }
            }
        }

        if (this.id === 0) {
            tagDir = 'temp';
        }

        let imagesInViewSettings = [];
        
        imagesInViewSettings = Object.keys(viewConfig).filter((fieldName) => {
            return this.imageConfigFields.indexOf(fieldName) !== -1 && viewConfig[fieldName] !== '';
        }).map((fieldName) => {
            return viewConfig[fieldName];
        });

        // Iterate through images
        for (let i in images) {
            let imagePath = images[i];
            let fullPath = path.join(imagesDir, imagePath);

            // Skip dirs and symlinks
            if (imagePath === '.' || imagePath === '..' || imagePath === 'responsive') {
                continue;
            }

            // Remove files which does not exist as featured image and tagViewSettings
            if (
                (cancelEvent && tagDir === 'temp') ||
                (
                    imagesInViewSettings.indexOf(imagePath) === -1 &&
                    featuredImage !== imagePath
                )
            ) {
                try {
                    fs.unlinkSync(fullPath);
                } catch(e) {
                    console.error(e);
                }

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
        if(Utils.responsiveImagesConfigExists(themeConfig)) {
            let dimensions = Utils.responsiveImagesDimensions(themeConfig, 'contentImages');
            let featuredDimensions = Utils.responsiveImagesDimensions(themeConfig, 'tagImages');

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
     * Change tag visibility status
     */
    changeStatus(status, inverse = false) {
        let selectQuery = this.db.prepare(`SELECT additional_data FROM tags WHERE id = @id`).all({ id: this.id });
        let additionalData = selectQuery[0].additional_data;

        try {
            additionalData = JSON.parse(additionalData);

            if (inverse) {
                additionalData.isHidden = false;
            } else {
                additionalData.isHidden = true;
            }
        } catch (e) {
            return false;
        }

        let updateQuery = this.db.prepare(`UPDATE
                                        tags
                                    SET
                                        additional_data = @updatedData
                                    WHERE
                                        id = @id`);
        updateQuery.run({
            updatedData: JSON.stringify(additionalData),
            id: this.id
        });

        return true;
    }
}

module.exports = Tag;
