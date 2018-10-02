const fs = require('fs-extra');
const path = require('path');
const ipcMain = require('electron').ipcMain;
const Themes = require('../themes.js');
const AppFiles = require('../helpers/app-files.js');
const unzip = require("unzipper");

/*
 * Events for the IPC communication regarding app
 */

class AppEvents {
    constructor(appInstance) {
        /*
         * Save licence acceptance
         */
        ipcMain.on('app-license-accept', function(event, config) {
            fs.writeFileSync(appInstance.appConfigPath, JSON.stringify({licenseAccepted: true}));
            appInstance.appConfig = config;

            event.sender.send('app-license-accepted', true);
        });

        /*
         * Save app config
         */
        ipcMain.on('app-config-save', function (event, config) {
            if(config.sitesLocation === '') {
                config.sitesLocation = appInstance.dirPaths.sites;
            }

            if(config.sitesLocation !== appInstance.appConfig.sitesLocation) {
                let result = true;

                if(appInstance.appConfig.sitesLocation) {
                    let appFilesHelper = new AppFiles(appInstance);
                    result = appFilesHelper.relocateSites(
                        appInstance.appConfig.sitesLocation,
                        config.sitesLocation,
                        event
                    );
                }

                if(result) {
                    fs.writeFileSync(appInstance.appConfigPath, JSON.stringify(config));
                    appInstance.appConfig = config;
                }

                appInstance.loadSites().then(() => {
                    event.sender.send('app-config-saved', {
                        status: true,
                        message: 'success-save',
                        sites: appInstance.sites
                    });
                });

                return;
            }

            event.sender.send('app-config-saved', {
                status: true,
                message: 'success-save'
            });

            fs.writeFileSync(appInstance.appConfigPath, JSON.stringify(config));
            appInstance.appConfig = config;
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
         * Add new theme
         */
        ipcMain.on('app-theme-upload', function(event, config) {
            let themesLoader = new Themes(appInstance);
            let newThemeDir = path.parse(config.sourcePath).name;
            let extension = path.parse(config.sourcePath).ext;
            let status = '';

            if(extension === '.zip' || extension === '') {
                if(extension === '.zip') {
                    let zipPath = path.join(themesLoader.themesPath, '__TEMP__');
                    fs.mkdirSync(zipPath);

                    let stream = fs.createReadStream(config.sourcePath)
                                 .pipe(unzip.Extract({
                                    path: zipPath
                                 }));

                    stream.on('finish', function() {
                        let dirs = fs.readdirSync(zipPath).filter(function(file) {
                            if(file.substr(0,1) === '_' || file.substr(0,1) === '.') {
                                return false;
                            }

                            return fs.statSync(path.join(zipPath, file)).isDirectory();
                        });

                        if(dirs.length !== 1) {
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
         * Load log files list
         */
        ipcMain.on('app-log-files-load', function(event) {
            let logPath = path.join(appInstance.appDir, 'logs');
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
            let filePath = path.join(appInstance.appDir, 'logs', filename);
            let fileContent = fs.readFileSync(filePath, 'utf8');

            event.sender.send('app-log-file-loaded', {
                fileContent: fileContent
            });
        });
    }
}

module.exports = AppEvents;
