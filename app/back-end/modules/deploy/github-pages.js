/*
 * Class used to upload files to the Github Pages
 */

const fs = require('fs-extra');
const path = require('path');
const passwordSafeStorage = require('keytar');
const slug = require('./../../helpers/slug');
const githubApi = require("github");
const list = require('ls-all');
const crypto = require('crypto');
const countFiles = require('count-files');
const moment = require('moment');
const normalizePath = require('normalize-path');
const stripTags = require('striptags');

class GithubPages {
    constructor(deploymentInstance = false) {
        this.deployment = deploymentInstance;
        let server = '';

        if (this.deployment.siteConfig) {
            server = this.deployment.siteConfig.deployment.github.server;
        } else {
            server = this.deployment.github.server;
        }

        this.connection = false;
        this.client = new githubApi({
            version: "3.0.0",
            protocol: "https",
            host: server,
            pathPrefix: "",
            timeout: 30000,
            headers: {
                "user-agent": "Publii"
            }
        });
        this.token = '';
        this.repository = '';
        this.user = '';
        this.branch = '';
        this.filesToUpdate = 0;
        this.filesUpdated = 0;
        this.waitForTimeout = false;
        this.uploadedBlobs = {};
    }

    async initConnection() {
        let self = this;
        this.token = this.deployment.siteConfig.deployment.github.token;
        this.repository = this.deployment.siteConfig.deployment.github.repo;
        this.user = this.deployment.siteConfig.deployment.github.user;
        this.branch = 'heads/' + this.deployment.siteConfig.deployment.github.branch;
        this.parallelOperations = parseInt(this.deployment.siteConfig.deployment.github.parallelOperations, 10);
        this.apiRateLimiting = !!this.deployment.siteConfig.deployment.github.apiRateLimiting;
        this.waitForTimeout = true;
        let account = slug(this.deployment.siteConfig.name);

        if (this.deployment.siteConfig.uuid) {
            account = this.deployment.siteConfig.uuid;
        }

        if (this.token === 'publii-gh-token ' + account) {
            this.token = await passwordSafeStorage.getPassword('publii-gh-token', account);
        }

        this.client.authenticate({
            type: "token",
            token: this.token
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

        self.deployment.setInput();
        self.deployment.setOutput(true);

        /*
         * Create CNAME file if necessary
         */
        if (this.deployment.siteConfig.domain.indexOf('github.io') === -1) {
            let cnameFilePath = path.join(self.deployment.inputDir, 'CNAME');
            let domainName = this.deployment.siteConfig.domain;

            if (domainName.indexOf('//') > -1) {
                domainName = domainName.split('//')[1];
            }

            if (domainName.indexOf('/') === 0) {
                domainName = domainName.slice(1);
            }

            fs.writeFileSync(
                cnameFilePath,
                domainName
            );
        }

        countFiles(self.deployment.inputDir, async function (err, results) {
            let numberOfFiles = parseInt(results.files + results.dirs, 10);

            if(numberOfFiles > 4000) {
                process.send({
                    type: 'web-contents',
                    message: 'app-connection-error',
                    value: {
                        additionalMessage: {
                            translation: 'core.server.tooManyFilesInfo',
                            translationVars: {
                                numberOfFiles: numberOfFiles
                            }
                        }
                    }
                });

                return;
            }

            try {
                if (self.apiRateLimiting) {
                    let result = self.getAPIRateLimit();

                    if(result.remaining < 10) {
                        process.send({
                            type: 'web-contents',
                            message: 'app-connection-error',
                            value: {
                                additionalMessage: {
                                    translation: 'core.server.requestLimitExceededInfo',
                                    translationVars: {
                                        remaining: parseInt(result.remaining, 10),
                                        resetTime: moment(parseInt(result.reset * 1000, 10)).format('MMMM Do YYYY, h:mm:ss a')
                                    }
                                }
                            }
                        });

                        return;
                    }
                }

                await self.deploy();
            } catch (err) {
                console.log(`[${ new Date().toUTCString() }] ERROR: ${JSON.stringify(err)}`);

                process.send({
                    type: 'web-contents',
                    message: 'app-connection-error',
                    value: {
                        additionalMessage: 'E2 ' + stripTags((err).toString())
                    }
                });

                setTimeout(function () {
                    process.kill(process.pid, 'SIGTERM');
                }, 1000);
            }
        });

        setTimeout(function() {
            if(this.waitForTimeout === true) {
                process.send({
                    type: 'web-contents',
                    message: 'app-connection-error',
                    value: {
                        additionalMessage: {
                            translation: 'core.server.requestTimeout'
                        }
                    }
                });
            }
        }, 15000);
    }

    async testConnection(app, deploymentConfig, siteName, uuid) {
        let token = deploymentConfig.github.token;
        let repository = deploymentConfig.github.repo;
        let user = deploymentConfig.github.user;
        let branch = 'heads/' + deploymentConfig.github.branch;
        let account = slug(siteName);
        this.waitForTimeout = true;

        if (uuid) {
            account = uuid;
        }

        if(token === 'publii-gh-token ' + account) {
            token = await passwordSafeStorage.getPassword('publii-gh-token', account);
        }

        this.client.authenticate({
            type: "token",
            token: token
        });

        this.apiRequest(
            {
                owner: user,
                repo: repository,
                ref: branch
            },
            (api) => api.gitdata.getReference,
            (result) => {
                if(result.data && result.data.object) {
                    return result.data.object.sha;
                }

                return null;
            }
        ).then(result => {
            if(result === null) {
                this.waitForTimeout = false;
                app.mainWindow.webContents.send('app-deploy-test-error', {
                    message: {
                        translation: 'core.server.branchDoesNotExist'
                    }
                });

                return;
            }

            this.waitForTimeout = false;
            app.mainWindow.webContents.send('app-deploy-test-success');
        }).catch(err => {
            err = JSON.parse(err);
            this.waitForTimeout = false;
            app.mainWindow.webContents.send('app-deploy-test-error', {
                message: stripTags((err.message).toString())
            });
        });

        setTimeout(function() {
            if(this.waitForTimeout === true) {
                app.mainWindow.webContents.send('app-deploy-test-error', {
                    message: {
                        translation: 'core.server.requestTimeout'
                    }
                });

                this.waitForTimeout = false;
            }
        }, 10000);
    }

    async deploy() {
        let self = this;

        try {
            let commitSHA;
            this.uploadedBlobs = {};
            commitSHA = await this.getLatestSHA();
            let treeSHA = await this.getTreeSHA(commitSHA);
            let remoteTree = await this.getTreeData(treeSHA);
            let trees = await this.listFolderFiles(remoteTree);
            let finalTree = await this.getNewTreeBasedOnDiffs(trees.remoteTree, trees.localTree);
            finalTree = await this.createBlobs(finalTree, false);
            finalTree = await this.updateBlobsList(finalTree);
            let sha = await this.createTree(finalTree);
            sha = await this.createCommit(sha, commitSHA);
            let result = await this.createReference(sha);

            if(result === false) {
                setTimeout(function () {
                    process.kill(process.pid, 'SIGTERM');
                }, 1000);

                return;
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
                    progress: 100,
                    status: true
                }
            });

            setTimeout(function () {
                process.kill(process.pid, 'SIGTERM');
            }, 1000);
        } catch (err) {
            console.log(`[${ new Date().toUTCString() }] ERROR: ${JSON.stringify(err)}`);

            process.send({
                type: 'web-contents',
                message: 'app-connection-error',
                value: {
                    additionalMessage: 'E1 ' + stripTags(JSON.stringify(err))
                }
            });

            setTimeout(function () {
                process.kill(process.pid, 'SIGTERM');
            }, 1000);
        }
    }

