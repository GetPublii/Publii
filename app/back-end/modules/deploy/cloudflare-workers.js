/*
 * Class used to upload files to Cloudflare Workers Static Assets
 */

const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');
const mime = require('mime');
const FormData = require('form-data');
const fetch = require('node-fetch');
const passwordSafeStorage = require('keytar');
const slug = require('./../../helpers/slug');
const stripTags = require('striptags');

class CloudflareWorkers {
    constructor(deploymentInstance = false) {
        this.deployment = deploymentInstance;
        this.uploadToken = null;
        this.completionToken = null;
        this.fileMetadata = {};
    }

    async initConnection() {
        let accountId = this.deployment.siteConfig.deployment.cloudflareWorkers.accountId;
        let apiToken = this.deployment.siteConfig.deployment.cloudflareWorkers.apiToken;
        let scriptName = this.deployment.siteConfig.deployment.cloudflareWorkers.scriptName;
        let account = slug(this.deployment.siteConfig.name);

        if (this.deployment.siteConfig.uuid) {
            account = this.deployment.siteConfig.uuid;
        }

        // Retrieve credentials from secure storage if needed
        if (accountId === 'publii-cf-account-id ' + account) {
            accountId = await passwordSafeStorage.getPassword('publii-cf-account-id', account);
        }

        if (apiToken === 'publii-cf-api-token ' + account) {
            apiToken = await passwordSafeStorage.getPassword('publii-cf-api-token', account);
        }

        this.accountId = (accountId || '').toString().trim();
        this.apiToken = (apiToken || '').toString().trim();
        this.scriptName = (scriptName || '').toString().trim();

        if (!this.accountId || !this.apiToken || !this.scriptName) {
            this.onError({
                message: 'Missing required configuration: Account ID, API Token, or Script Name'
            });
            return;
        }

        this.deployment.setInput();
        this.deployment.setOutput(true);
        this.localDir = this.deployment.inputDir;

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

        try {
            // Start the deployment process
            await this.deploy();
        } catch (err) {
            console.log(`[${new Date().toUTCString()}] Cloudflare Workers ERROR: ${err}`);
            this.onError(err);
        }
    }

    async deploy() {
        // Step 1: Gather file metadata
        this.gatherFileMetadata();

        // Step 2: Start upload session
        const { uploadToken, buckets } = await this.startUploadSession();
        this.uploadToken = uploadToken;

        // Step 3: Upload files if needed
        if (buckets && buckets.length > 0) {
            this.completionToken = await this.uploadFiles(buckets);
        } else {
            // All files already uploaded, use the token as completion token
            this.completionToken = uploadToken;
        }

        // Step 4: Deploy the worker
        await this.deployWorker();

        // Success
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

        setTimeout(function () {
            process.kill(process.pid, 'SIGTERM');
        }, 1000);
    }

    gatherFileMetadata() {
        const files = this.getAllFiles(this.localDir);
        this.fileMetadata = {};
        this.deployment.operationsCounter = files.length + 3; // +3 for upload session, worker deploy, and completion
        this.deployment.progressPerFile = 90.0 / this.deployment.operationsCounter;
        this.deployment.currentOperationNumber = 0;

        files.forEach(file => {
            const relativePath = '/' + path.relative(this.localDir, file).replace(/\\/g, '/');
            const { hash, size } = this.calculateFileHash(file);
            this.fileMetadata[relativePath] = { hash, size };
        });
    }

    getAllFiles(dir, fileList = []) {
        const files = fs.readdirSync(dir);

        files.forEach(file => {
            const filePath = path.join(dir, file);
            const stat = fs.statSync(filePath);

            if (stat.isDirectory()) {
                this.getAllFiles(filePath, fileList);
            } else if (file !== '.DS_Store' && file !== 'Thumbs.db' && !file.startsWith('.')) {
                fileList.push(filePath);
            }
        });

        return fileList;
    }

    calculateFileHash(filePath) {
        const fileBuffer = fs.readFileSync(filePath);
        const hash = crypto.createHash('sha256');
        hash.update(fileBuffer);
        return {
            hash: hash.digest('hex').slice(0, 32), // First 32 chars
            size: fileBuffer.length
        };
    }

