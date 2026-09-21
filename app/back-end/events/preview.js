const fs = require('fs-extra');
const path = require('path');
const electron = require('electron');
const shell = electron.shell;
const ipcMain = electron.ipcMain;
const stripTags = require('striptags');
const PathValidator = require('../helpers/path-validator.js');
const SiteLogs = require('../helpers/site-logs.js');
const getDirectorySize = require('../helpers/directory-size.js');
const PreviewServer = require('../modules/preview-server/preview-server.js');
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
        this.renderingSites = new Map(); // siteName -> number of working preview renderers
        this.previewSizes = new Map(); // preview directory -> size of its files, valid until the next rendering or clearing
        this.previewSizeRequests = new Map(); // preview directory -> pending calculation shared by all windows

        // Workers must not outlive the window which started them
        if (appInstance.windowManager && typeof appInstance.windowManager.onWindowDestroyed === 'function') {
            appInstance.windowManager.onWindowDestroyed(webContentsId => abortWindowWorkerProcess(this.rendererProcesses, webContentsId));
        }

        ipcMain.on('app-preview-render', function (event, siteData) {
            if (!siteData || !self.isExistingSite(siteData.site)) {
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

                self.renderSite(siteData.site, itemID, postData, mode, createSafeSender(event.sender), showPreview)
                    .catch(error => console.log('Unable to render the preview:', error));
            } else {
                event.sender.send('app-preview-rendered', {
                    status: false
                });
            }
        });

        /*
         * Local preview - the windows get only the state of the server, never paths of the previews
         */
        ipcMain.handle('app-local-preview:get-state', () => this.app.previewServer.getState());

        ipcMain.handle('app-local-preview:disable-site', async (event, siteName) => {
            if (typeof siteName !== 'string') {
                return false;
            }

            await this.app.previewServer.disableSite(siteName);
            return true;
        });

        ipcMain.handle('app-local-preview:stop', async () => {
            await this.app.previewServer.stop();
            return true;
        });

        ipcMain.handle('app-local-preview:set-port', (event, port) => this.setPort(port, event.sender.id));
        ipcMain.handle('app-local-preview:get-files-overview', () => this.getPreviewFilesOverview());
        ipcMain.handle('app-local-preview:get-size', (event, siteName) => this.getPreviewSize(siteName));
        ipcMain.handle('app-local-preview:clear', (event, siteName) => this.clearPreview(siteName));
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
    async renderSite(site, itemID, postData, mode, sender, showPreview) {
        let self = this;
        let previewMode = true;
        let resultsRetrieved = false;
        let previewRendered = false;
        let previewUrl = false;
        let previewWasEnabled = this.app.previewServer.isSiteEnabled(site);

        // Counted before the first await - otherwise the preview files could be cleared while the preview is being enabled
        this.renderingSites.set(site, (this.renderingSites.get(site) || 0) + 1);
        this.invalidatePreviewSize(site);

        try {
            if (showPreview) {
                // Address of the preview is a part of the rendered files, so it must be known before rendering
                previewUrl = await this.enablePreview(site);
            } else {
                // Generated preview files use file:/// URLs, which cannot work on the local server
                await this.app.previewServer.disableSite(site);
            }
        } catch (error) {
            this.releaseRenderingSite(site);
            console.log('Unable to start the local preview:', error);

            sender.send('app-preview-render-error', {
                message: [{
                    message: {
                        translation: 'core.rendering.localPreviewFailed'
                    },
                    desc: stripTags(String((error && error.message) ? error.message : error))
                }]
            });

            return;
        }

        let rendererProcess;

        try {
            rendererProcess = forkWorkerWithLogs(
                __dirname + '/../workers/renderer/preview',
                SiteLogs.getWorkerLogsDirectory(this.app, site),
                'rendering'
            );
        } catch (error) {
            // Without the worker there is no exit event which releases the website
            this.releaseRenderingSite(site);
            throw error;
        }

        trackWorkerProcess(this.rendererProcesses, sender.id, rendererProcess);

        rendererProcess.on('exit', function() {
            self.releaseRenderingSite(site);

            // Do not keep a preview which was enabled only for the rendering which has failed
            if (showPreview && !previewRendered && !previewWasEnabled) {
                self.app.previewServer.disableSite(site).catch(error => console.log('Unable to disable the local preview:', error));
            }
        });

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
            previewUrl: previewUrl,
            mode: mode
        });

        rendererProcess.on('message', function(data) {
            resultsRetrieved = true;

            if(data.type === 'app-rendering-results') {
                if(data.result === true) {
                    previewRendered = true;

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
     * Enables preview of the website on the local server - the first enabled preview starts the server
     *
     * @param siteName
     * @returns {Promise<string>} URL of the website preview
     */
    async enablePreview (siteName) {
        let previewDir = this.getPreviewDir(siteName);
        await fs.ensureDir(previewDir);

        return this.app.previewServer.enableSite(siteName, previewDir, {
            port: this.app.appConfig.previewServerPort,
            portFallback: true
        });
    }

    /**
     * Displays preview of the website in the default browser
     *
     * @param siteName
     * @param mode
     */
    showPreview (siteName, mode) {
        let siteUrl = this.app.previewServer.getSiteUrl(siteName);
        let file = 'index.html';

        if (mode === 'tag' || mode === 'post' || mode === 'page' || mode === 'author') {
            file = 'preview.html';
        }

        // The preview could be disabled during the rendering
        if (!siteUrl) {
            return;
        }

        let url = siteUrl + '/' + file;

        // Only the local preview server can be opened here
        if (!PreviewServer.isPreviewUrl(url)) {
            return;
        }

        setTimeout(function() {
            shell.openExternal(url);
        }, 1000);
    }

    /**
     * Saves port of the local preview server
     *
     * @param port
     * @param webContentsId - window which changes the port
     */
    setPort (port, webContentsId) {
        if (!PreviewServer.isValidPort(port)) {
            return { status: false, reason: 'invalid-port' };
        }

        // Address of the server is a part of the rendered previews, so it cannot be changed under them
        if (this.app.previewServer.getState().running) {
            return { status: false, reason: 'server-running' };
        }

        let previousPort = this.app.appConfig.previewServerPort;
        this.app.appConfig.previewServerPort = port;

        try {
            fs.writeFileSync(this.app.appConfigPath, JSON.stringify(this.app.appConfig, null, 4));
        } catch (error) {
            console.log('Unable to save port of the local preview server:', error);
            this.app.appConfig.previewServerPort = previousPort;
            return { status: false, reason: 'config-save-error' };
        }

        this.app.notifyAppConfigChanged(webContentsId);
        return { status: true };
    }

    /**
     * Returns websites which have preview files - without reading the whole directories,
     * so the sizes are included only when they were already checked
     *
     * @returns {Promise<array>} [{ name, size }] - size is null when it is unknown
     */
    async getPreviewFilesOverview () {
        let files = [];

        for (let siteName of Object.keys(this.app.sites)) {
            if (!isValidDirSegment(siteName)) {
                continue;
            }

            let previewDir = this.getPreviewDir(siteName);
            let hasFiles = false;

            try {
                hasFiles = (await fs.readdir(previewDir)).length > 0;
            } catch (error) {
                // Website without the preview directory
            }

            if (!hasFiles) {
                this.previewSizes.delete(previewDir);
                continue;
            }

            files.push({
                name: siteName,
                size: this.previewSizes.has(previewDir) ? this.previewSizes.get(previewDir) : null
            });
        }

        return files;
    }

    /**
     * Returns size (in bytes) of the preview files of the website. Big previews contain thousands of files,
     * so the size is checked only on demand and then kept until the files are changed by rendering or clearing.
     *
     * @param siteName
     */
    getPreviewSize (siteName) {
        if (!this.isExistingSite(siteName)) {
            return { status: false, reason: 'site-not-exists' };
        }

        // Size of the files which are being generated would be outdated right away
        if (this.renderingSites.has(siteName)) {
            return { status: false, reason: 'rendering-in-progress' };
        }

        let previewDir = this.getPreviewDir(siteName);

        if (this.previewSizes.has(previewDir)) {
            return { status: true, size: this.previewSizes.get(previewDir) };
        }

        let request = this.previewSizeRequests.get(previewDir);

        if (!request) {
            request = getDirectorySize(previewDir).then(size => {
                // Rendering or clearing which started in the meantime made the result outdated
                if (this.previewSizeRequests.get(previewDir) !== request) {
                    return null;
                }

                this.previewSizeRequests.delete(previewDir);
                this.previewSizes.set(previewDir, size);
                return size;
            });

            this.previewSizeRequests.set(previewDir, request);
        }

        return request.then(size => size === null ? { status: false, reason: 'outdated' } : { status: true, size: size });
    }

    // Preview files of the website were changed - windows with the list of the preview files have to refresh it
    invalidatePreviewSize (siteName) {
        let previewDir = this.getPreviewDir(siteName);
        this.previewSizes.delete(previewDir);
        this.previewSizeRequests.delete(previewDir);

        if (this.app.windowManager) {
            this.app.windowManager.broadcast('app-local-preview-files-changed', siteName);
        }
    }

    /**
     * Removes preview files of the website - its preview is no longer available on the local server
     *
     * @param siteName
     */
    async clearPreview (siteName) {
        if (!this.isExistingSite(siteName)) {
            return { status: false, reason: 'site-not-exists' };
        }

        if (this.renderingSites.has(siteName)) {
            return { status: false, reason: 'rendering-in-progress' };
        }

        try {
            await this.app.previewServer.disableSite(siteName);
            await fs.remove(this.getPreviewDir(siteName));
        } catch (error) {
            console.log('Unable to remove the preview files:', error);
            this.invalidatePreviewSize(siteName);
            return { status: false, reason: 'remove-error' };
        }

        this.invalidatePreviewSize(siteName);
        return { status: true };
    }

    // Preview files of the website can be cleared again when its last preview renderer is gone
    releaseRenderingSite (siteName) {
        let workingRenderers = (this.renderingSites.get(siteName) || 1) - 1;

        if (workingRenderers > 0) {
            this.renderingSites.set(siteName, workingRenderers);
        } else {
            this.renderingSites.delete(siteName);
        }

        this.invalidatePreviewSize(siteName);
    }

    isExistingSite (siteName) {
        return isValidDirSegment(siteName) && Object.prototype.hasOwnProperty.call(this.app.sites, siteName);
    }

    getPreviewDir (siteName) {
        return path.join(this.app.sitesDir, siteName, 'preview');
    }
}

module.exports = PreviewEvents;
