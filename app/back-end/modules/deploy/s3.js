/*
 * Class used to upload files to the S3 bucket
 */

const fs = require('fs-extra');
const path = require('path');
const AWS = require('aws-sdk');
const passwordSafeStorage = require('keytar');
const slug = require('./../../helpers/slug');
const mime = require('mime');

class S3 {
    constructor(deploymentInstance = false) {
        this.deployment = deploymentInstance;
        this.connection = false;
        this.debugOutput = [];
        this.econnresetCounter = 0;
        this.waitForTimeout = false;
    }

    async initConnection() {
        let self = this;
        let s3Id = this.deployment.siteConfig.deployment.s3.id;
        let s3Key = this.deployment.siteConfig.deployment.s3.key;
        let region = this.deployment.siteConfig.deployment.s3.region;
        let account = slug(this.deployment.siteConfig.name);
        this.bucket = this.deployment.siteConfig.deployment.s3.bucket;
        this.prefix = this.deployment.siteConfig.deployment.s3.prefix;
        this.waitForTimeout = true;

        if(s3Id === 'publii-s3-id ' + account) {
            s3Id = await passwordSafeStorage.getPassword('publii-s3-id', account);
        }

        if(s3Key === 'publii-s3-key ' + account) {
            s3Key = await passwordSafeStorage.getPassword('publii-s3-key', account);
        }

        this.connection = new AWS.S3({
            accessKeyId: s3Id,
            secretAccessKey: s3Key,
            region: region,
            sslEnabled: true,
            signatureVersion: 'v4'
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

        let params = {
            Bucket: this.bucket,
            Prefix: this.prefix,
            MaxKeys: 1
        };

        this.connection.listObjects(params, function(err, data) {
            if(err) {
                self.onError(err);
                return;
            }

            self.waitForTimeout = false;

            process.send({
                type: 'web-contents',
                message: 'app-connection-success'
            });

            self.deployment.setInput();
            self.deployment.setOutput(true);
            self.deployment.prepareLocalFilesList();

            process.send({
                type: 'web-contents',
                message: 'app-uploading-progress',
                value: {
                    progress: 7,
                    operations: false
                }
            });

            self.downloadFilesList();
        });

        setTimeout(function() {
            if(self.waitForTimeout === true) {
                self.saveConnectionDebugLog();

                process.send({
                    type: 'web-contents',
                    message: 'app-connection-error'
                });

                setTimeout(function () {
                    process.exit();
                }, 1000);
            }
        }, 20000);
    }

    downloadFilesList() {
        let self = this;
        let fileName = 'files.publii.json';

        if(typeof this.prefix === 'string' && this.prefix !== '') {
            fileName = this.prefix + fileName;
        }

        let params = {
            Bucket: this.bucket,
            Key: fileName
        };

        this.connection.getObject(params, function(err, data) {
            self.deployment.outputLog.push('<- files.publii.json');

            if (err && err.code !== 'NoSuchKey') {
                self.onError(err);
                return;
            }

            process.send({
                type: 'web-contents',
                message: 'app-uploading-progress',
                value: {
                    progress: 8,
                    operations: false
                }
            });

            if (err && err.code === 'NoSuchKey') {
                self.deployment.compareFilesList(false);
            } else {
                fs.writeFile(path.join(self.deployment.configDir, 'files-remote.json'), data.Body, function() {
                    if (err) {
                        self.onError(err);
                        return;
                    }

                    self.deployment.compareFilesList(true);
                });
            }
        });
    }

    uploadNewFileList() {
        let self = this;

        process.send({
            type: 'web-contents',
            message: 'app-uploading-progress',
            value: {
                progress: 99,
                operations: [self.deployment.currentOperationNumber ,self.deployment.operationsCounter]
            }
        });

        fs.readFile(path.join(this.deployment.inputDir, 'files.publii.json'), (err, fileContent) => {
            let fileName = 'files.publii.json';

            if(typeof this.prefix === 'string' && this.prefix !== '') {
                fileName = this.prefix + fileName;
            }

            let params = {
                ACL: 'authenticated-read',
                Body: fileContent,
                Bucket: this.bucket,
                Key: fileName,
                ContentType: mime.getType('json')
            };

            this.connection.putObject(params, function(err) {
                self.deployment.outputLog.push('-> files.publii.json');

                if (err) {
                    self.onError(err, true);
                }

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
        });
    }

    /**
     * Uploads file
     */
    uploadFile() {
        let self = this;

        if(this.deployment.filesToUpload.length > 0) {
            let fileToUpload = this.deployment.filesToUpload.pop();
            fileToUpload.path = this.prepareFilePath(fileToUpload.path);

            if(fileToUpload.type === 'file') {
                this.uploadFileObject(fileToUpload.path);
            } else {
                this.uploadFile();
            }
        } else {
            process.send({
                type: 'web-contents',
                message: 'app-uploading-progress',
                value: {
                    progress: 98,
                    operations: [self.deployment.currentOperationNumber, self.deployment.operationsCounter]
                }
            });

            this.uploadNewFileList();
        }
    }

    uploadFileObject(input) {
        let self = this;

        fs.readFile(path.join(this.deployment.inputDir, input), (err, fileContent) => {
            let fileName = input;
            let fileExtension = path.parse(fileName).ext.substr(1);

            if(typeof this.prefix === 'string' && this.prefix !== '') {
                fileName = this.prefix + fileName;
            }

            let params = {
                ACL: "public-read",
                Body: fileContent,
                Bucket: this.bucket,
                Key: fileName,
                ContentType: mime.getType(fileExtension)
            };

            this.connection.putObject(params, function (err) {
                if (err) {
                    self.onError(err, true);

                    setTimeout(() => {
                        if(!self.softUploadErrors[input]) {
                            self.softUploadErrors[input] = 1;
                        } else {
                            self.softUploadErrors[input]++;
                        }

                        if(self.softUploadErrors[input] <= 5) {
                            self.uploadFileObject(input);
                        } else {
                            self.hardUploadErrors.push(input);

                            self.deployment.currentOperationNumber++;
                            self.deployment.outputLog.push('UPL HARD ERR ' + input + ' -> ' + fileName);
                            self.deployment.progressOfUploading += self.deployment.progressPerFile;

                            process.send({
                                type: 'web-contents',
                                message: 'app-uploading-progress',
                                value: {
                                    progress: 8 + Math.floor(self.deployment.progressOfUploading),
                                    operations: [self.deployment.currentOperationNumber, self.deployment.operationsCounter]
                                }
                            });

                            self.uploadFile();
                        }
                    }, 500);
                } else {
                    self.deployment.currentOperationNumber++;
                    self.deployment.outputLog.push('UPL ' + input + ' -> ' + fileName);
                    self.deployment.progressOfUploading += self.deployment.progressPerFile;

                    process.send({
                        type: 'web-contents',
                        message: 'app-uploading-progress',
                        value: {
                            progress: 8 + Math.floor(self.deployment.progressOfUploading),
                            operations: [self.deployment.currentOperationNumber, self.deployment.operationsCounter]
                        }
                    });

                    self.uploadFile();
                }
            });
        });
    }

    removeFile() {
        let self = this;

        if(this.deployment.filesToRemove.length > 0) {
            let fileToRemove = this.deployment.filesToRemove.pop();
            fileToRemove.path = this.prepareFilePath(fileToRemove.path);

            if(fileToRemove.type === 'file') {
                this.removeFileObject(fileToRemove.path);
            } else {
                this.removeFile();
            }
        } else {
            process.send({
                type: 'web-contents',
                message: 'app-uploading-progress',
                value: {
                    progress: 8 + Math.floor(self.deployment.progressOfUploading),
                    operations: [self.deployment.currentOperationNumber, self.deployment.operationsCounter]
                }
            });

            this.uploadFile();
        }
    }

    removeFileObject(input) {
        let self = this;
        let params = {
            Bucket: this.bucket,
            Key: input
        };

        this.connection.deleteObject(
            params,
            function (err) {
                self.deployment.currentOperationNumber++;
                self.deployment.outputLog.push('DEL ' + input);

                if (err) {
                    self.onError(err, true);
                }

                self.deployment.progressOfDeleting += self.deployment.progressPerFile;

                process.send({
                    type: 'web-contents',
                    message: 'app-uploading-progress',
                    value: {
                        progress: 40 + Math.floor(self.deployment.progressOfDeleting),
                        operations: [self.deployment.currentOperationNumber ,self.deployment.operationsCounter]
                    }
                });

                self.removeFile();
            }
        );
    }

    onError(err, silentMode = false) {
        this.deployment.outputLog.push('- - -  S3 ERROR - - -');
        this.deployment.outputLog.push(err.message);
        this.deployment.outputLog.push('- - - - - - - - - - -');
        this.deployment.saveConnectionErrorLog(err);
        this.saveConnectionDebugLog();

        if(this.waitForTimeout && !silentMode) {
            this.waitForTimeout = false;

            process.send({
                type: 'web-contents',
                message: 'app-connection-error'
            });

            setTimeout(function () {
                process.exit();
            }, 1000);
        }
    }

    prepareFilePath(filePath) {
        if(filePath[0] && filePath[0] === '/') {
            filePath = filePath.substr(1);
        }

        return filePath;
    }

    async testConnection(app, deploymentConfig, siteName) {
        let s3Id = deploymentConfig.s3.id;
        let s3Key = deploymentConfig.s3.key;
        let bucket = deploymentConfig.s3.bucket;
        let prefix = deploymentConfig.s3.prefix;
        let region = deploymentConfig.s3.region;
        let account = slug(siteName);
        let waitForTimeout = true;

        if(s3Id === 'publii-s3-id ' + account) {
            s3Id = await passwordSafeStorage.getPassword('publii-s3-id', account);
        }

        if(s3Key === 'publii-s3-key ' + account) {
            s3Key = await passwordSafeStorage.getPassword('publii-s3-key', account);
        }

        let connection = new AWS.S3({
            accessKeyId: s3Id,
            secretAccessKey: s3Key,
            region: region,
            sslEnabled: true,
            signatureVersion: 'v4'
        });

        let testParams = {
            Bucket: bucket,
            Prefix: prefix,
            MaxKeys: 1
        };

        connection.listObjects(testParams, function(err, data) {
            if(err) {
                waitForTimeout = false;
                app.mainWindow.webContents.send('app-deploy-test-error', {
                    message: err.message
                });

                return;
            }

            waitForTimeout = false;
            app.mainWindow.webContents.send('app-deploy-test-success');
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

module.exports = S3;
