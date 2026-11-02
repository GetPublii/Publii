const assert = require('node:assert/strict');
const GithubApiClient = require('../github-api-client.js');

describe('GitHub API client', function () {
    let requests;
    let response;
    let responses;
    let fetchError;
    let originalFetch;
    let sleeps;

    function fetchResponse (status, body, headers = {}) {
        return {
            ok: status >= 200 && status < 300,
            status: status,
            headers: {
                get: name => headers[name.toLowerCase()] === undefined ? null : headers[name.toLowerCase()]
            },
            text: async () => body === undefined ? '' : JSON.stringify(body)
        };
    }

    function createClient (options = {}) {
        let client = new GithubApiClient(Object.assign({
            auth: 'secret-token',
            baseUrl: 'https://api.github.com',
            timeout: 30000,
            userAgent: 'Publii'
        }, options));

        client.sleep = ms => {
            sleeps.push(ms);
            return Promise.resolve();
        };

        return client;
    }

    before(function () {
        originalFetch = global.fetch;

        global.fetch = async function (url, options) {
            requests.push({ url: url, options: options });

            if (fetchError) {
                throw fetchError;
            }

            return responses.length ? responses.shift() : response;
        };
    });

    after(function () {
        global.fetch = originalFetch;
    });

    beforeEach(function () {
        requests = [];
        response = fetchResponse(200, {});
        responses = [];
        fetchError = null;
        sleeps = [];
    });

    it('reads a ref keeping slashes in the branch path', async function () {
        response = fetchResponse(200, { object: { sha: 'commit-sha' } });

        let result = await createClient().rest.git.getRef({
            owner: 'publii',
            repo: 'demo',
            ref: 'heads/feature/nested'
        });

        assert.equal(requests[0].url, 'https://api.github.com/repos/publii/demo/git/ref/heads/feature/nested');
        assert.equal(requests[0].options.method, 'GET');
        assert.equal(requests[0].options.body, undefined);
        assert.equal(result.data.object.sha, 'commit-sha');
    });

    it('encodes special characters in path segments', async function () {
        await createClient().rest.git.getRef({
            owner: 'publii',
            repo: 'demo',
            ref: 'heads/sprawdź to'
        });

        assert.equal(requests[0].url, 'https://api.github.com/repos/publii/demo/git/ref/heads/sprawd%C5%BA%20to');
    });

    it('sends authorization and API version headers', async function () {
        await createClient().rest.rateLimit.get();

        let headers = requests[0].options.headers;
        assert.equal(headers['Authorization'], 'token secret-token');
        assert.equal(headers['Accept'], 'application/vnd.github+json');
        assert.equal(headers['User-Agent'], 'Publii');
        assert.equal(headers['X-GitHub-Api-Version'], '2022-11-28');
    });

    it('skips the authorization header without a token', async function () {
        await createClient({ auth: '' }).rest.rateLimit.get();

        assert.equal('Authorization' in requests[0].options.headers, false);
    });

    it('strips trailing slashes from the base URL', async function () {
        await createClient({ baseUrl: 'https://github.example.com/api/v3/' }).rest.rateLimit.get();

        assert.equal(requests[0].url, 'https://github.example.com/api/v3/rate_limit');
    });

    it('requests the tree recursively when asked to', async function () {
        await createClient().rest.git.getTree({
            owner: 'publii',
            repo: 'demo',
            tree_sha: 'tree-sha',
            recursive: 1
        });

        assert.equal(requests[0].url, 'https://api.github.com/repos/publii/demo/git/trees/tree-sha?recursive=1');
    });

    it('sends only the blob content and encoding when creating a blob', async function () {
        response = fetchResponse(201, { sha: 'blob-sha' });

        await createClient().rest.git.createBlob({
            owner: 'publii',
            repo: 'demo',
            content: 'Y29udGVudA==',
            encoding: 'base64',
            filePath: '/input/index.html'
        });

        assert.equal(requests[0].options.method, 'POST');
        assert.deepEqual(JSON.parse(requests[0].options.body), {
            content: 'Y29udGVudA==',
            encoding: 'base64'
        });
    });

    it('includes the base tree only when provided', async function () {
        let client = createClient();
        let tree = [{ path: 'index.html', mode: '100644', type: 'blob', sha: null }];

        await client.rest.git.createTree({ owner: 'publii', repo: 'demo', tree: tree });
        await client.rest.git.createTree({ owner: 'publii', repo: 'demo', tree: tree, base_tree: 'base-sha' });

        assert.deepEqual(JSON.parse(requests[0].options.body), { tree: tree });
        assert.deepEqual(JSON.parse(requests[1].options.body), { tree: tree, base_tree: 'base-sha' });
    });

    it('updates a ref with a PATCH request to the plural refs endpoint', async function () {
        await createClient().rest.git.updateRef({
            owner: 'publii',
            repo: 'demo',
            ref: 'heads/main',
            sha: 'new-commit-sha'
        });

        assert.equal(requests[0].options.method, 'PATCH');
        assert.equal(requests[0].url, 'https://api.github.com/repos/publii/demo/git/refs/heads/main');
        assert.deepEqual(JSON.parse(requests[0].options.body), { sha: 'new-commit-sha' });
    });

    it('throws an error with the status and the message returned by the API', async function () {
        response = fetchResponse(404, { message: 'Not Found' });

        await assert.rejects(createClient().rest.repos.get({ owner: 'publii', repo: 'missing' }), err => {
            assert.equal(err.status, 404);
            assert.equal(err.message, 'Not Found');
            assert.deepEqual(JSON.parse(JSON.stringify(err)), {
                name: 'GithubApiError',
                status: 404,
                message: 'Not Found'
            });

            return true;
        });
    });

    it('describes the request when the error response has no message', async function () {
        response = fetchResponse(500);

        await assert.rejects(createClient().rest.rateLimit.get(), err => {
            assert.equal(err.status, 500);
            assert.equal(err.message, 'HTTP 500 (GET /rate_limit)');
            return true;
        });
    });

    it('reports a timeout without exposing the token', async function () {
        fetchError = Object.assign(new Error('The operation was aborted due to timeout'), { name: 'TimeoutError' });

        await assert.rejects(createClient().rest.rateLimit.get(), err => {
            assert.equal(err.status, 0);
            assert.equal(err.message.includes('timeout'), true);
            assert.equal(JSON.stringify(err).includes('secret-token'), false);
            return true;
        });
    });

    it('reports the cause of a network error', async function () {
        fetchError = Object.assign(new Error('fetch failed'), {
            cause: new Error('getaddrinfo ENOTFOUND api.github.com')
        });

        await assert.rejects(createClient().rest.rateLimit.get(), err => {
            assert.equal(err.status, 0);
            assert.equal(err.message.includes('ENOTFOUND'), true);
            return true;
        });
    });

    it('waits for the retry-after time and retries a rate limited request', async function () {
        responses = [
            fetchResponse(403, { message: 'You have exceeded a secondary rate limit' }, { 'retry-after': '3' }),
            fetchResponse(201, { sha: 'blob-sha' })
        ];

        let result = await createClient().rest.git.createBlob({
            owner: 'publii',
            repo: 'demo',
            content: 'Y29udGVudA==',
            encoding: 'base64'
        });

        assert.equal(requests.length, 2);
        assert.deepEqual(sleeps, [3000]);
        assert.equal(result.data.sha, 'blob-sha');
        assert.deepEqual(JSON.parse(requests[1].options.body), JSON.parse(requests[0].options.body));
    });

    it('waits a minute when the secondary rate limit comes without a retry-after header', async function () {
        responses = [
            fetchResponse(403, { message: 'You have exceeded a secondary rate limit. Please wait a few minutes before you try again.' }),
            fetchResponse(200, {})
        ];

        await createClient().rest.rateLimit.get();

        assert.equal(requests.length, 2);
        assert.deepEqual(sleeps, [60000]);
    });

    it('caps the retry-after wait at two minutes', async function () {
        responses = [
            fetchResponse(429, { message: 'Too Many Requests' }, { 'retry-after': '600' }),
            fetchResponse(200, {})
        ];

        await createClient().rest.rateLimit.get();

        assert.deepEqual(sleeps, [120000]);
    });

    it('does not retry a plain 403 without a rate limit signal', async function () {
        response = fetchResponse(403, { message: 'Resource not accessible by personal access token' });

        await assert.rejects(createClient().rest.repos.get({ owner: 'publii', repo: 'demo' }), err => {
            assert.equal(err.status, 403);
            return true;
        });

        assert.equal(requests.length, 1);
        assert.deepEqual(sleeps, []);
    });

    it('gives up after a single rate limit retry', async function () {
        responses = [
            fetchResponse(403, { message: 'You have exceeded a secondary rate limit' }, { 'retry-after': '1' }),
            fetchResponse(403, { message: 'You have exceeded a secondary rate limit' }, { 'retry-after': '1' })
        ];

        await assert.rejects(createClient().rest.rateLimit.get(), err => {
            assert.equal(err.status, 403);
            return true;
        });

        assert.equal(requests.length, 2);
        assert.deepEqual(sleeps, [1000]);
    });
});
