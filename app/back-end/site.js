/*
 * Site instance
 */

const fs = require('fs-extra');
const path = require('path');
const sql = require('./vendor/sql.js');
const Themes = require('./themes.js');
const Image = require('./image.js');
const UtilsHelper = require('./helpers/utils');
const childProcess = require('child_process');
const slug = require('./helpers/slug');

class Site {
    constructor(appInstance, config, maintenanceMode = false) {
        this.application = appInstance;
        this.name = config.name;
        this.displayName = config.displayName;
        // In maintenance mode we need only the website name
        if (!maintenanceMode) {
            this.logo = {};
            this.logo.icon = config.logo.icon || 'fa fa-book';
            this.logo.color = config.logo.color || 1;
        }
        this.appDir = this.application.appDir;
        this.siteDir = path.join(this.application.sitesDir, this.name);
    }

    /*
     * Check if the specific site exists
     */
    siteExists() {
        return fs.existsSync(this.siteDir);
    }

    /*
     * Create a new site
     */
    create(authorName) {
        if(!this.siteExists()) {
            this.createDirectories();
            this.createConfigFiles();
            this.createDB();
            this.createAuthor(authorName);
            return true;
        }
        // If site exists
        console.log('Site called: ' + this.name + ' exists!');
        return false;
    }

    /*
     * Create directories
     */
    createDirectories() {
        // Create main dir
        fs.mkdirSync(this.siteDir);
        // Create also other dirs
        fs.mkdirSync(path.join(this.siteDir, 'input'));
        fs.mkdirSync(path.join(this.siteDir, 'input', 'config'));
        fs.mkdirSync(path.join(this.siteDir, 'input', 'root-files'));
        fs.mkdirSync(path.join(this.siteDir, 'input', 'media'));
        fs.mkdirSync(path.join(this.siteDir, 'input', 'media', 'temp'));
        fs.mkdirSync(path.join(this.siteDir, 'input', 'media', 'website'));
        fs.mkdirSync(path.join(this.siteDir, 'input', 'media', 'posts'));
        fs.mkdirSync(path.join(this.siteDir, 'input', 'media', 'files'));
        fs.mkdirSync(path.join(this.siteDir, 'input', 'themes'));
        fs.mkdirSync(path.join(this.siteDir, 'input', 'languages'));
        fs.mkdirSync(path.join(this.siteDir, 'output'));
        fs.mkdirSync(path.join(this.siteDir, 'preview'));
    }

    /*
     * Create config file
     */
    createConfigFiles() {
        let configDir = path.join(this.siteDir, 'input', 'config');
        let siteConfig = {
            'name': this.name,
            'displayName': this.displayName,
            'author': this.author,
            'logo': this.logo
        };

        fs.writeFileSync(path.join(configDir, 'site.config.json'), JSON.stringify(siteConfig));
        fs.writeFileSync(path.join(configDir, 'menu.config.json'), '[]');
        fs.writeFileSync(path.join(configDir, 'theme.config.json'), '{}');
    }

    /*
     * Create database
     */
    createDB() {
        let db = new sql.Database();
        let sqlQueries = fs.readFileSync(this.application.basedir + '/back-end/sql/1.0.0.sql', 'utf8');
        db.run(sqlQueries);
        this.storeDB(db);
    }

    /*
     * Create author
     */
    createAuthor(authorName) {
        let dbPath = path.join(this.siteDir, 'input', 'db.sqlite');
        let input = fs.readFileSync(dbPath);
        let db = new sql.Database(input);
        let sqlQuery = db.prepare(`INSERT INTO authors VALUES(1, ?, ?, '', '{}', '{}')`);
        sqlQuery.run([authorName, slug(authorName).toLowerCase()]);
        this.storeDB(db);
        sqlQuery.free();
    }

