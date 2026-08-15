/*
 * Class used to upload files to a Dokku server
 */

const { spawn } = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const stripTags = require('striptags');

class Dokku {
    constructor(deploymentInstance = false) {
        this.deployment = deploymentInstance;
        this.url = '';
        this.branch = '';
        this.commitAuthor = '';
        this.commitEmail = '';
        this.commitMessage = '';
    }

    async initConnection() {
        this.url = this.deployment.siteConfig.deployment.dokku.url;
        this.branch = this.deployment.siteConfig.deployment.dokku.branch || 'main';
        this.commitAuthor = this.deployment.siteConfig.deployment.dokku.commitAuthor;
        this.commitEmail = this.deployment.siteConfig.deployment.dokku.commitEmail || '';
        this.commitMessage = this.deployment.siteConfig.deployment.dokku.commitMessage || 'Publii: update content';

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
        let self = this;
        let url = deploymentConfig.dokku.url;
        self.waitForTimeout = true;

        if (!url) {
            app.mainWindow.webContents.send('app-deploy-test-error', {
                message: 'Dokku URL is not configured'
            });
            return;
        }

        let urlMatch = url.match(/^[^@]+@([^:]+):/);

        if (!urlMatch) {
            app.mainWindow.webContents.send('app-deploy-test-error', {
                message: 'Invalid Dokku URL format. Expected: dokku@server:app-name'
            });
            return;
        }

        let host = urlMatch[1];
        let ssh = spawn('ssh', ['-o', 'BatchMode=yes', '-o', 'ConnectTimeout=10', '-T', `dokku@${host}`]);
        let stdout = '';
        let stderr = '';

        ssh.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        ssh.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        let timeoutCheck = setTimeout(function() {
            if (self.waitForTimeout === true) {
                ssh.kill();
                app.mainWindow.webContents.send('app-deploy-test-error', {
                    message: {
                        translation: 'core.server.requestTimeout'
                    }
                });
                self.waitForTimeout = false;
            }
        }, 15000);

        ssh.on('close', (code) => {
            clearTimeout(timeoutCheck);

            if (stderr.includes('Permission denied') || stderr.includes('Host key verification failed')) {
                app.mainWindow.webContents.send('app-deploy-test-error', {
                    message: stderr.includes('Host key verification failed')
                        ? 'Host key verification failed. Add the server to your known_hosts file.'
                        : 'SSH authentication failed. Verify your SSH key is added to the Dokku server.'
                });
            } else if (stdout.includes('dokku') || stderr.includes('dokku') || code === 1) {
                app.mainWindow.webContents.send('app-deploy-test-success');
            } else if (code === 255) {
                app.mainWindow.webContents.send('app-deploy-test-error', {
                    message: 'Could not connect to the server. Check the hostname and your network connection.'
                });
            } else {
                app.mainWindow.webContents.send('app-deploy-test-success');
            }

            self.waitForTimeout = false;
        });

        ssh.on('error', (err) => {
            clearTimeout(timeoutCheck);
            app.mainWindow.webContents.send('app-deploy-test-error', {
                message: stripTags(err.message)
            });
            self.waitForTimeout = false;
        });
    }

    async deploy() {
        let self = this;

        try {
            let dir = this.deployment.inputDir;

            await this.execGit(dir, ['init', '-b', this.branch]);
            console.log('[i] Dokku debug: git init done');

            await this.execGit(dir, ['config', 'user.name', this.commitAuthor]);

            if (this.commitEmail) {
                await this.execGit(dir, ['config', 'user.email', this.commitEmail]);
            }

            console.log('[i] Dokku debug: git config done');

            fs.writeFileSync(path.join(dir, '.static'), '');
            console.log('[i] Dokku debug: .static file created');

            let siteDir = path.join(dir, '_site');

            if (!fs.existsSync(siteDir)) {
                fs.mkdirSync(siteDir);
            }

            let filesToMove = fs.readdirSync(dir).filter(f => f !== '.git' && f !== '_site' && f !== '.static');

            for (let i = 0; i < filesToMove.length; i++) {
                fs.moveSync(path.join(dir, filesToMove[i]), path.join(siteDir, filesToMove[i]), { overwrite: true });
            }

            console.log('[i] Dokku debug: moved files to _site/');

            let remotes = await this.execGit(dir, ['remote', '-v']);

            if (remotes.stdout.includes('dokku')) {
                if (!remotes.stdout.includes(this.url)) {
                    await this.execGit(dir, ['remote', 'set-url', 'dokku', this.url]);
                    console.log('[i] Dokku debug: remote URL updated');
                }
            } else {
                await this.execGit(dir, ['remote', 'add', 'dokku', this.url]);
                console.log('[i] Dokku debug: remote added');
            }

            await this.execGit(dir, ['add', '-A']);
            console.log('[i] Dokku debug: git add done');

            let status = await this.execGit(dir, ['status', '--porcelain']);
            let hasChanges = status.stdout.trim().length > 0;

            console.log('[i] Dokku debug: changes exists = ', hasChanges);

            if (hasChanges) {
                await this.execGit(dir, ['commit', '-m', this.commitMessage]);
                console.log('[i] Dokku debug: commit done');

                process.send({
                    type: 'web-contents',
                    message: 'app-uploading-progress',
                    value: {
                        message: 'Pushing changes to remote...',
                        progress: 50,
                        operations: [0, 1]
                    }
                });

                await this.execGit(dir, ['push', 'dokku', this.branch, '--force']);
                console.log('[i] Dokku debug: push done');

                process.send({
                    type: 'web-contents',
                    message: 'app-uploading-progress',
                    value: {
                        message: 'Push operation completed',
                        progress: 99,
                        operations: [1, 1]
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

    execGit(dir, args) {
        return new Promise((resolve, reject) => {
            let git = spawn('git', args, {
                cwd: dir,
                env: { ...process.env, GIT_TERMINAL_PROMPT: '0' }
            });

            let stdout = '';
            let stderr = '';

            git.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            git.stderr.on('data', (data) => {
                stderr += data.toString();
                console.log('[i] Dokku debug: ' + data.toString().trim());
            });

            git.on('close', (code) => {
                if (code === 0 || args[0] === 'status' || args[0] === 'add' || args[0] === 'remote') {
                    resolve({ stdout, stderr });
                } else {
                    reject(new Error(stderr || stdout || `Git command failed: git ${args.join(' ')}`));
                }
            });

            git.on('error', (err) => {
                reject(err);
            });
        });
    }
}

module.exports = Dokku;
