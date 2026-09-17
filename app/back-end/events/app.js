const fs = require('fs-extra');
const path = require('path');
const FileHelper = require('../helpers/file.js');
const ipcMain = require('electron').ipcMain;
const Themes = require('../themes.js');
const Languages = require('../languages.js');
const Plugins = require('../plugins.js');
const AppFiles = require('../helpers/app-files.js');
const PathValidator = require('../helpers/path-validator.js');
const UtilsHelper = require('../helpers/utils.js');
const SiteLogs = require('../helpers/site-logs.js');
const ZipHelper = require('./../helpers/zip.helper.js');

const { isValidDirSegment } = PathValidator;

/*
 * Events for the IPC communication regarding app
 */

class AppEvents {
    constructor(appInstance) {
        /*
         * Close app
         */
        ipcMain.on('app-close', function(event, config) {
            appInstance.app.quit();
        });
        
        /*
         * Save licence acceptance
         */
        ipcMain.on('app-license-accept', function (event) {
            appInstance.appConfig.licenseAccepted = true;
            fs.writeFileSync(appInstance.appConfigPath, JSON.stringify(appInstance.appConfig, null, 4));

            event.sender.send('app-license-accepted', true);
        });

        /*
         * Save app config
         */
        ipcMain.on('app-config-save', function (event, config) {
            if (config.sitesLocation === '') {
                config.sitesLocation = appInstance.dirPaths.sites;
            }

            let otherWindowsOpen = !!appInstance.windowManager && appInstance.windowManager.getAllWindows().length > 1;

            // Backups lists and operations of other windows still point to the current backups location
            if (otherWindowsOpen && (config.backupsLocation || '') !== (appInstance.appConfig.backupsLocation || '')) {
                event.sender.send('app-config-saved', {
                    status: false,
                    message: 'error-save',
                    reason: 'backups-location-other-windows'
                });

                return;
            }

            if (config.sitesLocation !== appInstance.appConfig.sitesLocation) {
                if (appInstance.appConfig.sitesLocation) {
                    // Other windows keep working on the databases and paths from the current location
                    if (otherWindowsOpen) {
                        event.sender.send('app-config-saved', {
                            status: false,
                            message: 'error-save',
                            reason: 'other-windows-open'
                        });

                        return;
                    }

                    let appFilesHelper = new AppFiles(appInstance);
                    appInstance.closeAllDbs();

                    setTimeout(() => {
                        let result = false;
                        let reason = null;
                        let reasonDetail = null;

                        try {
                            if (config.changeSitesLocationWithoutCopying) {
                                if (UtilsHelper.dirExists(config.sitesLocation)) {
                                    appFilesHelper.saveConfig(config);
                                    appInstance.sitesDir = config.sitesLocation;
                                    appInstance.app.sitesDir = config.sitesLocation;
                                    result = true;
                                } else {
                                    reason = 'location-missing';
                                }
                            } else {
                                const relocation = appFilesHelper.relocateSites(
                                    appInstance.appConfig.sitesLocation,
                                    config.sitesLocation,
                                    () => appFilesHelper.saveConfig(config)
                                );
                                result = relocation.status;
                                reason = relocation.reason || null;
                                reasonDetail = relocation.detail || null;
                            }

                            if (result) {
                                appInstance.appConfig = config;
                            }
                        } catch (error) {
                            console.log('Unable to change websites location:', error);
                        }

                        appInstance.loadSites();

                        event.sender.send('app-config-saved', {
                            status: result,
                            message: result ? 'success-save' : 'error-save',
                            reason: reason,
                            reasonDetail: reasonDetail,
                            sites: appInstance.sites
                        });
                        appInstance.notifySitesListChanged(event.sender.id);

                        if (result) {
                            appInstance.notifyAppConfigChanged(event.sender.id);
                        }
                    }, 500);

                    return;
                }
            }

            event.sender.send('app-config-saved', {
                status: true,
                message: 'success-save'
            });

            fs.writeFileSync(appInstance.appConfigPath, JSON.stringify(config, null, 4));
            appInstance.appConfig = config;
            appInstance.notifyAppConfigChanged(event.sender.id);
        });

        /*
         * Retry loading websites when the sites folder was not found at startup,
         * optionally switching to a different folder (no files are moved)
         */
        ipcMain.on('app-sites-location-retry', function (event, data) {
            let requestedLocation = data && typeof data.sitesLocation === 'string' ? data.sitesLocation.trim() : '';
            let reply = payload => event.sender.send('app-sites-location-retried', payload);

            if (requestedLocation !== '' && requestedLocation !== appInstance.sitesDir) {
                if (!UtilsHelper.dirExists(requestedLocation)) {
                    reply({
                        status: false,
                        reason: 'location-missing',
                        checkedLocation: requestedLocation
                    });
                    return;
                }

                let previousLocation = appInstance.sitesDir;

                try {
                    appInstance.setSitesDir(requestedLocation);
                    new AppFiles(appInstance).saveConfig(appInstance.appConfig);
                } catch (error) {
                    console.log('Unable to change websites location:', error);
                    appInstance.setSitesDir(previousLocation);
                    reply({
                        status: false,
                        reason: 'config-save-error',
                        checkedLocation: requestedLocation
                    });
                    return;
                }
            }

            let status = appInstance.loadSites();

            reply({
                status: status,
                reason: status ? null : 'location-missing',
                checkedLocation: appInstance.sitesDir,
                sitesLocation: appInstance.sitesDir,
                sites: appInstance.sites
            });
            appInstance.notifySitesListChanged(event.sender.id);
        });

        /*
         * Save app color theme config
         */
        ipcMain.on('app-save-color-theme', function (event, theme) {
            if (['system', 'dark', 'default'].indexOf(theme) === -1) {
                return;
            }

            let appConfig = FileHelper.readFileSync(appInstance.appConfigPath, 'utf8');

            try {
                appConfig = JSON.parse(appConfig);
                appConfig.appTheme = theme;
                fs.writeFileSync(appInstance.appConfigPath, JSON.stringify(appConfig, null, 4));
                // New windows take their background color from the in-memory config
                appInstance.appConfig.appTheme = theme;
            } catch (e) {
                console.log('(!) App was unable to save the color theme');
            }

            // Other windows must follow this choice instead of re-applying their previous theme
            if (appInstance.windowManager) {
                appInstance.windowManager.broadcast('app-theme-updated', theme, event.sender.id);
            }
        });

        /*
         * Delete theme
         */
        ipcMain.on('app-theme-delete', function(event, config) {
            if (!config || !isValidDirSegment(config.directory)) {
                event.sender.send('app-theme-deleted', {
                    status: false,
                    themes: appInstance.themes
                });
                return;
            }

            let themesLoader = new Themes(appInstance);
            themesLoader.removeTheme(config.directory);

            appInstance.themes = appInstance.themes.filter(function (theme) {
                return theme.name !== config.name;
            });

            event.sender.send('app-theme-deleted', {
                status: true,
                themes: appInstance.themes
            });
            appInstance.notifyExtensionsChanged(event.sender.id);
        });

        /*
         * Delete language
         */
        ipcMain.on('app-language-delete', function(event, config) {
            if (!config || !isValidDirSegment(config.directory)) {
                event.sender.send('app-language-deleted', {
                    status: false,
                    languages: appInstance.languages
                });
                return;
            }

            let languagesLoader = new Languages(appInstance);
            languagesLoader.removeLanguage(config.directory);

            appInstance.languages = appInstance.languages.filter(function (language) {
                return language.name !== config.name;
            });

            event.sender.send('app-language-deleted', {
                status: true,
                languages: appInstance.languages
            });
            appInstance.notifyExtensionsChanged(event.sender.id);
        });

        /*
         * Delete plugin
         */
        ipcMain.on('app-plugin-delete', function(event, config) {
            if (!config || !isValidDirSegment(config.directory)) {
                event.sender.send('app-plugin-deleted', {
                    status: false,
                    plugins: appInstance.plugins
                });
                return;
            }

            let pluginsLoader = new Plugins(appInstance.appDir, appInstance.sitesDir);
            pluginsLoader.removePlugin(config.directory);

            appInstance.plugins = appInstance.plugins.filter(function (plugin) {
                return plugin.name !== config.name;
            });

            event.sender.send('app-plugin-deleted', {
                status: true,
                plugins: appInstance.plugins
            });
            appInstance.notifyExtensionsChanged(event.sender.id);
        });

        /*
         * Add new theme
         */
        ipcMain.on('app-theme-upload', function(event, config) {
            let themesLoader = new Themes(appInstance);
            let newThemeDir = path.parse(config.sourcePath).name;
            let extension = path.parse(config.sourcePath).ext;
            let status = '';

            if (extension === '.zip' || extension === '') {
                if (extension === '.zip') {
                    let zipPath = path.join(themesLoader.themesPath, '__TEMP__');

                    try {
                        ZipHelper.extractZipSafely(config.sourcePath, zipPath);
                    } catch (e) {
                        event.sender.send('app-theme-uploaded', {
                            status: 'wrong-format',
                            themes: appInstance.themes
                        });

                        UtilsHelper.removePathRecursively(zipPath);

                        return;
                    }

                    let dirs = fs.readdirSync(zipPath).filter(function(file) {
                        if(file.substr(0,1) === '_' || file.substr(0,1) === '.') {
                            return false;
                        }

                        return fs.statSync(path.join(zipPath, file)).isDirectory();
                    });

                    if (dirs.length !== 1) {
                        event.sender.send('app-theme-uploaded', {
                            status: 'wrong-format',
                            themes: appInstance.themes
                        });

                        UtilsHelper.removePathRecursively(zipPath);

                        return;
                    }

                    newThemeDir = dirs[0];

                    if (!isValidDirSegment(newThemeDir)) {
                        event.sender.send('app-theme-uploaded', {
                            status: 'wrong-format',
                            themes: appInstance.themes
                        });

                        UtilsHelper.removePathRecursively(zipPath);

                        return;
                    }
                    let directoryPath = path.join(themesLoader.themesPath, newThemeDir);

                    try {
                        fs.statSync(directoryPath);
                        status = 'updated';
                        UtilsHelper.removePathRecursively(directoryPath);
                    } catch (e) {
                        status = 'added';
                    }

                    fs.copySync(path.join(zipPath, newThemeDir), directoryPath);
                    UtilsHelper.removePathRecursively(zipPath);
                    appInstance.themes = themesLoader.loadThemes();

                    event.sender.send('app-theme-uploaded', {
                        status: status,
                        directory: newThemeDir,
                        themes: appInstance.themes
                    });
                    appInstance.notifyExtensionsChanged(event.sender.id);

                    return;
                } else if (!isValidDirSegment(newThemeDir)) {
                    status = 'wrong-format';
                } else {
                    let directoryPath = path.join(themesLoader.themesPath, newThemeDir);

                    try {
                        fs.statSync(directoryPath);
                        status = 'updated';
                        UtilsHelper.removePathRecursively(directoryPath);
                    } catch (e) {
                        status = 'added';
                    }

                    fs.copySync(config.sourcePath, directoryPath);
                    appInstance.themes = themesLoader.loadThemes();
                }
            } else {
                status = 'wrong-format';
            }

            event.sender.send('app-theme-uploaded', {
                status: status,
                directory: newThemeDir,
                themes: appInstance.themes
            });

            if (status === 'added' || status === 'updated') {
                appInstance.notifyExtensionsChanged(event.sender.id);
            }
        });

        /*
         * Add new language
         */
        ipcMain.on('app-language-upload', function(event, config) {
            let languagesLoader = new Languages(appInstance);
            let newLanguageDir = path.parse(config.sourcePath).name;
            let extension = path.parse(config.sourcePath).ext;
            let status = '';

            if (extension === '.zip' || extension === '') {
                if (extension === '.zip') {
                    let zipPath = path.join(languagesLoader.languagesPath, '__TEMP__');

                    try {
                        ZipHelper.extractZipSafely(config.sourcePath, zipPath);
                    } catch (e) {
                        event.sender.send('app-language-uploaded', {
                            status: 'wrong-format',
                            languages: appInstance.languages
                        });

                        UtilsHelper.removePathRecursively(zipPath);

                        return;
                    }

                    let dirs = fs.readdirSync(zipPath).filter(function(file) {
                        if(file.substr(0,1) === '_' || file.substr(0,1) === '.') {
                            return false;
                        }

                        return fs.statSync(path.join(zipPath, file)).isDirectory();
                    });

                    if (dirs.length !== 1) {
                        event.sender.send('app-language-uploaded', {
                            status: 'wrong-format',
                            languages: appInstance.languages
                        });

                        UtilsHelper.removePathRecursively(zipPath);

                        return;
                    }

                    newLanguageDir = dirs[0];

                    if (!isValidDirSegment(newLanguageDir)) {
                        event.sender.send('app-language-uploaded', {
                            status: 'wrong-format',
                            languages: appInstance.languages
                        });

                        UtilsHelper.removePathRecursively(zipPath);

                        return;
                    }

                    let directoryPath = path.join(languagesLoader.languagesPath, newLanguageDir);

                    try {
                        fs.statSync(directoryPath);
                        status = 'updated';
                        UtilsHelper.removePathRecursively(directoryPath);
                    } catch (e) {
                        status = 'added';
                    }

                    fs.copySync(path.join(zipPath, newLanguageDir), directoryPath);
                    UtilsHelper.removePathRecursively(zipPath);
                    appInstance.languages = languagesLoader.loadLanguages();

                    event.sender.send('app-language-uploaded', {
                        status: status,
                        languages: appInstance.languages
                    });
                    appInstance.notifyExtensionsChanged(event.sender.id);

                    return;
                } else if (!isValidDirSegment(newLanguageDir)) {
                    status = 'wrong-format';
                } else {
                    let directoryPath = path.join(languagesLoader.languagesPath, newLanguageDir);

                    try {
                        fs.statSync(directoryPath);
                        status = 'updated';
                        UtilsHelper.removePathRecursively(directoryPath);
                    } catch (e) {
                        status = 'added';
                    }

                    fs.copySync(config.sourcePath, directoryPath);
                    appInstance.languages = languagesLoader.loadLanguages();
                }
            } else {
                status = 'wrong-format';
            }

            event.sender.send('app-language-uploaded', {
                status: status,
                languages: appInstance.languages
            });

            if (status === 'added' || status === 'updated') {
                appInstance.notifyExtensionsChanged(event.sender.id);
            }
        });

        /*
         * Add new plugin
         */
        ipcMain.on('app-plugin-upload', function(event, config) {
            let pluginsLoader = new Plugins(appInstance.appDir, appInstance.sitesDir);
            let newPluginDir = path.parse(config.sourcePath).name;
            let extension = path.parse(config.sourcePath).ext;
            let status = '';

            if (extension === '.zip' || extension === '') {
                if (extension === '.zip') {
                    let zipPath = path.join(pluginsLoader.pluginsPath, '__TEMP__');

                    try {
                        ZipHelper.extractZipSafely(config.sourcePath, zipPath);
                    } catch (e) {
                        event.sender.send('app-plugin-uploaded', {
                            status: 'wrong-format',
                            plugins: appInstance.plugins
                        });

                        UtilsHelper.removePathRecursively(zipPath);

                        return;
                    }

                    let dirs = fs.readdirSync(zipPath).filter(function(file) {
                        if(file.substr(0,1) === '_' || file.substr(0,1) === '.') {
                            return false;
                        }

                        return fs.statSync(path.join(zipPath, file)).isDirectory();
                    });

                    if (dirs.length !== 1) {
                        event.sender.send('app-plugin-uploaded', {
                            status: 'wrong-format',
                            plugins: appInstance.plugins
                        });

                        UtilsHelper.removePathRecursively(zipPath);

                        return;
                    }

                    newPluginDir = dirs[0];

                    if (!isValidDirSegment(newPluginDir)) {
                        event.sender.send('app-plugin-uploaded', {
                            status: 'wrong-format',
                            plugins: appInstance.plugins
                        });

                        UtilsHelper.removePathRecursively(zipPath);

                        return;
                    }

                    let directoryPath = path.join(pluginsLoader.pluginsPath, newPluginDir);

                    try {
                        fs.statSync(directoryPath);
                        status = 'updated';
                        UtilsHelper.removePathRecursively(directoryPath);
                    } catch (e) {
                        status = 'added';
                    }

                    fs.copySync(path.join(zipPath, newPluginDir), directoryPath);
                    UtilsHelper.removePathRecursively(zipPath);
                    appInstance.plugins = pluginsLoader.loadPlugins();

                    event.sender.send('app-plugin-uploaded', {
                        status: status,
                        plugins: appInstance.plugins
                    });
                    appInstance.notifyExtensionsChanged(event.sender.id);

                    return;
                } else if (!isValidDirSegment(newPluginDir)) {
                    status = 'wrong-format';
                } else {
                    let directoryPath = path.join(pluginsLoader.pluginsPath, newPluginDir);

                    try {
                        fs.statSync(directoryPath);
                        status = 'updated';
                        UtilsHelper.removePathRecursively(directoryPath);
                    } catch (e) {
                        status = 'added';
                    }

                    fs.copySync(config.sourcePath, directoryPath);
                    appInstance.plugins = pluginsLoader.loadPlugins();
                }
            } else {
                status = 'wrong-format';
            }

            event.sender.send('app-plugin-uploaded', {
                status: status,
                plugins: appInstance.plugins
            });

            if (status === 'added' || status === 'updated') {
                appInstance.notifyExtensionsChanged(event.sender.id);
            }
        });

        /*
         * Load log files list
         */
        ipcMain.on('app-log-files-load', function(event, siteName) {
            // Logs of the given website and the general logs of the app - never logs of other websites
            let logs = SiteLogs.list(appInstance, siteName);

            event.sender.send('app-log-files-loaded', {
                files: logs.site.concat(logs.app),
                siteFiles: logs.site,
                appFiles: logs.app
            });
        });

        /*
         * Load specific log file
         */
        ipcMain.on('app-log-file-load', function(event, request) {
            let siteName = request && typeof request === 'object' ? request.site : '';
            let filename = request && typeof request === 'object' ? request.filename : request;
            let filePath = SiteLogs.resolveFile(appInstance, siteName, filename);

            if (!filePath) {
                event.sender.send('app-log-file-loaded', {
                    fileContent: 'File not found!'
                });
                return;
            }

            let fileContent = FileHelper.readFileSync(filePath, 'utf8');

            event.sender.send('app-log-file-loaded', {
                fileContent: fileContent
            });
        });

        /*
         * Set zoom level 
         */
        ipcMain.on('app-set-ui-zoom-level', function(event, zoomLevel) {
            zoomLevel = parseFloat(zoomLevel);

            if (!zoomLevel || zoomLevel < 0 || zoomLevel > 2.5) {
                console.log('(!) Invalid zoom level: ', parseFloat(zoomLevel));
                return;
            }

            let appConfig = FileHelper.readFileSync(appInstance.appConfigPath, 'utf8');

            try {
                appConfig = JSON.parse(appConfig);
                appConfig.uiZoomLevel = zoomLevel;
                fs.writeFileSync(appInstance.appConfigPath, JSON.stringify(appConfig, null, 4));
                // Keep the in-memory config in line with the file - it is used for other windows and on resize
                appInstance.appConfig.uiZoomLevel = zoomLevel;
            } catch (e) {
                console.log('(!) App was unable to save the UI zoom level');
            }

            event.sender.setZoomFactor(zoomLevel);
            appInstance.notifyAppConfigChanged(event.sender.id);
        });

        /**
         * Set notifications center state
         */
        ipcMain.on('app-set-notifications-center-state', function(event, state) {
            try {
                let appConfig = JSON.parse(fs.readFileSync(appInstance.appConfigPath, 'utf8'));
                appConfig.notificationsStatus = state;
                fs.writeFileSync(appInstance.appConfigPath, JSON.stringify(appConfig, null, 4));
                appInstance.appConfig.notificationsStatus = state;
                appInstance.notifyAppConfigChanged(event.sender.id);
            } catch (e) {
                console.log('(!) App was unable to save the notifications center state');
            }
        });
    }
}

module.exports = AppEvents;
