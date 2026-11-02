/*
 * Lightweight S3 API client (AWS Signature Version 4)
 */

const crypto = require('crypto');
const http = require('http');
const https = require('https');

const ALGORITHM = 'AWS4-HMAC-SHA256';
const SERVICE = 's3';
const EMPTY_PAYLOAD_HASH = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
// Headers which proxies are allowed to change on the way - never part of the signature (same list as the AWS SDK)
const UNSIGNABLE_HEADERS = [
    'authorization',
    'cache-control',
    'connection',
    'expect',
    'from',
    'keep-alive',
    'max-forwards',
    'pragma',
    'referer',
    'te',
    'trailer',
    'transfer-encoding',
    'upgrade',
    'user-agent',
    'x-amzn-trace-id'
];
const UNSIGNABLE_HEADER_PATTERNS = [/^proxy-/i, /^sec-/i];
// A clock which is off by this much makes S3 reject the signatures (the AWS SDK uses the same 4 minutes)
const CLOCK_SKEW_THRESHOLD = 240000;
// The server time of a response which took longer than this is too imprecise to correct the clock
const CLOCK_SKEW_MAX_REQUEST_DURATION = 900000;
const TRANSIENT_ERROR_CODES = ['RequestTimeout', 'RequestTimeoutException'];
const TRANSIENT_STATUS_CODES = [500, 502, 503, 504];
const NETWORK_ERROR_CODES = ['ECONNRESET', 'ECONNREFUSED', 'EPIPE', 'ETIMEDOUT'];
const THROTTLING_ERROR_CODES = [
    'BandwidthLimitExceeded',
    'LimitExceededException',
    'PriorRequestNotComplete',
    'RequestLimitExceeded',
    'RequestThrottled',
    'RequestThrottledException',
    'SlowDown',
    'ThrottledException',
    'Throttling',
    'ThrottlingException',
    'TooManyRequestsException'
];
const THROTTLING_STATUS_CODES = [429];
const MAX_RETRY_DELAY = 20000;

class S3ApiError extends Error {
    constructor (message, code = 'S3Error', status = 0, details = null) {
        super(message);
        this.name = 'S3ApiError';
        this.code = code;
        this.status = status;
        this.details = details;
    }

    toJSON () {
        return {
            name: this.name,
            code: this.code,
            status: this.status,
            message: this.message
        };
    }
}

class S3ApiClient {
    constructor (options = {}) {
        this.accessKeyId = options.accessKeyId || '';
        this.secretAccessKey = options.secretAccessKey || '';
        this.region = typeof options.region === 'string' ? options.region.trim() : '';
        this.service = options.service || SERVICE;

        // The region is part of every signature - there is no sensible default for S3-compatible providers
        if (this.region === '') {
            throw new S3ApiError('A region must be set when sending requests to S3.', 'InvalidRegion');
        }

        this.bucket = options.bucket || '';
        this.endpoint = this.parseEndpoint(options.endpoint);
        this.forcePathStyle = options.forcePathStyle === true;
        this.timeout = options.timeout || 60000;
        this.maxAttempts = options.maxAttempts || 3;
        this.userAgent = options.userAgent || 'Publii';
        this.httpModules = options.httpModules || {
            'http:': http,
            'https:': https
        };
        this.agents = options.agents || {
            'http:': new http.Agent({ keepAlive: true, maxSockets: 50 }),
            'https:': new https.Agent({ keepAlive: true, maxSockets: 50 })
        };
        this.now = options.now || (() => new Date());
        // Difference between the server clock and the local clock, learned from the responses
        this.clockOffset = 0;
    }

    /*
     * S3-compatible providers are configured with an endpoint like "nyc3.digitaloceanspaces.com",
     * "https://s3.eu-central-003.backblazeb2.com" or "http://localhost:9000"; no endpoint means AWS
     */
    parseEndpoint (endpoint) {
        if (typeof endpoint !== 'string' || endpoint.trim() === '') {
            return null;
        }

        let url = endpoint.trim();

        if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(url)) {
            url = 'https://' + url;
        }

        let parsedUrl;

        try {
            parsedUrl = new URL(url);
        } catch (err) {
            throw new S3ApiError(`Invalid S3 endpoint: ${endpoint}`, 'InvalidEndpoint');
        }

