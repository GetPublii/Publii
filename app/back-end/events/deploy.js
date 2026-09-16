const fs = require('fs-extra');
const ipcMain = require('electron').ipcMain;
const Deployment = require('../modules/deploy/deployment.js');
const childProcess = require('child_process');
const stripTags = require('striptags');
const {
    createSafeSender,
    trackWorkerProcess,
    abortWindowWorkerProcess
} = require('../helpers/ipc.helper.js');

class DeployEvents {
    constructor(appInstance) {
        let self = this;
        this.app = appInstance;
        this.deploymentProcesses = new Map(); // webContentsId -> process
        this.rendererProcesses = new Map();   // webContentsId -> process

        // Workers must not outlive the window which started them
        if (appInstance.windowManager && typeof appInstance.windowManager.onWindowDestroyed === 'function') {
            appInstance.windowManager.onWindowDestroyed(webContentsId => this.abortWindowProcesses(webContentsId));
        }

        ipcMain.on('app-deploy-render', function (event, siteData) {
            if(siteData.site && siteData.theme) {
                self.renderSite(siteData.site, createSafeSender(event.sender));
            } else {
                event.sender.send('app-deploy-rendered', {
                    status: false
                });
            }
        });

        ipcMain.on('app-deploy-render-abort', function(event) {
            abortWindowWorkerProcess(self.rendererProcesses, event.sender.id);
            event.sender.send('app-deploy-aborted', true);
        });

        ipcMain.on('app-deploy-upload', function(event, siteData) {
            if(siteData.site) {
                self.deploySite(siteData.site, siteData.password, createSafeSender(event.sender));
            } else {
                event.sender.send('app-deploy-uploaded', {
                    status: false
                });
            }
        });

        ipcMain.on('app-deploy-abort', function(event) {
            abortWindowWorkerProcess(self.deploymentProcesses, event.sender.id);
            event.sender.send('app-deploy-aborted', true);
        });

        ipcMain.on('app-deploy-continue', function(event) {
            let deploymentProcess = self.deploymentProcesses.get(event.sender.id);

            if (deploymentProcess) {
                try {
                    deploymentProcess.send({ type: 'continue-sync' });
                } catch(e) {
                    console.log(e);
                }

                self.deploymentProcesses.delete(event.sender.id);
            }
        });

        ipcMain.on('app-deploy-test', async (event, data) => {
            try {
                await this.testConnection(data.deploymentConfig, data.siteName, data.uuid, createSafeSender(event.sender));
            } catch (err) {
                console.log('Test connection error:', err);
            }
        });
    }

    // Abort the workers started by a window which has just been closed
    abortWindowProcesses (webContentsId) {
        abortWindowWorkerProcess(this.rendererProcesses, webContentsId);
        abortWindowWorkerProcess(this.deploymentProcesses, webContentsId);
    }

    renderSite(site, sender) {
        let rendererProcess = childProcess.fork(__dirname + '/../workers/renderer/preview', {
            stdio: [
                null,
                fs.openSync(this.app.app.getPath('logs') + "/rendering-deployment-process.log", "w"),
                fs.openSync(this.app.app.getPath('logs') + "/rendering-deployment-errors.log", "w"),
                'ipc'
            ]
        });

        trackWorkerProcess(this.rendererProcesses, sender.id, rendererProcess);

        rendererProcess.send({
            type: 'dependencies',
            appDir: this.app.appDir,
            sitesDir: this.app.sitesDir,
            siteConfig: this.app.sites[site],
            itemID: false,
            postData: false,
            previewMode: false,
            singlePageMode: false,
            homepageOnlyMode: false,
            tagOnlyMode: false,
            authorOnlyMode: false,
            previewLocation: this.app.appConfig.previewLocation
        });

        rendererProcess.on('message', function(data) {
            if(data.type === 'app-rendering-results') {
                if(data.result === true) {
                    sender.send('app-deploy-rendered', {
                        status: true
                    });
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
                        errorDesc = data.result[0].message + "\n\n" + data.result[0].desc;
                    }

                    sender.send('app-deploy-render-error', {
                        message: [{
                            message: errorTitle,
                            desc: stripTags((errorDesc).toString())
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

    deploySite(site, password, sender) {
        let deploymentConfig = this.app.sites[site];
        let deploymentProcess = childProcess.fork(__dirname + '/../workers/deploy/deployment', {
            stdio: [
                null,
                fs.openSync(this.app.app.getPath('logs') + "/deployment-process.log", "w"),
                fs.openSync(this.app.app.getPath('logs') + "/deployment-errors.log", "w"),
                'ipc'
            ]
        });

        trackWorkerProcess(this.deploymentProcesses, sender.id, deploymentProcess);

        if(password !== false) {
            deploymentConfig.deployment.password = password;
        }

        deploymentProcess.send({
            type: 'dependencies',
            appDir: this.app.appDir,
            sitesDir: this.app.sitesDir,
            siteConfig: deploymentConfig,
            useFtpAlt: this.app.appConfig.experimentalFeatureAppFtpAlt
        });

        deploymentProcess.on('message', function(data) {
            if (data.type === 'web-contents') {
                if(data.value) {
                    sender.send(data.message, data.value);
                } else {
                    sender.send(data.message);
                }
            }

            if(data.type === 'sender') {
                sender.send(data.message, data.value);
            }
        });
    }

    async testConnection(deploymentConfig, siteName, uuid, sender) {
        let deployment = new Deployment(
            this.app.app.getPath('logs'),
            this.app.sitesDir,
            deploymentConfig,
            this.app.appConfig.experimentalFeatureAppFtpAlt
        );
        await deployment.testConnection(this.app, deploymentConfig, siteName, uuid, sender);
    }
}

module.exports = DeployEvents;
