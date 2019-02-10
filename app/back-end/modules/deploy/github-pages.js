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

class GithubPages {
    constructor(deploymentInstance = false) {
        this.deployment = deploymentInstance;
        this.connection = false;
        this.debugOutput = [];
        this.client = new githubApi({
            version: "3.0.0",
            protocol: "https",
            host: "api.github.com",
            pathPrefix: "",
            timeout: 10000,
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
        this.waitForTimeout = true;
        let account = slug(this.deployment.siteConfig.name);

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
        if(this.deployment.siteConfig.domain.indexOf('github.io') === -1) {
            let cnameFilePath = path.join(self.deployment.inputDir, 'CNAME');
            fs.writeFileSync(
                cnameFilePath,
                this.deployment.siteConfig.domain.replace('https://', '')
            );
        }

        countFiles(self.deployment.inputDir, async function (err, results) {
            let numberOfFiles = parseInt(results.files + results.dirs, 10);

            if(numberOfFiles > 1000) {
                process.send({
                    type: 'web-contents',
                    message: 'app-connection-error',
                    value: {
                        additionalMessage: 'Your website contains over 1000 items (' + numberOfFiles + ' files and directories). Currently our Github Pages implementation supports pages up to 1000 items'
                    }
                });

                return;
            }

            try {
                let result = self.getAPIRateLimit();

                if(result.remaining < 10) {
                    process.send({
                        type: 'web-contents',
                        message: 'app-connection-error',
                        value: {
                            additionalMessage: 'Your API request limit were exceed (' + parseInt(result.remaining, 10) + ' requests left). Please wait till (' + moment(parseInt(result.reset * 1000, 10)).format('MMMM Do YYYY, h:mm:ss a') + ' UTC) and then try again.'
                        }
                    });

                    return;
                }

                await self.deploy();
            } catch (err) {
                self.deployment.outputLog.push('- - - GH ERROR  - - -');
                self.deployment.outputLog.push(JSON.stringify(err));
                self.deployment.outputLog.push('- - - - - - - - - - -');
                self.deployment.saveConnectionErrorLog(JSON.stringify(err));
                self.saveConnectionDebugLog();

                process.send({
                    type: 'web-contents',
                    message: 'app-connection-error',
                    value: {
                        additionalMessage: 'E2 ' + JSON.stringify(err)
                    }
                });

                setTimeout(function () {
                    process.exit();
                }, 1000); 
            }
        });

        setTimeout(function() {
            if(this.waitForTimeout === true) {
                process.send({
                    type: 'web-contents',
                    message: 'app-connection-error',
                    value: {
                        additionalMessage: 'Request timeout'
                    }
                });
            }
        }, 15000);
    }

    async testConnection(app, deploymentConfig, siteName) {
        let token = deploymentConfig.github.token;
        let repository = deploymentConfig.github.repo;
        let user = deploymentConfig.github.user;
        let branch = 'heads/' + deploymentConfig.github.branch;
        let account = slug(siteName);
        this.waitForTimeout = true;

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
                    message: 'Selected branch does not exist'
                });

                return;
            }

            this.waitForTimeout = false;
            app.mainWindow.webContents.send('app-deploy-test-success');
        }).catch(err => {
            err = JSON.parse(err);
            this.waitForTimeout = false;
            app.mainWindow.webContents.send('app-deploy-test-error', {
                message: err.message
            });
        });

        setTimeout(function() {
            if(this.waitForTimeout === true) {
                app.mainWindow.webContents.send('app-deploy-test-error', {
                    message: 'Request timeout'
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
                self.deployment.saveConnectionLog();

                setTimeout(function () {
                    process.exit();
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

            self.deployment.saveConnectionLog();

            setTimeout(function () {
                process.exit();
            }, 1000);
        } catch (err) {
            self.deployment.outputLog.push('- - - GH ERROR  - - -');
            self.deployment.outputLog.push(JSON.stringify(err));
            self.deployment.outputLog.push('- - - - - - - - - - -');
            self.deployment.saveConnectionErrorLog(JSON.stringify(err));
            self.saveConnectionDebugLog();

            process.send({
                type: 'web-contents',
                message: 'app-connection-error',
                value: {
                    additionalMessage: 'E1 ' + JSON.stringify(err)
                }
            });

            setTimeout(function () {
                process.exit();
            }, 1000);
        }
    }

    apiRequest(requestData, method, extractor) {
        return new Promise((resolve, reject) => {
            method(this.client)(requestData, (err, data) => {
                if (err) {
                    console.log('(i) TRIED AGAIN', method.toString(), requestData.filePath);

                    method(this.client)(requestData, (err, data) => {
                        if (err) {
                            console.log('(i) TRIED AGAIN FAIL', method.toString(), requestData.filePath);
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
                message: 'Get informations about the latest commit...'
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
                message: 'Retrieving handler of the remote tree of files...'
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
                message: 'Retrieving the remote tree of files...'
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
                message: 'Preparing tree of files to upload...'
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
                                         calculatedHash = crypto.createHash('sha1')
                                                                .update("blob " + fileSize + "\0" + fileContent.toString('binary'))
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
        let result = await this.getAPIRateLimit();
        
        if(result.remaining < this.filesToUpdate + 10) {
            process.send({
                type: 'web-contents',
                message: 'app-connection-error',
                value: {
                    additionalMessage: 'Your API request limit were exceed (' + parseInt(result.remaining, 10) + ' requests left). Please wait till (' + moment(parseInt(result.reset * 1000, 10)).format('MMMM Do YYYY, h:mm:ss a') + ' UTC) and then try again.'
                }
            });

            return [];
        }

        let filesToUpdate = [];

        for (let i = 0; i < files.length; i++) {
            let file = files[i];

            if(file.getBlob) {
                filesToUpdate.push(i);
            }
        }

        for (let i = 0; i < filesToUpdate.length; i += 5) {
            let requests = [];

            for (let j = 0; j < 5; j++) {
                let index = filesToUpdate[i + j];

                if (index) {
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
                message: 'Creating the new remote tree of files...'
            }
        });

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
                message: 'Creating the new remote tree of files...'
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
                message: 'Finishing the deployment process...'
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
        let necessaryHiddenFiles = [
            '.CNAME'
        ];

        if(filename.substr(0,1) === '.' && necessaryHiddenFiles.indexOf(filename) === -1) {
            return false;
        }

        return true;
    }

    saveConnectionDebugLog() {
        let logPath = path.join(this.deployment.appDir, 'logs', 'connection-debug-log.txt');

        fs.writeFileSync(logPath, this.debugOutput.join("\n"));
    }
}

module.exports = GithubPages;
