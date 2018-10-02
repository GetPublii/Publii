/*
 * Main Application class
 */

// Necessary packages
const fs = require('fs-extra');
const path = require('path');
const passwordSafeStorage = require('keytar');
const fileExists = require('file-exists');
const sql = require('./vendor/sql.js');
const compare = require('node-version-compare');
const normalizePath = require('normalize-path');
// Electron classes
const electron = require('electron');
const BrowserWindow = electron.BrowserWindow;
// Collection classes
const Posts = require('./posts.js');
const Tags = require('./tags.js');
const Authors = require('./authors.js');
const Themes = require('./themes.js');
// Helper classes
const Site = require('./site.js');
const Utils = require('./helpers/utils.js');
// List of the Event classes
const EventClasses = require('./events/_modules.js');
// Migration classes
const SiteConfigMigrator = require('./migrators/site-config.js');
// Default config
const defaultAstAppConfig = require('./../config/AST.app.config');
const defaultAstCurrentSiteConfig = require('./../config/AST.currentSite.config');

/**
 * Main app class
 */
class App {
    /**
     * Constructor
     *
     * @param startupSettings
     */
    constructor(startupSettings) {
        this.mainWindow = startupSettings.mainWindow;
        this.app = startupSettings.app;
        this.basedir = startupSettings.basedir;
        this.appDir = path.join(this.app.getPath('documents'), 'Publii');
        this.app.appDir = this.appDir;
        this.initPath = path.join(this.appDir, 'config', 'window-config.json');
        this.appConfigPath = path.join(this.appDir, 'config', 'app-config.json');
        this.tinymceOverridedConfigPath = path.join(this.appDir, 'config', 'tinymce.override.json');
        this.versionData = JSON.parse(fs.readFileSync(__dirname + '/builddata.json', 'utf8'));
        this.windowBounds = null;
        this.appConfig = null;
        this.tinymceOverridedConfig = {};
        this.sites = {};
        this.sitesDir = null;
        this.app.sitesDir = null;

        /*
         * Run the app
         */
        this.checkDirs();
        this.loadConfig();
        this.checkThemes();
        this.loadSites().then(() => {
            this.loadThemes();
            this.initWindow();
            this.initWindowEvents();
        });
    }

    /**
     * Create the application dir if not exists
     */
    checkDirs() {
        if (!fs.existsSync(this.appDir)) {
            fs.mkdirSync(this.appDir);

            // Create also other dirs
            fs.mkdirSync(path.join(this.appDir, 'sites'));
            fs.mkdirSync(path.join(this.appDir, 'config'));
            fs.mkdirSync(path.join(this.appDir, 'themes'));
            fs.mkdirSync(path.join(this.appDir, 'logs'));
            fs.copySync(
                path.join(__dirname, '..', 'default-files', 'default-themes'),
                path.join(this.appDir, 'themes')
            );
        }

        if (!fs.existsSync(path.join(this.appDir, 'logs'))) {
            fs.mkdirSync(path.join(this.appDir, 'logs'));
        }
    }

    /**
     * Check if some themes should be updated
     */
    checkThemes() {
        let appThemesPath = path.join(__dirname, '..', 'default-files', 'default-themes');
        let userThemesPath = path.join(this.appDir, 'themes');

        // Merge themes directory
        let appThemeDirs = fs.readdirSync(appThemesPath);

        for(let file of appThemeDirs) {
            // Skip files and hidden files
            if (file.indexOf('.') > -1) {
                continue;
            }

            // Detect missing themes
            if(!fs.existsSync(path.join(userThemesPath, file))) {
                fs.mkdirSync(path.join(userThemesPath, file));
                fs.copySync(
                    path.join(appThemesPath, file),
                    path.join(userThemesPath, file)
                );
            } else {
                // For existing themes - compare versions
                let appThemeConfig = path.join(appThemesPath, file, 'config.json');
                let userThemeConfig = path.join(userThemesPath, file, 'config.json');

                // Check if both config.json files exists
                if(fs.existsSync(appThemeConfig) && fs.existsSync(userThemeConfig)) {
                    let appThemeData = JSON.parse(fs.readFileSync(appThemeConfig, 'utf8'));
                    let userThemeData = JSON.parse(fs.readFileSync(userThemeConfig, 'utf8'));

                    // If app theme is newer version than the existing one
                    if(compare(appThemeData.version, userThemeData.version) === 1) {
                        // Remove all files from the theme dir
                        fs.emptyDirSync(path.join(userThemesPath, file));

                        // Copy updated theme files
                        fs.copySync(
                            path.join(appThemesPath, file),
                            path.join(userThemesPath, file)
                        );
                    }
                }
            }
        }
    }