    apiRequest(requestData, method, extractor) {
        return new Promise((resolve, reject) => {
            method(this.client)(requestData, (err, data) => {
                if (err) {
                    console.log(`[${ new Date().toUTCString() }] (i) TRIED AGAIN: ${method.toString()} - ${requestData.filePath}`);

                    method(this.client)(requestData, (err, data) => {
                        if (err) {
                            console.log(`[${ new Date().toUTCString() }] (i) TRIED AGAIN FAIL: ${method.toString()} - ${requestData.filePath}`);
                            reject(err);
                            return;
                        }

                        let result = extractor ? extractor(data) : data;
                        resolve(result);
                    });

                    return;
                }

                let result = extractor ? extractor(data) : data;
                resolve(result);
            });
        });
    }

    getAPIRateLimit() {
        return this.apiRequest(
            {},
            (api) => api.misc.getRateLimit,
            (result) => result.data.resources.core
        );
    }

    getLatestSHA() {
        process.send({
            type: 'web-contents',
            message: 'app-uploading-progress',
            value: {
                progress: 8,
                message: 'core.server.getInfoAboutLatestCommit'
            }
        });

        return this.apiRequest(
            {
                owner: this.user,
                repo: this.repository,
                ref: this.branch
            },
            (api) => api.gitdata.getReference,
            (result) => {
                this.waitForTimeout = false;

                if(result.data && result.data.object) {
                    return result.data.object.sha;
                }

                return null;
            }
        );
    }

