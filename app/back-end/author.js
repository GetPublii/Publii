const fs = require('fs-extra');
const path = require('path');
const Model = require('./model.js');
const Authors = require('./authors.js');
const Pages = require('./pages.js');
const Posts = require('./posts.js');
const slug = require('./helpers/slug');
const ImageHelper = require('./helpers/image.helper.js');
const Themes = require('./themes.js');
const Utils = require('./helpers/utils.js');

/**
 * Author Model - used for operations connected with author management
 */
class Author extends Model {
    /**
     * Creates an instance of the model
     *
     * @param appInstance {object} - instance of the application
     * @param authorData {object} - object with author data
     */
    constructor(appInstance, authorData, storeMode = true) {
        super(appInstance, authorData);
        this.id = parseInt(authorData.id, 10);
        this.authorsData = new Authors(appInstance, authorData);
        this.postsData = new Posts(appInstance, authorData);
        this.pagesData = new Pages(appInstance, authorData);
        this.storeMode = storeMode;

        if (authorData.additionalData) {
            this.additionalData = authorData.additionalData;
        }

        if (authorData.imageConfigFields) {
            this.imageConfigFields = authorData.imageConfigFields;
        }

        if(authorData.name || authorData.name === '') {
            this.name = authorData.name;
            this.username = authorData.username;
            this.config = authorData.config;
            this.additionalData = authorData.additionalData;
            this.prepareAuthorName();
        }

        if (typeof this.additionalData === 'string') {
            try {
                this.additionalData = JSON.parse(this.additionalData);
            } catch (e) {
                console.log('(!) An issue occurred during initial parsing author additional data', this.id);
            }
        }
    }

    /**
     * Saves new/existing author data
     *
     * @returns {object} - object with created/edited author data
     */
    save () {
        if (this.name === '') {
            return {
                status: false,
                message: 'author-empty-name'
            };
        }

        if (this.username === '' || slug(this.username) === '') {
            this.username = slug(this.name);
        }

        if (slug(this.username).trim() === '') {
            return {
                status: false,
                message: 'author-empty-username'
            };
        }

        if (!this.isAuthorNameUnique()) {
            return {
                status: false,
                message: 'author-duplicate-name',
                authors: this.authorsData.load()
            };
        }

        if (!this.isAuthorUsernameUnique()) {
            return {
                status: false,
                message: 'author-duplicate-username',
                authors: this.authorsData.load()
            };
        }

        if (this.id !== 0) {
            this.checkAndCleanImages();
            return this.updateAuthor();
        }

        this.checkAndCleanImages();
        return this.addAuthor();
    }

    /**
     * Stores new author in the DB
     *
     * @returns {{status: boolean, message: string, authors: *}}
     */
    addAuthor() {
        let sqlQuery = this.db.prepare(`INSERT INTO authors VALUES(null, @name, @slug, '', @config, @additionalData)`);
        sqlQuery.run({
            name: this.name,
            slug: slug(this.username),
            config: this.config,
            additionalData: JSON.stringify(this.additionalData)
        });

        // Get the newly added item ID if necessary
        if (this.id === 0) {
            this.id = this.db.prepare('SELECT last_insert_rowid() AS id').get().id;

            // Move images from the temp directory
            let tempDirectoryExists = true;
            let tempImagesDir = path.join(this.siteDir, 'input', 'media', 'authors', 'temp');

            try {
                fs.statSync(tempImagesDir).isDirectory();
            } catch (err) {
                tempDirectoryExists = false;
            }

            if (tempDirectoryExists) {
                let finalImagesDir = path.join(this.siteDir, 'input', 'media', 'authors', (this.id).toString());
                fs.copySync(tempImagesDir, finalImagesDir);
                fs.removeSync(tempImagesDir);
            }
        }

        return {
            status: true,
            message: 'author-added',
            authorID: this.id,
            postsAuthors: this.postsData.loadAuthorsXRef(),
            pagesAuthors: this.pagesData.loadAuthorsXRef(),
            authors: this.authorsData.load()
        };
    }

    /**
     * Updates existing author in the DB
     *
     * @returns {{status: boolean, message: string}}
     */
    updateAuthor() {
        let sqlQuery = this.db.prepare(`UPDATE authors
                        SET
                            name = @name,
                            username = @slug,
                            password = '',
                            config = @config,
                            additional_data = @additionalData
                        WHERE
                            id = @id`);
        sqlQuery.run({
            name: this.name,
            slug: slug(this.username),
            config: this.config,
            additionalData: JSON.stringify(this.additionalData),
            id: this.id
        });

        return {
            status: true,
            message: 'author-updated',
            postsAuthors: this.postsData.loadAuthorsXRef(),
            authors: this.authorsData.load()
        };
    }

