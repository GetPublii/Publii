const fs = require('fs');
const path = require('path');
const electron = require('electron');
const shell = electron.shell;
const ipcMain = electron.ipcMain;
const childProcess = require('child_process');
const UtilsHelper = require('../helpers/utils.js');

class PreviewEvents {
    /**
     * Creates preview events
     *
     * @param appInstance
     */
    constructor(appInstance) {
        let self = this;
        this.app = appInstance;

        ipcMain.on('app-preview-render', function (event, siteData) {
            if(siteData.site && siteData.theme) {
                let postID = false;
                let postData = false;

                if(siteData.postID !== false && typeof siteData.postID !== 'undefined') {
                    postID = siteData.postID;
                }

                if(siteData.postData) {
                    postData = siteData.postData;
                }

                self.renderSite(siteData.site, postID, postData, event);
            } else {
                event.sender.send('app-preview-rendered', {
                    status: false
                });
            }
        });
    }

    /**
     * Renders website
     *
     * @param site
     * @param postID
     * @param postData
     * @param event
     */
    renderSite(site, postID, postData, event) {
        let self = this;
        let resultsRetrieved = false;
        let rendererProcess = childProcess.fork(__dirname + '/../workers/renderer/preview', {
            stdio: [
                null,
                fs.openSync(this.app.appDir + "/logs/rendering-process.log", "w"),
                fs.openSync(this.app.appDir + "/logs/rendering-errors.log", "w"),
                'ipc'
            ]
        });
        let previewMode = true;
        let singlePageMode = false;

        if(postID !== false) {
            singlePageMode = true;
        }

        rendererProcess.on('disconnect', function(data) {
            setTimeout(function() {
                if(!resultsRetrieved) {
                    event.sender.send('app-preview-render-error', {
                        message: [{
                            message: 'Rendering process crashed',
                            desc: 'Checkout the rendering-errors.log file under Tools -> Log viewer'
                        }]
                    });
                }
            }, 1000);
        });

        rendererProcess.send({
            type: 'dependencies',
            appDir: this.app.appDir,
            sitesDir: this.app.sitesDir,
            siteConfig: this.app.sites[site],
            postID: postID,
            postData: postData,
            previewMode: previewMode,
            singlePageMode: singlePageMode,
            previewLocation: this.app.appConfig.previewLocation
        });

        rendererProcess.on('message', function(data) {
            resultsRetrieved = true;

            if(data.type === 'app-rendering-results') {
                if(data.result === true) {
                    event.sender.send('app-preview-rendered', {
                        status: true
                    });

                    self.showPreview(site, singlePageMode);
                } else {
                    event.sender.send('app-preview-render-error', {
                        message: [{
                            message: 'Rendering process crashed',
                            desc: 'Checkout the rendering-errors.log file under Tools -> Log viewer'
                        }]
                    });
                }
            } else {
                event.sender.send(data.type, {
                    progress: data.progress,
                    message: data.message
                });
            }
        });
    }

    /**
     * Displays preview
     *
     * @param siteData
     */
    showPreview(siteName, postPreview) {
        let basePath = path.join(this.app.sitesDir, siteName, 'preview');
        let previewLocation = '';

        if(this.app.appConfig.previewLocation) {
            previewLocation = this.app.appConfig.previewLocation.trim();
        }

        let url = '';

        if(previewLocation !== '' && UtilsHelper.dirExists(previewLocation)) {
            basePath = previewLocation;
        }

        url = path.join(basePath, 'index.html');

        if(postPreview) {
            url = path.join(basePath, 'preview.html');
        }

        setTimeout(function() {
            shell.openExternal('file://' + url);
        }, 1000);
    }
}

module.exports = PreviewEvents;
