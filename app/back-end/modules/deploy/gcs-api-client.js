/*
 * Lightweight Google Cloud Storage JSON API client (service account authentication)
 */

const crypto = require('crypto');
const https = require('https');

const STORAGE_HOST = 'storage.googleapis.com';
const TOKEN_HOST = 'oauth2.googleapis.com';
const TOKEN_PATH = '/token';
const TOKEN_AUDIENCE = 'https://oauth2.googleapis.com/token';
const JWT_GRANT_TYPE = 'urn:ietf:params:oauth:grant-type:jwt-bearer';
// The objects, their ACLs and the bucket website configuration are managed - read_write is not enough for the bucket
const SCOPE = 'https://www.googleapis.com/auth/devstorage.full_control';
// The longest lifetime Google accepts for a signed assertion (seconds)
const TOKEN_LIFETIME = 3600;
// A token this close to its expiry is renewed before the request (seconds)
const TOKEN_REFRESH_MARGIN = 300;
const TRANSIENT_STATUS_CODES = [408, 429, 500, 502, 503, 504];
const NETWORK_ERROR_CODES = ['ECONNRESET', 'ECONNREFUSED', 'EPIPE', 'ETIMEDOUT', 'EAI_AGAIN'];
const MAX_RETRY_DELAY = 20000;

