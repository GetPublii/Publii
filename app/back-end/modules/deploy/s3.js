/*
 * Class used to upload files to the S3 bucket
 */

const fs = require('fs-extra');
const path = require('path');
const { 
    S3Client, 
    ListObjectsCommand, 
    GetObjectCommand, 
    PutObjectCommand, 
    DeleteObjectCommand 
} = require("@aws-sdk/client-s3");
const passwordSafeStorage = require('keytar');
const slug = require('./../../helpers/slug');
const mime = require('mime');
const stripTags = require('striptags');

class S3 {
    constructor(deploymentInstance = false) {
        this.deployment = deploymentInstance;
        this.connection = false;
        this.econnresetCounter = 0;
        this.waitForTimeout = false;
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
                credentials: {
                    accessKeyId: s3Id,
                    secretAccessKey: s3Key,
                },
                region: region
            }
        } else {
            connectionParams = {
                credentials: {
                    accessKeyId: s3Id,
                    secretAccessKey: s3Key,
                },
                endpoint: s3Endpoint,
                region: customRegion
            }
        }

        this.connection = new S3Client(connectionParams);
        this.sendProgress(6, false);

        process.send({
            type: 'web-contents',
            message: 'app-connection-in-progress'
        });

        let params = {
            Bucket: this.bucket,
            Prefix: this.prefix,
            MaxKeys: 1
        };

        try {
            await this.connection.send(new ListObjectsCommand(params));
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
        }, 20000);
    }

    async downloadFilesList() {
        let fileName = 'files.publii.json';

        if (typeof this.prefix === 'string' && this.prefix !== '') {
            fileName = this.prefix + fileName;
        }

        let params = {
            Bucket: this.bucket,
            Key: fileName,
        };

        try {
            let data = await this.connection.send(new GetObjectCommand(params));
            console.log(`[${new Date().toUTCString()}] <- files.publii.json`);
            this.sendProgress(8, false);
            let remoteFile = await this.s3streamToString(data.Body);
            this.deployment.checkLocalListWithRemoteList(remoteFile);
          } catch (err) {
            console.log(`[${new Date().toUTCString()}] <- files.publii.json`);
        
            if (err.name !== 'NoSuchKey') {
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
        
            let params = {
                ACL: fileACL,
                Body: fileContent,
                Bucket: this.bucket,
                Key: fileName,
                ContentType: mime.getType(fileName) || 'application/json'
            };
    
            try {
                await this.connection.send(new PutObjectCommand(params));
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
            let fileExtension = path.extname(fileName).substring(1);
            let cacheControl = fileExtension === 'html' ? 'no-cache, no-store' : 'public, max-age=2592000';
            let params = {
                ACL: fileACL,
                Body: fileContent,
                Bucket: this.bucket,
                Key: fileName,
                CacheControl: cacheControl,
                ContentType: mime.getType(fileExtension) || 'application/octet-stream'
            };

            try {
                await this.connection.send(new PutObjectCommand(params));
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
        let params = {
            Bucket: this.bucket,
            Key: input
        };
    
        try {
            await this.connection.send(new DeleteObjectCommand(params));
            this.deployment.currentOperationNumber++;
            console.log(`[${ new Date().toUTCString() }] DEL ${input}`);
            this.deployment.progressOfDeleting += this.deployment.progressPerFile;
            this.sendProgress(8 + Math.floor(this.deployment.progressOfDeleting));
            await this.removeFile();
        } catch (err) {
            // Handle case when specific file no longer exists in the bucket - don't block sync
            if (err.name === 'NoSuchKey') {
                this.deployment.currentOperationNumber++;
                console.log(`[${ new Date().toUTCString() }] DEL ${input} - NoSuchKey`);
                this.deployment.progressOfDeleting += this.deployment.progressPerFile;
                this.sendProgress(8 + Math.floor(this.deployment.progressOfDeleting));
                await this.removeFile();
                return;
            }

            console.error(`[${new Date().toUTCString()}] Error deleting ${input}`, err);
            this.onError(err, true);
        }
    }

    onError(err, silentMode = false) {
        console.log(`[${ new Date().toUTCString() }] S3 ERROR: ${err.message}`);

        if(this.waitForTimeout && !silentMode) {
            this.waitForTimeout = false;

            process.send({
                type: 'web-contents',
                message: 'app-connection-error'
            });

            setTimeout(function () {
                process.kill(process.pid, 'SIGTERM');
            }, 1000);
        }
    }

    prepareFilePath(filePath) {
        if (filePath[0] && filePath[0] === '/') {
            filePath = filePath.substr(1);
        }

        return filePath;
    }

    async testConnection(app, deploymentConfig, siteName, uuid) {
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
                credentials: {
                    accessKeyId: s3Id,
                    secretAccessKey: s3Key,
                },
                region: region
            }
        } else {
            connectionParams = {
                credentials: {
                    accessKeyId: s3Id,
                    secretAccessKey: s3Key,
                },
                endpoint: s3Endpoint,
                region: customRegion
            }
        }

        this.connection = new S3Client(connectionParams);

        let testParams = {
            Bucket: bucket,
            Prefix: prefix,
            MaxKeys: 1
        };

        try {
            await this.connection.send(new ListObjectsCommand(testParams));
        } catch (err) {
            waitForTimeout = false;
            app.mainWindow.webContents.send('app-deploy-test-error', {
                message: stripTags((err.message).toString())
            });

            return;
        }

        waitForTimeout = false;
        app.mainWindow.webContents.send('app-deploy-test-success');

        setTimeout(function() {
            if (waitForTimeout === true) {
                app.mainWindow.webContents.send('app-deploy-test-error', {
                    message: {
                        translation: 'core.server.requestTimeout'
                    }
                });
            }
        }, 10000);
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

    async s3streamToString (stream) {
        let chunks = [];
        
        for await (let chunk of stream) {
            chunks.push(chunk);
        }

        return Buffer.concat(chunks).toString('utf-8');
    }
}

module.exports = S3;
