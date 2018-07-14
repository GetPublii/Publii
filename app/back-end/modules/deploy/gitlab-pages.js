/*
 * Class used to upload files to the Github Pages
 */

const fs = require('fs-extra');
const path = require('path');
const passwordSafeStorage = require('keytar');
const slug = require('./../../helpers/slug');
const Gitlab = require('gitlab/dist/es5').default
const list = require('ls-all');
const crypto = require('crypto');
const countFiles = require('count-files');
const moment = require('moment');
const normalizePath = require('normalize-path');

class GitlabPages {
    constructor(deploymentInstance = false) {
        this.deployment = deploymentInstance;
        this.connection = false;
        this.debugOutput = [];
        let token = this.deployment.siteConfig.deployment.github.token;
        let account = slug(this.deployment.siteConfig.name);

        if (token === 'publii-gl-token ' + account) {
            token = passwordSafeStorage.getPassword('publii-gl-token', account);
        }

        this.client = new Gitlab({
            url: 'https://gitlab.com/', // Dodać opcję URL, pozwalającą na użycie własnej instalacji GitLaba
            token: token
        });

        this.repository = '';
        this.user = '';
        this.branch = '';
        this.filesToUpdate = 0;
        this.filesUpdated = 0;
        this.waitForTimeout = false;
        this.uploadedBlobs = {};
    }

    initConnection() {
        let self = this;
        this.repository = this.deployment.siteConfig.deployment.github.repo;
        this.user = this.deployment.siteConfig.deployment.github.user;
        this.branch = this.deployment.siteConfig.deployment.github.branch;
        this.waitForTimeout = true;

        /*
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

        countFiles(self.deployment.inputDir, function (err, results) {
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

            self.getAPIRateLimit().then(result => {
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

                self.deploy();
            }).catch(err => {
                process.send({
                    type: 'web-contents',
                    message: 'app-connection-error',
                    value: {
                        additionalMessage: 'Request timeout'
                    }
                });
            });
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
        */
    }

    testConnection(app, deploymentConfig, siteName) {
        let repository = deploymentConfig.github.repo;
        let user = deploymentConfig.github.user;
        let branch = 'heads/' + deploymentConfig.github.branch;
        let account = slug(siteName);
        this.waitForTimeout = true;

        /*
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
        */
    }

    deploy() {
        /*
        let self = this;
        let commitSHA;
        this.uploadedBlobs = {};

        this.getLatestSHA()
            .then((sha)=> commitSHA = sha)
            .then((commitSHA)=> this.getTreeSHA(commitSHA))
            .then((treeSHA)=> this.getTreeData(treeSHA))
            .then((remoteTree)=> {
                return  this.listFolderFiles(remoteTree)
                    .then(trees => this.getNewTreeBasedOnDiffs(trees.remoteTree, trees.localTree))
                    .then(finalTree => this.createBlobs(finalTree, false))
                    .then(finalTree => this.updateBlobsList(finalTree))
                    .then(finalTree => this.createBlobs(finalTree, false))
                    .then(finalTree => this.updateBlobsList(finalTree))
                    .then(finalTree => this.createBlobs(finalTree, true))
                    .then(finalTree => this.createTree(finalTree))
                    .then(sha => this.createCommit(sha, commitSHA))
                    .then(sha => this.createReference(sha))
                    .then(result => {
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
                                status: true
                            }
                        });

                        self.deployment.saveConnectionLog();

                        setTimeout(function () {
                            process.exit();
                        }, 1000);
                    }).catch(err => {
                        console.log(err);
                        self.deployment.outputLog.push('- - - GH ERROR  - - -');
                        self.deployment.outputLog.push(err);
                        self.deployment.outputLog.push('- - - - - - - - - - -');
                        self.deployment.saveConnectionErrorLog(err);
                        self.saveConnectionDebugLog();

                        process.send({
                            type: 'web-contents',
                            message: 'app-connection-error',
                            value: {
                                additionalMessage: err.message
                            }
                        });

                        setTimeout(function () {
                            process.exit();
                        }, 1000);
                    });
        }).catch(err => {
            console.log(err);
            self.deployment.outputLog.push('- - - GH ERROR  - - -');
            self.deployment.outputLog.push(err);
            self.deployment.outputLog.push('- - - - - - - - - - -');
            self.deployment.saveConnectionErrorLog(err);
            self.saveConnectionDebugLog();

            process.send({
                type: 'web-contents',
                message: 'app-connection-error',
                value: {
                    additionalMessage: err.message
                }
            });

            setTimeout(function () {
                process.exit();
            }, 1000);
        });
        */
    }

    getAPIRateLimit() {
        /*
        return this.apiRequest(
            {},
            (api) => api.misc.getRateLimit,
            (result) => result.data.resources.core
        );
        */
    }

    getLatestSHA() {
        /*
        process.send({
            type: 'web-contents',
            message: 'app-uploading-progress',
            value: {
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
        */
    }

    getTreeSHA(latestCommitSHA) {
        /*
        process.send({
            type: 'web-contents',
            message: 'app-uploading-progress',
            value: {
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
        */
    }

    getTreeData(treeSHA) {
        /*
        process.send({
            type: 'web-contents',
            message: 'app-uploading-progress',
            value: {
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
        */
    }

    getNewTreeBasedOnDiffs(remoteTree, localTree) {
        /*
        process.send({
            type: 'web-contents',
            message: 'app-uploading-progress',
            value: {
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
        */
    }

    findRemoteFile(filePath, remoteTree) {
        /*
        for(let remoteFile of remoteTree) {
            if(remoteFile.path === filePath) {
                return remoteFile;
            }
        }

        return false;
        */
    }

    listFolderFiles(remoteTree) {
        /*
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
        */
    }

    readFile(filePath) {
        return new Buffer(fs.readFileSync(filePath)).toString('base64');
    }

    createBlob(filePath) {
        /*
        return this.apiRequest(
            {
                owner: this.user,
                repo: this.repository,
                encoding: 'base64',
                content: this.readFile(filePath)
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
        */
    }

    updateBlobsList(files) {
        /*
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
        */
    }

    createBlobs(files, reuploadSession = false) {
        /*
        return this.getAPIRateLimit().then(result => {
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

            return Promise.all(files.map(file => {
                if(file.getBlob) {
                    return this.createBlob(file.fullPath)
                               .then((sha) => Object.assign({}, file, {
                                    sha: sha,
                                    getBlob: false
                                  }
                               ));
                }

                return Promise.resolve(file);
            }));
        }).catch(err => {
            if(reuploadSession) {
                process.send({
                    type: 'web-contents',
                    message: 'app-connection-error',
                    value: {
                        additionalMessage: 'Request timeout'
                    }
                });
            }

            return files;
        });
        */
    }

    createTree(tree) {
        /*
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
        */
    }

    createCommit(tree, parentSHA) {
        /*
        if(!tree.length) {
            return '';
        }

        process.send({
            type: 'web-contents',
            message: 'app-uploading-progress',
            value: {
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
        */
    }

    createReference(sha) {
        /*
        if(sha === '') {
            return false;
        }

        process.send({
            type: 'web-contents',
            message: 'app-uploading-progress',
            value: {
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
        */
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

        if(filename.substr(0,1) === '.') {
            return false;
        }

        return true;
    }

    saveConnectionDebugLog() {
        let logPath = path.join(this.deployment.appDir, 'logs', 'connection-debug-log.txt');
        fs.writeFileSync(logPath, this.debugOutput.join("\n"));
    }
}

module.exports = GitlabPages;
