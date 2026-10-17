/*
 * Class used to upload files to the Google Cloud Storage bucket
 */

const fs = require('fs-extra');
const path = require('path');
const GcsApiClient = require('./gcs-api-client.js');
const normalizePath = require('normalize-path');
const mime = require('mime');
const stripTags = require('striptags');

class GoogleCloud {
    constructor(deploymentInstance = false) {
        this.deployment = deploymentInstance;
        this.connection = false;
        this.prefix = '';
        this.waitForTimeout = false;
        this.errorReported = false;
        this.softUploadErrors = {};
        this.hardUploadErrors = [];
    }

    // The credentials come from the service account key file downloaded from the Google Cloud console
    readKeyFile (keyFilePath) {
        keyFilePath = typeof keyFilePath === 'string' ? normalizePath(keyFilePath.trim()) : '';

        if (keyFilePath === '' || !fs.existsSync(keyFilePath)) {
            throw Object.assign(new Error(`The service account key file does not exist: ${keyFilePath}`), { code: 'KeyFileNotFound' });
        }

        let keyData;

        try {
            keyData = JSON.parse(fs.readFileSync(keyFilePath, 'utf8'));
        } catch (err) {
            throw Object.assign(new Error(`The service account key file is not a valid JSON file: ${keyFilePath}`), { code: 'KeyFileInvalid' });
        }

        return {
            clientEmail: keyData && keyData.client_email,
            privateKey: keyData && keyData.private_key
        };
    }

    createConnection (googleConfig) {
        let credentials = this.readKeyFile(googleConfig.key);

        return new GcsApiClient({
            clientEmail: credentials.clientEmail,
            privateKey: credentials.privateKey,
            bucket: googleConfig.bucket
        });
    }

    async initConnection() {
        let googleConfig = this.deployment.siteConfig.deployment.google;
        this.prefix = googleConfig.prefix;
        this.waitForTimeout = true;

        this.sendProgress(6, false);

        process.send({
            type: 'web-contents',
            message: 'app-connection-in-progress'
        });

        // Registered before the first request - a hanging connection must not leave the sync popup waiting forever
        setTimeout(() => {
            if(this.waitForTimeout === true) {
                process.send({
                    type: 'web-contents',
                    message: 'app-connection-error'
                });

                setTimeout(() => {
                    process.kill(process.pid, 'SIGTERM');
                }, 1000);
            }
        }, 15000);

        try {
            this.connection = this.createConnection(googleConfig);
            await this.connection.listObjects({
                prefix: this.remotePath(''),
                maxResults: 1
            });
            await this.setWebsiteConfiguration();
            this.waitForTimeout = false;

            process.send({
                type: 'web-contents',
                message: 'app-connection-success'
            });

            this.deployment.setInput();
            this.deployment.setOutput(true);
            this.deployment.prepareLocalFilesList();
            this.sendProgress(7, false);

            await this.downloadFilesList();
        } catch (err) {
            this.onError(err);
        }
    }

    /*
     * The bucket serves index.html for the directories and 404.html for the missing pages;
     * a key without the bucket permissions still uploads the files, so a failure is only logged
     */
    async setWebsiteConfiguration () {
        try {
            await this.connection.patchBucket({
                website: {
                    mainPageSuffix: 'index.html',
                    notFoundPage: '404.html'
                }
            });
        } catch (err) {
            console.log(`[${ new Date().toUTCString() }] (i) GCS WEBSITE CONFIGURATION NOT UPDATED: ${err.message}`);
        }
    }

    async downloadFilesList() {
        let fileName = this.remotePath('files.publii.json');

        try {
            let remoteFile = await this.connection.getObject(fileName);
            console.log(`[${new Date().toUTCString()}] <- files.publii.json`);
            this.sendProgress(8, false);
            this.deployment.checkLocalListWithRemoteList(remoteFile.toString('utf-8'));
        } catch (err) {
            console.log(`[${new Date().toUTCString()}] <- files.publii.json`);

            if (!this.isNotFoundError(err)) {
                this.onError(err);
                return;
            }

            this.sendProgress(8, false);
            this.deployment.compareFilesList(false);
        }
    }

    async uploadNewFileList() {
        this.sendProgress(99);
        let fileName = this.remotePath('files.publii.json');
        let filePath = path.join(this.deployment.inputDir, 'files.publii.json');

        fs.readFile(filePath, async (err, fileContent) => {
            if (err) {
                this.onError(err);
                return;
            }

            try {
                // The files list is not public - only the site files get the public ACL
                await this.connection.uploadObject(fileName, fileContent, {
                    contentType: 'application/json'
                });
                console.log(`[${new Date().toUTCString()}] -> ${fileName}`);
                this.sendProgress(100, false);

                process.send({
                    type: 'sender',
                    message: 'app-deploy-uploaded',
                    value: {
                        status: true,
                        issues: this.hardUploadErrors.length > 0
                    }
                });

                setTimeout(() => {
                    process.kill(process.pid, 'SIGTERM');
                }, 1000);
            } catch (uploadErr) {
                console.log(`[${new Date().toUTCString()}] -> ${fileName}`);
                this.onError(uploadErr);
            }
        });
    }

