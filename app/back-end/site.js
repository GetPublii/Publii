/*
 * Site instance
 */

const fs = require('fs-extra');
const os = require('os');
const path = require('path');
const Database = os.platform() === 'linux' ? require('node-sqlite3-wasm').Database : require('better-sqlite3');
const DBUtils = require('./helpers/db.utils.js');
const Themes = require('./themes.js');
const Image = require('./image.js');
const UtilsHelper = require('./helpers/utils');
const childProcess = require('child_process');
const slug = require('./helpers/slug');
const defaultAstCurrentSiteConfig = require('./../config/AST.currentSite.config');
const { shell } = require('electron');
const CreateFromBackup = require('./../back-end/modules/backup/create-from-backup');

class Site {
    constructor(appInstance, config, maintenanceMode = false) {
        this.application = appInstance;
        this.name = config.name;
        this.description = config.description;
        this.uuid = config.uuid;
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
        if (!this.siteExists()) {
            this.createDirectories();
            this.copyDefaultTheme();
            this.createConfigFiles();
            let dbResult = this.createDB();

            if (!dbResult) {
                return 'db-error';
            }

            this.createAuthor(authorName);
            return true;
        }
        // If site exists
        console.log('Site called: ' + this.name + ' exists!');
        return 'duplicate';
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
        fs.mkdirSync(path.join(this.siteDir, 'input', 'config', 'plugins'));
        fs.mkdirSync(path.join(this.siteDir, 'input', 'root-files'));
        fs.mkdirSync(path.join(this.siteDir, 'input', 'media'));
        fs.mkdirSync(path.join(this.siteDir, 'input', 'media', 'temp'));
        fs.mkdirSync(path.join(this.siteDir, 'input', 'media', 'website'));
        fs.mkdirSync(path.join(this.siteDir, 'input', 'media', 'posts'));
        fs.mkdirSync(path.join(this.siteDir, 'input', 'media', 'files'));
        fs.mkdirSync(path.join(this.siteDir, 'input', 'media', 'tags'));
        fs.mkdirSync(path.join(this.siteDir, 'input', 'media', 'authors'));
        fs.mkdirSync(path.join(this.siteDir, 'input', 'media', 'plugins'));
        fs.mkdirSync(path.join(this.siteDir, 'input', 'themes'));
        fs.mkdirSync(path.join(this.siteDir, 'input', 'languages'));
        fs.mkdirSync(path.join(this.siteDir, 'output'));
        fs.mkdirSync(path.join(this.siteDir, 'preview'));
    }

    /*
     * Copy files of the default theme
     */
    copyDefaultTheme () {
        fs.copySync(
            path.join(this.application.appDir, 'themes', 'simple'),
            path.join(this.siteDir, 'input', 'themes', 'simple')
        );
    }

    /*
     * Create config file
     */
    createConfigFiles() {
        let configDir = path.join(this.siteDir, 'input', 'config');
        let siteConfig = {
            'uuid': 'uuid-' + (new Date().getTime()) + '-' + (Math.floor(Math.random() * (999999999 - 100000000 + 1)) + 100000000),
            'name': this.name,
            'description': '',
            'displayName': this.displayName,
            'author': this.author,
            'logo': this.logo,
            'theme': 'simple'
        };

        this.uuid = siteConfig.uuid;
        fs.writeFileSync(path.join(configDir, 'site.config.json'), JSON.stringify(siteConfig, null, 4));
        fs.writeFileSync(path.join(configDir, 'menu.config.json'), '[]');
        fs.writeFileSync(path.join(configDir, 'theme.config.json'), '{}');
    }

    /*
     * Create database
     */
    createDB() {
        let dbPath = path.join(this.siteDir, 'input', 'db.sqlite');

        try {
            let db = new DBUtils(new Database(dbPath));
            db.exec(fs.readFileSync(this.application.basedir + '/back-end/sql/1.0.0.sql', 'utf8'));
            db.close();
        } catch (error) {
            console.log('DB error', error);
            return false;
        }

        return true;
    }

