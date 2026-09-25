/*
 * Main Application class
 */

// Necessary packages
const fs = require('fs-extra');
const os = require('os');
const path = require('path');
const Database = require('better-sqlite3');
const VersionComparator = require('../shared/version-comparator.js');
const normalizePath = require('normalize-path');
const url = require('url');
// Electron classes
const { screen, shell, nativeTheme, dialog, BrowserWindow, ipcMain } = require('electron');
// Window manager
const PubliiWindowManager = require('./window-manager.js');
// Collection classes
const Posts = require('./posts.js');
const Pages = require('./pages.js');
const Tags = require('./tags.js');
const Authors = require('./authors.js');
const Themes = require('./themes.js');
const Languages = require('./languages.js');
const Plugins = require('./plugins.js');
// Helper classes
const DBUtils = require('./helpers/db.utils.js');
const Site = require('./site.js');
const Utils = require('./helpers/utils.js');
const FileHelper = require('./helpers/file.js');
// List of the Event classes
const EventClasses = require('./events/_modules.js');
// Migration classes
const SiteConfigMigrator = require('./migrators/site-config.js');
// Default config
const defaultAstAppConfig = require('./../config/AST.app.config');
const defaultAstCurrentSiteConfig = require('./../config/AST.currentSite.config');
// Plugins packages
const PluginsAPI = require('./modules/plugins/plugins-api.js')
const PreviewServer = require('./modules/preview-server/preview-server.js');

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
        this.mainWindow = null;
        this.app = startupSettings.app;
        this.basedir = startupSettings.basedir;
        this.appDir = path.join(this.app.getPath('documents'), 'Publii');
        this.app.appDir = this.appDir;
        this.initPath = path.join(this.appDir, 'config', 'window-config.json');
        this.appConfigPath = path.join(this.appDir, 'config', 'app-config.json');
        this.wysiwygOverridedConfigPath = path.join(this.appDir, 'config', 'wysiwyg.override.json');
        this.tinymceOverridedConfigPath = path.join(this.appDir, 'config', 'tinymce.override.json');
        this.versionData = JSON.parse(FileHelper.readFileSync(__dirname + '/builddata.json', 'utf8'));
        this.versionData.os = os.platform() === 'darwin' ? 'mac' : os.platform() === 'linux' ? 'linux' : 'win';
        this.windowBounds = null;
        this.appConfig = null;
        this.tinymceOverridedConfig = {};
        this.tinymceOverridedConfigSource = false;
        this.sites = {};
        this.sitesDir = null;
        this.app.sitesDir = null;
        this.sitesLocationMissing = false;
        this.removedPreviewLocation = '';
        this.quitRequested = false;
        this.windowsBlockingQuit = new Set(); // webContentsId of windows which refused to unload during quitting
        this.dbMap = new Map();
        this.windowManager = new PubliiWindowManager(this);
        this.pluginsAPI = new PluginsAPI();
        this.previewServer = new PreviewServer();

        // Every window shows the state of the local preview
        this.previewServer.on('state-changed', state => this.windowManager.broadcast('app-local-preview-updated', state));

        /*
         * Run the app
         */
        this.checkDirs();

        // Without the single-instance lock another running instance could still be using these files
        if (startupSettings.isOnlyInstance === true) {
            this.cleanTempDirectory();
        }

        let loadConfigResult = this.loadConfig();

        if (!loadConfigResult) {
            this.app.quit();
            return;
        }

        this.loadAdditionalConfig();
        this.checkThemes();
        this.loadSites();
        this.loadThemes();
        this.loadLanguages();
        this.loadPlugins();
        this.initWindow();
        this.initWindowEvents();
    }

    getDbForSite (siteName) {
        return this.dbMap.get(siteName) || false;
    }

    setDbForSite (siteName, dbInstance) {
        this.dbMap.set(siteName, dbInstance);
    }

    closeDbForSite (siteName) {
        const db = this.dbMap.get(siteName);

        if (db) {
            try {
                db.close();
            } catch (e) {
                console.log('[DB] closeDbForSite: already closed for', siteName);
            }

            this.dbMap.delete(siteName);
        }
    }

    closeAllDbs () {
        for (const [siteName] of this.dbMap.entries()) {
            this.closeDbForSite(siteName);
        }
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
            fs.mkdirSync(path.join(this.appDir, 'plugins'));
        }

        if (!fs.existsSync(path.join(this.appDir, 'backups'))) {
            fs.mkdirSync(path.join(this.appDir, 'backups'));
        }

        if (!fs.existsSync(path.join(this.appDir, 'languages'))) {
            fs.mkdirSync(path.join(this.appDir, 'languages'));
        }

        if (!fs.existsSync(path.join(this.appDir, 'plugins'))) {
            fs.mkdirSync(path.join(this.appDir, 'plugins'));
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
                fs.mkdirSync(path.join(userThemesPath, file), { recursive: true });

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
                    let appThemeData = JSON.parse(FileHelper.readFileSync(appThemeConfig, 'utf8'));
                    let userThemeData = JSON.parse(FileHelper.readFileSync(userThemeConfig, 'utf8'));

                    // If app theme is newer version than the existing one
                    if(VersionComparator(appThemeData.version, userThemeData.version) === 1) {
                        // Remove all files from the theme dir
                        Utils.emptyDirRecursively(path.join(userThemesPath, file));

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
    reloadSite (siteName, webContentsId = null) {
        let siteData = this.switchSite(siteName, webContentsId);
        let siteConfig = this.loadSite(siteName);

        return {
            data: siteData,
            config: siteConfig
        };
    }

    // Load website and their config and database
    switchSite (site, webContentsId = null) {
        if (!site) {
            return { status: false };
        }

        const siteDir = path.join(this.sitesDir, site);
        const menuConfigPath = path.join(siteDir, 'input', 'config', 'menu.config.json');
        const themeConfigPath = path.join(siteDir, 'input', 'config', 'theme.config.json');
        const dbPath = path.join(siteDir, 'input', 'db.sqlite');

        if (!Utils.fileExists(dbPath)) {
            return { status: false };
        }

        // Close previous site DB for this window (if switching away from another site)
        if (webContentsId && this.windowManager) {
            const prevSite = this.windowManager.getSiteForWindow(webContentsId);

            if (prevSite && prevSite !== site) {
                this.closeDbForSite(prevSite);
            }
        }

        // Open DB for this site if not already open
        if (!this.dbMap.has(site)) {
            const db = new DBUtils(new Database(dbPath));
            db.exec(`CREATE INDEX IF NOT EXISTS posts_additional_data__post_id_key ON posts_additional_data(post_id, key);`);
            this.dbMap.set(site, db);
        }

        // Register site lock for this window
        if (webContentsId && this.windowManager) {
            this.windowManager.setWindowSite(webContentsId, site);
        }

        let tags = new Tags(this, {site});
        let posts = new Posts(this, {site});
        let pages = new Pages(this, {site});
        let authors = new Authors(this, {site});
        let themes = new Themes(this, {site});
        let themeDir = path.join(siteDir, 'input', 'themes', themes.currentTheme(true));
        let themeOverridesDir = path.join(siteDir, 'input', 'themes', themes.currentTheme(true) + '-override');
        let themeConfig = Themes.loadThemeConfig(themeConfigPath, themeDir);
        let menuStructure = FileHelper.readFileSync(menuConfigPath, 'utf8');
        let parsedMenuStructure = {};

        try {
            parsedMenuStructure = JSON.parse(menuStructure);
        } catch (e) {
            return { status: false };
        }

        return {
            status: true,
            posts: posts.load(),
            pages: pages.load(),
            tags: tags.load(),
            authors: authors.load(),
            postsTags: posts.loadTagsXRef(),
            postsAuthors: posts.loadAuthorsXRef(),
            pagesAuthors: pages.loadAuthorsXRef(),
            postTemplates: themes.loadPostTemplates(),
            pageTemplates: themes.loadPageTemplates(),
            tagTemplates: themes.loadTagTemplates(),
            authorTemplates: themes.loadAuthorTemplates(),
            themes: themes.load(),
            themeHasOverrides: Utils.dirExists(themeOverridesDir),
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

        if (!Utils.fileExists(configFilePath)) {
            return;
        }

        // check if all necessary files exists
        Site.checkFilesConsistency(this, siteName);

        // Load the config
        let defaultSiteConfig = JSON.parse(JSON.stringify(defaultAstCurrentSiteConfig));
        let siteConfig = FileHelper.readFileSync(configFilePath);

        try {
            siteConfig = JSON.parse(siteConfig);
        } catch (e) {
            dialog.showErrorBox('Publii cannot read site config', 'There is an issue with file: ' + configFilePath + "\n\nError details: " + e.message);
            return;
        }

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
        if (!Utils.dirExists(this.sitesDir)) {
            this.sitesLocationMissing = true;
            return false;
        }

        this.sitesLocationMissing = false;
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
        this.languageLoadingError = false;

        if (this.appConfig.language && this.appConfig.languageType) {
            this.currentLanguageName = this.appConfig.language;
            this.currentLanguageType = this.appConfig.languageType;
            this.currentLanguageTranslations = languagesLoader.loadTranslations(this.appConfig.language, this.appConfig.languageType);
            let languageConfig = languagesLoader.loadLanguageConfig(this.appConfig.language, this.appConfig.languageType);

            if (languageConfig) {
                this.currentLanguageMomentLocale = languageConfig.momentLocale;
                this.currentWysiwygTranslation = languagesLoader.loadWysiwygTranslation(this.appConfig.language, this.appConfig.languageType);
            }
        }

        this.loadDefaultLanguage(languagesLoader, false);
    }

    // Load plugins
    loadPlugins() {
        let pluginsLoader = new Plugins(this.appDir, this.sitesDir);
        this.plugins = pluginsLoader.loadPlugins();
        this.pluginsPath = normalizePath(path.join(this.appDir, 'plugins'));
    }

    // Load default language
    loadDefaultLanguage (languagesLoader, errorOccurred = false) {
        this.defaultLanguageName = 'en-gb';
        this.defaultLanguageType = 'default';
        this.defaultLanguageTranslations = languagesLoader.loadTranslations('en-gb', 'default');
        let languageConfig = languagesLoader.loadLanguageConfig('en-gb', 'default');
        this.defaultLanguageMomentLocale = languageConfig.momentLocale;
        this.defaultWysiwygTranslation = languagesLoader.loadWysiwygTranslation('en-gb', 'default');

        if (errorOccurred) {
            this.defaultLanguageLoadingError = true;
        }
    }

    // Load language
    loadLanguage (lang, type) {
        if (type !== 'default' && type !== 'installed') {
            type = 'default';
            lang = 'en-gb';
        }

        let languagesLoader = new Languages(this);
        this.currentLanguageName = lang.replace(/[^a-z\-\_\.]/gmi, '');
        this.currentLanguageType = type;
        this.currentLanguageTranslations = languagesLoader.loadTranslations(lang, type);
        this.languageLoadingError = false;
        let languageConfig = languagesLoader.loadLanguageConfig(lang, type);

        if (languageConfig) {
            this.currentLanguageMomentLocale = languageConfig.momentLocale;
            this.currentWysiwygTranslation = languagesLoader.loadWysiwygTranslation(lang, type);
        }

        if (
            !this.currentLanguageTranslations ||
            !languageConfig ||
            (!this.currentWysiwygTranslation && lang !== 'en-gb')
        ) {
            this.languageLoadingError = true;
        }
    }

    // Set language
    setLanguage (lang, type) {
        if (type !== 'default' && type !== 'installed') {
            type = 'default';
            lang = 'en-gb';
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
            this.windowBounds = JSON.parse(FileHelper.readFileSync(this.initPath, 'utf8'));
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
        } else {
            let screens = screen.getAllDisplays();
            let isInsideScreenBounds = false;

            for (let monitor of screens) {
                if (
                    this.windowBounds.x >= monitor.bounds.x && 
                    this.windowBounds.y >= monitor.bounds.y && 
                    this.windowBounds.x + this.windowBounds.width <= monitor.bounds.x + monitor.bounds.width && 
                    this.windowBounds.y + this.windowBounds.height <= monitor.bounds.y + monitor.bounds.height
                ) {
                    isInsideScreenBounds = true;
                    break
                }
            }

            if (!isInsideScreenBounds) {
                let width = screens[0].workAreaSize.width;
                let height = screens[0].workAreaSize.height;
                
                this.windowBounds = {
                    width: width,
                    height: height
                };
            }
        }

        // Try to get application config
        try {
            this.appConfig = JSON.parse(FileHelper.readFileSync(this.appConfigPath, 'utf8'));
            this.appConfig = Utils.mergeObjects(JSON.parse(JSON.stringify(defaultAstAppConfig)), this.appConfig);
            this.removeLegacyPreviewLocation();
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

    cleanTempDirectory () {
        let tempDir = path.join(this.appDir, 'temp');

        try {
            if (Utils.dirExists(tempDir) && !fs.lstatSync(tempDir).isSymbolicLink()) {
                Utils.emptyDirRecursively(tempDir);
            }
        } catch (error) {
            console.log('Unable to clean the temporary directory:', error);
        }
    }

    // The custom preview location was removed in v.0.48 - previews always go to the website's own directory.
    // Users who had it configured are informed once that their folder is no longer used.
    removeLegacyPreviewLocation () {
        if (!Object.prototype.hasOwnProperty.call(this.appConfig, 'previewLocation')) {
            return;
        }

        let legacyLocation = typeof this.appConfig.previewLocation === 'string' ? this.appConfig.previewLocation.trim() : '';
        delete this.appConfig.previewLocation;

        if (legacyLocation === '') {
            return;
        }

        this.removedPreviewLocation = legacyLocation;

        // Save the config right away, so the notice is not repeated on the next launch
        try {
            fs.writeFileSync(this.appConfigPath, JSON.stringify(this.appConfig, null, 4), {'flags': 'w'});
        } catch (error) {
            console.log('Unable to remove the legacy preview location from the app config:', error);
        }
    }

    // The notice about the removed preview location is handed over only once - to the first loaded window
    consumeRemovedPreviewLocation () {
        let removedLocation = this.removedPreviewLocation || '';
        this.removedPreviewLocation = '';
        return removedLocation;
    }

    // Load additional config data
    loadAdditionalConfig () {
        // Try to get the WYSIWYG editor overrided config - wysiwyg.override.json
        // with a legacy fallback to tinymce.override.json
        try {
            this.tinymceOverridedConfig = JSON.parse(FileHelper.readFileSync(this.wysiwygOverridedConfigPath, 'utf8'));
            this.tinymceOverridedConfigSource = 'wysiwyg.override.json';
        } catch (e) {
            try {
                this.tinymceOverridedConfig = JSON.parse(FileHelper.readFileSync(this.tinymceOverridedConfigPath, 'utf8'));
                this.tinymceOverridedConfigSource = 'tinymce.override.json';
            } catch (err) {}
        }

        if (this.appConfig.sitesLocation) {
            this.sitesDir = this.appConfig.sitesLocation;
            this.app.sitesDir = this.appConfig.sitesLocation;
        } else {
            this.appConfig.sitesLocation = path.join(this.appDir, 'sites');
            this.sitesDir = path.join(this.appDir, 'sites');
            this.app.sitesDir = path.join(this.appDir, 'sites');
        }

        this.pluginsHelper = new Plugins(this.appDir, this.sitesDir);
    }

    setSitesDir (sitesLocation) {
        this.sitesDir = sitesLocation;
        this.app.sitesDir = sitesLocation;
        this.appConfig.sitesLocation = sitesLocation;
        this.pluginsHelper = new Plugins(this.appDir, this.sitesDir);
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

    // Build common window params (platform chrome, background color, preload)
    _buildWindowParams (baseParams = {}) {
        let windowParams = Object.assign({
            width: 1400,
            height: 900
        }, baseParams);

        windowParams.minWidth = 1200;
        windowParams.minHeight = 700;
        windowParams.webPreferences = {
            nodeIntegration: false,
            contextIsolation: true,
            spellcheck: true,
            preload: path.join(__dirname, 'app-preload.js'),
            icon: path.join(__dirname, 'assets', 'icon.png')
        };

        if (this.appConfig.appTheme === 'dark' || (this.appConfig.appTheme === 'system' && nativeTheme.shouldUseDarkColors)) {
            windowParams.backgroundColor = '#202128';
        }

        if ((/^darwin/).test(process.platform)) {
            windowParams.titleBarStyle = 'hidden';

            // on macOS Tahoe (26) and newer fix position of the native traffic lights.
            let macOSMajorVersion = parseInt(process.getSystemVersion().split('.')[0], 10);

            if (macOSMajorVersion >= 26) {
                windowParams.trafficLightPosition = { x: 12, y: 7 };
            }
        }

        if ((/^win/).test(process.platform)) {
            windowParams.frame = false;
        }

        return windowParams;
    }

    // Create and configure a single BrowserWindow; returns the window
    _createWindow (windowParams, { isNewWindow = false, initialSite = '', skipSplashScreen = isNewWindow } = {}) {
        let win = new BrowserWindow(windowParams);
        this._dropMessagesToClosedWindow(win.webContents);
        win.loadURL('file:///' + this.basedir + '/dist/index.html');

        // Keyboard shortcut listener
        win.webContents.on('before-input-event', (event, input) => {
            if (input.type === 'mouseDown' && (input.button === 'back' || input.button === 'forward')) {
                event.preventDefault();
            }

            if (input.key === 'z' && (input.meta || input.control) && !input.shift) {
                win.webContents.send('block-editor-undo');
            } else if (
                (input.key === 'z' && (input.meta || input.control) && input.shift) ||
                (input.key === 'y' && (input.meta || input.control) && !input.shift)
            ) {
                win.webContents.send('block-editor-redo');
            }
        });

        win.webContents.setWindowOpenHandler(({ url }) => {
            if (typeof url !== 'string') {
                return { action: 'deny' };
            }

            let urlToOpen;
            let allowedProtocols = ['http:', 'https:', 'file:', 'dat:', 'ipfs:', 'dweb:'];

            try {
                urlToOpen = new URL(url);
            } catch (e) {
                return { action: 'deny' };
            }

            if (allowedProtocols.indexOf(urlToOpen.protocol) > -1) {
                urlToOpen = urlToOpen.href.replace(/\s/gmi, '');
                shell.openExternal(url);
            }

            return { action: 'deny' };
        });

        win.webContents.on('app-command', (e, cmd) => {
            if (cmd === 'browser-backward' || cmd === 'browser-forward') {
                e.preventDefault();
            }
        });

        // A page (i.e. an editor with unsaved changes) refused to unload and asks the user what to do.
        // Remember what it has interrupted: quitting the app or just closing this window. Every attempt
        // overwrites the previous one, so a cancelled quit cannot turn a later window close into quitting.
        win.webContents.on('will-prevent-unload', () => {
            if (this.quitRequested) {
                this.windowsBlockingQuit.add(win.webContents.id);
            } else {
                this.windowsBlockingQuit.delete(win.webContents.id);
            }

            this.quitRequested = false;
        });

        win.webContents.on('did-finish-load', () => {
            // A (re)loaded renderer starts from scratch, so it cannot hold any exclusive view
            this.windowManager.releaseViewLocksForWindow(win.webContents.id);

            let appData = {
                version: this.versionData,
                config: this.appConfig,
                customConfig: {
                    tinymce: this.tinymceOverridedConfig,
                    editorOverrideSource: this.tinymceOverridedConfigSource
                },
                currentLanguage: {
                    name: this.currentLanguageName,
                    translations: this.currentLanguageTranslations,
                    wysiwygTranslation: this.currentWysiwygTranslation,
                    momentLocale: this.currentLanguageMomentLocale,
                    languageLoadingError: this.languageLoadingError
                },
                defaultLanguage: {
                    name: this.defaultLanguageName,
                    translations: this.defaultLanguageTranslations,
                    wysiwygTranslation: this.defaultWysiwygTranslation,
                    momentLocale: this.defaultLanguageMomentLocale,
                    languageLoadingError: this.languageLoadingError
                },
                languages: this.languages,
                languagesPath: this.languagesPath,
                languagesDefaultPath: this.languagesDefaultPath,
                plugins: this.plugins,
                pluginsPath: this.pluginsPath,
                sites: this.sites,
                sitesLocationMissing: this.sitesLocationMissing === true,
                themes: this.themes,
                themesPath: this.themesPath,
                dirs: this.dirPaths,
                vendorPath: normalizePath(path.join(__dirname, '..', 'default-files', 'vendor').replace('app.asar', 'app.asar.unpacked')),
                isNewWindow: isNewWindow,
                initialSite: initialSite,
                skipSplashScreen: skipSplashScreen,
                removedPreviewLocation: this.consumeRemovedPreviewLocation()
            };
            
            win.webContents.send('app-data-loaded', appData);
            
            // Open Dev Tools
            if (this.appConfig.openDevToolsInMain) {
                let devToolsMode = this.appConfig.devToolsMode || 'detach';
                win.webContents.openDevTools({ mode: devToolsMode });
            }

            this._setZoomLevel(win);
        });

        win.on('resize', () => this._setZoomLevel(win));
        win.on('maximize', () => this._setZoomLevel(win));
        win.on('unmaximize', () => this._setZoomLevel(win));
        win.on('restore', () => this._setZoomLevel(win));

        const ContextMenuBuilder = require('./helpers/context-menu-builder.js');
        let contextMenuBuilder = new ContextMenuBuilder(win.webContents);

        win.webContents.on('context-menu', (event, params) => {
            event.preventDefault();
            contextMenuBuilder.showPopupMenu(params);
        });

        win.on('close', () => {
            // Only the primary window keeps its position - otherwise the last closed window would always win
            if (win !== this.mainWindow) {
                return;
            }

            // Kept in memory too, so a window reopened from the dock shows up where the previous one was closed
            this.windowBounds = win.getBounds();
            fs.writeFileSync(this.initPath, JSON.stringify(this.windowBounds, null, 4), {'flags': 'w'});
        });

        win.on('closed', () => {
            if (win === this.mainWindow) {
                this.mainWindow = null;
            }
        });

        return win;
    }

    // Many IPC handlers reply after asynchronous work (workers, timers, awaited operations). When the window
    // is closed in the meantime, sending to its destroyed webContents throws in the main process. The reply
    // has no receiver anyway, so it is dropped here - once, for every handler which uses event.sender.send.
    _dropMessagesToClosedWindow (webContents) {
        const sendToRenderer = webContents.send.bind(webContents);

        webContents.send = (channel, ...args) => {
            if (webContents.isDestroyed()) {
                return;
            }

            sendToRenderer(channel, ...args);
        };
    }

    // Create the first (main) window
    initWindow (skipSplashScreen = false) {
        let bounds = Object.assign({}, this.windowBounds);

        // Detect case when Publii was displayed on external display which is now unavailable
        let displays = screen.getAllDisplays();
        let externalDisplay = displays.find((display) => {
            return display.bounds.x !== 0 || display.bounds.y !== 0;
        });

        if (
            !externalDisplay &&
            (
                bounds.x < 0 ||
                bounds.x > screen.getPrimaryDisplay().workAreaSize.width ||
                bounds.y < 0 ||
                bounds.y > screen.getPrimaryDisplay().workAreaSize.height
            )
        ) {
            bounds.x = 0;
            bounds.y = 0;
        }

        this.mainWindow = this._createWindow(this._buildWindowParams(bounds), { skipSplashScreen });
        this.windowManager.registerWindow(this.mainWindow);
    }

    // Restore the primary window after the application is reactivated on macOS
    // (the app is already running, so the splash screen is skipped)
    reopenMainWindow () {
        if (this.windowManager.getAllWindows().length > 0) {
            return { status: false, error: 'window-already-open' };
        }

        this.initWindow(true);
        return { status: true };
    }

    // The app was launched again while it is running: show the window the user worked in most recently
    handleSecondInstance () {
        if (this.windowManager.getAllWindows().length === 0) {
            return this.reopenMainWindow();
        }

        this.windowManager.focusLastUsedWindow();
    }

    // Open an additional window (for a second site)
    openNewWindow (siteName = '') {
        if (
            siteName !== '' &&
            (
                typeof siteName !== 'string' ||
                !Object.prototype.hasOwnProperty.call(this.sites, siteName)
            )
        ) {
            return { status: false, error: 'site-not-found' };
        }

        if (siteName !== '' && this.windowManager.focusWindowBySite(siteName)) {
            return { status: false, error: 'site-already-open' };
        }

        let win = this._createWindow(this._buildWindowParams(), { isNewWindow: true, initialSite: siteName });
        this.windowManager.registerWindow(win);

        if (siteName !== '') {
            // Reserve the site for this window before its renderer finishes loading.
            this.windowManager.setWindowSite(win.webContents.id, siteName);
        }

        return { status: true };
    }

    // Add events to the window
    initWindowEvents () {
        this.initializeCustomIpcMainEvents();

        ipcMain.handle('app-open-new-window', (event, siteName = '') => this.openNewWindow(siteName));
        ipcMain.handle('app-view-lock', (event, viewId) => this.lockViewForWindow(viewId, event.sender.id));

        // Closing a window with unsaved changes must not quit the app - unless the user asked for quitting
        this.app.on('before-quit', () => {
            this.quitRequested = true;
        });

        // Quitting can be still cancelled by a window with unsaved changes, so the previews are closed at the very end
        this.app.on('will-quit', () => {
            this.previewServer.stop().catch(error => console.log('Unable to stop the preview server:', error));
        });
        this.windowManager.onWindowDestroyed(webContentsId => this.windowsBlockingQuit.delete(webContentsId));
        ipcMain.on('app-window-close-confirmed', event => this.closeWindowAfterConfirmation(event.sender));

        ipcMain.on('app-view-unlock', (event, viewId) => {
            if (this._isValidViewId(viewId)) {
                this.windowManager.unlockView(viewId, event.sender.id);
            }
        });

        ipcMain.on('app-focus-window-with-view', (event, viewId) => {
            if (this._isValidViewId(viewId)) {
                this.windowManager.focusWindowByView(viewId);
            }
        });
    }

    // The user agreed to lose unsaved changes, so finish what the window has interrupted:
    // quitting the whole app or closing just this window
    closeWindowAfterConfirmation (webContents) {
        if (this.windowsBlockingQuit.delete(webContents.id)) {
            this.app.quit();
            return;
        }

        let win = this.windowManager.getWindow(webContents.id);

        if (win && !win.isDestroyed()) {
            win.close();
        }
    }

    // Reserve an exclusive view (i.e. app settings) for the requesting window
    lockViewForWindow (viewId, webContentsId) {
        if (!this._isValidViewId(viewId)) {
            return { status: false, error: 'invalid-view' };
        }

        if (!this.windowManager.lockView(viewId, webContentsId)) {
            return { status: false, error: 'view-already-open' };
        }

        return { status: true };
    }

    // Check if the view identifier received from a renderer is safe to use
    _isValidViewId (viewId) {
        return typeof viewId === 'string' && /^[a-z0-9-]{1,64}$/.test(viewId);
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
    getMainWindow () {
        return this.windowManager.getMainWindow();
    }

    // Function used to filter unnecessary files
    skipSystemFiles (src, dest) {
        return src.indexOf('.DS_Store') > -1 ? false : true;
    }

    // Function used to add sites to the back-end sites list
    addSite (siteCatalog, siteData) {
        this.sites[siteCatalog] = siteData;
    }

    // Keep the sites list of the other windows in sync after a site was created, cloned, changed or deleted
    notifySitesListChanged (exceptWebContentsId = null) {
        this.windowManager.broadcast('app-sites-updated', this.sites, exceptWebContentsId);
    }

    // Keep the lists of installed themes, languages and plugins of the other windows in sync
    notifyExtensionsChanged (exceptWebContentsId = null) {
        this.windowManager.broadcast('app-extensions-updated', {
            themes: this.themes,
            languages: this.languages,
            plugins: this.plugins
        }, exceptWebContentsId);
    }

    // Keep the app config of the other windows in sync, so they neither use nor save outdated settings
    notifyAppConfigChanged (exceptWebContentsId = null) {
        this.windowManager.broadcast('app-config-updated', this.appConfig, exceptWebContentsId);

        // The zoom factor belongs to the window itself, so it has to be applied from the main process
        for (let win of this.windowManager.getAllWindows()) {
            if (win.webContents.id !== exceptWebContentsId) {
                this._setZoomLevel(win);
            }
        }
    }

    // Restore zoom level for a specific window
    _setZoomLevel (win) {
        let zoom = parseFloat(this.appConfig.uiZoomLevel);

        if (zoom && zoom > 0 && zoom <= 2.5) {
            win.webContents.setZoomFactor(zoom);
        }
    }

    // Legacy alias kept for any remaining external callers
    setCurrentZoomLevel () {
        let win = this.windowManager.getMainWindow();

        if (win) {
            this._setZoomLevel(win);
        }
    }
}

module.exports = App;