    /**
     * Reload website data
     *
     * @param siteName
     *
     * @returns {object}
     */
    async reloadSite(siteName) {
        let siteData = this.switchSite(siteName);
        let siteConfig = await this.loadSite(siteName);

        return {
            data: siteData,
            config: siteConfig
        };
    }

    /**
     * Load website and their config and database
     *
     * @param site
     *
     * @returns {object}
     */
    switchSite(site) {
        const siteDir = path.join(this.sitesDir, site);
        const menuConfigPath = path.join(siteDir, 'input', 'config', 'menu.config.json');
        const themeConfigPath = path.join(siteDir, 'input', 'config', 'theme.config.json');
        const dbPath = path.join(siteDir, 'input', 'db.sqlite');

        if(!Utils.fileExists(dbPath)) {
            return {
                status: false
            };
        }

        const input = fs.readFileSync(dbPath);
        this.db = new sql.Database(input);

        let tags = new Tags(this, {site});
        let posts = new Posts(this, {site});
        let authors = new Authors(this, {site});
        let themes = new Themes(this, {site});
        let themeDir = path.join(siteDir, 'input', 'themes', themes.currentTheme(true));
        let themeConfig = Themes.loadThemeConfig(themeConfigPath, themeDir);
        let menuStructure = fs.readFileSync(menuConfigPath, 'utf8');
        let parsedMenuStructure = {};

        try {
            parsedMenuStructure = JSON.parse(menuStructure);
        } catch(e) {
            return {
                status: false
            };
        }

        return {
            status: true,
            posts: posts.load(),
            tags: tags.load(),
            authors: authors.load(),
            postsTags: posts.loadTagsXRef(),
            postsAuthors: posts.loadAuthorsXRef(),
            postTemplates: themes.loadPostTemplates(),
            tagTemplates: themes.loadTagTemplates(),
            authorTemplates: themes.loadAuthorTemplates(),
            themes: themes.load(),
            themeSettings: themeConfig,
            menuStructure: parsedMenuStructure,
            siteDir: siteDir
        };
    }

    /**
     * Load specific website
     *
     * @param siteName
     * @param storeInConfig
     * @returns {object}
     */
    async loadSite(siteName) {
        let dirPath = path.join(this.sitesDir, siteName);
        let fileStat = fs.statSync(dirPath);

        // check directories only
        if(!fileStat.isDirectory()) {
            return;
        }

        // check if the config file exists
        let configFilePath = path.join(dirPath, 'input', 'config', 'site.config.json');

        if(!fileExists(configFilePath)) {
            return;
        }

        // check if root-files directory exists - if not - recreate it and move some files to it
        Site.checkFilesConsistency(this, siteName);

        // Load the config
        let defaultSiteConfig = JSON.parse(JSON.stringify(defaultAstCurrentSiteConfig));
        let siteConfig = fs.readFileSync(configFilePath);
        siteConfig = JSON.parse(siteConfig);

        if (siteConfig.name !== siteName) {
            siteConfig.name = siteName;
            fs.writeFileSync(configFilePath, JSON.stringify(siteConfig));
        }

        siteConfig = Utils.mergeObjects(defaultSiteConfig, siteConfig);

        // Migrate old author data if necessary
        siteConfig = SiteConfigMigrator.moveOldAuthorData(this, siteConfig);

        // Load passwords
        siteConfig = await this.loadPasswords(siteConfig);
        this.sites[siteConfig.name] = JSON.parse(JSON.stringify(siteConfig));

        if(this.sites[siteConfig.name].logo.icon.indexOf('#') > -1) {
            this.sites[siteConfig.name].logo.icon = this.sites[siteConfig.name].logo.icon.split('#')[1];
        }

        // Fill displayName fields for old websites without it
        if(!this.sites[siteConfig.name].displayName) {
            this.sites[siteConfig.name].displayName = siteConfig.name;
        }

        return siteConfig;
    }

