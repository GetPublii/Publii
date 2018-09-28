/*
 * Class used to upload files to the Netlify
 */

const fs = require('fs-extra');
const path = require('path');
const md5 = require('md5');
const passwordSafeStorage = require('keytar');
const netlify = require('./../custom-changes/netlify');
const slug = require('./../../helpers/slug');

class Netlify {
    constructor(deploymentInstance = false) {
        this.deployment = deploymentInstance;
        this.connection = false;
        this.debugOutput = [];
        this.econnresetCounter = 0;
    }

    async initConnection() {
        let self = this;
        let client;
        let localDir;
        let siteID = this.deployment.siteConfig.deployment.netlify.id;
        let token = this.deployment.siteConfig.deployment.netlify.token;
        let account = slug(this.deployment.siteConfig.name);

        if(siteID === 'publii-netlify-id ' + account) {
            siteID = await passwordSafeStorage.getPassword('publii-netlify-id', account);
        }

        if(token === 'publii-netlify-token ' + account) {
            token = await passwordSafeStorage.getPassword('publii-netlify-token', account);
        }

        client = netlify.createClient({
            access_token: token
        });

        process.send({
            type: 'web-contents',
            message: 'app-uploading-progress',
            value: {
                progress: 6,
                operations: false
            }
        });

        process.send({
            type: 'web-contents',
            message: 'app-connection-in-progress'
        });

        self.deployment.setInput();
        self.deployment.setOutput(true);
        localDir = self.deployment.inputDir;

        client.site(siteID).then(function(site) {
            site.createDeploy({
                dir: localDir,
                progress: self.onProgress.bind(self)
            }).then(function(deploy) {
                deploy.waitForReady().then(function() {
                    process.send({
                        type: 'web-contents',
                        message: 'app-uploading-progress',
                        value: {
                            progress: 100,
                            operations: false
                        }
                    });

                    process.send({
                        type: 'sender',
                        message: 'app-deploy-uploaded',
                        value: {
                            status: true
                        }
                    });

                    self.deployment.saveConnectionLog();

                    setTimeout(function () {
                        process.exit();
                    }, 1000);
                });
            }).catch(err => {
                self.deployment.outputLog.push('- - Netlify ERROR - -');
                self.deployment.outputLog.push(err);
                self.deployment.outputLog.push('- - - - - - - - - - -');
                self.deployment.saveConnectionErrorLog(err);
                self.saveConnectionDebugLog();

                process.send({
                    type: 'web-contents',
                    message: 'app-connection-error'
                });

                setTimeout(function () {
                    process.exit();
                }, 1000);
            });
        }).catch(err => {
            self.deployment.outputLog.push('- - Netlify ERROR - -');
            self.deployment.outputLog.push(err);
            self.deployment.outputLog.push('- - - - - - - - - - -');
            self.deployment.saveConnectionErrorLog(err);
            self.saveConnectionDebugLog();

            process.send({
                type: 'web-contents',
                message: 'app-connection-error'
            });

            setTimeout(function () {
                process.exit();
            }, 1000);
        });
    }

    onProgress(eventType, data) {
        if(eventType === 'start') {
            this.deployment.operationsCounter = parseInt(data.total, 10);
            this.deployment.progressPerFile = 90.0 / this.deployment.operationsCounter;
            this.deployment.currentOperationNumber = 0;
            this.deployment.progressOfUploading = 0;

            return;
        }

        if(eventType === 'upload' || eventType === 'uploadError') {
            this.deployment.currentOperationNumber++;
            this.deployment.progressOfUploading += this.deployment.progressPerFile;

            if(eventType === 'uploadError') {
                console.log('UPLOAD ERROR');
                console.log(data);
            }
        }

        process.send({
            type: 'web-contents',
            message: 'app-uploading-progress',
            value: {
                progress: 8 + Math.floor(this.deployment.progressOfUploading),
                operations: [this.deployment.currentOperationNumber, this.deployment.operationsCounter]
            }
        });
    }

    async testConnection(app, deploymentConfig, siteName) {
        let client;
        let siteID = deploymentConfig.netlify.id;
        let token = deploymentConfig.netlify.token;
        let account = slug(siteName);
        let waitForTimeout = true;

        if(siteID === 'publii-netlify-id ' + account) {
            siteID = await passwordSafeStorage.getPassword('publii-netlify-id', account);
        }

        if(token === 'publii-netlify-token ' + account) {
            token = await passwordSafeStorage.getPassword('publii-netlify-token', account);
        }

        client = netlify.createClient({
            access_token: token
        });

        client.site(siteID).then(function(site) {
            waitForTimeout = false;
            app.mainWindow.webContents.send('app-deploy-test-success');
        }).catch(err => {
            waitForTimeout = false;
            app.mainWindow.webContents.send('app-deploy-test-error', {
                message: err.message
            });
        });

        setTimeout(function() {
            if(waitForTimeout === true) {
                app.mainWindow.webContents.send('app-deploy-test-error', {
                    message: 'Request timeout'
                });
            }
        }, 10000);
    }

    saveConnectionDebugLog() {
        let logPath = path.join(this.deployment.appDir, 'logs', 'connection-debug-log.txt');

        fs.writeFileSync(logPath, this.debugOutput.join("\n"));
    }
}

module.exports = Netlify;
