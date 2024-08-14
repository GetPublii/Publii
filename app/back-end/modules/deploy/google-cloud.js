/*
 * Class used to upload files to the FTP(S) server
 */

const fs = require('fs-extra');
const path = require('path');
const { Storage } = require('@google-cloud/storage');
const normalizePath = require('normalize-path');
const stripTags = require('striptags');

class GoogleCloud {
    constructor(deploymentInstance = false) {
        this.deployment = deploymentInstance;
        this.connection = false;
        this.debugOutput = [];
        this.econnresetCounter = 0;
        this.softUploadErrors = {};
        this.hardUploadErrors = [];
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

        let keyData = require(keyFilePath); 

        let gcs = new Storage({
            projectId: keyData.project_id,
            credentials: {
                client_email: keyData.client_email,
                private_key: keyData.private_key
            }
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
            destination: path.join(self.deployment.configDir, 'temp-files-remote.json')
        }, function(err) {
            if (!err) {
                let downloadedFilePath = path.join(self.deployment.configDir, 'temp-files-remote.json');
                let downloadedFile = fs.readFileSync(downloadedFilePath);
                self.deployment.checkLocalListWithRemoteList(downloadedFile);
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
            console.log(`[${ new Date().toUTCString() }] -> files.publii.json`);

            if (err) {
                console.log(`[${ new Date().toUTCString() }] ${err}`);
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

            setTimeout(function () {
                process.kill(process.pid, 'SIGTERM');
            }, 1000);
        });
    }

    uploadFile(input, output) {
        let self = this;

        if (typeof this.prefix === 'string' && this.prefix !== '') {
            output = normalizePath(path.join(this.prefix, output));
        }

        if (output[0] === '/') {
            output = output.substr(1);
        }

        this.connection.upload(input, {
            destination: output,
            public: true
        }, function(err) {
            if (err) {
                console.log(`[${ new Date().toUTCString() }] ERROR UPLOAD FILE: ${output}`);
                console.log(`[${ new Date().toUTCString() }] ${err}`);

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
                        console.log(`[${ new Date().toUTCString() }] UPL HARD ERR ${input} -> ${output}`);
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
                console.log(`[${ new Date().toUTCString() }] UPL ${input} -> ${output}`);
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
            console.log(`[${ new Date().toUTCString() }] DEL ${input}`);

            if (err) {
                console.log(`[${ new Date().toUTCString() }] ERROR REMOVE FILE: ${input}`);
                console.log(`[${ new Date().toUTCString() }] ${err}`);
            }

            self.deployment.progressOfDeleting += self.deployment.progressPerFile;

            process.send({
                type: 'web-contents',
                message: 'app-uploading-progress',
                value: {
                    progress: 8 + Math.floor(self.deployment.progressOfDeleting),
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

        let keyData = require(keyFilePath); 

        let gcs = new Storage({
            projectId: keyData.project_id,
            credentials: {
                client_email: keyData.client_email,
                private_key: keyData.private_key
            }
        });

        let bucket = gcs.bucket(bucketName);

        bucket.getMetadata().then(data => {
            waitForTimeout = false;
            app.mainWindow.webContents.send('app-deploy-test-success');
        }).catch(err => {
            waitForTimeout = false;
            app.mainWindow.webContents.send('app-deploy-test-error', {
                message: stripTags((err.message).toString())
            });
        });

        setTimeout(function() {
            if(waitForTimeout === true) {
                app.mainWindow.webContents.send('app-deploy-test-error');
            }
        }, 15000);
    }
}

module.exports = GoogleCloud;
