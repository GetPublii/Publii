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
            if (siteData.site && siteData.theme) {
                let itemID = false;
                let mode = false;
                let postData = false;

                if (siteData.itemID !== false && typeof siteData.itemID !== 'undefined') {
                    itemID = siteData.itemID;
                }

                if (siteData.mode !== false && typeof siteData.mode !== 'undefined') {
                    mode = siteData.mode;
                }

                if (siteData.postData) {
                    postData = siteData.postData;
                }

                self.renderSite(siteData.site, itemID, postData, mode, event);
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
     * @param pageToRender
     * @param postData
     * @param event
     */
    renderSite(site, itemID, postData, mode, event) {
        let self = this;
        let previewMode = true;
        let resultsRetrieved = false;
        let rendererProcess = childProcess.fork(__dirname + '/../workers/renderer/preview', {
            stdio: [
                null,
                fs.openSync(this.app.app.getPath('logs') + "/rendering-process.log", "w"),
                fs.openSync(this.app.app.getPath('logs') + "/rendering-errors.log", "w"),
                'ipc'
            ]
        });
        
        rendererProcess.on('disconnect', function(data) {
            setTimeout(function() {
                if(!resultsRetrieved) {
                    let errorDesc = 'Checkout the rendering-errors.log and rendering-process.log files under Tools -> Log viewer. ';
                    let errorTitle = 'Rendering process crashed';

                    if (data && data.result && data.result[0] && data.result[0].message) {
                        errorTitle = 'Rendering process failed';
                        errorDesc = data.result[0].message + "\n\n" + data.result[0].desc;
                    }

                    event.sender.send('app-preview-render-error', {
                        message: [{
                            message: errorTitle,
                            desc: errorDesc
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
            itemID: itemID,
            postData: postData,
            previewMode: previewMode,
            mode: mode,
            previewLocation: this.app.appConfig.previewLocation
        });

        rendererProcess.on('message', function(data) {
            resultsRetrieved = true;

            if(data.type === 'app-rendering-results') {
                if(data.result === true) {
                    event.sender.send('app-preview-rendered', {
                        status: true
                    });

                    self.showPreview(site, mode);
                } else {
                    let errorDesc = 'Checkout the rendering-errors.log and rendering-process.log files under Tools -> Log viewer. ';
                    let errorTitle = 'Rendering process crashed';

                    if (data.result && data.result[0] && data.result[0].message) {
                        errorTitle = 'Rendering process failed';
                        errorDesc = data.result[0].message + "\n\n" + data.result[0].desc;
                    }

                    event.sender.send('app-preview-render-error', {
                        message: [{
                            message: errorTitle,
                            desc: errorDesc
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
    showPreview (siteName, mode) {
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

        if (mode === 'tag' || mode === 'post' || mode === 'author') {
            url = path.join(basePath, 'preview.html');
        }

        setTimeout(function() {
            shell.openExternal('file://' + url);
        }, 1000);
    }
}

module.exports = PreviewEvents;
