const assert = require('node:assert/strict');
const fs = require('fs-extra');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const PreviewServer = require('../preview-server.js');

describe('Preview server', function () {
    let baseDir;
    let previewDir;
    let otherPreviewDir;
    let server;
    let port;
    let symlinkCreated;

    // Paths are sent as they are - without the normalization done by browsers
    function request (requestPath, options = {}) {
        return new Promise((resolve, reject) => {
            let req = http.request({
                host: '127.0.0.1',
                port: options.port || port,
                method: options.method || 'GET',
                path: requestPath,
                headers: options.headers || {}
            }, res => {
                let chunks = [];
                res.on('data', chunk => chunks.push(chunk));
                res.on('end', () => resolve({
                    status: res.statusCode,
                    headers: res.headers,
                    body: Buffer.concat(chunks).toString('utf8')
                }));
            });

            req.on('error', reject);
            req.end();
        });
    }

    function listenOnRandomPort () {
        return new Promise(resolve => {
            let blocker = http.createServer(() => {});
            blocker.listen(0, '127.0.0.1', () => resolve(blocker));
        });
    }

    beforeEach(async function () {
        baseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'publii-preview-server-'));
        previewDir = path.join(baseDir, 'sites', 'my-site', 'preview');
        otherPreviewDir = path.join(baseDir, 'sites', 'other-site', 'preview');

        fs.outputFileSync(path.join(previewDir, 'index.html'), '<h1>Homepage</h1>');
        fs.outputFileSync(path.join(previewDir, 'dir', 'index.html'), '<h1>Subpage</h1>');
        fs.outputFileSync(path.join(previewDir, 'style.css'), 'body { color: red; }');
        fs.outputFileSync(path.join(previewDir, 'obrazek.png'), 'PNG');
        fs.outputFileSync(path.join(previewDir, 'feed.json'), '{"items":[]}');
        fs.outputFileSync(path.join(previewDir, 'video.mp4'), '0123456789');
        fs.outputFileSync(path.join(previewDir, '.secret'), 'secret');
        fs.outputFileSync(path.join(previewDir, '.git', 'config'), 'secret');
        fs.outputFileSync(path.join(previewDir, 'config.bak'), 'secret');
        fs.outputFileSync(path.join(baseDir, 'sites', 'my-site', 'preview-secret', 'index.html'), 'secret');
        fs.outputFileSync(path.join(baseDir, 'package.json'), 'secret');
        fs.outputFileSync(path.join(baseDir, 'outside.html'), 'secret');
        fs.outputFileSync(path.join(otherPreviewDir, 'index.html'), '<h1>Other website</h1>');

        try {
            fs.symlinkSync(path.join(baseDir, 'outside.html'), path.join(previewDir, 'link.html'));
            fs.symlinkSync(path.join(previewDir, '.secret'), path.join(previewDir, 'inner-link.html'));
            symlinkCreated = true;
        } catch (error) {
            // Windows without the permission to create symlinks
            symlinkCreated = false;
        }

        server = new PreviewServer();
        await server.enableSite('my-site', previewDir, { port: 0 });
        port = server.getState().port;
    });

    afterEach(async function () {
        await server.stop();
        fs.removeSync(baseDir);
    });

    describe('serving files', function () {
        it('serves files of the website with the enabled preview', async function () {
            let response = await request('/my-site/index.html');

            assert.equal(response.status, 200);
            assert.equal(response.headers['content-type'], 'text/html; charset=utf-8');
            assert.equal(response.body, '<h1>Homepage</h1>');

            response = await request('/my-site/style.css');
            assert.equal(response.status, 200);
            assert.equal(response.headers['content-type'], 'text/css; charset=utf-8');

            response = await request('/my-site/feed.json?v=123');
            assert.equal(response.status, 200);
            assert.equal(response.headers['content-type'], 'application/json; charset=utf-8');
        });

        it('serves index.html for directories', async function () {
            assert.equal((await request('/my-site/')).body, '<h1>Homepage</h1>');
            assert.equal((await request('/my-site')).body, '<h1>Homepage</h1>');
            assert.equal((await request('/my-site/dir')).body, '<h1>Subpage</h1>');
            assert.equal((await request('/my-site/dir/')).body, '<h1>Subpage</h1>');
            assert.equal((await request('/my-site/dir/nieistniejacy/')).status, 404);
        });

        it('answers HEAD requests without a body', async function () {
            let response = await request('/my-site/index.html', { method: 'HEAD' });

            assert.equal(response.status, 200);
            assert.equal(response.headers['content-length'], String('<h1>Homepage</h1>'.length));
            assert.equal(response.body, '');
        });

        it('adds the security headers', async function () {
            for (let requestPath of ['/my-site/index.html', '/my-site/missing.html']) {
                let response = await request(requestPath);

                assert.equal(response.headers['x-content-type-options'], 'nosniff');
                assert.equal(response.headers['cache-control'], 'no-store');
                assert.equal(response.headers['referrer-policy'], 'no-referrer');
            }
        });

        it('rejects methods other than GET and HEAD', async function () {
            for (let method of ['POST', 'PUT', 'DELETE', 'OPTIONS']) {
                let response = await request('/my-site/', { method });

                assert.equal(response.status, 405);
                assert.equal(response.headers.allow, 'GET, HEAD');
            }
        });
    });

    describe('access outside of the preview directory', function () {
        it('blocks path traversal', async function () {
            let paths = [
                '/my-site/../package.json',
                '/my-site/../../package.json',
                '/my-site/%2e%2e/%2e%2e/package.json',
                '/my-site/%2e%2e/%2e%2e/etc/passwd',
                '/my-site/a/../../x',
                '/my-site/a/../../../package.json',
                '/../package.json',
                '/my-site//../../package.json'
            ];

            for (let requestPath of paths) {
                let response = await request(requestPath);

                assert.ok([403, 404].includes(response.status), requestPath + ' returned ' + response.status);
                assert.notEqual(response.body, 'secret');
            }
        });

        it('blocks directories with a similar name', async function () {
            let response = await request('/my-site/../preview-secret/index.html');

            assert.equal(response.status, 403);
            assert.notEqual(response.body, 'secret');
        });

        it('rejects backslashes, null bytes and malformed paths', async function () {
            assert.equal((await request('/my-site/..%5c..%5cwindows')).status, 400);
            assert.equal((await request('/my-site/index.html%00.png')).status, 400);
            assert.equal((await request('/my-site/%E0%A4%A')).status, 400);
        });

        it('blocks symlinks which point outside of the preview directory', async function () {
            if (!symlinkCreated) {
                this.skip();
            }

            let response = await request('/my-site/link.html');

            assert.equal(response.status, 403);
            assert.notEqual(response.body, 'secret');
        });

        it('does not serve dotfiles - also through symlinks', async function () {
            assert.equal((await request('/my-site/.secret')).status, 404);
            assert.equal((await request('/my-site/.git/config')).status, 404);
            assert.equal((await request('/my-site/.git/')).status, 404);

            if (symlinkCreated) {
                assert.equal((await request('/my-site/inner-link.html')).status, 404);
            }
        });

        it('does not serve files outside of the allow-list', async function () {
            let response = await request('/my-site/config.bak');

            assert.equal(response.status, 404);
            assert.notEqual(response.body, 'secret');
        });
    });

    describe('foreign origins', function () {
        it('rejects requests with a foreign Host header', async function () {
            for (let host of ['evil.example', 'evil.example:' + port, 'localhost:' + port, '127.0.0.1']) {
                let response = await request('/my-site/index.html', { headers: { Host: host } });
                assert.equal(response.status, 403, host);
            }
        });

        it('rejects cross-site requests', async function () {
            let response = await request('/my-site/', { headers: { 'Sec-Fetch-Site': 'cross-site' } });
            assert.equal(response.status, 403);

            response = await request('/my-site/', { headers: { 'Sec-Fetch-Site': 'none' } });
            assert.equal(response.status, 200);
        });

        it('does not let the previewed websites register service workers', async function () {
            fs.outputFileSync(path.join(previewDir, 'sw.js'), 'self.addEventListener("fetch", () => {});');

            let response = await request('/my-site/sw.js', { headers: { 'Service-Worker': 'script' } });
            assert.equal(response.status, 403);

            response = await request('/my-site/sw.js');
            assert.equal(response.status, 200);
        });
    });

    describe('websites', function () {
        it('does not expose websites without the enabled preview', async function () {
            assert.equal((await request('/other-site/index.html')).status, 404);
            assert.equal((await request('/')).status, 404);
            assert.equal((await request('/unknown/')).status, 404);
        });

        it('serves many websites on the same port', async function () {
            let url = await server.enableSite('other-site', otherPreviewDir, { port: 0 });

            assert.equal(url, 'http://127.0.0.1:' + port + '/other-site');
            assert.equal((await request('/other-site/')).body, '<h1>Other website</h1>');
            assert.equal((await request('/my-site/')).body, '<h1>Homepage</h1>');
            assert.deepEqual(server.getState().sites.map(site => site.name), ['my-site', 'other-site']);
        });

        it('does not serve a website through the path of another one', async function () {
            await server.enableSite('other-site', otherPreviewDir);

            assert.equal((await request('/my-site/../other-site/index.html')).status, 403);
        });

        it('stops serving the website with the disabled preview', async function () {
            await server.enableSite('other-site', otherPreviewDir);
            await server.disableSite('other-site');

            assert.equal((await request('/other-site/')).status, 404);
            assert.equal((await request('/my-site/')).status, 200);
            assert.equal(server.getState().running, true);
        });

        it('rejects invalid website names and missing directories', async function () {
            await assert.rejects(server.enableSite('../my-site', previewDir));
            await assert.rejects(server.enableSite('missing-site', path.join(baseDir, 'missing')));
            await assert.rejects(server.enableSite('file-site', path.join(previewDir, 'index.html')));
            assert.deepEqual(server.getState().sites.map(site => site.name), ['my-site']);
        });
    });

    describe('lifecycle', function () {
        it('stops when the last preview is disabled', async function () {
            let states = [];
            server.on('state-changed', state => states.push(state));

            await server.disableSite('my-site');

            assert.deepEqual(server.getState(), { running: false, port: null, requestedPort: null, sites: [] });
            assert.equal(states.length, 1);
            assert.equal(states[0].running, false);
            await assert.rejects(request('/my-site/'));
        });

        it('stops with all previews on demand', async function () {
            await server.enableSite('other-site', otherPreviewDir);
            await server.stop();

            assert.equal(server.getState().running, false);
            assert.equal(server.isSiteEnabled('my-site'), false);
            await assert.rejects(request('/my-site/'));
        });

        it('starts again after it was stopped', async function () {
            await server.stop();
            let url = await server.enableSite('my-site', previewDir, { port: 0 });

            port = server.getState().port;
            assert.equal(url, 'http://127.0.0.1:' + port + '/my-site');
            assert.equal((await request('/my-site/')).status, 200);
        });

        it('fails when the requested port is busy', async function () {
            let blocker = await listenOnRandomPort();
            let busyPort = blocker.address().port;

            try {
                await server.stop();
                await assert.rejects(server.enableSite('my-site', previewDir, { port: busyPort }), { code: 'EADDRINUSE' });
                assert.equal(server.getState().running, false);
                assert.equal(server.isSiteEnabled('my-site'), false);
            } finally {
                blocker.close();
            }
        });

        it('can use a random port when the requested port is busy', async function () {
            let blocker = await listenOnRandomPort();
            let busyPort = blocker.address().port;

            try {
                await server.stop();
                await server.enableSite('my-site', previewDir, { port: busyPort, portFallback: true });
                port = server.getState().port;

                assert.notEqual(port, busyPort);
                assert.equal(server.getState().requestedPort, busyPort);
                assert.equal((await request('/my-site/')).status, 200);
            } finally {
                blocker.close();
            }
        });

        it('validates ports set by the user', function () {
            assert.equal(PreviewServer.isValidPort(3000), true);
            assert.equal(PreviewServer.isValidPort(65535), true);
            assert.equal(PreviewServer.isValidPort(80), false);
            assert.equal(PreviewServer.isValidPort(65536), false);
            assert.equal(PreviewServer.isValidPort('3000'), false);
            assert.equal(PreviewServer.isValidPort(3000.5), false);
        });

        it('recognizes only addresses of the local preview server', function () {
            assert.equal(PreviewServer.isPreviewUrl('http://127.0.0.1:3000/my-site'), true);
            assert.equal(PreviewServer.isPreviewUrl('http://127.0.0.1:3000/my-site/preview.html'), true);
            assert.equal(PreviewServer.isPreviewUrl('http://127.0.0.1:3000/site@name'), true);
            assert.equal(PreviewServer.isPreviewUrl('http://127.0.0.1:1@example.com/my-site'), false);
            assert.equal(PreviewServer.isPreviewUrl('http://127.0.0.1:pass@example.com:3000/my-site'), false);
            assert.equal(PreviewServer.isPreviewUrl('http://user@127.0.0.1:3000/my-site'), false);
            assert.equal(PreviewServer.isPreviewUrl('http://127.0.0.1.example.com:3000/my-site'), false);
            assert.equal(PreviewServer.isPreviewUrl('http://127.0.0.1/my-site'), false);
            assert.equal(PreviewServer.isPreviewUrl('https://127.0.0.1:3000/my-site'), false);
            assert.equal(PreviewServer.isPreviewUrl('http://localhost:3000/my-site'), false);
            assert.equal(PreviewServer.isPreviewUrl('file:///my-site/index.html'), false);
            assert.equal(PreviewServer.isPreviewUrl('not an url'), false);
            assert.equal(PreviewServer.isPreviewUrl(false), false);
            assert.equal(PreviewServer.isPreviewUrl(null), false);
        });
    });

    describe('ranges', function () {
        it('serves a part of the file', async function () {
            let response = await request('/my-site/video.mp4', { headers: { Range: 'bytes=2-5' } });

            assert.equal(response.status, 206);
            assert.equal(response.headers['content-range'], 'bytes 2-5/10');
            assert.equal(response.headers['content-length'], '4');
            assert.equal(response.body, '2345');
        });

        it('supports open and suffix ranges', async function () {
            let response = await request('/my-site/video.mp4', { headers: { Range: 'bytes=7-' } });
            assert.equal(response.status, 206);
            assert.equal(response.body, '789');

            response = await request('/my-site/video.mp4', { headers: { Range: 'bytes=-3' } });
            assert.equal(response.status, 206);
            assert.equal(response.headers['content-range'], 'bytes 7-9/10');
            assert.equal(response.body, '789');

            response = await request('/my-site/video.mp4', { headers: { Range: 'bytes=5-100' } });
            assert.equal(response.status, 206);
            assert.equal(response.body, '56789');
        });

        it('rejects ranges which cannot be satisfied', async function () {
            for (let range of ['bytes=10-', 'bytes=20-30', 'bytes=5-2', 'bytes=-0']) {
                let response = await request('/my-site/video.mp4', { headers: { Range: range } });

                assert.equal(response.status, 416, range);
                assert.equal(response.headers['content-range'], 'bytes */10');
            }
        });

        it('ignores malformed and multiple ranges', async function () {
            for (let range of ['bytes=0-1,3-4', 'items=0-1', 'bytes=a-b']) {
                let response = await request('/my-site/video.mp4', { headers: { Range: range } });

                assert.equal(response.status, 200, range);
                assert.equal(response.body, '0123456789');
            }
        });

        it('announces the support of ranges', async function () {
            let response = await request('/my-site/video.mp4', { method: 'HEAD' });
            assert.equal(response.headers['accept-ranges'], 'bytes');
        });
    });
});
