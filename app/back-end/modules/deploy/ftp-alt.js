/*
 * Class used to upload files to the FTP(S) server
 */

const fs = require('fs-extra');
const path = require('path');
const FileHelper = require('./../../helpers/file.js');
const ftp = require('basic-ftp');
const passwordSafeStorage = require('./../../helpers/password-storage.js');
const slug = require('./../../helpers/slug');
const normalizePath = require('normalize-path');
const stripTags = require('striptags');

class FTPAlt {
    constructor(deploymentInstance = false) {
        this.deployment = deploymentInstance;
        this.connection = false;
        this.softUploadErrors = {};
        this.hardUploadErrors = [];
        this.deploymentAborted = false;
        this.errorReported = false;
        this.connectionBusy = false;
        this.keepAliveInterval = false;
        this.keepAlivePromise = null;
    }

    async initConnection() {
        let ftpPassword = this.deployment.siteConfig.deployment.password;
        let account = slug(this.deployment.siteConfig.name);
        let secureConnection = false;

        if (this.deployment.siteConfig.uuid) {
            account = this.deployment.siteConfig.uuid;
        }

        this.connection = new ftp.Client(15000);
        this.connection.ftp.verbose = true;
        this.connection.ftp.log = this.connectionDebugger;

        if (ftpPassword === 'publii ' + account) {
            ftpPassword = await passwordSafeStorage.getPassword('publii', account);
        }

        if (this.deployment.siteConfig.deployment.protocol !== 'ftp') {
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
            }
        };

