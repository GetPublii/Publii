const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const sharp = require('sharp');
const validate = require('../validate-image-upload');
const sharpQueue = require('../sharp-queue');

const repo = path.resolve(__dirname, '../../../..');

describe('Image-only upload validation', function () {
    this.timeout(15000);

    let directory;

    beforeEach(function () {
        directory = fs.mkdtempSync(path.join(os.tmpdir(), 'publii-image-validation-'));
    });

    afterEach(function () {
        sharpQueue.shutdown();
        fs.rmSync(directory, { recursive: true, force: true });
    });

    it('accepts supported images including AVIF and TIFF without modifying the originals', async function () {
        const png = await sharp({
            create: {
                width: 3,
                height: 2,
                channels: 3,
                background: '#336699'
            }
        }).png().toBuffer();
        const jpeg = await sharp(png).jpeg().toBuffer();
        const webp = await sharp(png).webp().toBuffer();
        const avif = await sharp(png).avif().toBuffer();
        const tiff = await sharp(png).tiff().toBuffer();
        const valid = {
            'photo.png': png,
            'PHOTO.JPG': jpeg,
            'photo.jpeg': jpeg,
            'photo.webp': webp,
            'photo.avif': avif,
            'UPPERCASE.AVIF': avif,
            'photo.tiff': tiff,
            'PHOTO.TIF': tiff,
            'photo.gif': Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64'),
            'logo.svg': Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><rect width="20" height="20" /></svg>')
        };

        for (const [name, buffer] of Object.entries(valid)) {
            const file = path.join(directory, name);
            fs.writeFileSync(file, buffer);
            await validate(file);
            assert.deepEqual(fs.readFileSync(file), buffer, name);
        }

        assert.equal(fs.readdirSync(directory).length, Object.keys(valid).length);
    });

    it('rejects documents, renamed files and damaged image contents', async function () {
        const png = await sharp({
            create: {
                width: 3,
                height: 2,
                channels: 3,
                background: '#336699'
            }
        }).png().toBuffer();
        const avif = await sharp(png).avif().toBuffer();
        const tiff = await sharp(png).tiff().toBuffer();
        const invalid = {
            'document.pdf': Buffer.from('%PDF-1.7\nnot an image'),
            'renamed.jpg': Buffer.from('%PDF-1.7\nnot an image'),
            'renamed.avif': Buffer.from('%PDF-1.7\nnot an image'),
            'renamed.tif': Buffer.from('%PDF-1.7\nnot an image'),
            'archive.png': Buffer.from('PK\x03\x04not an image'),
            'mismatched.jpg': png,
            'mismatched.avif': png,
            'mismatched.tiff': png,
            'broken.avif': avif.subarray(0, avif.length - 10),
            'broken.tiff': tiff.subarray(0, 40),
            'broken.png': png.subarray(0, 40),
            'broken.svg': Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><path></svg>'),
            'html.svg': Buffer.from('<html><svg width="20" height="20"></svg></html>'),
            'empty.gif': Buffer.alloc(0)
        };

        for (const [name, buffer] of Object.entries(invalid)) {
            const file = path.join(directory, name);
            fs.writeFileSync(file, buffer);
            await assert.rejects(validate(file), name);
        }

        fs.mkdirSync(path.join(directory, 'folder.png'));
        await assert.rejects(validate(path.join(directory, 'folder.png')));
        await assert.rejects(validate(path.join(directory, 'missing.png')));
        await assert.rejects(validate(null));
    });

    it('validates before saving and preserves unrestricted upload paths', async function () {
        const workerSource = fs.readFileSync(path.join(repo, 'app/back-end/workers/thumbnails/post-images.js'), 'utf8');
        const file = path.join(directory, 'renamed.jpg');
        fs.writeFileSync(file, '%PDF-1.7\nnot an image');

        for (const [resizeEngine, imagesOnly, imageType, mustReject] of [
            ['sharp', true, 'optionImages', true],
            ['sharp', true, 'featuredImages', true],
            ['sharp', true, 'contentImages', true],
            ['sharp', true, 'tagImages', true],
            ['sharp', true, 'authorImages', true],
            ['sharp', false, 'galleryImages', true],
            ['sharp', false, 'optionImages', false],
            ['sharp', false, 'pluginImages', false],
            ['jimp', true, 'optionImages', false],
            ['jimp', true, 'featuredImages', false],
            ['jimp', true, 'contentImages', false],
            ['jimp', true, 'tagImages', false],
            ['jimp', true, 'authorImages', false],
            ['jimp', false, 'galleryImages', false]
        ]) {
            let handler;
            let saves = 0;
            const sent = [];
            const context = {
                require(name) {
                    if (name === './../../image.js') {
                        return class {
                            save() {
                                saves++;
                                return {};
                            }
                        };
                    }

                    if (name === '../../helpers/validate-image-upload.js') {
                        return validate;
                    }

                    if (name === 'normalize-path') {
                        return value => value;
                    }

                    return require(name);
                },
                process: {
                    on(event, callback) {
                        handler = callback;
                    },
                    send(message) {
                        sent.push(message);
                    },
                    exit() {}
                },
                setTimeout() {},
                console
            };

            vm.runInNewContext(workerSource, context);
            await handler({
                type: 'dependencies',
                appInstance: {
                    appConfig: {
                        resizeEngine
                    }
                },
                imageData: {
                    imagesOnly,
                    imageType,
                    path: file
                }
            });

            assert.equal(saves, mustReject ? 0 : 1);
            assert.equal(sent.length, mustReject ? 1 : 0);

            if (mustReject) {
                assert.equal(sent[0].result.error, true);
                assert.equal(sent[0].result.translation, 'core.images.invalidImageFile');
            }
        }
    });

    it('keeps the existing Sharp thumbnail operation working', async function () {
        const originalPath = path.join(directory, 'original.png');
        const destinationPath = path.join(directory, 'thumbnail.jpg');
        await sharp({
            create: {
                width: 12,
                height: 8,
                channels: 3,
                background: '#336699'
            }
        }).png().toFile(originalPath);

        const result = await sharpQueue.process({
            originalPath,
            destinationPath,
            format: 'jpeg',
            width: 6,
            height: 4,
            imagesQuality: 80
        });
        const metadata = await sharp(destinationPath).metadata();

        assert.equal(result, destinationPath);
        assert.equal(metadata.format, 'jpeg');
        assert.equal(metadata.width, 6);
        assert.equal(metadata.height, 4);
    });

    describe('validation fallback', function () {
        let originalProcess;

        beforeEach(function () {
            originalProcess = sharpQueue.process;
            sharpQueue.process = () => Promise.reject(Object.assign(new Error('Native worker unavailable'), {
                code: 'SHARP_UNAVAILABLE'
            }));
        });

        afterEach(function () {
            sharpQueue.process = originalProcess;
        });

        it('decodes supported formats and checks their real MIME type without writing files', async function () {
            const base = sharp({
                create: {
                    width: 12,
                    height: 8,
                    channels: 4,
                    background: { r: 30, g: 100, b: 180, alpha: 0.5 }
                }
            });
            const valid = {
                'photo.PNG': await base.clone().png().toBuffer(),
                'photo.JPG': await base.clone().jpeg().toBuffer(),
                'photo.jpeg': await base.clone().jpeg({ progressive: true }).toBuffer(),
                'cmyk.jpeg': await base.clone().toColourspace('cmyk').jpeg().toBuffer(),
                'oriented.jpeg': await base.clone().withMetadata({ orientation: 6 }).jpeg().toBuffer(),
                'photo.WEBP': await base.clone().webp().toBuffer(),
                'photo.AVIF': await base.clone().avif({ effort: 2 }).toBuffer()
            };

            for (const [name, bytes] of Object.entries(valid)) {
                const file = path.join(directory, name);
                fs.writeFileSync(file, bytes);
                await validate(file);
                assert.deepEqual(fs.readFileSync(file), bytes);
            }

            assert.equal(fs.readdirSync(directory).length, Object.keys(valid).length);

            for (const extension of ['jpg', 'webp', 'avif']) {
                const renamed = path.join(directory, 'renamed.' + extension);
                fs.writeFileSync(renamed, valid['photo.PNG']);
                await assert.rejects(validate(renamed), /Invalid image contents/);
            }
        });

        it('rejects damaged image data, empty files and non-images when Sharp is unavailable', async function () {
            const base = sharp({
                create: {
                    width: 12,
                    height: 8,
                    channels: 3,
                    background: '#336699'
                }
            });
            const invalid = {
                'empty.png': Buffer.alloc(0),
                'pdf.png': Buffer.from('%PDF-1.7\nnot an image'),
                'zip.jpg': Buffer.from('PK\x03\x04not an image'),
                'broken.png': (await base.clone().png().toBuffer()).subarray(0, 40),
                'broken.jpg': (await base.clone().jpeg().toBuffer()).subarray(0, 35),
                'broken.webp': (await base.clone().webp().toBuffer()).subarray(0, 25),
                'broken.avif': (await base.clone().avif({ effort: 2 }).toBuffer()).subarray(0, 35)
            };

            for (const [name, bytes] of Object.entries(invalid)) {
                const file = path.join(directory, name);
                fs.writeFileSync(file, bytes);
                await assert.rejects(validate(file), name);
                assert.deepEqual(fs.readFileSync(file), bytes);
            }
        });

        it('does not reinterpret an ordinary Sharp validation error as an infrastructure failure', async function () {
            const file = path.join(directory, 'valid.png');
            await sharp({
                create: { width: 2, height: 2, channels: 3, background: '#336699' }
            }).png().toFile(file);
            const rejection = new Error('Sharp rejected this image');
            sharpQueue.process = () => Promise.reject(rejection);
            await assert.rejects(validate(file), error => error === rejection);
        });

        it('does not bypass validation for formats unavailable in the Jimp fallback', async function () {
            for (const name of ['image.gif', 'image.tiff', 'image.svg']) {
                const file = path.join(directory, name);
                fs.writeFileSync(file, 'not an image');
                await assert.rejects(validate(file), { code: 'SHARP_UNAVAILABLE' });
            }
        });

        it('rejects missing files, directories and unsupported extensions before starting Sharp', async function () {
            let called = false;
            sharpQueue.process = () => {
                called = true;
                return Promise.resolve();
            };
            const folder = path.join(directory, 'directory.png');
            fs.mkdirSync(folder);
            await assert.rejects(validate(path.join(directory, 'missing.png')));
            await assert.rejects(validate(folder));
            await assert.rejects(validate(path.join(directory, 'file.pdf')));
            assert.equal(called, false);
        });
    });
});