class GcsApiError extends Error {
    constructor (message, code = 'GcsError', status = 0, details = null) {
        super(message);
        this.name = 'GcsApiError';
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

class GcsApiClient {
    constructor (options = {}) {
        this.clientEmail = typeof options.clientEmail === 'string' ? options.clientEmail.trim() : '';
        // A key pasted through an editor sometimes keeps the escaped line breaks of the JSON file
        this.privateKey = typeof options.privateKey === 'string' ? options.privateKey.replace(/\\n/g, '\n').trim() : '';
        this.bucket = typeof options.bucket === 'string' ? options.bucket.trim() : '';

        if (this.clientEmail === '' || this.privateKey === '') {
            throw new GcsApiError('The service account key file must contain the client_email and private_key fields.', 'InvalidCredentials');
        }

        if (this.bucket === '') {
            throw new GcsApiError('A bucket name must be set when sending requests to Google Cloud Storage.', 'InvalidBucket');
        }

        this.timeout = options.timeout || 60000;
        this.maxAttempts = options.maxAttempts || 3;
        this.userAgent = options.userAgent || 'Publii';
        this.httpModule = options.httpModule || https;
        this.agent = options.agent === undefined ? new https.Agent({ keepAlive: true, maxSockets: 50 }) : options.agent;
        this.now = options.now || (() => new Date());
        this.accessToken = null;
        this.accessTokenExpiresAt = 0;
        this.tokenRequest = null;
    }

    // RFC 3986 encoding - object names keep no slashes in the JSON API paths, they are encoded as %2F
    encodeComponent (value) {
        return encodeURIComponent(String(value)).replace(/[!'()*]/g, character => '%' + character.charCodeAt(0).toString(16).toUpperCase());
    }

    buildQueryString (params = {}) {
        let pairs = [];

        for (let name of Object.keys(params)) {
            if (params[name] === undefined || params[name] === null || params[name] === '') {
                continue;
            }

            pairs.push(this.encodeComponent(name) + '=' + this.encodeComponent(params[name]));
        }

        return pairs.join('&');
    }

    bucketPath () {
        return '/storage/v1/b/' + this.encodeComponent(this.bucket);
    }

    objectPath (name) {
        return this.bucketPath() + '/o/' + this.encodeComponent(name);
    }

    base64url (value) {
        return Buffer.from(value).toString('base64url');
    }

    /*
     * The signed JWT which is exchanged for the access token
     * (https://developers.google.com/identity/protocols/oauth2/service-account)
     */
    createAssertion (issuedAt = Math.floor(this.now().getTime() / 1000)) {
        let header = this.base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
        let claims = this.base64url(JSON.stringify({
            iss: this.clientEmail,
            scope: SCOPE,
            aud: TOKEN_AUDIENCE,
            iat: issuedAt,
            exp: issuedAt + TOKEN_LIFETIME
        }));
        let signingInput = header + '.' + claims;
        let signature;

        try {
            signature = crypto.sign('RSA-SHA256', Buffer.from(signingInput), this.privateKey).toString('base64url');
        } catch (err) {
            throw new GcsApiError(`The private key of the service account cannot be used for signing: ${err.message}`, 'InvalidCredentials');
        }

        return signingInput + '.' + signature;
    }

    parseJson (body) {
        let text = Buffer.isBuffer(body) ? body.toString('utf8') : String(body || '');

        if (text.trim() === '') {
            return null;
        }

        try {
            return JSON.parse(text);
        } catch (err) {
            return null;
        }
    }

    async fetchAccessToken () {
        let body = Buffer.from('grant_type=' + this.encodeComponent(JWT_GRANT_TYPE) + '&assertion=' + this.encodeComponent(this.createAssertion()));
        let target = {
            hostname: TOKEN_HOST,
            path: TOKEN_PATH
        };
        let response = await this.sendRequest('POST', target, {
            'user-agent': this.userAgent,
            'content-type': 'application/x-www-form-urlencoded',
            'content-length': String(body.length)
        }, body);
        let data = this.parseJson(response.body);

        if (response.status < 200 || response.status >= 300 || !data || typeof data.access_token !== 'string') {
            let code = data && typeof data.error === 'string' ? data.error : 'HTTP' + response.status;
            let message = data && (data.error_description || data.error) ? (data.error_description || data.error) : `HTTP ${response.status} (POST ${TOKEN_PATH})`;

            throw new GcsApiError(`Authentication failed: ${message}`, code, response.status, {
                body: response.body.toString('utf8').substring(0, 1000)
            });
        }

        this.accessToken = data.access_token;
        this.accessTokenExpiresAt = this.now().getTime() + ((Number(data.expires_in) || TOKEN_LIFETIME) * 1000);

        return this.accessToken;
    }

    // Concurrent requests share one token request
    getAccessToken () {
        if (this.accessToken && this.now().getTime() < this.accessTokenExpiresAt - (TOKEN_REFRESH_MARGIN * 1000)) {
            return Promise.resolve(this.accessToken);
        }

        if (!this.tokenRequest) {
            this.tokenRequest = this.fetchAccessToken().finally(() => {
                this.tokenRequest = null;
            });
        }

        return this.tokenRequest;
    }

    invalidateAccessToken () {
        this.accessToken = null;
        this.accessTokenExpiresAt = 0;
    }

    /*
     * The JSON API reports errors as { "error": { "code": 404, "message": "...", "errors": [{ "reason": "notFound", ... }] } };
     * the proxies in front of it may answer with HTML or with an empty body
     */
    createError (method, target, response) {
        let body = response.body.toString('utf8');
        let data = this.parseJson(body);
        let error = data && data.error && typeof data.error === 'object' ? data.error : null;
        let reason = '';
        let message = '';

        if (error) {
            if (Array.isArray(error.errors) && error.errors[0] && typeof error.errors[0].reason === 'string') {
                reason = error.errors[0].reason;
            } else if (typeof error.status === 'string') {
                reason = error.status;
            }

            if (typeof error.message === 'string') {
                message = error.message;
            }
        }

        if (!reason) {
            reason = response.status === 404 ? 'notFound' : 'HTTP' + response.status;
        }

        if (!message) {
            message = `HTTP ${response.status} (${method} ${target.path})`;
        }

        return new GcsApiError(message, reason, response.status, {
            body: body.substring(0, 1000)
        });
    }

    isRetryableError (err) {
        if (err instanceof GcsApiError) {
            return TRANSIENT_STATUS_CODES.indexOf(err.status) > -1;
        }

        return err.name === 'TimeoutError' || NETWORK_ERROR_CODES.indexOf(err.code) > -1;
    }

    getRetryDelay (attempt, err) {
        let baseDelay = err instanceof GcsApiError && err.status === 429 ? 500 : 100;
        return Math.min(MAX_RETRY_DELAY, baseDelay * Math.pow(2, attempt));
    }

    sleep (ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    sendRequest (method, target, headers, body) {
        return new Promise((resolve, reject) => {
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

            let request = this.httpModule.request({
                method: method,
                hostname: target.hostname,
                path: target.path,
                headers: headers,
                agent: this.agent
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

    /*
     * Sends an authenticated request to the storage API; options = { query, headers, body };
     * a rejected token is renewed once, transient errors are retried
     */
    async request (method, pathname, options = {}, attempt = 1, tokenRenewed = false) {
        let body = options.body === undefined || options.body === null ? null : (Buffer.isBuffer(options.body) ? options.body : Buffer.from(options.body));
        let query = this.buildQueryString(options.query);
        let target = {
            hostname: STORAGE_HOST,
            path: pathname + (query ? '?' + query : '')
        };
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

        let response;

        try {
            headers.authorization = 'Bearer ' + await this.getAccessToken();
            response = await this.sendRequest(method, target, headers, body);
        } catch (err) {
            if (attempt < this.maxAttempts && this.isRetryableError(err)) {
                console.log(`[${ new Date().toUTCString() }] (i) GCS REQUEST FAILED (${err.message}) - RETRY ${attempt + 1}/${this.maxAttempts}: ${method} ${target.path}`);
                await this.sleep(this.getRetryDelay(attempt, err));
                return this.request(method, pathname, options, attempt + 1, tokenRenewed);
            }

            throw err;
        }

        if (response.status >= 200 && response.status < 300) {
            return response;
        }

        let error = this.createError(method, target, response);

        // The token may have been revoked or expired early - a fresh one is requested once
        if (response.status === 401 && !tokenRenewed) {
            console.log(`[${ new Date().toUTCString() }] (i) GCS ACCESS TOKEN REJECTED - RENEWING: ${method} ${target.path}`);
            this.invalidateAccessToken();
            return this.request(method, pathname, options, attempt, true);
        }

        if (attempt < this.maxAttempts && this.isRetryableError(error)) {
            console.log(`[${ new Date().toUTCString() }] (i) GCS ERROR ${error.code} (HTTP ${error.status}) - RETRY ${attempt + 1}/${this.maxAttempts}: ${method} ${target.path}`);
            await this.sleep(this.getRetryDelay(attempt, error));
            return this.request(method, pathname, options, attempt + 1, tokenRenewed);
        }

        throw error;
    }

    /*
     * Lists at most maxResults objects under the prefix - used to verify the credentials and the bucket
     * (needs only the objects permissions, unlike the bucket metadata)
     */
    async listObjects (options = {}) {
        let query = {
            maxResults: options.maxResults || 1
        };

        if (typeof options.prefix === 'string' && options.prefix !== '') {
            query.prefix = options.prefix;
        }

        let response = await this.request('GET', this.bucketPath() + '/o', { query: query });
        return this.parseJson(response.body) || {};
    }

    async getBucket () {
        let response = await this.request('GET', this.bucketPath());
        return this.parseJson(response.body) || {};
    }

    // Changes only the given fields of the bucket metadata, e.g. { website: { mainPageSuffix: 'index.html' } }
    async patchBucket (metadata) {
        let response = await this.request('PATCH', this.bucketPath(), {
            headers: {
                'content-type': 'application/json'
            },
            body: JSON.stringify(metadata)
        });

        return this.parseJson(response.body) || {};
    }

    async getObject (name) {
        let response = await this.request('GET', this.objectPath(name), {
            query: {
                alt: 'media'
            }
        });

        return response.body;
    }

    /*
     * Multipart upload - the object metadata (name, content type) and the content in one request;
     * options = { contentType, cacheControl, predefinedAcl }
     */
    async uploadObject (name, body, options = {}) {
        let metadata = {
            name: name
        };

        if (options.contentType) {
            metadata.contentType = options.contentType;
        }

        if (options.cacheControl) {
            metadata.cacheControl = options.cacheControl;
        }

        let content = Buffer.isBuffer(body) ? body : Buffer.from(body);
        let boundary = 'publii-' + crypto.randomBytes(16).toString('hex');
        let multipartBody = Buffer.concat([
            Buffer.from(
                `--${boundary}\r\n` +
                'content-type: application/json; charset=UTF-8\r\n\r\n' +
                JSON.stringify(metadata) + '\r\n' +
                `--${boundary}\r\n` +
                `content-type: ${metadata.contentType || 'application/octet-stream'}\r\n\r\n`
            ),
            content,
            Buffer.from(`\r\n--${boundary}--\r\n`)
        ]);
        let query = {
            uploadType: 'multipart'
        };

        if (options.predefinedAcl) {
            query.predefinedAcl = options.predefinedAcl;
        }

        let response = await this.request('POST', '/upload' + this.bucketPath() + '/o', {
            query: query,
            headers: {
                'content-type': `multipart/related; boundary=${boundary}`
            },
            body: multipartBody
        });

        return this.parseJson(response.body) || {};
    }

    async deleteObject (name) {
        let response = await this.request('DELETE', this.objectPath(name));

        return {
            status: response.status
        };
    }

    // Closes the idle keep-alive connections
    close () {
        if (this.agent && typeof this.agent.destroy === 'function') {
            this.agent.destroy();
        }
    }
}

module.exports = GcsApiClient;
module.exports.GcsApiError = GcsApiError;
