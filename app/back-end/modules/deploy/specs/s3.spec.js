const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

describe('S3 deployment', function () {
    let S3;
    let FakeS3ApiClient;
    let timers;
    let messages;
    let kills;
    let clients;
    let apiCalls;
    let apiErrors;
    let apiDelays;
    let remoteFilesContent;
    let localFiles;
    let secrets;
    let closeCalls;
    let testReplies;
    let constructorError;

    function s3Error (code, message, status = 400) {
        return Object.assign(new Error(message), { name: 'S3ApiError', code: code, status: status });
    }

    // A pending promise in apiDelays simulates a slow or hanging API request
    function apiResponse (name, value) {
        if (apiErrors[name]) {
            return Promise.reject(apiErrors[name]);
        }

        if (apiDelays[name]) {
            return apiDelays[name].then(() => value);
        }

        return Promise.resolve(value);
    }

    function flushPromises () {
        return new Promise(resolve => setImmediate(resolve));
    }

    // Values created inside the vm context have prototypes from another realm, which strict deepEqual rejects
    function plain (value) {
        return JSON.parse(JSON.stringify(value));
    }

    // The sync flow chains promises, fs.readFile callbacks and setImmediate replies - a few rounds settle it
    async function settle () {
        for (let i = 0; i < 25; i++) {
            await flushPromises();
        }
    }

    function runTimers () {
        timers.splice(0).forEach(callback => callback());
    }

    function siteConfig (s3Overrides = {}) {
        return {
            name: 'Demo Site',
            uuid: 'uuid-1',
            deployment: {
                protocol: 's3',
                s3: Object.assign({
                    customProvider: false,
                    provider: 'aws',
                    endpoint: '',
                    id: 'publii-s3-id uuid-1',
                    key: 'publii-s3-key uuid-1',
                    bucket: 'demo-bucket',
                    region: 'eu-central-1',
                    customRegion: '',
                    prefix: 'site/',
                    acl: 'public-read',
                    htmlCacheControl: 'no-cache, no-store',
                    otherCacheControl: 'public, max-age=2592000'
                }, s3Overrides)
            }
        };
    }

    function createDeployment (s3Overrides = {}) {
        let deploymentCalls = [];
        let deployment = {
            inputDir: '/sites/demo/output',
            siteConfig: siteConfig(s3Overrides),
            filesToRemove: [],
            filesToUpload: [],
            currentOperationNumber: 0,
            operationsCounter: 0,
            progressOfUploading: 0,
            progressOfDeleting: 0,
            progressPerFile: 0,
            setInput () {
                deploymentCalls.push(['setInput']);
            },
            setOutput (useEmpty) {
                deploymentCalls.push(['setOutput', useEmpty]);
            },
            prepareLocalFilesList () {
                deploymentCalls.push(['prepareLocalFilesList']);
            },
            checkLocalListWithRemoteList (content) {
                deploymentCalls.push(['checkLocalListWithRemoteList', content]);
            },
            compareFilesList (remoteFileListExists) {
                deploymentCalls.push(['compareFilesList', remoteFileListExists]);
            }
        };

        return { deployment, deploymentCalls, s3: new S3(deployment) };
    }

    function testConnection (s3, s3Overrides = {}) {
        return s3.testConnection({}, siteConfig(s3Overrides).deployment, 'Demo Site', 'uuid-1', {
            send (channel, payload) {
                testReplies.push({
                    channel: channel,
                    payload: payload === undefined ? payload : JSON.parse(JSON.stringify(payload))
                });
            }
        });
    }

    function connectionError (additionalMessage) {
        return {
            type: 'web-contents',
            message: 'app-connection-error',
            value: {
                additionalMessage: additionalMessage
            }
        };
    }

    function progressMessages () {
        return messages.filter(message => message.message === 'app-uploading-progress').map(message => message.value.progress);
    }

    function otherMessages () {
        return messages.filter(message => message.message !== 'app-uploading-progress');
    }

    // A deployment which already passed the connection stage
    function connectedDeployment (s3Overrides = {}) {
        let created = createDeployment(s3Overrides);
        created.s3.connection = new FakeS3ApiClient({});
        created.s3.bucket = created.deployment.siteConfig.deployment.s3.bucket;
        created.s3.prefix = created.deployment.siteConfig.deployment.s3.prefix;
        created.deployment.filesToRemove = [
            { path: '/old.html', type: 'file' },
            { path: 'old-dir', type: 'directory' }
        ];
        created.deployment.filesToUpload = [
            { path: 'index.html', type: 'file' },
            { path: 'css/style.css', type: 'file' },
            { path: 'css', type: 'directory' }
        ];
        created.deployment.operationsCounter = 4;
        created.deployment.progressPerFile = 22.5;
        clients = [];

        return created;
    }

    beforeEach(function () {
        timers = [];
        messages = [];
        kills = [];
        clients = [];
        apiCalls = [];
        apiErrors = {};
        apiDelays = {};
        remoteFilesContent = '[{"path":"index.html"}]';
        localFiles = {
            '/sites/demo/output/index.html': '<html></html>',
            '/sites/demo/output/css/style.css': 'body{}',
            '/sites/demo/output/files.publii.json': '[{"path":"index.html"},{"path":"css/style.css"}]'
        };
        secrets = {
            'publii-s3-id uuid-1': 'STORED-ID',
            'publii-s3-key uuid-1': 'STORED-KEY'
        };
        closeCalls = 0;
        testReplies = [];
        constructorError = null;

        FakeS3ApiClient = class {
            constructor (options) {
                clients.push(JSON.parse(JSON.stringify(options)));

                if (constructorError) {
                    throw constructorError;
                }
            }

            listObjects (options) {
                apiCalls.push(['listObjects', plain(options)]);
                return apiResponse('listObjects', '<ListBucketResult/>');
            }

            getObject (key) {
                apiCalls.push(['getObject', key]);
                return apiResponse('getObject', Buffer.from(remoteFilesContent));
            }

            putObject (key, body, options) {
                apiCalls.push(['putObject', key, body.toString(), plain(options)]);
                return apiResponse('putObject:' + key, { status: 200, etag: '' });
            }

            deleteObject (key) {
                apiCalls.push(['deleteObject', key]);
                return apiResponse('deleteObject:' + key, { status: 204 });
            }

            close () {
                closeCalls++;
            }
        };

        const context = {
            module: { exports: {} },
            console: { log () {}, warn () {}, error () {} },
            setTimeout (callback) {
                timers.push(callback);
            },
            process: {
                pid: 123,
                send (message) {
                    messages.push(JSON.parse(JSON.stringify(message)));
                },
                kill (pid, signal) {
                    kills.push(signal);
                }
            },
            require (name) {
                if (name === 'path') {
                    return path;
                }

                if (name === 'fs-extra') {
                    return {
                        readFile (filePath, callback) {
                            setImmediate(() => {
                                if (localFiles[filePath] === undefined) {
                                    callback(new Error(`ENOENT: no such file or directory, open '${filePath}'`));
                                    return;
                                }

                                callback(null, Buffer.from(localFiles[filePath]));
                            });
                        }
                    };
                }

                if (name === './s3-api-client.js') {
                    return FakeS3ApiClient;
                }

                if (name === './../../helpers/password-storage.js') {
                    return {
                        getPassword (type, account) {
                            return Promise.resolve(secrets[type + ' ' + account] || null);
                        }
                    };
                }

                if (name === './../../helpers/slug') {
                    return value => String(value).toLowerCase().replace(/\s+/g, '-');
                }

                if (name === 'mime') {
                    return {
                        getType (value) {
                            let extension = String(value).split('.').pop();
                            return { html: 'text/html', css: 'text/css', json: 'application/json' }[extension] || null;
                        }
                    };
                }

                if (name === 'striptags') {
                    return value => String(value).replace(/<[^>]*>/g, '');
                }

                return {};
            }
        };

        vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../s3.js'), 'utf8'), context);
        S3 = context.module.exports;
    });

    describe('connection test', function () {
        it('confirms the connection to an AWS bucket using the stored credentials', async function () {
            await testConnection(new S3());
            await settle();

            assert.deepEqual(testReplies, [{ channel: 'app-deploy-test-success', payload: undefined }]);
            assert.deepEqual(clients, [{
                accessKeyId: 'STORED-ID',
                secretAccessKey: 'STORED-KEY',
                region: 'eu-central-1',
                bucket: 'demo-bucket'
            }]);
            assert.deepEqual(apiCalls, [['listObjects', { prefix: 'site/', maxKeys: 1 }]]);
            assert.equal(closeCalls, 1);

            runTimers();

            assert.equal(testReplies.length, 1);
        });

        it('passes the endpoint and the region of a custom provider', async function () {
            await testConnection(new S3(), {
                customProvider: true,
                provider: 'custom',
                endpoint: 'nyc3.digitaloceanspaces.com',
                customRegion: 'nyc3',
                id: 'DIRECT-ID',
                key: 'DIRECT-KEY',
                prefix: ''
            });
            await settle();

            assert.deepEqual(testReplies, [{ channel: 'app-deploy-test-success', payload: undefined }]);
            assert.deepEqual(clients, [{
                accessKeyId: 'DIRECT-ID',
                secretAccessKey: 'DIRECT-KEY',
                endpoint: 'nyc3.digitaloceanspaces.com',
                region: 'nyc3',
                bucket: 'demo-bucket'
            }]);
            assert.deepEqual(apiCalls, [['listObjects', { prefix: '', maxKeys: 1 }]]);
        });

        it('reports the error message of a failed listing without HTML tags', async function () {
            apiErrors.listObjects = s3Error('SignatureDoesNotMatch', 'The request signature <b>we calculated</b> does not match.', 403);

            await testConnection(new S3());
            await settle();

            assert.deepEqual(testReplies, [{
                channel: 'app-deploy-test-error',
                payload: { message: 'The request signature we calculated does not match.' }
            }]);
            assert.equal(closeCalls, 1);
        });

        it('reports an invalid endpoint', async function () {
            constructorError = s3Error('InvalidEndpoint', 'Invalid S3 endpoint: ftp://storage');

            await testConnection(new S3(), { customProvider: true, provider: 'custom', endpoint: 'ftp://storage' });
            await settle();

            assert.deepEqual(testReplies, [{ channel: 'app-deploy-test-error', payload: { message: 'Invalid S3 endpoint: ftp://storage' } }]);
            assert.deepEqual(apiCalls, []);
        });

        it('reports a timeout when the bucket listing does not respond in time', async function () {
            apiDelays.listObjects = new Promise(() => {});

            await testConnection(new S3());
            await settle();
            assert.deepEqual(testReplies, []);

            runTimers();

            assert.deepEqual(testReplies, [{
                channel: 'app-deploy-test-error',
                payload: { message: { translation: 'core.server.requestTimeout' } }
            }]);
            assert.equal(closeCalls, 1);
        });

        it('ignores a reply which arrives after the timeout', async function () {
            let respond;
            apiDelays.listObjects = new Promise(resolve => {
                respond = resolve;
            });

            await testConnection(new S3());
            runTimers();
            respond();
            await settle();

            assert.deepEqual(testReplies.map(reply => reply.channel), ['app-deploy-test-error']);
            assert.equal(closeCalls, 1);
        });
    });

    describe('connection', function () {
        it('lists the bucket and downloads the remote files list', async function () {
            let { deploymentCalls, s3 } = createDeployment();

            await s3.initConnection();

            assert.deepEqual(clients, [{
                accessKeyId: 'STORED-ID',
                secretAccessKey: 'STORED-KEY',
                region: 'eu-central-1',
                bucket: 'demo-bucket'
            }]);
            assert.deepEqual(apiCalls, [
                ['listObjects', { prefix: 'site/', maxKeys: 1 }],
                ['getObject', 'site/files.publii.json']
            ]);
            assert.deepEqual(deploymentCalls, [
                ['setInput'],
                ['setOutput', true],
                ['prepareLocalFilesList'],
                ['checkLocalListWithRemoteList', '[{"path":"index.html"}]']
            ]);
            assert.deepEqual(otherMessages(), [
                { type: 'web-contents', message: 'app-connection-in-progress' },
                { type: 'web-contents', message: 'app-connection-success' }
            ]);
            assert.deepEqual(progressMessages(), [6, 7, 8]);
            assert.equal(s3.waitForTimeout, false);

            runTimers();

            assert.deepEqual(kills, []);
            assert.equal(otherMessages().length, 2);
        });

        it('prepends https to the endpoint of a custom provider', async function () {
            let { s3 } = createDeployment({
                customProvider: true,
                provider: 'custom',
                endpoint: 'nyc3.digitaloceanspaces.com',
                customRegion: 'nyc3',
                prefix: ''
            });

            await s3.initConnection();

            assert.deepEqual(clients, [{
                accessKeyId: 'STORED-ID',
                secretAccessKey: 'STORED-KEY',
                endpoint: 'https://nyc3.digitaloceanspaces.com',
                region: 'nyc3',
                bucket: 'demo-bucket'
            }]);
            assert.deepEqual(apiCalls, [
                ['listObjects', { prefix: '', maxKeys: 1 }],
                ['getObject', 'files.publii.json']
            ]);
        });

        it('keeps the scheme of a custom endpoint', async function () {
            let { s3 } = createDeployment({
                customProvider: true,
                provider: 'custom',
                endpoint: 'http://localhost:9000',
                customRegion: 'us-east-1'
            });

            await s3.initConnection();

            assert.equal(clients[0].endpoint, 'http://localhost:9000');
        });

        it('starts a full upload when the remote files list does not exist yet', async function () {
            apiErrors.getObject = s3Error('NoSuchKey', 'The specified key does not exist.', 404);
            let { deploymentCalls, s3 } = createDeployment();

            await s3.initConnection();

            assert.deepEqual(deploymentCalls.slice(-1), [['compareFilesList', false]]);
            assert.deepEqual(otherMessages().map(message => message.message), ['app-connection-in-progress', 'app-connection-success']);
            assert.deepEqual(progressMessages(), [6, 7, 8]);
        });

        it('starts a full upload when the provider answers 404 without an error document', async function () {
            apiErrors.getObject = s3Error('NotFound', 'HTTP 404 (GET /site/files.publii.json)', 404);
            let { deploymentCalls, s3 } = createDeployment();

            await s3.initConnection();

            assert.deepEqual(deploymentCalls.slice(-1), [['compareFilesList', false]]);
        });

        it('reports an error of the remote files list download', async function () {
            apiErrors.getObject = s3Error('AccessDenied', 'Access <b>Denied</b>', 403);
            let { deploymentCalls, s3 } = createDeployment();

            await s3.initConnection();

            assert.deepEqual(deploymentCalls.map(call => call[0]), ['setInput', 'setOutput', 'prepareLocalFilesList']);
            assert.deepEqual(otherMessages(), [
                { type: 'web-contents', message: 'app-connection-in-progress' },
                { type: 'web-contents', message: 'app-connection-success' },
                connectionError('Access Denied')
            ]);
            assert.deepEqual(progressMessages(), [6, 7]);

            runTimers();

            assert.deepEqual(kills, ['SIGTERM']);
            assert.equal(otherMessages().length, 3);
        });

        it('reports a failed bucket listing', async function () {
            apiErrors.listObjects = s3Error('InvalidAccessKeyId', 'The AWS Access Key Id you provided does not exist in our records.', 403);
            let { deploymentCalls, s3 } = createDeployment();

            await s3.initConnection();

            assert.deepEqual(deploymentCalls, []);
            assert.deepEqual(apiCalls, [['listObjects', { prefix: 'site/', maxKeys: 1 }]]);
            assert.deepEqual(otherMessages(), [
                { type: 'web-contents', message: 'app-connection-in-progress' },
                connectionError('The AWS Access Key Id you provided does not exist in our records.')
            ]);

            // The watchdog must not report the error a second time
            runTimers();

            assert.deepEqual(kills, ['SIGTERM']);
            assert.equal(otherMessages().length, 2);
        });

        it('reports an invalid endpoint', async function () {
            constructorError = s3Error('InvalidEndpoint', 'Invalid S3 endpoint: ftp://storage');
            let { s3 } = createDeployment({ customProvider: true, provider: 'custom', endpoint: 'ftp://storage' });

            await s3.initConnection();

            assert.deepEqual(apiCalls, []);
            assert.deepEqual(otherMessages().map(message => message.message), ['app-connection-in-progress', 'app-connection-error']);
        });
    });

    describe('sync', function () {
        it('removes the old files, uploads the new ones and finishes with the files list', async function () {
            let { deployment, s3 } = connectedDeployment();

            await s3.removeFile();
            await settle();

            assert.deepEqual(apiCalls, [
                ['deleteObject', 'site/old.html'],
                ['putObject', 'site/css/style.css', 'body{}', { acl: 'public-read', cacheControl: 'public, max-age=2592000', contentType: 'text/css' }],
                ['putObject', 'site/index.html', '<html></html>', { acl: 'public-read', cacheControl: 'no-cache, no-store', contentType: 'text/html' }],
                ['putObject', 'site/files.publii.json', '[{"path":"index.html"},{"path":"css/style.css"}]', { acl: 'public-read', contentType: 'application/json' }]
            ]);
            assert.deepEqual(otherMessages(), [{ type: 'sender', message: 'app-deploy-uploaded', value: { status: true, issues: false } }]);
            assert.deepEqual(progressMessages(), [30, 8, 30, 53, 98, 99, 100]);
            assert.equal(deployment.currentOperationNumber, 3);
            assert.equal(timers.length, 1);

            runTimers();

            assert.deepEqual(kills, ['SIGTERM']);
        });

        it('uses the configured ACL and cache control values and the keys without a prefix', async function () {
            let { s3 } = connectedDeployment({
                prefix: '',
                acl: 'private',
                htmlCacheControl: 'max-age=0',
                otherCacheControl: 'max-age=60'
            });

            await s3.removeFile();
            await settle();

            assert.deepEqual(apiCalls, [
                ['deleteObject', 'old.html'],
                ['putObject', 'css/style.css', 'body{}', { acl: 'private', cacheControl: 'max-age=60', contentType: 'text/css' }],
                ['putObject', 'index.html', '<html></html>', { acl: 'private', cacheControl: 'max-age=0', contentType: 'text/html' }],
                ['putObject', 'files.publii.json', '[{"path":"index.html"},{"path":"css/style.css"}]', { acl: 'private', contentType: 'application/json' }]
            ]);
        });

        it('skips the files which no longer exist in the bucket', async function () {
            apiErrors['deleteObject:site/old.html'] = s3Error('NoSuchKey', 'The specified key does not exist.', 404);
            let { deployment, s3 } = connectedDeployment();

            await s3.removeFile();
            await settle();

            assert.deepEqual(apiCalls.map(call => call[0]), ['deleteObject', 'putObject', 'putObject', 'putObject']);
            assert.deepEqual(otherMessages(), [{ type: 'sender', message: 'app-deploy-uploaded', value: { status: true, issues: false } }]);
            assert.equal(deployment.currentOperationNumber, 3);
        });

        it('reports a file which cannot be removed', async function () {
            apiErrors['deleteObject:site/old.html'] = s3Error('AccessDenied', 'Access Denied', 403);
            let { s3 } = connectedDeployment();

            await s3.removeFile();
            await settle();

            assert.deepEqual(apiCalls, [['deleteObject', 'site/old.html']]);
            assert.deepEqual(otherMessages(), [connectionError('Access Denied')]);

            runTimers();

            assert.deepEqual(kills, ['SIGTERM']);
        });

        it('reports a failed upload of the files list', async function () {
            apiErrors['putObject:site/files.publii.json'] = s3Error('AccessDenied', 'Access Denied', 403);
            let { s3 } = connectedDeployment();

            await s3.removeFile();
            await settle();

            assert.deepEqual(apiCalls.slice(-1)[0].slice(0, 2), ['putObject', 'site/files.publii.json']);
            assert.deepEqual(otherMessages(), [connectionError('Access Denied')]);
            assert.deepEqual(progressMessages().slice(-1), [99]);

            runTimers();

            assert.deepEqual(kills, ['SIGTERM']);
        });

        it('reports a local file which cannot be read', async function () {
            delete localFiles['/sites/demo/output/files.publii.json'];
            let { s3 } = connectedDeployment();

            await s3.removeFile();
            await settle();

            assert.deepEqual(otherMessages(), [connectionError('ENOENT: no such file or directory, open \'/sites/demo/output/files.publii.json\'')]);

            runTimers();

            assert.deepEqual(kills, ['SIGTERM']);
        });

        it('retries a failed upload five times and reports the issue', async function () {
            apiErrors['putObject:site/index.html'] = s3Error('InternalError', 'We encountered an internal error.', 500);
            let { deployment, s3 } = connectedDeployment();

            await s3.removeFile();
            await settle();

            for (let i = 0; i < 6; i++) {
                assert.equal(timers.length, 1);
                runTimers();
                await settle();
            }

            assert.equal(apiCalls.filter(call => call[1] === 'site/index.html').length, 6);
            assert.deepEqual(apiCalls.slice(-1)[0].slice(0, 2), ['putObject', 'site/files.publii.json']);
            assert.deepEqual(plain(s3.hardUploadErrors), ['index.html']);
            assert.deepEqual(otherMessages(), [{ type: 'sender', message: 'app-deploy-uploaded', value: { status: true, issues: true } }]);
            assert.equal(deployment.currentOperationNumber, 3);
            assert.equal(timers.length, 1);
        });

        it('continues after a retried upload succeeds', async function () {
            apiErrors['putObject:site/index.html'] = s3Error('InternalError', 'We encountered an internal error.', 500);
            let { s3 } = connectedDeployment();

            await s3.removeFile();
            await settle();
            delete apiErrors['putObject:site/index.html'];
            runTimers();
            await settle();

            assert.equal(apiCalls.filter(call => call[1] === 'site/index.html').length, 2);
            assert.deepEqual(plain(s3.hardUploadErrors), []);
            assert.deepEqual(otherMessages(), [{ type: 'sender', message: 'app-deploy-uploaded', value: { status: true, issues: false } }]);
        });
    });
});
