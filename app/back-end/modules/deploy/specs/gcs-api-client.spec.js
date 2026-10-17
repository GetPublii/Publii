const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { EventEmitter } = require('node:events');
const GcsApiClient = require('../gcs-api-client.js');
const { GcsApiError } = GcsApiClient;

describe('Google Cloud Storage API client', function () {
    const CLIENT_EMAIL = 'publii@demo-project.iam.gserviceaccount.com';
    const JWT_PATTERN = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

    let keyPair;
    let requests;
    let replies;
    let defaultReply;
    let sleeps;
    let timeoutHandlers;
    let currentTime;

    function httpReply (status, body = '', headers = {}) {
        return { status: status, headers: headers, body: body };
    }

    function tokenReply (token = 'TOKEN-1', expiresIn = 3600) {
        return httpReply(200, JSON.stringify({ access_token: token, expires_in: expiresIn, token_type: 'Bearer' }), { 'content-type': 'application/json' });
    }

    function jsonError (status, reason, message) {
        return httpReply(status, JSON.stringify({
            error: {
                code: status,
                message: message,
                errors: [{ domain: 'global', reason: reason, message: message }]
            }
        }), { 'content-type': 'application/json' });
    }

    function networkError (code) {
        return Object.assign(new Error(`${code.toLowerCase()} error`), { code: code });
    }

    // Every storage request starts with the token exchange
    function authorized (...storageReplies) {
        replies = [tokenReply(), ...storageReplies];
    }

    function tokenRequests () {
        return requests.filter(request => request.options.hostname === 'oauth2.googleapis.com');
    }

    function storageRequests () {
        return requests.filter(request => request.options.hostname === 'storage.googleapis.com');
    }

    function decodeJwtPart (part) {
        return JSON.parse(Buffer.from(part, 'base64url').toString('utf8'));
    }

    function verifyAssertion (assertion) {
        let [header, claims, signature] = assertion.split('.');
        return crypto.verify('RSA-SHA256', Buffer.from(header + '.' + claims), keyPair.publicKey, Buffer.from(signature, 'base64url'));
    }

    // Fake https module - records the request and replies asynchronously like a real socket
    function createTransport () {
        return {
            request (options, callback) {
                let request = new EventEmitter();
                let chunks = [];
                let destroyed = false;

                request.write = chunk => chunks.push(Buffer.from(chunk));
                request.setTimeout = (ms, handler) => {
                    timeoutHandlers.push({ ms: ms, handler: handler });
                };
                request.destroy = err => {
                    destroyed = true;
                    setImmediate(() => request.emit('error', err || new Error('socket hang up')));
                };
                request.end = () => {
                    requests.push({ options: options, body: Buffer.concat(chunks) });

                    let reply = replies.length ? replies.shift() : defaultReply;

                    if (reply.error) {
                        setImmediate(() => request.emit('error', reply.error));
                        return;
                    }

                    if (reply.hang) {
                        // The socket inactivity timeout is the only way out
                        setImmediate(() => timeoutHandlers[timeoutHandlers.length - 1].handler());
                        return;
                    }

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
        let client = new GcsApiClient(Object.assign({
            clientEmail: CLIENT_EMAIL,
            privateKey: keyPair.privateKey,
            bucket: 'demo-bucket',
            httpModule: createTransport(),
            agent: false,
            now: () => new Date(currentTime)
        }, options));

        client.sleep = ms => {
            sleeps.push(ms);
            return Promise.resolve();
        };

        return client;
    }

    before(function () {
        this.timeout(10000);

        keyPair = crypto.generateKeyPairSync('rsa', {
            modulusLength: 2048,
            publicKeyEncoding: { type: 'spki', format: 'pem' },
            privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
        });
    });

    beforeEach(function () {
        requests = [];
        replies = [];
        defaultReply = httpReply(200, '{}');
        sleeps = [];
        timeoutHandlers = [];
        currentTime = Date.parse('2024-01-02T03:04:05Z');
    });

    describe('configuration', function () {
        it('requires the client email and the private key of the service account', function () {
            assert.throws(() => createClient({ clientEmail: '' }), err => err instanceof GcsApiError && err.code === 'InvalidCredentials');
            assert.throws(() => createClient({ clientEmail: undefined }), err => err instanceof GcsApiError && err.code === 'InvalidCredentials');
            assert.throws(() => createClient({ privateKey: '  ' }), err => err instanceof GcsApiError && err.code === 'InvalidCredentials');
            assert.throws(() => createClient({ privateKey: null }), err => err instanceof GcsApiError && err.code === 'InvalidCredentials');
        });

        it('requires the bucket name', function () {
            assert.throws(() => createClient({ bucket: ' ' }), err => err instanceof GcsApiError && err.code === 'InvalidBucket');
            assert.throws(() => createClient({ bucket: undefined }), err => err instanceof GcsApiError && err.code === 'InvalidBucket');
        });

        it('trims the client email and the bucket name', function () {
            let client = createClient({ clientEmail: ` ${CLIENT_EMAIL} `, bucket: ' demo-bucket ' });

            assert.equal(client.clientEmail, CLIENT_EMAIL);
            assert.equal(client.bucket, 'demo-bucket');
        });

        it('closes the keep-alive agent', function () {
            let destroyed = 0;
            let client = createClient({
                agent: {
                    destroy () {
                        destroyed++;
                    }
                }
            });

            client.close();
            createClient().close();

            assert.equal(destroyed, 1);
        });
    });

    describe('authentication', function () {
        it('signs the assertion with the private key of the service account', function () {
            let assertion = createClient().createAssertion(1700000000);
            let [header, claims] = assertion.split('.');

            assert.match(assertion, JWT_PATTERN);
            assert.deepEqual(decodeJwtPart(header), { alg: 'RS256', typ: 'JWT' });
            assert.deepEqual(decodeJwtPart(claims), {
                iss: CLIENT_EMAIL,
                scope: 'https://www.googleapis.com/auth/devstorage.full_control',
                aud: 'https://oauth2.googleapis.com/token',
                iat: 1700000000,
                exp: 1700003600
            });
            assert.equal(verifyAssertion(assertion), true);
        });

        it('issues the assertion at the current time', function () {
            let [, claims] = createClient().createAssertion().split('.');

            assert.equal(decodeJwtPart(claims).iat, 1704164645);
            assert.equal(decodeJwtPart(claims).exp, 1704164645 + 3600);
        });

        it('restores the line breaks of a key copied with escaped newlines', function () {
            let client = createClient({ privateKey: keyPair.privateKey.replace(/\n/g, '\\n') });

            assert.equal(client.privateKey, keyPair.privateKey.trim());
            assert.equal(verifyAssertion(client.createAssertion(1700000000)), true);
        });

        it('rejects a private key which cannot sign', async function () {
            let client = createClient({ privateKey: 'not-a-key' });

            assert.throws(() => client.createAssertion(), err => {
                assert.equal(err.name, 'GcsApiError');
                assert.equal(err.code, 'InvalidCredentials');
                assert.match(err.message, /cannot be used for signing/);
                return true;
            });

            await assert.rejects(client.getBucket(), { code: 'InvalidCredentials' });
            assert.deepEqual(requests, []);
        });

        it('exchanges the assertion for an access token and sends it with the request', async function () {
            replies = [tokenReply('TOKEN-1'), httpReply(200, '{"name":"demo-bucket"}')];

            let bucket = await createClient().getBucket();

            assert.deepEqual(bucket, { name: 'demo-bucket' });
            assert.equal(requests.length, 2);

            let tokenRequest = requests[0];
            let params = new URLSearchParams(tokenRequest.body.toString('utf8'));

            assert.equal(tokenRequest.options.method, 'POST');
            assert.equal(tokenRequest.options.hostname, 'oauth2.googleapis.com');
            assert.equal(tokenRequest.options.path, '/token');
            assert.equal(tokenRequest.options.headers['content-type'], 'application/x-www-form-urlencoded');
            assert.equal(tokenRequest.options.headers['content-length'], String(tokenRequest.body.length));
            assert.equal(tokenRequest.options.headers['user-agent'], 'Publii');
            assert.equal(tokenRequest.options.headers.authorization, undefined);
            assert.deepEqual([...params.keys()], ['grant_type', 'assertion']);
            assert.equal(params.get('grant_type'), 'urn:ietf:params:oauth:grant-type:jwt-bearer');
            assert.equal(verifyAssertion(params.get('assertion')), true);

            let storageRequest = requests[1];

            assert.equal(storageRequest.options.method, 'GET');
            assert.equal(storageRequest.options.hostname, 'storage.googleapis.com');
            assert.equal(storageRequest.options.path, '/storage/v1/b/demo-bucket');
            assert.equal(storageRequest.options.headers.authorization, 'Bearer TOKEN-1');
            assert.equal(storageRequest.options.headers['user-agent'], 'Publii');
            assert.equal(storageRequest.options.headers['content-length'], undefined);
            assert.equal(storageRequest.body.length, 0);
        });

        it('reuses the token until it is about to expire', async function () {
            replies = [tokenReply('TOKEN-1'), httpReply(200, '{}'), httpReply(200, '{}'), tokenReply('TOKEN-2'), httpReply(200, '{}')];
            let client = createClient();

            await client.getBucket();
            currentTime += 3299 * 1000;
            await client.getBucket();

            assert.equal(tokenRequests().length, 1);
            assert.deepEqual(storageRequests().map(request => request.options.headers.authorization), ['Bearer TOKEN-1', 'Bearer TOKEN-1']);

            // Five minutes before the expiry a new token is requested
            currentTime += 1000;
            await client.getBucket();

            assert.equal(tokenRequests().length, 2);
            assert.equal(storageRequests()[2].options.headers.authorization, 'Bearer TOKEN-2');
        });

        it('respects a shorter lifetime reported by the token endpoint', async function () {
            replies = [tokenReply('TOKEN-1', 600), httpReply(200, '{}'), tokenReply('TOKEN-2'), httpReply(200, '{}')];
            let client = createClient();

            await client.getBucket();
            currentTime += 300 * 1000;
            await client.getBucket();

            assert.equal(tokenRequests().length, 2);
            assert.equal(storageRequests()[1].options.headers.authorization, 'Bearer TOKEN-2');
        });

        it('shares one token request between concurrent requests', async function () {
            replies = [tokenReply('TOKEN-1'), httpReply(200, '{}'), httpReply(200, '{}')];
            let client = createClient();

            await Promise.all([client.getBucket(), client.listObjects()]);

            assert.equal(tokenRequests().length, 1);
            assert.deepEqual(storageRequests().map(request => request.options.headers.authorization), ['Bearer TOKEN-1', 'Bearer TOKEN-1']);
        });

        it('reports a rejected key as an authentication error', async function () {
            replies = [httpReply(400, '{"error":"invalid_grant","error_description":"Invalid JWT Signature."}')];

            await assert.rejects(createClient().getBucket(), err => {
                assert.equal(err.name, 'GcsApiError');
                assert.equal(err.code, 'invalid_grant');
                assert.equal(err.status, 400);
                assert.equal(err.message, 'Authentication failed: Invalid JWT Signature.');
                return true;
            });
            assert.equal(requests.length, 1);
            assert.deepEqual(sleeps, []);
        });

        it('reports a token response without a token', async function () {
            replies = [httpReply(200, '<html>Proxy</html>')];

            await assert.rejects(createClient().getBucket(), {
                code: 'HTTP200',
                status: 200,
                message: 'Authentication failed: HTTP 200 (POST /token)'
            });
            assert.equal(requests.length, 1);
        });

        it('retries a transient error of the token endpoint', async function () {
            replies = [httpReply(503, ''), tokenReply('TOKEN-1'), httpReply(200, '{}')];

            await createClient().getBucket();

            assert.equal(tokenRequests().length, 2);
            assert.equal(storageRequests().length, 1);
            assert.deepEqual(sleeps, [200]);
        });

        it('renews a rejected token once', async function () {
            replies = [tokenReply('TOKEN-1'), jsonError(401, 'authError', 'Invalid Credentials'), tokenReply('TOKEN-2'), httpReply(200, '{"name":"demo-bucket"}')];

            let bucket = await createClient().getBucket();

            assert.deepEqual(bucket, { name: 'demo-bucket' });
            assert.equal(tokenRequests().length, 2);
            assert.deepEqual(storageRequests().map(request => request.options.headers.authorization), ['Bearer TOKEN-1', 'Bearer TOKEN-2']);
            assert.deepEqual(sleeps, []);
        });

        it('gives up when the renewed token is rejected too', async function () {
            replies = [tokenReply('TOKEN-1'), jsonError(401, 'authError', 'Invalid Credentials'), tokenReply('TOKEN-2'), jsonError(401, 'authError', 'Invalid Credentials')];

            await assert.rejects(createClient().getBucket(), { code: 'authError', status: 401, message: 'Invalid Credentials' });
            assert.equal(requests.length, 4);
        });
    });

    describe('requests', function () {
        it('downloads the object encoding its name as one path component', async function () {
            authorized(httpReply(200, '[{"path":"index.html"}]'));

            let body = await createClient().getObject('site/files (v2).json');

            assert.equal(Buffer.isBuffer(body), true);
            assert.equal(body.toString('utf8'), '[{"path":"index.html"}]');
            assert.equal(storageRequests()[0].options.method, 'GET');
            assert.equal(storageRequests()[0].options.path, '/storage/v1/b/demo-bucket/o/site%2Ffiles%20%28v2%29.json?alt=media');
        });

        it('uploads the object with its metadata in a multipart request', async function () {
            authorized(httpReply(200, '{"name":"site/index.html","size":"13"}'));

            let result = await createClient().uploadObject('site/index.html', '<html></html>', {
                contentType: 'text/html',
                predefinedAcl: 'publicRead'
            });
            let request = storageRequests()[0];
            let boundary = request.options.headers['content-type'].match(/^multipart\/related; boundary=(publii-[0-9a-f]{32})$/)[1];

            assert.deepEqual(result, { name: 'site/index.html', size: '13' });
            assert.equal(request.options.method, 'POST');
            assert.equal(request.options.path, '/upload/storage/v1/b/demo-bucket/o?uploadType=multipart&predefinedAcl=publicRead');
            assert.equal(request.options.headers['content-length'], String(request.body.length));
            assert.equal(request.body.toString('utf8'), [
                `--${boundary}`,
                'content-type: application/json; charset=UTF-8',
                '',
                '{"name":"site/index.html","contentType":"text/html"}',
                `--${boundary}`,
                'content-type: text/html',
                '',
                '<html></html>',
                `--${boundary}--`,
                ''
            ].join('\r\n'));
        });

        it('uploads a private object with the default content type', async function () {
            authorized(httpReply(200, '{}'));

            await createClient().uploadObject('files.publii.json', Buffer.from('[]'));
            let request = storageRequests()[0];
            let boundary = request.options.headers['content-type'].match(/boundary=(.+)$/)[1];

            assert.equal(request.options.path, '/upload/storage/v1/b/demo-bucket/o?uploadType=multipart');
            assert.equal(request.body.toString('utf8'), [
                `--${boundary}`,
                'content-type: application/json; charset=UTF-8',
                '',
                '{"name":"files.publii.json"}',
                `--${boundary}`,
                'content-type: application/octet-stream',
                '',
                '[]',
                `--${boundary}--`,
                ''
            ].join('\r\n'));
        });

        it('keeps the binary content and the cache control of the uploaded object', async function () {
            authorized(httpReply(200, '{}'));
            let content = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0xff]);

            await createClient().uploadObject('media/image.png', content, {
                contentType: 'image/png',
                cacheControl: 'public, max-age=60'
            });
            let request = storageRequests()[0];
            let boundary = request.options.headers['content-type'].match(/boundary=(.+)$/)[1];
            let contentStart = request.body.indexOf(Buffer.from('content-type: image/png\r\n\r\n')) + 'content-type: image/png\r\n\r\n'.length;

            assert.ok(request.body.indexOf('{"name":"media/image.png","contentType":"image/png","cacheControl":"public, max-age=60"}') > -1);
            assert.deepEqual(request.body.subarray(contentStart, contentStart + content.length), content);
            assert.equal(request.body.subarray(contentStart + content.length).toString('utf8'), `\r\n--${boundary}--\r\n`);
        });

        it('deletes the object', async function () {
            authorized(httpReply(204, ''));

            let result = await createClient().deleteObject('old/page.html');

            assert.deepEqual(result, { status: 204 });
            assert.equal(storageRequests()[0].options.method, 'DELETE');
            assert.equal(storageRequests()[0].options.path, '/storage/v1/b/demo-bucket/o/old%2Fpage.html');
        });

        it('lists the objects under the prefix', async function () {
            authorized(httpReply(200, '{"kind":"storage#objects","items":[{"name":"site/index.html"}]}'), httpReply(200, '{"kind":"storage#objects"}'));
            let client = createClient();

            let listing = await client.listObjects({ prefix: 'site', maxResults: 1 });
            let wholeBucket = await client.listObjects();

            assert.deepEqual(listing, { kind: 'storage#objects', items: [{ name: 'site/index.html' }] });
            assert.deepEqual(wholeBucket, { kind: 'storage#objects' });
            assert.equal(storageRequests()[0].options.method, 'GET');
            assert.equal(storageRequests()[0].options.path, '/storage/v1/b/demo-bucket/o?maxResults=1&prefix=site');
            assert.equal(storageRequests()[1].options.path, '/storage/v1/b/demo-bucket/o?maxResults=1');
        });

        it('patches the bucket metadata', async function () {
            authorized(httpReply(200, '{"name":"demo-bucket","website":{"mainPageSuffix":"index.html"}}'));

            let result = await createClient().patchBucket({ website: { mainPageSuffix: 'index.html', notFoundPage: '404.html' } });
            let request = storageRequests()[0];

            assert.deepEqual(result, { name: 'demo-bucket', website: { mainPageSuffix: 'index.html' } });
            assert.equal(request.options.method, 'PATCH');
            assert.equal(request.options.path, '/storage/v1/b/demo-bucket');
            assert.equal(request.options.headers['content-type'], 'application/json');
            assert.equal(request.body.toString('utf8'), '{"website":{"mainPageSuffix":"index.html","notFoundPage":"404.html"}}');
        });

        it('encodes the bucket name and the query values', async function () {
            authorized(httpReply(200, '{}'));

            await createClient({ bucket: 'my bucket' }).listObjects({ prefix: 'a&b/c d', maxResults: 5 });

            assert.equal(storageRequests()[0].options.path, '/storage/v1/b/my%20bucket/o?maxResults=5&prefix=a%26b%2Fc%20d');
        });

        it('uses the socket inactivity timeout of the client', async function () {
            authorized(httpReply(200, '{}'));

            await createClient({ timeout: 1234 }).getBucket();

            assert.deepEqual(timeoutHandlers.map(handler => handler.ms), [1234, 1234]);
        });
    });

    describe('errors', function () {
        it('reads the reason and the message of the JSON API error', async function () {
            authorized(jsonError(404, 'notFound', 'No such object: demo-bucket/missing.json'));

            await assert.rejects(createClient().getObject('missing.json'), err => {
                assert.equal(err instanceof GcsApiError, true);
                assert.deepEqual(err.toJSON(), {
                    name: 'GcsApiError',
                    code: 'notFound',
                    status: 404,
                    message: 'No such object: demo-bucket/missing.json'
                });
                return true;
            });
        });

        it('uses the status of the newer error format', async function () {
            authorized(httpReply(403, '{"error":{"code":403,"message":"Permission denied","status":"PERMISSION_DENIED"}}'));

            await assert.rejects(createClient().getBucket(), { code: 'PERMISSION_DENIED', status: 403, message: 'Permission denied' });
        });

        it('falls back to the HTTP status for a non-JSON error', async function () {
            authorized(httpReply(502, '<html>Bad Gateway</html>'));

            await assert.rejects(createClient({ maxAttempts: 1 }).getBucket(), err => {
                assert.equal(err.code, 'HTTP502');
                assert.equal(err.status, 502);
                assert.equal(err.message, 'HTTP 502 (GET /storage/v1/b/demo-bucket)');
                assert.deepEqual(err.details, { body: '<html>Bad Gateway</html>' });
                return true;
            });
        });

        it('treats a 404 without a body as a missing object', async function () {
            authorized(httpReply(404));

            await assert.rejects(createClient().deleteObject('x'), {
                code: 'notFound',
                status: 404,
                message: 'HTTP 404 (DELETE /storage/v1/b/demo-bucket/o/x)'
            });
        });

        it('does not retry a client error', async function () {
            authorized(jsonError(403, 'forbidden', 'Access denied.'));

            await assert.rejects(createClient().getBucket(), { code: 'forbidden', status: 403 });
            assert.equal(storageRequests().length, 1);
            assert.deepEqual(sleeps, []);
        });
    });

    describe('retries', function () {
        it('retries the transient server errors with a growing delay', async function () {
            authorized(jsonError(503, 'backendError', 'Backend Error'), jsonError(500, 'internalError', 'Internal Error'), httpReply(200, '{"name":"demo-bucket"}'));

            let bucket = await createClient().getBucket();

            assert.deepEqual(bucket, { name: 'demo-bucket' });
            assert.equal(tokenRequests().length, 1);
            assert.equal(storageRequests().length, 3);
            assert.deepEqual(sleeps, [200, 400]);
        });

        it('waits longer after a rate limit error', async function () {
            authorized(jsonError(429, 'rateLimitExceeded', 'Too many requests'), httpReply(200, '{}'));

            await createClient().getBucket();

            assert.deepEqual(sleeps, [1000]);
        });

        it('gives up after the configured number of attempts', async function () {
            authorized(jsonError(503, 'backendError', 'Backend Error'), jsonError(503, 'backendError', 'Backend Error'));

            await assert.rejects(createClient({ maxAttempts: 2 }).getBucket(), { code: 'backendError', status: 503 });
            assert.equal(storageRequests().length, 2);
            assert.deepEqual(sleeps, [200]);
        });

        it('retries the network errors', async function () {
            authorized({ error: networkError('ECONNRESET') }, httpReply(200, '{}'));

            await createClient().getBucket();

            assert.equal(storageRequests().length, 2);
            assert.deepEqual(sleeps, [200]);
        });

        it('does not retry a DNS error', async function () {
            authorized({ error: networkError('ENOTFOUND') });

            await assert.rejects(createClient().getBucket(), { code: 'ENOTFOUND' });
            assert.equal(storageRequests().length, 1);
            assert.deepEqual(sleeps, []);
        });

        it('retries a request which timed out', async function () {
            authorized({ hang: true }, httpReply(200, '{}'));

            await createClient().getBucket();

            assert.equal(storageRequests().length, 2);
            assert.deepEqual(sleeps, [200]);
        });

        it('reports the timeout when every attempt hangs', async function () {
            authorized({ hang: true }, { hang: true });

            await assert.rejects(createClient({ maxAttempts: 2 }).getBucket(), err => {
                assert.equal(err.name, 'TimeoutError');
                assert.equal(err.message, 'Request timeout after 60000ms (GET /storage/v1/b/demo-bucket)');
                return true;
            });
            assert.equal(storageRequests().length, 2);
        });

        it('retries the upload with the same body', async function () {
            authorized(jsonError(503, 'backendError', 'Backend Error'), httpReply(200, '{}'));

            await createClient().uploadObject('index.html', '<html></html>', { contentType: 'text/html' });

            assert.equal(storageRequests().length, 2);
            assert.equal(storageRequests()[0].body.toString('utf8'), storageRequests()[1].body.toString('utf8'));
            assert.equal(storageRequests()[0].options.headers['content-type'], storageRequests()[1].options.headers['content-type']);
        });
    });
});
