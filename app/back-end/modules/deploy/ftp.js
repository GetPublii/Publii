/*
 * Class used to upload files to the FTP(S) server
 */

const fs = require('fs-extra');
const path = require('path');
const ftpClient = require('./../custom-changes/ftp');
const passwordSafeStorage = require('keytar');
const slug = require('./../../helpers/slug');
const normalizePath = require('normalize-path');
const stripTags = require('striptags');

class FTP {
    constructor(deploymentInstance = false) {
        this.deployment = deploymentInstance;
        this.connection = false;
        this.econnresetCounter = 0;
        this.softUploadErrors = {};
        this.hardUploadErrors = [];
    }

    async initConnection() {
        let self = this;
        let waitForTimeout = true;
        let ftpPassword = this.deployment.siteConfig.deployment.password;
        let account = slug(this.deployment.siteConfig.name);
        let secureConnection = false;

        if (this.deployment.siteConfig.uuid) {
            account = this.deployment.siteConfig.uuid;
        }

        this.connection = new ftpClient();

        if(ftpPassword === 'publii ' + account) {
            ftpPassword = await passwordSafeStorage.getPassword('publii', account);
        }

        if(this.deployment.siteConfig.deployment.protocol !== 'ftp') {
            secureConnection = true;
        }

        let connectionParams = {
            host: this.deployment.siteConfig.deployment.server,
            port: this.deployment.siteConfig.deployment.port,
            user: this.deployment.siteConfig.deployment.username,
            password: ftpPassword,
            secure: secureConnection,
            secureOptions: {
                host: this.deployment.siteConfig.deployment.server,
                port: this.deployment.siteConfig.deployment.port,
                user: this.deployment.siteConfig.deployment.username,
                password: ftpPassword,
                rejectUnauthorized: this.deployment.siteConfig.deployment.rejectUnauthorized
            },
            connTimeout: 15000,
            pasvTimeout: 15000,
            debug: self.connectionDebugger.bind(self)
        };

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

        this.connection.connect(connectionParams);

        this.connection.on('ready', function() {
            waitForTimeout = false;

            process.send({
                type: 'web-contents',
                message: 'app-connection-success'
            });

            self.deployment.setInput();
            self.deployment.setOutput();
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

        this.connection.on('error', function(err) {
            console.log(`[${ new Date().toUTCString() }] FTP ERROR: ${err}`);

            if(typeof err === "string" && err.indexOf('ECONNRESET') > -1) {
                self.econnresetCounter++;

                if(self.econnresetCounter <= 5) {
                    return;
                }
            }

            if(waitForTimeout) {
                waitForTimeout = false;
                self.connection.destroy();

                process.send({
                    type: 'web-contents',
                    message: 'app-connection-error',
                    value: {
                        additionalMessage: stripTags((err.message).toString())
                    }
                });

                setTimeout(function () {
                    process.kill(process.pid, 'SIGTERM');
                }, 1000);
            }
        });

        this.connection.on('close', function(err) {
            console.log(`[${ new Date().toUTCString() }] FTP CONNECTION CLOSED: ${err}`);

            setTimeout(function () {
                process.kill(process.pid, 'SIGTERM');
            }, 1000);
        });

        setTimeout(function() {
            if(waitForTimeout === true) {
                self.connection.destroy();
                console.log(`[${ new Date().toUTCString() }] Request timeout...`);

                process.send({
                    type: 'web-contents',
                    message: 'app-connection-error'
                });

                setTimeout(function () {
                    process.kill(process.pid, 'SIGTERM');
                }, 1000);
            }
        }, 20000);
    }

    downloadFilesList() {
        let self = this;

        this.connection.get(
            normalizePath(path.join(this.deployment.outputDir, 'files.publii.json')),
            function(err, fileStream) {
                console.log(`[${ new Date().toUTCString() }] <- files.publii.json`);

                process.send({
                    type: 'web-contents',
                    message: 'app-uploading-progress',
                    value: {
                        progress: 8,
                        operations: false
                    }
                });

                if (!err) {
                    let fileStreamChunks = [];

                    fileStream.on('data', (chunk) => {
                        fileStreamChunks.push(chunk.toString());
                    });

                    fileStream.on('end', () => {
                        let completeFile = fileStreamChunks.join('');
                        self.deployment.checkLocalListWithRemoteList(completeFile);
                    });
                } else {
                    console.log(`[${ new Date().toUTCString() }] (!) ERROR WHILE DOWNLOADING files-remote.json`);
                    console.log(`[${ new Date().toUTCString() }] ${err}`);
                    self.deployment.compareFilesList(false);
                }
            }
        );
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

        this.connection.put(
            normalizePath(path.join(this.deployment.inputDir, 'files.publii.json')),
            normalizePath(path.join(this.deployment.outputDir, 'files.publii.json')),
            function(err) {
                console.log(`[${ new Date().toUTCString() }] -> files.publii.json`);

                if (err) {
                    console.log(`[${ new Date().toUTCString() }] ${err}`);
                }

                self.connection.logout(function(err) {
                    if (err) {
                        console.log(`[${ new Date().toUTCString() }] ${err}`);
                    }

                    self.connection.end();
                    self.connection.destroy();
                });

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
                        status: true,
                        issues: self.hardUploadErrors.length > 0
                    }
                });

                setTimeout(function () {
                    process.kill(process.pid, 'SIGTERM');
                }, 1000);
            }
        );
    }

    uploadFile(input, output) {
        let self = this;

        this.connection.put(
            input,
            output,
            function (err) {
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
            }
        );
    }

    uploadDirectory(input, output) {
        let self = this;

        this.connection.mkdir(
            output,
            true,
            function (err) {
                if (err) {
                    console.log(`[${ new Date().toUTCString() }] ERROR UPLOAD DIR: ${output}`);
                    console.log(`[${ new Date().toUTCString() }] ${err}`);

                    setTimeout(() => {
                        if(!self.softUploadErrors[input]) {
                            self.softUploadErrors[input] = 1;
                        } else {
                            self.softUploadErrors[input]++;
                        }

                        if(self.softUploadErrors[input] <= 5) {
                            self.uploadDirectory(input, output);
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
            }
        );
    }

    removeFile(input) {
        let self = this;

        this.connection.delete(
            input,
            function (err) {
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
                        operations: [self.deployment.currentOperationNumber, self.deployment.operationsCounter]
                    }
                });

                self.deployment.removeFile();
            }
        );
    }

    removeDirectory(input) {
        let self = this;

        this.connection.rmdir(
            input,
            true,
            function (err) {
                self.deployment.currentOperationNumber++;
                console.log(`[${ new Date().toUTCString() }] DEL ${input}`);

                if (err) {
                    console.log(`[${ new Date().toUTCString() }] ERROR REMOVE DIR: ${input}`);
                    console.log(`[${ new Date().toUTCString() }] ${err}`);
                }
                
                self.deployment.progressOfDeleting += self.deployment.progressPerFile;

                process.send({
                    type: 'web-contents',
                    message: 'app-uploading-progress',
                    value: {
                        progress: 8 + Math.floor(self.deployment.progressOfDeleting),
                        operations: [self.deployment.currentOperationNumber, self.deployment.operationsCounter]
                    }
                });

                self.deployment.removeFile();
            }
        );
    }

    async testConnection(app, deploymentConfig, siteName, uuid) {
        let client = new ftpClient();
        let waitForTimeout = true;
        let ftpPassword = deploymentConfig.password;
        let account = slug(siteName);
        let secureConnection = false;

        if (uuid) {
            account = uuid;
        }

        if(ftpPassword === 'publii ' + account) {
            ftpPassword = await passwordSafeStorage.getPassword('publii', account);
        }

        if(deploymentConfig.protocol !== 'ftp') {
            secureConnection = true;
        }

        let connectionParams = {
            host: deploymentConfig.server,
            port: deploymentConfig.port,
            user: deploymentConfig.username,
            password: ftpPassword,
            secure: secureConnection,
            secureOptions: {
                host: deploymentConfig.server,
                port: deploymentConfig.port,
                user: deploymentConfig.username,
                password: ftpPassword,
                rejectUnauthorized: deploymentConfig.rejectUnauthorized
            },
            connTimeout: 10000,
            pasvTimeout: 10000
        };

        let testFilePath = normalizePath(path.join(app.sitesDir, siteName, 'input', 'publii.test'));
        fs.writeFileSync(testFilePath, 'It is a test file. You can remove it.');
        client.connect(connectionParams);

        client.on('ready', () => {
            waitForTimeout = false;

            client.put(
                normalizePath(testFilePath),
                normalizePath(path.join(deploymentConfig.path, 'publii.test')),
                (err) => {   
                    if (err) {
                        app.mainWindow.webContents.send('app-deploy-test-write-error');

                        if (fs.existsSync(testFilePath)) {
                            fs.unlinkSync(testFilePath);
                        }

                        client.destroy();
                        return;   
                    }
                    
                    client.delete(
                        normalizePath(path.join(deploymentConfig.path, 'publii.test')),
                        (err) => {
                            if (err) {
                                app.mainWindow.webContents.send('app-deploy-test-write-error');
                                
                                if (fs.existsSync(testFilePath)) {
                                    fs.unlinkSync(testFilePath);
                                }

                                client.destroy();
                                return;
                            }

                            app.mainWindow.webContents.send('app-deploy-test-success');
                            
                            if (fs.existsSync(testFilePath)) {
                                fs.unlinkSync(testFilePath);
                            }

                            client.destroy();
                        }
                    );
                }
            );
        });

        if (fs.existsSync(testFilePath)) {
            fs.unlinkSync(testFilePath);
        }

        client.on('error', function(err) {
            if(waitForTimeout) {
                waitForTimeout = false;
                client.destroy();
                app.mainWindow.webContents.send('app-deploy-test-error', { 
                    message: stripTags((err.message).toString())
                });
            }
        });

        setTimeout(function() {
            if(waitForTimeout === true) {
                client.destroy();
                app.mainWindow.webContents.send('app-deploy-test-error');
            }
        }, 15000);
    }

    connectionDebugger(message) {
        if(message.indexOf("[connection] > 'PASS ") > -1) {
            message = '[connection] > PASS ******************************';
        }

        message = `[${ new Date().toUTCString() }] ${message}`;
        console.log(message);
    }
}

module.exports = FTP;
