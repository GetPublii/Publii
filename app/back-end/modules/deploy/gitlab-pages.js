/*
 * Class used to upload files to the Github Pages
 */

const fs = require('fs-extra');
const path = require('path');
const passwordSafeStorage = require('keytar');
const slug = require('./../../helpers/slug');
const { Gitlab } = require('@gitbeaker/node');
const stripTags = require('striptags');

class GitlabPages {
    constructor (deploymentInstance = false) {
        this.deployment = deploymentInstance;
        this.connection = false;
        this.repository = '';
        this.user = '';
        this.branch = '';
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

    async testConnection (app, deploymentConfig, siteName, uuid) {
        let repository = deploymentConfig.gitlab.repo;
        let branchName = deploymentConfig.gitlab.branch;
        let token = deploymentConfig.gitlab.token;
        let account = slug(siteName);
        this.waitForTimeout = true;

        if (uuid) {
            account = uuid;
        }

        if (token === 'publii-gl-token ' + account) {
            token = await passwordSafeStorage.getPassword('publii-gl-token', account);
        }

        this.client = new Gitlab({
            host: deploymentConfig.gitlab.server,
            token: token,
            rejectUnauthorized: deploymentConfig.rejectUnauthorized
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
                if (projects[0].name !== repository && projects[0].path !== repository) {
                    this.waitForTimeout = false;
                    app.mainWindow.webContents.send('app-deploy-test-error', {
                        message: {
                            translation: 'core.server.repositoryDoesNotExist'
                        }
                    });

                    return;
                }

                if(!projectID) {
                    this.waitForTimeout = false;
                    app.mainWindow.webContents.send('app-deploy-test-error', {
                        message: {
                            translation: 'core.server.repositoryDoesNotExist'
                        }
                    });

                    return;
                }

                this.client.Branches.show(projectID, branchName).then(branch => {
                    if(!branch) {
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
                    this.waitForTimeout = false;
                    app.mainWindow.webContents.send('app-deploy-test-error', {
                        message: {
                            translation: 'core.server.branchDoesNotExist'
                        }
                    });
                });
            }).catch(err => {
                this.waitForTimeout = false;
                app.mainWindow.webContents.send('app-deploy-test-error', {
                    message: {
                        translation: 'core.server.repositoryDoesNotExist'
                    }
                });
            });
        }).catch(err => {
            this.waitForTimeout = false;
            app.mainWindow.webContents.send('app-deploy-test-error', {
                message: {
                    translation: 'core.server.tokenOrServerAddressInvalid'
                }
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

    async initConnection () {
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

        if (this.deployment.siteConfig.uuid) {
            account = this.deployment.siteConfig.uuid;
        }

        if (token === 'publii-gl-token ' + account) {
            token = await passwordSafeStorage.getPassword('publii-gl-token', account);
        }

        this.client = new Gitlab({
            host: this.deployment.siteConfig.deployment.gitlab.server,
            token: token,
            rejectUnauthorized: this.deployment.siteConfig.deployment.rejectUnauthorized
        });

        this.setUploadProgress(6);
        console.log(`[${ new Date().toUTCString() }] (!) CLIENT CREATED`);

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

            this.client.RepositoryFiles.showRaw(this.projectID, 'publii-files.json', this.branch).then(response => {
                let remoteListToCheck = '';

                if (typeof response === 'Buffer') {
                    remoteListToCheck = response.toString();
                } else {
                    remoteListToCheck = response;
                }

                try {
                    if (remoteListToCheck.length) {
                        this.remoteFilesList = JSON.parse(remoteListToCheck);
                    } else {
                        this.remoteFilesList = [];
                    }
                } catch (e) {
                    this.remoteFilesList = [];
                }

                this.deployment.checkLocalListWithRemoteList(response);
                console.log(`[${ new Date().toUTCString() }] (!) REMOTE FILE DOWNLOADED`);
            }).catch(err => {
                console.log(`[${ new Date().toUTCString() }] (!) REMOTE FILE NOT DOWNLOADED`);
                console.log(`[${ new Date().toUTCString() }] (!) ERROR WHILE DOWNLOADING publii-files.json: ${err.error}`);
                this.deployment.compareFilesList(false);
            });
        }).catch(err => {
            console.log(`[${ new Date().toUTCString() }] downloadFilesList: ${err.error}`);
            console.warn(`[${ new Date().toUTCString() }] ${err}`);

            process.send({
                type: 'web-contents',
                message: 'app-connection-error',
                value: {
                    additionalMessage: stripTags((err.message).toString())
                }
            });
        });
    }

    startSync () {
        this.setUploadProgress(8);
        this.removeFiles();
    }

    removeFiles () {
        // Create a commit to remove all unnecessary files
        if (this.deployment.filesToRemove.length) {
            this.filesToRemove = [];
            console.log(`[${ new Date().toUTCString() }] (!) FILES TO REMOVE DETECTED`);

            for (let i = 0; i < this.deployment.filesToRemove.length; i++) {
                let filePath = this.deployment.filesToRemove[i].path;

                this.filesToRemove.push({
                    'action': 'delete',
                    'file_path': this.getPrefix(filePath) + filePath
                });
            }

            return this.makeCommit(this.filesToRemove, this.updateTextFiles.bind(this), '[skip ci] Publii - remove files');
        }

        console.log(`[${ new Date().toUTCString() }] (!) NO FILES TO REMOVE DETECTED`);
        return this.updateTextFiles();
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

                let filePath = this.deployment.filesToUpload[i].path;
                
                this.filesToUpdate.push({
                    'action': 'update',
                    'file_path': this.getPrefix(filePath) + filePath,
                    'encoding': 'base64',
                    'content': this.readFile(path.join(this.deployment.inputDir, this.deployment.filesToUpload[i].path))
                });
            }

            if (this.filesToUpdate.length) {
                console.log(`[${ new Date().toUTCString() }] (!) TEXT FILES TO UPDATE DETECTED`);
                return this.makeCommit(this.filesToUpdate, this.uploadTextFiles.bind(this), '[skip ci] Publii - update non-binary files');
            }
        }

        console.log(`[${ new Date().toUTCString() }] (!) NO TEXT FILES TO UPDATE DETECTED`);
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

                let filePath = this.deployment.filesToUpload[i].path;
                
                this.filesToUpdate.push({
                    'action': 'create',
                    'file_path': this.getPrefix(filePath) + filePath,
                    'encoding': 'base64',
                    'content': this.readFile(path.join(this.deployment.inputDir, this.deployment.filesToUpload[i].path))
                });
            }

            if (this.filesToUpdate.length) {
                console.log(`[${ new Date().toUTCString() }] (!) TEXT FILES TO UPLOAD DETECTED`);
                return this.makeCommit(this.filesToUpdate, this.createBinaryFilesList.bind(this), '[skip ci] Publii - upload non-binary files');
            }
        }

