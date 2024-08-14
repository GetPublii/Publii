/*
 * Class used to upload files to the Netlify
 */

const fs = require('fs-extra');
const path = require('path');
const passwordSafeStorage = require('keytar');
const slug = require('./../../helpers/slug');
const NetlifyAPI = require('./libraries/netlify-api');
const stripTags = require('striptags');

class Netlify {
    constructor(deploymentInstance = false) {
        this.deployment = deploymentInstance;
        this.connection = false;
        this.debugOutput = [];
    }

    async initConnection() {
        let client;
        let localDir;
        let siteID = this.deployment.siteConfig.deployment.netlify.id;
        let token = this.deployment.siteConfig.deployment.netlify.token;
        let account = slug(this.deployment.siteConfig.name);

        if (this.deployment.siteConfig.uuid) {
            account = this.deployment.siteConfig.uuid;
        }

        if(siteID === 'publii-netlify-id ' + account) {
            siteID = await passwordSafeStorage.getPassword('publii-netlify-id', account);
        }

        if(token === 'publii-netlify-token ' + account) {
            token = await passwordSafeStorage.getPassword('publii-netlify-token', account);
        }

        this.deployment.setInput();
        this.deployment.setOutput(true);
        localDir = this.deployment.inputDir;

        client = new NetlifyAPI({
            accessToken: (token).toString().trim(),
            siteID: (siteID).toString().trim(),
            inputDir: localDir
        }, {
            onStart: this.onStart.bind(this),
            onProgress: this.onProgress.bind(this),
            onError: this.onError.bind(this)
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

        let results = client.deploy();
        results.then(res => {
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

            setTimeout(function () {
                process.kill(process.pid, 'SIGTERM');
            }, 1000);
        }).catch(err => {
            console.log(`[${ new Date().toUTCString() }] Netlify ERROR: ${err}`);
            this.onError(err);

            setTimeout(function () {
                process.kill(process.pid, 'SIGTERM');
            }, 1000);
        });
    }

    onStart (totalFiles) {
        this.deployment.operationsCounter = parseInt(totalFiles, 10);
        this.deployment.progressPerFile = 90.0 / this.deployment.operationsCounter;
        this.deployment.currentOperationNumber = 0;
        this.deployment.progressOfUploading = 0;
    }

    onError (apiResponse = false) {
        if (typeof apiResponse === 'boolean' || !apiResponse.body) {
            process.send({
                type: 'web-contents',
                message: 'app-connection-error'
            });
        } else {
            process.send({
                type: 'web-contents',
                message: 'app-connection-error',
                value: {
                    additionalMessage: stripTags((JSON.parse(apiResponse.body).message).toString())
                }
            });
        }

        setTimeout(function () {
            process.kill(process.pid, 'SIGTERM');
        }, 1000);
    }

    onProgress(currentFile) {
        if (currentFile < this.deployment.currentOperationNumber) {
            return;
        }

        this.deployment.currentOperationNumber = currentFile;
        this.deployment.progressOfUploading = this.deployment.currentOperationNumber * this.deployment.progressPerFile;

        process.send({
            type: 'web-contents',
            message: 'app-uploading-progress',
            value: {
                progress: 8 + Math.floor(this.deployment.progressOfUploading),
                operations: [this.deployment.currentOperationNumber, this.deployment.operationsCounter]
            }
        });
    }

    async testConnection(app, deploymentConfig, siteName, uuid) {
        let client;
        let siteID = deploymentConfig.netlify.id;
        let token = deploymentConfig.netlify.token;
        let account = slug(siteName);
        let waitForTimeout = true;

        if (uuid) {
            account = uuid;
        }

        if(siteID === 'publii-netlify-id ' + account) {
            siteID = await passwordSafeStorage.getPassword('publii-netlify-id', account);
        }

        if(token === 'publii-netlify-token ' + account) {
            token = await passwordSafeStorage.getPassword('publii-netlify-token', account);
        }

        client = new NetlifyAPI({
            accessToken: (token).toString().trim(),
            siteID: (siteID).toString().trim(),
            inputDir: ''
        });

        try {
            await client.testConnection();
            waitForTimeout = false;
            app.mainWindow.webContents.send('app-deploy-test-success');
        } catch (err) {
            waitForTimeout = false;
            app.mainWindow.webContents.send('app-deploy-test-error', {
                message: stripTags((err.message).toString())
            });
        }

        setTimeout(function() {
            if(waitForTimeout === true) {
                app.mainWindow.webContents.send('app-deploy-test-error', {
                    message: {
                        translation: 'core.server.requestTimeout'
                    }
                });
            }
        }, 10000);
    }
}

module.exports = Netlify;