    /**
     * Load websites
     */
    async loadSites() {
        let files = fs.readdirSync(this.sitesDir);
        this.sites = {};

        for(let siteName of files) {
            await this.loadSite(siteName);
        }
    }

    /**
     * Load password from Keytar
     */
    async loadPassword(type, passwordKey) {
         if(passwordKey.indexOf(type) === 0) {
            let passwordData = passwordKey.split(' ');
            let service = passwordData[0];
            let account = passwordData[1];
            let retrievedPassword = '';

            if(passwordSafeStorage) {
                retrievedPassword = await passwordSafeStorage.getPassword(service, account);
            }

            if (retrievedPassword === null || retrievedPassword === true || retrievedPassword === false) {
                retrievedPassword = '';
            }

            return retrievedPassword;
        }

        return '';
    }

    /**
     * Load passwords if its are stored in the keychain
     */
    async loadPasswords(siteConfig) {
        if(siteConfig.deployment) {
            siteConfig.deployment.password = await this.loadPassword('publii', siteConfig.deployment.password);

            if(siteConfig.deployment.passphrase) {
                siteConfig.deployment.passphrase = await this.loadPassword('publii-passphrase', siteConfig.deployment.passphrase);
            }

            if(siteConfig.deployment.s3) {
                siteConfig.deployment.s3.id = await this.loadPassword('publii-s3-id', siteConfig.deployment.s3.id);
                siteConfig.deployment.s3.key = await this.loadPassword('publii-s3-key', siteConfig.deployment.s3.key);
            }

            if(siteConfig.deployment.netlify) {
                siteConfig.deployment.netlify.id = await this.loadPassword('publii-netlify-id', siteConfig.deployment.netlify.id);
                siteConfig.deployment.netlify.token = await this.loadPassword('publii-netlify-token', siteConfig.deployment.netlify.token);
            }

            if(siteConfig.deployment.github) {
                siteConfig.deployment.github.token = await this.loadPassword('publii-gh-token', siteConfig.deployment.github.token);
            }

            if(siteConfig.deployment.gitlab) {
                siteConfig.deployment.gitlab.token = await this.loadPassword('publii-gl-token', siteConfig.deployment.gitlab.token);
            }
        }

        return siteConfig;
    }

    /**
     * Load themes
     */
    loadThemes() {
        let themesLoader = new Themes(this);

        this.themes = themesLoader.loadThemes();
        this.themesPath = normalizePath(path.join(this.appDir, 'themes'));
        this.dirPaths = {
            sites: normalizePath(path.join(this.appDir, 'sites')),
            temp: normalizePath(path.join(this.appDir, 'temp')),
            logs: normalizePath(path.join(this.appDir, 'logs'))
        };
    }

