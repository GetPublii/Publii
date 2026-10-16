/*
 * Lightweight GitLab REST API client
 */

const http = require('http');
const https = require('https');

class GitlabApiError extends Error {
    constructor (message, status = 0, details = null) {
        super(message);
        this.name = 'GitlabApiError';
        this.status = status;
        this.details = details;
    }

    toJSON () {
        return {
            name: this.name,
            status: this.status,
            message: this.message
        };
    }
}

class GitlabApiClient {
    constructor (options = {}) {
        this.token = options.token || '';
        this.baseUrl = this.normalizeHost(options.host);
        this.rejectUnauthorized = options.rejectUnauthorized !== false;
        this.timeout = options.timeout || 30000;
        this.uploadTimeout = options.uploadTimeout || 300000;
        this.userAgent = options.userAgent || 'Publii';
        this.httpModules = options.httpModules || {
            'http:': http,
            'https:': https
        };

        this.Projects = {
            all: (params = {}) => this.request(
                'GET',
                '/projects' + this.buildQuery(params)
            ),
            show: (projectId) => this.request(
                'GET',
                `/projects/${this.encode(projectId)}`
            )
        };

        this.Branches = {
            show: (projectId, branch) => this.request(
                'GET',
                `/projects/${this.encode(projectId)}/repository/branches/${this.encode(branch)}`
            )
        };

        this.RepositoryFiles = {
            showRaw: (projectId, filePath, ref) => this.request(
                'GET',
                `/projects/${this.encode(projectId)}/repository/files/${this.encode(filePath)}/raw?ref=${this.encode(ref)}`,
                null,
                { raw: true }
            )
        };

        this.Commits = {
            create: (projectId, branch, commitMessage, actions) => this.request(
                'POST',
                `/projects/${this.encode(projectId)}/repository/commits`,
                {
                    branch: branch,
                    commit_message: commitMessage,
                    actions: actions
                },
                { timeout: this.uploadTimeout }
            )
        };
    }

    // "https://gitlab.com/" or "gitlab.example.com/api/v4/" -> "https://gitlab.com/api/v4"
    normalizeHost (host) {
        let url = String(host || 'https://gitlab.com').trim();

        if (!/^https?:\/\//i.test(url)) {
            url = 'https://' + url;
        }

        url = url.replace(/\/+$/, '').replace(/\/api\/v4$/, '');

        return url + '/api/v4';
    }

    // Project paths ("group/subgroup/project") and file paths must have their slashes encoded
    encode (value) {
        return encodeURIComponent(String(value));
    }

    // Query params are snake_case; pagination helpers of the previous library are ignored
    buildQuery (params) {
        let ignoredParams = ['maxPages', 'pagination', 'showExpanded'];
        let pairs = [];

        for (let key of Object.keys(params)) {
            if (ignoredParams.indexOf(key) > -1 || params[key] === undefined || params[key] === null) {
                continue;
            }

            let name = key.replace(/[A-Z]/g, letter => '_' + letter.toLowerCase());
            pairs.push(encodeURIComponent(name) + '=' + encodeURIComponent(String(params[key])));
        }

        return pairs.length ? '?' + pairs.join('&') : '';
    }

