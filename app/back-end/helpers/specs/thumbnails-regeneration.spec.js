/*
 * Regression tests for thumbnail regeneration: the catalogs it covers, the summary shown before it starts
 * and the progress the worker reports for every image.
 * Works on temporary websites; no user data is touched.
 *
 * Run with the full test suite from the repository root: npm test
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { EventEmitter } = require('node:events');
const { fork } = require('node:child_process');
const { createRequire } = require('node:module');
const sharp = require('sharp');
const sharpQueue = require('../sharp-queue');

const appDirectory = path.resolve(__dirname, '../../..');
const siteRequire = createRequire(path.join(appDirectory, 'back-end/site.js'));
const electronPath = siteRequire.resolve('electron');

// The website model only needs the Electron shell for other operations; the real module needs its binary
require.cache[electronPath] = {
    id: electronPath,
    filename: electronPath,
    loaded: true,
    exports: {
        shell: {}
    }
};

const Site = require('../../site');

function runWorker(initialMessage) {
    return new Promise((resolve, reject) => {
        const worker = fork(path.join(appDirectory, 'back-end/workers/thumbnails/regenerate.js'), [], {
            silent: true
        });
        const progress = [];
        let output = '';
        let settled = false;
        const timeout = setTimeout(() => finish(new Error(`Worker timed out: ${output}`)), 20000);

        function finish(error, result) {
            if (settled) {
                return;
            }

            settled = true;
            clearTimeout(timeout);
            worker.kill();

            if (error) {
                reject(error);
            } else {
                resolve(result);
            }
        }

        worker.stdout.on('data', (chunk) => {
            output += chunk;
        });
        worker.stderr.on('data', (chunk) => {
            output += chunk;
        });
        worker.on('error', (error) => finish(error));
        worker.on('exit', (code, signal) => {
            if (!settled) {
                finish(new Error(`Worker exited (${code}, ${signal}): ${output}`));
            }
        });
        worker.on('message', (message) => {
            if (message.type === 'progress') {
                progress.push(message);
            } else if (message.type === 'finished') {
                finish(null, {
                    progress,
                    finished: message
                });
            }
        });
        worker.send(initialMessage);
    });
}

describe('Thumbnail regeneration', function () {
    this.timeout(30000);

    let directory;
    let inputDirectory;
    let mediaDirectory;
    let application;
    let siteConfig;
    let jpegBuffer;

    before(async function () {
        jpegBuffer = await sharp({
            create: {
                width: 120,
                height: 80,
                channels: 3,
                background: { r: 30, g: 100, b: 180 }
            }
        }).jpeg().toBuffer();
    });

    beforeEach(function () {
        directory = fs.mkdtempSync(path.join(os.tmpdir(), 'publii-thumbnails-regeneration-'));
        inputDirectory = path.join(directory, 'test-site/input');
        mediaDirectory = path.join(inputDirectory, 'media');
        const themeDirectory = path.join(inputDirectory, 'themes/test-theme');
        fs.mkdirSync(themeDirectory, { recursive: true });
        fs.mkdirSync(path.join(inputDirectory, 'config'), { recursive: true });

        siteConfig = {
            theme: 'test-theme',
            advanced: {
                responsiveImages: true,
                forceWebp: false,
                imagesQuality: 75
            }
        };
        const dimensions = {
            small: { width: 60, height: 'auto', crop: false },
            square: { width: 32, height: 32, crop: true }
        };
        const responsiveImages = {};

        for (const type of ['contentImages', 'featuredImages', 'tagImages', 'authorImages', 'optionImages']) {
            responsiveImages[type] = { dimensions };
        }

        responsiveImages.galleryImages = { dimensions: { thumbnail: dimensions.small } };

        fs.writeFileSync(path.join(themeDirectory, 'config.json'), JSON.stringify({
            name: 'Test-Theme',
            files: { responsiveImages }
        }));
        saveConfig();
        application = {
            appDir: appDirectory,
            sitesDir: directory,
            appConfig: { resizeEngine: 'sharp' }
        };
    });

    afterEach(function () {
        sharpQueue.shutdown();
        fs.rmSync(directory, { recursive: true, force: true });
    });

    function saveConfig() {
        fs.writeFileSync(path.join(inputDirectory, 'config/site.config.json'), JSON.stringify(siteConfig));
    }

    function addFile(relativePath, content = jpegBuffer) {
        const filePath = path.join(mediaDirectory, relativePath);
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(filePath, content);
        return filePath;
    }

    function createSite() {
        return new Site(application, { name: 'test-site' }, true);
    }

    function createSiteWithWorker(createWorker) {
        const module = { exports: {} };
        const source = fs.readFileSync(path.join(appDirectory, 'back-end/site.js'), 'utf8');

        vm.runInNewContext(source, {
            module,
            __dirname: path.join(appDirectory, 'back-end'),
            console,
            require(name) {
                if (name === 'better-sqlite3') {
                    return class Database {};
                }

                if (name === './helpers/db.utils.js') {
                    return class DBUtils {
                        prepare() {
                            return { all: () => [] };
                        }

                        close() {}
                    };
                }

                if (name === './helpers/ipc.helper.js') {
                    return { forkWorkerWithLogs: createWorker };
                }

                return siteRequire(name);
            }
        });

        const testApplication = {
            ...application,
            app: { getPath: () => path.join(directory, 'logs') }
        };
        return new module.exports(testApplication, { name: 'test-site' }, true);
    }

    function runSite(beforeSend = () => {}) {
        return new Promise((resolve, reject) => {
            const progress = [];
            let finished;
            let output = '';
            let worker;
            const timeout = setTimeout(() => {
                worker.kill();
                reject(new Error(`Site regeneration timed out: ${output}`));
            }, 10000);
            const site = createSiteWithWorker(() => {
                worker = fork(path.join(appDirectory, 'back-end/workers/thumbnails/regenerate.js'), [], {
                    silent: true
                });
                const send = worker.send.bind(worker);
                worker.send = message => {
                    beforeSend(message);
                    return send(message);
                };
                worker.stdout.on('data', chunk => {
                    output += chunk;
                });
                worker.stderr.on('data', chunk => {
                    output += chunk;
                });
                worker.on('error', error => {
                    clearTimeout(timeout);
                    reject(error);
                });
                worker.on('close', code => {
                    clearTimeout(timeout);

                    if (code !== 0 || !finished) {
                        reject(new Error(`Site regeneration exited without success (${code}): ${output}`));
                        return;
                    }

                    resolve({ progress, finished });
                });
                return worker;
            });

            try {
                site.regenerateThumbnails({
                    send(channel, data) {
                        if (channel.endsWith('-progress')) {
                            progress.push(data);
                        } else if (channel.endsWith('-success')) {
                            finished = data;
                        } else {
                            clearTimeout(timeout);
                            reject(new Error(JSON.stringify(data)));
                        }
                    }
                });
            } catch (error) {
                clearTimeout(timeout);

                if (worker) {
                    worker.kill();
                }

                reject(error);
            }
        });
    }

    it('lists posts, the website, tags and authors first and their galleries separately', function () {
        addFile('posts/1/a.jpg');
        addFile('posts/1/gallery/g.jpg');
        addFile('posts/2/b.jpg');
        addFile('website/logo.jpg');
        addFile('tags/3/cover.jpg');
        addFile('authors/4/avatar.jpg');
        addFile('posts/.DS_Store', 'x');

        const result = createSite().getThumbnailCatalogs(mediaDirectory);

        assert.deepEqual(result.catalogs, ['posts/1', 'posts/2', 'website', 'tags/3', 'authors/4']);
        assert.deepEqual(result.galleryCatalogs, [path.join('posts/1', 'gallery')]);
    });

    it('skips missing catalogs instead of failing', function () {
        addFile('posts/1/a.jpg');

        const result = createSite().getThumbnailCatalogs(mediaDirectory);

        assert.deepEqual(result.catalogs, ['posts/1']);
        assert.deepEqual(result.galleryCatalogs, []);
    });

    it('summarizes the images, theme and output format without changing files', function () {
        addFile('posts/1/a.jpg');
        addFile('posts/1/responsive/a-small.jpg');
        addFile('posts/1/gallery/g.jpg');
        addFile('posts/1/gallery/g-thumbnail.jpg');
        addFile('tags/3/cover.jpg');
        siteConfig.advanced.forceWebp = true;
        saveConfig();

        const summary = createSite().getThumbnailsSummary();

        assert.deepEqual(summary, {
            status: 'ready',
            theme: 'Test-Theme',
            images: 3,
            format: 'webp',
            responsiveImages: true
        });
        assert.equal(fs.existsSync(path.join(mediaDirectory, 'posts/1/responsive/a-small.jpg')), true);
        assert.equal(fs.existsSync(path.join(mediaDirectory, 'posts/1/gallery/g-thumbnail.jpg')), true);
    });

    it('reports a website without images and one without a theme', function () {
        fs.mkdirSync(path.join(mediaDirectory, 'posts'), { recursive: true });

        assert.equal(createSite().getThumbnailsSummary().status, 'no-images');

        delete siteConfig.theme;
        saveConfig();

        assert.deepEqual(createSite().getThumbnailsSummary(), { status: 'no-theme' });
    });

    it('cleans empty catalogs, including galleries queued after the last original', async function () {
        const original = addFile('posts/1/a.jpg');
        const obsolete = [
            addFile('posts/2/responsive/deleted-small.jpg'),
            addFile('website/responsive/deleted-small.webp'),
            addFile('tags/3/gallery/deleted-thumbnail.jpg'),
            addFile('authors/4/gallery/deleted-thumbnail.webp')
        ];

        const result = await runSite();

        assert.equal(result.finished.processed, 1);
        assert.equal(result.finished.total, 1);
        assert.equal(result.finished.brokenFilesCount, 0);
        obsolete.forEach(file => assert.equal(fs.existsSync(file), false));
        assert.deepEqual(fs.readFileSync(original), jpegBuffer);
        assert.equal((await sharp(path.join(mediaDirectory, 'posts/1/responsive/a-small.jpg')).metadata()).width, 60);
    });

    it('allows cleanup when a site contains only orphaned thumbnails', async function () {
        const obsolete = [
            addFile('posts/1/responsive/deleted-small.jpg'),
            addFile('posts/1/gallery/deleted-thumbnail.webp')
        ];
        const summary = createSite().getThumbnailsSummary();
        assert.equal(summary.images, 0);
        assert.equal(summary.status, 'ready');
        obsolete.forEach(file => assert.equal(fs.existsSync(file), true));

        const result = await runSite();

        assert.equal(result.progress.length, 0);
        assert.equal(result.finished.processed, 0);
        assert.equal(result.finished.total, 0);
        assert.equal(result.finished.brokenFilesCount, 0);
        obsolete.forEach(file => assert.equal(fs.existsSync(file), false));
        assert.equal(createSite().getThumbnailsSummary().status, 'no-images');
    });

    for (const removeCatalog of [false, true]) {
        it(`finishes when a queued ${removeCatalog ? 'catalog' : 'image'} disappears`, async function () {
            addFile('posts/1/a.jpg');
            const removed = addFile('posts/2/b.jpg');
            const obsolete = addFile('posts/2/responsive/b-small.jpg');

            const result = await runSite(message => {
                if (message.type === 'next-images' && message.catalog === 'posts/2') {
                    fs.rmSync(removeCatalog ? path.dirname(removed) : removed, { recursive: removeCatalog });
                }
            });

            assert.equal(result.progress.length, 1);
            assert.equal(result.finished.processed, 1);
            assert.equal(result.finished.total, 1);
            assert.equal(result.finished.brokenFilesCount, 0);
            assert.equal(fs.existsSync(obsolete), false);
        });
    }

    it('finishes when every original disappears after the initial count', async function () {
        const original = addFile('posts/1/a.jpg');
        const thumbnail = addFile('posts/1/responsive/a-small.jpg');

        const result = await runSite(message => {
            if (message.type === 'dependencies') {
                fs.unlinkSync(original);
            }
        });

        assert.equal(result.progress.length, 0);
        assert.equal(result.finished.processed, 0);
        assert.equal(result.finished.total, 0);
        assert.equal(fs.existsSync(thumbnail), false);
    });

    it('processes images added before a queued catalog is read instead of finishing early', async function () {
        addFile('posts/1/a.jpg');
        addFile('posts/2/b.jpg');

        const result = await runSite(message => {
            if (message.type === 'next-images' && message.catalog === 'posts/2') {
                addFile('posts/2/c.jpg');
                addFile('posts/2/d.jpg');
            }
        });

        assert.equal(result.progress.length, 4);
        assert.equal(result.finished.processed, 4);
        assert.equal(result.finished.total, 4);
        assert.equal(result.finished.brokenFilesCount, 0);

        for (const name of ['b', 'c', 'd']) {
            assert.equal((await sharp(path.join(mediaDirectory, `posts/2/responsive/${name}-small.jpg`)).metadata()).width, 60);
        }

        assert.ok(result.progress.slice(0, -1).every(message => message.value < 100));
        assert.equal(result.progress[result.progress.length - 1].value, 100);
    });

    it('reports every image with its counters, thumbnails and problems', async function () {
        addFile('posts/1/a.jpg');
        addFile('posts/1/b.jpg', 'not an image');
        addFile('posts/1/c.jpg');
        fs.mkdirSync(path.join(mediaDirectory, 'posts/1/responsive'), { recursive: true });

        const result = await runWorker({
            type: 'dependencies',
            context: {
                application,
                name: 'test-site',
                totalProgress: 0,
                numberOfImages: 3,
                postImagesRef: []
            },
            catalog: 'posts/1',
            mediaPath: mediaDirectory
        });

        assert.deepEqual(result.progress.map(message => message.processed), [1, 2, 3]);
        assert.deepEqual(result.progress.map(message => message.total), [3, 3, 3]);
        assert.equal(result.progress[2].value, 100);

        const byImage = Object.fromEntries(result.progress.map(message => [message.image, message]));

        assert.deepEqual(Object.keys(byImage).sort(), ['posts/1/a.jpg', 'posts/1/b.jpg', 'posts/1/c.jpg']);
        assert.equal(byImage['posts/1/a.jpg'].thumbnails, 2);
        assert.equal(byImage['posts/1/a.jpg'].broken, false);
        assert.equal(byImage['posts/1/b.jpg'].thumbnails, 0);
        assert.equal(byImage['posts/1/b.jpg'].broken, true);
        assert.equal(result.finished.brokenFilesCount, 1);
        assert.deepEqual(result.finished.brokenImages.map(item => item.image), ['posts/1/b.jpg']);
    });

    it('finishes a large catalog of skipped SVG images without overflowing the stack', async function () {
        const count = 6000;

        for (let index = 0; index < count; index++) {
            addFile(`posts/1/${index}.svg`, '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>');
        }

        const result = await runWorker({
            type: 'dependencies',
            context: {
                application,
                name: 'test-site',
                totalProgress: 0,
                numberOfImages: count,
                postImagesRef: []
            },
            catalog: 'posts/1',
            mediaPath: mediaDirectory
        });

        assert.equal(result.progress.length, count);
        assert.equal(result.progress[count - 1].processed, count);
        assert.equal(result.progress[count - 1].value, 100);
        assert.equal(result.finished.brokenFilesCount, 0);
    });

    function workerMessage(catalog, numberOfImages) {
        return {
            type: 'dependencies',
            context: {
                application,
                name: 'test-site',
                totalProgress: 0,
                numberOfImages,
                postImagesRef: []
            },
            catalog,
            mediaPath: mediaDirectory
        };
    }

    function controlledWorker(Image) {
        let receive;
        let exits = 0;
        const messages = [];
        const source = fs.readFileSync(path.join(appDirectory, 'back-end/workers/thumbnails/regenerate.js'), 'utf8');

        vm.runInNewContext(source, {
            require(name) {
                if (name === './../../image.js') {
                    return Image;
                }

                if (name === './../../helpers/utils') {
                    return siteRequire('./helpers/utils');
                }

                return siteRequire(name);
            },
            process: {
                on(event, callback) {
                    if (event === 'message') {
                        receive = callback;
                    }
                },
                send(message) {
                    messages.push(message);
                },
                exit() {
                    exits++;
                }
            },
            console: { log() {} },
            setImmediate,
            setTimeout() {}
        });

        return {
            send: message => receive(message),
            messages,
            exits: () => exits
        };
    }

    it('waits for every active catalog even after reaching the initial image count', async function () {
        const pending = [];
        const temporaryDirectory = fs.mkdtempSync(path.join(inputDirectory, '.publii-thumbnails-'));
        addFile('posts/1/a.jpg');
        addFile('posts/2/b.jpg');
        const orphan = addFile('posts/3/gallery/deleted-thumbnail.jpg');
        const worker = controlledWorker(class Image {
            allowedImageExtension() {
                return true;
            }

            createResponsiveImages(original, type, outputDirectory) {
                const destination = path.join(outputDirectory, path.parse(original).name + '-small.jpg');
                fs.writeFileSync(destination, jpegBuffer);
                return [new Promise(resolve => pending.push(() => resolve(destination)))];
            }
        });
        const message = workerMessage('posts/1', 1);
        message.context.temporaryDirectory = temporaryDirectory;
        message.context.numberOfCatalogs = 3;
        worker.send(message);
        worker.send({ type: 'next-images', catalog: 'posts/2', mediaPath: mediaDirectory });
        worker.send({ type: 'next-images', catalog: 'posts/3/gallery', mediaPath: mediaDirectory });
        assert.equal(fs.existsSync(orphan), false);

        pending[0]();
        await new Promise(resolve => setImmediate(resolve));
        assert.equal(worker.messages.some(message => message.type === 'finished'), false);

        pending[1]();
        await new Promise(resolve => setImmediate(resolve));
        const finished = worker.messages.filter(message => message.type === 'finished');
        assert.equal(finished.length, 1);
        assert.equal(finished[0].processed, 2);
        assert.equal(finished[0].total, 2);
    });

    for (const engine of ['sharp', 'jimp']) {
        it(`replaces complete thumbnails and removes obsolete sizes using ${engine}`, async function () {
            application.appConfig.resizeEngine = engine;
            addFile('posts/1/a.jpg');
            addFile('posts/1/a-small.jpg');
            const oldThumbnail = addFile('posts/1/responsive/a-small.jpg', 'old thumbnail');
            const obsolete = addFile('posts/1/responsive/a-obsolete.webp', 'old size');

            const result = await runWorker(workerMessage('posts/1', 2));

            assert.equal(result.finished.brokenFilesCount, 0);
            assert.equal(fs.existsSync(obsolete), false);
            assert.equal((await sharp(oldThumbnail).metadata()).width, 60);
            assert.equal((await sharp(path.join(mediaDirectory, 'posts/1/responsive/a-small-small.jpg')).metadata()).width, 60);
            assert.deepEqual(fs.readFileSync(path.join(mediaDirectory, 'posts/1/a.jpg')), jpegBuffer);
            assert.equal(result.progress.reduce((total, message) => total + message.thumbnails, 0), 4);
            assert.ok(result.progress.every(message => message.files.every(file => file.includes('/responsive/'))));
        });
    }

    it('preserves previous thumbnails and obsolete sizes when an image cannot be processed', async function () {
        addFile('posts/1/a.jpg', 'corrupt original');
        const thumbnail = addFile('posts/1/responsive/a-small.jpg', 'old thumbnail');
        const obsolete = addFile('posts/1/responsive/a-obsolete.jpg', 'old size');

        const result = await runWorker(workerMessage('posts/1', 1));

        assert.equal(result.finished.brokenFilesCount, 1);
        assert.equal(result.progress[0].thumbnails, 0);
        assert.equal(fs.readFileSync(thumbnail, 'utf8'), 'old thumbnail');
        assert.equal(fs.readFileSync(obsolete, 'utf8'), 'old size');
    });

    for (const catalog of ['posts/1/gallery', 'tags/2/gallery', 'authors/3/gallery']) {
        it(`preserves originals and skips existing thumbnails in ${catalog}`, async function () {
            const original = addFile(`${catalog}/a.jpg`);
            const thumbnail = addFile(`${catalog}/a-thumbnail.jpg`, 'old thumbnail');
            const obsolete = addFile(`${catalog}/a-thumbnail.webp`, 'old format');

            const result = await runWorker(workerMessage(catalog, 1));

            assert.equal(result.finished.brokenFilesCount, 0);
            assert.equal(result.progress.length, 1);
            assert.equal(result.progress[0].thumbnails, 1);
            assert.equal((await sharp(thumbnail).metadata()).width, 60);
            assert.deepEqual(fs.readFileSync(original), jpegBuffer);
            assert.equal(fs.existsSync(obsolete), false);
            assert.equal(fs.existsSync(path.join(mediaDirectory, catalog, 'a-thumbnail-thumbnail.jpg')), false);
        });
    }

    it('keeps the whole previous set if a later variant fails after an earlier one was written', async function () {
        addFile('posts/1/a.jpg');
        const thumbnail = addFile('posts/1/responsive/a-small.jpg', 'old thumbnail');
        const temporaryDirectory = fs.mkdtempSync(path.join(inputDirectory, '.publii-thumbnails-'));
        const worker = controlledWorker(class Image {
            allowedImageExtension() {
                return true;
            }

            createResponsiveImages(original, type, outputDirectory) {
                const ready = path.join(outputDirectory, 'a-small.jpg');
                fs.writeFileSync(ready, jpegBuffer);
                return [
                    Promise.resolve(ready),
                    Promise.resolve({ error: 'IMAGE_UNPROCESSABLE', file: original, message: 'Disk full' })
                ];
            }
        });
        const message = workerMessage('posts/1', 1);
        message.context.temporaryDirectory = temporaryDirectory;
        worker.send(message);
        await new Promise(resolve => setImmediate(resolve));

        assert.equal(worker.messages[0].broken, true);
        assert.equal(worker.messages[0].thumbnails, 0);
        assert.equal(fs.readFileSync(thumbnail, 'utf8'), 'old thumbnail');
        assert.deepEqual(fs.readdirSync(temporaryDirectory), []);
    });

    it('discards in-flight writes after cancel and preserves old files without starting more images', async function () {
        const pendingWrites = [];
        const temporaryDirectory = fs.mkdtempSync(path.join(inputDirectory, '.publii-thumbnails-'));
        const previous = [];

        for (const catalog of ['posts/1', 'posts/2']) {
            addFile(`${catalog}/a.jpg`);
            addFile(`${catalog}/b.jpg`);
            previous.push(addFile(`${catalog}/responsive/a-small.jpg`, 'old thumbnail'));
        }

        const worker = controlledWorker(class Image {
            allowedImageExtension() {
                return true;
            }

            createResponsiveImages(original, type, outputDirectory) {
                const filename = path.join(outputDirectory, 'a-small.jpg');
                fs.writeFileSync(filename, 'partial new image');
                return [new Promise(resolve => pendingWrites.push(() => resolve(filename)))];
            }
        });
        const message = workerMessage('posts/1', 4);
        message.context.temporaryDirectory = temporaryDirectory;
        worker.send(message);
        worker.send({ type: 'next-images', catalog: 'posts/2', mediaPath: mediaDirectory });
        assert.equal(pendingWrites.length, 2);
        previous.forEach(file => assert.equal(fs.readFileSync(file, 'utf8'), 'old thumbnail'));

        worker.send({ type: 'abort' });
        worker.send({ type: 'next-images', catalog: 'posts/3', mediaPath: mediaDirectory });
        pendingWrites[0]();
        await new Promise(resolve => setImmediate(resolve));
        assert.equal(worker.exits(), 0);

        pendingWrites[1]();
        await new Promise(resolve => setImmediate(resolve));
        assert.equal(worker.exits(), 1);
        assert.equal(pendingWrites.length, 2);
        assert.deepEqual(worker.messages, []);
        previous.forEach(file => assert.equal(fs.readFileSync(file, 'utf8'), 'old thumbnail'));
        assert.deepEqual(fs.readdirSync(temporaryDirectory), []);
    });

    it('does not clear previous thumbnails at startup and cleans staging after a forced worker exit', async function () {
        addFile('posts/1/a.jpg');
        const thumbnail = addFile('posts/1/responsive/a-small.jpg', 'old thumbnail');
        const galleryThumbnail = addFile('posts/1/gallery/g-thumbnail.jpg', 'old gallery thumbnail');
        addFile('posts/1/gallery/g.jpg');
        const worker = new EventEmitter();
        const sent = [];
        worker.send = message => sent.push(message);
        const module = { exports: {} };
        const source = fs.readFileSync(path.join(appDirectory, 'back-end/site.js'), 'utf8');

        vm.runInNewContext(source, {
            module,
            __dirname: path.join(appDirectory, 'back-end'),
            console,
            require(name) {
                if (name === 'better-sqlite3') {
                    return class Database {};
                }

                if (name === './helpers/db.utils.js') {
                    return class DBUtils {
                        prepare() {
                            return { all: () => [] };
                        }

                        close() {}
                    };
                }

                if (name === './helpers/ipc.helper.js') {
                    return { forkWorkerWithLogs: () => worker };
                }

                if (name === './helpers/site-logs.js') {
                    return { getWorkerLogsDirectory: () => directory };
                }

                return siteRequire(name);
            }
        });

        const site = new module.exports(application, { name: 'test-site' }, true);
        site.regenerateThumbnails({ send() {} });
        const temporaryDirectory = sent[0].context.temporaryDirectory;
        assert.equal(path.dirname(temporaryDirectory), inputDirectory);
        fs.writeFileSync(path.join(temporaryDirectory, 'unfinished.jpg'), 'partial image');
        assert.equal(fs.readFileSync(thumbnail, 'utf8'), 'old thumbnail');
        assert.equal(fs.readFileSync(galleryThumbnail, 'utf8'), 'old gallery thumbnail');

        worker.emit('close', null, 'SIGKILL');

        // fs.rm runs asynchronously in the parent, also after a forced worker termination.
        for (let attempt = 0; attempt < 100 && fs.existsSync(temporaryDirectory); attempt++) {
            await new Promise(resolve => setTimeout(resolve, 10));
        }

        assert.equal(fs.existsSync(temporaryDirectory), false);
        assert.equal(fs.readFileSync(thumbnail, 'utf8'), 'old thumbnail');
        assert.equal(fs.readFileSync(galleryThumbnail, 'utf8'), 'old gallery thumbnail');
    });
});
