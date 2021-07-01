/*
 * Main Application class
 */

// Necessary packages
const fs = require('fs-extra');
const path = require('path');
const fileExists = require('file-exists');
const sqlite = require('better-sqlite3');
const compare = require('node-version-compare');
const normalizePath = require('normalize-path');
const url = require('url');
// Electron classes
const { screen, shell, nativeTheme, Menu, dialog, BrowserWindow } = require('electron');
// Collection classes
const Posts = require('./posts.js');
const Tags = require('./tags.js');
const Authors = require('./authors.js');
const Themes = require('./themes.js');
const Languages = require('./languages.js');
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
        this.db = false;

        /*
         * Run the app
         */
        this.checkDirs();
        let loadConfigResult = this.loadConfig();

        if (!loadConfigResult) {
            this.app.quit();
            return;
        }

        this.loadAdditionalConfig();
        this.checkThemes();
        
        let loadingSitesResult = this.loadSites();
        
        if (!loadingSitesResult) {
            this.app.quit();
            return;
        }
        
        this.loadThemes();
        this.loadLanguages();
        this.initWindow();
        this.initWindowEvents();
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
            fs.copySync(
                path.join(__dirname, '..', 'default-files', 'default-themes').replace('app.asar', 'app.asar.unpacked'),
                path.join(this.appDir, 'themes'),
                { 
                    filter: this.skipSystemFiles,
                    dereference: true
                }
            );
            fs.mkdirSync(path.join(this.appDir, 'languages'));
        }

        if (!fs.existsSync(path.join(this.appDir, 'backups'))) {
            fs.mkdirSync(path.join(this.appDir, 'backups'));
        }

        if (!fs.existsSync(path.join(this.appDir, 'languages'))) {
            fs.mkdirSync(path.join(this.appDir, 'languages'));
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

        for (let file of appThemeDirs) {
            // Skip files and hidden files
            if (file.indexOf('.') > -1) {
                continue;
            }

            // Detect missing themes
            if (!fs.existsSync(path.join(userThemesPath, file))) {
                fs.mkdirSync(path.join(userThemesPath, file));

                try {
                    fs.copySync(
                        path.join(appThemesPath, file).replace('app.asar', 'app.asar.unpacked'),
                        path.join(userThemesPath, file),
                        { 
                            filter: this.skipSystemFiles,
                            dereference: true
                        }
                    );
                } catch (err) {
                    fs.appendFile(this.app.getPath('logs') + '/themes-copy-errors.txt', JSON.stringify(err));
                }
            } else {
                // For existing themes - compare versions
                let appThemeConfig = path.join(appThemesPath, file, 'config.json');
                let userThemeConfig = path.join(userThemesPath, file, 'config.json');

                // Check if both config.json files exists
                if (fs.existsSync(appThemeConfig) && fs.existsSync(userThemeConfig)) {
                    let appThemeData = JSON.parse(fs.readFileSync(appThemeConfig, 'utf8'));
                    let userThemeData = JSON.parse(fs.readFileSync(userThemeConfig, 'utf8'));

                    // If app theme is newer version than the existing one
                    if(compare(appThemeData.version, userThemeData.version) === 1) {
                        // Remove all files from the theme dir
                        fs.emptyDirSync(path.join(userThemesPath, file));

                        // Copy updated theme files
                        fs.copySync(
                            path.join(appThemesPath, file).replace('app.asar', 'app.asar.unpacked'),
                            path.join(userThemesPath, file),
                            { 
                                filter: this.skipSystemFiles,
                                dereference: true
                            }
                        );
                    }
                }
            }
        }
    }

    // Reload website data
    reloadSite (siteName) {
        let siteData = this.switchSite(siteName);
        let siteConfig = this.loadSite(siteName);

        return {
            data: siteData,
            config: siteConfig
        };
    }

    // Load website and their config and database
    switchSite (site) {
        if (!site) {
            return { status: false };
        }

        const siteDir = path.join(this.sitesDir, site);
        const menuConfigPath = path.join(siteDir, 'input', 'config', 'menu.config.json');
        const themeConfigPath = path.join(siteDir, 'input', 'config', 'theme.config.json');
        const dbPath = path.join(siteDir, 'input', 'db.sqlite');

        if(!Utils.fileExists(dbPath)) {
            return { status: false };
        }

        if (this.db) {
            this.db.close();
        }

        this.db = new sqlite(dbPath);
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
        } catch (e) {
            return { status: false };
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

    // Load specific website
    loadSite (siteName) {
        let dirPath = path.join(this.sitesDir, siteName);
        let fileStat = fs.statSync(dirPath);

        // check directories only
        if (!fileStat.isDirectory()) {
            return;
        }

        // check if the config file exists
        let configFilePath = path.join(dirPath, 'input', 'config', 'site.config.json');

        if (!fileExists(configFilePath)) {
            return;
        }

        // check if all necessary files exists
        Site.checkFilesConsistency(this, siteName);

        // Load the config
        let defaultSiteConfig = JSON.parse(JSON.stringify(defaultAstCurrentSiteConfig));
        let siteConfig = fs.readFileSync(configFilePath);
        siteConfig = JSON.parse(siteConfig);

        if (siteConfig.name !== siteName) {
            siteConfig.name = siteName;
            fs.writeFileSync(configFilePath, JSON.stringify(siteConfig, null, 4));
        }

        siteConfig = Utils.mergeObjects(defaultSiteConfig, siteConfig);

        // Migrate old author data if necessary
        siteConfig = SiteConfigMigrator.moveOldAuthorData(this, siteConfig);

        // set site data
        this.sites[siteConfig.name] = JSON.parse(JSON.stringify(siteConfig));

        if (this.sites[siteConfig.name].logo.icon.indexOf('#') > -1) {
            this.sites[siteConfig.name].logo.icon = this.sites[siteConfig.name].logo.icon.split('#')[1];
        }

        // Fill displayName fields for old websites without it
        if (!this.sites[siteConfig.name].displayName) {
            this.sites[siteConfig.name].displayName = siteConfig.name;
        }

        return siteConfig;
    }

    // Load websites
    loadSites() {
        if (fs.ensureDirSync(this.sitesDir)) {
            dialog.showErrorBox('Publii cannot find your sites folder.', 'Please check if the directory ' + this.sitesDir + ' existing or create it manually, then reopen the application.');
            return false; 
        }

        let files = fs.readdirSync(this.sitesDir);
        this.sites = {};

        for (let siteName of files) {
            this.loadSite(siteName);
        }

        return true;
    }

    // Load themes
    loadThemes() {
        let themesLoader = new Themes(this);
        this.themes = themesLoader.loadThemes();
        this.themesPath = normalizePath(path.join(this.appDir, 'themes'));
        this.dirPaths = {
            sites: normalizePath(path.join(this.appDir, 'sites')),
            temp: normalizePath(path.join(this.appDir, 'temp')),
            logs: normalizePath(this.app.getPath('logs'))
        };
    }

    // Load languages
    loadLanguages() {
        let languagesLoader = new Languages(this);
        this.languages = languagesLoader.loadLanguages();
        this.languagesPath = normalizePath(path.join(this.appDir, 'languages'));
        this.languagesDefaultPath = normalizePath(path.join(__dirname, '..', 'default-files', 'default-languages').replace('app.asar', 'app.asar.unpacked'));
        
        if (this.appConfig.language && this.appConfig.languageType) {
            this.currentLanguageName = this.appConfig.language;
            this.currentLanguageTranslations = languagesLoader.loadTranslations(this.appConfig.language, this.appConfig.languageType);
            let languageConfig = languagesLoader.loadLanguageConfig(this.appConfig.language, this.appConfig.languageType);
            this.currentLanguageMomentLocale = languageConfig.momentLocale;
        } else {
            this.currentLanguageName = 'en';
            this.currentLanguageTranslations = languagesLoader.loadTranslations('en', 'default');
            let languageConfig = languagesLoader.loadLanguageConfig('en', 'default');
            this.currentLanguageMomentLocale = languageConfig.momentLocale;
        }
    }

    // Load language 
    loadLanguage (lang, type) {        
        if (type !== 'default' && type !== 'installed') {
            type = 'default';
            lang = 'en';
        }

        let languagesLoader = new Languages(this);
        this.currentLanguageName = lang.replace(/[^a-z\-\_\.]/gmi, '');
        this.currentLanguageTranslations = languagesLoader.loadTranslations(lang, type);
        let languageConfig = languagesLoader.loadLanguageConfig(lang, type);
        this.currentLanguageMomentLocale = languageConfig.momentLocale;
    }

    // Set language
    setLanguage (lang, type) {
        if (type !== 'default' && type !== 'installed') {
            type = 'default';
            lang = 'en';
        }

        this.appConfig.language = lang.replace(/[^a-z\-\_\.]/gmi, '');
        this.appConfig.languageType = type;
        
        try {
            fs.writeFileSync(this.appConfigPath, JSON.stringify(this.appConfig, null, 4), {'flags': 'w'});
        } catch (e) {
            if (this.hasPermissionsErrors(e)) {
                return false;
            }
        }

        return true;
    }

    // Read or create the application config
    loadConfig () {
        // Try to get window bounds
        try {
            this.windowBounds = JSON.parse(fs.readFileSync(this.initPath, 'utf8'));
        } catch (e) {
            console.log('The window-config.json file will be created');
        }

        if (!this.windowBounds) {
            let screens = screen.getAllDisplays();
            let width = screens[0].workAreaSize.width;
            let height = screens[0].workAreaSize.height;
           
            for (let i = 0; i < screens.length; i++) {
                if (screens[i].width < width) {
                    width = screens[i].width;
                }

                if (screens[i].height < height) {
                    height = screens[i].height;
                }
            }

            this.windowBounds = {
                width: width,
                height: height
            };
        }

        // Try to get application config
        try {
            this.appConfig = JSON.parse(fs.readFileSync(this.appConfigPath, 'utf8'));
            this.appConfig = Utils.mergeObjects(JSON.parse(JSON.stringify(defaultAstAppConfig)), this.appConfig);
        } catch (e) {
            if (this.hasPermissionsErrors(e)) {
                return false;
            }

            console.log('The app-config.json file will be created');
            this.appConfig = JSON.parse(JSON.stringify(defaultAstAppConfig));

            try {
                fs.writeFileSync(this.appConfigPath, JSON.stringify(this.appConfig, null, 4), {'flags': 'w'});
            } catch (e) {
                if (this.hasPermissionsErrors(e)) {
                    return false;
                }
            }

            return true;
        }

        return true;
    }

    // Load additional config data
    loadAdditionalConfig () {
        // Try to get TinyMCE overrided config
        try {
            this.tinymceOverridedConfig = JSON.parse(fs.readFileSync(this.tinymceOverridedConfigPath, 'utf8'));
        } catch (e) {}

        if (this.appConfig.sitesLocation) {
            this.sitesDir = this.appConfig.sitesLocation;
            this.app.sitesDir = this.appConfig.sitesLocation;
        } else {
            this.appConfig.sitesLocation = path.join(this.appDir, 'sites');
            this.sitesDir = path.join(this.appDir, 'sites');
            this.app.sitesDir = path.join(this.appDir, 'sites');
        }
    }

    // Check permissions errors
    hasPermissionsErrors (error) {
        if (error.code === 'EACCES') {
            dialog.showErrorBox('Publii has no read/write access to the config folder', 'Please check the permissions of the Publii config folder and try to reopen the application.');
            return true;
        }

        if (error.code === 'EPERM') {
            dialog.showErrorBox('Publii has no read/write access to the config folder', 'If you are using macOS 10.15+ - please open "System Preferences", go to "Security & Privacy" and under "Privacy Tab" please check if Publii has proper permissions for the "Files and Documents". For other operating systems - please check the file permissions for the Publii configuration folder.');
            return true;
        }

        return false;
    }

    // Create the window
    initWindow() {
        let self = this;
        let windowParams = this.windowBounds;

        windowParams.minWidth = 1200;
        windowParams.minHeight = 700;
        windowParams.webPreferences = {
            nodeIntegration: false,
            contextIsolation: true,
            webviewTag: true,
            spellcheck: true,
            preload: path.join(__dirname, 'app-preload.js'),
            icon: path.join(__dirname, 'assets', 'icon.png')
        };

        if (this.appConfig.appTheme === 'dark' || (this.appConfig.appTheme === 'system' && nativeTheme.shouldUseDarkColors)) {
            windowParams.backgroundColor = '#202128';
        }

        let displays = screen.getAllDisplays();
        let externalDisplay = displays.find((display) => {
            return display.bounds.x !== 0 || display.bounds.y !== 0;
        });

        // Detect case when Publii was displayed on the external display which is now unavailable
        if (
            !externalDisplay &&
            (
                windowParams.x < 0 ||
                windowParams.x > screen.getPrimaryDisplay().workAreaSize.width ||
                windowParams.y < 0 ||
                windowParams.y > screen.getPrimaryDisplay().workAreaSize.height
            )
        ) {
            windowParams.x = 0;
            windowParams.y = 0;
        }

        if(!(/^win/).test(process.platform)) {
            windowParams.titleBarStyle = 'hidden';
        } else {
            windowParams.frame = false;
        }

        Menu.setApplicationMenu(null);
        this.mainWindow = new BrowserWindow(windowParams);
        this.mainWindow.setMenu(null);
        this.mainWindow.loadURL('file:///' + this.basedir + '/dist/index.html');
        this.mainWindow.removeMenu();

        // Register search shortcut listener
        this.mainWindow.webContents.on('before-input-event', (e, input) => {
            if (input.key === 'f' && (input.meta || input.control)) {
                this.mainWindow.webContents.send('app-show-search-form');     
            }
        });

        // Prevent from creating new windows in the Electron context
        this.mainWindow.webContents.on('new-window', function(event, urlToOpen) {
            event.preventDefault();

            if (typeof urlToOpen !== 'string') {
                return false;
            }
        
            let url;
            let allowedProtocols = ['http:', 'https:', 'file:', 'dat:', 'ipfs:'];
        
            try {
                url = new URL(urlToOpen);
            } catch (e) {
                return false;
            }
        
            if (allowedProtocols.indexOf(url.protocol) > -1) {
                url = url.href.replace(/\s/gmi, '');
                shell.openExternal(url);
            }
        });

        this.mainWindow.webContents.on('app-command', (e, cmd) => {
            // disable back/forward mouse buttons
            if (cmd === 'browser-backward' || cmd === 'browser-forward') {
                e.preventDefault();
            }
        });

        this.mainWindow.webContents.on('did-finish-load', function() {
            let appData = {
                version: self.versionData,
                config: self.appConfig,
                customConfig: {
                    tinymce: self.tinymceOverridedConfig
                },
                currentLanguage: {
                    name: self.currentLanguageName,
                    translations: self.currentLanguageTranslations
                },
                languages: self.languages,
                languagesPath: self.languagesPath,
                languagesDefaultPath: self.languagesDefaultPath,
                sites: self.sites,
                themes: self.themes,
                themesPath: self.themesPath,
                dirs: self.dirPaths
            };

            self.mainWindow.webContents.send('app-data-loaded', appData);
        });

        if (process.platform === 'linux') {
            this.mainWindow.webContents.on('before-input-event', (event, input) => {
                if (input.control && input.key === 'q') {
                    this.app.quit();
                }
            });
        }

        this.mainWindow.on('close', function(e) {
            let currentWindowURL = e.sender.webContents.getURL();

            if (
                currentWindowURL.indexOf('/posts/editor/blockeditor/') === -1 &&
                currentWindowURL.indexOf('/posts/editor/markdown/') === -1 &&
                currentWindowURL.indexOf('/posts/editor/tinymce/') === -1
            ) {
                return;
            }

            const choice = dialog.showMessageBoxSync(this, {
                type: 'question',
                buttons: ['Yes', 'No'],
                title: 'Confirm',
                message: "Are you sure you want to quit? \nAll unsaved changes will be lost."
            });
            
            if (choice === 1) {
                e.preventDefault();
            }
        });

        // Create context menu
        const ContextMenuBuilder = require('./helpers/context-menu-builder.js');
        let contextMenuBuilder = new ContextMenuBuilder(this.mainWindow.webContents);
            
        this.mainWindow.webContents.on('context-menu', (event, params) => {
            event.preventDefault();
            contextMenuBuilder.showPopupMenu(params);
        });        

        // Open Dev Tools
        if (this.appConfig.openDevToolsInMain) {
            this.mainWindow.webContents.openDevTools();
        }
    }

    // Add events to the window
    initWindowEvents() {
        this.mainWindow.on('close', () => {
            let windowBounds = this.mainWindow.getBounds();
            fs.writeFileSync(this.initPath, JSON.stringify(windowBounds, null, 4), {'flags': 'w'});
        });

        this.mainWindow.on('closed', () => {
            this.mainWindow = null;
        });

        this.initializeCustomIpcMainEvents();
    }

    // Initializes all custom events for IPC Main thread
    initializeCustomIpcMainEvents () {
        // Create instances for all custom event classes
        let classNames = Object.keys(EventClasses);

        for (let className of classNames) {
            new EventClasses[className](this);
        }
    }

    // Getter for the main window object
    getMainWindow() {
        return this.mainWindow;
    }

    // Function used to filter unnecessary files
    skipSystemFiles (src, dest) {
        return src.indexOf('.DS_Store') > -1 ? false : true;
    }

    // Function used to add sites to the back-end sites list
    addSite (siteCatalog, siteData) {
        this.sites[siteCatalog] = siteData;
    }
}

module.exports = App;