        process.send({
            type: 'web-contents',
            message: 'app-uploading-progress',
            value: {
                progress: 6,
                message: {
                    translation: 'sync.preparingFiles'
                },
                operations: false
            }
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

        process.send({
            type: 'web-contents',
            message: 'app-connection-in-progress'
        });

        try {
            await this.connection.access(connectionParams);
        } catch (err) {
            console.log(`[${ new Date().toUTCString() }] FTP CONNECTION ERROR: ${err}`);
            this.errorReported = true;
            this.connection.close();

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

            return;
        }

        process.send({
            type: 'web-contents',
            message: 'app-connection-success'
        });

        this.startKeepAlive();
        this.downloadFilesList();
    }

    startKeepAlive () {
        this.keepAliveInterval = setInterval(() => {
            if (this.connectionBusy || this.keepAlivePromise || !this.connection || this.connection.closed) {
                return;
            }

            this.keepAlivePromise = this.connection.send('NOOP').catch(err => {
                console.log(`[${ new Date().toUTCString() }] KEEP-ALIVE NOOP ERROR: ${err}`);
            }).finally(() => {
                this.keepAlivePromise = null;
            });
        }, 10000);
    }

    stopKeepAlive () {
        if (this.keepAliveInterval) {
            clearInterval(this.keepAliveInterval);
            this.keepAliveInterval = false;
        }
    }

    async acquireConnection () {
        this.connectionBusy = true;

        if (this.keepAlivePromise) {
            await this.keepAlivePromise;
        }
    }

    releaseConnection () {
        this.connectionBusy = false;
    }

    handleConnectionLost (err) {
        this.stopKeepAlive();
        console.log(`[${ new Date().toUTCString() }] FTP CONNECTION LOST: ${err}`);

        if (!this.deploymentAborted && !this.errorReported) {
            this.errorReported = true;

            process.send({
                type: 'web-contents',
                message: 'app-connection-error',
                value: {
                    additionalMessage: 'The server has unexpectedly closed the connection during synchronization - it can be caused by the idle timeout settings on the server. Last error: ' + stripTags((err.message || err).toString())
                }
            });
        }

        setTimeout(function () {
            process.kill(process.pid, 'SIGTERM');
        }, 1000);
    }

    async downloadFilesList() {
        try {
            await this.acquireConnection();
            await this.connection.downloadTo(
                normalizePath(path.join(this.deployment.configDir, 'remote-files.json')),
                normalizePath(path.join(this.deployment.outputDir, 'files.publii.json'))
            );
            this.releaseConnection();
            let fileToCompare = FileHelper.readFileSync(normalizePath(path.join(this.deployment.configDir, 'remote-files.json')));
            this.deployment.checkLocalListWithRemoteList(fileToCompare);
            console.log(`[${ new Date().toUTCString() }] <- files.publii.json`);
            process.send({
                type: 'web-contents',
                message: 'app-uploading-progress',
                value: {
                    progress: 8,
                    operations: false
                }
            });
        } catch (err) {
            this.releaseConnection();

            if (this.connection.closed) {
                this.handleConnectionLost(err);
                return;
            }

            console.log(`[${ new Date().toUTCString() }] (!) ERROR WHILE DOWNLOADING files-remote.json`);
            console.log(`[${ new Date().toUTCString() }] ${err}`);
            this.deployment.compareFilesList(false);
        }
    }

    async uploadNewFileList() {
        process.send({
            type: 'web-contents',
            message: 'app-uploading-progress',
            value: {
                progress: 99,
                operations: [this.deployment.currentOperationNumber, this.deployment.operationsCounter]
            }
        });

        this.stopKeepAlive();

        try {
            await this.acquireConnection();
            await this.connection.uploadFrom(
                normalizePath(path.join(this.deployment.inputDir, 'files.publii.json')),
                normalizePath(path.join(this.deployment.outputDir, 'files.publii.json')),
            );

            console.log(`[${ new Date().toUTCString() }] -> files.publii.json`);
        } catch (err) {
            console.log(`[${ new Date().toUTCString() }] ${err}`);

            if (this.connection.closed) {
                this.handleConnectionLost(err);
                return;
            }
        } finally {
            this.releaseConnection();
        }

        this.connection.close();
        console.log(`[${ new Date().toUTCString() }] FTP CONNECTION CLOSED`);

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
                issues: this.hardUploadErrors.length > 0
            }
        });

        setTimeout(function () {
            process.kill(process.pid, 'SIGTERM');
        }, 1000);
    }

    async uploadFile(input, output) {
        try {
            await this.acquireConnection();
            await this.connection.uploadFrom(input, output);
            this.releaseConnection();
        } catch (err) {
            this.releaseConnection();

            if (this.connection.closed) {
                this.handleConnectionLost(err);
                return;
            }

            console.log(`[${ new Date().toUTCString() }] ERROR UPLOAD FILE: ${output}`);
            console.log(`[${ new Date().toUTCString() }] ${err}`);

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
                    console.log(`[${ new Date().toUTCString() }] UPL HARD ERR ${input} -> ${output}`);
                    this.deployment.progressOfUploading += this.deployment.progressPerFile;
                    this.updateProgress('progressOfUploading');
                    this.deployment.uploadFile();
                }
            }, 500);

            return;
        }

        this.deployment.currentOperationNumber++;
        console.log(`[${ new Date().toUTCString() }] UPL ${input} -> ${output}`);
        this.deployment.progressOfUploading += this.deployment.progressPerFile;
        this.updateProgress('progressOfUploading');
        this.deployment.uploadFile();
    }

    async uploadDirectory(input, output) {
        try {
            await this.acquireConnection();
            await this.connection.ensureDir(output);
            this.releaseConnection();
        } catch (err) {
            this.releaseConnection();

            if (this.connection.closed) {
                this.handleConnectionLost(err);
                return;
            }

            console.log(`[${ new Date().toUTCString() }] ERROR UPLOAD DIR: ${output}`);
            console.log(`[${ new Date().toUTCString() }] ${err}`);

            setTimeout(async () => {
                if(!this.softUploadErrors[input]) {
                    this.softUploadErrors[input] = 1;
                } else {
                    this.softUploadErrors[input]++;
                }

                if (this.softUploadErrors[input] <= 5) {
                    await this.uploadDirectory(input, output);
                } else {
                    this.hardUploadErrors.push(input);
                    this.deployment.currentOperationNumber++;
                    console.log(`[${ new Date().toUTCString() }] UPL HARD ERR ${input} -> ${output}`);
                    this.deployment.progressOfUploading += this.deployment.progressPerFile;
                    this.updateProgress('progressOfUploading');
                    this.deployment.uploadFile();
                }
            }, 500);

            return;
        }

        try {
            let rootPath = this.deployment.outputDir;

            if (!rootPath) {
                rootPath = '/';
            }

            await this.acquireConnection();
            await this.connection.cd(rootPath);
            this.releaseConnection();
        } catch (err) {
            this.releaseConnection();

            if (this.connection.closed) {
                this.handleConnectionLost(err);
                return;
            }

            console.log(`[${ new Date().toUTCString() }] CD error ${err.message}`);
        }

        this.deployment.currentOperationNumber++;
        console.log(`[${ new Date().toUTCString() }] UPL ${input} -> ${output}`);
        this.deployment.progressOfUploading += this.deployment.progressPerFile;
        this.updateProgress('progressOfUploading');
        this.deployment.uploadFile();
    }

    async removeFile(input) {
        try {
            await this.acquireConnection();
            await this.connection.remove(input);
            this.releaseConnection();
            console.log(`[${ new Date().toUTCString() }] DEL ${input}`);
        } catch (err) {
            this.releaseConnection();

            if (this.connection.closed) {
                this.handleConnectionLost(err);
                return;
            }

            console.log(`[${ new Date().toUTCString() }] ERROR REMOVE FILE: ${input}`);
            console.log(`[${ new Date().toUTCString() }] ${err}`);
        }

        this.deployment.currentOperationNumber++;
        this.deployment.progressOfDeleting += this.deployment.progressPerFile;
        this.updateProgress('progressOfDeleting');
        this.deployment.removeFile();
    }

    async removeDirectory(input) {
        try {
            await this.acquireConnection();
            await this.connection.removeDir(input);
            this.releaseConnection();
            console.log(`[${ new Date().toUTCString() }] DEL ${input}`);
        } catch (err) {
            this.releaseConnection();

            if (this.connection.closed) {
                this.handleConnectionLost(err);
                return;
            }

            console.log(`[${ new Date().toUTCString() }] ERROR REMOVE DIR: ${input}`);
            console.log(`[${ new Date().toUTCString() }] ${err}`);
        }

        this.deployment.currentOperationNumber++;
        this.deployment.progressOfDeleting += this.deployment.progressPerFile;
        this.updateProgress('progressOfDeleting');
        this.deployment.removeFile();
    }

    updateProgress (progressType) {
        process.send({
            type: 'web-contents',
            message: 'app-uploading-progress',
            value: {
                progress: 8 + Math.floor(this.deployment[progressType]),
                operations: [this.deployment.currentOperationNumber, this.deployment.operationsCounter]
            }
        });
    }

    async testConnection(app, deploymentConfig, siteName, uuid, sender) {
        let client = new ftp.Client(15000);
        client.ftp.verbose = true;
        client.ftp.log = this.connectionDebugger;

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
            }
        };

        let testFilePath = normalizePath(path.join(app.sitesDir, siteName, 'input', 'publii.test'));
        fs.writeFileSync(testFilePath, 'It is a test file. You can remove it.');

        try {
            await client.access(connectionParams);
            waitForTimeout = false;
        } catch (err) {
            client.close();
            sender.send('app-deploy-test-error', { 
                message: stripTags((err.message).toString())
            });
        }

        try {
            await client.uploadFrom(normalizePath(testFilePath), normalizePath(path.join(deploymentConfig.path, 'publii.test')));
        } catch (err) {
            sender.send('app-deploy-test-write-error');

            if (fs.existsSync(testFilePath)) {
                fs.unlinkSync(testFilePath);
            }

            client.close();
            return; 
        }

        try {
            await client.remove(normalizePath(path.join(deploymentConfig.path, 'publii.test')));
        } catch (err) {
            sender.send('app-deploy-test-write-error');
            
            if (fs.existsSync(testFilePath)) {
                fs.unlinkSync(testFilePath);
            }

            client.close();
            return;
        }

        sender.send('app-deploy-test-success');
            
        if (fs.existsSync(testFilePath)) {
            fs.unlinkSync(testFilePath);
        }

        client.close();

        setTimeout(function() {
            if (waitForTimeout === true) {
                client.close();
                sender.send('app-deploy-test-error');
            }
        }, 15000);
    }

    connectionDebugger(message) {
        if(message.indexOf("PASS ") > -1) {
            message = '> PASS ******************************';
        }

        message = `[${ new Date().toUTCString() }] ${message}`;
        console.log(message);
    }
}

module.exports = FTPAlt;
