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
    let pendingCountFiles;
    let apiErrors;
    let repositoryError;
    let octokitClient;

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
                    resolve({
                        channel: channel,
                        payload: payload === undefined ? payload : JSON.parse(JSON.stringify(payload))
                    });
                }
            });
        });
    }

    function sentMessages () {
        return messages.map(message => message.message);
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
        pendingCountFiles = null;
        apiErrors = {};
        repositoryError = null;
        octokitClient = {
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
                    return { writeFileSync () {} };
                }

                if (name === './../../helpers/file.js') {
                    return { readFileSync: () => 'Y29udGVudA==' };
                }

                if (name === '@octokit/rest') {
                    return { Octokit: function () { return octokitClient; } };
                }

                if (name === 'count-files') {
                    return function (dir, callback) {
                        pendingCountFiles = callback(null, { files: 1, dirs: 0 });
                    };
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
        await pendingCountFiles;

        assert.equal(deployed, false);
        assert.equal(messages[messages.length - 1].value.additionalMessage.translation, 'core.server.requestLimitExceededInfo');
    });

    describe('connection test', function () {
        it('confirms a connection to an existing branch', async function () {
            let reply = await testConnection(createDeployment());

            assert.deepEqual(reply, { channel: 'app-deploy-test-success', payload: undefined });
            assert.deepEqual(apiCalls, ['getRef']);
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