        if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
            throw new S3ApiError(`Unsupported S3 endpoint protocol: ${parsedUrl.protocol}`, 'InvalidEndpoint');
        }

        return {
            protocol: parsedUrl.protocol,
            hostname: parsedUrl.hostname,
            port: parsedUrl.port,
            path: parsedUrl.pathname.replace(/\/+$/, '')
        };
    }

    /*
     * Bucket names which are valid DNS labels can be used as a subdomain of the endpoint;
     * dots are allowed only without TLS, as the wildcard certificates cover a single level
     */
    isVirtualHostableBucket (bucket, allowDots = false) {
        if (allowDots) {
            return bucket.split('.').every(label => this.isVirtualHostableBucket(label));
        }

        return /^(?!-)[a-z0-9-]{3,63}(?<!-)$/.test(bucket) && !this.isIpAddress(bucket);
    }

    // IPv6 hosts are wrapped in square brackets in URLs
    isIpAddress (host) {
        return /^(\d{1,3}\.){3}\d{1,3}$/.test(host) || (host[0] === '[' && host[host.length - 1] === ']');
    }

    usesVirtualHost () {
        if (this.forcePathStyle) {
            return false;
        }

        if (!this.endpoint) {
            return this.isVirtualHostableBucket(this.bucket);
        }

        if (this.isIpAddress(this.endpoint.hostname) || this.endpoint.hostname === 'localhost') {
            return false;
        }

        return this.isVirtualHostableBucket(this.bucket, this.endpoint.protocol === 'http:');
    }

    awsHostname () {
        let dnsSuffix = this.region.indexOf('cn-') === 0 ? 'amazonaws.com.cn' : 'amazonaws.com';
        return `${SERVICE}.${this.region}.${dnsSuffix}`;
    }

    // RFC 3986 encoding of a path segment or a query component, as required by the canonical request
    encodeComponent (value) {
        return encodeURIComponent(String(value)).replace(/[!'()*]/g, character => '%' + character.charCodeAt(0).toString(16).toUpperCase());
    }

    // Object keys keep their slashes - every segment is encoded exactly once
    encodePath (key) {
        return String(key).split('/').map(segment => this.encodeComponent(segment)).join('/');
    }

    buildQueryString (params = {}) {
        let pairs = [];

        for (let name of Object.keys(params)) {
            if (params[name] === undefined || params[name] === null) {
                continue;
            }

            pairs.push([this.encodeComponent(name), this.encodeComponent(params[name])]);
        }

        pairs.sort((pairA, pairB) => {
            if (pairA[0] !== pairB[0]) {
                return pairA[0] < pairB[0] ? -1 : 1;
            }

            return pairA[1] < pairB[1] ? -1 : (pairA[1] > pairB[1] ? 1 : 0);
        });

        return pairs.map(pair => pair[0] + '=' + pair[1]).join('&');
    }

    buildTarget (key, query = {}) {
        let virtualHost = this.usesVirtualHost();
        let protocol = 'https:';
        let hostname = this.awsHostname();
        let port = '';
        let basePath = '';

        if (this.endpoint) {
            protocol = this.endpoint.protocol;
            hostname = this.endpoint.hostname;
            port = this.endpoint.port;
            basePath = this.endpoint.path;
        }

        if (virtualHost) {
            hostname = this.bucket + '.' + hostname;
        } else {
            basePath += '/' + this.encodePath(this.bucket);
        }

        return {
            protocol: protocol,
            hostname: hostname,
            port: port,
            host: port ? hostname + ':' + port : hostname,
            path: basePath + '/' + this.encodePath(key),
            query: this.buildQueryString(query)
        };
    }

    sha256 (data) {
        return crypto.createHash('sha256').update(data).digest('hex');
    }

    hmac (key, data) {
        return crypto.createHmac('sha256', key).update(data, 'utf8').digest();
    }

    // "20130524T000000Z"
    formatAmzDate (date) {
        return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
    }

    /*
     * Returns the headers extended with x-amz-date and authorization;
     * request = { method, host, path (already encoded), query (canonical string), headers, payloadHash }
     */
    signRequest (request, date = this.getServerDate()) {
        let amzDate = this.formatAmzDate(date);
        let dateStamp = amzDate.substring(0, 8);
        let scope = `${dateStamp}/${this.region}/${this.service}/aws4_request`;
        let headers = {};

        for (let name of Object.keys(request.headers || {})) {
            headers[name.toLowerCase()] = request.headers[name];
        }

        headers.host = request.host;
        headers['x-amz-date'] = amzDate;

        let signedHeaderNames = Object.keys(headers).filter(name => {
            return UNSIGNABLE_HEADERS.indexOf(name) === -1 && !UNSIGNABLE_HEADER_PATTERNS.some(pattern => pattern.test(name));
        }).sort();
        let canonicalHeaders = signedHeaderNames.map(name => name + ':' + String(headers[name]).trim().replace(/\s+/g, ' ') + '\n').join('');
        let signedHeaders = signedHeaderNames.join(';');
        let canonicalRequest = [
            request.method,
            request.path,
            request.query || '',
            canonicalHeaders,
            signedHeaders,
            request.payloadHash
        ].join('\n');
        let stringToSign = [
            ALGORITHM,
            amzDate,
            scope,
            this.sha256(canonicalRequest)
        ].join('\n');
        let signingKey = this.hmac(this.hmac(this.hmac(this.hmac('AWS4' + this.secretAccessKey, dateStamp), this.region), this.service), 'aws4_request');
        let signature = this.hmac(signingKey, stringToSign).toString('hex');

        headers.authorization = `${ALGORITHM} Credential=${this.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

        return {
            headers: headers,
            canonicalRequest: canonicalRequest,
            stringToSign: stringToSign,
            signature: signature
        };
    }

    getServerDate () {
        return new Date(this.now().getTime() + this.clockOffset);
    }

    /*
     * Every response carries the server time - the local clock may be off, so the difference (measured
     * against the middle of the request, like NTP does) is remembered and applied to the next signatures;
     * returns true when the difference is big enough to have caused a rejected signature
     */
    updateClockOffset (headers, requestSentAt) {
        // Cached responses carry the time of the original response
        if (!headers || headers.age !== undefined) {
            return false;
        }

        let serverTime = Date.parse(headers.date || '');
        let responseReceivedAt = this.now().getTime();

        if (isNaN(serverTime) || responseReceivedAt - requestSentAt > CLOCK_SKEW_MAX_REQUEST_DURATION) {
            return false;
        }

        let previousOffset = this.clockOffset;
        this.clockOffset = serverTime - Math.round((requestSentAt + responseReceivedAt) / 2);

        return Math.abs(this.clockOffset) >= CLOCK_SKEW_THRESHOLD && this.clockOffset !== previousOffset;
    }

    decodeXml (value) {
        return value
            .replace(/&#x([0-9a-f]+);/gi, (match, hex) => String.fromCodePoint(parseInt(hex, 16)))
            .replace(/&#(\d+);/g, (match, decimal) => String.fromCodePoint(parseInt(decimal, 10)))
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&apos;/g, '\'')
            .replace(/&amp;/g, '&');
    }

    readXmlValue (xml, tagName) {
        let match = xml.match(new RegExp('<' + tagName + '>([\\s\\S]*?)</' + tagName + '>'));
        return match ? this.decodeXml(match[1]).trim() : '';
    }

    /*
     * S3 reports errors as <Error><Code>NoSuchKey</Code><Message>...</Message></Error>;
     * proxies in front of the providers may answer with HTML or with an empty body
     */
    createError (method, target, response) {
        let body = response.body.toString('utf8');
        let code = this.readXmlValue(body, 'Code');
        let message = this.readXmlValue(body, 'Message');
        let requestId = this.readXmlValue(body, 'RequestId') || response.headers['x-amz-request-id'] || '';
        let bucketRegion = response.headers['x-amz-bucket-region'] || '';

        if (!code) {
            code = response.status === 404 ? 'NotFound' : 'HTTP' + response.status;
        }

        if (!message) {
            message = `HTTP ${response.status} (${method} ${target.path})`;
        }

        // A wrong region ends with a redirect or a malformed authorization header error - the right one is in the headers
        if (bucketRegion && bucketRegion !== this.region) {
            message += ` (bucket region: ${bucketRegion})`;
        }

        return new S3ApiError(message, code, response.status, {
            requestId: requestId,
            body: body.substring(0, 1000)
        });
    }

    isRetryableError (err) {
        if (err instanceof S3ApiError) {
            return TRANSIENT_STATUS_CODES.indexOf(err.status) > -1 ||
                   THROTTLING_STATUS_CODES.indexOf(err.status) > -1 ||
                   TRANSIENT_ERROR_CODES.indexOf(err.code) > -1 ||
                   THROTTLING_ERROR_CODES.indexOf(err.code) > -1;
        }

        return err.name === 'TimeoutError' || NETWORK_ERROR_CODES.indexOf(err.code) > -1;
    }

    getRetryDelay (attempt, err) {
        let baseDelay = err instanceof S3ApiError && (THROTTLING_STATUS_CODES.indexOf(err.status) > -1 || THROTTLING_ERROR_CODES.indexOf(err.code) > -1) ? 500 : 100;
        return Math.min(MAX_RETRY_DELAY, baseDelay * Math.pow(2, attempt));
    }

    sleep (ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    sendRequest (method, target, headers, body) {
        return new Promise((resolve, reject) => {
            let transport = this.httpModules[target.protocol];

            if (!transport) {
                reject(new S3ApiError(`Unsupported protocol: ${target.protocol}`, 'InvalidEndpoint'));
                return;
            }

            let settled = false;
            let timedOut = false;
            let timeoutError = Object.assign(new Error(`Request timeout after ${this.timeout}ms (${method} ${target.path})`), { name: 'TimeoutError' });

            let settle = (callback) => {
                if (settled) {
                    return;
                }

                settled = true;
                callback();
            };

            // Destroying the request on timeout emits errors on both the request and the response
            let fail = (err) => settle(() => reject(timedOut ? timeoutError : err));

            let request = transport.request({
                method: method,
                hostname: target.hostname,
                port: target.port || undefined,
                path: target.path + (target.query ? '?' + target.query : ''),
                headers: headers,
                agent: this.agents[target.protocol]
            }, response => {
                let chunks = [];

                response.on('data', chunk => chunks.push(chunk));
                response.on('error', fail);
                response.on('aborted', () => fail(new Error('Connection aborted')));
                response.on('end', () => settle(() => resolve({
                    status: response.statusCode,
                    headers: response.headers || {},
                    body: Buffer.concat(chunks)
                })));
            });

            // Socket inactivity timeout - a big upload on a slow connection is still fine
            request.setTimeout(this.timeout, () => {
                timedOut = true;
                request.destroy(timeoutError);
            });

            request.on('error', fail);

            if (body !== null) {
                request.write(body);
            }

            request.end();
        });
    }

    async request (method, key, options = {}, attempt = 1) {
        let body = options.body === undefined || options.body === null ? null : (Buffer.isBuffer(options.body) ? options.body : Buffer.from(options.body));
        let target = this.buildTarget(key, options.query);
        let headers = {
            'user-agent': this.userAgent
        };

        for (let name of Object.keys(options.headers || {})) {
            if (options.headers[name] !== undefined && options.headers[name] !== null && options.headers[name] !== '') {
                headers[name.toLowerCase()] = options.headers[name];
            }
        }

        if (body !== null) {
            headers['content-length'] = String(body.length);
        }

        let payloadHash = body !== null ? this.sha256(body) : EMPTY_PAYLOAD_HASH;
        headers['x-amz-content-sha256'] = payloadHash;

        let signed = this.signRequest({
            method: method,
            host: target.host,
            path: target.path,
            query: target.query,
            headers: headers,
            payloadHash: payloadHash
        });

        let requestSentAt = this.now().getTime();
        let response;

        try {
            response = await this.sendRequest(method, target, signed.headers, body);
        } catch (err) {
            if (attempt < this.maxAttempts && this.isRetryableError(err)) {
                console.log(`[${ new Date().toUTCString() }] (i) S3 REQUEST FAILED (${err.message}) - RETRY ${attempt + 1}/${this.maxAttempts}: ${method} ${target.path}`);
                await this.sleep(this.getRetryDelay(attempt, err));
                return this.request(method, key, options, attempt + 1);
            }

            throw err;
        }

        let clockSkewCorrected = this.updateClockOffset(response.headers, requestSentAt);

        if (response.status >= 200 && response.status < 300) {
            return response;
        }

        let error = this.createError(method, target, response);

        if (attempt < this.maxAttempts && clockSkewCorrected) {
            console.log(`[${ new Date().toUTCString() }] (i) S3 CLOCK SKEW CORRECTED BY ${this.clockOffset}ms - RETRY ${attempt + 1}/${this.maxAttempts}: ${method} ${target.path}`);
            return this.request(method, key, options, attempt + 1);
        }

        if (attempt < this.maxAttempts && this.isRetryableError(error)) {
            console.log(`[${ new Date().toUTCString() }] (i) S3 ERROR ${error.code} (HTTP ${error.status}) - RETRY ${attempt + 1}/${this.maxAttempts}: ${method} ${target.path}`);
            await this.sleep(this.getRetryDelay(attempt, error));
            return this.request(method, key, options, attempt + 1);
        }

        throw error;
    }

    /*
     * Lists at most maxKeys objects under the prefix - used to verify the credentials and the bucket;
     * the XML listing is returned as text
     */
    async listObjects (options = {}) {
        let query = {
            'max-keys': options.maxKeys || 1
        };

        if (typeof options.prefix === 'string' && options.prefix !== '') {
            query.prefix = options.prefix;
        }

        let response = await this.request('GET', '', { query: query });
        return response.body.toString('utf8');
    }

    async getObject (key) {
        let response = await this.request('GET', key);
        return response.body;
    }

    async putObject (key, body, options = {}) {
        let response = await this.request('PUT', key, {
            body: body,
            headers: {
                'content-type': options.contentType,
                'cache-control': options.cacheControl,
                'x-amz-acl': options.acl
            }
        });

        return {
            status: response.status,
            etag: response.headers.etag || ''
        };
    }

    async deleteObject (key) {
        let response = await this.request('DELETE', key);

        return {
            status: response.status
        };
    }

    // Closes the idle keep-alive connections
    close () {
        for (let protocol of Object.keys(this.agents)) {
            if (this.agents[protocol] && typeof this.agents[protocol].destroy === 'function') {
                this.agents[protocol].destroy();
            }
        }
    }
}

module.exports = S3ApiClient;
module.exports.S3ApiError = S3ApiError;
