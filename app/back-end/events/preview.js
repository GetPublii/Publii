const path = require('path');
const electron = require('electron');
const shell = electron.shell;
const ipcMain = electron.ipcMain;
const stripTags = require('striptags');
const PathValidator = require('../helpers/path-validator.js');
const SiteLogs = require('../helpers/site-logs.js');
const {
    createSafeSender,
    forkWorkerWithLogs,
    trackWorkerProcess,
    abortWindowWorkerProcess
} = require('../helpers/ipc.helper.js');

const { isValidDirSegment } = PathValidator;

class PreviewEvents {
    /**
     * Creates preview events
     *
     * @param appInstance
     */
    constructor(appInstance) {
        let self = this;
        this.app = appInstance;
        this.rendererProcesses = new Map(); // webContentsId -> process

        // Workers must not outlive the window which started them
        if (appInstance.windowManager && typeof appInstance.windowManager.onWindowDestroyed === 'function') {
            appInstance.windowManager.onWindowDestroyed(webContentsId => abortWindowWorkerProcess(this.rendererProcesses, webContentsId));
        }

        ipcMain.on('app-preview-render', function (event, siteData) {
            if (!siteData ||
                !isValidDirSegment(siteData.site) ||
                !Object.prototype.hasOwnProperty.call(appInstance.sites, siteData.site)) {
                event.sender.send('app-preview-rendered', { status: false });
                return;
            }

            if (siteData.site && siteData.theme) {
                let itemID = false;
                let mode = false;
                let postData = false;
                let showPreview = true;

                if (siteData.itemID !== false && typeof siteData.itemID !== 'undefined') {
                    itemID = siteData.itemID;
                }

                if (siteData.mode !== false && typeof siteData.mode !== 'undefined') {
                    mode = siteData.mode;
                }

                if (siteData.postData) {
                    postData = siteData.postData;
                }

                if (typeof siteData.showPreview !== 'undefined') {
                    showPreview = siteData.showPreview;
                }

                self.renderSite(siteData.site, itemID, postData, mode, createSafeSender(event.sender), showPreview);
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
     * @param itemID
     * @param postData
     * @param mode
     * @param sender - safe sender of the window which requested the preview
     * @param showPreview
     */
    renderSite(site, itemID, postData, mode, sender, showPreview) {
        let self = this;
        let previewMode = true;
        let resultsRetrieved = false;
        let rendererProcess = forkWorkerWithLogs(
            __dirname + '/../workers/renderer/preview',
            SiteLogs.getWorkerLogsDirectory(this.app, site),
            'rendering'
        );

        trackWorkerProcess(this.rendererProcesses, sender.id, rendererProcess);

        rendererProcess.on('disconnect', function(data) {
            setTimeout(function() {
                if(!resultsRetrieved) {
                    let errorDesc = {
                        translation: 'core.rendering.renderingProcessCrashedMsg'
                    };

                    let errorTitle = {
                        translation: 'core.rendering.renderingProcessCrashed'
                    };

                    if (data && data.result && data.result[0] && data.result[0].message) {
                        errorTitle = {
                            translation: 'core.rendering.renderingProcessFailed'
                        };
                        errorDesc = stripTags((data.result[0].message + "\n\n" + data.result[0].desc).toString());
                    }

                    sender.send('app-preview-render-error', {
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
            mode: mode
        });

        rendererProcess.on('message', function(data) {
            resultsRetrieved = true;

            if(data.type === 'app-rendering-results') {
                if(data.result === true) {
                    sender.send('app-preview-rendered', {
                        status: true
                    });

                    if (showPreview && !sender.isDestroyed()) {
                        self.showPreview(site, mode);
                    }
                } else {
                    let errorDesc = {
                        translation: 'core.rendering.renderingProcessCrashedMsg'
                    };

                    let errorTitle = {
                        translation: 'core.rendering.renderingProcessCrashed'
                    };

                    if (data.result && data.result[0] && data.result[0].message) {
                        errorTitle = {
                            translation: 'core.rendering.renderingProcessFailed'
                        };
                        errorDesc = stripTags((data.result[0].message + "\n\n" + data.result[0].desc).toString());
                    }

                    sender.send('app-preview-render-error', {
                        message: [{
                            message: errorTitle,
                            desc: errorDesc
                        }]
                    });
                }
            } else {
                sender.send(data.type, {
                    progress: data.progress,
                    message: stripTags((data.message).toString())
                });
            }
        });
    }

    /**
     * Displays preview stored in the preview directory of the website
     *
     * @param siteName
     * @param mode
     */
    showPreview (siteName, mode) {
        let basePath = path.join(this.app.sitesDir, siteName, 'preview');
        let url = path.join(basePath, 'index.html');

        if (mode === 'tag' || mode === 'post' || mode === 'page' || mode === 'author') {
            url = path.join(basePath, 'preview.html');
        }

        setTimeout(function() {
            shell.openExternal('file:///' + url);
        }, 1000);
    }
}

module.exports = PreviewEvents;
