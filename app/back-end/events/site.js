const fs = require('fs-extra');
const os = require('os');
const path = require('path');
const slug = require('./../helpers/slug');
const passwordSafeStorage = require('keytar');
const ipcMain = require('electron').ipcMain;
const Site = require('../site.js');
const Themes = require('../themes.js');
const Database = os.platform() === 'linux' ? require('node-sqlite3-wasm').Database : require('better-sqlite3');
const DBUtils = require('../helpers/db.utils.js');
const UtilsHelper = require('../helpers/utils.js');
const normalizePath = require('normalize-path');
const URLHelper = require('../modules/render-html/helpers/url.js');

/*
 * Events for the IPC communication regarding single sites
 */

class SiteEvents {
    constructor(appInstance) {
        let self = this;
        this.regenerateProcess = false;

        /*
         * Reload site config and data
         */
        ipcMain.on('app-site-reload', (event, config) => {
            let result = appInstance.reloadSite(config.siteName);
            let language = this.getSiteLanguage(appInstance, config.siteName);
            this.setSpellcheckerLanguage (appInstance, language);
            event.sender.send('app-site-reloaded', result);
        });

        /*
         * Save site config
         */
        ipcMain.on('app-site-config-save', async function (event, config) {
            let siteName = '';
            let siteNames = Object.keys(appInstance.sites);
            let thumbnailsRegenerateRequired = false;

            if (siteNames.indexOf(config.site) !== -1) {
                siteName = config.site;
            } else {
                event.sender.send('app-site-config-saved', {
                    status: false,
                    message: 'site-not-exists'
                });
            }

            if (config.source === 'server') {
                self.removeGitConfigDirectory(appInstance, config.site);
            }

            // Prepare settings
            config.settings.name = slug(config.settings.name);
            config.settings.advanced.urls.postsPrefix = slug(config.settings.advanced.urls.postsPrefix);
            config.settings.advanced.urls.tagsPrefix = slug(config.settings.advanced.urls.tagsPrefix);
            config.settings.advanced.urls.authorsPrefix = slug(config.settings.advanced.urls.authorsPrefix);
            config.settings.advanced.urls.pageName = slug(config.settings.advanced.urls.pageName);
            config.settings.advanced.urls.errorPage = slug(config.settings.advanced.urls.errorPage, true);
            config.settings.advanced.urls.searchPage = slug(config.settings.advanced.urls.searchPage, true);

            // If user changed the site name
            if (
                config.settings.name !== '' &&
                siteName !== '' &&
                slug(config.settings.name) !== slug(config.site)
            ) {
                // Check if new site name is unique
                if (
                    !fs.existsSync(path.join(appInstance.sitesDir, config.settings.name)) &&
                    slug(config.settings.displayName) === config.settings.name
                ) {
                    if (appInstance.db) {
                        try {
                            appInstance.db.close();
                        } catch (e) {
                            console.log('[SITE NAME CHANGE] DB already closed');
                        }
                    }

                    // If yes - rename the dir
                    delete appInstance.sites[siteName];
                    siteName = config.settings.name;
                    fs.renameSync(
                        path.join(appInstance.sitesDir, config.site),
                        path.join(appInstance.sitesDir, config.settings.name)
                    );

                    let dbPath = path.join(appInstance.sitesDir, config.settings.name, 'input', 'db.sqlite');
                    appInstance.db = new DBUtils(new Database(dbPath));

                    // Rename also the backups directory
                    let backupsDir = appInstance.appConfig.backupsLocation;

                    if(backupsDir) {
                        let backupsLocation = path.join(backupsDir, config.site);
                        let newBackupsLocation = path.join(backupsDir, config.settings.name);

                        if (UtilsHelper.dirExists(backupsLocation)) {
                            fs.renameSync(
                                backupsLocation,
                                newBackupsLocation
                            );
                        }
                    }
                } else {
                    // If no - return error
                    event.sender.send('app-site-config-saved', {
                        status: false,
                        message: 'duplicated-name'
                    });

                    return;
                }
            }

            // Check for empty names
            if (
                siteName === '' ||
                config.settings.name === ''
            ) {
                event.sender.send('app-site-config-saved', {
                    status: false,
                    message: 'empty-name'
                });

                return;
            }

            let configFile = path.join(appInstance.sitesDir, siteName, 'input', 'config', 'site.config.json');
            let oldConfig = fs.readFileSync(configFile, 'utf8');
            let themesPath = path.join(appInstance.sitesDir, siteName, 'input', 'themes');
            let newThemeConfig = {};
            oldConfig = JSON.parse(oldConfig);

            if (config.settings.theme === '' && oldConfig.theme) {
                config.settings.theme = oldConfig.theme;
            } else {
                let themes = new Themes(appInstance, {
                    site: siteName
                });

                if(self.prepareThemeName(config.settings.theme) !== oldConfig.theme) {
                    thumbnailsRegenerateRequired = true;
                }

                config.settings.theme = themes.changeTheme(config.settings.theme, oldConfig.theme);
                let themeConfigPath = path.join(appInstance.sitesDir, siteName, 'input', 'config', 'theme.config.json');
                let themePath = path.join(themesPath, config.settings.theme);
                newThemeConfig = Themes.loadThemeConfig(themeConfigPath, themePath);
            }


            if (
                oldConfig.advanced && (
                    (oldConfig.advanced.responsiveImages !== config.settings.advanced.responsiveImages) ||
                    (oldConfig.advanced.imagesQuality !== config.settings.advanced.imagesQuality) || 
                    (oldConfig.advanced.alphaQuality !== config.settings.advanced.alphaQuality) || 
                    (oldConfig.advanced.forceWebp !== config.settings.advanced.forceWebp) ||
                    (oldConfig.advanced.webpLossless !== config.settings.advanced.webpLossless)
                )
            ) {
                thumbnailsRegenerateRequired = true;
            }

            if(
                config.settings.advanced &&
                config.settings.advanced.openGraphImage &&
                config.settings.advanced.openGraphImage !== ''
            ) {
                let filename = path.parse(config.settings.advanced.openGraphImage);
                config.settings.advanced.openGraphImage = filename.base;
            }

            let passwordData = false;
            let passwordGitData = false;
            let passphraseData = false;
            let s3IdData = false;
            let s3KeyData = false;
            let ghTokenData = false;
            let glTokenData = false;
            let netlifyIdData = false;
            let netlifyTokenData = false;
            let siteID = slug(config.settings.name);

            if (config.settings.uuid) {
                siteID = config.settings.uuid;
            }

            // Save the password in the keychain
            if (passwordSafeStorage) {
                try {
                    if (
                        config.settings.deployment.password !== '' && 
                        config.settings.deployment.password !== 'publii ' + siteID
                    ) {
                        passwordData = await self.loadPassword(
                            config.settings,
                            'publii',
                            config.settings.deployment.password
                        );
                        config.settings.deployment.password = passwordData.toSave;
                    }

                    if (
                        config.settings.deployment.git.password !== '' && 
                        config.settings.deployment.git.password !== 'publii-git-password ' + siteID
                    ) {
                        passwordGitData = await self.loadPassword(
                            config.settings,
                            'publii-git-password',
                            config.settings.deployment.git.password
                        );
                        config.settings.deployment.git.password = passwordGitData.toSave;
                    }

                    if (
                        config.settings.deployment.passphrase !== '' && 
                        config.settings.deployment.passphrase !== 'publii-passphrase ' + siteID
                    ) {
                        passphraseData = await self.loadPassword(
                            config.settings,
                            'publii-passphrase',
                            config.settings.deployment.passphrase
                        );
                        config.settings.deployment.passphrase = passphraseData.toSave;
                    }

                    if (
                        config.settings.deployment.s3.id !== '' && 
                        config.settings.deployment.s3.key !== '' && 
                        config.settings.deployment.s3.id !== 'publii-s3-id ' + siteID
                    ) {
                        s3IdData = await self.loadPassword(
                            config.settings,
                            'publii-s3-id',
                            config.settings.deployment.s3.id
                        );
                        s3KeyData = await self.loadPassword(
                            config.settings,
                            'publii-s3-key',
                            config.settings.deployment.s3.key
                        );
                        config.settings.deployment.s3.id = s3IdData.toSave;
                        config.settings.deployment.s3.key = s3KeyData.toSave;
                    }

                    if (
                        config.settings.deployment.github.token !== '' &&
                        config.settings.deployment.github.token !== 'publii-gh-token ' + siteID
                    ) {
                        ghTokenData = await self.loadPassword(
                            config.settings,
                            'publii-gh-token',
                            config.settings.deployment.github.token
                        );
                        config.settings.deployment.github.token = ghTokenData.toSave;
                    }

                    if (
                        config.settings.deployment.gitlab.token !== '' && 
                        config.settings.deployment.gitlab.token !== 'publii-gl-token ' + siteID
                    ) {
                        glTokenData = await self.loadPassword(
                            config.settings,
                            'publii-gl-token',
                            config.settings.deployment.gitlab.token
                        );
                        config.settings.deployment.gitlab.token = glTokenData.toSave;
                    }

                    if (
                        config.settings.deployment.netlify.id !== '' && 
                        config.settings.deployment.netlify.token !== '' &&
                        config.settings.deployment.netlify.token !== 'publii-netlify-token ' + siteID
                    ) {
                        netlifyIdData = await self.loadPassword(
                            config.settings,
                            'publii-netlify-id',
                            config.settings.deployment.netlify.id
                        );
                        netlifyTokenData = await self.loadPassword(
                            config.settings,
                            'publii-netlify-token',
                            config.settings.deployment.netlify.token
                        );
                        config.settings.deployment.netlify.id = netlifyIdData.toSave;
                        config.settings.deployment.netlify.token = netlifyTokenData.toSave;
                    }
                } catch (error) {
                    event.sender.send('app-site-config-saved', {
                        status: false,
                        message: 'no-keyring'
                    });

                    return;
                }
            }

            // Save config
            fs.writeFileSync(configFile, JSON.stringify(config.settings, null, 4));

            if(passwordData && passwordData.newPassword) {
                config.settings.deployment.password = passwordData.newPassword;
            }

            if(passwordGitData && passwordGitData.newPassword) {
                config.settings.deployment.git.password = passwordGitData.newPassword;
            }

            if(passphraseData && passphraseData.newPassword) {
                config.settings.deployment.passphrase = passphraseData.newPassword;
            }

            if(s3IdData && s3IdData.newPassword) {
                config.settings.deployment.s3.id = s3IdData.newPassword;
            }

            if(s3KeyData && s3KeyData.newPassword) {
                config.settings.deployment.s3.key = s3KeyData.newPassword;
            }

            if(ghTokenData && ghTokenData.newPassword) {
                config.settings.deployment.github.token = ghTokenData.newPassword;
            }

            if(netlifyIdData && netlifyIdData.newPassword) {
                config.settings.deployment.netlify.id = netlifyIdData.newPassword;
            }

            if(netlifyTokenData && netlifyTokenData.newPassword) {
                config.settings.deployment.netlify.token = netlifyTokenData.newPassword;
            }

            appInstance.sites[config.settings.name] = config.settings;

            let themesHelper = new Themes(appInstance, { site: siteName });
            let themeConfigPath = path.join(appInstance.sitesDir, siteName, 'input', 'config', 'theme.config.json');

            if (fs.existsSync(themeConfigPath)) {
                let themeConfigString = fs.readFileSync(themeConfigPath, 'utf8');
                themesHelper.checkAndCleanImages(themeConfigString);
            }

            // Send success message
            event.sender.send('app-site-config-saved', {
                status: true,
                siteName: siteName,
                message: 'success-save',
                themeName: config.settings.theme,
                newThemeConfig: newThemeConfig,
                thumbnailsRegenerateRequired: thumbnailsRegenerateRequired
            });
        });

        /*
         * Switch website
         */
        ipcMain.on('app-site-switch', (event, config) => {
            let result = appInstance.switchSite(config.site);
            let language = this.getSiteLanguage(appInstance, config.site);
            this.setSpellcheckerLanguage (appInstance, language);
            event.sender.send('app-site-switched', result);
        });

        /*
         * Refresh website data
         */
        ipcMain.on('app-site-refresh', function (event, config) {
            let result = appInstance.switchSite(config.site);
            event.sender.send('app-site-refreshed', result);
        });

        /*
         * Save site theme config
         */
        ipcMain.on('app-site-theme-config-save', function (event, data) {
            let siteData = {
                site: data.site
            };
            let newConfig = data.config;
            let themeName = data.theme;
            let themePath = path.join(appInstance.sitesDir, data.site, 'input', 'themes', themeName);
            let themeConfigPath = path.join(appInstance.sitesDir, data.site, 'input', 'config', 'theme.config.json');
            let themesHelper = new Themes(appInstance, siteData);
            themesHelper.updateThemeConfig(newConfig);
            let themeConfig = Themes.loadThemeConfig(themeConfigPath, themePath);

            event.sender.send('app-site-theme-config-saved', {
                status: true,
                newConfig: {
                    config: themeConfig.config,
                    customConfig: themeConfig.customConfig,
                    pageConfig: themeConfig.pageConfig,
                    postConfig: themeConfig.postConfig,
                    tagConfig: themeConfig.tagConfig,
                    authorConfig: themeConfig.authorConfig,
                    defaultTemplates: themeConfig.defaultTemplates
                }
            });
        });

        /*
         * Create new website
         */
        ipcMain.on('app-site-create', function (event, config, authorName) {
            config.name = slug(config.name);

            if (config.name.trim() === '') {
                event.sender.send('app-site-creation-error', {
                    name: config.name.trim() === '',
                    author: slug(authorName).trim() === ''
                });

                return;
            }

            let site = new Site(appInstance, config);
            let result = site.create(authorName);

            if (result === 'db-error') {
                event.sender.send('app-site-creation-db-error');
                return;
            }

            if (result === 'duplicate') {
                event.sender.send('app-site-creation-duplicate');
                return;
            }

            config.uuid = site.uuid;
            config.theme = 'simple';
            appInstance.sites[config.name] = config;

            // Load newly created db
            let siteDir = path.join(appInstance.sitesDir, config.name);
            let dbPath = path.join(siteDir, 'input', 'db.sqlite');

            if (appInstance.db) {
                try {
                    appInstance.db.close();
                } catch (e) {
                    console.log('[SITE CREATION] DB already closed');
                }
            }

            appInstance.db = new DBUtils(new Database(dbPath));

            result = {
                siteConfig: appInstance.sites[config.name],
                siteDir: siteDir,
                authorName: authorName
            };

            event.sender.send('app-site-created', result);
        });

        /*
         * Regenerate thumbnails
         */
        ipcMain.on('app-site-regenerate-thumbnails', function(event, config) {
            let site = new Site(appInstance, config, true);
            self.regenerateProcess = site.regenerateThumbnails(event.sender);
        });

        ipcMain.on('app-site-abort-regenerate-thumbnails', function(event, config) {
            if (self.regenerateProcess) {
                self.regenerateProcess.send({
                    type: 'abort'
                });
                
                self.regenerateProcess = false;
            }
        });

        /*
         * Regenerate thumbnails stauts
         */
        ipcMain.on('app-site-regenerate-thumbnails-required', function(event, config) {
            let site = new Site(appInstance, config, true);
            site.regenerateThumbnailsIsRequired(event.sender);
        });

        /*
         * Delete website
         */
        ipcMain.on('app-site-delete', function (event, config) {
            Site.delete(appInstance, config.site);
            delete appInstance.sites[config.site];
            event.sender.send('app-site-deleted', true);
        });

        /*
         * Clone website
         */
        ipcMain.on('app-site-clone', function (event, config) {
            let clonedWebsiteData = Site.clone(appInstance, config.catalogName, config.siteName);
            event.sender.send('app-site-cloned', clonedWebsiteData);
        });

        /*
         * Save custom CSS
         */
        ipcMain.on('app-site-css-save', function (event, config) {
            Site.saveCustomCSS(appInstance, config.site, config.code);
            event.sender.send('app-site-css-saved', true);
        });

        /*
         * Load custom CSS
         */
        ipcMain.on('app-site-css-load', function (event, config) {
            let customCSS = Site.loadCustomCSS(appInstance, config.site);
            event.sender.send('app-site-css-loaded', customCSS);
        });

        /*
         * Check website catalog name
         */
        ipcMain.on('app-site-check-website-to-restore', async function (event, config) {
            let result = await Site.checkWebsiteBackup(appInstance, config.backupPath);
            event.sender.send('app-site-backup-checked', result);
        });

        /*
         * Check website catalog availability
         */
        ipcMain.on('app-site-check-website-catalog-availability', function (event, config) {
            let result = Site.checkWebsiteCatalogAvailability(appInstance, config.siteName);
            event.sender.send('app-site-website-catalog-availability-checked', result);
        });

        /*
         * Remove temp backup files 
         */
        ipcMain.on('app-site-remove-temporary-backup-files', function (event, config) {
            let tempBackupDir = path.join(appInstance.appDir, 'temp', 'backup-to-restore');

            if (fs.existsSync(tempBackupDir)) {
                fs.emptyDirSync(tempBackupDir);
            }
        });

        /*
         * Restore website from backup
         */
        ipcMain.on('app-site-restore-from-backup', function (event, config) {
            let result = Site.restoreFromBackup(appInstance, config.siteName);
            event.sender.send('app-site-restored-from-backup', result);
        });
    }

