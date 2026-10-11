const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

describe('GitLab Pages deployment', function () {
    let GitlabPages;
    let timers;
    let apiCalls;
    let apiDelays;
    let apiErrors;
    let projects;
    let branch;
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

    // Resolves with the first reply, so a rejection which never reaches the UI ends with a test timeout
    function testConnection (deployment) {
        return new Promise(resolve => {
            deployment.testConnection({}, {
                rejectUnauthorized: true,
                gitlab: {
                    server: 'https://gitlab.com',
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

    function runTimers () {
        timers.splice(0).forEach(callback => callback());
    }

    beforeEach(function () {
        timers = [];
        apiCalls = [];
        apiDelays = {};
        apiErrors = {};
        projects = [{ id: 1, name: 'demo', path: 'demo' }];
        branch = { name: 'main' };
        testReplies = [];

        const gitlabClient = {
            Projects: {
                all (options) {
                    if (options.search) {
                        apiCalls.push('searchProjects');
                        return apiResponse('searchProjects', projects);
                    }

                    apiCalls.push('listProjects');
                    return apiResponse('listProjects', [{ id: 1 }]);
                }
            },
            Branches: {
                show () {
                    apiCalls.push('showBranch');
                    return apiResponse('showBranch', branch);
                }
            }
        };

        const context = {
            module: { exports: {} },
            console: { log () {}, warn () {} },
            setTimeout (callback) {
                timers.push(callback);
            },
            process: {
                send () {},
                kill () {}
            },
            require (name) {
                if (name === 'path') {
                    return path;
                }

                if (name === '@gitbeaker/rest') {
                    return { Gitlab: function () { return gitlabClient; } };
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
            assert.deepEqual(apiCalls, ['listProjects', 'searchProjects', 'showBranch']);
            assert.equal(testReplies.length, 1);
        });

        it('reports invalid credentials', async function () {
            apiErrors.listProjects = new Error('401 Unauthorized');

            let reply = await testConnection(new GitlabPages());

            assert.deepEqual(reply, {
                channel: 'app-deploy-test-error',
                payload: { message: { translation: 'core.server.tokenOrServerAddressInvalid' } }
            });
            assert.deepEqual(apiCalls, ['listProjects']);
        });

        it('reports a repository whose name only resembles the configured one', async function () {
            projects = [{ id: 2, name: 'demo-site', path: 'demo-site' }];

            let reply = await testConnection(new GitlabPages());

            assert.deepEqual(reply, {
                channel: 'app-deploy-test-error',
                payload: { message: { translation: 'core.server.repositoryDoesNotExist' } }
            });
            assert.deepEqual(apiCalls, ['listProjects', 'searchProjects']);
        });

        it('reports a missing branch', async function () {
            apiErrors.showBranch = new Error('404 Branch Not Found');

            let reply = await testConnection(new GitlabPages());

            assert.deepEqual(reply, {
                channel: 'app-deploy-test-error',
                payload: { message: { translation: 'core.server.branchDoesNotExist' } }
            });
            assert.deepEqual(apiCalls, ['listProjects', 'searchProjects', 'showBranch']);
        });

        it('reports a timeout when the branch request does not respond in time', async function () {
            apiDelays.showBranch = new Promise(() => {});

            let reply = testConnection(new GitlabPages());
            runTimers();

            assert.deepEqual(await reply, {
                channel: 'app-deploy-test-error',
                payload: { message: { translation: 'core.server.requestTimeout' } }
            });
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
});
