const fs = require('fs-extra');
const ipcMain = require('electron').ipcMain;
const Deployment = require('../modules/deploy/deployment.js');
const childProcess = require('child_process');
const stripTags = require('striptags');

class DeployEvents {
    constructor(appInstance) {
        let self = this;
        this.app = appInstance;
        this.deploymentProcess = false;
        this.rendererProcess = false;

        ipcMain.on('app-deploy-render', function (event, siteData) {
            if(siteData.site && siteData.theme) {
                self.renderSite(siteData.site, event);
            } else {
                event.sender.send('app-deploy-rendered', {
                    status: false
                });
            }
        });

        ipcMain.on('app-deploy-render-abort', function(event, siteData) {
            if(self.rendererProcess) {
                try {
                    self.rendererProcess.send({
                        type: 'abort'
                    });

                    self.rendererProcess = false;
                } catch(e) {
                    console.log(e);
                    self.rendererProcess = false;
                }
            }

            event.sender.send('app-deploy-aborted', true);
        });

        ipcMain.on('app-deploy-upload', function(event, siteData) {
            if(siteData.site) {
                self.deploySite(siteData.site, siteData.password, event.sender);
            } else {
                event.sender.send('app-deploy-uploaded', {
                    status: false
                });
            }
        });

        ipcMain.on('app-deploy-abort', function(event, siteData) {
            if(self.deploymentProcess) {
                try {
                    self.deploymentProcess.send({
                        type: 'abort'
                    });

                    self.deploymentProcess = false;
                } catch(e) {
                    console.log(e);
                    self.deploymentProcess = false;
                }
            }

            event.sender.send('app-deploy-aborted', true);
        });

        ipcMain.on('app-deploy-continue', function() {
            if (self.deploymentProcess) {
                try {
                    self.deploymentProcess.send({
                        type: 'continue-sync'
                    });

                    self.deploymentProcess = false;
                } catch(e) {
                    console.log(e);
                    self.deploymentProcess = false;
                }
            }
        });

        ipcMain.on('app-deploy-test', async (event, data) => {
            try {
                await this.testConnection(data.deploymentConfig, data.siteName, data.uuid);
            } catch (err) {
                console.log('Test connection error:', err);
            }
        });
    }

    renderSite(site, event) {
        this.rendererProcess = childProcess.fork(__dirname + '/../workers/renderer/preview', {
            stdio: [
                null,
                fs.openSync(this.app.app.getPath('logs') + "/rendering-deployment-process.log", "w"),
                fs.openSync(this.app.app.getPath('logs') + "/rendering-deployment-errors.log", "w"),
                'ipc'
            ]
        });

        this.rendererProcess.send({
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

        this.rendererProcess.on('message', function(data) {
            if(data.type === 'app-rendering-results') {
                if(data.result === true) {
                    event.sender.send('app-deploy-rendered', {
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

                    event.sender.send('app-deploy-render-error', {
                        message: [{
                            message: errorTitle,
                            desc: stripTags((errorDesc).toString())
                        }]
                    });
                }
            } else {
                event.sender.send(data.type, {
                    progress: data.progress,
                    message: stripTags((data.message).toString())
                });
            }
        });
    }

    deploySite(site, password, sender) {
        let self = this;
        let deploymentConfig = this.app.sites[site];
        this.deploymentProcess = childProcess.fork(__dirname + '/../workers/deploy/deployment', {
            stdio: [
                null,
                fs.openSync(this.app.app.getPath('logs') + "/deployment-process.log", "w"),
                fs.openSync(this.app.app.getPath('logs') + "/deployment-errors.log", "w"),
                'ipc'
            ]
        });

        if(password !== false) {
            deploymentConfig.deployment.password = password;
        }

        this.deploymentProcess.send({
            type: 'dependencies',
            appDir: this.app.appDir,
            sitesDir: this.app.sitesDir,
            siteConfig: deploymentConfig,
            useFtpAlt: this.app.appConfig.experimentalFeatureAppFtpAlt
        });

        this.deploymentProcess.on('message', function(data) {
            if (data.type === 'web-contents') {
                if(data.value) {
                    self.app.mainWindow.webContents.send(data.message, data.value);
                } else {
                    self.app.mainWindow.webContents.send(data.message);
                }
            }

            if(data.type === 'sender') {
                sender.send(data.message, data.value);
            }
        });
    }

    async testConnection(deploymentConfig, siteName, uuid) {
        let deployment = new Deployment(
            this.app.app.getPath('logs'), 
            this.app.sitesDir, 
            deploymentConfig, 
            this.app.appConfig.experimentalFeatureAppFtpAlt
        );
        await deployment.testConnection(this.app, deploymentConfig, siteName, uuid);
    }
}

module.exports = DeployEvents;
