const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { EventEmitter } = require('node:events');
const S3ApiClient = require('../s3-api-client.js');
const { S3ApiError } = S3ApiClient;

describe('S3 API client', function () {
    const EMPTY_PAYLOAD_HASH = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
    // Credentials and date of the examples from the AWS documentation
    // ("Examples: Signature Calculations in AWS Signature Version 4 (Signing Key)")
    const EXAMPLE_ACCESS_KEY = 'AKIAIOSFODNN7EXAMPLE';
    const EXAMPLE_SECRET_KEY = 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY';
    const EXAMPLE_DATE = new Date('2013-05-24T00:00:00Z');

    // The official "AWS Signature Version 4 Test Suite" (header authentication, as shipped with the AWS SDK:
    // packages/signature-v4-crt/src/suite.fixture.ts) - service "service", region us-east-1, 2015-08-30T12:36:00Z
    const SUITE_ACCESS_KEY = 'AKIDEXAMPLE';
    const SUITE_SECRET_KEY = 'wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY';
    const SUITE_DATE = new Date('2015-08-30T12:36:00Z');
    const SUITE_SCOPE = 'AKIDEXAMPLE/20150830/us-east-1/service/aws4_request';
    const SUITE_VECTORS = [
        { name: 'get-header-key-duplicate', method: 'GET', path: '/', headers: { 'my-header1': 'value2,value2,value1' }, signedHeaders: 'host;my-header1;x-amz-date', signature: 'c9d5ea9f3f72853aea855b47ea873832890dbdd183b4468f858259531a5138ea' },
        { name: 'get-header-value-multiline', method: 'GET', path: '/', headers: { 'my-header1': 'value1,value2,value3' }, signedHeaders: 'host;my-header1;x-amz-date', signature: 'ba17b383a53190154eb5fa66a1b836cc297cc0a3d70a5d00705980573d8ff790' },
        { name: 'get-header-value-order', method: 'GET', path: '/', headers: { 'my-header1': 'value4,value1,value3,value2' }, signedHeaders: 'host;my-header1;x-amz-date', signature: '08c7e5a9acfcfeb3ab6b2185e75ce8b1deb5e634ec47601a50643f830c755c01' },
        { name: 'get-header-value-trim', method: 'GET', path: '/', headers: { 'my-header1': 'value1', 'my-header2': '"a   b   c"' }, signedHeaders: 'host;my-header1;my-header2;x-amz-date', signature: 'acc3ed3afb60bb290fc8d2dd0098b9911fcaa05412b367055dee359757a9c736' },
        { name: 'get-unreserved', method: 'GET', path: '/-._~0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', signedHeaders: 'host;x-amz-date', signature: '07ef7494c76fa4850883e2b006601f940f8a34d404d0cfa977f52a65bbf5f24f' },
        { name: 'get-utf8', method: 'GET', path: '/ሴ', signedHeaders: 'host;x-amz-date', signature: '8318018e0b0f223aa2bbf98705b62bb787dc9c0e678f255a891fd03141be5d85' },
        { name: 'get-vanilla', method: 'GET', path: '/', signedHeaders: 'host;x-amz-date', signature: '5fa00fa31553b73ebf1942676e86291e8372ff2a2260956d9b8aae1d763fbf31' },
        { name: 'get-vanilla-empty-query-key', method: 'GET', path: '/', query: { Param1: 'value1' }, signedHeaders: 'host;x-amz-date', signature: 'a67d582fa61cc504c4bae71f336f98b97f1ea3c7a6bfe1b6e45aec72011b9aeb' },
        { name: 'get-vanilla-query', method: 'GET', path: '/', signedHeaders: 'host;x-amz-date', signature: '5fa00fa31553b73ebf1942676e86291e8372ff2a2260956d9b8aae1d763fbf31' },
        { name: 'get-vanilla-query-order-key-case', method: 'GET', path: '/', query: { Param2: 'value2', Param1: 'value1' }, signedHeaders: 'host;x-amz-date', signature: 'b97d918cfa904a5beff61c982a1b6f458b799221646efd99d3219ec94cdf2500' },
        { name: 'get-vanilla-query-unreserved', method: 'GET', path: '/', query: { '-._~0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz': '-._~0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz' }, signedHeaders: 'host;x-amz-date', signature: '9c3e54bfcdf0b19771a7f523ee5669cdf59bc7cc0884027167c21bb143a40197' },
        { name: 'get-vanilla-utf8-query', method: 'GET', path: '/', query: { 'ሴ': 'bar' }, signedHeaders: 'host;x-amz-date', signature: '2cdec8eed098649ff3a119c94853b13c643bcf08f8b0a1d91e12c9027818dd04' },
        { name: 'post-header-key-case', method: 'POST', path: '/', signedHeaders: 'host;x-amz-date', signature: '5da7c1a2acd57cee7505fc6676e4e544621c30862966e37dddb68e92efbe5d6b' },
        { name: 'post-header-key-sort', method: 'POST', path: '/', headers: { 'my-header1': 'value1' }, signedHeaders: 'host;my-header1;x-amz-date', signature: 'c5410059b04c1ee005303aed430f6e6645f61f4dc9e1461ec8f8916fdf18852c' },
        { name: 'post-header-value-case', method: 'POST', path: '/', headers: { 'my-header1': 'VALUE1' }, signedHeaders: 'host;my-header1;x-amz-date', signature: 'cdbc9802e29d2942e5e10b5bccfdd67c5f22c7c4e8ae67b53629efa58b974b7d' },
        { name: 'post-sts-header-after', method: 'POST', path: '/', signedHeaders: 'host;x-amz-date', signature: '5da7c1a2acd57cee7505fc6676e4e544621c30862966e37dddb68e92efbe5d6b' },
        { name: 'post-vanilla', method: 'POST', path: '/', signedHeaders: 'host;x-amz-date', signature: '5da7c1a2acd57cee7505fc6676e4e544621c30862966e37dddb68e92efbe5d6b' },
        { name: 'post-vanilla-empty-query-value', method: 'POST', path: '/', query: { Param1: 'value1' }, signedHeaders: 'host;x-amz-date', signature: '28038455d6de14eafc1f9222cf5aa6f1a96197d7deb8263271d420d138af7f11' },
        { name: 'post-vanilla-query', method: 'POST', path: '/', query: { Param1: 'value1' }, signedHeaders: 'host;x-amz-date', signature: '28038455d6de14eafc1f9222cf5aa6f1a96197d7deb8263271d420d138af7f11' },
        { name: 'post-vanilla-query-nonunreserved', method: 'POST', path: '/', query: { '@#$%^': '', '+': '/,?><`";:\\|][{}' }, signedHeaders: 'host;x-amz-date', signature: '66c82657c86e26fb25238d0e69f011edc4c6df5ae71119d7cb98ed9b87393c1e' },
        { name: 'post-vanilla-query-space', method: 'POST', path: '/', query: { p: '' }, signedHeaders: 'host;x-amz-date', signature: 'e71688addb58a26418614085fb730ba3faa623b461c17f48f2fbdb9361b94a9b' },
        { name: 'post-x-www-form-urlencoded', method: 'POST', path: '/', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: 'Param1=value1', signedHeaders: 'content-type;host;x-amz-date', signature: 'ff11897932ad3f4e8b18135d722051e5ac45fc38421b1da7b9d196a0fe09473a' },
        { name: 'post-x-www-form-urlencoded-parameters', method: 'POST', path: '/', headers: { 'content-type': 'application/x-www-form-urlencoded; charset=utf8' }, body: 'Param1=value1', signedHeaders: 'content-type;host;x-amz-date', signature: '1a72ec8f64bd914b0e42e42607c7fbce7fb2c7465f63e3092b3b0d39fa77a6fe' }
    ];

    let requests;
    let replies;
    let defaultReply;
    let sleeps;
    let transportsUsed;
    let timeoutHandlers;
    let currentTime;

    function httpReply (status, body = '', headers = {}) {
        return { status: status, headers: headers, body: body };
    }

    function xmlError (code, message, extra = '') {
        return `<?xml version="1.0" encoding="UTF-8"?>\n<Error><Code>${code}</Code><Message>${message}</Message>${extra}<RequestId>REQ-1</RequestId></Error>`;
    }

    // Fake http/https module - records the request and replies asynchronously like a real socket
    function createTransport (name) {
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
                    transportsUsed.push(name);
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
        let client = new S3ApiClient(Object.assign({
            accessKeyId: EXAMPLE_ACCESS_KEY,
            secretAccessKey: EXAMPLE_SECRET_KEY,
            region: 'us-east-1',
            bucket: 'demo-bucket',
            httpModules: {
                'http:': createTransport('http'),
                'https:': createTransport('https')
            },
            agents: {},
            now: () => new Date(currentTime)
        }, options));

        client.sleep = ms => {
            sleeps.push(ms);
            return Promise.resolve();
        };

        return client;
    }

    function exampleClient (options = {}) {
        return createClient(Object.assign({ bucket: 'examplebucket' }, options));
    }

    function signedHeadersOf (request) {
        return request.options.headers.authorization.match(/SignedHeaders=([^,]+)/)[1];
    }

    function networkError (code) {
        return Object.assign(new Error(`${code.toLowerCase()} error`), { code: code });
    }

    beforeEach(function () {
        requests = [];
        replies = [];
        defaultReply = httpReply(200);
        sleeps = [];
        transportsUsed = [];
        timeoutHandlers = [];
        currentTime = Date.parse('2024-01-02T03:04:05Z');
    });

    describe('signature', function () {
        SUITE_VECTORS.forEach(vector => {
            it(`passes the "${vector.name}" case of the AWS Signature Version 4 Test Suite`, function () {
                let client = createClient({ accessKeyId: SUITE_ACCESS_KEY, secretAccessKey: SUITE_SECRET_KEY, service: 'service' });
                let signed = client.signRequest({
                    method: vector.method,
                    host: 'example.amazonaws.com',
                    path: client.encodePath(vector.path),
                    query: client.buildQueryString(vector.query || {}),
                    headers: vector.headers || {},
                    payloadHash: vector.body ? client.sha256(vector.body) : EMPTY_PAYLOAD_HASH
                }, SUITE_DATE);

                assert.equal(signed.headers.authorization, `AWS4-HMAC-SHA256 Credential=${SUITE_SCOPE}, SignedHeaders=${vector.signedHeaders}, Signature=${vector.signature}`);
            });
        });

        it('signs the GET Object example from the AWS documentation', function () {
            let signed = exampleClient().signRequest({
                method: 'GET',
                host: 'examplebucket.s3.amazonaws.com',
                path: '/test.txt',
                query: '',
                headers: { Range: 'bytes=0-9', 'x-amz-content-sha256': EMPTY_PAYLOAD_HASH },
                payloadHash: EMPTY_PAYLOAD_HASH
            }, EXAMPLE_DATE);

            assert.equal(signed.canonicalRequest, [
                'GET',
                '/test.txt',
                '',
                'host:examplebucket.s3.amazonaws.com',
                'range:bytes=0-9',
                'x-amz-content-sha256:' + EMPTY_PAYLOAD_HASH,
                'x-amz-date:20130524T000000Z',
                '',
                'host;range;x-amz-content-sha256;x-amz-date',
                EMPTY_PAYLOAD_HASH
            ].join('\n'));
            assert.equal(signed.stringToSign, [
                'AWS4-HMAC-SHA256',
                '20130524T000000Z',
                '20130524/us-east-1/s3/aws4_request',
                '7344ae5b7ee6c3e7e6b0fe0640412a37625d1fbfff95c48bbb2dc43964946972'
            ].join('\n'));
            assert.equal(signed.signature, 'f0e8bdb87c964420e857bd35b5d6ed310bd44f0170aba48dd91039c6036bdb41');
            assert.equal(signed.headers.authorization, 'AWS4-HMAC-SHA256 Credential=AKIAIOSFODNN7EXAMPLE/20130524/us-east-1/s3/aws4_request, SignedHeaders=host;range;x-amz-content-sha256;x-amz-date, Signature=f0e8bdb87c964420e857bd35b5d6ed310bd44f0170aba48dd91039c6036bdb41');
            assert.equal(signed.headers['x-amz-date'], '20130524T000000Z');
            assert.equal(signed.headers['x-amz-content-sha256'], EMPTY_PAYLOAD_HASH);
            assert.equal(signed.headers.host, 'examplebucket.s3.amazonaws.com');
        });

        it('signs the PUT Object example from the AWS documentation', function () {
            let payloadHash = crypto.createHash('sha256').update('Welcome to Amazon S3.').digest('hex');
            let signed = exampleClient().signRequest({
                method: 'PUT',
                host: 'examplebucket.s3.amazonaws.com',
                path: '/test%24file.text',
                query: '',
                headers: {
                    date: 'Fri, 24 May 2013 00:00:00 GMT',
                    'x-amz-storage-class': 'REDUCED_REDUNDANCY',
                    'x-amz-content-sha256': payloadHash
                },
                payloadHash: payloadHash
            }, EXAMPLE_DATE);

            assert.equal(payloadHash, '44ce7dd67c959e0d3524ffac1771dfbba87d2b6b4b4e99e42034a8b803f8b072');
            assert.equal(signed.canonicalRequest, [
                'PUT',
                '/test%24file.text',
                '',
                'date:Fri, 24 May 2013 00:00:00 GMT',
                'host:examplebucket.s3.amazonaws.com',
                'x-amz-content-sha256:' + payloadHash,
                'x-amz-date:20130524T000000Z',
                'x-amz-storage-class:REDUCED_REDUNDANCY',
                '',
                'date;host;x-amz-content-sha256;x-amz-date;x-amz-storage-class',
                payloadHash
            ].join('\n'));
            assert.equal(signed.stringToSign.split('\n')[3], '9e0e90d9c76de8fa5b200d8c849cd5b8dc7a3be3951ddb7f6a76b4158342019d');
            assert.equal(signed.signature, '98ad721746da40c64f1a55b78f14c238d841ea1380cd77a1b5971af0ece108bd');
        });

        it('signs the GET Bucket Lifecycle example from the AWS documentation (query parameter without a value)', function () {
            let client = exampleClient();
            let signed = client.signRequest({
                method: 'GET',
                host: 'examplebucket.s3.amazonaws.com',
                path: '/',
                query: client.buildQueryString({ lifecycle: '' }),
                headers: { 'x-amz-content-sha256': EMPTY_PAYLOAD_HASH },
                payloadHash: EMPTY_PAYLOAD_HASH
            }, EXAMPLE_DATE);

            assert.equal(signed.canonicalRequest.split('\n')[2], 'lifecycle=');
            assert.equal(signed.stringToSign.split('\n')[3], '9766c798316ff2757b517bc739a67f6213b4ab36dd5da2f94eaebf79c77395ca');
            assert.equal(signed.signature, 'fea454ca298b7da1c68078a5d1bdbfbbe0d65c699e0f91ac7a200a0136783543');
        });

        it('signs the List Objects example from the AWS documentation', function () {
            let client = exampleClient();
            let signed = client.signRequest({
                method: 'GET',
                host: 'examplebucket.s3.amazonaws.com',
                path: '/',
                query: client.buildQueryString({ prefix: 'J', 'max-keys': 2 }),
                headers: { 'x-amz-content-sha256': EMPTY_PAYLOAD_HASH },
                payloadHash: EMPTY_PAYLOAD_HASH
            }, EXAMPLE_DATE);

            assert.equal(signed.canonicalRequest.split('\n')[2], 'max-keys=2&prefix=J');
            assert.equal(signed.stringToSign.split('\n')[3], 'df57d21db20da04d7fa30298dd4488ba3a2b47ca3a489c74750e0f1e7df1b9b7');
            assert.equal(signed.signature, '34b48302e7b5fa45bde8084f4b7868a86f0a534bc59db6670ed5711ef69dc6f7');
        });

        it('leaves the headers which proxies may change out of the signature', function () {
            let signed = exampleClient().signRequest({
                method: 'PUT',
                host: 'examplebucket.s3.amazonaws.com',
                path: '/index.html',
                query: '',
                headers: {
                    'Cache-Control': 'no-cache',
                    'User-Agent': 'Publii',
                    'Content-Type': 'text/html',
                    'Content-Length': '5',
                    'X-Amz-Acl': 'public-read',
                    'X-Amz-Content-Sha256': EMPTY_PAYLOAD_HASH,
                    Expect: '100-continue',
                    'Proxy-Authorization': 'Basic abc',
                    'Sec-Fetch-Mode': 'cors'
                },
                payloadHash: EMPTY_PAYLOAD_HASH
            }, EXAMPLE_DATE);

            assert.equal(signed.canonicalRequest.split('\n').slice(-2)[0], 'content-length;content-type;host;x-amz-acl;x-amz-content-sha256;x-amz-date');
            assert.equal(signed.headers['cache-control'], 'no-cache');
            assert.equal(signed.headers['user-agent'], 'Publii');
            assert.equal(signed.headers['proxy-authorization'], 'Basic abc');
        });

        it('trims and collapses the whitespace of the signed header values', function () {
            let signed = exampleClient().signRequest({
                method: 'GET',
                host: 'examplebucket.s3.amazonaws.com',
                path: '/',
                query: '',
                headers: { 'x-amz-meta-note': '  some   spaced \t value  ' },
                payloadHash: EMPTY_PAYLOAD_HASH
            }, EXAMPLE_DATE);

            assert.ok(signed.canonicalRequest.indexOf('x-amz-meta-note:some spaced value\n') > -1);
        });

        it('derives the credential scope from the region', function () {
            let signed = exampleClient({ region: 'eu-central-1' }).signRequest({
                method: 'GET',
                host: 'examplebucket.s3.eu-central-1.amazonaws.com',
                path: '/',
                query: '',
                headers: { 'x-amz-content-sha256': EMPTY_PAYLOAD_HASH },
                payloadHash: EMPTY_PAYLOAD_HASH
            }, EXAMPLE_DATE);

            assert.ok(signed.headers.authorization.indexOf('Credential=AKIAIOSFODNN7EXAMPLE/20130524/eu-central-1/s3/aws4_request,') > -1);
            assert.notEqual(signed.signature, 'fea454ca298b7da1c68078a5d1bdbfbbe0d65c699e0f91ac7a200a0136783543');
        });
    });

    describe('addressing', function () {
        it('uses the virtual-hosted style for AWS buckets', function () {
            let target = createClient({ region: 'eu-central-1' }).buildTarget('images/photo.jpg');

            assert.deepEqual(target, {
                protocol: 'https:',
                hostname: 'demo-bucket.s3.eu-central-1.amazonaws.com',
                port: '',
                host: 'demo-bucket.s3.eu-central-1.amazonaws.com',
                path: '/images/photo.jpg',
                query: ''
            });
        });

        it('uses the regional endpoint for us-east-1 as well', function () {
            assert.equal(createClient().buildTarget('').hostname, 'demo-bucket.s3.us-east-1.amazonaws.com');
        });

        it('uses the Chinese DNS suffix for the cn-* regions', function () {
            assert.equal(createClient({ region: 'cn-north-1' }).buildTarget('').hostname, 'demo-bucket.s3.cn-north-1.amazonaws.com.cn');
            assert.equal(createClient({ region: 'us-gov-west-1' }).buildTarget('').hostname, 'demo-bucket.s3.us-gov-west-1.amazonaws.com');
        });

        it('falls back to the path style for bucket names which are not valid as a subdomain over TLS', function () {
            let target = createClient({ bucket: 'www.example.com' }).buildTarget('index.html');

            assert.equal(target.hostname, 's3.us-east-1.amazonaws.com');
            assert.equal(target.path, '/www.example.com/index.html');
            assert.equal(createClient({ bucket: 'Uppercase' }).buildTarget('').hostname, 's3.us-east-1.amazonaws.com');
            assert.equal(createClient({ bucket: 'ab' }).buildTarget('').hostname, 's3.us-east-1.amazonaws.com');
            assert.equal(createClient({ bucket: 'under_score' }).buildTarget('').hostname, 's3.us-east-1.amazonaws.com');
            assert.equal(createClient({ bucket: '-dash' }).buildTarget('').hostname, 's3.us-east-1.amazonaws.com');
            assert.equal(createClient({ bucket: 'dash-' }).buildTarget('').hostname, 's3.us-east-1.amazonaws.com');
            assert.equal(createClient({ bucket: 'a'.repeat(64) }).buildTarget('').hostname, 's3.us-east-1.amazonaws.com');
            assert.equal(createClient({ bucket: 'a'.repeat(63) }).buildTarget('').hostname, 'a'.repeat(63) + '.s3.us-east-1.amazonaws.com');
        });

        it('forces the path style on request', function () {
            let target = createClient({ forcePathStyle: true }).buildTarget('index.html');

            assert.equal(target.hostname, 's3.us-east-1.amazonaws.com');
            assert.equal(target.path, '/demo-bucket/index.html');
        });

        it('prepends the bucket to a custom endpoint given without a scheme', function () {
            let target = createClient({ endpoint: ' nyc3.digitaloceanspaces.com ' }).buildTarget('index.html');

            assert.deepEqual(target, {
                protocol: 'https:',
                hostname: 'demo-bucket.nyc3.digitaloceanspaces.com',
                port: '',
                host: 'demo-bucket.nyc3.digitaloceanspaces.com',
                path: '/index.html',
                query: ''
            });
        });

        it('keeps the scheme, the port and the path of a custom endpoint', function () {
            let target = createClient({ endpoint: 'http://storage.example.com:8080/s3/' }).buildTarget('index.html');

            assert.deepEqual(target, {
                protocol: 'http:',
                hostname: 'demo-bucket.storage.example.com',
                port: '8080',
                host: 'demo-bucket.storage.example.com:8080',
                path: '/s3/index.html',
                query: ''
            });
        });

        it('uses the path style for custom endpoints given as an IP address or localhost', function () {
            let target = createClient({ endpoint: 'http://127.0.0.1:9000' }).buildTarget('index.html');

            assert.equal(target.hostname, '127.0.0.1');
            assert.equal(target.host, '127.0.0.1:9000');
            assert.equal(target.path, '/demo-bucket/index.html');
            assert.equal(createClient({ endpoint: 'http://[::1]:9000' }).buildTarget('').path, '/demo-bucket/');
            assert.equal(createClient({ endpoint: 'http://localhost:9000' }).buildTarget('').hostname, 'localhost');
        });

        it('allows dots in the bucket name as a subdomain of a custom endpoint only without TLS', function () {
            assert.equal(createClient({ endpoint: 'https://minio.example.com', bucket: 'www.example.com' }).buildTarget('').path, '/www.example.com/');
            assert.equal(createClient({ endpoint: 'http://minio.example.com', bucket: 'www.example.com' }).buildTarget('').hostname, 'www.example.com.minio.example.com');
            // Every label between the dots must be a valid bucket name on its own
            assert.equal(createClient({ endpoint: 'http://minio.example.com', bucket: 'my.bucket' }).buildTarget('').hostname, 'minio.example.com');
        });

        it('rejects a missing region instead of guessing one', function () {
            assert.throws(() => createClient({ region: '' }), err => err instanceof S3ApiError && err.code === 'InvalidRegion');
            assert.throws(() => createClient({ region: '   ' }), err => err.code === 'InvalidRegion');
            assert.throws(() => createClient({ region: undefined }), err => err.code === 'InvalidRegion');
            assert.equal(createClient({ region: ' nyc3 ', endpoint: 'nyc3.digitaloceanspaces.com' }).region, 'nyc3');
        });

        it('rejects endpoints with an unsupported protocol', function () {
            assert.throws(() => createClient({ endpoint: 'ftp://storage.example.com' }), err => err instanceof S3ApiError && err.code === 'InvalidEndpoint');
            assert.throws(() => createClient({ endpoint: 'https://' }), err => err instanceof S3ApiError && err.code === 'InvalidEndpoint');
        });

        it('encodes every segment of the key once and keeps the slashes', function () {
            let target = createClient().buildTarget('zdjęcia/moje zdjęcie (1)+~!*\'.jpg');

            assert.equal(target.path, '/zdj%C4%99cia/moje%20zdj%C4%99cie%20%281%29%2B~%21%2A%27.jpg');
            assert.equal(createClient().buildTarget('100%.html').path, '/100%25.html');
            assert.equal(createClient().buildTarget('a&b=c?d#e.html').path, '/a%26b%3Dc%3Fd%23e.html');
        });

        it('builds a sorted and encoded query string', function () {
            assert.equal(createClient().buildQueryString({ prefix: 'blog/ą b', 'max-keys': 1, skipped: undefined }), 'max-keys=1&prefix=blog%2F%C4%85%20b');
        });
    });

    describe('requests', function () {
        it('lists objects with the prefix and the signed headers', async function () {
            defaultReply = httpReply(200, '<ListBucketResult/>');
            let client = createClient({ region: 'eu-central-1' });

            let result = await client.listObjects({ prefix: 'site/', maxKeys: 1 });

            assert.equal(result, '<ListBucketResult/>');
            assert.deepEqual(transportsUsed, ['https']);
            assert.equal(requests.length, 1);
            assert.equal(requests[0].options.method, 'GET');
            assert.equal(requests[0].options.hostname, 'demo-bucket.s3.eu-central-1.amazonaws.com');
            assert.equal(requests[0].options.port, undefined);
            assert.equal(requests[0].options.path, '/?max-keys=1&prefix=site%2F');
            assert.equal(requests[0].body.length, 0);

            let headers = requests[0].options.headers;
            assert.equal(headers.host, 'demo-bucket.s3.eu-central-1.amazonaws.com');
            assert.equal(headers['user-agent'], 'Publii');
            assert.equal(headers['x-amz-date'], '20240102T030405Z');
            assert.equal(headers['x-amz-content-sha256'], EMPTY_PAYLOAD_HASH);
            assert.equal(headers['content-length'], undefined);
            assert.ok(headers.authorization.startsWith('AWS4-HMAC-SHA256 Credential=AKIAIOSFODNN7EXAMPLE/20240102/eu-central-1/s3/aws4_request, '));
            assert.equal(signedHeadersOf(requests[0]), 'host;x-amz-content-sha256;x-amz-date');
        });

        it('lists objects without a prefix parameter when the prefix is empty', async function () {
            await createClient().listObjects({ prefix: '', maxKeys: 1 });

            assert.equal(requests[0].options.path, '/?max-keys=1');
        });

        it('uses the path style listing for bucket names with dots', async function () {
            await createClient({ bucket: 'www.example.com' }).listObjects({ prefix: 'site/' });

            assert.equal(requests[0].options.hostname, 's3.us-east-1.amazonaws.com');
            assert.equal(requests[0].options.path, '/www.example.com/?max-keys=1&prefix=site%2F');
        });

        it('talks to custom endpoints over plain http when configured so', async function () {
            await createClient({ endpoint: 'http://127.0.0.1:9000' }).listObjects();

            assert.deepEqual(transportsUsed, ['http']);
            assert.equal(requests[0].options.hostname, '127.0.0.1');
            assert.equal(requests[0].options.port, '9000');
            assert.equal(requests[0].options.headers.host, '127.0.0.1:9000');
            assert.equal(requests[0].options.path, '/demo-bucket/?max-keys=1');
        });

        it('downloads an object as a buffer', async function () {
            defaultReply = httpReply(200, '[{"path":"index.html"}]', { 'content-type': 'application/json' });

            let body = await createClient().getObject('site/files.publii.json');

            assert.ok(Buffer.isBuffer(body));
            assert.equal(body.toString('utf8'), '[{"path":"index.html"}]');
            assert.equal(requests[0].options.method, 'GET');
            assert.equal(requests[0].options.path, '/site/files.publii.json');
        });

        it('uploads an object with its metadata headers and the payload hash', async function () {
            defaultReply = httpReply(200, '', { etag: '"abc"' });
            let body = Buffer.from('body { color: red; }');

            let result = await createClient().putObject('site/css/style.css', body, {
                contentType: 'text/css',
                cacheControl: 'public, max-age=2592000',
                acl: 'public-read'
            });

            assert.deepEqual(result, { status: 200, etag: '"abc"' });
            assert.equal(requests[0].options.method, 'PUT');
            assert.equal(requests[0].options.path, '/site/css/style.css');
            assert.equal(requests[0].body.toString(), 'body { color: red; }');

            let headers = requests[0].options.headers;
            assert.equal(headers['content-type'], 'text/css');
            assert.equal(headers['cache-control'], 'public, max-age=2592000');
            assert.equal(headers['x-amz-acl'], 'public-read');
            assert.equal(headers['content-length'], String(body.length));
            assert.equal(headers['x-amz-content-sha256'], crypto.createHash('sha256').update(body).digest('hex'));
            assert.equal(signedHeadersOf(requests[0]), 'content-length;content-type;host;x-amz-acl;x-amz-content-sha256;x-amz-date');
        });

        it('uploads strings and skips the metadata headers which are not set', async function () {
            await createClient().putObject('files.publii.json', '[]', { contentType: 'application/json', acl: 'public-read' });

            let headers = requests[0].options.headers;
            assert.equal(requests[0].body.toString(), '[]');
            assert.equal(headers['content-length'], '2');
            assert.equal('cache-control' in headers, false);
            assert.equal(headers['x-amz-acl'], 'public-read');

            await createClient().putObject('files.publii.json', '[]', { contentType: 'application/json', acl: '' });

            assert.equal('x-amz-acl' in requests[1].options.headers, false);
        });

        it('deletes an object', async function () {
            defaultReply = httpReply(204);

            let result = await createClient().deleteObject('site/old.html');

            assert.deepEqual(result, { status: 204 });
            assert.equal(requests[0].options.method, 'DELETE');
            assert.equal(requests[0].options.path, '/site/old.html');
            assert.equal(requests[0].body.length, 0);
            assert.equal(signedHeadersOf(requests[0]), 'host;x-amz-content-sha256;x-amz-date');
        });

        it('sets the socket inactivity timeout and the keep-alive agent on every request', async function () {
            let agent = { name: 'https-agent' };

            await createClient({ timeout: 45000, agents: { 'https:': agent } }).listObjects();

            assert.equal(timeoutHandlers.length, 1);
            assert.equal(timeoutHandlers[0].ms, 45000);
            assert.equal(requests[0].options.agent, agent);
        });

        it('closes the keep-alive agents', function () {
            let destroyed = [];
            let client = createClient({
                agents: {
                    'http:': { destroy: () => destroyed.push('http') },
                    'https:': { destroy: () => destroyed.push('https') }
                }
            });

            client.close();

            assert.deepEqual(destroyed, ['http', 'https']);
        });
    });

    describe('errors', function () {
        it('reports the S3 error code and message of an XML error response', async function () {
            defaultReply = httpReply(404, xmlError('NoSuchKey', 'The specified key does not exist.', '<Key>files.publii.json</Key>'), { 'x-amz-request-id': 'HEADER-REQ' });

            await assert.rejects(createClient().getObject('files.publii.json'), err => {
                assert.ok(err instanceof S3ApiError);
                assert.equal(err.name, 'S3ApiError');
                assert.equal(err.code, 'NoSuchKey');
                assert.equal(err.status, 404);
                assert.equal(err.message, 'The specified key does not exist.');
                assert.equal(err.details.requestId, 'REQ-1');
                assert.deepEqual(err.toJSON(), { name: 'S3ApiError', code: 'NoSuchKey', status: 404, message: 'The specified key does not exist.' });
                return true;
            });
            assert.equal(requests.length, 1);
        });

        it('decodes the XML entities of the error message', async function () {
            defaultReply = httpReply(403, xmlError('SignatureDoesNotMatch', 'Check your key &amp; signing method &lt;here&gt; &#x41;&#66;'));

            await assert.rejects(createClient().listObjects(), err => err.code === 'SignatureDoesNotMatch' && err.message === 'Check your key & signing method <here> AB');
            assert.equal(requests.length, 1);
        });

        it('reports a 404 without an error document as NotFound', async function () {
            defaultReply = httpReply(404, '');

            await assert.rejects(createClient().getObject('missing.txt'), err => err.code === 'NotFound' && err.status === 404 && err.message === 'HTTP 404 (GET /missing.txt)');
        });

        it('reports other responses without an error document by their status code', async function () {
            defaultReply = httpReply(400, '<html><body>Bad Request</body></html>', { 'x-amz-request-id': 'HEADER-REQ' });

            await assert.rejects(createClient().listObjects(), err => err.code === 'HTTP400' && err.message === 'HTTP 400 (GET /)' && err.details.requestId === 'HEADER-REQ');
            assert.equal(requests.length, 1);
        });

        it('adds the bucket region to the error message when S3 reports a different one', async function () {
            defaultReply = httpReply(301, xmlError('PermanentRedirect', 'The bucket you are attempting to access must be addressed using the specified endpoint.'), { 'x-amz-bucket-region': 'eu-west-1' });

            await assert.rejects(createClient().listObjects(), err => err.code === 'PermanentRedirect' && err.status === 301 && err.message.endsWith('endpoint. (bucket region: eu-west-1)'));

            defaultReply = httpReply(403, xmlError('AccessDenied', 'Access Denied'), { 'x-amz-bucket-region': 'us-east-1' });

            await assert.rejects(createClient().listObjects(), err => err.message === 'Access Denied');
        });

        it('passes network errors through', async function () {
            let error = Object.assign(new Error('getaddrinfo ENOTFOUND demo-bucket.s3.us-east-1.amazonaws.com'), { code: 'ENOTFOUND' });
            replies.push({ error: error });

            await assert.rejects(createClient().listObjects(), err => err === error);
            assert.equal(requests.length, 1);
        });
    });

    describe('retries', function () {
        it('retries throttled requests with a longer delay', async function () {
            replies.push(httpReply(503, xmlError('SlowDown', 'Please reduce your request rate.')));
            defaultReply = httpReply(200, '<ListBucketResult/>');

            let result = await createClient().listObjects();

            assert.equal(result, '<ListBucketResult/>');
            assert.equal(requests.length, 2);
            assert.deepEqual(sleeps, [1000]);
        });

        it('retries server errors and network errors', async function () {
            replies.push(httpReply(502, '<html>Bad Gateway</html>'));
            replies.push({ error: networkError('ECONNRESET') });
            defaultReply = httpReply(204);

            await createClient().deleteObject('old.html');

            assert.equal(requests.length, 3);
            assert.deepEqual(sleeps, [200, 400]);
        });

        it('retries a request which timed out', async function () {
            replies.push({ hang: true });
            defaultReply = httpReply(200);

            await createClient().putObject('index.html', '<html></html>', { contentType: 'text/html' });

            assert.equal(requests.length, 2);
            assert.equal(requests[1].body.toString(), '<html></html>');
            assert.deepEqual(sleeps, [200]);
        });

        it('gives up after three attempts', async function () {
            replies.push({ hang: true }, { hang: true }, { hang: true });

            await assert.rejects(createClient().listObjects(), err => err.name === 'TimeoutError' && err.message === 'Request timeout after 60000ms (GET /)');
            assert.equal(requests.length, 3);
            assert.deepEqual(sleeps, [200, 400]);

            requests = [];
            sleeps = [];
            replies.push(httpReply(500, xmlError('InternalError', 'We encountered an internal error.')));
            defaultReply = httpReply(500, xmlError('InternalError', 'We encountered an internal error.'));

            await assert.rejects(createClient().listObjects(), err => err.code === 'InternalError' && err.status === 500);
            assert.equal(requests.length, 3);
        });

        it('does not retry client errors', async function () {
            defaultReply = httpReply(403, xmlError('AccessDenied', 'Access Denied'));

            await assert.rejects(createClient().listObjects(), err => err.code === 'AccessDenied');
            assert.equal(requests.length, 1);
            assert.deepEqual(sleeps, []);

            replies.push({ error: Object.assign(new Error('self signed certificate'), { code: 'DEPTH_ZERO_SELF_SIGNED_CERT' }) });

            await assert.rejects(createClient().listObjects(), err => err.code === 'DEPTH_ZERO_SELF_SIGNED_CERT');
            assert.equal(requests.length, 2);
        });
    });

    describe('clock skew', function () {
        it('re-signs the request with the server time when the local clock is off', async function () {
            replies.push(httpReply(403, xmlError('RequestTimeTooSkewed', 'The difference between the request time and the current time is too large.'), { date: 'Tue, 02 Jan 2024 03:34:05 GMT' }));
            defaultReply = httpReply(200, '<ListBucketResult/>', { date: 'Tue, 02 Jan 2024 03:34:05 GMT' });
            let client = createClient();

            let result = await client.listObjects();

            assert.equal(result, '<ListBucketResult/>');
            assert.equal(requests.length, 2);
            assert.deepEqual(sleeps, []);
            assert.equal(requests[0].options.headers['x-amz-date'], '20240102T030405Z');
            assert.equal(requests[1].options.headers['x-amz-date'], '20240102T033405Z');
            assert.equal(client.clockOffset, 30 * 60 * 1000);

            await client.getObject('files.publii.json');

            assert.equal(requests[2].options.headers['x-amz-date'], '20240102T033405Z');
        });

        it('follows the server time of every response and ignores the unusable ones', async function () {
            defaultReply = httpReply(200, '', { date: 'Tue, 02 Jan 2024 03:04:09 GMT' });
            let client = createClient();

            await client.listObjects();
            assert.equal(client.clockOffset, 4000);

            defaultReply = httpReply(200, '', { date: 'not a date' });
            await client.listObjects();
            assert.equal(client.clockOffset, 4000);

            defaultReply = httpReply(200, '');
            await client.listObjects();
            assert.equal(client.clockOffset, 4000);

            // Served from a cache - the date belongs to the original response
            defaultReply = httpReply(200, '', { date: 'Tue, 02 Jan 2024 03:34:05 GMT', age: '1800' });
            await client.listObjects();
            assert.equal(client.clockOffset, 4000);

            // A request which took 16 minutes is too imprecise to correct the clock
            assert.equal(client.updateClockOffset({ date: 'Tue, 02 Jan 2024 03:34:05 GMT' }, currentTime - 16 * 60 * 1000), false);
            assert.equal(client.clockOffset, 4000);

            // The difference is measured against the middle of the request
            assert.equal(client.updateClockOffset({ date: 'Tue, 02 Jan 2024 03:34:05 GMT' }, currentTime - 10000), true);
            assert.equal(client.clockOffset, 30 * 60 * 1000 + 5000);
            assert.equal(client.updateClockOffset({ date: 'Tue, 02 Jan 2024 03:34:05 GMT' }, currentTime - 10000), false);
        });

        it('does not retry an authorization error when the clock is right', async function () {
            defaultReply = httpReply(403, xmlError('SignatureDoesNotMatch', 'The request signature we calculated does not match the signature you provided.'), { date: 'Tue, 02 Jan 2024 03:04:06 GMT' });

            await assert.rejects(createClient().listObjects(), err => err.code === 'SignatureDoesNotMatch');
            assert.equal(requests.length, 1);
        });
    });
});
