const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

describe('GitLab Pages deployment', function () {
    let GitlabPages;
    let timers;
    let messages;
    let apiCalls;
    let apiDelays;
    let apiErrors;
    let projects;
    let projectRequests;
    let branch;
    let branchRequests;
    let remoteFilesContent;
    let fileRequests;
    let commitRequests;
    let testReplies;

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

    function httpError (status, message) {
        return Object.assign(new Error(message), { name: 'GitlabApiError', status: status });
    }

    // Resolves with the first reply, so a rejection which never reaches the UI ends with a test timeout
    function testConnection (deployment, gitlabConfig = {}) {
        return new Promise(resolve => {
            deployment.testConnection({}, {
                rejectUnauthorized: true,
                gitlab: Object.assign({
                    server: 'https://gitlab.com',
                    token: 'token',
                    repo: 'demo',
                    branch: 'main'
                }, gitlabConfig)
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

    function testError (translation) {
        return {
            channel: 'app-deploy-test-error',
            payload: { message: { translation: translation } }
        };
    }

    function createDeployment (repository) {
        let deploymentCalls = [];
        let deployment = new GitlabPages({
            inputDir: '/input',
            siteConfig: {
                name: 'demo',
                uuid: 'uuid-1',
                deployment: {
                    rejectUnauthorized: true,
                    gitlab: {
                        server: 'https://gitlab.com',
                        token: 'token',
                        repo: repository,
                        branch: 'main'
                    }
                }
            },
            checkLocalListWithRemoteList (content) {
                deploymentCalls.push({ method: 'checkLocalListWithRemoteList', content: content });
            },
            compareFilesList (remoteFileListExists) {
                deploymentCalls.push({ method: 'compareFilesList', remoteFileListExists: remoteFileListExists });
            }
        });

        deployment.client = gitlabClient();
        deployment.repository = deployment.normalizeRepository(repository);
        deployment.branch = 'main';

        return { deployment, deploymentCalls };
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

    function flushPromises () {
        return new Promise(resolve => setImmediate(resolve));
    }

    // Values created inside the vm context have prototypes from another realm, which strict deepEqual rejects
    function plain (value) {
        return JSON.parse(JSON.stringify(value));
    }

    function runTimers () {
        timers.splice(0).forEach(callback => callback());
    }

    let gitlabClient;

    beforeEach(function () {
        timers = [];
        messages = [];
        apiCalls = [];
        apiDelays = {};
        apiErrors = {};
        projects = [{ id: 1, name: 'demo', path: 'demo' }];
        projectRequests = [];
        branch = { name: 'main' };
        branchRequests = [];
        remoteFilesContent = '[{"path":"index.html"}]';
        fileRequests = [];
        commitRequests = [];
        testReplies = [];

        const client = {
            Projects: {
                all (options) {
                    apiCalls.push('searchProjects');
                    return apiResponse('searchProjects', options.search ? projects : []);
                },
                show (projectPath) {
                    apiCalls.push('showProject');
                    projectRequests.push(projectPath);
                    return apiResponse('showProject', projects[0]);
                }
            },
            Branches: {
                show (projectId) {
                    apiCalls.push('showBranch');
                    branchRequests.push(projectId);
                    return apiResponse('showBranch', branch);
                }
            },
            RepositoryFiles: {
                showRaw (projectId, filePath, ref) {
                    apiCalls.push('showRaw');
                    fileRequests.push({ projectId: projectId, filePath: filePath, ref: ref });
                    return apiResponse('showRaw', remoteFilesContent);
                }
            },
            Commits: {
                create (projectId, branchName, message, actions) {
                    apiCalls.push('createCommit');
                    commitRequests.push({ projectId: projectId, branch: branchName, message: message, actions: actions });
                    return apiResponse('createCommit', { id: 'commit-sha' });
                }
            }
        };

        gitlabClient = () => client;

        const context = {
            module: { exports: {} },
            console: { log () {}, warn () {} },
            setTimeout (callback) {
                timers.push(callback);
            },
            process: {
                send (message) {
                    messages.push(JSON.parse(JSON.stringify(message)));
                },
                kill () {}
            },
            require (name) {
                if (name === 'path') {
                    return path;
                }

                if (name === './gitlab-api-client.js') {
                    return function () { return client; };
                }

                if (name === './../../helpers/slug' || name === 'striptags') {
                    return value => value;
                }

                return {};
            }
        };

        vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../gitlab-pages.js'), 'utf8'), context);
        GitlabPages = context.module.exports;
    });

    describe('connection test', function () {
        it('confirms a connection to an existing branch', async function () {
            let reply = await testConnection(new GitlabPages());
            runTimers();

            assert.deepEqual(reply, { channel: 'app-deploy-test-success', payload: undefined });
            assert.deepEqual(apiCalls, ['searchProjects', 'showBranch']);
            assert.deepEqual(branchRequests, [1]);
            assert.equal(testReplies.length, 1);
        });

        it('reports invalid credentials', async function () {
            apiErrors.searchProjects = httpError(401, '401 Unauthorized');

            let reply = await testConnection(new GitlabPages());

            assert.deepEqual(reply, testError('core.server.tokenOrServerAddressInvalid'));
            assert.deepEqual(apiCalls, ['searchProjects']);
        });

        it('reports an invalid server address on a network error', async function () {
            apiErrors.searchProjects = httpError(0, 'Network error (GET /projects): getaddrinfo ENOTFOUND gitlab.example.com');

            let reply = await testConnection(new GitlabPages());

            assert.deepEqual(reply, testError('core.server.tokenOrServerAddressInvalid'));
        });

        it('reports an invalid server address on a server error', async function () {
            apiErrors.showProject = httpError(502, 'HTTP 502 (GET /projects/group%2Fdemo)');

            let reply = await testConnection(new GitlabPages(), { repo: 'group/demo' });

            assert.deepEqual(reply, testError('core.server.tokenOrServerAddressInvalid'));
        });

        it('reports insufficient token permissions when the project request is forbidden', async function () {
            apiErrors.showProject = httpError(403, '403 Forbidden');

            let reply = await testConnection(new GitlabPages(), { repo: 'group/demo' });

            assert.deepEqual(reply, testError('core.server.tokenPermissionsInsufficient'));
            assert.deepEqual(apiCalls, ['showProject']);
        });

        it('reports insufficient token permissions when the project search is forbidden', async function () {
            apiErrors.searchProjects = httpError(403, '403 Forbidden');

            let reply = await testConnection(new GitlabPages());

            assert.deepEqual(reply, testError('core.server.tokenPermissionsInsufficient'));
        });

        it('reports insufficient token permissions when the branch request is forbidden', async function () {
            apiErrors.showBranch = httpError(403, '403 Forbidden');

            let reply = await testConnection(new GitlabPages());

            assert.deepEqual(reply, testError('core.server.tokenPermissionsInsufficient'));
            assert.deepEqual(apiCalls, ['searchProjects', 'showBranch']);
        });

        it('reports a repository whose name only resembles the configured one', async function () {
            projects = [{ id: 2, name: 'demo-site', path: 'demo-site' }];

            let reply = await testConnection(new GitlabPages());

            assert.deepEqual(reply, testError('core.server.repositoryDoesNotExist'));
            assert.deepEqual(apiCalls, ['searchProjects']);
        });

        it('checks the exactly matching project when the search returns similar names first', async function () {
            projects = [
                { id: 2, name: 'demo-site', path: 'demo-site' },
                { id: 3, name: 'Demo', path: 'demo-old' },
                { id: 1, name: 'demo', path: 'demo' }
            ];

            let reply = await testConnection(new GitlabPages());

            assert.deepEqual(reply, { channel: 'app-deploy-test-success', payload: undefined });
            assert.deepEqual(branchRequests, [1]);
        });

        it('matches a project by its display name when its path differs', async function () {
            projects = [{ id: 3, name: 'demo', path: 'demo-pages' }];

            let reply = await testConnection(new GitlabPages());

            assert.deepEqual(reply, { channel: 'app-deploy-test-success', payload: undefined });
            assert.deepEqual(branchRequests, [3]);
        });

        it('looks up a project stored in groups by its full path', async function () {
            projects = [{ id: 7, name: 'demo', path: 'demo', path_with_namespace: 'group/subgroup/demo' }];

            let reply = await testConnection(new GitlabPages(), { repo: 'group/subgroup/demo' });

            assert.deepEqual(reply, { channel: 'app-deploy-test-success', payload: undefined });
            assert.deepEqual(apiCalls, ['showProject', 'showBranch']);
            assert.deepEqual(projectRequests, ['group/subgroup/demo']);
            assert.deepEqual(branchRequests, [7]);
        });

        it('ignores surrounding whitespace and slashes in the project path', async function () {
            let reply = await testConnection(new GitlabPages(), { repo: ' /group/demo/ ' });

            assert.deepEqual(reply, { channel: 'app-deploy-test-success', payload: undefined });
            assert.deepEqual(projectRequests, ['group/demo']);
        });

        it('reports a project which does not exist under the given path', async function () {
            apiErrors.showProject = httpError(404, '404 Project Not Found');

            let reply = await testConnection(new GitlabPages(), { repo: 'group/missing' });

            assert.deepEqual(reply, testError('core.server.repositoryDoesNotExist'));
            assert.deepEqual(apiCalls, ['showProject']);
        });

        it('reports a missing branch', async function () {
            apiErrors.showBranch = httpError(404, '404 Branch Not Found');

            let reply = await testConnection(new GitlabPages());

            assert.deepEqual(reply, testError('core.server.branchDoesNotExist'));
            assert.deepEqual(apiCalls, ['searchProjects', 'showBranch']);
        });

        it('reports a timeout when the branch request does not respond in time', async function () {
            apiDelays.showBranch = new Promise(() => {});

            let reply = testConnection(new GitlabPages());
            runTimers();

            assert.deepEqual(await reply, testError('core.server.requestTimeout'));
            assert.equal(testReplies.length, 1);
        });

        it('ignores a reply which arrives after the timeout', async function () {
            let respond;
            apiDelays.showBranch = new Promise(resolve => {
                respond = resolve;
            });

            let reply = testConnection(new GitlabPages());
            runTimers();
            respond();
            await reply;
            await flushPromises();

            assert.deepEqual(testReplies.map(item => item.channel), ['app-deploy-test-error']);
        });
    });

    describe('remote files list', function () {
        it('downloads the files list of a project stored in groups', async function () {
            projects = [{ id: 7, name: 'demo', path: 'demo' }];
            let { deployment, deploymentCalls } = createDeployment('group/subgroup/demo');

            deployment.downloadFilesList();
            await flushPromises();

            assert.deepEqual(apiCalls, ['showProject', 'showRaw']);
            assert.equal(deployment.projectID, 7);
            assert.deepEqual(fileRequests, [{ projectId: 7, filePath: 'publii-files.json', ref: 'main' }]);
            assert.deepEqual(plain(deployment.remoteFilesList), [{ path: 'index.html' }]);
            assert.deepEqual(deploymentCalls, [{ method: 'checkLocalListWithRemoteList', content: '[{"path":"index.html"}]' }]);
            assert.deepEqual(messages, []);
        });

        it('downloads the files list of a project found by its name', async function () {
            let { deployment, deploymentCalls } = createDeployment('demo');

            deployment.downloadFilesList();
            await flushPromises();

            assert.deepEqual(apiCalls, ['searchProjects', 'showRaw']);
            assert.equal(deployment.projectID, 1);
            assert.equal(deploymentCalls[0].method, 'checkLocalListWithRemoteList');
        });

        it('starts a full upload when the remote files list does not exist yet', async function () {
            apiErrors.showRaw = httpError(404, '404 File Not Found');
            let { deployment, deploymentCalls } = createDeployment('demo');

            deployment.downloadFilesList();
            await flushPromises();

            assert.deepEqual(plain(deployment.remoteFilesList), []);
            assert.deepEqual(deploymentCalls, [{ method: 'compareFilesList', remoteFileListExists: false }]);
            assert.deepEqual(messages, []);
        });

        it('reports a missing project before downloading the files list', async function () {
            projects = [{ id: 2, name: 'demo-site', path: 'demo-site' }];
            let { deployment, deploymentCalls } = createDeployment('demo');

            deployment.downloadFilesList();
            await flushPromises();

            assert.deepEqual(apiCalls, ['searchProjects']);
            assert.deepEqual(deploymentCalls, []);
            assert.deepEqual(messages, [connectionError({ translation: 'core.server.repositoryDoesNotExist' })]);
        });

        it('reports the API error message when the project cannot be looked up', async function () {
            apiErrors.showProject = httpError(401, '401 Unauthorized');
            let { deployment, deploymentCalls } = createDeployment('group/demo');

            deployment.downloadFilesList();
            await flushPromises();

            assert.deepEqual(deploymentCalls, []);
            assert.deepEqual(messages, [connectionError('401 Unauthorized')]);
        });

        it('reports insufficient token permissions when the project request is forbidden', async function () {
            apiErrors.showProject = httpError(403, '403 Forbidden');
            let { deployment } = createDeployment('group/demo');

            deployment.downloadFilesList();
            await flushPromises();

            assert.deepEqual(messages, [connectionError({ translation: 'core.server.tokenPermissionsInsufficient' })]);
        });
    });

    describe('commits', function () {
        it('creates a commit on the configured branch and continues with the next step', async function () {
            let { deployment } = createDeployment('group/demo');
            let operations = [{ action: 'delete', file_path: 'public/old.html' }];
            let nextSteps = 0;
            deployment.projectID = 7;

            deployment.makeCommit(operations, () => nextSteps++, '[skip ci] Publii - remove files');
            await flushPromises();

            assert.deepEqual(commitRequests, [{
                projectId: 7,
                branch: 'main',
                message: '[skip ci] Publii - remove files',
                actions: operations
            }]);
            assert.equal(nextSteps, 1);
            assert.deepEqual(messages, []);
        });

        it('reports insufficient token permissions when the commit is forbidden', async function () {
            apiErrors.createCommit = httpError(403, '403 Forbidden');
            let { deployment } = createDeployment('group/demo');
            let nextSteps = 0;
            deployment.projectID = 7;

            deployment.makeCommit([], () => nextSteps++, 'Publii - deployment');
            await flushPromises();

            assert.equal(nextSteps, 0);
            assert.deepEqual(messages, [connectionError({ translation: 'core.server.tokenPermissionsInsufficient' })]);
        });

        it('reports the API error message when the commit fails for another reason', async function () {
            apiErrors.createCommit = httpError(400, '{"base":["A file with this name already exists"]}');
            let { deployment } = createDeployment('group/demo');
            deployment.projectID = 7;

            deployment.makeCommit([], () => {}, 'Publii - deployment');
            await flushPromises();

            assert.deepEqual(messages, [connectionError('{"base":["A file with this name already exists"]}')]);
        });
    });
});