    prepareThemeName(themeName) {
        if(!themeName) {
            return false;
        }

        return themeName.replace('install-use-', '')
                        .replace('uninstall-', '')
                        .replace('use-', '');
    }

    async loadPassword(settings, type, newPassword) {
        let account = slug(settings.name);

        if (settings.uuid) {
            account = settings.uuid;
        }

        if (!settings.deployment.askforpassword || type !== 'publii') {
            let existingPassword = await passwordSafeStorage.getPassword(type, account);

            if (newPassword !== '') {
                if (newPassword === 'publii ' + account) {
                    newPassword = existingPassword;
                } else {
                    await passwordSafeStorage.setPassword(type, account, newPassword);
                }
            } else if (existingPassword !== null) {
                // Remove the password from the storage if it still exists
                // and user provided an empty password now
                await passwordSafeStorage.deletePassword(type, account);
            }

            return {
                newPassword: newPassword,
                toSave: type + ' ' + account
            };
        }

        await passwordSafeStorage.deletePassword(type, account);

        return {
            newPassword: '',
            toSave: ''
        };
    }

    getSiteLanguage (appInstance, siteName) {
        if (process.platform === 'darwin' || !siteName) {
            return 'null';
        }

        let configPath = path.join(appInstance.sitesDir, siteName, 'input', 'config', 'site.config.json');
        let config = fs.readFileSync(configPath, 'utf8');
        
        try {
            config = JSON.parse(config);

            if (config.language) {
                if (config.language === 'custom') {
                    return config.customLanguage;
                }

                return config.language;
            }
        } catch (e) {
            console.log('(!) An error occurred during detecting site language');
        }

        return 'null';
    }

    setSpellcheckerLanguage (appInstance, language) {
        if (process.platform === 'darwin') {
            return;
        }

        let availableLanguages = appInstance.mainWindow.webContents.session.availableSpellCheckerLanguages;
        language = language.toLocaleLowerCase();
        language = language.split('-');

        if (language[1]) {
            language = language[0] + '-' + language[1].toLocaleUpperCase();
        } else {
            language = language[0];
        }

        if (availableLanguages.indexOf(language) > -1) {
            appInstance.mainWindow.webContents.session.setSpellCheckerLanguages([language]);
            console.log('Set spellchecker to:', language);
            return;
        }

        language = language.split('-');
        language = language[0];

        if (availableLanguages.indexOf(language) > -1) {
            appInstance.mainWindow.webContents.session.setSpellCheckerLanguages([language]);
            console.log('Set spellchecker to:', language);
            return;
        }

        console.log('(!) Unable to set spellchecker to use selected language - ' + language);
    }

    removeGitConfigDirectory (appInstance, siteName) {
        let gitDirPath = path.join(appInstance.sitesDir, siteName, 'output', '.git');

        if (UtilsHelper.dirExists(gitDirPath)) {
            fs.removeSync(gitDirPath);
        }
    }
}

module.exports = SiteEvents;
