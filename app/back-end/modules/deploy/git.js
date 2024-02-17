/*
 * Class used to upload files to the Github Pages
 */

const fs = require('fs-extra');
const gitClient = require('isomorphic-git')
const http = require('isomorphic-git/http/node')
const passwordSafeStorage = require('keytar');
const slug = require('./../../helpers/slug');
const stripTags = require('striptags');

class Git {
    constructor(deploymentInstance = false) {
        this.deployment = deploymentInstance;
        this.repositoryURL = '';
        this.user = '';
        this.password = '';
        this.branch = '';
        this.commitAuthor = '';
        this.commitEmail = '';
        this.commitMessage = '';
    }

    async initConnection() {
        let account = slug(this.deployment.siteConfig.name);
        this.repositoryURL = this.deployment.siteConfig.deployment.git.url;
        this.user = this.deployment.siteConfig.deployment.git.user;
        this.password = this.deployment.siteConfig.deployment.git.password;
        this.branch = this.deployment.siteConfig.deployment.git.branch;
        this.commitAuthor = this.deployment.siteConfig.deployment.git.commitAuthor;
        this.commitEmail = this.deployment.siteConfig.deployment.git.commitEmail;
        this.commitMessage = this.deployment.siteConfig.deployment.git.commitMessage;
        
        if (this.deployment.siteConfig.uuid) {
            account = this.deployment.siteConfig.uuid;
        }

        if (this.password === 'publii-git-password ' + account) {
            this.password = await passwordSafeStorage.getPassword('publii-git-password', account);
        }

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

        this.deployment.setInput();
        await this.deploy();
    }

    async testConnection(app, deploymentConfig, siteName, uuid) {
        this.waitForTimeout = true;
        let account = slug(siteName);
        let username = deploymentConfig.git.user;
        let password = deploymentConfig.git.password;
        let url = deploymentConfig.git.url;
        
        if (uuid) {
            account = uuid;
        }

        if (password === 'publii-git-password ' + account) {
            password = await passwordSafeStorage.getPassword('publii-git-password', account);
        }

        let authObject = {
            username,
            password
        };

        let timeoutCheck = setTimeout(function () {
            if(this.waitForTimeout === true) {
                app.mainWindow.webContents.send('app-deploy-test-error', {
                    message: {
                        translation: 'core.server.requestTimeout'
                    }
                });

                this.waitForTimeout = false;
            }
        }, 20000);

        try {
            await gitClient.getRemoteInfo({
                http,
                url,
                onAuth: () => authObject,
                onAuthFailure: () => {
                    app.mainWindow.webContents.send('app-deploy-test-error', {
                        noAdditionalMessage: true,
                        message: {
                            translation: 'core.server.tokenOrServerAddressInvalid'
                        }
                    });
                    this.waitForTimeout = false;
                    clearTimeout(timeoutCheck);
                },
                onAuthSuccess: () => {
                    app.mainWindow.webContents.send('app-deploy-test-success');
                    this.waitForTimeout = false;
                    clearTimeout(timeoutCheck);
                }
            });
        } catch (e) {
            console.log('Cannot connect to the git repository: ', e);

            if (e.data && e.data.response) {
                app.mainWindow.webContents.send('app-deploy-test-error', {
                    message: stripTags((e.data.response).toString())
                });
            } else {
                app.mainWindow.webContents.send('app-deploy-test-error', {
                    message: stripTags((e).toString())
                });
            }
        }
    }

