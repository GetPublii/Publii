const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { fork } = require('node:child_process');
const { fileURLToPath } = require('node:url');
const sharp = require('sharp');

const appDirectory = path.resolve(__dirname, '../../..');
const failureFixture = path.join(__dirname, 'fixtures/unavailable-sharp.cjs');

function upload(application, source, failure, imageType = 'contentImages') {
    return new Promise((resolve, reject) => {
        const child = fork(path.join(appDirectory, 'back-end/workers/thumbnails/post-images.js'), [], {
            silent: true,
            execArgv: ['--require', failureFixture],
            env: {
                ...process.env,
                PUBLII_TEST_SHARP_FAILURE: failure
            }
        });
        let settled = false;
        let output = '';
        const timeout = setTimeout(() => finish(new Error('Upload timed out: ' + output)), 20000);

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
                imageType,
                imagesOnly: true,
                pluginDir: 'test-plugin'
            }
        });
    });
}

describe('Image upload after a native Sharp failure', function () {
    this.timeout(30000);

    let directory;
    let inputDirectory;
    let application;
    let images;

    before(async function () {
        const image = sharp({
            create: {
                width: 12,
                height: 8,
                channels: 4,
                background: { r: 30, g: 100, b: 180, alpha: 0.5 }
            }
        });
        images = {
            jpg: await image.clone().jpeg().toBuffer(),
            png: await image.clone().png().toBuffer(),
            webp: await image.clone().webp().toBuffer(),
            avif: await image.clone().avif({ effort: 2 }).toBuffer()
        };
    });

    beforeEach(function () {
        directory = fs.mkdtempSync(path.join(os.tmpdir(), 'publii-upload-fallback-'));
        inputDirectory = path.join(directory, 'test-site/input');
        const themeDirectory = path.join(inputDirectory, 'themes/test-theme');
        fs.mkdirSync(themeDirectory, { recursive: true });
        fs.mkdirSync(path.join(inputDirectory, 'config'), { recursive: true });
        const dimensions = {
            small: { width: 6, height: 'auto', crop: false },
            square: { width: 4, height: 4, crop: true }
        };
        const responsiveImages = {};

        for (const type of ['contentImages', 'featuredImages', 'tagImages', 'authorImages', 'optionImages']) {
            responsiveImages[type] = { dimensions };
        }

        responsiveImages.galleryImages = {
            dimensions: { thumbnail: dimensions.small }
        };
        fs.writeFileSync(path.join(themeDirectory, 'config.json'), JSON.stringify({
            name: 'test-theme',
            files: { responsiveImages }
        }));
        application = {
            appDir: appDirectory,
            sitesDir: directory,
            appConfig: { resizeEngine: 'sharp' }
        };
        configure();
    });

    afterEach(function () {
        fs.rmSync(directory, { recursive: true, force: true });
    });

    function configure(format = 'none', advanced = {}) {
        fs.writeFileSync(path.join(inputDirectory, 'config/site.config.json'), JSON.stringify({
            theme: 'test-theme',
            advanced: {
                responsiveImages: true,
                forceWebp: format === 'webp',
                forceAvif: format === 'avif',
                imagesQuality: 75,
                alphaQuality: 100,
                avifEffort: 2,
                ...advanced
            }
        }));
    }

    function sourceFile(name, bytes) {
        const file = path.join(directory, name);
        fs.writeFileSync(file, bytes);
        return file;
    }

    for (const failure of ['load', 'exit']) {
        for (const format of ['none', 'webp', 'avif']) {
            for (const extension of ['png', 'jpg', 'webp', 'avif']) {
                it(`${failure}: uploads ${extension} with ${format} conversion and preserves originals`, async function () {
                    configure(format);
                    const source = sourceFile('photo.' + extension, images[extension]);
                    const result = await upload(application, source, failure);
                    assert.equal(result.error, undefined, JSON.stringify(result));
                    assert.deepEqual(fs.readFileSync(result.baseImage.newPath), images[extension]);
                    assert.deepEqual(fs.readFileSync(source), images[extension]);
                    assert.deepEqual(result.baseImage.size, [12, 8]);
                    assert.equal(result.thumbnailPath.length, 2);
                    const expected = extension === 'avif' || format === 'avif'
                        ? 'avif'
                        : format === 'webp' ? 'webp' : extension;

                    for (const [index, url] of result.thumbnailPath.entries()) {
                        const file = fileURLToPath(url);
                        const metadata = await sharp(file).metadata();
                        assert.equal(path.extname(file), '.' + expected);
                        assert.equal(metadata.format, expected === 'avif' ? 'heif' : expected === 'jpg' ? 'jpeg' : expected);
                        assert.equal(metadata.width, index === 0 ? 6 : 4);
                        assert.equal(metadata.height, 4);
                        assert.equal(metadata.hasAlpha, extension !== 'jpg');
                    }

                    assert.equal(application.appConfig.resizeEngine, 'sharp');
                });
            }
        }

        it(`${failure}: rejects corrupt and renamed images before copying them`, async function () {
            for (const [name, bytes] of [
                ['broken.png', images.png.subarray(0, 40)],
                ['mismatched.jpg', images.png],
                ['document.png', Buffer.from('%PDF-1.7\nnot an image')]
            ]) {
                const source = sourceFile(name, bytes);
                const result = await upload(application, source, failure);
                assert.equal(result.error, true);
                assert.equal(result.translation, 'core.images.invalidImageFile');
                assert.equal(fs.existsSync(path.join(inputDirectory, 'media')), false);
                assert.deepEqual(fs.readFileSync(source), bytes);
            }
        });
    }

    for (const imageType of ['featuredImages', 'galleryImages', 'tagImages', 'authorImages', 'optionImages', 'pluginImages']) {
        it(`keeps ${imageType} upload available when Sharp cannot load`, async function () {
            configure('avif');
            const source = sourceFile('photo.PNG', images.png);
            const result = await upload(application, source, 'load', imageType);
            assert.equal(result.error, undefined, JSON.stringify(result));
            assert.deepEqual(fs.readFileSync(result.baseImage.newPath), images.png);

            if (imageType === 'pluginImages') {
                assert.equal(result.thumbnailPath, result.baseImage.url);
            } else {
                const metadata = await sharp(fileURLToPath(result.thumbnailPath[0])).metadata();
                assert.equal(metadata.compression, 'av1');
                assert.equal(metadata.hasAlpha, true);
            }
        });
    }

    it('keeps the original when responsive images are disabled and Sharp cannot load', async function () {
        configure('avif', { responsiveImages: false });
        const source = sourceFile('photo.png', images.png);
        const result = await upload(application, source, 'load');
        assert.equal(result.error, undefined, JSON.stringify(result));
        assert.deepEqual(fs.readFileSync(result.baseImage.newPath), images.png);
        assert.deepEqual(fs.readdirSync(path.join(path.dirname(result.baseImage.newPath), 'responsive')), []);
    });

    it('reports unavailable processing instead of an invalid image for unsupported fallback formats', async function () {
        const sources = {
            'photo.gif': await sharp(images.png).gif().toBuffer(),
            'photo.tiff': await sharp(images.png).tiff().toBuffer(),
            'logo.svg': Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="12" height="8"><rect width="12" height="8" /></svg>')
        };

        for (const [name, bytes] of Object.entries(sources)) {
            const source = sourceFile(name, bytes);
            const result = await upload(application, source, 'load');
            assert.equal(result.error, true);
            assert.equal(result.translation, 'core.images.imageUnprocessable');
            assert.equal(fs.existsSync(path.join(inputDirectory, 'media')), false);
            assert.deepEqual(fs.readFileSync(source), bytes);
        }
    });
});
