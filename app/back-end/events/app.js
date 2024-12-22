const fs = require('fs-extra');
const path = require('path');
const ipcMain = require('electron').ipcMain;
const Themes = require('../themes.js');
const Languages = require('../languages.js');
const Plugins = require('../plugins.js');
const AppFiles = require('../helpers/app-files.js');
const AdmZip = require("adm-zip");

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
        ipcMain.on('app-license-accept', function(event, config) {
            fs.writeFileSync(appInstance.appConfigPath, JSON.stringify({licenseAccepted: true}, null, 4));
            appInstance.appConfig = config;

            event.sender.send('app-license-accepted', true);
        });

        /*
         * Save app config
         */
        ipcMain.on('app-config-save', function (event, config) {
            if (config.sitesLocation === '') {
                config.sitesLocation = appInstance.dirPaths.sites;
            }

            if (config.sitesLocation !== appInstance.appConfig.sitesLocation) {
                let result = true;

                if (appInstance.appConfig.sitesLocation) {
                    let appFilesHelper = new AppFiles(appInstance);
                    
                    if (appInstance.db) {
                        try {
                            appInstance.db.close();
                        } catch (e) {
                            console.log('[SITE LOCATION CHANGE] DB already closed');
                        }
                    }

                    setTimeout(() => {
                        if (config.changeSitesLocationWithoutCopying) {
                            fs.writeFileSync(appInstance.appConfigPath, JSON.stringify(config, null, 4));
                            appInstance.appConfig = config;
                            appInstance.sitesDir = config.sitesLocation;
                        } else {
                            result = appFilesHelper.relocateSites(
                                appInstance.appConfig.sitesLocation,
                                config.sitesLocation,
                                event
                            );

                            if (result) {
                                fs.writeFileSync(appInstance.appConfigPath, JSON.stringify(config, null, 4));
                                appInstance.appConfig = config;
                                appInstance.sitesDir = config.sitesLocation;
                            }
                        }
        
                        appInstance.loadSites();
                        
                        event.sender.send('app-config-saved', {
                            status: true,
                            message: 'success-save',
                            sites: appInstance.sites
                        });
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
        });

        /*
         * Save app color theme config
         */
        ipcMain.on('app-save-color-theme', function (event, theme) {
            let appConfig = fs.readFileSync(appInstance.appConfigPath, 'utf8');

            try {
                appConfig = JSON.parse(appConfig);
                appConfig.appTheme = theme;
                fs.writeFileSync(appInstance.appConfigPath, JSON.stringify(appConfig, null, 4));
            } catch (e) {
                console.log('(!) App was unable to save the color theme');
            }
        });

        /*
         * Delete theme
         */
        ipcMain.on('app-theme-delete', function(event, config) {
            let themesLoader = new Themes(appInstance);

            if(config.directory !== '') {
                themesLoader.removeTheme(config.directory);

                appInstance.themes = appInstance.themes.filter(function (theme) {
                    return theme.name !== config.name;
                });

                event.sender.send('app-theme-deleted', {
                    status: true,
                    themes: appInstance.themes
                });
            }
        });

        /*
         * Delete language
         */
        ipcMain.on('app-language-delete', function(event, config) {
            let languagesLoader = new Languages(appInstance);

            if(config.directory !== '') {
                languagesLoader.removeLanguage(config.directory);

                appInstance.languages = appInstance.languages.filter(function (language) {
                    return language.name !== config.name;
                });

                event.sender.send('app-language-deleted', {
                    status: true,
                    languages: appInstance.languages
                });
            }
        });

        /*
         * Delete plugin
         */
        ipcMain.on('app-plugin-delete', function(event, config) {
            let pluginsLoader = new Plugins(appInstance.appDir, appInstance.sitesDir);

            if(config.directory !== '') {
                pluginsLoader.removePlugin(config.directory);

                appInstance.plugins = appInstance.plugins.filter(function (plugin) {
                    return plugin.name !== config.name;
                });

                event.sender.send('app-plugin-deleted', {
                    status: true,
                    plugins: appInstance.plugins
                });
            }
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
                    let zip = new AdmZip(config.sourcePath);
                    fs.mkdirSync(zipPath, { recursive: true });
                    zip.extractAllTo(zipPath, true);

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

                        fs.removeSync(zipPath);

                        return;
                    }

                    newThemeDir = dirs[0];
                    let directoryPath = path.join(themesLoader.themesPath, newThemeDir);

                    try {
                        fs.statSync(directoryPath);
                        status = 'updated';
                        fs.removeSync(directoryPath);
                    } catch (e) {
                        status = 'added';
                    }

                    fs.copySync(path.join(zipPath, newThemeDir), directoryPath);
                    fs.removeSync(zipPath);
                    appInstance.themes = themesLoader.loadThemes();

                    event.sender.send('app-theme-uploaded', {
                        status: status,
                        themes: appInstance.themes
                    });

                    return;
                } else {
                    let directoryPath = path.join(themesLoader.themesPath, newThemeDir);

                    try {
                        fs.statSync(directoryPath);
                        status = 'updated';
                        fs.removeSync(directoryPath);
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
                themes: appInstance.themes
            });
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
                    let zip = new AdmZip(config.sourcePath);
                    fs.mkdirSync(zipPath, { recursive: true });
                    zip.extractAllTo(zipPath, true);

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

                        fs.removeSync(zipPath);

                        return;
                    }

                    newLanguageDir = dirs[0];

                    let directoryPath = path.join(languagesLoader.languagesPath, newLanguageDir);

                    try {
                        fs.statSync(directoryPath);
                        status = 'updated';
                        fs.removeSync(directoryPath);
                    } catch (e) {
                        status = 'added';
                    }

                    fs.copySync(path.join(zipPath, newLanguageDir), directoryPath);
                    fs.removeSync(zipPath);
                    appInstance.languages = languagesLoader.loadLanguages();

                    event.sender.send('app-language-uploaded', {
                        status: status,
                        languages: appInstance.languages
                    });

                    return;
                } else {
                    let directoryPath = path.join(languagesLoader.languagesPath, newLanguageDir);

                    try {
                        fs.statSync(directoryPath);
                        status = 'updated';
                        fs.removeSync(directoryPath);
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
                    fs.mkdirSync(zipPath, { recursive: true });
                    let zip = new AdmZip(config.sourcePath);
                    zip.extractAllTo(zipPath, true);

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

                        fs.removeSync(zipPath);

                        return;
                    }

                    newPluginDir = dirs[0];

                    let directoryPath = path.join(pluginsLoader.pluginsPath, newPluginDir);

                    try {
                        fs.statSync(directoryPath);
                        status = 'updated';
                        fs.removeSync(directoryPath);
                    } catch (e) {
                        status = 'added';
                    }

                    fs.copySync(path.join(zipPath, newPluginDir), directoryPath);
                    fs.removeSync(zipPath);
                    appInstance.plugins = pluginsLoader.loadPlugins();

                    event.sender.send('app-plugin-uploaded', {
                        status: status,
                        plugins: appInstance.plugins
                    });

                    return;
                } else {
                    let directoryPath = path.join(pluginsLoader.pluginsPath, newPluginDir);

                    try {
                        fs.statSync(directoryPath);
                        status = 'updated';
                        fs.removeSync(directoryPath);
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
        });

        /*
         * Load log files list
         */
        ipcMain.on('app-log-files-load', function(event) {
            let logPath = appInstance.app.getPath('logs');
            let files = fs.readdirSync(logPath).filter(function(file) {
                return file.substr(-4) === '.txt' || file.substr(-4) === '.log';
            });

            event.sender.send('app-log-files-loaded', {
                files: files
            });
        });

        /*
         * Load specific log file
         */
        ipcMain.on('app-log-file-load', function(event, filename) {
            let logPath = appInstance.app.getPath('logs');
            let logFiles = fs.readdirSync(logPath).filter(function(file) {
                return file.substr(-4) === '.txt' || file.substr(-4) === '.log';
            });

            if (logFiles.indexOf(filename) === -1) {
                event.sender.send('app-log-file-loaded', {
                    fileContent: 'File not found!'
                });
            }

            let filePath = path.join(appInstance.app.getPath('logs'), filename);
            let fileContent = fs.readFileSync(filePath, 'utf8');

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

            let appConfig = fs.readFileSync(appInstance.appConfigPath, 'utf8');

            try {
                appConfig = JSON.parse(appConfig);
                appConfig.uiZoomLevel = zoomLevel;
                fs.writeFileSync(appInstance.appConfigPath, JSON.stringify(appConfig, null, 4));
            } catch (e) {
                console.log('(!) App was unable to save the UI zoom level');
            }

            appInstance.mainWindow.webContents.setZoomFactor(zoomLevel);
        });
    }
}

module.exports = AppEvents;