    /**
     * Read or create the application config
     */
    loadConfig() {
        /*
         * Try to get window bounds
         */
        try {
            this.windowBounds = JSON.parse(fs.readFileSync(this.initPath, 'utf8'));
        } catch (e) {
            console.log('The window-config.json file will be created');
        }

        if (!this.windowBounds) {
            const {width, height} = electron.screen.getPrimaryDisplay().workAreaSize;

            this.windowBounds = {
                width: width,
                height: height
            };
        }

        /*
         * Try to get application config
         */
        try {
            this.appConfig = JSON.parse(fs.readFileSync(this.appConfigPath, 'utf8'));
            this.appConfig = Utils.mergeObjects(JSON.parse(JSON.stringify(defaultAstAppConfig)), this.appConfig);
        } catch (e) {
            console.log('The app-config.json file will be created');
            this.appConfig = {};
            fs.writeFileSync(this.appConfigPath, JSON.stringify(this.appConfig), {'flags': 'w'});
        }

        /*
         * Try to get TinyMCE overrided config
         */
        try {
            this.tinymceOverridedConfig = JSON.parse(fs.readFileSync(this.tinymceOverridedConfigPath, 'utf8'));
        } catch (e) {}

        if(this.appConfig.sitesLocation) {
            this.sitesDir = this.appConfig.sitesLocation;
            this.app.sitesDir = this.appConfig.sitesLocation;
        } else {
            this.appConfig.sitesLocation = path.join(this.appDir, 'sites');
            this.sitesDir = path.join(this.appDir, 'sites');
            this.app.sitesDir = path.join(this.appDir, 'sites');
        }
    }

    /**
     * Create the window
     */
    initWindow() {
        let self = this;
        let windowParams = this.windowBounds;
        windowParams.minWidth = 1200;
        windowParams.minHeight = 700;

        let displays = electron.screen.getAllDisplays();
        let externalDisplay = displays.find((display) => {
            return display.bounds.x !== 0 || display.bounds.y !== 0
        });

        // Detect case when Publii was displayed on the external display which is now unavailable
        if (!externalDisplay && (windowParams.x < 0 || windowParams.x > electron.screen.getPrimaryDisplay().workAreaSize.width)) {
            windowParams.x = 50;
            windowParams.y = 50;
        }

        if(!(/^win/).test(process.platform)) {
            windowParams.titleBarStyle = 'hidden';
        } else {
            windowParams.frame = false;
        }

        if (process.platform === 'linux') {
          windowParams.icon = path.join(__dirname, '..', 'src', 'assets', 'installation', '1024x1024.png');
        }

        this.mainWindow = new BrowserWindow(windowParams);
        this.mainWindow.setMenu(null);
        this.mainWindow.loadURL('file://' + this.basedir + '/index.html');

        this.mainWindow.webContents.on('did-finish-load', function() {
            let appVersionInfo = {
                version: self.versionData,
                config: self.appConfig,
                customConfig: {
                    tinymce: self.tinymceOverridedConfig
                },
                sites: self.sites,
                themes: self.themes,
                themesPath: self.themesPath,
                dirs: self.dirPaths
            };

            self.mainWindow.webContents.send('app-data-loaded', appVersionInfo);
        });

        // Open Dev Tools
        if(this.appConfig.openDevToolsInMain) {
            this.mainWindow.webContents.openDevTools();
        }
    }

    /**
     * Add events to the window
     */
    initWindowEvents() {
        let self = this;

        /*
         * Closing the app windows
         */
        this.mainWindow.on('close', function() {
            let windowBounds = self.mainWindow.getBounds();
            fs.writeFileSync(self.initPath, JSON.stringify(windowBounds), {'flags': 'w'});
        });

        /*
         * Remove window instance after closing
         */
        this.mainWindow.on('closed', function() {
            self.mainWindow = null;
        });

        // Get class names
        let classNames = Object.keys(EventClasses);

        // Create instances for all Classes
        for(let className of classNames) {
            new EventClasses[className](this);
        }
    }

    /**
     * Getter for the main window object
     *
     * @returns {Electron.BrowserWindow}
     */
    getMainWindow() {
        return this.mainWindow;
    }
}

module.exports = App;