    /*
     * Create author
     */
    createAuthor(authorName) {
        let dbPath = path.join(this.siteDir, 'input', 'db.sqlite');
        let db = new DBUtils(new Database(dbPath));
        let sqlQuery = db.prepare(`INSERT INTO authors VALUES(1, @name, @slug, '', '{}', '{}')`);
        sqlQuery.run({
            name: authorName,
            slug: slug(authorName).toLowerCase()
        });
        db.close();
    }

    /*
     * check if regenerate thumbnails is required
     */
    regenerateThumbnailsIsRequired(sender) {
        let themesHelper = new Themes(this.application, { site: this.name });
        let themeName = themesHelper.currentTheme();

        // If there is no theme selected
        if(themeName === 'not selected') {
            sender.send('app-site-regenerate-thumbnails-required-status', {
                message: false
            });

            return;
        }

        // If there is no responsive images configuration
        let themeConfig = UtilsHelper.loadThemeConfig(path.join(this.siteDir, 'input'), themeName);

        if(!UtilsHelper.responsiveImagesConfigExists(themeConfig)) {
            sender.send('app-site-regenerate-thumbnails-required-status', {
                message: false
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

            // Add gallery catalogs
            let galleryFullPath = path.join(mediaPath, catalog, 'gallery');

            if(UtilsHelper.dirExists(galleryFullPath)) {
                let galleryShortPath = path.join(catalog, 'gallery');
                galleryCatalogs.push(galleryShortPath);
            }
        }

        // Add gallery catalogs
        catalogs = catalogs.concat(galleryCatalogs);

        // Count images for the process
        let numberOfImagesToRegenerate = this.getNumberOfImagesToRegenerate(mediaPath, catalogs);

        // If there is no posts - abort
        if(numberOfImagesToRegenerate === 0) {
            sender.send('app-site-regenerate-thumbnails-required-status', {
                message: false
            });
        } else {
            sender.send('app-site-regenerate-thumbnails-required-status', {
                message: true
            });
        }
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
        let db = new DBUtils(new Database(dbPath));

        // If there is no theme selected - abort
        if(themeName === 'not selected') {
            sender.send('app-site-regenerate-thumbnails-error', {
                message: {
                    translation: 'core.site.noThemeSelected'
                }
            });

            return;
        }

        // If there is no responsive images configuration - abort
        let themeConfig = UtilsHelper.loadThemeConfig(path.join(this.siteDir, 'input'), themeName);

        if(!UtilsHelper.responsiveImagesConfigExists(themeConfig)) {
            sender.send('app-site-regenerate-thumbnails-error', {
                message: {
                    translation: 'core.site.noConfigurationForResponsiveImages'
                }
            });

            return;
        }

        // Remove all old responsive directories
        let mediaPath = path.join(this.siteDir, 'input', 'media');
        let catalogs = fs.readdirSync(path.join(mediaPath, 'posts'));
        let tagCatalogs = fs.readdirSync(path.join(mediaPath, 'tags'));
        let authorsCatalogs = fs.readdirSync(path.join(mediaPath, 'authors'));
        let galleryCatalogs = [];
        catalogs = catalogs.map(catalog => 'posts/' + catalog);
        tagCatalogs = tagCatalogs.map(catalog => 'tags/' + catalog);
        authorsCatalogs = authorsCatalogs.map(catalog => 'authors/' + catalog);
        catalogs.push('website');
        catalogs = catalogs.concat(tagCatalogs);
        catalogs = catalogs.concat(authorsCatalogs);
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
                message: {
                    translation: 'core.site.noImagesToRegenerate'
                }
            });

            return;
        }

        // Create featured images post reference
        this.postImagesRef = db.prepare(`SELECT post_id, url FROM posts_images`).all();
        // Calculate how many images should be created
        this.numberOfImages = numberOfImagesToRegenerate;
        this.totalProgress = 0;

        // For each image - create a new thumbnails (detect featured images)
        let regenerateProcess = childProcess.fork(__dirname + '/workers/thumbnails/regenerate', {
            stdio: [
                null,
                fs.openSync(this.application.app.getPath('logs') + "/regenerate-process.log", "w"),
                fs.openSync(this.application.app.getPath('logs') + "/regenerate-errors.log", "w"),
                'ipc'
            ]
        });

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

