/*
 * Lightweight GitHub REST API client
 */

class GithubApiError extends Error {
    constructor (message, status = 0, details = null) {
        super(message);
        this.name = 'GithubApiError';
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

class GithubApiClient {
    constructor (options = {}) {
        this.auth = options.auth || '';
        this.baseUrl = (options.baseUrl || 'https://api.github.com').replace(/\/+$/, '');
        this.timeout = options.timeout || 30000;
        this.userAgent = options.userAgent || 'Publii';

        this.rest = {
            git: {
                getRef: ({ owner, repo, ref }) => this.request(
                    'GET',
                    `/repos/${this.encode(owner)}/${this.encode(repo)}/git/ref/${this.encodeRef(ref)}`
                ),
                getCommit: ({ owner, repo, commit_sha }) => this.request(
                    'GET',
                    `/repos/${this.encode(owner)}/${this.encode(repo)}/git/commits/${this.encode(commit_sha)}`
                ),
                getTree: ({ owner, repo, tree_sha, recursive }) => this.request(
                    'GET',
                    `/repos/${this.encode(owner)}/${this.encode(repo)}/git/trees/${this.encode(tree_sha)}` + (recursive ? '?recursive=1' : '')
                ),
                createBlob: ({ owner, repo, content, encoding }) => this.request(
                    'POST',
                    `/repos/${this.encode(owner)}/${this.encode(repo)}/git/blobs`,
                    { content, encoding }
                ),
                createTree: ({ owner, repo, tree, base_tree }) => this.request(
                    'POST',
                    `/repos/${this.encode(owner)}/${this.encode(repo)}/git/trees`,
                    base_tree ? { tree, base_tree } : { tree }
                ),
                createCommit: ({ owner, repo, message, tree, parents }) => this.request(
                    'POST',
                    `/repos/${this.encode(owner)}/${this.encode(repo)}/git/commits`,
                    { message, tree, parents }
                ),
                updateRef: ({ owner, repo, ref, sha, force }) => this.request(
                    'PATCH',
                    `/repos/${this.encode(owner)}/${this.encode(repo)}/git/refs/${this.encodeRef(ref)}`,
                    force ? { sha, force } : { sha }
                )
            },
            repos: {
                get: ({ owner, repo }) => this.request(
                    'GET',
                    `/repos/${this.encode(owner)}/${this.encode(repo)}`
                )
            },
            rateLimit: {
                get: () => this.request('GET', '/rate_limit')
            }
        };
    }

    encode (value) {
        return encodeURIComponent(String(value));
    }

    // Refs like "heads/my/branch" keep their slashes as path separators
    encodeRef (ref) {
        return String(ref).split('/').map(part => encodeURIComponent(part)).join('/');
    }

    sleep (ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /*
     * Secondary rate limits (403/429) are reported via the retry-after header
     * or only in the error message - the /rate_limit endpoint does not expose
     * them, so they cannot be detected upfront
     */
    getRetryAfterSeconds (response, data) {
        if (response.status !== 403 && response.status !== 429) {
            return false;
        }

        let header = response.headers && response.headers.get('retry-after');
        let headerSeconds = parseInt(header, 10);

        if (!isNaN(headerSeconds)) {
            return Math.min(Math.max(headerSeconds, 1), 120);
        }

        if (data && data.message && data.message.toLowerCase().indexOf('secondary rate limit') > -1) {
            return 60;
        }

        return false;
    }

    async request (method, endpoint, body = null, isRetry = false) {
        let headers = {
            'Accept': 'application/vnd.github+json',
            'User-Agent': this.userAgent,
            'X-GitHub-Api-Version': '2022-11-28'
        };

        if (this.auth) {
            headers['Authorization'] = 'token ' + this.auth;
        }

        if (body !== null) {
            headers['Content-Type'] = 'application/json';
        }

        let response;

        try {
            response = await fetch(this.baseUrl + endpoint, {
                method: method,
                headers: headers,
                body: body !== null ? JSON.stringify(body) : undefined,
                signal: AbortSignal.timeout(this.timeout)
            });
        } catch (err) {
            if (err && (err.name === 'TimeoutError' || err.name === 'AbortError')) {
                throw new GithubApiError(`Request timeout after ${this.timeout}ms (${method} ${endpoint})`);
            }

            let cause = err && err.cause && err.cause.message ? ': ' + err.cause.message : '';
            throw new GithubApiError(`Network error (${method} ${endpoint})${cause}`);
        }

        let responseText = await response.text();
        let data = null;

        if (responseText) {
            try {
                data = JSON.parse(responseText);
            } catch (err) {
                data = responseText;
            }
        }

        if (!response.ok) {
            let retryAfterSeconds = this.getRetryAfterSeconds(response, data);

            if (!isRetry && retryAfterSeconds !== false) {
                console.log(`[${ new Date().toUTCString() }] (i) RATE LIMITED (HTTP ${response.status}) - WAITING ${retryAfterSeconds}s BEFORE RETRY: ${method} ${endpoint}`);
                await this.sleep(retryAfterSeconds * 1000);
                return this.request(method, endpoint, body, true);
            }

            let message = data && data.message ? data.message : `HTTP ${response.status} (${method} ${endpoint})`;
            throw new GithubApiError(message, response.status, data);
        }

        return {
            data: data,
            status: response.status
        };
    }
}

module.exports = GithubApiClient;
module.exports.GithubApiError = GithubApiError;
