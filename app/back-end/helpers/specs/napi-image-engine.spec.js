/*
 * Regression tests for the @napi-rs/image resize engine: thumbnail sizes and formats,
 * EXIF orientation, upload validation and the Jimp fallback when the native module fails.
 * Works on temporary websites; no user data is touched.
 *
 * Run with the full test suite from the repository root: npm test
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { fork } = require('node:child_process');
const { fileURLToPath } = require('node:url');
const sharp = require('sharp');
const Image = require('../../image');
const validate = require('../validate-image-upload');
const sharpQueue = require('../sharp-queue');
const napiImageQueue = require('../napi-image-queue');

const appDirectory = path.resolve(__dirname, '../../..');
const failureFixture = path.join(__dirname, 'fixtures/unavailable-napi.cjs');
const thumbnailSizes = [[60, 40], [32, 32], [120, 80]];

function upload(application, source, imageData = {}, failure = null) {
    return new Promise((resolve, reject) => {
        const options = { silent: true };

        if (failure) {
            options.execArgv = ['--require', failureFixture];
            options.env = { ...process.env, PUBLII_TEST_NAPI_FAILURE: failure };
        }

        const child = fork(path.join(appDirectory, 'back-end/workers/thumbnails/post-images.js'), [], options);
        let settled = false;
        let output = '';
        const timeout = setTimeout(() => finish(new Error('Upload timed out: ' + output)), 30000);

        function finish(error, result) {
            if (settled) {
                return;
            }

            settled = true;
            clearTimeout(timeout);
            child.kill();

            if (error) {
                reject(error);
            } else {
                resolve(result);
            }
        }

        child.stdout.on('data', chunk => {
            output += chunk;
        });
        child.stderr.on('data', chunk => {
            output += chunk;
        });
        child.on('error', error => finish(error));
        child.on('exit', (code, signal) => finish(new Error(`Upload exited (${code}/${signal}): ${output}`)));
        child.on('message', message => {
            if (message.type === 'image-copied') {
                child.send({ type: 'start-regenerating' });
            } else if (message.type === 'finished') {
                finish(null, message.result);
            }
        });
        child.send({
            type: 'dependencies',
            appInstance: application,
            imageData: {
                site: 'test-site',
                id: 1,
                path: source,
                imageType: 'contentImages',
                imagesOnly: true,
                ...imageData
            }
        });
    });
}

describe('@napi-rs/image resize engine', function () {
    this.timeout(60000);

    let directory;
    let inputDirectory;
    let application;
    let siteConfig;
    let pixels;
    let sources;
    let originalSharpProcess;

    before(async function () {
        // Noisy RGBA pattern without fully transparent pixels, so lossless round trips are exact.
        pixels = Buffer.alloc(120 * 80 * 4);

        for (let index = 0; index < pixels.length; index++) {
            pixels[index] = index % 4 === 3
                ? 128 + (index % 97)
                : (index * 31 + Math.floor(index / 113) * 53) % 256;
        }

        const raw = () => sharp(pixels, { raw: { width: 120, height: 80, channels: 4 } });
        sources = {
            png: await raw().png().toBuffer(),
            jpg: await raw().jpeg().toBuffer(),
            webp: await raw().webp().toBuffer(),
            avif: await raw().avif({ effort: 2 }).toBuffer()
        };
    });

    beforeEach(function () {
        directory = fs.mkdtempSync(path.join(os.tmpdir(), 'publii-napi-engine-'));
        inputDirectory = path.join(directory, 'test-site/input');
        const themeDirectory = path.join(inputDirectory, 'themes/test-theme');
        fs.mkdirSync(themeDirectory, { recursive: true });
        fs.mkdirSync(path.join(inputDirectory, 'config'), { recursive: true });
        const dimensions = {
            small: { width: 60, height: 'auto', crop: false },
            square: { width: 32, height: 32, crop: true },
            large: { width: 240, height: 'auto', crop: false }
        };
        const responsiveImages = {};

        for (const type of ['contentImages', 'featuredImages', 'tagImages', 'authorImages', 'optionImages']) {
            responsiveImages[type] = { dimensions };
        }

        responsiveImages.galleryImages = {
            dimensions: { thumbnail: { width: 32, height: 32, crop: true } }
        };
        fs.writeFileSync(path.join(themeDirectory, 'config.json'), JSON.stringify({
            name: 'test-theme',
            files: { responsiveImages }
        }));
        siteConfig = {
            theme: 'test-theme',
            advanced: {
                responsiveImages: true,
                forceWebp: false,
                forceAvif: false,
                imagesQuality: 75,
                alphaQuality: 100,
                avifEffort: 2
            }
        };
        saveConfig();
        application = {
            appDir: appDirectory,
            sitesDir: directory,
            appConfig: { resizeEngine: 'napi' }
        };
        // The selected engine must never route work through Sharp in this process.
        originalSharpProcess = sharpQueue.process;
        sharpQueue.process = () => Promise.reject(new Error('Sharp must not be used by the @napi-rs/image engine'));
    });

    afterEach(function () {
        sharpQueue.process = originalSharpProcess;
        sharpQueue.shutdown();
        napiImageQueue.shutdown();
        fs.rmSync(directory, { recursive: true, force: true });
    });

    function saveConfig() {
        fs.writeFileSync(path.join(inputDirectory, 'config/site.config.json'), JSON.stringify(siteConfig));
    }

    function createImage(name, buffer, imageType = 'contentImages') {
        const originalPath = path.join(inputDirectory, 'media/posts/1', name);
        fs.mkdirSync(path.join(path.dirname(originalPath), 'responsive'), { recursive: true });
        fs.writeFileSync(originalPath, buffer);

        return new Image(application, {
            id: 1,
            site: 'test-site',
            path: originalPath,
            imageType
        });
    }

    async function assertThumbnail(file, format, width, height, hasAlpha = null) {
        assert.equal(typeof file, 'string', JSON.stringify(file));
        const metadata = await sharp(file).metadata();
        assert.equal(metadata.format, format === 'avif' ? 'heif' : format, file);

        if (format === 'avif') {
            assert.equal(metadata.compression, 'av1', file);
        }

        assert.equal(metadata.width, width, file);
        assert.equal(metadata.height, height, file);

        if (hasAlpha !== null) {
            assert.equal(metadata.hasAlpha, hasAlpha, file);
        }

        return metadata;
    }

    for (const conversion of ['none', 'webp', 'avif']) {
        for (const extension of ['png', 'jpg', 'webp', 'avif']) {
            it(`creates ${conversion} thumbnails from ${extension} with Sharp-compatible sizes`, async function () {
                siteConfig.advanced.forceWebp = conversion === 'webp';
                siteConfig.advanced.forceAvif = conversion === 'avif';
                saveConfig();
                const image = createImage('photo.' + extension, sources[extension]);
                const results = await Promise.all(image.createResponsiveImages(image.path));
                const expected = extension === 'avif' || conversion === 'avif'
                    ? 'avif'
                    : conversion === 'webp' ? 'webp' : extension === 'jpg' ? 'jpeg' : extension;
                // Sources with transparency must keep it; JPEG sources carry no alpha to preserve.
                const hasAlpha = extension === 'jpg' ? (expected === 'jpeg' ? false : null) : true;

                assert.equal(results.length, 3);

                for (const [index, [width, height]] of thumbnailSizes.entries()) {
                    await assertThumbnail(results[index], expected, width, height, hasAlpha);
                    assert.equal(path.extname(results[index]), expected === 'jpeg' ? '.jpg' : '.' + expected);
                }

                assert.deepEqual(fs.readFileSync(image.path), sources[extension]);
            });
        }
    }

    it('bakes the EXIF orientation into thumbnails', async function () {
        const rotated = await sharp(sources.jpg).withMetadata({ orientation: 6 }).toBuffer();
        assert.equal((await sharp(rotated).metadata()).orientation, 6);
        const image = createImage('rotated.jpg', rotated);
        const results = await Promise.all(image.createResponsiveImages(image.path));

        // 120x80 pixels displayed as 80x120: "small" fits the width, "large" never enlarges.
        for (const [index, [width, height]] of [[60, 90], [32, 32], [80, 120]].entries()) {
            const metadata = await assertThumbnail(results[index], 'jpeg', width, height, false);
            assert.equal(metadata.orientation, undefined);
        }
    });

    it('keeps WebP thumbnails lossless when requested', async function () {
        siteConfig.advanced.forceWebp = true;
        siteConfig.advanced.webpLossless = true;
        saveConfig();
        const image = createImage('photo.png', sources.png);
        const results = await Promise.all(image.createResponsiveImages(image.path));

        await assertThumbnail(results[2], 'webp', 120, 80, true);
        assert.deepEqual(await sharp(results[2]).raw().toBuffer(), pixels);
    });

    it('applies the shared quality and effort to AVIF and ignores the unsupported lossless flag', async function () {
        siteConfig.advanced.forceAvif = true;
        const image = createImage('photo.png', sources.png);
        const outputs = [];

        for (const [quality, effort, lossless] of [[20, 2, false], [85, 6, false], [85, 2, true]]) {
            siteConfig.advanced.imagesQuality = quality;
            siteConfig.advanced.avifEffort = effort;
            siteConfig.advanced.avifLossless = lossless;
            saveConfig();
            const results = await Promise.all(image.createResponsiveImages(image.path));
            await assertThumbnail(results[2], 'avif', 120, 80, true);
            outputs.push(fs.readFileSync(results[2]));
        }

        assert.ok(outputs[0].length < outputs[1].length);
        assert.ok(outputs[2].length > 0);
    });

    it('uploads and validates gallery images through the worker', async function () {
        const source = path.join(directory, 'gallery.webp');
        fs.writeFileSync(source, sources.webp);
        const result = await upload(application, source, { imageType: 'galleryImages' });

        assert.equal(result.error, undefined, JSON.stringify(result));
        assert.deepEqual(result.baseImage.size, [120, 80]);
        assert.equal(result.thumbnailDimensions.width, 32);
        assert.equal(result.thumbnailDimensions.height, 32);
        await assertThumbnail(path.join(path.dirname(result.baseImage.newPath), 'gallery-thumbnail.webp'), 'webp', 32, 32, true);
        assert.deepEqual(fs.readFileSync(result.baseImage.newPath), sources.webp);
    });

    it('rejects renamed and damaged uploads before copying them', async function () {
        for (const [name, bytes] of [
            ['renamed.jpg', Buffer.from('%PDF-1.7\nnot an image')],
            ['mismatched.png', sources.jpg],
            ['broken.png', sources.png.subarray(0, 40)]
        ]) {
            const source = path.join(directory, name);
            fs.writeFileSync(source, bytes);
            const result = await upload(application, source);

            assert.equal(result.error, true, name);
            assert.equal(result.translation, 'core.images.invalidImageFile', name);
            assert.equal(fs.existsSync(path.join(inputDirectory, 'media')), false, name);
            assert.deepEqual(fs.readFileSync(source), bytes);
        }
    });

    describe('upload validation', function () {
        it('decodes supported formats and renders SVG without modifying the files', async function () {
            const tiff = await sharp(sources.png).tiff().toBuffer();
            const valid = {
                'photo.png': sources.png,
                'PHOTO.JPG': sources.jpg,
                'photo.jpeg': await sharp(sources.jpg).jpeg({ progressive: true }).toBuffer(),
                'oriented.jpg': await sharp(sources.jpg).withMetadata({ orientation: 6 }).toBuffer(),
                'photo.webp': sources.webp,
                'photo.avif': sources.avif,
                'photo.tiff': tiff,
                'PHOTO.TIF': tiff,
                'logo.svg': Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><rect width="20" height="20" /></svg>'),
                'photo.gif': Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64')
            };

            for (const [name, buffer] of Object.entries(valid)) {
                const file = path.join(directory, name);
                fs.writeFileSync(file, buffer);
                await validate(file, 'napi');
                assert.deepEqual(fs.readFileSync(file), buffer, name);
            }

            assert.equal(fs.readdirSync(directory).length, Object.keys(valid).length);
        });

        it('rejects documents, renamed files and damaged image contents', async function () {
            const tiff = await sharp(sources.png).tiff().toBuffer();
            const invalid = {
                'document.pdf': Buffer.from('%PDF-1.7\nnot an image'),
                'renamed.jpg': Buffer.from('%PDF-1.7\nnot an image'),
                'renamed.avif': Buffer.from('%PDF-1.7\nnot an image'),
                'renamed.tif': Buffer.from('%PDF-1.7\nnot an image'),
                'archive.png': Buffer.from('PK\x03\x04not an image'),
                'mismatched.jpg': sources.png,
                'mismatched.avif': sources.png,
                'mismatched.tiff': sources.png,
                'mismatched.webp': sources.png,
                'broken.tiff': tiff.subarray(0, 40),
                'broken.png': sources.png.subarray(0, 40),
                'broken.svg': Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><path></svg>'),
                'html.svg': Buffer.from('<html><svg width="20" height="20"></svg></html>'),
                'empty.gif': Buffer.alloc(0)
            };

            for (const [name, buffer] of Object.entries(invalid)) {
                const file = path.join(directory, name);
                fs.writeFileSync(file, buffer);
                await assert.rejects(validate(file, 'napi'), name);
                assert.deepEqual(fs.readFileSync(file), buffer, name);
            }

            fs.mkdirSync(path.join(directory, 'folder.png'));
            await assert.rejects(validate(path.join(directory, 'folder.png'), 'napi'));
            await assert.rejects(validate(path.join(directory, 'missing.png'), 'napi'));
        });

        it('validates with Jimp when the native worker is unavailable', async function () {
            const originalProcess = napiImageQueue.process;
            napiImageQueue.process = () => Promise.reject(Object.assign(new Error('Native worker unavailable'), {
                code: 'NAPI_UNAVAILABLE'
            }));

            try {
                for (const [name, buffer] of Object.entries({
                    'photo.png': sources.png,
                    'photo.jpg': sources.jpg,
                    'photo.webp': sources.webp,
                    'photo.avif': sources.avif
                })) {
                    const file = path.join(directory, name);
                    fs.writeFileSync(file, buffer);
                    await validate(file, 'napi');
                }

                const renamed = path.join(directory, 'renamed.jpg');
                fs.writeFileSync(renamed, sources.png);
                await assert.rejects(validate(renamed, 'napi'), /Invalid image contents/);

                for (const name of ['image.tiff', 'image.svg']) {
                    const file = path.join(directory, name);
                    fs.writeFileSync(file, 'not an image');
                    await assert.rejects(validate(file, 'napi'), { code: 'NAPI_UNAVAILABLE' });
                }
            } finally {
                napiImageQueue.process = originalProcess;
            }
        });
    });

    describe('Jimp fallback', function () {
        for (const failure of ['load', 'exit']) {
            it(`${failure}: generates thumbnails with Jimp when the native worker fails`, async function () {
                siteConfig.advanced.forceAvif = true;
                saveConfig();
                const source = path.join(directory, 'photo.png');
                fs.writeFileSync(source, sources.png);
                const result = await upload(application, source, {}, failure);

                assert.equal(result.error, undefined, JSON.stringify(result));
                assert.equal(result.thumbnailPath.length, 3);

                for (const [index, url] of result.thumbnailPath.entries()) {
                    const [width, height] = thumbnailSizes[index];
                    await assertThumbnail(fileURLToPath(url), 'avif', width, height, true);
                }

                assert.deepEqual(fs.readFileSync(result.baseImage.newPath), sources.png);
                assert.equal(application.appConfig.resizeEngine, 'napi');
            });

            it(`${failure}: still rejects renamed uploads`, async function () {
                const source = path.join(directory, 'renamed.jpg');
                fs.writeFileSync(source, sources.png);
                const result = await upload(application, source, {}, failure);

                assert.equal(result.error, true);
                assert.equal(result.translation, 'core.images.invalidImageFile');
                assert.equal(fs.existsSync(path.join(inputDirectory, 'media')), false);
            });
        }

        it('switches to Jimp when a job fails while processing', async function () {
            const originalProcess = napiImageQueue.process;
            napiImageQueue.process = () => Promise.reject(new Error('Simulated @napi-rs/image failure'));

            try {
                const image = createImage('photo.png', sources.png);
                const results = await Promise.all(image.createResponsiveImages(image.path));
                await assertThumbnail(results[0], 'png', 60, 40, true);
                await assertThumbnail(results[1], 'png', 32, 32, true);
            } finally {
                napiImageQueue.process = originalProcess;
            }
        });
    });
});
