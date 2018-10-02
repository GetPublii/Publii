const fs = require('fs-extra');
const ipcMain = require('electron').ipcMain;
const Deployment = require('../modules/deploy/deployment.js');
const childProcess = require('child_process');

class DeployEvents {
    constructor(appInstance) {
        let self = this;
        this.app = appInstance;
        this.deploymentProcess = false;

        ipcMain.on('app-deploy-render', function (event, siteData) {
            if(siteData.site && siteData.theme) {
                self.renderSite(siteData.site, event);
            } else {
                event.sender.send('app-deploy-rendered', {
                    status: false
                });
            }
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
                } catch(e) {

                }
            }

            event.sender.send('app-deploy-aborted', true);
        });

        ipcMain.on('app-deploy-test', function(event, data) {
            self.testConnection(data.deploymentConfig, data.siteName);
        });
    }

    renderSite(site, event) {
        let rendererProcess = childProcess.fork(__dirname + '/../workers/renderer/preview', {
            stdio: [
                null,
                fs.openSync(this.app.appDir + "/logs/rendering-deployment-process.log", "w"),
                fs.openSync(this.app.appDir + "/logs/rendering-deployment-errors.log", "w"),
                'ipc'
            ]
        });

        rendererProcess.send({
            type: 'dependencies',
            appDir: this.app.appDir,
            sitesDir: this.app.sitesDir,
            siteConfig: this.app.sites[site],
            postID: false,
            postData: false,
            previewMode: false,
            singlePageMode: false,
            previewLocation: this.app.appConfig.previewLocation
        });

        rendererProcess.on('message', function(data) {
            if(data.type === 'app-rendering-results') {
                if(data.result === true) {
                    event.sender.send('app-deploy-rendered', {
                        status: true
                    });
                } else {
                    let errorDesc = 'Checkout the rendering-errors.log and rendering-process.log files under Tools -> Log viewer. ';
                    let errorTitle = 'Rendering process crashed';

                    if (data.result[0] && data.result[0].message) {
                        errorTitle = 'Rendering process failed';
                        errorDesc = data.result[0].message + "\n\n" + data.result[0].desc;
                    }

                    event.sender.send('app-deploy-render-error', {
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

    deploySite(site, password, sender) {
        let self = this;
        let deploymentConfig = this.app.sites[site];
        this.deploymentProcess = childProcess.fork(__dirname + '/../workers/deploy/deployment', {
            stdio: [
                null,
                fs.openSync(this.app.appDir + "/logs/deployment-process.log", "w"),
                fs.openSync(this.app.appDir + "/logs/deployment-errors.log", "w"),
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
            siteConfig: deploymentConfig
        });

        this.deploymentProcess.on('message', function(data) {
            if(data.type === 'web-contents') {
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

    testConnection(deploymentConfig, siteName) {
        let deployment = new Deployment(this.app.appDir, this.app.sitesDir, deploymentConfig);
        deployment.testConnection(this.app, deploymentConfig, siteName);
    }
}

module.exports = DeployEvents;