    /**
     * Creates author name without leading/ending spaces
     */
    prepareAuthorName() {
        if(typeof this.name == 'undefined') {
            this.name = '';
        }
        // Remove leading and ending spaces (trim it)
        // it will also exclude case when author name contains only
        // whitespaces
        this.name = this.name.replace(/^\s+/, '').replace(/\s+$/, '');
    }

    /**
     * Check if the author name is unique
     *
     * @returns {boolean}
     */
    isAuthorNameUnique() {
        let query = this.db.prepare('SELECT * FROM authors WHERE name LIKE @name AND id != @id');
        let queryParams = {
            name: this.escape(this.name),
            id: this.id
        };
        let foundedAuthors = query.all(queryParams);

        if (foundedAuthors.length) {
            for (const author of foundedAuthors) {
                if (author.name === this.name) {
                    return false;
                }
            }
        }

        return true;
    }

    /**
     * Checks if author username (slug) is unique
     *
     * @returns {boolean}
     */
    isAuthorUsernameUnique() {
        let query = this.db.prepare('SELECT username FROM authors WHERE id != @id');
        let queryParams = {
            id: this.id
        };
        let foundedAuthors = query.all(queryParams);

        if (foundedAuthors.length) {
            for (const author of foundedAuthors) {
                if (slug(this.username) === slug(author.username)) {
                    return false;
                }
            }
        }

        return true;
    }

    /**
     * Removes current author
     *
     * @returns {{status: boolean, message: string}}
     */
    delete() {
        if(this.id === 1) {
            return {
                status: false,
                message: 'cannot-delete-main-author'
            };
        }

        this.db.exec(`DELETE FROM authors WHERE id = ${parseInt(this.id, 10)}`);
        this.db.prepare(`UPDATE posts SET authors = '1' WHERE authors LIKE @id`).run({ id: this.id.toString() });
        ImageHelper.deleteImagesDirectory(this.siteDir, 'authors', this.id);

        return {
            status: true,
            message: 'author-deleted',
            posts: this.postsData.load(),
            postsAuthors: this.postsData.loadAuthorsXRef(),
            authors: this.authorsData.load()
        };
    }

    /*
     * Remove unused images
     */
    checkAndCleanImages (cancelEvent = false) {
        let authorDir = this.id;

        if(this.id === 0) {
            authorDir = 'temp';
        }

        let imagesDir = path.join(this.siteDir, 'input', 'media', 'authors', (authorDir).toString());
        let authorDirectoryExists = true;

        try {
            fs.statSync(imagesDir).isDirectory();
        } catch (err) {
            authorDirectoryExists = false;
        }

        if(!authorDirectoryExists) {
            return;
        }

        let images = fs.readdirSync(imagesDir);
        this.cleanImages(images, imagesDir, cancelEvent);
    }

    /*
     * Removes images from a given image dir
     */
    cleanImages(images, imagesDir, cancelEvent) {
        let authorDir = this.id;
        let featuredImage = '';
        let viewConfig = {};
        
        if (this.additionalData && this.additionalData.featuredImage) {
            featuredImage = path.parse(this.additionalData.featuredImage).base;
        }

        if (this.additionalData && this.additionalData.viewConfig) {
            viewConfig = this.additionalData.viewConfig;
        }

        // If author is cancelled - get the previous featured image
        if (cancelEvent && this.id !== 0) {
            let additionalDataQuery = `SELECT additional_data FROM authors WHERE id = @id`;
            let additionalDataResult = this.db.prepare(additionalDataQuery).all({ id: this.id });

            if (additionalDataResult) {
                try {
                    featuredImage = JSON.parse(additionalDataResult[0].additional_data).featuredImage;
                    viewConfig = JSON.parse(additionalDataResult[0].additional_data).viewConfig;
                } catch (e) {
                    console.log('(!) An issue occurred during parsing author additional data', this.id);
                }
            }
        }

        if (this.id === 0) {
            authorDir = 'temp';
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

            // Remove files which does not exist as featured image and authorViewSettings
            if (
                (cancelEvent && authorDir === 'temp') ||
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

        // Clean unused avatar images
        let themesHelper = new Themes(this.application, { site: this.site });
        let themeConfigPath = path.join(this.application.sitesDir, this.site, 'input', 'config', 'theme.config.json');

        if (fs.existsSync(themeConfigPath)) {
            let themeConfigString = fs.readFileSync(themeConfigPath, 'utf8');
            themesHelper.checkAndCleanImages(themeConfigString);
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
            let featuredDimensions = Utils.responsiveImagesDimensions(themeConfig, 'authorImages');

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
}

module.exports = Author;
