/*
 * Class used to upload files to the FTP(S) server
 */

const fs = require('fs-extra');
const path = require('path');
const ftp = require('basic-ftp');
const passwordSafeStorage = require('keytar');
const slug = require('./../../helpers/slug');
const normalizePath = require('normalize-path');
const stripTags = require('striptags');

class FTPAlt {
    constructor(deploymentInstance = false) {
        this.deployment = deploymentInstance;
        this.connection = false;
        this.softUploadErrors = {};
        this.hardUploadErrors = [];
    }

    async initConnection() {
        let waitForTimeout = true;
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
                operations: false
            }
        });

        process.send({
            type: 'web-contents',
            message: 'app-connection-in-progress'
        });

        await this.connection.access(connectionParams);
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

        setTimeout(function() {
            if (waitForTimeout === true) {
                this.connection.close();
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

    async downloadFilesList() {
        try {
            await this.connection.downloadTo(
                normalizePath(path.join(this.deployment.configDir, 'remote-files.json')), 
                normalizePath(path.join(this.deployment.outputDir, 'files.publii.json'))
            );
            let fileToCompare = fs.readFileSync(normalizePath(path.join(this.deployment.configDir, 'remote-files.json')));
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

        try {
            await this.connection.uploadFrom(
                normalizePath(path.join(this.deployment.inputDir, 'files.publii.json')),
                normalizePath(path.join(this.deployment.outputDir, 'files.publii.json')),
            );

            console.log(`[${ new Date().toUTCString() }] -> files.publii.json`);
        } catch (err) {
            console.log(`[${ new Date().toUTCString() }] ${err}`);
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
            await this.connection.uploadFrom(input, output)
        } catch (err) {
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
            await this.connection.ensureDir(output);
        } catch (err) {
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

            await this.connection.cd(rootPath);
        } catch (err) {
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
            await this.connection.remove(input);
            console.log(`[${ new Date().toUTCString() }] DEL ${input}`);
        } catch (err) {
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
            await this.connection.removeDir(input);
            console.log(`[${ new Date().toUTCString() }] DEL ${input}`);
        } catch (err) {
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

    async testConnection(app, deploymentConfig, siteName, uuid) {
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
            app.mainWindow.webContents.send('app-deploy-test-error', { 
                message: stripTags((err.message).toString())
            });
        }

        try {
            await client.uploadFrom(normalizePath(testFilePath), normalizePath(path.join(deploymentConfig.path, 'publii.test')));
        } catch (err) {
            app.mainWindow.webContents.send('app-deploy-test-write-error');

            if (fs.existsSync(testFilePath)) {
                fs.unlinkSync(testFilePath);
            }

            client.close();
            return; 
        }

        try {
            await client.remove(normalizePath(path.join(deploymentConfig.path, 'publii.test')));
        } catch (err) {
            app.mainWindow.webContents.send('app-deploy-test-write-error');
            
            if (fs.existsSync(testFilePath)) {
                fs.unlinkSync(testFilePath);
            }

            client.close();
            return;
        }

        app.mainWindow.webContents.send('app-deploy-test-success');
            
        if (fs.existsSync(testFilePath)) {
            fs.unlinkSync(testFilePath);
        }

        client.close();

        setTimeout(function() {
            if (waitForTimeout === true) {
                client.close();
                app.mainWindow.webContents.send('app-deploy-test-error');
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
