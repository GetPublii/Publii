const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

describe('GitHub Pages deployment', function () {
    const API_METHODS = {
        rest: {
            git: {
                getRef: 'getRef',
                getCommit: 'getCommit',
                getTree: 'getTree',
                createBlob: 'createBlob',
                createTree: 'createTree',
                createCommit: 'createCommit',
                updateRef: 'updateRef'
            },
            rateLimit: {
                get: 'rateLimit'
            }
        }
    };

    let GithubPages;
    let messages;
    let timers;
    let kills;
    let apiCalls;
    let remoteTree;
    let localTree;
    let rateLimitRemaining;
    let inputFiles;
    let readdirError;
    let readdirCalls;
    let apiErrors;
    let apiDelays;
    let repositoryError;
    let apiClient;
    let testReplies;

    function httpError (status, message) {
        return Object.assign(new Error(message), { name: 'HttpError', status: status });
    }

    function remoteFile (filePath, sha) {
        return { path: filePath, mode: '100644', type: 'blob', sha: sha, size: 10 };
    }

    function localFile (filePath, sha) {
        return {
            fullPath: '/input/' + filePath,
            path: filePath,
            mode: '100644',
            type: 'blob',
            size: 10,
            sha: sha,
            encoding: 'base64',
            getBlob: false
        };
    }

    function apiResponse (name, requestData) {
        switch (name) {
            case 'getRef': return { data: { object: { sha: 'commit-sha' } } };
            case 'getCommit': return { data: { tree: { sha: 'tree-sha' } } };
            case 'getTree': return { data: { tree: remoteTree } };
            case 'rateLimit': return { data: { resources: { core: { remaining: rateLimitRemaining, reset: 0 } } } };
            case 'createBlob': return { data: { sha: 'uploaded-' + requestData.filePath } };
            case 'createTree': return { data: { sha: 'new-tree-sha' } };
            case 'createCommit': return { data: { sha: 'new-commit-sha' } };
            case 'updateRef': return { data: {} };
        }
    }

    function createDeployment (apiRateLimiting = false) {
        let deployment = new GithubPages({
            appDir: '/app',
            inputDir: '/input',
            siteConfig: {
                name: 'demo',
                uuid: 'uuid-1',
                domain: 'https://demo.github.io',
                deployment: {
                    github: {
                        server: 'api.github.com',
                        token: 'token',
                        repo: 'demo',
                        user: 'publii',
                        branch: 'main',
                        parallelOperations: 1,
                        apiRateLimiting: apiRateLimiting
                    }
                }
            },
            setInput () {},
            setOutput () {}
        });

        deployment.user = 'publii';
        deployment.repository = 'demo';
        deployment.branch = 'heads/main';
        deployment.parallelOperations = 1;
        deployment.apiRateLimiting = apiRateLimiting;

        deployment.apiRequest = async function (requestData, method, extractor) {
            let name = method(API_METHODS);
            apiCalls.push(name);

            if (apiErrors[name]) {
                throw apiErrors[name];
            }

            // A pending promise simulates a slow or hanging API request
            if (apiDelays[name]) {
                await apiDelays[name];
            }

            let data = apiResponse(name, requestData);
            return extractor ? extractor(data) : data;
        };

        deployment.listFolderFiles = async function (remote) {
            return {
                localTree: localTree,
                remoteTree: remote
            };
        };

        return deployment;
    }

    // Resolves with the first reply, so a rejection which never reaches the UI ends with a test timeout
    function testConnection (deployment) {
        return new Promise(resolve => {
            deployment.testConnection({}, {
                github: {
                    token: 'token',
                    repo: 'demo',
                    user: 'publii',
                    branch: 'main'
                }
            }, 'demo', 'uuid-1', {
                send (channel, payload) {
                    let reply = {
                        channel: channel,
                        payload: payload === undefined ? payload : JSON.parse(JSON.stringify(payload))
                    };

                    testReplies.push(reply);
                    resolve(reply);
                }
            });
        });
    }

    function flushPromises () {
        return new Promise(resolve => setImmediate(resolve));
    }

    function sentMessages () {
        return messages.map(message => message.message);
    }

    function timeoutReported () {
        return messages.some(message => {
            return message.message === 'app-connection-error' &&
                   message.value &&
                   message.value.additionalMessage &&
                   message.value.additionalMessage.translation === 'core.server.requestTimeout';
        });
    }

    function runTimers () {
        timers.splice(0).forEach(callback => callback());
    }

    beforeEach(function () {
        messages = [];
        timers = [];
        kills = 0;
        apiCalls = [];
        remoteTree = [];
        localTree = [];
        rateLimitRemaining = 5000;
        inputFiles = ['index.html'];
        readdirError = null;
        readdirCalls = [];
        apiErrors = {};
        apiDelays = {};
        testReplies = [];
        repositoryError = null;
        apiClient = {
            rest: {
                repos: {
                    async get () {
                        apiCalls.push('getRepository');

                        if (repositoryError) {
                            throw repositoryError;
                        }

                        return { data: {} };
                    }
                }
            }
        };

        const context = {
            module: { exports: {} },
            console: { log () {} },
            setTimeout (callback) {
                timers.push(callback);
            },
            process: {
                pid: 1,
                send (message) {
                    // Values come from another realm, so they are compared as plain data
                    messages.push(JSON.parse(JSON.stringify(message)));
                },
                kill () {
                    kills++;
                }
            },
            require (name) {
                if (name === 'path') {
                    return path;
                }

                if (name === 'fs-extra') {
                    return {
                        writeFileSync () {},
                        readdirSync (dir, options) {
                            readdirCalls.push(JSON.parse(JSON.stringify({ dir: dir, options: options })));

                            if (readdirError) {
                                throw readdirError;
                            }

                            return inputFiles;
                        }
                    };
                }

                if (name === './../../helpers/file.js') {
                    return { readFileSync: () => 'Y29udGVudA==' };
                }

                if (name === './github-api-client.js') {
                    return function () { return apiClient; };
                }

                if (name === 'moment') {
                    return () => ({ format: () => 'reset-time' });
                }

                if (name === './../../helpers/slug' || name === 'normalize-path' || name === 'striptags') {
                    return value => value;
                }

                return {};
            }
        };

        vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../github-pages.js'), 'utf8'), context);
        GithubPages = context.module.exports;
    });

    it('finishes the sync without a commit when no files have changed', async function () {
        remoteTree = [remoteFile('index.html', 'sha-1'), remoteFile('assets/style.css', 'sha-2')];
        localTree = [localFile('index.html', 'sha-1'), localFile('assets/style.css', 'sha-2')];

        await createDeployment().deploy();
        runTimers();

        assert.deepEqual(apiCalls, ['getRef', 'getCommit', 'getTree']);
        assert.equal(sentMessages().includes('app-connection-error'), false);
        assert.deepEqual(messages[messages.length - 1], {
            type: 'sender',
            message: 'app-deploy-uploaded',
            value: {
                progress: 100,
                status: true
            }
        });
        assert.equal(kills, 1);
    });

    it('commits only the changed files', async function () {
        remoteTree = [remoteFile('index.html', 'sha-1'), remoteFile('assets/style.css', 'sha-2')];
        localTree = [localFile('index.html', 'sha-changed'), localFile('assets/style.css', 'sha-2')];
        let deployment = createDeployment();
        let createdTrees = [];
        let createTree = deployment.createTree.bind(deployment);

        deployment.createTree = function (tree, baseTreeSHA) {
            createdTrees.push(JSON.parse(JSON.stringify({ tree, baseTreeSHA })));
            return createTree(tree, baseTreeSHA);
        };

        await deployment.deploy();
        runTimers();

        assert.deepEqual(apiCalls, ['getRef', 'getCommit', 'getTree', 'createBlob', 'createTree', 'createCommit', 'updateRef']);
        assert.deepEqual(createdTrees, [{
            tree: [{
                path: 'index.html',
                mode: '100644',
                type: 'blob',
                sha: 'uploaded-/input/index.html'
            }],
            baseTreeSHA: 'tree-sha'
        }]);
        assert.equal(sentMessages().includes('app-deploy-uploaded'), true);
        assert.equal(kills, 1);
    });

    it('deploys to the configured folder and leaves files outside of it untouched', async function () {
        remoteTree = [
            remoteFile('public/index.html', 'sha-1'),
            remoteFile('public/old.html', 'sha-2'),
            remoteFile('README.md', 'sha-3'),
            remoteFile('.github/workflows/deploy.yml', 'sha-4')
        ];
        localTree = [localFile('public/index.html', 'sha-changed')];
        let deployment = createDeployment();
        deployment.folder = 'public';
        let createdTrees = [];
        let createTree = deployment.createTree.bind(deployment);

        deployment.createTree = function (tree, baseTreeSHA) {
            createdTrees.push(JSON.parse(JSON.stringify({ tree, baseTreeSHA })));
            return createTree(tree, baseTreeSHA);
        };

        await deployment.deploy();
        runTimers();

        assert.deepEqual(createdTrees, [{
            tree: [{
                path: 'public/index.html',
                mode: '100644',
                type: 'blob',
                sha: 'uploaded-/input/public/index.html'
            }, {
                path: 'public/old.html',
                mode: '100644',
                type: 'blob',
                sha: null
            }],
            baseTreeSHA: 'tree-sha'
        }]);
        assert.equal(sentMessages().includes('app-deploy-uploaded'), true);
    });

    it('normalizes the configured folder path', function () {
        let deployment = createDeployment();

        assert.equal(deployment.normalizeFolder('/public/'), 'public');
        assert.equal(deployment.normalizeFolder('docs\\site'), 'docs/site');
        assert.equal(deployment.normalizeFolder('../../etc'), 'etc');
        assert.equal(deployment.normalizeFolder('a/./b//c'), 'a/b/c');
        assert.equal(deployment.normalizeFolder(''), '');
        assert.equal(deployment.normalizeFolder(undefined), '');
        assert.equal(deployment.normalizeFolder(42), '');
    });

    it('prefixes local paths with the configured folder only', function () {
        let deployment = createDeployment();
        deployment.folder = 'public';

        assert.equal(deployment.getRemotePath('index.html'), 'public/index.html');
        assert.equal(deployment.isInsideFolder('public/index.html'), true);
        assert.equal(deployment.isInsideFolder('publicx/index.html'), false);
        assert.equal(deployment.isInsideFolder('README.md'), false);

        deployment.folder = '';

        assert.equal(deployment.getRemotePath('index.html'), 'index.html');
        assert.equal(deployment.isInsideFolder('README.md'), true);
    });

    it('leaves the repository untouched when the API rate limit is too low for the upload', async function () {
        remoteTree = [remoteFile('index.html', 'sha-1'), remoteFile('about.html', 'sha-2')];
        localTree = [localFile('index.html', 'sha-changed'), localFile('about.html', 'sha-2')];
        rateLimitRemaining = 5;

        await createDeployment(true).deploy();
        runTimers();

        assert.deepEqual(apiCalls, ['getRef', 'getCommit', 'getTree', 'rateLimit']);
        assert.equal(messages[messages.length - 1].value.additionalMessage.translation, 'core.server.requestLimitExceededInfo');
        assert.equal(sentMessages().includes('app-deploy-uploaded'), false);
        assert.equal(kills, 1);
    });

    it('stops before the deployment when the API rate limit is almost exhausted', async function () {
        let deployment = createDeployment(true);
        let deployed = false;
        rateLimitRemaining = 5;

        deployment.deploy = async function () {
            deployed = true;
        };

        await deployment.initConnection();
        runTimers();

        assert.equal(deployed, false);
        assert.equal(messages[messages.length - 1].value.additionalMessage.translation, 'core.server.requestLimitExceededInfo');
        assert.equal(timeoutReported(), false);
        assert.equal(kills, 0);
    });

    it('counts the output files recursively and deploys when the limit is not exceeded', async function () {
        let deployment = createDeployment();
        let deployed = false;
        inputFiles = new Array(4000).fill('file');

        // The first API call of the real deployment clears the connection timeout
        deployment.deploy = async function () {
            deployed = true;
            await this.getLatestSHA();
        };

        await deployment.initConnection();
        runTimers();

        assert.deepEqual(readdirCalls, [{ dir: '/input', options: { recursive: true } }]);
        assert.equal(deployed, true);
        assert.deepEqual(apiCalls, ['getRef']);
        assert.equal(sentMessages().includes('app-connection-error'), false);
        assert.equal(kills, 0);
    });

    it('stops before the deployment when the output directory has too many files', async function () {
        let deployment = createDeployment(true);
        let deployed = false;
        inputFiles = new Array(4001).fill('file');

        deployment.deploy = async function () {
            deployed = true;
        };

        await deployment.initConnection();
        runTimers();

        assert.equal(deployed, false);
        assert.deepEqual(apiCalls, []);
        assert.deepEqual(messages[messages.length - 1].value.additionalMessage, {
            translation: 'core.server.tooManyFilesInfo',
            translationVars: { numberOfFiles: 4001 }
        });
        assert.equal(timeoutReported(), false);
        assert.equal(kills, 0);
    });

    it('reports an error and stops the worker when the repository does not exist', async function () {
        let deployment = createDeployment();
        apiErrors.getRef = httpError(404, 'Not Found');

        await deployment.initConnection();
        runTimers();

        assert.deepEqual(apiCalls, ['getRef']);
        let errors = messages.filter(message => message.message === 'app-connection-error');
        assert.equal(errors.length, 1);
        assert.equal(errors[0].value.additionalMessage.indexOf('E1 ') === 0, true);
        assert.equal(errors[0].value.additionalMessage.indexOf('404') > -1, true);
        assert.equal(timeoutReported(), false);
        assert.equal(kills, 1);
    });

    it('reports a timeout and stops the worker when the connection is not established in time', async function () {
        let deployment = createDeployment();

        // Simulates a deployment whose first API request never responds
        deployment.deploy = async function () {};

        await deployment.initConnection();
        runTimers();

        assert.deepEqual(messages[messages.length - 1], {
            type: 'web-contents',
            message: 'app-connection-error',
            value: {
                additionalMessage: {
                    translation: 'core.server.requestTimeout'
                }
            }
        });
        assert.equal(kills, 0);

        // The worker is stopped by the nested timer
        runTimers();

        assert.equal(kills, 1);
        assert.equal(messages.filter(message => message.message === 'app-connection-error').length, 1);
    });

    it('reports an error when the output directory cannot be read', async function () {
        let deployment = createDeployment(true);
        let deployed = false;
        readdirError = Object.assign(new Error('ENOENT: no such file or directory, scandir \'/input\''), { code: 'ENOENT' });

        deployment.deploy = async function () {
            deployed = true;
        };

        await deployment.initConnection();
        runTimers();

        assert.equal(deployed, false);
        assert.deepEqual(apiCalls, []);
        assert.equal(messages[messages.length - 1].message, 'app-connection-error');
        assert.equal(messages[messages.length - 1].value.additionalMessage, 'E3 Error: ENOENT: no such file or directory, scandir \'/input\'');
        assert.equal(timeoutReported(), false);
        assert.equal(kills, 1);
    });

    describe('connection test', function () {
        it('confirms a connection to an existing branch', async function () {
            let reply = await testConnection(createDeployment());
            runTimers();

            assert.deepEqual(reply, { channel: 'app-deploy-test-success', payload: undefined });
            assert.deepEqual(apiCalls, ['getRef']);
            assert.equal(testReplies.length, 1);
        });

        it('reports a timeout when the branch request does not respond in time', async function () {
            apiDelays.getRef = new Promise(() => {});

            let reply = testConnection(createDeployment());
            runTimers();

            assert.deepEqual(await reply, {
                channel: 'app-deploy-test-error',
                payload: { message: { translation: 'core.server.requestTimeout' } }
            });
            assert.equal(testReplies.length, 1);
        });

        it('ignores a reply which arrives after the timeout', async function () {
            let respond;
            apiDelays.getRef = new Promise(resolve => {
                respond = resolve;
            });

            let reply = testConnection(createDeployment());
            runTimers();
            respond();
            await reply;
            await flushPromises();

            assert.deepEqual(testReplies.map(item => item.channel), ['app-deploy-test-error']);
        });

        it('reports invalid credentials', async function () {
            apiErrors.getRef = httpError(401, 'Bad credentials - https://docs.github.com/rest');

            let reply = await testConnection(createDeployment());

            assert.deepEqual(reply, {
                channel: 'app-deploy-test-error',
                payload: {
                    noAdditionalMessage: true,
                    message: { translation: 'core.server.tokenOrServerAddressInvalid' }
                }
            });
            assert.deepEqual(apiCalls, ['getRef']);
        });

        it('reports a missing branch of an existing repository', async function () {
            apiErrors.getRef = httpError(404, 'Not Found');

            let reply = await testConnection(createDeployment());

            assert.deepEqual(reply, {
                channel: 'app-deploy-test-error',
                payload: {
                    noAdditionalMessage: true,
                    message: { translation: 'core.server.branchDoesNotExist' }
                }
            });
            assert.deepEqual(apiCalls, ['getRef', 'getRepository']);
        });

        it('reports a missing repository', async function () {
            apiErrors.getRef = httpError(404, 'Not Found');
            repositoryError = httpError(404, 'Not Found');

            let reply = await testConnection(createDeployment());

            assert.deepEqual(reply, {
                channel: 'app-deploy-test-error',
                payload: {
                    noAdditionalMessage: true,
                    message: { translation: 'core.server.repositoryDoesNotExist' }
                }
            });
        });

        it('reports the API message when the repository cannot be checked', async function () {
            apiErrors.getRef = httpError(404, 'Not Found');
            repositoryError = httpError(500, 'Server Error');

            let reply = await testConnection(createDeployment());

            assert.deepEqual(reply, {
                channel: 'app-deploy-test-error',
                payload: { message: 'Not Found' }
            });
        });

        it('reports connection errors', async function () {
            apiErrors.getRef = httpError(500, 'getaddrinfo ENOTFOUND api.github.com');

            let reply = await testConnection(createDeployment());

            assert.deepEqual(reply, {
                channel: 'app-deploy-test-error',
                payload: { message: 'getaddrinfo ENOTFOUND api.github.com' }
            });
        });
    });
});