            if (data.type === 'finished') {
                sender.send('app-site-regenerate-thumbnails-success', true);
            }
        });

        db.close();

        return regenerateProcess;
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
                    if (path.parse(file).ext !== '') {
                        numberOfImages++;
                    }
                }
            }
        }

        return numberOfImages;
    }

    /*
     * Delete website
     */
    static delete(appInstance, name) {
        let sitePath = path.join(appInstance.sitesDir, name);

        if (appInstance.db) {
            try {
                appInstance.db.close();
            } catch (e) {
                console.log('[SITE DELETE] DB already closed');
            }
        }

        setTimeout(async () => {
            await shell.trashItem(sitePath);
        }, 500);
    }

    /*
     * Clone website
     */
    static clone(appInstance, catalogName, siteName) {
        let newCatalogName = slug(siteName).toLowerCase();
        let sitePath = path.join(appInstance.sitesDir, catalogName);
        let newCatalogFreeName = Site.findFreeName(newCatalogName, appInstance.sitesDir);
        let newSitePath = path.join(appInstance.sitesDir, newCatalogFreeName);
        fs.copySync(sitePath, newSitePath);
        Site.updateNameAndUUIDInSiteConfig(newSitePath, newCatalogFreeName, siteName);
        let configFilePath = path.join(newSitePath, 'input', 'config', 'site.config.json');
        let siteConfig = fs.readFileSync(configFilePath);
        siteConfig = JSON.parse(siteConfig);
        appInstance.addSite(newCatalogFreeName, siteConfig);

        return {
            siteName: siteName,
            siteCatalog: newCatalogFreeName,
            siteConfig: siteConfig
        };
    }

    /**
     *
     * Find first free name
     *
     * e.g. XYZ -> XYZ copy
     * e.g. XYZ copy -> XYZ copy copy
     *
     * @param {string} name
     */
    static findFreeName (name, basePath) {
        let baseName = name;
        let dirPath = path.join(basePath, baseName);
        let currentName = baseName;

        while (UtilsHelper.dirExists(dirPath)) {
            currentName = baseName + '-copy';
            dirPath = path.join(basePath, currentName);
        }

        return currentName;
    }

    /**
     * Update site.config.json to use a new name of the website
     *
     * @param {string} sitePath
     * @param {string} newNameSlug
     */
    static updateNameAndUUIDInSiteConfig (sitePath, newSiteSlug, newSiteName) {
        let configFilePath = path.join(sitePath, 'input', 'config', 'site.config.json');
        let siteConfig = fs.readFileSync(configFilePath);
        siteConfig = JSON.parse(siteConfig);
        siteConfig.name = newSiteSlug;
        siteConfig.uuid = 'uuid-' + (new Date().getTime()) + '-' + (Math.floor(Math.random() * (999999999 - 100000000 + 1)) + 100000000);
        siteConfig.displayName = newSiteName;
        siteConfig.deployment = JSON.parse(JSON.stringify(defaultAstCurrentSiteConfig.deployment));
        siteConfig = JSON.stringify(siteConfig, null, 4);
        fs.writeFileSync(configFilePath, siteConfig);
    }

    /*
     * Load Custom CSS code
     */
    static loadCustomCSS(appInstance, name) {
        let cssPathNormal = path.join(appInstance.sitesDir, name, 'input', 'config', 'custom-css.css');
        let cssNormal = false;
        
        if (UtilsHelper.fileExists(cssPathNormal)) {
            cssNormal = fs.readFileSync(cssPathNormal, 'utf8');
        }

        return {
            normal: cssNormal
        };
    }

    /*
     * Save Custom CSS code
     */
    static saveCustomCSS(appInstance, name, code) {
        let cssPathNormal = path.join(appInstance.sitesDir, name, 'input', 'config', 'custom-css.css');
        fs.writeFileSync(cssPathNormal, code.normal, 'utf8');
    }

    /**
     * Checks for the files consistency on existing websites
     *
     * Adds (if missing):
     * - input/root-files directory
     * - input/media/files directory
     * - input/media/pages directory
     * - input/media/tags directory
     * - input/media/authors directory
     * - input/config/plugins directory
     * - input/config/site.plugins.json file
     *
     * Moves .htaccess, robots.txt and _redirects files to root-files directory
     *
     * @param siteName
     */
    static checkFilesConsistency(appInstance, siteName) {
        let siteBasePath = path.join(appInstance.sitesDir, siteName, 'input');
        let rootFilesPath = path.join(siteBasePath, 'root-files');
        let tagImagesPath = path.join(siteBasePath, 'media', 'tags');
        let authorImagesPath = path.join(siteBasePath, 'media', 'authors');
        let mediaFilesPath = path.join(siteBasePath, 'media', 'files');
        let pluginsPath = path.join(siteBasePath, 'config', 'plugins');
        let pluginsConfigPath = path.join(siteBasePath, 'config', 'site.plugins.json');

        if(!UtilsHelper.dirExists(rootFilesPath)) {
            fs.mkdirSync(rootFilesPath, { recursive: true });
        }

        if(!UtilsHelper.dirExists(mediaFilesPath)) {
            fs.mkdirSync(mediaFilesPath, { recursive: true });
        }

        if(!UtilsHelper.dirExists(tagImagesPath)) {
            fs.mkdirSync(tagImagesPath, { recursive: true });
        }

        if(!UtilsHelper.dirExists(authorImagesPath)) {
            fs.mkdirSync(authorImagesPath, { recursive: true});
        }

        if(!UtilsHelper.dirExists(pluginsPath)) {
            fs.mkdirSync(pluginsPath, { recursive: true });
        }

        // Create site.plugins.json if not exists
        if (!UtilsHelper.fileExists(pluginsConfigPath)) {
            fs.writeFileSync(pluginsConfigPath, '{}');
        }

        // Move files - if exists to new root-files directory
        let filesToMove = {
            'robots.txt': path.join(siteBasePath, 'config', 'robots.txt'),
            '.htaccess': path.join(siteBasePath, 'config', '.htaccess'),
            '.htpasswd': path.join(siteBasePath, 'config', '.htpasswd'),
            '_redirects': path.join(siteBasePath, 'config', '_redirects')
        };

        let fileNames = Object.keys(filesToMove);

        for (let i = 0; i < fileNames.length; i++) {
            let fileName = fileNames[i];

            if(!UtilsHelper.dirExists(rootFilesPath)) {
                break;
            }

            if (UtilsHelper.fileExists(filesToMove[fileName])) {
                let destinationPath = path.join(siteBasePath, 'root-files', fileName);
                fs.moveSync(filesToMove[fileName], destinationPath);
            }
        }
    }

    static async checkWebsiteBackup (appInstance, backupPath) {
        let siteCreator = new CreateFromBackup(appInstance, backupPath);
        let result = await siteCreator.prepareBackupToRestore()
        return result;
    }

    static checkWebsiteCatalogAvailability (appInstance, siteName) {
        let catalogName = slug(siteName).toLowerCase();

        if (fs.existsSync(path.join(appInstance.sitesDir, catalogName))) {
            return {
                catalogExists: true
            };
        }

        return {
            catalogExists: false
        };
    }

    static restoreFromBackup (appInstance, siteName) {
        let catalogName = slug(siteName).toLowerCase();
        let source = path.join(appInstance.appDir, 'temp', 'backup-to-restore');
        let destination = path.join(appInstance.sitesDir, catalogName);

        if (catalogName.trim() === '') {
            return {
                status: 'error',
            };
        }

        if (fs.existsSync(destination)) {
            fs.removeSync(destination);
        }

        fs.moveSync(source, destination);
        Site.updateNameAndUUIDInSiteConfig(destination, catalogName, siteName);
        
        return {
            status: 'success',
            data: {
                siteCatalogName: catalogName
            }
        };
    }
}

module.exports = Site;
