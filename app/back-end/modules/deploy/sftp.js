/*
 * Class used to upload files to the SFTP server
 */

const fs = require('fs-extra');
const path = require('path');
const sftpClient = require('ssh2-sftp-client');
const passwordSafeStorage = require('keytar');
const slug = require('./../../helpers/slug');
const normalizePath = require('normalize-path');

class SFTP {
    constructor(deploymentInstance = false) {
        this.deployment = deploymentInstance;
        this.connection = false;
    }

    async initConnection() {
        let waitForTimeout = true;
        let ftpPassword = this.deployment.siteConfig.deployment.password;
        let passphrase = this.deployment.siteConfig.deployment.passphrase;
        let account = slug(this.deployment.siteConfig.name);
        this.connection = new sftpClient();

        if (this.deployment.siteConfig.uuid) {
            account = this.deployment.siteConfig.uuid;
        }

        if(ftpPassword === 'publii ' + account) {
            ftpPassword = await passwordSafeStorage.getPassword('publii', account);
        }

        if(passphrase === 'publii-passphrase ' + account) {
            passphrase = await passwordSafeStorage.getPassword('publii-passphrase', account);
        }

        let connectionSettings = {
            host: this.deployment.siteConfig.deployment.server,
            port: this.deployment.siteConfig.deployment.port,
            username: this.deployment.siteConfig.deployment.username
        };

        if(this.deployment.siteConfig.deployment.protocol === 'sftp') {
            connectionSettings.password = ftpPassword;
        } else {
            let keyPath = this.deployment.siteConfig.deployment.sftpkey;

            if(passphrase !== '') {
                connectionSettings.passphrase = passphrase;
            }

            connectionSettings.privateKey = fs.readFileSync(keyPath);
        }

        this.connection.connect(connectionSettings).then(() => {
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

            waitForTimeout = false;

            process.send({
                type: 'web-contents',
                message: 'app-connection-success'
            });

            this.deployment.setInput();
            this.deployment.setOutput();
            this.deployment.prepareLocalFilesList();

            process.send({
                type: 'web-contents',
                message: 'app-uploading-progress',
                value: {
                    progress: 7,
                    operations: false
                }
            });

            this.downloadFilesList();
        }).catch(err => {
            console.log(`[${ new Date().toUTCString() }] ERR (1): ${err}`);
            this.connection.end();

            process.send({
                type: 'web-contents',
                message: 'app-connection-error'
            });

            setTimeout(function () {
                process.exit();
            }, 1000);
        });

        setTimeout(() => {
            if(waitForTimeout === true) {
                this.connection.end();

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
        this.connection.get(
            normalizePath(path.join(this.deployment.outputDir, 'files.publii.json'))
        ).then((stream) => {
            console.log(`[${ new Date().toUTCString() }] <- files.publii.json`);

            process.send({
                type: 'web-contents',
                message: 'app-uploading-progress',
                value: {
                    progress: 8,
                    operations: false
                }
            });

            let remoteFilesList = path.join(this.deployment.configDir, 'files-remote.json');
            fs.writeFileSync(remoteFilesList, stream);

            if(fs.readFileSync(remoteFilesList).length) {
                this.deployment.compareFilesList(true);
            } else {
                this.deployment.compareFilesList(false);
            }
        }).catch(err => {
            console.log(`[${ new Date().toUTCString() }] ERR (2): ${err} (${err.stack}) [<- files.publii.json]`);
            
            try {
                this.deployment.compareFilesList(false);
            } catch (err) {
                console.log(`[${ new Date().toUTCString() }] ERR (3): ${err} (${err.stack}) [<- files.publii.json]`);
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
                operations: [self.deployment.currentOperationNumber, self.deployment.operationsCounter]
            }
        });

        this.connection.put(
            normalizePath(path.join(self.deployment.inputDir, 'files.publii.json')),
            normalizePath(path.join(self.deployment.outputDir, 'files.publii.json'))
        ).then(function(result) {
            console.log(`[${ new Date().toUTCString() }] -> files.publii.json`);
            self.connection.end();

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
                process.exit();
            }, 1000);
        }).catch(err => {
            this.connection.end();
            console.log(`[${ new Date().toUTCString() }] ${err}`);

            setTimeout(function () {
                process.exit();
            }, 1000);
        });
    }

    uploadFile(input, output) {
        let self = this;

        this.connection.put(input, output).then(function (result) {
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
        }).catch(err => {
            console.log(`[${ new Date().toUTCString() }] ERROR UPLOAD FILE: ${normalizePath(path.join(self.outputDir, input))}`);
            console.log(`[${ new Date().toUTCString() }] ${err}`);
            self.deployment.uploadFile();
        });
    }

    uploadDirectory(input, output) {
        let self = this;

        this.connection.mkdir(output, true).then(function (result) {
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
        }).catch(err => {
            console.log(`[${ new Date().toUTCString() }] ERROR UPLOAD DIR: ${output}`);
            console.log(`[${ new Date().toUTCString() }] ${err}`);
            self.deployment.uploadFile();
        });
    }

    removeFile(input) {
        let self = this;

        this.connection.delete(input).then(function (result) {
            self.deployment.currentOperationNumber++;
            console.log(`[${ new Date().toUTCString() }] DEL ${input}`);
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
        }).catch(err => {
            console.log(`[${ new Date().toUTCString() }] ERROR REMOVE FILE: ${input}`);
            console.log(`[${ new Date().toUTCString() }] ${err}`);
            self.deployment.removeFile();
        });
    }

    removeDirectory(input) {
        let self = this;

        this.connection.rmdir(input, true).then(function (result) {
            self.deployment.currentOperationNumber++;
            console.log(`[${ new Date().toUTCString() }] DEL ${input}`);
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
        }).catch(err => {
            console.log(`[${ new Date().toUTCString() }] ERROR REMOVE DIR ${input}`);
            console.log(`[${ new Date().toUTCString() }] ${err}`);
            self.deployment.removeFile();
        });
    }

    async testConnection(app, deploymentConfig, siteName, siteConfig) {
        let client = new sftpClient();
        let waitForTimeout = true;
        let ftpPassword = deploymentConfig.password;
        let passphrase = deploymentConfig.passphrase;
        let account = slug(siteName);

        if (siteConfig.uuid) {
            account = siteConfig.uuid;
        }

        if(ftpPassword === 'publii ' + account) {
            ftpPassword = await passwordSafeStorage.getPassword('publii', account);
        }

        if(passphrase === 'publii-passphrase ' + account) {
            passphrase = await passwordSafeStorage.getPassword('publii-passphrase', account);
        }

        let connectionSettings = {
            host: deploymentConfig.server,
            port: deploymentConfig.port,
            username: deploymentConfig.username
        };

        if(deploymentConfig.protocol === 'sftp') {
            connectionSettings.password = ftpPassword;
        } else {
            let keyPath = deploymentConfig.sftpkey;

            if(passphrase !== '') {
                connectionSettings.passphrase = passphrase;
            }

            connectionSettings.privateKey = fs.readFileSync(keyPath);
        }

        let testFilePath = normalizePath(path.join(app.sitesDir, siteName, 'input', 'publii.test'));

        client.connect(connectionSettings).then(() => {
            return client.list('/');
        }).then(data => {
            fs.writeFileSync(testFilePath, 'It is a test file. You can remove it.');

            client.put(
                testFilePath,
                normalizePath(path.join(deploymentConfig.path, 'publii.test'))
            ).then(result => { 
                client.delete(
                    normalizePath(path.join(deploymentConfig.path, 'publii.test'))
                ).then(result => {
                    app.mainWindow.webContents.send('app-deploy-test-success');
                    
                    if (fs.existsSync(testFilePath)) {
                        fs.unlinkSync(testFilePath);
                    }

                    client.end();
                }).catch(err => {
                    app.mainWindow.webContents.send('app-deploy-test-write-error');
                    
                    if (fs.existsSync(testFilePath)) {
                        fs.unlinkSync(testFilePath);
                    }

                    client.end();
                });
            }).catch(err => {
                app.mainWindow.webContents.send('app-deploy-test-write-error');
               
                if (fs.existsSync(testFilePath)) {
                    fs.unlinkSync(testFilePath);
                }

                client.end();
            });

            waitForTimeout = false;
            app.mainWindow.webContents.send('app-deploy-test-success');
        }).catch(err => {
            console.log(`[${ new Date().toUTCString() }] ${err}`);

            if(waitForTimeout) {
                waitForTimeout = false;
                client.end();
                app.mainWindow.webContents.send('app-deploy-test-error');
            }
        });

        setTimeout(function() {
            if(waitForTimeout === true) {
                client.end();
                app.mainWindow.webContents.send('app-deploy-test-error');
            }
        }, 15000);
    }
}

module.exports = SFTP;
