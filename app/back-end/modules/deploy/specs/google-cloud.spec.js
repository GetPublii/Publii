const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const normalizePath = require('normalize-path');

describe('Google Cloud deployment', function () {
    const KEY_FILE = '/keys/demo.json';
    const PRIVATE_KEY = '-----BEGIN PRIVATE KEY-----\nFAKE\n-----END PRIVATE KEY-----\n';
    const CLIENT_EMAIL = 'publii@demo-project.iam.gserviceaccount.com';
    const WEBSITE_CONFIGURATION = { website: { mainPageSuffix: 'index.html', notFoundPage: '404.html' } };

    let GoogleCloud;
    let FakeGcsApiClient;
    let timers;
    let messages;
    let kills;
    let clients;
    let apiCalls;
    let apiErrors;
    let apiDelays;
    let remoteFilesContent;
    let localFiles;
    let keyFiles;
    let closeCalls;
    let testReplies;
    let constructorError;

    function gcsError (code, message, status = 400) {
        return Object.assign(new Error(message), { name: 'GcsApiError', code: code, status: status });
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

    function siteConfig (googleOverrides = {}) {
        return {
            name: 'Demo Site',
            uuid: 'uuid-1',
            deployment: {
                protocol: 'google-cloud',
                google: Object.assign({
                    key: KEY_FILE,
                    bucket: 'demo-bucket',
                    prefix: 'site'
                }, googleOverrides)
            }
        };
    }

    function createDeployment (googleOverrides = {}) {
        let deploymentCalls = [];
        let deployment = {
            inputDir: '/sites/demo/output',
            configDir: '/sites/demo/input/config',
            siteConfig: siteConfig(googleOverrides),
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
            },
            uploadFile () {
                deploymentCalls.push(['uploadFile']);
            },
            removeFile () {
                deploymentCalls.push(['removeFile']);
            }
        };

        return { deployment, deploymentCalls, googleCloud: new GoogleCloud(deployment) };
    }

    function testConnection (googleCloud, googleOverrides = {}) {
        return googleCloud.testConnection({}, siteConfig(googleOverrides).deployment, 'Demo Site', 'uuid-1', {
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

    function expectedClient () {
        return {
            clientEmail: CLIENT_EMAIL,
            privateKey: PRIVATE_KEY,
            bucket: 'demo-bucket'
        };
    }

    // A deployment which already passed the connection stage
    function connectedDeployment (googleOverrides = {}) {
        let created = createDeployment(googleOverrides);
        created.googleCloud.connection = new FakeGcsApiClient({});
        created.googleCloud.prefix = created.deployment.siteConfig.deployment.google.prefix;
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
            '/sites/demo/output/fonts/font.woff2': 'wOF2',
            '/sites/demo/output/files.publii.json': '[{"path":"index.html"},{"path":"css/style.css"}]'
        };
        keyFiles = {
            [KEY_FILE]: JSON.stringify({
                type: 'service_account',
                project_id: 'demo-project',
                private_key: PRIVATE_KEY,
                client_email: CLIENT_EMAIL
            }),
            '/keys/broken.json': '{"type": "service_account"',
            '/keys/incomplete.json': '{"type": "service_account"}'
        };
        closeCalls = 0;
        testReplies = [];
        constructorError = null;

        FakeGcsApiClient = class {
            constructor (options) {
                clients.push(JSON.parse(JSON.stringify(options)));

                if (constructorError) {
                    throw constructorError;
                }
            }

            listObjects (options) {
                apiCalls.push(['listObjects', plain(options)]);
                return apiResponse('listObjects', { kind: 'storage#objects' });
            }

            patchBucket (metadata) {
                apiCalls.push(['patchBucket', plain(metadata)]);
                return apiResponse('patchBucket', { name: 'demo-bucket' });
            }

            getObject (name) {
                apiCalls.push(['getObject', name]);
                return apiResponse('getObject', Buffer.from(remoteFilesContent));
            }

            uploadObject (name, body, options) {
                apiCalls.push(['uploadObject', name, body.toString(), plain(options)]);
                return apiResponse('uploadObject:' + name, { name: name });
            }

            deleteObject (name) {
                apiCalls.push(['deleteObject', name]);
                return apiResponse('deleteObject:' + name, { status: 204 });
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

                if (name === 'normalize-path') {
                    return normalizePath;
                }

                if (name === 'fs-extra') {
                    return {
                        existsSync (filePath) {
                            return keyFiles[filePath] !== undefined;
                        },
                        readFileSync (filePath) {
                            if (keyFiles[filePath] === undefined) {
                                throw new Error(`ENOENT: no such file or directory, open '${filePath}'`);
                            }

                            return keyFiles[filePath];
                        },
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

                if (name === './gcs-api-client.js') {
                    return FakeGcsApiClient;
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

        vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../google-cloud.js'), 'utf8'), context);
        GoogleCloud = context.module.exports;
    });

    describe('connection test', function () {
        it('confirms the connection using the credentials from the key file', async function () {
            await testConnection(new GoogleCloud());
            await settle();

            assert.deepEqual(testReplies, [{ channel: 'app-deploy-test-success', payload: undefined }]);
            assert.deepEqual(clients, [expectedClient()]);
            assert.deepEqual(apiCalls, [['listObjects', { prefix: 'site', maxResults: 1 }]]);
            assert.equal(closeCalls, 1);

            runTimers();

            assert.equal(testReplies.length, 1);
        });

        it('lists the whole bucket when there is no prefix', async function () {
            await testConnection(new GoogleCloud(), { prefix: '' });
            await settle();

            assert.deepEqual(testReplies, [{ channel: 'app-deploy-test-success', payload: undefined }]);
            assert.deepEqual(apiCalls, [['listObjects', { prefix: '', maxResults: 1 }]]);
        });

        it('reports a missing key file', async function () {
            await testConnection(new GoogleCloud(), { key: '/keys/missing.json' });
            await settle();

            assert.deepEqual(testReplies, [{
                channel: 'app-deploy-test-error',
                payload: { message: 'The service account key file does not exist: /keys/missing.json' }
            }]);
            assert.deepEqual(clients, []);
            assert.deepEqual(apiCalls, []);
        });

        it('reports an empty key file path', async function () {
            await testConnection(new GoogleCloud(), { key: '' });
            await settle();

            assert.deepEqual(testReplies, [{
                channel: 'app-deploy-test-error',
                payload: { message: 'The service account key file does not exist: ' }
            }]);
            assert.deepEqual(clients, []);
        });

        it('reports a key file which is not valid JSON', async function () {
            await testConnection(new GoogleCloud(), { key: '/keys/broken.json' });
            await settle();

            assert.deepEqual(testReplies, [{
                channel: 'app-deploy-test-error',
                payload: { message: 'The service account key file is not a valid JSON file: /keys/broken.json' }
            }]);
            assert.deepEqual(clients, []);
        });

        it('reports a key file without the credentials', async function () {
            constructorError = gcsError('InvalidCredentials', 'The service account key file must contain the client_email and private_key fields.');

            await testConnection(new GoogleCloud(), { key: '/keys/incomplete.json' });
            await settle();

            assert.deepEqual(testReplies, [{
                channel: 'app-deploy-test-error',
                payload: { message: 'The service account key file must contain the client_email and private_key fields.' }
            }]);
            assert.deepEqual(clients, [{ bucket: 'demo-bucket' }]);
            assert.deepEqual(apiCalls, []);
        });

        it('reports the error message of a failed listing without HTML tags', async function () {
            apiErrors.listObjects = gcsError('forbidden', 'publii@demo-project.iam.gserviceaccount.com does not have <b>storage.objects.list</b> access to the bucket.', 403);

            await testConnection(new GoogleCloud());
            await settle();

            assert.deepEqual(testReplies, [{
                channel: 'app-deploy-test-error',
                payload: { message: 'publii@demo-project.iam.gserviceaccount.com does not have storage.objects.list access to the bucket.' }
            }]);
            assert.equal(closeCalls, 1);
        });

        it('reports a timeout when the bucket listing does not respond in time', async function () {
            apiDelays.listObjects = new Promise(() => {});

            await testConnection(new GoogleCloud());
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

            await testConnection(new GoogleCloud());
            runTimers();
            respond();
            await settle();

            assert.deepEqual(testReplies.map(reply => reply.channel), ['app-deploy-test-error']);
            assert.equal(closeCalls, 1);
        });
    });

    describe('connection', function () {
        it('verifies the bucket, sets the website configuration and downloads the remote files list', async function () {
            let { deploymentCalls, googleCloud } = createDeployment();

            await googleCloud.initConnection();

            assert.deepEqual(clients, [expectedClient()]);
            assert.deepEqual(apiCalls, [
                ['listObjects', { prefix: 'site', maxResults: 1 }],
                ['patchBucket', WEBSITE_CONFIGURATION],
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

            // The connection stage is over - the timeout does nothing
            runTimers();

            assert.deepEqual(otherMessages().length, 2);
            assert.deepEqual(kills, []);
        });

        it('downloads the remote files list from the bucket root when there is no prefix', async function () {
            let { googleCloud } = createDeployment({ prefix: '' });

            await googleCloud.initConnection();

            assert.deepEqual(apiCalls[0], ['listObjects', { prefix: '', maxResults: 1 }]);
            assert.deepEqual(apiCalls[2], ['getObject', 'files.publii.json']);
        });

        it('continues without the remote files list when it does not exist', async function () {
            apiErrors.getObject = gcsError('notFound', 'No such object: demo-bucket/site/files.publii.json', 404);
            let { deploymentCalls, googleCloud } = createDeployment();

            await googleCloud.initConnection();

            assert.deepEqual(deploymentCalls, [
                ['setInput'],
                ['setOutput', true],
                ['prepareLocalFilesList'],
                ['compareFilesList', false]
            ]);
            assert.deepEqual(otherMessages(), [
                { type: 'web-contents', message: 'app-connection-in-progress' },
                { type: 'web-contents', message: 'app-connection-success' }
            ]);
            assert.deepEqual(progressMessages(), [6, 7, 8]);
        });

        it('continues when the website configuration cannot be changed', async function () {
            apiErrors.patchBucket = gcsError('forbidden', 'publii@demo-project.iam.gserviceaccount.com does not have storage.buckets.update access to the bucket.', 403);
            let { deploymentCalls, googleCloud } = createDeployment();

            await googleCloud.initConnection();

            assert.deepEqual(apiCalls.map(call => call[0]), ['listObjects', 'patchBucket', 'getObject']);
            assert.deepEqual(deploymentCalls[3], ['checkLocalListWithRemoteList', '[{"path":"index.html"}]']);
            assert.deepEqual(otherMessages(), [
                { type: 'web-contents', message: 'app-connection-in-progress' },
                { type: 'web-contents', message: 'app-connection-success' }
            ]);
        });

        it('reports a failed download of the remote files list', async function () {
            apiErrors.getObject = gcsError('forbidden', 'Access denied.', 403);
            let { deploymentCalls, googleCloud } = createDeployment();

            await googleCloud.initConnection();

            assert.deepEqual(deploymentCalls, [
                ['setInput'],
                ['setOutput', true],
                ['prepareLocalFilesList']
            ]);
            assert.deepEqual(otherMessages(), [
                { type: 'web-contents', message: 'app-connection-in-progress' },
                { type: 'web-contents', message: 'app-connection-success' },
                connectionError('Access denied.')
            ]);

            runTimers();

            assert.deepEqual(kills, ['SIGTERM']);
        });

        it('reports a missing key file', async function () {
            let { deploymentCalls, googleCloud } = createDeployment({ key: '/keys/missing.json' });

            await googleCloud.initConnection();

            assert.deepEqual(clients, []);
            assert.deepEqual(apiCalls, []);
            assert.deepEqual(deploymentCalls, []);
            assert.deepEqual(otherMessages(), [
                { type: 'web-contents', message: 'app-connection-in-progress' },
                connectionError('The service account key file does not exist: /keys/missing.json')
            ]);
            assert.deepEqual(progressMessages(), [6]);

            runTimers();

            assert.deepEqual(kills, ['SIGTERM']);
            assert.equal(otherMessages().length, 2);
        });

        it('reports a bucket which cannot be listed', async function () {
            apiErrors.listObjects = gcsError('notFound', 'The specified bucket does not exist.', 404);
            let { deploymentCalls, googleCloud } = createDeployment();

            await googleCloud.initConnection();

            assert.deepEqual(apiCalls, [['listObjects', { prefix: 'site', maxResults: 1 }]]);
            assert.deepEqual(deploymentCalls, []);
            assert.deepEqual(otherMessages(), [
                { type: 'web-contents', message: 'app-connection-in-progress' },
                connectionError('The specified bucket does not exist.')
            ]);

            runTimers();

            assert.deepEqual(kills, ['SIGTERM']);
        });

        it('reports a timeout when the bucket does not respond', async function () {
            apiDelays.listObjects = new Promise(() => {});
            let { googleCloud } = createDeployment();

            googleCloud.initConnection();
            await settle();

            assert.deepEqual(otherMessages(), [{ type: 'web-contents', message: 'app-connection-in-progress' }]);

            runTimers();

            assert.deepEqual(otherMessages(), [
                { type: 'web-contents', message: 'app-connection-in-progress' },
                { type: 'web-contents', message: 'app-connection-error' }
            ]);

            runTimers();

            assert.deepEqual(kills, ['SIGTERM']);
        });
    });

    describe('uploading', function () {
        it('uploads the file with the public ACL and its content type', async function () {
            let { deployment, deploymentCalls, googleCloud } = connectedDeployment();

            googleCloud.uploadFile('/sites/demo/output/index.html', 'index.html');
            await settle();

            assert.deepEqual(apiCalls, [['uploadObject', 'site/index.html', '<html></html>', { contentType: 'text/html', predefinedAcl: 'publicRead' }]]);
            assert.equal(deployment.currentOperationNumber, 1);
            assert.equal(deployment.progressOfUploading, 22.5);
            assert.deepEqual(progressMessages(), [30]);
            assert.deepEqual(messages[0].value.operations, [1, 4]);
            assert.deepEqual(deploymentCalls, [['uploadFile']]);
            assert.deepEqual(plain(googleCloud.hardUploadErrors), []);
        });

        it('puts the prefix in front of the object name and drops the leading slash', async function () {
            let { googleCloud } = connectedDeployment({ prefix: '/site/' });

            googleCloud.uploadFile('/sites/demo/output/css/style.css', '/css/style.css');
            await settle();

            assert.equal(apiCalls[0][1], 'site/css/style.css');
        });

        it('uploads to the bucket root when there is no prefix', async function () {
            let { googleCloud } = connectedDeployment({ prefix: '' });

            googleCloud.uploadFile('/sites/demo/output/css/style.css', '/css/style.css');
            await settle();

            assert.equal(apiCalls[0][1], 'css/style.css');
        });

        it('uses the generic content type for an unknown file type', async function () {
            let { googleCloud } = connectedDeployment();

            googleCloud.uploadFile('/sites/demo/output/fonts/font.woff2', 'fonts/font.woff2');
            await settle();

            assert.deepEqual(apiCalls, [['uploadObject', 'site/fonts/font.woff2', 'wOF2', { contentType: 'application/octet-stream', predefinedAcl: 'publicRead' }]]);
        });

        it('retries a failed upload five times before counting it as a hard error', async function () {
            apiErrors['uploadObject:site/index.html'] = gcsError('backendError', 'Backend Error', 503);
            let { deployment, deploymentCalls, googleCloud } = connectedDeployment();

            googleCloud.uploadFile('/sites/demo/output/index.html', 'index.html');
            await settle();

            assert.equal(apiCalls.length, 1);
            assert.deepEqual(deploymentCalls, []);

            for (let i = 0; i < 6; i++) {
                runTimers();
                await settle();
            }

            assert.equal(apiCalls.length, 6);
            assert.deepEqual(plain(googleCloud.hardUploadErrors), ['/sites/demo/output/index.html']);
            assert.deepEqual(plain(googleCloud.softUploadErrors), { '/sites/demo/output/index.html': 6 });
            assert.equal(deployment.currentOperationNumber, 1);
            assert.deepEqual(progressMessages(), [30]);
            assert.deepEqual(otherMessages(), []);
            assert.deepEqual(deploymentCalls, [['uploadFile']]);
            assert.deepEqual(kills, []);
        });

        it('recovers when a retried upload succeeds', async function () {
            apiErrors['uploadObject:site/index.html'] = gcsError('backendError', 'Backend Error', 503);
            let { deployment, deploymentCalls, googleCloud } = connectedDeployment();

            googleCloud.uploadFile('/sites/demo/output/index.html', 'index.html');
            await settle();
            delete apiErrors['uploadObject:site/index.html'];
            runTimers();
            await settle();

            assert.equal(apiCalls.length, 2);
            assert.deepEqual(plain(googleCloud.hardUploadErrors), []);
            assert.equal(deployment.currentOperationNumber, 1);
            assert.deepEqual(progressMessages(), [30]);
            assert.deepEqual(deploymentCalls, [['uploadFile']]);
        });

        it('reports a local file which cannot be read', async function () {
            let { deploymentCalls, googleCloud } = connectedDeployment();

            googleCloud.uploadFile('/sites/demo/output/missing.html', 'missing.html');
            await settle();

            assert.deepEqual(apiCalls, []);
            assert.deepEqual(deploymentCalls, []);
            assert.deepEqual(otherMessages(), [connectionError('ENOENT: no such file or directory, open \'/sites/demo/output/missing.html\'')]);

            runTimers();

            assert.deepEqual(kills, ['SIGTERM']);
        });

        it('skips the directories', async function () {
            let { deploymentCalls, googleCloud } = connectedDeployment();

            googleCloud.uploadDirectory('/sites/demo/output/css', 'css');
            await settle();

            assert.deepEqual(apiCalls, []);
            assert.deepEqual(deploymentCalls, [['uploadFile']]);
        });
    });

    describe('removing', function () {
        it('deletes the object', async function () {
            let { deployment, deploymentCalls, googleCloud } = connectedDeployment();

            await googleCloud.removeFile('/old.html');
            await settle();

            assert.deepEqual(apiCalls, [['deleteObject', 'site/old.html']]);
            assert.equal(deployment.currentOperationNumber, 1);
            assert.equal(deployment.progressOfDeleting, 22.5);
            assert.deepEqual(progressMessages(), [30]);
            assert.deepEqual(deploymentCalls, [['removeFile']]);
        });

        it('continues when the object no longer exists', async function () {
            apiErrors['deleteObject:site/old.html'] = gcsError('notFound', 'No such object: demo-bucket/site/old.html', 404);
            let { deployment, deploymentCalls, googleCloud } = connectedDeployment();

            await googleCloud.removeFile('/old.html');
            await settle();

            assert.equal(deployment.currentOperationNumber, 1);
            assert.deepEqual(progressMessages(), [30]);
            assert.deepEqual(otherMessages(), []);
            assert.deepEqual(deploymentCalls, [['removeFile']]);
        });

        it('reports a failed deletion', async function () {
            apiErrors['deleteObject:site/old.html'] = gcsError('forbidden', 'Access denied.', 403);
            let { deploymentCalls, googleCloud } = connectedDeployment();

            await googleCloud.removeFile('/old.html');
            await settle();

            assert.deepEqual(deploymentCalls, []);
            assert.deepEqual(otherMessages(), [connectionError('Access denied.')]);

            runTimers();

            assert.deepEqual(kills, ['SIGTERM']);
        });

        it('skips the directories', async function () {
            let { deploymentCalls, googleCloud } = connectedDeployment();

            googleCloud.removeDirectory('/old-dir');
            await settle();

            assert.deepEqual(apiCalls, []);
            assert.deepEqual(deploymentCalls, [['removeFile']]);
        });
    });

    describe('finishing', function () {
        it('uploads the files list without the public ACL and ends the process', async function () {
            let { deploymentCalls, googleCloud } = connectedDeployment();

            await googleCloud.uploadNewFileList();
            await settle();

            assert.deepEqual(apiCalls, [['uploadObject', 'site/files.publii.json', '[{"path":"index.html"},{"path":"css/style.css"}]', { contentType: 'application/json' }]]);
            assert.deepEqual(progressMessages(), [99, 100]);
            assert.deepEqual(messages[0].value.operations, [0, 4]);
            assert.deepEqual(otherMessages(), [{
                type: 'sender',
                message: 'app-deploy-uploaded',
                value: { status: true, issues: false }
            }]);
            assert.deepEqual(deploymentCalls, []);
            assert.deepEqual(kills, []);

            runTimers();

            assert.deepEqual(kills, ['SIGTERM']);
        });

        it('flags the hard upload errors in the final message', async function () {
            let { googleCloud } = connectedDeployment();
            googleCloud.hardUploadErrors = ['/sites/demo/output/index.html'];

            await googleCloud.uploadNewFileList();
            await settle();

            assert.deepEqual(otherMessages(), [{
                type: 'sender',
                message: 'app-deploy-uploaded',
                value: { status: true, issues: true }
            }]);
        });

        it('reports a failed upload of the files list', async function () {
            apiErrors['uploadObject:site/files.publii.json'] = gcsError('forbidden', 'Access denied.', 403);
            let { googleCloud } = connectedDeployment();

            await googleCloud.uploadNewFileList();
            await settle();

            assert.deepEqual(progressMessages(), [99]);
            assert.deepEqual(otherMessages(), [connectionError('Access denied.')]);

            runTimers();

            assert.deepEqual(kills, ['SIGTERM']);
        });

        it('reports an error only once', async function () {
            let { googleCloud } = connectedDeployment();

            googleCloud.onError(new Error('First <b>error</b>'));
            googleCloud.onError(new Error('Second error'));
            googleCloud.onError(new Error('Silent error'), true);

            assert.deepEqual(otherMessages(), [connectionError('First error')]);

            runTimers();

            assert.deepEqual(kills, ['SIGTERM']);
        });
    });
});
