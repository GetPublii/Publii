const fs = require('fs-extra');
const path = require('path');
const slug = require('./../helpers/slug');
const passwordSafeStorage = require('keytar');
const ipcMain = require('electron').ipcMain;
const Site = require('../site.js');
const Themes = require('../themes.js');
const sql = require('../vendor/sql.js');
const UtilsHelper = require('../helpers/utils.js');
const normalizePath = require('normalize-path');
const URLHelper = require('../modules/render-html/helpers/url.js');

/*
 * Events for the IPC communication regarding single sites
 */

class SiteEvents {
    constructor(appInstance) {
        let self = this;

        /*
         * Reload site config and data
         */
        ipcMain.on('app-site-reload', function(event, config) {
            let result = appInstance.reloadSite(config.siteName);
            event.sender.send('app-site-reloaded', result);
        });

        /*
         * Save site config
         */
        ipcMain.on('app-site-config-save', function (event, config) {
            let siteName = '';
            let siteNames = Object.keys(appInstance.sites);
            let themeChanged = false;

            if (siteNames.indexOf(config.site) !== -1) {
                siteName = config.site;
            } else {
                event.sender.send('app-site-config-saved', {
                    status: false,
                    message: 'site-not-exists'
                });
            }

            // Prepare settings
            config.settings.name = slug(config.settings.name);
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
                    // If yes - rename the dir
                    delete appInstance.sites[siteName];
                    siteName = config.settings.name;
                    fs.renameSync(
                        path.join(appInstance.sitesDir, config.site),
                        path.join(appInstance.sitesDir, config.settings.name)
                    );

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
                siteName !== '' &&
                config.settings.name !== ''
            ) {
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
                        themeChanged = true;
                    }

                    config.settings.theme = themes.changeTheme(config.settings.theme, oldConfig.theme);
                    let themeConfigPath = path.join(appInstance.sitesDir, siteName, 'input', 'config', 'theme.config.json');
                    let themePath = path.join(themesPath, config.settings.theme);
                    newThemeConfig = Themes.loadThemeConfig(themeConfigPath, themePath);
                }

                if(
                    config.settings.advanced &&
                    config.settings.advanced.ampImage &&
                    config.settings.advanced.ampImage !== ''
                ) {
                    let filename = path.parse(config.settings.advanced.ampImage);
                    config.settings.advanced.ampImage = filename.base;
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
                let passphraseData = false;
                let s3IdData = false;
                let s3KeyData = false;
                let ghTokenData = false;
                let glTokenData = false;
                let netlifyIdData = false;
                let netlifyTokenData = false;

                // Save the password in the keychain
                if(passwordSafeStorage) {
                    if(config.settings.deployment.password !== '') {
                        passwordData = self.loadPassword(
                            config.settings,
                            'publii',
                            config.settings.deployment.password
                        );
                        config.settings.deployment.password = passwordData.toSave;
                    }

                    if(config.settings.deployment.passphrase !== '') {
                        passphraseData = self.loadPassword(
                            config.settings,
                            'publii-passphrase',
                            config.settings.deployment.passphrase
                        );
                        config.settings.deployment.passphrase = passphraseData.toSave;
                    }

                    if(config.settings.deployment.s3.id !== '' && config.settings.deployment.s3.key !== '') {
                        s3IdData = self.loadPassword(
                            config.settings,
                            'publii-s3-id',
                            config.settings.deployment.s3.id
                        );
                        s3KeyData = self.loadPassword(
                            config.settings,
                            'publii-s3-key',
                            config.settings.deployment.s3.key
                        );
                        config.settings.deployment.s3.id = s3IdData.toSave;
                        config.settings.deployment.s3.key = s3KeyData.toSave;
                    }

                    if(config.settings.deployment.github.token !== '') {
                        ghTokenData = self.loadPassword(
                            config.settings,
                            'publii-gh-token',
                            config.settings.deployment.github.token
                        );
                        config.settings.deployment.github.token = ghTokenData.toSave;
                    }

                    if(config.settings.deployment.gitlab.token !== '') {
                        glTokenData = self.loadPassword(
                            config.settings,
                            'publii-gl-token',
                            config.settings.deployment.gitlab.token
                        );
                        config.settings.deployment.gitlab.token = glTokenData.toSave;
                    }

                    if(config.settings.deployment.netlify.id !== '' && config.settings.deployment.netlify.token !== '') {
                        netlifyIdData = self.loadPassword(
                            config.settings,
                            'publii-netlify-id',
                            config.settings.deployment.netlify.id
                        );
                        netlifyTokenData = self.loadPassword(
                            config.settings,
                            'publii-netlify-token',
                            config.settings.deployment.netlify.token
                        );
                        config.settings.deployment.netlify.id = netlifyIdData.toSave;
                        config.settings.deployment.netlify.token = netlifyTokenData.toSave;
                    }
                }

                // Save config
                fs.writeFileSync(configFile, JSON.stringify(config.settings));

                if(passwordData && passwordData.newPassword) {
                    config.settings.deployment.password = passwordData.newPassword;
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

                // Send success message
                event.sender.send('app-site-config-saved', {
                    status: true,
                    siteName: siteName,
                    message: 'success-save',
                    themeName: config.settings.theme,
                    newThemeConfig: newThemeConfig,
                    themeChanged: themeChanged
                });
            } else {
                event.sender.send('app-site-config-saved', {
                    status: false,
                    message: 'empty-name'
                });
            }
        });

        /*
         * Switch website
         */
        ipcMain.on('app-site-switch', function (event, config) {
            let result = appInstance.switchSite(config.site);
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
                    postConfig: themeConfig.postConfig
                }
            });
        });

        /*
         * Create new website
         */
        ipcMain.on('app-site-create', function (event, config, authorName) {
            config.name = slug(config.name);
            let site = new Site(appInstance, config);
            let result = site.create(authorName);
            appInstance.sites[config.name] = config;

            // Load newly created db
            let siteDir = path.join(appInstance.sitesDir, config.name);
            let dbPath = path.join(siteDir, 'input', 'db.sqlite');
            let input = fs.readFileSync(dbPath);
            appInstance.db = new sql.Database(input);

            if(result !== false) {
                result = {
                    siteConfig: appInstance.sites[config.name],
                    siteDir: siteDir,
                    authorName: authorName
                }
            }

            event.sender.send('app-site-created', result);
        });

        /*
         * Regenerate thumbnails
         */
        ipcMain.on('app-site-regenerate-thumbnails', function(event, config) {
            let site = new Site(appInstance, config, true);
            site.regenerateThumbnails(event.sender);
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
    }

    prepareThemeName(themeName) {
        if(!themeName) {
            return false;
        }

        return themeName.replace('install-use-', '')
                        .replace('uninstall-', '')
                        .replace('use-', '');
    }

    loadPassword(settings, type, newPassword) {
        let account = slug(settings.name);

        if (!settings.deployment.askforpassword || type !== 'publii') {
            let existingPassword = passwordSafeStorage.getPassword(type, account);

            if (newPassword !== '') {
                if (existingPassword !== null) {
                    passwordSafeStorage.replacePassword(type, account, newPassword);
                } else {
                    passwordSafeStorage.addPassword(type, account, newPassword);
                }
            } else if (existingPassword !== null) {
                // Remove the password from the storage if it still exists
                // and user provided an empty password now
                passwordSafeStorage.deletePassword(type, account);
            }

            return {
                newPassword: newPassword,
                toSave: type + ' ' + account
            };
        }

        passwordSafeStorage.deletePassword(type, account);

        return {
            newPassword: '',
            toSave: ''
        };
    }
}

module.exports = SiteEvents;