    getTreeSHA(latestCommitSHA) {
        process.send({
            type: 'web-contents',
            message: 'app-uploading-progress',
            value: {
                progress: 8,
                message: 'core.server.retrievingHandlerOfRemoteFilesTree'
            }
        });

        return this.apiRequest(
            {
                owner: this.user,
                repo: this.repository,
                sha: latestCommitSHA
            },
            (api) => api.gitdata.getCommit,
            (result) => result.data.tree.sha
        );
    }

    getTreeData(treeSHA) {
        process.send({
            type: 'web-contents',
            message: 'app-uploading-progress',
            value: {
                progress: 8,
                message: {
                    translation: 'core.server.retrievingRemoteFilesTree'
                }
            }
        });

        return this.apiRequest(
            {
                owner: this.user,
                repo: this.repository,
                sha: treeSHA,
                recursive: 1
            },
            (api) => api.gitdata.getTree,
            (result) => result.data.tree
        );
    }

    async getNewTreeBasedOnDiffs(remoteTree, localTree) {
        process.send({
            type: 'web-contents',
            message: 'app-uploading-progress',
            value: {
                progress: 8,
                message: {
                    translation: 'core.server.preparingFilesTreeToUpload'
                }
            }
        });

        this.filesToUpdate = 0;
        this.filesUpdated = 0;

        for(let localFile of localTree) {
            let remoteFile = this.findRemoteFile(localFile.path, remoteTree);

            if(remoteFile === false) {
                localFile.getBlob = true;
                this.filesToUpdate++;
                continue;
            }

            if(localFile.sha === false) {
                if(remoteFile.size !== localFile.size) {
                    localFile.getBlob = true;
                    this.filesToUpdate++;
                    continue;
                }

                localFile.sha = remoteFile.sha;
                continue;
            }

            if(localFile.sha !== remoteFile.sha) {
                localFile.getBlob = true;
                this.filesToUpdate++;
                continue;
            }
        }

        return localTree;
    }

    findRemoteFile(filePath, remoteTree) {
        for(let remoteFile of remoteTree) {
            if(remoteFile.path === filePath) {
                return remoteFile;
            }
        }

        return false;
    }

    async listFolderFiles(remoteTree) {
        return list([this.deployment.inputDir], {
            recurse: true,
            flatten: true
        }).then(files => {
            let localTree = files.filter(file => !file.mode.dir)
                                 .map(file => {
                                     let calculatedHash = false;
                                     let fileSize = fs.statSync(file.path).size;

                                     if(!this.isBinaryFile(file.path)) {
                                         let fileContent = fs.readFileSync(file.path);
                                         fileSize = fileContent.length;
                                         calculatedHash = crypto.createHash('sha1')
                                                                .update("blob " + fileSize + "\0" + fileContent)
                                                                .digest('hex');
                                     }

                                     return {
                                         fullPath: normalizePath(file.path),
                                         path: normalizePath(path.relative(this.deployment.inputDir, file.path)),
                                         mode: file.mode.exec ? '100755' : '100644',
                                         type: 'blob',
                                         size: fileSize,
                                         sha: calculatedHash,
                                         encoding: 'base64',
                                         getBlob: false
                                     };
                                 })
                                 .filter(file => this.isNecessaryFile(file.path));
            return {
                localTree: localTree,
                remoteTree: remoteTree
            };
        });
    }

    createBlob(filePath) {
        let fileContent = fs.readFileSync(filePath, { encoding: 'base64' });
        console.log(`[${ new Date().toUTCString() }] CREATE BLOB: ${filePath}`);

        return this.apiRequest(
            {
                owner: this.user,
                repo: this.repository,
                encoding: 'base64',
                content: fileContent,
                filePath: filePath
            },
            (api) => api.gitdata.createBlob,
            (result) => {
                this.uploadedBlobs[filePath] = result.data.sha;
                console.log(`[${ new Date().toUTCString() }] CREATED BLOB: ${filePath} - ${result.data.sha}`);

                process.send({
                    type: 'web-contents',
                    message: 'app-uploading-progress',
                    value: {
                        progress: 8 + (Math.floor((this.filesUpdated / this.filesToUpdate) * 100) - 8),
                        operations: [this.filesUpdated, this.filesToUpdate]
                    }
                });

                this.filesUpdated++;

                return result.data.sha;
            }
        );
    }