    /*
     * Regenerate thumbnails
     */
    regenerateThumbnails(sender) {
        // Get theme configuration
        let self = this;
        let themesHelper = new Themes(this.application, { site: this.name });
        let themeName = themesHelper.currentTheme();
        let dbPath = path.join(this.siteDir, 'input', 'db.sqlite');
        let input = fs.readFileSync(dbPath);
        let db = new sql.Database(input);

        // If there is no theme selected - abort
        if(themeName === 'not selected') {
            sender.send('app-site-regenerate-thumbnails-error', {
                message: "No theme selected"
            });

            return;
        }

        // If there is no responsive images configuration - abort
        let themeConfig = UtilsHelper.loadThemeConfig(path.join(this.siteDir, 'input'), themeName);

        if(!UtilsHelper.responsiveImagesConfigExists(themeConfig)) {
            sender.send('app-site-regenerate-thumbnails-error', {
                message: "There is no configuration for responsive images"
            });

            return;
        }

        // Remove all old responsive directories
        let mediaPath = path.join(this.siteDir, 'input', 'media');
        let catalogs = fs.readdirSync(path.join(mediaPath, 'posts'));
        let galleryCatalogs = [];
        catalogs = catalogs.map(catalog => 'posts/' + catalog);
        catalogs.push('website');
        catalogs = catalogs.filter((catalog) => !(catalog.indexOf('/.') > -1 || catalog.trim() === '' || !catalog || UtilsHelper.fileExists(path.join(mediaPath, catalog))));

        for(let catalog of catalogs) {
            if(catalog.indexOf('/.') > -1) {
                continue;
            }

            let fullPath = path.join(mediaPath, catalog, 'responsive');

            // remove the files form dir or create dir if not exists
            fs.emptyDirSync(fullPath);

            // Add gallery catalogs
            let galleryFullPath = path.join(mediaPath, catalog, 'gallery');

            if(UtilsHelper.dirExists(galleryFullPath)) {
                let galleryShortPath = path.join(catalog, 'gallery');
                galleryCatalogs.push(galleryShortPath);

                // Remove all gallery thumbnails
                this.removeGalleryThumbnails(galleryFullPath);
            }
        }

        // Add gallery catalogs
        catalogs = catalogs.concat(galleryCatalogs);

        // Count images for the process
        let numberOfImagesToRegenerate = this.getNumberOfImagesToRegenerate(mediaPath, catalogs);

        // If there is no posts - abort
        if(numberOfImagesToRegenerate === 0) {
            sender.send('app-site-regenerate-thumbnails-error', {
                message: "There is no images to regenerate"
            });

            return;
        }

        // Create featured images post reference
        this.postImagesRef = db.exec(`SELECT post_id, url FROM posts_images`);
        // Calculate how many images should be created
        this.numberOfImages = numberOfImagesToRegenerate;
        this.totalProgress = 0;

        // For each image - create a new thumbnails (detect featured images)
        let regenerateProcess = childProcess.fork(__dirname + '/workers/thumbnails/regenerate');

        regenerateProcess.send({
            type: 'dependencies',
            context: {
                application: {
                    appConfig: self.application.appConfig,
                    appDir: self.application.appDir,
                    sitesDir: self.application.sitesDir,
                    db: self.application.db,
                },
                name: self.name,
                postImagesRef: self.postImagesRef,
                totalProgress: self.totalProgress,
                numberOfImages: self.numberOfImages
            },
            catalog: catalogs.shift(),
            mediaPath: mediaPath
        });

        regenerateProcess.on('message', function(data) {
            if(data.type === 'empty' && catalogs.length) {
                regenerateProcess.send({
                    type: 'next-images',
                    catalog: catalogs.shift(),
                    mediaPath: mediaPath
                });
            }
        });

        regenerateProcess.on('message', function(data) {
            if(data.type === 'progress') {
                sender.send('app-site-regenerate-thumbnails-progress', {
                    value: data.value,
                    files: data.files
                });

                if(catalogs.length) {
                    regenerateProcess.send({
                        type: 'next-images',
                        catalog: catalogs.shift(),
                        mediaPath: mediaPath
                    });
                }

                return;
            }

            if(data.type === 'finished') {
                sender.send('app-site-regenerate-thumbnails-success', true);
            }
        });
    }