    sleep (ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /*
     * Rate limits are reported with HTTP 429 and the retry-after header
     */
    getRetryAfterSeconds (status, headers) {
        if (status !== 429) {
            return false;
        }

        let headerSeconds = parseInt(headers ? headers['retry-after'] : '', 10);

        if (isNaN(headerSeconds)) {
            return 60;
        }

        return Math.min(Math.max(headerSeconds, 1), 120);
    }

    /*
     * GitLab reports errors as {message: "..."}, {message: {field: [...]}}
     * or {error: "...", error_description: "..."}
     */
    getErrorMessage (status, data, method, endpoint) {
        if (data && typeof data === 'object') {
            if (typeof data.message === 'string') {
                return data.message;
            }

            if (data.message && typeof data.message === 'object') {
                return JSON.stringify(data.message);
            }

            if (typeof data.error_description === 'string') {
                return data.error_description;
            }

            if (typeof data.error === 'string') {
                return data.error;
            }
        }

        return `HTTP ${status} (${method} ${endpoint})`;
    }

    sendRequest (method, url, headers, body, timeout) {
        return new Promise((resolve, reject) => {
            let parsedUrl = new URL(url);
            let transport = this.httpModules[parsedUrl.protocol];

            if (!transport) {
                reject(new GitlabApiError(`Unsupported protocol: ${parsedUrl.protocol}`));
                return;
            }

            let settled = false;
            let timedOut = false;
            let timeoutTimer = null;
            let timeoutError = Object.assign(new Error('Request timeout'), { name: 'TimeoutError' });

            let settle = (callback) => {
                if (settled) {
                    return;
                }

                settled = true;
                clearTimeout(timeoutTimer);
                callback();
            };

            // Destroying the request on timeout emits errors on both the request and the response
            let fail = (err) => settle(() => reject(timedOut ? timeoutError : err));

            let request = transport.request(parsedUrl, {
                method: method,
                headers: headers,
                rejectUnauthorized: this.rejectUnauthorized
            }, response => {
                let chunks = [];

                response.on('data', chunk => chunks.push(chunk));
                response.on('error', fail);
                response.on('aborted', () => fail(new Error('Connection aborted')));
                response.on('end', () => settle(() => resolve({
                    status: response.statusCode,
                    headers: response.headers || {},
                    text: Buffer.concat(chunks).toString('utf8')
                })));
            });

            timeoutTimer = setTimeout(() => {
                timedOut = true;
                request.destroy(timeoutError);
            }, timeout);

            request.on('error', fail);

            if (body !== null) {
                request.write(body);
            }

            request.end();
        });
    }

    async request (method, endpoint, body = null, options = {}, isRetry = false) {
        let timeout = options.timeout || this.timeout;
        let headers = {
            'Accept': options.raw ? '*/*' : 'application/json',
            'User-Agent': this.userAgent
        };

        if (this.token) {
            headers['PRIVATE-TOKEN'] = this.token;
        }

        let payload = null;

        if (body !== null) {
            payload = JSON.stringify(body);
            headers['Content-Type'] = 'application/json';
            headers['Content-Length'] = Buffer.byteLength(payload);
        }

        let response;

        try {
            response = await this.sendRequest(method, this.baseUrl + endpoint, headers, payload, timeout);
        } catch (err) {
            if (err instanceof GitlabApiError) {
                throw err;
            }

            if (err && err.name === 'TimeoutError') {
                throw new GitlabApiError(`Request timeout after ${timeout}ms (${method} ${endpoint})`);
            }

            let cause = err && err.message ? ': ' + err.message : '';
            throw new GitlabApiError(`Network error (${method} ${endpoint})${cause}`);
        }

        let data = null;

        if (response.text) {
            try {
                data = JSON.parse(response.text);
            } catch (err) {
                data = response.text;
            }
        }

        if (response.status < 200 || response.status >= 300) {
            let retryAfterSeconds = this.getRetryAfterSeconds(response.status, response.headers);

            if (!isRetry && retryAfterSeconds !== false) {
                console.log(`[${ new Date().toUTCString() }] (i) RATE LIMITED (HTTP ${response.status}) - WAITING ${retryAfterSeconds}s BEFORE RETRY: ${method} ${endpoint}`);
                await this.sleep(retryAfterSeconds * 1000);
                return this.request(method, endpoint, body, options, true);
            }

            throw new GitlabApiError(
                this.getErrorMessage(response.status, data, method, endpoint),
                response.status,
                data
            );
        }

        // Raw files are returned as text, exactly as the previous library did
        if (options.raw) {
            return response.text;
        }

        return data;
    }
}

module.exports = GitlabApiClient;
module.exports.GitlabApiError = GitlabApiError;
