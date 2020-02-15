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
        this.logTimer = false;
    }

    async initConnection() {
        let waitForTimeout = true;
        let ftpPassword = this.deployment.siteConfig.deployment.password;
        let passphrase = this.deployment.siteConfig.deployment.passphrase;
        let account = slug(this.deployment.siteConfig.name);

        this.connection = new sftpClient();

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

        this.logTimer = setInterval(() => {
            this.deployment.saveConnectionLog();
        }, 5000);

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
            this.deployment.outputLog.push('ERR (1): ' + err);
            this.deployment.saveConnectionLog();
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
            this.deployment.outputLog.push('<- files.publii.json');

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
            this.deployment.outputLog.push('ERR (2): ' + err + ' [<- files.publii.json]');
            
            try {
                this.deployment.compareFilesList(false);
            } catch (err) {
                this.deployment.outputLog.push('ERR (3): ' + err + ' [<- files.publii.json]');
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
            self.deployment.outputLog.push('-> files.publii.json');
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

            self.deployment.saveConnectionLog();

            setTimeout(function () {
                process.exit();
            }, 1000);
        }).catch(err => {
            this.connection.end();
            self.deployment.outputLog.push(err);
            self.deployment.saveConnectionLog();

            setTimeout(function () {
                process.exit();
            }, 1000);
        });
    }

    uploadFile(input, output) {
        let self = this;

        this.connection.put(input, output).then(function (result) {
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
        }).catch(err => {
            self.deployment.outputLog.push('- - -ERROR UPLOAD FILE - - -');
            self.deployment.outputLog.push(normalizePath(path.join(self.outputDir, input)));
            self.deployment.outputLog.push(err);
            self.deployment.outputLog.push('- - - - - - - - - - - - - - ');
            self.deployment.uploadFile();
        });
    }

    uploadDirectory(input, output) {
        let self = this;

        this.connection.mkdir(output, true).then(function (result) {
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
        }).catch(err => {
            self.deployment.outputLog.push('- - -ERROR UPLOAD DIR - - -');
            self.deployment.outputLog.push(output);
            self.deployment.outputLog.push(err);
            self.deployment.outputLog.push('- - - - - - - - - - - - - - ');
            self.deployment.uploadFile();
        });
    }

    removeFile(input) {
        let self = this;

        this.connection.delete(input).then(function (result) {
            self.deployment.currentOperationNumber++;
            self.deployment.outputLog.push('DEL ' + input);
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
            self.deployment.outputLog.push('- - -ERROR REMOVE FILE - - -');
            self.deployment.outputLog.push(input);
            self.deployment.outputLog.push(err);
            self.deployment.outputLog.push('- - - - - - - - - - - - - - ');
            self.deployment.removeFile();
        });
    }

    removeDirectory(input) {
        let self = this;

        this.connection.rmdir(input, true).then(function (result) {
            self.deployment.currentOperationNumber++;
            self.deployment.outputLog.push('DEL ' + input);
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
            self.deployment.outputLog.push('- - -ERROR REMOVE DIR - - -');
            self.deployment.outputLog.push(input);
            self.deployment.outputLog.push(err);
            self.deployment.outputLog.push('- - - - - - - - - - - - - - ');
            self.deployment.removeFile();
        });
    }

    async testConnection(app, deploymentConfig, siteName) {
        let client = new sftpClient();
        let waitForTimeout = true;
        let ftpPassword = deploymentConfig.password;
        let passphrase = deploymentConfig.passphrase;
        let account = slug(siteName);

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
            console.log(err);

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
