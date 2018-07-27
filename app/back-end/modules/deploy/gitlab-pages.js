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
    constructor (deploymentInstance = false) {
        this.deployment = deploymentInstance;
        this.connection = false;
        this.debugOutput = [];
        this.repository = '';
        this.user = '';
        this.branch = '';
        this.temporaryBranch = '';
        this.projectID = '';
        this.filesToUpdate = 0;
        this.filesUpdated = 0;
        this.waitForTimeout = false;
        this.uploadedBlobs = {};
        this.remoteFilesList = [];
        this.filesToRemove = [];
        this.filesToUpdate = [];
        this.filesToUpload = [];
        this.binaryFilesToUpdate = [];
        this.binaryFilesToUpload = [];
        this.binaryProgressOffset = 0;
        this.binaryFilesUploadedCount = 0;
        this.binaryFilesToUploadCount = 0;
        this.currentUploadProgress = 0;
    }

    testConnection (app, deploymentConfig, siteName) {
        let repository = deploymentConfig.gitlab.repo;
        let branchName = deploymentConfig.gitlab.branch;
        let token = deploymentConfig.gitlab.token;
        let account = slug(siteName);
        this.waitForTimeout = true;

        if (token === 'publii-gl-token ' + account) {
            token = passwordSafeStorage.getPassword('publii-gl-token', account);
        }

        this.client = new Gitlab({
            url: deploymentConfig.gitlab.server,
            token: token
        });

        this.client.Projects.all({
            owned: true,
            maxPages: 1,
            perPage: 1
        }).then(project => {
            this.client.Projects.all({
                search: repository,
                owned: true,
                maxPages: 1,
                perPage: 1
            }).then(projects => {
                let projectID = projects[0].id;

                // Detect a case when repository name is only similar to the provided repository name (not equal)
                if (projects[0].name !== repository) {
                    this.waitForTimeout = false;
                    app.mainWindow.webContents.send('app-deploy-test-error', {
                        message: 'Selected repository does not exist'
                    });

                    return;
                }

                if(!projectID) {
                    this.waitForTimeout = false;
                    app.mainWindow.webContents.send('app-deploy-test-error', {
                        message: 'Selected repository does not exist'
                    });

                    return;
                }

                this.client.Branches.show(projectID, branchName).then(branch => {
                    if(!branch) {
                        this.waitForTimeout = false;
                        app.mainWindow.webContents.send('app-deploy-test-error', {
                            message: 'Selected branch does not exist'
                        });

                        return;
                    }

                    this.waitForTimeout = false;
                    app.mainWindow.webContents.send('app-deploy-test-success');
                }).catch(err => {
                    this.waitForTimeout = false;
                    app.mainWindow.webContents.send('app-deploy-test-error', {
                        message: 'Selected branch does not exist'
                    });
                });
            }).catch(err => {
                this.waitForTimeout = false;
                app.mainWindow.webContents.send('app-deploy-test-error', {
                    message: 'Selected repository does not exist'
                });
            });
        }).catch(err => {
            this.waitForTimeout = false;
            app.mainWindow.webContents.send('app-deploy-test-error', {
                message: 'Provided token or server address is invalid'
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

    initConnection () {
        this.repository = this.deployment.siteConfig.deployment.gitlab.repo;
        this.user = this.deployment.siteConfig.deployment.gitlab.user;
        this.branch = this.deployment.siteConfig.deployment.gitlab.branch;
        this.remoteFilesList = [];
        this.filesToRemove = [];
        this.filesToUpdate = [];
        this.filesToUpload = [];
        this.waitForTimeout = true;
        let token = this.deployment.siteConfig.deployment.gitlab.token;
        let account = slug(this.deployment.siteConfig.name);

        if (token === 'publii-gl-token ' + account) {
            token = passwordSafeStorage.getPassword('publii-gl-token', account);
        }

        this.client = new Gitlab({
            url: this.deployment.siteConfig.deployment.gitlab.server,
            token: token
        });

        this.setUploadProgress(6);

        process.send({
            type: 'web-contents',
            message: 'app-connection-in-progress'
        });

        this.deployment.setInput();
        this.deployment.setOutput(true);
        this.deployment.prepareLocalFilesList();
        this.setUploadProgress(7);
        this.downloadFilesList();
    }

    downloadFilesList () {
        this.client.Projects.all({
            search: this.repository,
            owned: true,
            maxPages: 1,
            perPage: 1
        }).then(projects => {
            this.projectID = projects[0].id;

            this.client.RepositoryFiles.showRaw(this.projectID, '/publii-files.json', this.branch).then(response => {
                fs.writeFile(path.join(this.deployment.configDir, 'files-remote.json'), response, err => {
                    if (err) {
                        console.log('(!) An error occurred during writing files-remote.json file: ', err);
                    }

                    this.deployment.compareFilesList(true);
                });

                try {
                    this.remoteFilesList = JSON.parse(response);
                } catch (e) {
                    this.remoteFilesList = [];
                }
            }).catch(err => {
                console.log('(!) ERROR WHILE DOWNLOADING files-remote.json: ', err);
                this.deployment.compareFilesList(false);
            });
        }).catch(err => {
            console.log('downloadFilesList: ', err);
            console.warn(err);
        });
    }

    createBranch () {
        this.temporaryBranch = 'publii-deploy-' + new Date().getTime();
        this.setUploadProgress(8);

        this.client.Branches.create(this.projectID, this.temporaryBranch, this.branch).then(res => {
            this.removeFiles();
        }).catch(err => {
            console.log('createBranch: ', err);
            // @TODO
        });
    }

    removeFiles () {
        // Create a commit to remove all unnecessary files
        if (this.deployment.filesToRemove.length) {
            this.filesToRemove = [];

            for (let i = 0; i < this.deployment.filesToRemove.length; i++) {
                this.filesToRemove.push({
                    'action': 'delete',
                    'file_path': this.deployment.filesToRemove[i].path
                });
            }

            this.makeCommit(this.filesToRemove, this.updateTextFiles, 'Publii - remove files');
            return;
        }

        this.updateTextFiles();
    }

    updateTextFiles () {
        this.setUploadProgress(10);

        // Create a commit to update all non-binary files
        if (this.deployment.filesToUpload.length) {
            this.filesToUpdate = [];
            let existingFilesList = this.remoteFilesList.map(file => file.path);

            for (let i = 0; i < this.deployment.filesToUpload.length; i++) {
                if (existingFilesList.indexOf(this.deployment.filesToUpload[i].path) === -1) {
                    continue;
                }

                if (this.isBinaryFile(this.deployment.filesToUpload[i].path)) {
                    continue;
                }

                if (!this.isNecessaryFile(this.deployment.filesToUpload[i].path)) {
                    continue;
                }

                this.filesToUpdate.push({
                    'action': 'update',
                    'file_path': this.deployment.filesToUpload[i].path,
                    'encoding': 'base64',
                    'content': this.readFile(path.join(this.outputDir, this.deployment.filesToUpload[i].path))
                });
            }

            this.makeCommit(this.filesToUpdate, this.uploadTextFiles, 'Publii - update non-binary files');
            return;
        }

        this.uploadTextFiles();
    }

    uploadTextFiles () {
        this.setUploadProgress(12);

        // Create a commit to upload all non-binary files
        if (this.deployment.filesToUpload.length) {
            this.filesToUpdate = [];
            let existingFilesList = this.remoteFilesList.map(file => file.path);

            for (let i = 0; i < this.deployment.filesToUpload.length; i++) {
                if (existingFilesList.indexOf(this.deployment.filesToUpload[i].path) > -1) {
                    continue;
                }

                if (this.isBinaryFile(this.deployment.filesToUpload[i].path)) {
                    continue;
                }

                if (!this.isNecessaryFile(this.deployment.filesToUpload[i].path)) {
                    continue;
                }

                this.filesToUpdate.push({
                    'action': 'create',
                    'file_path': this.deployment.filesToUpload[i].path,
                    'encoding': 'base64',
                    'content': this.readFile(path.join(this.outputDir, this.deployment.filesToUpload[i].path))
                });
            }

            this.makeCommit(this.filesToUpdate, this.createBinaryFilesList, 'Publii - upload non-binary files');
            return;
        }

        this.createBinaryFilesList();
    }

    createBinaryFilesList () {
        this.setUploadProgress(15);
        this.binaryFilesToUpdate = [];
        this.binaryFilesToUpload = [];

        if (this.deployment.filesToUpload.length) {
            let existingFilesList = this.remoteFilesList.map(file => file.path);

            for (let i = 0; i < this.deployment.filesToUpload.length; i++) {
                if (existingFilesList.indexOf(this.deployment.filesToUpload[i].path) > -1) {
                    if (this.isBinaryFile(this.deployment.filesToUpload[i].path)) {
                        this.binaryFilesToUpdate.push({
                            'action': 'update',
                            'file_path': this.deployment.filesToUpload[i].path,
                            'encoding': 'base64'
                        });
                    }
                } else {
                    if (this.isBinaryFile(this.deployment.filesToUpload[i].path)) {
                        this.binaryFilesToUpload.push({
                            'action': 'create',
                            'file_path': this.deployment.filesToUpload[i].path,
                            'encoding': 'base64'
                        });
                    }
                }
            }
        }

        this.binaryProgressOffset = 82 / (this.binaryFilesToUpdate.length + this.binaryFilesToUpload.length);
        this.binaryFilesUploadedCount = 0;
        this.binaryFilesToUploadCount = this.binaryFilesToUpdate.length;
        this.currentUploadProgress = 15;
        this.updateBinaryFiles();
    }

    updateBinaryFiles () {
        if (this.binaryFilesToUpdate.length) {
            this.binaryFilesUploaded++;
            let progress = Math.floor(this.currentUploadProgress + this.binaryProgressOffset);
            let operations = [this.binaryFilesUploadedCount, this.binaryFilesToUploadCount];
            let commit = this.binaryFilesToUpdate.shift();
            commit.content = this.readFile(path.join(this.outputDir, commit.file_path));
            this.setUploadProgress(progress, operations);
            this.makeCommit([commit], this.updateBinaryFiles, 'Publii - update ' + commit.file_path);
            return;
        }

        this.binaryFilesUploaded = 0;
        this.binaryFilesToUploadCount = this.binaryFilesToUpload.length;
        this.uploadBinaryFiles();
    }

    uploadBinaryFiles () {
        if (this.binaryFilesToUpload.length) {
            this.binaryFilesUploaded++;
            let progress = Math.floor(this.currentUploadProgress + this.binaryProgressOffset);
            let operations = [this.binaryFilesUploadedCount, this.binaryFilesToUploadCount];
            let commit = this.binaryFilesToUpload.shift();
            commit.content = this.readFile(path.join(this.outputDir, commit.file_path));
            this.setUploadProgress(progress, operations);
            this.makeCommit([commit], this.uploadBinaryFiles, 'Publii - upload ' + commit.file_path);
            return;
        }

        this.updateFilesListFile();
    }

    updateFilesListFile () {
        this.setUploadProgress(98);

        let localFilesListPath = path.join(this.inputDir, 'files.publii.json');
        let actionType = 'create';

        if (this.remoteFilesList.length) {
            actionType = 'update';
        }

        let commit = [{
            'action': actionType,
            'file_path': 'publii-files.json',
            'encoding': 'base64',
            'content': this.readFile(localFilesListPath)
        }];

        this.makeCommit(commit, this.mergeTemporaryBranch, 'Publii - upload remote files list');
    }

    mergeTemporaryBranch () {
        this.setUploadProgress(99);

        this.client.MergeRequests.create(this.projectID, this.temporaryBranch, 'master', 'Publii deployment - merge').then(res => {
            let mergeRequestIID = res.iid;

            this.client.MergeRequests.accept(this.projectID, mergeRequestIID).then(res => {
                this.client.Branches.remove(this.projectID, this.temporaryBranch).then(res => {
                    this.setUploadProgress(100);

                    process.send({
                        type: 'sender',
                        message: 'app-deploy-uploaded',
                        value: {
                            status: true
                        }
                    });
                }).catch(err => {
                    console.log('merge (3): ', err);
                    // @TODO
                });
            }).catch(err => {
                console.log('merge (2): ', err);
                // @TODO
            });
        }).catch(err => {
            console.log('merge (1): ', err);
            // @TODO
        });
    }

    makeCommit (operations, nextOperationCallback, commitMessage = 'Publii - deployment') {
        this.client.Commits.create(this.projectID, this.temporaryBranch, commitMessage, operations).then(res => {
            nextOperationCallback();
        }).catch(err => {
            console.log('makeCommit: ', err);
            // @TODO
        });
    }

    setUploadProgress (progress, operations = false) {
        this.currentUploadProgress = progress;

        process.send({
            type: 'web-contents',
            message: 'app-uploading-progress',
            value: {
                progress: progress,
                operations: operations
            }
        });
    }

    readFile (filePath) {
        return new Buffer(fs.readFileSync(filePath)).toString('base64');
    }

    isBinaryFile (fullPath) {
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

    isNecessaryFile (filePath) {
        let filename = path.parse(filePath).base;

        if(filename.substr(0,1) === '.') {
            return false;
        }

        return true;
    }

    saveConnectionDebugLog () {
        let logPath = path.join(this.deployment.appDir, 'logs', 'connection-debug-log.txt');
        fs.writeFileSync(logPath, this.debugOutput.join("\n"));
    }
}

module.exports = GitlabPages;