    updateBlobsList(files) {
        let counterOfFilesToUpload = 0;
        let output = files.map(file => {
            if(this.uploadedBlobs[file.fullPath]) {
                file.sha = this.uploadedBlobs[file.fullPath];
                file.getBlob = false;
            }

            if(file.getBlob) {
                counterOfFilesToUpload++;
            }

            return file;
        });

        return output;
    }

    async createBlobs(files, reuploadSession = false) {
        if (this.apiRateLimiting) {
            let result = await this.getAPIRateLimit();

            if(result.remaining < this.filesToUpdate + 10) {
                process.send({
                    type: 'web-contents',
                    message: 'app-connection-error',
                    value: {
                        additionalMessage: {
                            translation: 'core.server.requestLimitExceededInfo',
                            translationVars: {
                                remaining: parseInt(result.remaining, 10),
                                resetTime: moment(parseInt(result.reset * 1000, 10)).format('MMMM Do YYYY, h:mm:ss a')
                            }
                        }
                    }
                });

                return [];
            }
        }

        let filesToUpdate = [];

        for (let i = 0; i < files.length; i++) {
            let file = files[i];

            if(file.getBlob) {
                filesToUpdate.push(i);
            }
        }

        for (let i = 0; i < filesToUpdate.length; i += this.parallelOperations) {
            let requests = [];

            for (let j = 0; j < this.parallelOperations; j++) {
                let index = filesToUpdate[i + j];

                if (typeof index === 'number') {
                    let file = files[index];
                    requests.push(this.createBlob(file.fullPath).then((sha) => {
                        file = Object.assign({}, file, {
                            sha: sha,
                            getBlob: false
                        });
                    }));
                }
            }

            await Promise.all(requests);
        }

        return files;
    }

    createTree(tree) {
        if(!tree || !tree.length) {
            return [];
        }

        process.send({
            type: 'web-contents',
            message: 'app-uploading-progress',
            value: {
                progress: 8 + (Math.floor((this.filesUpdated / this.filesToUpdate) * 100) - 8),
                operations: [this.filesUpdated, this.filesToUpdate]
            }
        });

        process.send({
            type: 'web-contents',
            message: 'app-uploading-progress',
            value: {
                progress: 95,
                message: {
                    translation: 'core.server.creatingNewRemoteFilesTree'
                }
            }
        });

        let logPath = path.join(this.deployment.appDir, 'github-tree.txt');
        fs.writeFileSync(logPath, JSON.stringify(tree, null, 4));

        return this.apiRequest(
            {
                owner: this.user,
                repo: this.repository,
                tree: tree
            },
            (api) => api.gitdata.createTree,
            (result) => result.data.sha
        );
    }

    createCommit(tree, parentSHA) {
        if(!tree.length) {
            return '';
        }

        process.send({
            type: 'web-contents',
            message: 'app-uploading-progress',
            value: {
                progress: 95,
                message: {
                    translation: 'core.server.creatingNewRemoteFilesTree'
                }
            }
        });

        return this.apiRequest(
            {
                owner: this.user,
                repo: this.repository,
                message: 'Updated from Publii',
                tree: tree,
                parents: [parentSHA]
            },
            (api) => api.gitdata.createCommit,
            (result) => result.data.sha
        );
    }

    createReference(sha) {
        if(sha === '') {
            return false;
        }

        process.send({
            type: 'web-contents',
            message: 'app-uploading-progress',
            value: {
                progress: 99,
                message: {
                    translation: 'core.server.finishingDeploymentProcess'
                }
            }
        });

        return this.apiRequest(
            {
                owner: this.user,
                repo: this.repository,
                sha: sha,
                ref: this.branch
            },
            (api) => api.gitdata.updateReference
        );
    }

    isBinaryFile(fullPath) {
        let extension = path.parse(fullPath).ext;
        let nonBinaryExtensions = [
            '.html',
            '.htm',
            '.xml',
            '.json',
            '.css',
            '.js',
            '.map',
            '.svg'
        ];

        if(nonBinaryExtensions.indexOf(extension) > -1) {
            return false;
        }

        return true;
    }

    isNecessaryFile(filePath) {
        let filename = path.parse(filePath).base;
        let unnecessaryFiles = [
            '.DS_Store',
            'thumbs.db'
        ];

        if(unnecessaryFiles.indexOf(filename) > -1) {
            return false;
        }

        return true;
    }
}

module.exports = GithubPages;