    /*
     * Uploads the local file (input) as the object given by the output path;
     * a failed upload is retried a few times before it is counted as a hard error
     */
    uploadFile(input, output) {
        let fileName = this.remotePath(output);

        fs.readFile(input, async (err, fileContent) => {
            if (err) {
                this.onError(err);
                return;
            }

            try {
                await this.connection.uploadObject(fileName, fileContent, {
                    contentType: mime.getType(fileName) || 'application/octet-stream',
                    predefinedAcl: 'publicRead'
                });
                this.deployment.currentOperationNumber++;
                console.log(`[${ new Date().toUTCString() }] UPL ${input} -> ${fileName}`);
                this.deployment.progressOfUploading += this.deployment.progressPerFile;
                this.sendProgress(8 + Math.floor(this.deployment.progressOfUploading));
                this.deployment.uploadFile();
            } catch (uploadErr) {
                console.log(`[${ new Date().toUTCString() }] ERROR UPLOAD FILE: ${fileName}`);
                this.onError(uploadErr, true);

                setTimeout(() => {
                    if (!this.softUploadErrors[input]) {
                        this.softUploadErrors[input] = 1;
                    } else {
                        this.softUploadErrors[input]++;
                    }

                    if (this.softUploadErrors[input] <= 5) {
                        this.uploadFile(input, output);
                    } else {
                        this.hardUploadErrors.push(input);
                        this.deployment.currentOperationNumber++;
                        console.log(`[${ new Date().toUTCString() }] UPL HARD ERR ${input} -> ${fileName}`);
                        this.deployment.progressOfUploading += this.deployment.progressPerFile;
                        this.sendProgress(8 + Math.floor(this.deployment.progressOfUploading));
                        this.deployment.uploadFile();
                    }
                }, 500);
            }
        });
    }

    // The bucket has no directories - they are skipped
    uploadDirectory(input, output) {
        this.deployment.uploadFile();
    }

    async removeFile(input) {
        let fileName = this.remotePath(input);

        try {
            await this.connection.deleteObject(fileName);
            this.deployment.currentOperationNumber++;
            console.log(`[${ new Date().toUTCString() }] DEL ${fileName}`);
            this.deployment.progressOfDeleting += this.deployment.progressPerFile;
            this.sendProgress(8 + Math.floor(this.deployment.progressOfDeleting));
            this.deployment.removeFile();
        } catch (err) {
            // The object no longer exists in the bucket - the sync is not blocked
            if (this.isNotFoundError(err)) {
                this.deployment.currentOperationNumber++;
                console.log(`[${ new Date().toUTCString() }] DEL ${fileName} - notFound`);
                this.deployment.progressOfDeleting += this.deployment.progressPerFile;
                this.sendProgress(8 + Math.floor(this.deployment.progressOfDeleting));
                this.deployment.removeFile();
                return;
            }

            console.error(`[${new Date().toUTCString()}] Error deleting ${fileName}`, err);
            this.onError(err);
        }
    }

    removeDirectory(input) {
        this.deployment.removeFile();
    }

    /*
     * Silent mode is used for the errors which are retried (the file uploads) - every other error
     * ends the synchronization with a message
     */
    onError(err, silentMode = false) {
        console.log(`[${ new Date().toUTCString() }] GCS ERROR: ${err.message}`);

        if (silentMode) {
            return;
        }

        this.waitForTimeout = false;
        this.reportError(err);
    }

    // Reports the error to the sync popup once and ends the deployment process
    reportError(err) {
        if (this.errorReported) {
            return;
        }

        this.errorReported = true;

        process.send({
            type: 'web-contents',
            message: 'app-connection-error',
            value: {
                additionalMessage: stripTags(String((err && err.message) || err || ''))
            }
        });

        setTimeout(function () {
            process.kill(process.pid, 'SIGTERM');
        }, 1000);
    }

    isNotFoundError (err) {
        return !!err && (err.status === 404 || err.code === 'notFound');
    }

    // The optional prefix (a directory inside the bucket) is put in front of every object name
    remotePath(filePath) {
        let remotePath = String(filePath || '');

        if (typeof this.prefix === 'string' && this.prefix.trim() !== '') {
            remotePath = path.join(this.prefix.trim(), remotePath);
        }

        remotePath = normalizePath(remotePath);

        if (remotePath[0] === '/') {
            remotePath = remotePath.substr(1);
        }

        return remotePath;
    }

    async testConnection(app, deploymentConfig, siteName, uuid, sender) {
        let googleConfig = deploymentConfig.google;
        let waitForTimeout = true;
        this.prefix = googleConfig.prefix;

        // Replies only once - a reply which arrives after the timeout is ignored
        let finishConnectionTest = (channel, ...args) => {
            if (waitForTimeout === false) {
                return;
            }

            waitForTimeout = false;
            this.closeConnection();
            sender.send(channel, ...args);
        };

        let replyWithError = (err) => {
            finishConnectionTest('app-deploy-test-error', {
                message: stripTags((err.message).toString())
            });
        };

        try {
            this.connection = this.createConnection(googleConfig);
        } catch (err) {
            replyWithError(err);
            return;
        }

        this.connection.listObjects({
            prefix: this.remotePath(''),
            maxResults: 1
        }).then(() => {
            finishConnectionTest('app-deploy-test-success');
        }).catch(err => {
            replyWithError(err);
        });

        setTimeout(function() {
            finishConnectionTest('app-deploy-test-error', {
                message: {
                    translation: 'core.server.requestTimeout'
                }
            });
        }, 15000);
    }

    // The connection test runs in the main process - the idle keep-alive sockets are closed right away
    closeConnection () {
        if (this.connection && typeof this.connection.close === 'function') {
            this.connection.close();
        }
    }

    sendProgress (progress, showOperations = true) {
        let operations = [this.deployment.currentOperationNumber, this.deployment.operationsCounter];

        if (!showOperations) {
            operations = false;
        }

        process.send({
            type: 'web-contents',
            message: 'app-uploading-progress',
            value: {
                progress,
                operations
            }
        });
    }
}

module.exports = GoogleCloud;
