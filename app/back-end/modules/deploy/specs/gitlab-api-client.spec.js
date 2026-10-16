const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const GitlabApiClient = require('../gitlab-api-client.js');

describe('GitLab API client', function () {
    let requests;
    let response;
    let responses;
    let networkError;
    let hangRequests;
    let sleeps;
    let transportsUsed;

    function httpResponse (status, body, headers = {}) {
        return {
            status: status,
            headers: headers,
            body: body === undefined ? '' : (typeof body === 'string' ? body : JSON.stringify(body))
        };
    }

    // Fake http/https module - records the request and replies asynchronously like a real socket
    function createTransport (name) {
        return {
            request (url, options, callback) {
                let request = new EventEmitter();
                let chunks = [];
                let destroyed = false;

                request.write = chunk => chunks.push(chunk);
                request.destroy = err => {
                    destroyed = true;
                    setImmediate(() => request.emit('error', err || new Error('socket hang up')));
                };
                request.end = () => {
                    transportsUsed.push(name);
                    requests.push({ url: url.toString(), options: options, body: chunks.join('') });

                    if (networkError) {
                        setImmediate(() => request.emit('error', networkError));
                        return;
                    }

                    if (hangRequests) {
                        return;
                    }

                    let reply = responses.length ? responses.shift() : response;

                    setImmediate(() => {
                        if (destroyed) {
                            return;
                        }

                        let incoming = new EventEmitter();
                        incoming.statusCode = reply.status;
                        incoming.headers = reply.headers;
                        callback(incoming);
                        incoming.emit('data', Buffer.from(reply.body));
                        incoming.emit('end');
                    });
                };

                return request;
            }
        };
    }

    function createClient (options = {}) {
        let client = new GitlabApiClient(Object.assign({
            host: 'https://gitlab.com/',
            token: 'secret-token',
            timeout: 30000,
            httpModules: {
                'http:': createTransport('http'),
                'https:': createTransport('https')
            }
        }, options));

        client.sleep = ms => {
            sleeps.push(ms);
            return Promise.resolve();
        };

        return client;
    }

    beforeEach(function () {
        requests = [];
        response = httpResponse(200, {});
        responses = [];
        networkError = null;
        hangRequests = false;
        sleeps = [];
        transportsUsed = [];
    });

    it('lists projects with snake_case query params and without pagination helpers', async function () {
        response = httpResponse(200, [{ id: 1, name: 'demo' }]);

        let result = await createClient().Projects.all({
            search: 'demo',
            owned: true,
            maxPages: 1,
            perPage: 1,
            pagination: 'offset'
        });

        assert.equal(requests[0].url, 'https://gitlab.com/api/v4/projects?search=demo&owned=true&per_page=1');
        assert.equal(requests[0].options.method, 'GET');
        assert.equal(requests[0].body, '');
        assert.deepEqual(result, [{ id: 1, name: 'demo' }]);
    });

    it('looks up a project stored in groups by its encoded path', async function () {
        response = httpResponse(200, { id: 7 });

        let result = await createClient().Projects.show('group/subgroup/demo');

        assert.equal(requests[0].url, 'https://gitlab.com/api/v4/projects/group%2Fsubgroup%2Fdemo');
        assert.equal(result.id, 7);
    });

    it('encodes slashes and special characters in branch names', async function () {
        await createClient().Branches.show(7, 'feature/sprawdź to');

        assert.equal(requests[0].url, 'https://gitlab.com/api/v4/projects/7/repository/branches/feature%2Fsprawd%C5%BA%20to');
    });

    it('returns a raw file as text without parsing it', async function () {
        response = httpResponse(200, '[{"path":"index.html"}]');

        let result = await createClient().RepositoryFiles.showRaw(7, 'publii-files.json', 'main');

        assert.equal(requests[0].url, 'https://gitlab.com/api/v4/projects/7/repository/files/publii-files.json/raw?ref=main');
        assert.equal(requests[0].options.headers['Accept'], '*/*');
        assert.equal(result, '[{"path":"index.html"}]');
    });

    it('creates a commit with the branch, the message and the actions in the body', async function () {
        response = httpResponse(201, { id: 'commit-sha' });
        let actions = [{ action: 'create', file_path: 'public/index.html', encoding: 'base64', content: 'Y29udGVudA==' }];

        let result = await createClient().Commits.create(7, 'main', 'Publii - deployment', actions);

        assert.equal(requests[0].url, 'https://gitlab.com/api/v4/projects/7/repository/commits');
        assert.equal(requests[0].options.method, 'POST');
        assert.equal(requests[0].options.headers['Content-Type'], 'application/json');
        assert.equal(requests[0].options.headers['Content-Length'], Buffer.byteLength(requests[0].body));
        assert.deepEqual(JSON.parse(requests[0].body), {
            branch: 'main',
            commit_message: 'Publii - deployment',
            actions: actions
        });
        assert.equal(result.id, 'commit-sha');
    });

    it('sends the private token and the user agent', async function () {
        await createClient().Projects.all();

        let headers = requests[0].options.headers;
        assert.equal(headers['PRIVATE-TOKEN'], 'secret-token');
        assert.equal(headers['User-Agent'], 'Publii');
        assert.equal(headers['Accept'], 'application/json');
    });

    it('skips the token header without a token', async function () {
        await createClient({ token: '' }).Projects.all();

        assert.equal('PRIVATE-TOKEN' in requests[0].options.headers, false);
    });

    it('appends the API path to the configured server address', async function () {
        await createClient({ host: 'https://gitlab.example.com/' }).Projects.all();
        await createClient({ host: 'https://gitlab.example.com/api/v4/' }).Projects.all();
        await createClient({ host: 'gitlab.example.com' }).Projects.all();

        assert.equal(requests[0].url, 'https://gitlab.example.com/api/v4/projects');
        assert.equal(requests[1].url, 'https://gitlab.example.com/api/v4/projects');
        assert.equal(requests[2].url, 'https://gitlab.example.com/api/v4/projects');
    });

    it('verifies TLS certificates by default', async function () {
        await createClient().Projects.all();

        assert.equal(requests[0].options.rejectUnauthorized, true);
        assert.deepEqual(transportsUsed, ['https']);
    });

    it('accepts self-signed certificates when asked to', async function () {
        await createClient({ rejectUnauthorized: false }).Projects.all();

        assert.equal(requests[0].options.rejectUnauthorized, false);
    });

    it('uses plain HTTP for http:// servers', async function () {
        await createClient({ host: 'http://gitlab.local' }).Projects.all();

        assert.equal(requests[0].url, 'http://gitlab.local/api/v4/projects');
        assert.deepEqual(transportsUsed, ['http']);
    });

    it('throws an error with the status and the message returned by the API', async function () {
        response = httpResponse(404, { message: '404 Project Not Found' });

        await assert.rejects(createClient().Projects.show('group/missing'), err => {
            assert.equal(err.status, 404);
            assert.equal(err.message, '404 Project Not Found');
            assert.deepEqual(JSON.parse(JSON.stringify(err)), {
                name: 'GitlabApiError',
                status: 404,
                message: '404 Project Not Found'
            });

            return true;
        });
    });

    it('flattens validation errors reported as an object', async function () {
        response = httpResponse(400, { message: { base: ['A file with this name already exists'] } });

        await assert.rejects(createClient().Commits.create(7, 'main', 'msg', []), err => {
            assert.equal(err.status, 400);
            assert.equal(err.message, '{"base":["A file with this name already exists"]}');
            return true;
        });
    });

    it('uses the OAuth error description when there is no message', async function () {
        response = httpResponse(401, { error: 'invalid_token', error_description: 'Token is expired.' });

        await assert.rejects(createClient().Projects.all(), err => {
            assert.equal(err.status, 401);
            assert.equal(err.message, 'Token is expired.');
            return true;
        });
    });

    it('describes the request when the error response has no body', async function () {
        response = httpResponse(500);

        await assert.rejects(createClient().Projects.all(), err => {
            assert.equal(err.status, 500);
            assert.equal(err.message, 'HTTP 500 (GET /projects)');
            return true;
        });
    });

    it('reports a timeout without exposing the token', async function () {
        hangRequests = true;

        await assert.rejects(createClient({ timeout: 5 }).Projects.all(), err => {
            assert.equal(err.status, 0);
            assert.equal(err.message, 'Request timeout after 5ms (GET /projects)');
            assert.equal(JSON.stringify(err).includes('secret-token'), false);
            return true;
        });
    });

    it('gives commits more time than the other requests', async function () {
        hangRequests = true;

        await assert.rejects(createClient({ timeout: 5, uploadTimeout: 20 }).Commits.create(7, 'main', 'msg', []), err => {
            assert.equal(err.message, 'Request timeout after 20ms (POST /projects/7/repository/commits)');
            return true;
        });
    });

    it('reports the cause of a network error', async function () {
        networkError = Object.assign(new Error('getaddrinfo ENOTFOUND gitlab.com'), { code: 'ENOTFOUND' });

        await assert.rejects(createClient().Projects.all(), err => {
            assert.equal(err.status, 0);
            assert.equal(err.message, 'Network error (GET /projects): getaddrinfo ENOTFOUND gitlab.com');
            return true;
        });
    });

    it('waits for the retry-after time and retries a rate limited request', async function () {
        responses = [
            httpResponse(429, { message: 'Too Many Requests' }, { 'retry-after': '3' }),
            httpResponse(201, { id: 'commit-sha' })
        ];

        let result = await createClient().Commits.create(7, 'main', 'msg', [{ action: 'delete', file_path: 'public/old.html' }]);

        assert.equal(requests.length, 2);
        assert.deepEqual(sleeps, [3000]);
        assert.equal(result.id, 'commit-sha');
        assert.equal(requests[1].body, requests[0].body);
    });

    it('waits a minute when the rate limit comes without a retry-after header', async function () {
        responses = [
            httpResponse(429, { message: 'Too Many Requests' }),
            httpResponse(200, [])
        ];

        await createClient().Projects.all();

        assert.equal(requests.length, 2);
        assert.deepEqual(sleeps, [60000]);
    });

    it('caps the retry-after wait at two minutes', async function () {
        responses = [
            httpResponse(429, { message: 'Too Many Requests' }, { 'retry-after': '600' }),
            httpResponse(200, [])
        ];

        await createClient().Projects.all();

        assert.deepEqual(sleeps, [120000]);
    });

    it('does not retry a forbidden request', async function () {
        response = httpResponse(403, { message: '403 Forbidden' });

        await assert.rejects(createClient().Projects.all(), err => {
            assert.equal(err.status, 403);
            return true;
        });

        assert.equal(requests.length, 1);
        assert.deepEqual(sleeps, []);
    });

    it('gives up after a single rate limit retry', async function () {
        responses = [
            httpResponse(429, { message: 'Too Many Requests' }, { 'retry-after': '1' }),
            httpResponse(429, { message: 'Too Many Requests' }, { 'retry-after': '1' })
        ];

        await assert.rejects(createClient().Projects.all(), err => {
            assert.equal(err.status, 429);
            return true;
        });

        assert.equal(requests.length, 2);
        assert.deepEqual(sleeps, [1000]);
    });
});
