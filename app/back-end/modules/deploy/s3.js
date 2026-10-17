/*
 * Class used to upload files to the S3 bucket
 */

const fs = require('fs-extra');
const path = require('path');
const S3ApiClient = require('./s3-api-client.js');
const passwordSafeStorage = require('./../../helpers/password-storage.js');
const slug = require('./../../helpers/slug');
const mime = require('mime');
const stripTags = require('striptags');

class S3 {
    constructor(deploymentInstance = false) {
        this.deployment = deploymentInstance;
        this.connection = false;
        this.econnresetCounter = 0;
        this.waitForTimeout = false;
        this.errorReported = false;
        this.softUploadErrors = {};
        this.hardUploadErrors = [];
    }

    async initConnection() {
        let s3Provider = this.deployment.siteConfig.deployment.s3.provider;
        let s3Endpoint = this.deployment.siteConfig.deployment.s3.endpoint;
        let s3Id = this.deployment.siteConfig.deployment.s3.id;
        let s3Key = this.deployment.siteConfig.deployment.s3.key;
        let region = this.deployment.siteConfig.deployment.s3.region;
        let customRegion = this.deployment.siteConfig.deployment.s3.customRegion;
        let account = slug(this.deployment.siteConfig.name);
        this.bucket = this.deployment.siteConfig.deployment.s3.bucket;
        this.prefix = this.deployment.siteConfig.deployment.s3.prefix;
        this.waitForTimeout = true;

        if (this.deployment.siteConfig.uuid) {
            account = this.deployment.siteConfig.uuid;
        }

        if (s3Id === 'publii-s3-id ' + account) {
            s3Id = await passwordSafeStorage.getPassword('publii-s3-id', account);
        }

        if (s3Key === 'publii-s3-key ' + account) {
            s3Key = await passwordSafeStorage.getPassword('publii-s3-key', account);
        }

        if (s3Provider !== 'aws' && typeof s3Endpoint === 'string' && s3Endpoint.indexOf('://') === -1) {
            s3Endpoint = 'https://' + s3Endpoint;
        }

        let connectionParams;

        if (s3Provider === 'aws') {
            connectionParams = {
                accessKeyId: s3Id,
                secretAccessKey: s3Key,
                region: region,
                bucket: this.bucket
            }
        } else {
            connectionParams = {
                accessKeyId: s3Id,
                secretAccessKey: s3Key,
                endpoint: s3Endpoint,
                region: customRegion,
                bucket: this.bucket
            }
        }

        this.sendProgress(6, false);

        process.send({
            type: 'web-contents',
            message: 'app-connection-in-progress'
        });

        try {
            this.connection = new S3ApiClient(connectionParams);
            await this.connection.listObjects({
                prefix: this.prefix,
                maxKeys: 1
            });
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
    }

    async downloadFilesList() {
        let fileName = 'files.publii.json';

        if (typeof this.prefix === 'string' && this.prefix !== '') {
            fileName = this.prefix + fileName;
        }

        try {
            let remoteFile = await this.connection.getObject(fileName);
            console.log(`[${new Date().toUTCString()}] <- files.publii.json`);
            this.sendProgress(8, false);
            this.deployment.checkLocalListWithRemoteList(remoteFile.toString('utf-8'));
          } catch (err) {
            console.log(`[${new Date().toUTCString()}] <- files.publii.json`);

            if (err.code !== 'NoSuchKey' && err.code !== 'NotFound') {
                this.onError(err);
                return;
            }

            this.sendProgress(8, false);
            this.deployment.compareFilesList(false);
        }
    }

    async uploadNewFileList() {
        this.sendProgress(99);
        let fileName = 'files.publii.json';

        if (typeof this.prefix === 'string' && this.prefix !== '') {
            fileName = this.prefix + fileName;
        }

        let filePath = path.join(this.deployment.inputDir, 'files.publii.json');

        fs.readFile(filePath, async (err, fileContent) => {
            if (err) {
                this.onError(err);
                return;
            }

            let fileACL = this.deployment.siteConfig.deployment.s3.acl || 'public-read';

            try {
                await this.connection.putObject(fileName, fileContent, {
                    acl: fileACL,
                    contentType: mime.getType(fileName) || 'application/json'
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

    /**
     * Uploads file
     */
    async uploadFile() {
        if (this.deployment.filesToUpload.length > 0) {
            let fileToUpload = this.deployment.filesToUpload.pop();
            fileToUpload.path = this.prepareFilePath(fileToUpload.path);

            if (fileToUpload.type === 'file') {
                await this.uploadFileObject(fileToUpload.path);
            } else {
                await this.uploadFile();
            }
        } else {
            this.sendProgress(98);
            await this.uploadNewFileList();
        }
    }

    async uploadFileObject(input) {
        let filePath = path.join(this.deployment.inputDir, input);

        fs.readFile(filePath, async (err, fileContent) => {
            if (err) {
                this.onError(err);
                return;
            }

            let fileName = input;

            if (typeof this.prefix === 'string' && this.prefix !== '') {
                fileName = this.prefix + fileName;
            }

            let fileACL = this.deployment.siteConfig.deployment.s3.acl || 'public-read';
            let htmlCacheControl = this.deployment.siteConfig.deployment.s3.htmlCacheControl || 'no-cache, no-store';
            let otherCacheControl = this.deployment.siteConfig.deployment.s3.otherCacheControl || 'public, max-age=2592000';
            let fileExtension = path.extname(fileName).substring(1);
            let cacheControl = fileExtension === 'html' ? htmlCacheControl : otherCacheControl;

            try {
                await this.connection.putObject(fileName, fileContent, {
                    acl: fileACL,
                    cacheControl: cacheControl,
                    contentType: mime.getType(fileExtension) || 'application/octet-stream'
                });
                this.deployment.currentOperationNumber++;
                console.log(`[${ new Date().toUTCString() }] UPL ${input} -> ${fileName}`);
                this.deployment.progressOfUploading += this.deployment.progressPerFile;
                this.sendProgress(8 + Math.floor(this.deployment.progressOfUploading));
                await this.uploadFile();
            } catch (uploadErr) {
                this.onError(uploadErr, true);

                setTimeout(async () => {
                    if (!this.softUploadErrors[input]) {
                        this.softUploadErrors[input] = 1;
                    } else {
                        this.softUploadErrors[input]++;
                    }

                    if (this.softUploadErrors[input] <= 5) {
                        await this.uploadFileObject(input);
                    } else {
                        this.hardUploadErrors.push(input);
                        this.deployment.currentOperationNumber++;
                        console.log(`[${ new Date().toUTCString() }] UPL HARD ERR ${input} -> ${fileName}`);
                        this.deployment.progressOfUploading += this.deployment.progressPerFile;
                        this.sendProgress(8 + Math.floor(this.deployment.progressOfUploading));
                        await this.uploadFile();
                    }
                }, 500);
            }
        });
    }

    async removeFile() {
        if (this.deployment.filesToRemove.length > 0) {
            let fileToRemove = this.deployment.filesToRemove.pop();
            fileToRemove.path = this.prepareFilePath(fileToRemove.path);

            if(fileToRemove.type === 'file') {
                await this.removeFileObject(fileToRemove.path);
            } else {
                await this.removeFile();
            }
        } else {
            this.sendProgress(8 + Math.floor(this.deployment.progressOfUploading));
            await this.uploadFile();
        }
    }

    async removeFileObject(input) {
        let key = input;

        if (typeof this.prefix === 'string' && this.prefix !== '') {
            key = this.prefix + input;
        }

        try {
            await this.connection.deleteObject(key);
            this.deployment.currentOperationNumber++;
            console.log(`[${ new Date().toUTCString() }] DEL ${input}`);
            this.deployment.progressOfDeleting += this.deployment.progressPerFile;
            this.sendProgress(8 + Math.floor(this.deployment.progressOfDeleting));
            await this.removeFile();
        } catch (err) {
            // Handle case when specific file no longer exists in the bucket - don't block sync
            if (err.code === 'NoSuchKey' || err.code === 'NotFound') {
                this.deployment.currentOperationNumber++;
                console.log(`[${ new Date().toUTCString() }] DEL ${input} - NoSuchKey`);
                this.deployment.progressOfDeleting += this.deployment.progressPerFile;
                this.sendProgress(8 + Math.floor(this.deployment.progressOfDeleting));
                await this.removeFile();
                return;
            }

            console.error(`[${new Date().toUTCString()}] Error deleting ${input}`, err);
            this.onError(err);
        }
    }

    /*
     * Silent mode is used for the errors which are retried (the file uploads) - every other error
     * ends the synchronization with a message
     */
    onError(err, silentMode = false) {
        console.log(`[${ new Date().toUTCString() }] S3 ERROR: ${err.message}`);

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

    prepareFilePath(filePath) {
        if (filePath[0] && filePath[0] === '/') {
            filePath = filePath.substr(1);
        }

        return filePath;
    }

    async testConnection(app, deploymentConfig, siteName, uuid, sender) {
        let s3Provider = deploymentConfig.s3.provider;
        let s3Endpoint = deploymentConfig.s3.endpoint;
        let s3Id = deploymentConfig.s3.id;
        let s3Key = deploymentConfig.s3.key;
        let bucket = deploymentConfig.s3.bucket;
        let prefix = deploymentConfig.s3.prefix;
        let region = deploymentConfig.s3.region;
        let customRegion = deploymentConfig.s3.customRegion;
        let account = slug(siteName);
        let waitForTimeout = true;

        if (uuid) {
            account = uuid;
        }

        if (s3Id === 'publii-s3-id ' + account) {
            s3Id = await passwordSafeStorage.getPassword('publii-s3-id', account);
        }

        if (s3Key === 'publii-s3-key ' + account) {
            s3Key = await passwordSafeStorage.getPassword('publii-s3-key', account);
        }

        let connectionParams;

        if (s3Provider === 'aws') {
            connectionParams = {
                accessKeyId: s3Id,
                secretAccessKey: s3Key,
                region: region,
                bucket: bucket
            }
        } else {
            connectionParams = {
                accessKeyId: s3Id,
                secretAccessKey: s3Key,
                endpoint: s3Endpoint,
                region: customRegion,
                bucket: bucket
            }
        }

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
            this.connection = new S3ApiClient(connectionParams);
        } catch (err) {
            replyWithError(err);
            return;
        }

        this.connection.listObjects({
            prefix: prefix,
            maxKeys: 1
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

module.exports = S3;