    async prepareToSync (siteConfig, siteName, dir, sendProgressCallback) {
        let account = slug(siteName);
        let username = siteConfig.deployment.git.user;
        let password = siteConfig.deployment.git.password;
        let url = siteConfig.deployment.git.url;
        let branch = siteConfig.deployment.git.branch;
        let commitAuthor = siteConfig.deployment.git.commitAuthor;
        let commitEmail = siteConfig.deployment.git.commitEmail;
        
        if (siteConfig.uuid) {
            account = siteConfig.uuid;
        }

        if (password === 'publii-git-password ' + account) {
            password = await passwordSafeStorage.getPassword('publii-git-password', account);
        }

        let authObject = {
            username,
            password
        };

        try {
            let repo = { fs, dir };

            await gitClient.init({
                fs,
                dir,
                defaultBranch: branch
            });

            console.log('[i] Git debug: repository URL = ', url, ' branch = ' + branch, ' path = ' + dir);

            const hasProperOrigin = await this.hasCorrectOrigin(repo, url);

            if (!hasProperOrigin) {
                await gitClient.addRemote({ 
                    fs, 
                    dir, 
                    url, 
                    remote: 'origin'
                });

                console.log('[i] Git debug: need to add origin');
                await this.hasCorrectOrigin(repo, url);
            } else {
                console.log('[i] Git debug: not needed to add origin')
            }

            console.log('[i] Git debug: origin checked');

            let info = await gitClient.getRemoteInfo({
                http,
                url,
                onAuth: () => authObject
            });

            console.log('[i] Git debug: remote info = ' + JSON.stringify(info));

            await gitClient.fetch({
                fs,
                http,
                dir,
                url,
                ref: branch,
                depth: 1,
                singleBranch: true,
                onMessage: message => {
                    sendProgressCallback(1, message);
                    console.log('[i] Git debug: ' + message);
                },
                onProgress: event => {
                    sendProgressCallback(1, event.phase + '(' + event.loaded + ')');
                    console.log('[i] Git debug: ' + event.phase + '(' + event.loaded + ')')
                },
                onAuth: () => authObject
            });

            await gitClient.checkout({ 
                fs, 
                dir, 
                ref: branch,
                noCheckout: true,
                onProgress: event => {
                    sendProgressCallback(1, event.phase + '(' + event.loaded + ')');
                    console.log('[i] Git debug: ' + event.phase + '(' + event.loaded + ')')
                },
            });

            await gitClient.pull({ 
                http, 
                fs, 
                dir, 
                ref: branch,
                remote: 'origin',
                author: {
                    name: commitAuthor, 
                    email: commitEmail
                },
                onMessage: message => {
                    sendProgressCallback(1, message);
                    console.log('[i] Git debug: ' + message);
                },
                onProgress: event => {
                    sendProgressCallback(1, event.phase + '(' + event.loaded + ')');
                    console.log('[i] Git debug: ' + event.phase + '(' + event.loaded + ')')
                },
                onAuth: () => authObject
            });

            console.log('[i] Git debug: pull done');
        } catch (err) {
            console.log(`[${ new Date().toUTCString() }] ERROR: ${err}`);

            if (err.toString().indexOf('MergeNotSupportedError') > -1) {
                return 'merge-error';
            }
        }

        return 'ok';
    }

    async deploy() {
        try {
            let dir = this.deployment.inputDir;
            let repo = { fs, dir };
            let authObject = {
                username: this.user,
                password: this.password
            };

            await gitClient.statusMatrix(repo).then((status) =>
                Promise.all(
                    status.map(([filepath, , worktreeStatus]) => {
                        if (filepath.substr(-9) === '.DS_Store' || filepath.substr(-9) === 'Thumbs.db') {
                            console.log('[i] Git debug: skip system files');
                        } else {
                            if (worktreeStatus) {
                                gitClient.add({ ...repo, filepath });
                                console.log('[i] Git debug: add = ', filepath);
                            } else { 
                                gitClient.remove({ ...repo, filepath });
                                console.log('[i] Git debug: remove = ', filepath);
                            }
                        }
                    })
                )
            );

            console.log('[i] Git debug: git add done');

            const changesMatrix = await gitClient.statusMatrix(repo);
            const hasChanges = changesMatrix.some(row => {
                return row[1] !== 1 || row[2] !== 1;
            });

            console.log('[i] Git debug: changes exists = ', hasChanges);

            if (hasChanges) {
                await gitClient.commit({ 
                    fs, 
                    dir, 
                    author: {
                        name: this.commitAuthor,
                        email: this.commitEmail
                    },
                    message: this.commitMessage
                });

                console.log('[i] Git debug: commit done');

                process.send({
                    type: 'web-contents',
                    message: 'app-uploading-progress',
                    value: {
                        message: 'Pushing changes to remote...',
                        progress: 50,
                        operations: [0, 1]
                    }
                });

                await gitClient.push({
                    http,
                    fs,
                    dir,
                    remote: 'origin',
                    ref: this.branch,
                    onAuth: () => (authObject),
                    onMessage: message => {
                        console.log(`[i] Git debug - message: ${message}`);
                    },
                    onProgress: event => {
                        console.log(`[i] Git debug - event: ${event}`);
                    }
                });

                console.log('[i] Git debug: push done');

                process.send({
                    type: 'web-contents',
                    message: 'app-uploading-progress',
                    value: {
                        message: 'Push operation completed',
                        progress: 99,
                        operations: [2, 2]
                    }
                });
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
            console.log(`[${ new Date().toUTCString() }] ERROR: ${err}`);

            process.send({
                type: 'web-contents',
                message: 'app-connection-error',
                value: {
                    additionalMessage: 'Critical error: ' + stripTags((err).toString())
                }
            });

            setTimeout(function () {
                process.kill(process.pid, 'SIGTERM');
            }, 1000);
        }
    }

    async hasCorrectOrigin (repo, originToCheck) {
        let remotes = await gitClient.listRemotes(repo);

        console.log('[i] Git debug: remotes = ' + JSON.stringify(remotes));
    
        if (!remotes) {
            return false;
        }
    
        for (let i = 0; i < remotes.length; i++) {
            if (remotes[i].url === originToCheck) {
                return true;
            }
        }
    
        return false;
    }
}

module.exports = Git;
