const EventEmitter = require('events');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { pipeline } = require('stream');
const PathValidator = require('../../helpers/path-validator.js');

const HOST = '127.0.0.1';
const DEFAULT_PORT = 3000;
const MIN_PORT = 1024;
const MAX_PORT = 65535;

// Only these file types and the types added by the user are served - an unknown extension
// ends with 404, never with a generic MIME type
const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.htm': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.xml': 'application/xml; charset=utf-8',
    '.txt': 'text/plain; charset=utf-8',
    '.webmanifest': 'application/manifest+json; charset=utf-8',
    '.vtt': 'text/vtt; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.avif': 'image/avif',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.otf': 'font/otf',
    '.eot': 'application/vnd.ms-fontobject',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.ogv': 'video/ogg',
    '.mp3': 'audio/mpeg',
    '.ogg': 'audio/ogg',
    '.wav': 'audio/wav',
    '.m4a': 'audio/mp4',
    '.pdf': 'application/pdf'
};

// File types added by the user - they extend the list above, but they cannot change it
const MAX_CUSTOM_MIME_TYPES = 50;
const EXTENSION_PATTERN = /^\.[a-z0-9][a-z0-9_+-]{0,15}$/;
const MIME_TYPE_PATTERN = /^[a-z0-9][a-z0-9!#$&^_.+-]{0,63}\/[a-z0-9][a-z0-9!#$&^_.+-]{0,63}$/;

const STATUS_MESSAGES = {
    400: 'Bad Request',
    403: 'Forbidden',
    404: 'Not Found',
    405: 'Method Not Allowed',
    416: 'Range Not Satisfiable',
    500: 'Internal Server Error'
};

/*
 * Local preview server - serves static files of the websites with an enabled preview
 * under http://127.0.0.1:PORT/<site-name>/ and nothing more: no code execution,
 * no directory listings, no files from outside of the preview directories.
 *
 * The server works only when at least one preview is enabled.
 */
class PreviewServer extends EventEmitter {
    constructor () {
        super();
        this.server = null;
        this.port = null;
        this.requestedPort = null;
        this.sites = new Map();             // siteName -> real path of the preview directory
        this.customMimeTypes = {};          // extension -> Content-Type of the file types added by the user
        this.queue = Promise.resolve();     // state changes run one by one - previews are requested by many windows
    }

    static get DEFAULT_PORT () {
        return DEFAULT_PORT;
    }

    // Port which can be set by the user
    static isValidPort (port) {
        return Number.isInteger(port) && port >= MIN_PORT && port <= MAX_PORT;
    }

    // File types which are always served: [{ extension, mimeType }]
    static getBuiltInMimeTypes () {
        return Object.keys(MIME).map(extension => ({
            extension: extension,
            mimeType: MIME[extension].split(';')[0]
        }));
    }

    /**
     * Checks a file type added by the user. The MIME type becomes a value of the Content-Type header
     * and the extension extends the allow-list, so both have a strict format.
     *
     * @param entry - { extension, mimeType }
     * @returns {object} { status: true, extension, mimeType } or { status: false, reason }
     */
    static normalizeMimeType (entry) {
        if (!entry || typeof entry.extension !== 'string' || typeof entry.mimeType !== 'string') {
            return { status: false, reason: 'invalid-extension' };
        }

        let extension = entry.extension.trim().toLowerCase();
        let mimeType = entry.mimeType.trim().toLowerCase();

        if (extension !== '' && extension[0] !== '.') {
            extension = '.' + extension;
        }

        if (!EXTENSION_PATTERN.test(extension)) {
            return { status: false, reason: 'invalid-extension' };
        }

        if (Object.prototype.hasOwnProperty.call(MIME, extension)) {
            return { status: false, reason: 'built-in-extension' };
        }

        if (!MIME_TYPE_PATTERN.test(mimeType)) {
            return { status: false, reason: 'invalid-mime-type' };
        }

        return { status: true, extension: extension, mimeType: mimeType };
    }

    /**
     * Checks the whole list of the file types added by the user
     *
     * @param mimeTypes - [{ extension, mimeType }]
     * @returns {object} { status: true, mimeTypes } or { status: false, reason, index } for the first invalid item
     */
    static normalizeMimeTypes (mimeTypes) {
        if (!Array.isArray(mimeTypes)) {
            return { status: false, reason: 'invalid-list', index: -1 };
        }

        if (mimeTypes.length > MAX_CUSTOM_MIME_TYPES) {
            return { status: false, reason: 'too-many', index: MAX_CUSTOM_MIME_TYPES };
        }

        let normalized = [];

        for (let index = 0; index < mimeTypes.length; index++) {
            let result = PreviewServer.normalizeMimeType(mimeTypes[index]);

            if (!result.status) {
                return { status: false, reason: result.reason, index: index };
            }

            if (normalized.some(item => item.extension === result.extension)) {
                return { status: false, reason: 'duplicated-extension', index: index };
            }

            normalized.push({ extension: result.extension, mimeType: result.mimeType });
        }

        return { status: true, mimeTypes: normalized };
    }

    // Tolerant version for the values read from the config file - invalid items are skipped
    static sanitizeMimeTypes (mimeTypes) {
        let sanitized = [];

        for (let entry of (Array.isArray(mimeTypes) ? mimeTypes : [])) {
            let result = PreviewServer.normalizeMimeType(entry);

            if (result.status && sanitized.length < MAX_CUSTOM_MIME_TYPES && !sanitized.some(item => item.extension === result.extension)) {
                sanitized.push({ extension: result.extension, mimeType: result.mimeType });
            }
        }

        return sanitized;
    }

    // Address of the local preview server
    static isPreviewUrl (url) {
        if (typeof url !== 'string') {
            return false;
        }

        let parsed;

        try {
            parsed = new URL(url);
        } catch (error) {
            return false;
        }

        return parsed.protocol === 'http:' &&
            parsed.hostname === HOST &&
            parsed.port !== '' &&
            parsed.username === '' &&
            parsed.password === '';
    }

    /**
     * Enables preview of the website - starts the server when it is the first enabled preview
     *
     * @param siteName
     * @param dir - preview directory of the website, it must exist
     * @param options - port: used only when the server is not working yet,
     *                  portFallback: use a random free port when the requested one is busy
     * @returns {Promise<string>} URL of the website preview
     */
    enableSite (siteName, dir, options = {}) {
        return this._enqueue(async () => {
            if (!PathValidator.isValidDirSegment(siteName)) {
                throw new Error('Invalid website name');
            }

            // Root is compared with real paths of the files, so it cannot contain symlinks (i.e. /tmp on macOS)
            let root = await fs.promises.realpath(dir);
            let stats = await fs.promises.stat(root);

            if (!stats.isDirectory()) {
                throw new Error('Preview location is not a directory');
            }

            if (!this.server) {
                await this._start(options.port, !!options.portFallback);
            }

            this.sites.set(siteName, root);
            this.emit('state-changed', this.getState());

            return this.getSiteUrl(siteName);
        });
    }

    /**
     * Disables preview of the website - stops the server when it was the last enabled preview
     *
     * @param siteName
     */
    disableSite (siteName) {
        return this._enqueue(async () => {
            if (!this.sites.delete(siteName)) {
                return;
            }

            if (this.sites.size === 0) {
                await this._stop();
            }

            this.emit('state-changed', this.getState());
        });
    }

    /**
     * Disables all previews and stops the server
     */
    stop () {
        return this._enqueue(async () => {
            if (!this.server && this.sites.size === 0) {
                return;
            }

            await this._stop();
            this.emit('state-changed', this.getState());
        });
    }

    /**
     * Sets file types added by the user - it works right away, also for the previews which are already enabled
     *
     * @param mimeTypes - [{ extension, mimeType }], invalid items are skipped
     */
    setCustomMimeTypes (mimeTypes) {
        let customMimeTypes = {};

        for (let entry of PreviewServer.sanitizeMimeTypes(mimeTypes)) {
            // Generated websites use UTF-8
            customMimeTypes[entry.extension] = entry.mimeType.indexOf('text/') === 0 ? entry.mimeType + '; charset=utf-8' : entry.mimeType;
        }

        this.customMimeTypes = customMimeTypes;
    }

    isSiteEnabled (siteName) {
        return this.sites.has(siteName);
    }

    getSiteUrl (siteName) {
        if (!this.server || !this.sites.has(siteName)) {
            return null;
        }

        // Website names are limited to the characters which are safe in URLs
        return 'http://' + HOST + ':' + this.port + '/' + siteName;
    }

    // State for the UI - it never contains any paths
    getState () {
        return {
            running: !!this.server,
            port: this.port,
            requestedPort: this.requestedPort,
            sites: Array.from(this.sites.keys()).map(siteName => ({
                name: siteName,
                url: this.getSiteUrl(siteName)
            }))
        };
    }

    _enqueue (operation) {
        let result = this.queue.then(operation);
        this.queue = result.catch(() => {});
        return result;
    }

    async _start (port, portFallback) {
        // Port 0 (random free port) is not available for the users - it is used as a fallback and in the specs
        let requestedPort = (PreviewServer.isValidPort(port) || port === 0) ? port : DEFAULT_PORT;
        let server;

        try {
            server = await this._listen(requestedPort);
        } catch (error) {
            if (!portFallback || error.code !== 'EADDRINUSE') {
                throw error;
            }

            server = await this._listen(0);
        }

        this.server = server;
        this.port = server.address().port;
        this.requestedPort = requestedPort;
    }

    _listen (port) {
        return new Promise((resolve, reject) => {
            let server = http.createServer((req, res) => {
                this._handleRequest(req, res).catch(error => {
                    console.log('[PreviewServer] Request failed:', error);

                    if (res.headersSent) {
                        res.destroy();
                        return;
                    }

                    this._sendError(req, res, 500);
                });
            });

            server.once('error', reject);

            // Never bind to other interfaces - previews must not be available in the local network
            server.listen(port, HOST, () => {
                server.removeListener('error', reject);
                server.on('error', error => console.log('[PreviewServer] Server error:', error));
                resolve(server);
            });
        });
    }

    async _stop () {
        let server = this.server;
        this.sites.clear();
        this.server = null;
        this.port = null;
        this.requestedPort = null;

        if (!server) {
            return;
        }

        await new Promise(resolve => {
            server.close(() => resolve());

            // Keep-alive connections of the browsers would block closing the server (Node.js 18.2+, so always in Electron)
            if (typeof server.closeAllConnections === 'function') {
                server.closeAllConnections();
            }
        });
    }

    async _handleRequest (req, res) {
        if (req.method !== 'GET' && req.method !== 'HEAD') {
            this._sendError(req, res, 405, { 'Allow': 'GET, HEAD' });
            return;
        }

        // DNS rebinding protection - the only way in which a foreign website could read the previews
        if (!this.server || req.headers.host !== HOST + ':' + this.port) {
            this._sendError(req, res, 403);
            return;
        }

        // Requests without this header (older browsers) are accepted
        if (req.headers['sec-fetch-site'] === 'cross-site') {
            this._sendError(req, res, 403);
            return;
        }

        // Address of the server stays the same between the sessions, so a service worker
        // registered by the previewed website would keep serving its outdated files
        if (req.headers['service-worker'] === 'script') {
            this._sendError(req, res, 403);
            return;
        }

        let rawPath = req.url.split('?')[0];
        let pathname;

        if (rawPath[0] !== '/') {
            this._sendError(req, res, 400);
            return;
        }

        try {
            pathname = decodeURIComponent(rawPath);
        } catch (error) {
            this._sendError(req, res, 400);
            return;
        }

        // Backslash is a path separator on Windows (%5c..%5c)
        if (pathname.indexOf('\0') !== -1 || pathname.indexOf('\\') !== -1) {
            this._sendError(req, res, 400);
            return;
        }

        let segments = pathname.split('/').filter(segment => segment !== '');
        let siteName = segments.shift();
        let root = siteName ? this.sites.get(siteName) : undefined;

        // Also for "/" - list of the enabled previews is not exposed
        if (!root) {
            this._sendError(req, res, 404);
            return;
        }

        let filePath = path.resolve(root, '.' + path.sep + segments.join(path.sep));

        if (!this._isInside(root, filePath)) {
            this._sendError(req, res, 403);
            return;
        }

        if (this._hasDotSegment(root, filePath)) {
            this._sendError(req, res, 404);
            return;
        }

        let stats = await this._stat(filePath);

        // No directory listings
        if (stats && stats.isDirectory()) {
            filePath = path.join(filePath, 'index.html');
            stats = await this._stat(filePath);
        }

        if (!stats || !stats.isFile() || !this._getMimeType(filePath)) {
            this._sendError(req, res, 404);
            return;
        }

        let realPath;

        try {
            realPath = await fs.promises.realpath(filePath);
        } catch (error) {
            this._sendError(req, res, 404);
            return;
        }

        // Symlink which points outside of the preview directory
        if (!this._isInside(root, realPath)) {
            this._sendError(req, res, 403);
            return;
        }

        // Symlink inside of the preview directory cannot be used to bypass the rules above
        if (this._hasDotSegment(root, realPath) || !this._getMimeType(realPath)) {
            this._sendError(req, res, 404);
            return;
        }

        this._sendFile(req, res, realPath, stats.size, this._getMimeType(filePath));
    }

    _sendFile (req, res, filePath, size, mimeType) {
        let headers = this._getHeaders({
            'Content-Type': mimeType,
            'Accept-Ranges': 'bytes'
        });
        let statusCode = 200;
        let streamOptions = {};
        let range = req.headers.range ? this._parseRange(req.headers.range, size) : null;

        if (range === false) {
            this._sendError(req, res, 416, { 'Content-Range': 'bytes */' + size });
            return;
        }

        if (range) {
            statusCode = 206;
            streamOptions = range;
            headers['Content-Range'] = 'bytes ' + range.start + '-' + range.end + '/' + size;
            headers['Content-Length'] = range.end - range.start + 1;
        } else {
            headers['Content-Length'] = size;
        }

        res.writeHead(statusCode, headers);

        if (req.method === 'HEAD' || headers['Content-Length'] === 0) {
            res.end();
            return;
        }

        pipeline(fs.createReadStream(filePath, streamOptions), res, () => {});
    }

    /**
     * Parses the Range header - required i.e. by Safari to play videos
     *
     * @returns {object|null|false} range, null - send the whole file, false - range cannot be satisfied
     */
    _parseRange (header, size) {
        let match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());

        // Malformed and multiple ranges are ignored
        if (!match || (match[1] === '' && match[2] === '')) {
            return null;
        }

        let start;
        let end;

        if (match[1] === '') {
            // Last N bytes of the file
            let suffixLength = parseInt(match[2], 10);

            if (suffixLength === 0) {
                return false;
            }

            start = Math.max(size - suffixLength, 0);
            end = size - 1;
        } else {
            start = parseInt(match[1], 10);
            end = match[2] === '' ? size - 1 : Math.min(parseInt(match[2], 10), size - 1);
        }

        if (start > end || start >= size) {
            return false;
        }

        return { start, end };
    }

    _sendError (req, res, statusCode, additionalHeaders = {}) {
        let message = STATUS_MESSAGES[statusCode] || 'Error';
        let headers = this._getHeaders(Object.assign({
            'Content-Type': 'text/plain; charset=utf-8',
            'Content-Length': Buffer.byteLength(message)
        }, additionalHeaders));

        res.writeHead(statusCode, headers);
        res.end(req.method === 'HEAD' ? undefined : message);
    }

    _getHeaders (headers) {
        return Object.assign({
            'X-Content-Type-Options': 'nosniff',
            'Cache-Control': 'no-store',
            'Referrer-Policy': 'no-referrer'
        }, headers);
    }

    // Separator protects against directories with a similar name (/preview vs /preview-secret)
    _isInside (root, filePath) {
        return filePath === root || filePath.startsWith(root + path.sep);
    }

    // Dotfiles and dot-directories (.git, .env, .DS_Store)
    _hasDotSegment (root, filePath) {
        return path.relative(root, filePath).split(path.sep).some(segment => segment[0] === '.');
    }

    _getMimeType (filePath) {
        let extension = path.extname(filePath).toLowerCase();

        if (Object.prototype.hasOwnProperty.call(MIME, extension)) {
            return MIME[extension];
        }

        return Object.prototype.hasOwnProperty.call(this.customMimeTypes, extension) ? this.customMimeTypes[extension] : null;
    }

    async _stat (filePath) {
        try {
            return await fs.promises.stat(filePath);
        } catch (error) {
            return null;
        }
    }
}

module.exports = PreviewServer;