        console.log(`[${ new Date().toUTCString() }] (!) NO TEXT FILES TO UPLOAD DETECTED`);
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
                        console.log(`[${ new Date().toUTCString() }] (!) BINARY FILE TO UPDATE DETECTED`);
                        let filePath = this.deployment.filesToUpload[i].path;

                        this.binaryFilesToUpdate.push({
                            'action': 'update',
                            'file_path': this.getPrefix(filePath) + filePath,
                            'encoding': 'base64'
                        });
                    }
                } else {
                    if (this.isBinaryFile(this.deployment.filesToUpload[i].path)) {
                        console.log(`[${ new Date().toUTCString() }] (!) BINARY FILE TO UPLOAD DETECTED`);
                        let filePath = this.deployment.filesToUpload[i].path;

                        this.binaryFilesToUpload.push({
                            'action': 'create',
                            'file_path': this.getPrefix(filePath) + filePath,
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
            let commits = [];
            let progress = this.currentUploadProgress;

            for (let i = 1; i <= 10 && this.binaryFilesToUpdate.length; i++) {
                progress = progress + this.binaryProgressOffset;
                this.binaryFilesUploadedCount++;
                let commit = this.binaryFilesToUpdate.shift();
                let fixedPath = commit.file_path.indexOf('public/') === 0 ? commit.file_path.substr(6) : commit.file_path;
                commit.content = this.readFile(path.join(this.deployment.inputDir, fixedPath));
                commits.push(commit);
            }

            let operations = [this.binaryFilesUploadedCount, this.binaryFilesToUploadCount];
            this.setUploadProgress(progress, operations);
            console.log(`[${ new Date().toUTCString() }] (!) BINARY FILES UPDATED`);
            this.makeCommit(commits, this.updateBinaryFiles.bind(this), '[skip ci] Publii - update ' + commits.length + ' files');
            return;
        }

        this.binaryFilesUploaded = 0;
        this.binaryFilesToUploadCount = this.binaryFilesToUpload.length;
        this.uploadBinaryFiles();
    }

    uploadBinaryFiles () {
        if (this.binaryFilesToUpload.length) {
            let commits = [];
            let progress = this.currentUploadProgress;

            for (let i = 1; i <= 10 && this.binaryFilesToUpload.length; i++) {
                progress = progress + this.binaryProgressOffset;
                this.binaryFilesUploadedCount++;
                let commit = this.binaryFilesToUpload.shift();
                let fixedPath = commit.file_path.indexOf('public/') === 0 ? commit.file_path.substr(6) : commit.file_path;
                commit.content = this.readFile(path.join(this.deployment.inputDir, fixedPath));
                commits.push(commit);
            }

            let operations = [this.binaryFilesUploadedCount, this.binaryFilesToUploadCount];
            this.setUploadProgress(progress, operations);
            console.log(`[${ new Date().toUTCString() }] (!) BINARY FILES UPLOADED`);
            this.makeCommit(commits, this.uploadBinaryFiles.bind(this), '[skip ci] Publii - upload ' + commits.length + ' files');
            return;
        }

        this.updateFilesListFile();
    }

    updateFilesListFile () {
        this.setUploadProgress(98);
        let localFilesListPath = path.join(this.deployment.inputDir, 'files.publii.json');
        let localFilesContent = fs.readFileSync(localFilesListPath);
        let actionType = 'create';
        let commit = [];

        if (this.remoteFilesList.length) {
            console.log(`[${ new Date().toUTCString() }] (!) REMOTE FILES SHOULD BE UPDATED`);
            actionType = 'update';
        }

        commit.push({
            'action': actionType,
            'file_path': 'publii-files.json',
            'encoding': 'base64',
            'content': Buffer.from(localFilesContent).toString('base64')
        });

        console.log(`[${ new Date().toUTCString() }] (!) REMOTE FILES LIST UPDATED`);
        return this.makeCommit(commit, this.finishSync.bind(this), 'Publii - upload remote files list');
    }

    finishSync () {
        this.setUploadProgress(100);

        process.send({
            type: 'sender',
            message: 'app-deploy-uploaded',
            value: {
                status: true
            }
        });
    }

    makeCommit (operations, nextOperationCallback, commitMessage = 'Publii - deployment') {
        this.client.Commits.create(this.projectID, this.branch, commitMessage, operations).then(res => {
            return nextOperationCallback();
        }).catch(err => {
            console.log(`[${ new Date().toUTCString() }] (!) COMMIT ERROR: ${JSON.stringify(err)}`);
            process.send({
                type: 'web-contents',
                message: 'app-connection-error',
                value: {
                    additionalMessage: stripTags((err.message).toString())
                }
            });
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
        return Buffer.from(fs.readFileSync(filePath)).toString('base64');
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

    getPrefix (fileNameToBePrefixed) {
        let prefix = 'public';

        if (fileNameToBePrefixed[0] !== '/') {
            prefix = 'public/';
        }

        return prefix;
    }

    isNecessaryFile (filePath) {
        let filename = path.parse(filePath).base;

        if(filename.substr(0,1) === '.') {
            return false;
        }

        return true;
    }
}

module.exports = GitlabPages;