    async startUploadSession() {
        const url = `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/workers/scripts/${this.scriptName}/assets-upload-session`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                manifest: this.fileMetadata
            })
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.errors?.[0]?.message || 'Failed to start upload session');
        }

        this.updateProgress();
        return {
            uploadToken: data.result.jwt,
            buckets: data.result.buckets
        };
    }

    async uploadFiles(buckets) {
        let completionToken = null;

        for (const bucket of buckets) {
            const form = new FormData();

            for (const fileHash of bucket) {
                const filePath = this.findFileByHash(fileHash);
                if (filePath) {
                    const absolutePath = path.join(this.localDir, filePath.substring(1));
                    const fileBuffer = fs.readFileSync(absolutePath);
                    const base64Data = fileBuffer.toString('base64');

                    // Determine content type
                    const contentType = mime.getType(filePath) || 'application/octet-stream';

                    form.append(fileHash, base64Data, {
                        filename: fileHash,
                        contentType: contentType
                    });
                }
            }

            const response = await fetch(
                `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/workers/assets/upload?base64=true`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.uploadToken}`
                    },
                    body: form
                }
            );

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.errors?.[0]?.message || 'Failed to upload files');
            }

            this.updateProgress();

            if (data.result.jwt) {
                completionToken = data.result.jwt;
            }
        }

        return completionToken;
    }

    findFileByHash(hash) {
        for (const [path, metadata] of Object.entries(this.fileMetadata)) {
            if (metadata.hash === hash) {
                return path;
            }
        }
        return null;
    }


    async deployWorker() {
        const form = new FormData();

        // Worker configuration for static assets only
        const metadata = {
            main_module: 'index.js',
            compatibility_date: '2024-01-01',
            assets: {
                jwt: this.completionToken,
                config: {
                    "html_handling": "auto-trailing-slash",
                    "not_found_handling": "404-page"
                }
            },
            bindings: [
                {
                    name: 'ASSETS',
                    type: 'assets'
                }
            ]
        };

        console.log(`[${new Date().toUTCString()}] Cloudflare Workers metadata:`, JSON.stringify(metadata, null, 2));
        form.append('metadata', JSON.stringify(metadata));

        // Worker that serves static assets using the ASSETS binding
        const workerCode = `export default {
  async fetch(request, env) {
    // Pass all requests to the static assets
    // The ASSETS binding handles routing with our configured html_handling and not_found_handling
    return env.ASSETS.fetch(request);
  }
};`;

        form.append('index.js', workerCode, {
            filename: 'index.js',
            contentType: 'application/javascript+module'
        });

        const url = `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/workers/scripts/${this.scriptName}`;

        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${this.apiToken}`
            },
            body: form
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            console.log(`[${new Date().toUTCString()}] Cloudflare Workers deployment error:`, JSON.stringify(data, null, 2));
            throw new Error(data.errors?.[0]?.message || 'Failed to deploy worker');
        }

        console.log(`[${new Date().toUTCString()}] Cloudflare Workers deployment successful`);
        this.updateProgress();
    }

    updateProgress() {
        this.deployment.currentOperationNumber++;
        const progress = this.deployment.currentOperationNumber * this.deployment.progressPerFile;

        process.send({
            type: 'web-contents',
            message: 'app-uploading-progress',
            value: {
                progress: 8 + Math.floor(progress),
                operations: [this.deployment.currentOperationNumber, this.deployment.operationsCounter]
            }
        });
    }

    onError(error) {
        const message = error.message || error.toString();

        process.send({
            type: 'web-contents',
            message: 'app-connection-error',
            value: {
                additionalMessage: stripTags(message)
            }
        });

        setTimeout(function () {
            process.kill(process.pid, 'SIGTERM');
        }, 1000);
    }

    async testConnection(app, deploymentConfig, siteName, uuid) {
        let accountId = deploymentConfig.cloudflareWorkers.accountId;
        let apiToken = deploymentConfig.cloudflareWorkers.apiToken;
        let scriptName = deploymentConfig.cloudflareWorkers.scriptName;
        let account = slug(siteName);
        let waitForTimeout = true;

        if (uuid) {
            account = uuid;
        }

        // Retrieve credentials from secure storage if needed
        if (accountId === 'publii-cf-account-id ' + account) {
            accountId = await passwordSafeStorage.getPassword('publii-cf-account-id', account);
        }

        if (apiToken === 'publii-cf-api-token ' + account) {
            apiToken = await passwordSafeStorage.getPassword('publii-cf-api-token', account);
        }

        if (!accountId || !apiToken || !scriptName) {
            app.mainWindow.webContents.send('app-deploy-test-error', {
                message: 'Missing required configuration: Account ID, API Token, or Script Name'
            });
            return;
        }

        try {
            // Test API access by fetching account details
            const response = await fetch(
                `https://api.cloudflare.com/client/v4/accounts/${accountId}`,
                {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${apiToken}`
                    }
                }
            );

            const data = await response.json();

            if (response.ok && data.success) {
                waitForTimeout = false;
                app.mainWindow.webContents.send('app-deploy-test-success');
            } else {
                waitForTimeout = false;
                app.mainWindow.webContents.send('app-deploy-test-error', {
                    message: stripTags(data.errors?.[0]?.message || 'Failed to connect to Cloudflare API')
                });
            }
        } catch (err) {
            waitForTimeout = false;
            app.mainWindow.webContents.send('app-deploy-test-error', {
                message: stripTags(err.message || 'Connection test failed')
            });
        }

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
}

module.exports = CloudflareWorkers;
