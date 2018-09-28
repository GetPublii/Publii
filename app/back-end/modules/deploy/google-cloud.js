/*
 * Class used to upload files to the FTP(S) server
 */

const fs = require('fs-extra');
const path = require('path');
const GoogleCloudStorage = require('@google-cloud/storage');
const normalizePath = require('normalize-path');

class GoogleCloud {
    constructor(deploymentInstance = false) {
        this.deployment = deploymentInstance;
        this.connection = false;
        this.debugOutput = [];
        this.econnresetCounter = 0;
        this.softUploadErrors = {};
        this.hardUploadErrors = [];
        this.logTimer = false;
    }

    async initConnection() {
        let self = this;
        let bucketName = this.deployment.siteConfig.deployment.google.bucket;
        let keyFilePath = normalizePath(this.deployment.siteConfig.deployment.google.key);
        this.prefix = this.deployment.siteConfig.deployment.google.prefix;

        if(!fs.existsSync(keyFilePath)) {
            process.send({
                type: 'web-contents',
                message: 'app-connection-error'
            });

            return;
        }

        let gcs = GoogleCloudStorage({
            credentials: require(keyFilePath)
        });

        this.connection = gcs.bucket(bucketName);
        this.connection.setMetadata({
            website: {
                mainPageSuffix: "index.html",
                notFoundPage: "404.html"
            }
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

        this.logTimer = setInterval(() => {
            self.saveConnectionDebugLog();
        }, 5000);


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
    }

    downloadFilesList() {
        let self = this;
        let fileToDownload = normalizePath(path.join(this.deployment.outputDir, 'files.publii.json'));

        if(typeof this.prefix === 'string' && this.prefix !== '') {
            fileToDownload = normalizePath(path.join(this.deployment.outputDir, this.prefix, 'files.publii.json'));
        }

        this.connection.file(fileToDownload).download({
            destination: path.join(self.deployment.configDir, 'files-remote.json')
        }, function(err) {
            if (!err) {
                self.deployment.compareFilesList(true);
            } else {
                self.deployment.compareFilesList(false);
            }
        });
    }

    uploadNewFileList() {
        let self = this;
        let fileToUpload = normalizePath(path.join(this.deployment.inputDir, 'files.publii.json'));
        let fileDestination = 'files.publii.json';

        if(typeof this.prefix === 'string' && this.prefix !== '') {
            fileDestination = normalizePath(path.join(this.prefix, 'files.publii.json'));
        }

        process.send({
            type: 'web-contents',
            message: 'app-uploading-progress',
            value: {
                progress: 99,
                operations: [self.deployment.currentOperationNumber ,self.deployment.operationsCounter]
            }
        });

        this.connection.upload(fileToUpload, {
            destination: fileDestination
        }, function(err) {
            self.deployment.outputLog.push('-> files.publii.json');

            if (err) {
                self.deployment.outputLog.push(err);
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
    }

    uploadFile(input, output) {
        let self = this;

        if(typeof this.prefix === 'string' && this.prefix !== '') {
            output = normalizePath(path.join(this.prefix, output));
        }

        this.connection.upload(input, {
            destination: output,
            public: true
        }, function(err) {
            if (err) {
                self.deployment.outputLog.push(err);
                self.deployment.outputLog.push('- - -ERROR UPLOAD FILE - - -');
                self.deployment.outputLog.push(output);
                self.deployment.outputLog.push(err);
                self.deployment.outputLog.push('- - - - - - - - - - - - - - ');

                setTimeout(() => {
                    if(!self.softUploadErrors[input]) {
                        self.softUploadErrors[input] = 1;
                    } else {
                        self.softUploadErrors[input]++;
                    }

                    if(self.softUploadErrors[input] <= 5) {
                        self.uploadFile(input, output);
                    } else {
                        self.hardUploadErrors.push(input);

                        self.deployment.currentOperationNumber++;
                        self.deployment.outputLog.push('UPL HARD ERR ' + input + ' -> ' + output);
                        self.deployment.progressOfUploading += self.deployment.progressPerFile;

                        process.send({
                            type: 'web-contents',
                            message: 'app-uploading-progress',
                            value: {
                                progress: 8 + Math.floor(self.deployment.progressOfUploading),
                                operations: [self.deployment.currentOperationNumber, self.deployment.operationsCounter]
                            }
                        });

                        self.deployment.uploadFile();
                    }
                }, 500);
            } else {
                self.deployment.currentOperationNumber++;
                self.deployment.outputLog.push('UPL ' + input + ' -> ' + output);
                self.deployment.progressOfUploading += self.deployment.progressPerFile;

                process.send({
                    type: 'web-contents',
                    message: 'app-uploading-progress',
                    value: {
                        progress: 8 + Math.floor(self.deployment.progressOfUploading),
                        operations: [self.deployment.currentOperationNumber, self.deployment.operationsCounter]
                    }
                });

                self.deployment.uploadFile();
            }
        });
    }

    uploadDirectory(input, output) {
        this.deployment.uploadFile();
    }

    removeFile(input) {
        let self = this;

        if(typeof this.prefix === 'string' && this.prefix !== '') {
            input = normalizePath(path.join(this.prefix, input));
        }

        if(input[0] === '/') {
            input = input.substr(1);
        }

        this.connection.file(input).delete(function (err) {
            self.deployment.currentOperationNumber++;
            self.deployment.outputLog.push('DEL ' + input);

            if (err) {
                self.deployment.outputLog.push(err);
                self.deployment.outputLog.push('- - -ERROR REMOVE FILE - - -');
                self.deployment.outputLog.push(input);
                self.deployment.outputLog.push(err);
                self.deployment.outputLog.push('- - - - - - - - - - - - - - ');
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

            self.deployment.removeFile();
        });
    }

    removeDirectory(input) {
        this.deployment.removeFile();
    }

    async testConnection(app, deploymentConfig, siteName) {
        let bucketName = deploymentConfig.google.bucket;
        let keyFilePath = normalizePath(deploymentConfig.google.key);
        let waitForTimeout = true;

        if(!fs.existsSync(keyFilePath)) {
            waitForTimeout = false;
            app.mainWindow.webContents.send('app-deploy-test-error');
            return;
        }

        let gcs = GoogleCloudStorage({
            credentials: require(keyFilePath)
        });

        let bucket = gcs.bucket(bucketName);

        bucket.getMetadata().then(data => {
            waitForTimeout = false;
            app.mainWindow.webContents.send('app-deploy-test-success');
        }).catch(err => {
            waitForTimeout = false;
            app.mainWindow.webContents.send('app-deploy-test-error');
        });

        setTimeout(function() {
            if(waitForTimeout === true) {
                app.mainWindow.webContents.send('app-deploy-test-error');
            }
        }, 15000);
    }

    saveConnectionDebugLog() {
        let logPath = path.join(this.deployment.appDir, 'logs', 'connection-debug-log.txt');
        let softUploadErrorsPath = path.join(this.deployment.appDir, 'logs', 'soft-upload-errors-log.txt');
        let hardUploadErrorsPath = path.join(this.deployment.appDir, 'logs', 'hard-upload-errors-log.txt');

        fs.writeFileSync(logPath, this.debugOutput.join("\n"));
        fs.writeFileSync(softUploadErrorsPath, JSON.stringify(this.softUploadErrors));
        fs.writeFileSync(hardUploadErrorsPath, JSON.stringify(this.hardUploadErrors));
    }
}

module.exports = GoogleCloud;