    /**
     * Removes all thumbnails from given gallery catalog
     *
     * @param galleryCatalog
     */
    removeGalleryThumbnails(galleryCatalog) {
        let images = fs.readdirSync(galleryCatalog);

        for(let image of images) {
            if(image.indexOf('-thumbnail.') === -1) {
                continue;
            }

            let imagePath = path.join(galleryCatalog, image);

            fs.unlinkSync(imagePath);
        }
    }

    /*
     * Get number of images which shoild be regenerated
     */
    getNumberOfImagesToRegenerate(mediaPath, catalogs) {
        let numberOfImages = 0;

        for(let catalog of catalogs) {
            if(catalog.indexOf('/.') > -1) {
                continue;
            }

            let catalogPath = path.join(mediaPath, catalog);
            let files = fs.readdirSync(catalogPath);

            for(let file of files) {
                if(file.substr(0, 1) === '.' || file === 'responsive' || file === 'gallery') {
                    continue;
                }

                if(catalog.indexOf('gallery') !== -1 && file.indexOf('-thumbnail.') !== -1) {
                    continue;
                }

                if(fs.lstatSync(path.join(mediaPath, catalog, file)).isFile()) {
                    numberOfImages++;
                }
            }
        }

        return numberOfImages;
    }

    /*
     * Store DB data
     */
    storeDB(db) {
        let data = db.export();
        let buffer = new Buffer(data);
        fs.writeFileSync(path.join(this.siteDir, 'input', 'db.sqlite'), buffer);
    }

    /*
     * Delete website
     */
    static delete(appInstance, name) {
        let sitePath = path.join(appInstance.sitesDir, name);
        fs.removeSync(sitePath);
    }

    /*
     * Load Custom CSS code
     */
    static loadCustomCSS(appInstance, name) {
        let cssPath = path.join(appInstance.sitesDir, name, 'input', 'config', 'custom-css.css');

        if(UtilsHelper.fileExists(cssPath)) {
            return fs.readFileSync(cssPath, 'utf8');
        }

        return false;
    }

    /*
     * Save Custom CSS code
     */
    static saveCustomCSS(appInstance, name, code) {
        let cssPath = path.join(appInstance.sitesDir, name, 'input', 'config', 'custom-css.css');
        fs.writeFileSync(cssPath, code, 'utf8');
    }

    /**
     * Checks for the files consistency on existing websites
     *
     * Adds (if missing):
     * - input/root-files directory
     * - input/media/files directory
     *
     * Moves .htaccess, robots.txt and _redirects files to root-files directory
     *
     * @param siteName
     */
    static checkFilesConsistency(appInstance, siteName) {
        let siteBasePath = path.join(appInstance.sitesDir, siteName, 'input');
        let rootFilesPath = path.join(siteBasePath, 'root-files');
        let mediaFilesPath = path.join(siteBasePath, 'media', 'files');

        // Check if root-files exists
        if(!UtilsHelper.dirExists(rootFilesPath)) {
            // When there is no root-files - create missing dirs
            fs.mkdirSync(rootFilesPath);
        }

        if(!UtilsHelper.dirExists(mediaFilesPath)) {
            fs.mkdirSync(mediaFilesPath);
        }

        // Move files - if exists to new root-files directory
        let filesToMove = {
            'robots.txt': path.join(siteBasePath, 'config', 'robots.txt'),
            '.htaccess':  path.join(siteBasePath, 'config', '.htaccess'),
            '_redirects': path.join(siteBasePath, 'config', '_redirects')
        };
        let fileNames = Object.keys(filesToMove);

        for(let i = 0; i < fileNames.length; i++) {
            let fileName = fileNames[i];

            if(!UtilsHelper.dirExists(rootFilesPath)) {
                break;
            }

            if(UtilsHelper.fileExists(filesToMove[fileName])) {
                let destinationPath = path.join(siteBasePath, 'root-files', fileName);
                fs.moveSync(filesToMove[fileName], destinationPath);
            }
        }
    }
}

module.exports = Site;
