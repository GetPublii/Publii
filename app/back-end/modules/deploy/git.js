/*
 * Class used to upload files to the Github Pages
 */

const fs = require('fs-extra');
const git = require('isomorphic-git')
const http = require('isomorphic-git/http/node')
const passwordSafeStorage = require('keytar');
const slug = require('./../../helpers/slug');

class Git {
    constructor(deploymentInstance = false) {
        this.deployment = deploymentInstance;
        this.repositoryURL = this.deployment.siteConfig.deployment.git.url;
        this.user = '';
        this.password = '';
        this.branch = '';
        this.commitAuthor = '';
        this.commitMessage = '';
    }

    async initConnection() {
        let account = slug(this.deployment.siteConfig.name);
        this.user = this.deployment.siteConfig.deployment.git.user;
        this.password = this.deployment.siteConfig.deployment.git.password;
        this.branch = this.deployment.siteConfig.deployment.git.branch;
        this.commitAuthor = this.deployment.siteConfig.deployment.git.commitAuthor;
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
        this.deployment.setOutput(true);
        await this.deploy();
    }

    async testConnection(app, deploymentConfig, siteName, uuid) {
        /*
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
                message: err.message
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
        */
    }

    async deploy() {
        try {
            let dir = this.deployment.outputDir;
            let authObject = {
                username: this.user,
                password: this.password
            };

            await git.init({ 
                fs, 
                dir 
            });

            console.log('REPO URL:', this.repositoryURL);

            await git.fetch({ 
                http, 
                fs, 
                dir, 
                url: this.repositoryURL,
                ref: this.branch, 
                depth: 1,
                onAuth: () => authObject
            });

            await git.checkout({ 
                fs, 
                dir, 
                ref: this.branch, 
                noCheckout: true,
                onAuth: () => authObject
            });

            await git.add({ 
                fs, 
                dir, 
                filepath: this.deployment.outputDir + '/'
            });

            await git.commit({ 
                fs, 
                dir, 
                author: {
                    name: this.commitAuthor,
                    email: ''
                },
                message: this.commitMessage
            });

            await git.push({
                http,
                fs,
                dir,
                onAuth: () => (authObject),
                onProgress: event => {
                    console.log(`[${ new Date().toUTCString() }] Event: ${event}`);
                    if (event.total) {
                        process.send({
                            type: 'web-contents',
                            message: 'app-uploading-progress',
                            value: {
                                message: event.phase,
                                progress: 8 + (Math.floor((event.loaded / event.total) * 100) - 8),
                                operations: [event.loaded, event.total]
                            }
                        });
                    }
                }
            });

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
                    additionalMessage: 'Critical error: ' + JSON.stringify(err)
                }
            });

            setTimeout(function () {
                process.kill(process.pid, 'SIGTERM');
            }, 1000);
        }
    }
}

module.exports = Git;
