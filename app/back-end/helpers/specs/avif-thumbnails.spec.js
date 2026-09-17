const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { fork } = require('node:child_process');
const sharp = require('sharp');
const sizeOf = require('image-size');
const Image = require('../../image');
const sharpQueue = require('../sharp-queue');

const appDirectory = path.resolve(__dirname, '../../..');

function runWorker(name, initialMessage) {
    return new Promise((resolve, reject) => {
        const worker = fork(path.join(appDirectory, 'back-end/workers/thumbnails', name), [], {
            silent: true
        });
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
            if (message.type === 'image-copied') {
                worker.send({ type: 'start-regenerating' });
            } else if (message.type === 'finished') {
                finish(null, message.result || message);
            }
        });
        worker.send(initialMessage);
    });
}

describe('AVIF upload and thumbnails', function () {
    this.timeout(30000);

    let directory;
    let inputDirectory;
    let application;
    let siteConfig;
    let sourceBuffer;

    before(async function () {
        sourceBuffer = await sharp({
            create: {
                width: 120,
                height: 80,
                channels: 4,
                background: { r: 30, g: 100, b: 180, alpha: 0.5 }
            }
        }).avif().toBuffer();
    });

    beforeEach(function () {
        directory = fs.mkdtempSync(path.join(os.tmpdir(), 'publii-avif-thumbnails-'));
        inputDirectory = path.join(directory, 'test-site/input');
        const themeDirectory = path.join(inputDirectory, 'themes/test-theme');
        fs.mkdirSync(themeDirectory, { recursive: true });
        fs.mkdirSync(path.join(inputDirectory, 'config'), { recursive: true });

        siteConfig = {
            theme: 'test-theme',
            advanced: {
                responsiveImages: true,
                forceWebp: false,
                imagesQuality: 75,
                alphaQuality: 100
            }
        };
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
            dimensions: {
                thumbnail: { width: 32, height: 32, crop: true }
            }
        };

        fs.writeFileSync(path.join(themeDirectory, 'config.json'), JSON.stringify({
            name: 'test-theme',
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

    function createImage(extension = '.avif', imageType = 'contentImages') {
        const originalPath = path.join(inputDirectory, 'media/posts/1', `photo${extension}`);
        fs.mkdirSync(path.join(path.dirname(originalPath), 'responsive'), { recursive: true });
        fs.writeFileSync(originalPath, sourceBuffer);

        return new Image(application, {
            id: 1,
            site: 'test-site',
            path: originalPath,
            imageType
        });
    }

    async function assertAvif(file, width, height) {
        assert.equal(typeof file, 'string');
        const metadata = await sharp(file).metadata();
        assert.equal(metadata.format, 'heif');
        assert.equal(metadata.compression, 'av1');
        assert.equal(metadata.width, width);
        assert.equal(metadata.height, height);
        assert.equal(metadata.hasAlpha, true);
        const dimensions = sizeOf(file);
        assert.equal(dimensions.width, width);
        assert.equal(dimensions.height, height);
    }

    for (const engine of ['sharp', 'jimp']) {
        for (const forceWebp of [false, true]) {
            it(`${engine}: resizes and crops AVIF without changing its format (forceWebp=${forceWebp})`, async function () {
                application.appConfig.resizeEngine = engine;
                siteConfig.advanced.forceWebp = forceWebp;
                saveConfig();
                const image = createImage('.AVIF');
                const results = await Promise.all(image.createResponsiveImages(image.path));

                assert.equal(results.length, 3);
                await assertAvif(results[0], 60, 40);
                await assertAvif(results[1], 32, 32);
                await assertAvif(results[2], 120, 80);
                assert.ok(results.every((file) => file.endsWith('.AVIF')));
                assert.deepEqual(fs.readFileSync(image.path), sourceBuffer);
            });
        }

        it(`${engine}: uploads gallery AVIF with original and thumbnail dimensions`, async function () {
            application.appConfig.resizeEngine = engine;
            const sourcePath = path.join(directory, 'gallery.avif');
            fs.writeFileSync(sourcePath, sourceBuffer);
            const result = await runWorker('post-images.js', {
                type: 'dependencies',
                appInstance: application,
                imageData: {
                    id: 1,
                    site: 'test-site',
                    path: sourcePath,
                    imageType: 'galleryImages',
                    imagesOnly: true
                }
            });

            assert.equal(result.error, undefined);
            assert.deepEqual(result.baseImage.size, [120, 80]);
            assert.equal(result.thumbnailDimensions.width, 32);
            assert.equal(result.thumbnailDimensions.height, 32);
            await assertAvif(path.join(path.dirname(result.baseImage.newPath), 'gallery-thumbnail.avif'), 32, 32);
            assert.deepEqual(fs.readFileSync(result.baseImage.newPath), sourceBuffer);
        });
    }

    it('uses Jimp AVIF support when Sharp becomes unavailable', async function () {
        const image = createImage();
        const originalProcess = sharpQueue.process;
        sharpQueue.process = () => Promise.reject(new Error('Simulated Sharp failure'));

        try {
            const results = await Promise.all(image.createResponsiveImages(image.path));
            await assertAvif(results[0], 60, 40);
        } finally {
            sharpQueue.process = originalProcess;
        }
    });

    it('uses AVIF for featured, author, tag and theme-option thumbnails', async function () {
        const image = createImage('.AvIf');

        for (const imageType of ['featuredImages', 'authorImages', 'tagImages', 'optionImages']) {
            const results = await Promise.all(image.createResponsiveImages(image.path, imageType));
            await assertAvif(results[0], 60, 40);
            assert.ok(results[0].endsWith('.AvIf'));
        }
    });

    it('returns original AVIF dimensions when the theme has no gallery thumbnail definition', async function () {
        const themePath = path.join(inputDirectory, 'themes/test-theme/config.json');
        const theme = JSON.parse(fs.readFileSync(themePath, 'utf8'));
        theme.files.responsiveImages.galleryImages.dimensions = false;
        fs.writeFileSync(themePath, JSON.stringify(theme));
        const image = createImage();
        const result = await runWorker('post-images.js', {
            type: 'dependencies',
            appInstance: application,
            imageData: {
                id: 1,
                site: 'test-site',
                path: image.path,
                imageType: 'galleryImages',
                imagesOnly: true
            }
        });

        assert.equal(result.thumbnailDimensions.width, 120);
        assert.equal(result.thumbnailDimensions.height, 80);
        assert.equal(result.thumbnailPath, result.baseImage.url);
    });

    it('regenerates existing AVIF thumbnails through the regeneration worker', async function () {
        const image = createImage();
        const result = await runWorker('regenerate.js', {
            type: 'dependencies',
            context: {
                application,
                name: 'test-site',
                totalProgress: 0,
                numberOfImages: 1,
                postImagesRef: []
            },
            catalog: 'posts/1',
            mediaPath: path.join(inputDirectory, 'media')
        });

        assert.equal(result.brokenFilesCount, 0);
        await assertAvif(path.join(path.dirname(image.path), 'responsive/photo-small.avif'), 60, 40);
    });

    it('keeps JPEG, PNG and WebP output consistent with the WebP conversion setting', async function () {
        for (const forceWebp of [false, true]) {
            siteConfig.advanced.forceWebp = forceWebp;
            saveConfig();

            for (const extension of ['jpg', 'png', 'webp']) {
                const image = createImage(`.${extension}`);
                const format = extension === 'jpg' ? 'jpeg' : extension;
                await sharp(sourceBuffer).toFormat(format).toFile(image.path);
                const results = await Promise.all(image.createResponsiveImages(image.path));
                const metadata = await sharp(results[0]).metadata();
                assert.equal(metadata.format, forceWebp ? 'webp' : format);
                assert.equal(metadata.width, 60);
                assert.equal(metadata.height, 40);
            }
        }
    });

    for (const engine of ['sharp', 'jimp']) {
        it(`${engine}: converts JPEG, PNG and static WebP thumbnails to AVIF without changing originals`, async function () {
            application.appConfig.resizeEngine = engine;
            siteConfig.advanced.forceAvif = true;
            saveConfig();

            for (const extension of ['jpg', 'JPEG', 'png', 'webp']) {
                const image = createImage(`.${extension}`);
                const format = ['jpg', 'JPEG'].includes(extension) ? 'jpeg' : extension;
                await sharp(sourceBuffer).toFormat(format).toFile(image.path);
                const original = fs.readFileSync(image.path);
                const results = await Promise.all(image.createResponsiveImages(image.path));

                for (const [index, dimensions] of [[60, 40], [32, 32], [120, 80]].entries()) {
                    const metadata = await sharp(results[index]).metadata();
                    assert.equal(metadata.compression, 'av1');
                    assert.equal(metadata.width, dimensions[0]);
                    assert.equal(metadata.height, dimensions[1]);
                    assert.equal(metadata.hasAlpha, format !== 'jpeg');
                    assert.ok(results[index].endsWith('.avif'));
                }

                assert.deepEqual(fs.readFileSync(image.path), original);
            }
        });

        it(`${engine}: applies AVIF quality, lossless and compression effort`, async function () {
            application.appConfig.resizeEngine = engine;
            siteConfig.advanced.forceAvif = true;
            const image = createImage('.png');
            const pixels = Buffer.alloc(120 * 80 * 3);

            for (let index = 0; index < pixels.length; index++) {
                pixels[index] = (index * 31 + Math.floor(index / 113) * 53) % 256;
            }

            await sharp(pixels, {
                raw: { width: 120, height: 80, channels: 3 }
            }).png().toFile(image.path);
            const outputs = [];

            for (const [quality, effort, lossless] of [[20, 2, false], [85, 4, false], [20, 6, true]]) {
                siteConfig.advanced.avifQuality = quality;
                siteConfig.advanced.avifEffort = effort;
                siteConfig.advanced.avifLossless = lossless;
                saveConfig();
                const results = await Promise.all(image.createResponsiveImages(image.path));
                const output = fs.readFileSync(results[2]);
                outputs.push(output);
                const metadata = await sharp(output).metadata();
                assert.equal(metadata.compression, 'av1');

                if (lossless) {
                    const decoded = await sharp(output).removeAlpha().raw().toBuffer();
                    assert.deepEqual(decoded, pixels);
                }
            }

            assert.notDeepEqual(outputs[0], outputs[1]);
            assert.notDeepEqual(outputs[1], outputs[2]);
        });

        it(`${engine}: generates AVIF for galleries, featured images, authors, tags and theme options`, async function () {
            application.appConfig.resizeEngine = engine;
            siteConfig.advanced.forceAvif = true;
            saveConfig();
            const image = createImage('.png');
            await sharp(sourceBuffer).png().toFile(image.path);

            for (const imageType of ['galleryImages', 'featuredImages', 'authorImages', 'tagImages', 'optionImages']) {
                const results = await Promise.all(image.createResponsiveImages(image.path, imageType));
                const size = imageType === 'galleryImages' ? [32, 32] : [60, 40];
                await assertAvif(results[0], ...size);
                assert.ok(results[0].endsWith('.avif'));
            }
        });
    }

    it('converts to AVIF through the fallback when Sharp fails', async function () {
        siteConfig.advanced.forceAvif = true;
        saveConfig();
        const image = createImage('.png');
        await sharp(sourceBuffer).png().toFile(image.path);
        const originalProcess = sharpQueue.process;
        sharpQueue.process = () => Promise.reject(new Error('Simulated Sharp failure'));

        try {
            const results = await Promise.all(image.createResponsiveImages(image.path));
            await assertAvif(results[0], 60, 40);
        } finally {
            sharpQueue.process = originalProcess;
        }
    });

    it('uses AVIF settings when regenerating existing JPEG thumbnails', async function () {
        siteConfig.advanced.forceAvif = true;
        saveConfig();
        const image = createImage('.jpg');
        await sharp(sourceBuffer).jpeg().toFile(image.path);
        const result = await runWorker('regenerate.js', {
            type: 'dependencies',
            context: {
                application,
                name: 'test-site',
                totalProgress: 0,
                numberOfImages: 1,
                postImagesRef: []
            },
            catalog: 'posts/1',
            mediaPath: path.join(inputDirectory, 'media')
        });
        const thumbnail = path.join(path.dirname(image.path), 'responsive/photo-small.avif');
        const metadata = await sharp(thumbnail).metadata();

        assert.equal(result.brokenFilesCount, 0);
        assert.equal(metadata.compression, 'av1');
        assert.equal(metadata.width, 60);
    });

    it('removes converted and preserved WebP thumbnails after the original has already been deleted', function () {
        siteConfig.advanced.forceAvif = true;
        saveConfig();
        application.sites = { 'test-site': siteConfig };
        const image = createImage('.webp');
        const thumbnailDirectory = path.join(path.dirname(image.path), 'responsive');
        fs.unlinkSync(image.path);

        for (const name of ['post', 'page', 'author', 'tag', 'themes']) {
            const Model = require('../../' + name);
            const context = name === 'themes'
                ? new Model(application, { site: 'test-site' })
                : {
                    application,
                    site: 'test-site',
                    siteDir: path.join(directory, 'test-site')
                };
            const thumbnails = ['photo-small.avif', 'photo-small.webp'];

            for (const filename of thumbnails) {
                fs.writeFileSync(path.join(thumbnailDirectory, filename), 'thumbnail');
            }

            Model.prototype.removeResponsiveImages.call(context, image.path);

            for (const filename of thumbnails) {
                assert.equal(fs.existsSync(path.join(thumbnailDirectory, filename)), false, name + ': ' + filename);
            }
        }
    });

});
