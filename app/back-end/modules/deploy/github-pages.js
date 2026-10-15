/*
 * Class used to upload files to the Github Pages
 */

const fs = require('fs-extra');
const path = require('path');
const FileHelper = require('./../../helpers/file.js');
const passwordSafeStorage = require('./../../helpers/password-storage.js');
const slug = require('./../../helpers/slug');
const GithubApiClient = require('./github-api-client.js');
const list = require('./../../helpers/files-list.js');
const crypto = require('crypto');
const moment = require('moment');
const normalizePath = require('normalize-path');
const stripTags = require('striptags');

class GithubPages {
    constructor(deploymentInstance = false) {
        this.deployment = deploymentInstance;
        this.serverURL = '';

        if (this.deployment.siteConfig) {
            this.serverURL = this.deployment.siteConfig.deployment.github.server;
        } else {
            this.serverURL = this.deployment.github.server;
        }

        this.connection = false;
        this.client = new GithubApiClient({
            baseUrl: `https://${this.serverURL}`,
            timeout: 30000,
            userAgent: 'Publii'
        });
        this.token = '';
        this.repository = '';
        this.user = '';
        this.branch = '';
        this.folder = '';
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
        this.folder = this.normalizeFolder(this.deployment.siteConfig.deployment.github.folder);
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

        this.client = new GithubApiClient({
            auth: this.token,
            baseUrl: `https://${this.serverURL}`,
            timeout: 30000,
            userAgent: 'Publii'
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

        setTimeout(() => {
            if(this.waitForTimeout === true) {
                this.waitForTimeout = false;

                process.send({
                    type: 'web-contents',
                    message: 'app-connection-error',
                    value: {
                        additionalMessage: {
                            translation: 'core.server.requestTimeout'
                        }
                    }
                });

                setTimeout(function () {
                    process.kill(process.pid, 'SIGTERM');
                }, 1000);
            }
        }, 15000);

        let numberOfFiles = this.countOutputFiles();

        if (numberOfFiles === false) {
            return;
        }

        if(numberOfFiles > 4000) {
            this.waitForTimeout = false;

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
                let result = await self.getAPIRateLimit();

                if(result.remaining < 10) {
                    self.waitForTimeout = false;

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
            self.waitForTimeout = false;
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
    }

    /*
     * Counts files and directories in the output directory (without following symlinks),
     * returns false when the directory cannot be read
     */
    countOutputFiles() {
        try {
            return fs.readdirSync(this.deployment.inputDir, { recursive: true }).length;
        } catch (err) {
            this.waitForTimeout = false;
            console.log(`[${ new Date().toUTCString() }] ERROR: ${err.toString()}`);

            process.send({
                type: 'web-contents',
                message: 'app-connection-error',
                value: {
                    additionalMessage: 'E3 ' + stripTags(err.toString())
                }
            });

            setTimeout(function () {
                process.kill(process.pid, 'SIGTERM');
            }, 1000);

            return false;
        }
    }

    async testConnection(app, deploymentConfig, siteName, uuid, sender) {
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

        this.client = new GithubApiClient({
            auth: token,
            baseUrl: `https://${this.serverURL}`,
            timeout: 30000,
            userAgent: 'Publii'
        });

        this.apiRequest(
            {
                owner: user,
                repo: repository,
                ref: branch
            },
            (api) => api.rest.git.getRef,
            (result) => {
                if(result.data && result.data.object) {
                    return result.data.object.sha;
                }

                return null;
            }
        ).then(result => {
            // The timeout below has already replied
            if (this.waitForTimeout === false) {
                return;
            }

            this.waitForTimeout = false;

            if(result === null) {
                sender.send('app-deploy-test-error', {
                    message: {
                        translation: 'core.server.branchDoesNotExist'
                    }
                });

                return;
            }

            sender.send('app-deploy-test-success');
        }).catch(async err => {
            if (this.waitForTimeout === false) {
                return;
            }

            this.waitForTimeout = false;
            sender.send('app-deploy-test-error', await this.getTestConnectionError(err, user, repository));
        });

        setTimeout(() => {
            if(this.waitForTimeout === true) {
                this.waitForTimeout = false;

                sender.send('app-deploy-test-error', {
                    message: {
                        translation: 'core.server.requestTimeout'
                    }
                });
            }
        }, 15000);
    }

    async getTestConnectionError(err, user, repository) {
        if (err && err.status === 401) {
            return {
                noAdditionalMessage: true,
                message: {
                    translation: 'core.server.tokenOrServerAddressInvalid'
                }
            };
        }

        // GitHub responds with 404 for both a missing repository and a missing branch
        if (err && err.status === 404) {
            try {
                await this.client.rest.repos.get({
                    owner: user,
                    repo: repository
                });

                return {
                    noAdditionalMessage: true,
                    message: {
                        translation: 'core.server.branchDoesNotExist'
                    }
                };
            } catch (repoErr) {
                if (repoErr && repoErr.status === 404) {
                    return {
                        noAdditionalMessage: true,
                        message: {
                            translation: 'core.server.repositoryDoesNotExist'
                        }
                    };
                }
            }
        }

        return {
            message: stripTags(String((err && err.message) || err || ''))
        };
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

            if (finalTree === false) {
                setTimeout(function () {
                    process.kill(process.pid, 'SIGTERM');
                }, 1000);

                return;
            }

            finalTree = await this.updateBlobsList(finalTree);

            let deltaTree = this.buildDeltaTree(finalTree, trees.remoteTree);

            if (!deltaTree.length) {
                console.log(`[${ new Date().toUTCString() }] (i) NO CHANGES DETECTED - SKIPPING COMMIT`);
                this.finishSync();
                return;
            }

            let sha;

            try {
                sha = await this.createTreeInChunks(deltaTree, treeSHA);
            } catch (deltaErr) {
                console.log(`[${ new Date().toUTCString() }] (i) DELTA TREE UPLOAD FAILED, FALLING BACK TO FULL TREE: ${JSON.stringify(deltaErr)}`);
                let fullTree = finalTree.map(file => ({
                    path: file.path,
                    mode: file.mode,
                    type: file.type,
                    sha: file.sha
                }));
                sha = await this.createTreeInChunks(fullTree);
            }

            sha = await this.createCommit(sha, commitSHA);
            let result = await this.createReference(sha);

            if(result === false) {
                setTimeout(function () {
                    process.kill(process.pid, 'SIGTERM');
                }, 1000);

                return;
            }

            this.finishSync();
        } catch (err) {
            this.waitForTimeout = false;
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

    finishSync() {
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
    }

    async apiRequest(requestData, method, extractor) {
        try {
            let data = await method(this.client)(requestData);
            let result = extractor ? extractor(data) : data;
            return result;
        } catch (err) {
            console.log(`[${ new Date().toUTCString() }] (i) TRIED AGAIN: ${method.toString()} - ${requestData.filePath}`);
            
            try {
                let data = await method(this.client)(requestData);
                let result = extractor ? extractor(data) : data;
                return result;
            } catch (retryErr) {
                console.log(`[${ new Date().toUTCString() }] (i) TRIED AGAIN FAIL: ${method.toString()} - ${requestData.filePath}`);
                throw retryErr;
            }
        }
    }

    getAPIRateLimit() {
        return this.apiRequest(
            {},
            (api) => api.rest.rateLimit.get,
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
            (api) => api.rest.git.getRef,
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
                commit_sha: latestCommitSHA
            },
            (api) => api.rest.git.getCommit,
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
                tree_sha: treeSHA,
                recursive: 1
            },
            (api) => api.rest.git.getTree,
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

    /*
     * Normalizes the optional repository subfolder: slashes are unified,
     * empty, "." and ".." segments are removed, so the result is always
     * a safe, relative path (or an empty string for the repository root)
     */
    normalizeFolder(folder) {
        if (!folder || typeof folder !== 'string') {
            return '';
        }

        return folder.split(/[\\/]+/)
                     .filter(segment => segment !== '' && segment !== '.' && segment !== '..')
                     .join('/');
    }

    getRemotePath(relativePath) {
        if (this.folder) {
            return this.folder + '/' + relativePath;
        }

        return relativePath;
    }

    isInsideFolder(remotePath) {
        if (!this.folder) {
            return true;
        }

        return remotePath.indexOf(this.folder + '/') === 0;
    }

    buildDeltaTree(localTree, remoteTree) {
        let delta = [];
        let localPaths = new Set();

        for (let localFile of localTree) {
            localPaths.add(localFile.path);
            let remoteFile = this.findRemoteFile(localFile.path, remoteTree);

            if (!remoteFile || remoteFile.sha !== localFile.sha) {
                delta.push({
                    path: localFile.path,
                    mode: localFile.mode,
                    type: localFile.type,
                    sha: localFile.sha
                });
            }
        }

        for (let remoteFile of remoteTree) {
            // Files outside of the configured folder are not managed by Publii
            if (remoteFile.type === 'blob' && this.isInsideFolder(remoteFile.path) && !localPaths.has(remoteFile.path)) {
                delta.push({
                    path: remoteFile.path,
                    mode: remoteFile.mode,
                    type: 'blob',
                    sha: null
                });
            }
        }

        return delta;
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
                                         let fileContent = FileHelper.readFileSync(file.path);
                                         fileSize = fileContent.length;
                                         calculatedHash = crypto.createHash('sha1')
                                                                .update("blob " + fileSize + "\0" + fileContent)
                                                                .digest('hex');
                                     }

                                     return {
                                         fullPath: normalizePath(file.path),
                                         path: this.getRemotePath(normalizePath(path.relative(this.deployment.inputDir, file.path))),
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
        let fileContent = FileHelper.readFileSync(filePath, { encoding: 'base64' });
        console.log(`[${ new Date().toUTCString() }] CREATE BLOB: ${filePath}`);

        return this.apiRequest(
            {
                owner: this.user,
                repo: this.repository,
                encoding: 'base64',
                content: fileContent,
                filePath: filePath
            },
            (api) => api.rest.git.createBlob,
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

                return false;
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

    async createTreeInChunks(tree, baseTreeSHA = null) {
        if (!tree || !tree.length) {
            return [];
        }

        const CHUNK_SIZE = 200;

        let logPath = path.join(this.deployment.appDir, 'github-tree.txt');
        fs.writeFileSync(logPath, JSON.stringify(tree, null, 4));

        if (tree.length <= CHUNK_SIZE) {
            return this.createTree(tree, baseTreeSHA);
        }

        let totalChunks = Math.ceil(tree.length / CHUNK_SIZE);
        console.log(`[${ new Date().toUTCString() }] CHUNKING TREE: ${tree.length} entries into ${totalChunks} chunks of max ${CHUNK_SIZE}`);

        let currentBase = baseTreeSHA;

        for (let i = 0; i < tree.length; i += CHUNK_SIZE) {
            let chunk = tree.slice(i, i + CHUNK_SIZE);
            let chunkIndex = Math.floor(i / CHUNK_SIZE) + 1;
            console.log(`[${ new Date().toUTCString() }] CREATING TREE CHUNK ${chunkIndex}/${totalChunks} (${chunk.length} entries)`);
            currentBase = await this.createTree(chunk, currentBase);
        }

        return currentBase;
    }

    createTree(tree, baseTreeSHA = null) {
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

        let requestData = {
            owner: this.user,
            repo: this.repository,
            tree: tree
        };

        if (baseTreeSHA) {
            requestData.base_tree = baseTreeSHA;
        }

        return this.apiRequest(
            requestData,
            (api) => api.rest.git.createTree,
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
            (api) => api.rest.git.createCommit,
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
            (api) => api.rest.git.updateRef
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
