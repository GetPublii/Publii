const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { Jimp } = require('jimp');
const Image = require('../../image.js');
const WebpHelper = require('../webp.js');

describe('WebP Helper', function() {
    this.timeout(10000);

    it('should encode and decode a Jimp bitmap', async function() {
        let fixturePath = path.join(__dirname, 'mock-data', 'avatar.png');
        let image = await Jimp.read(fixturePath);
        let encoded = await WebpHelper.encode(image.bitmap, { quality: 60 });
        let decoded = await WebpHelper.decode(encoded);

        assert.strictEqual('RIFF', encoded.subarray(0, 4).toString());
        assert.strictEqual('WEBP', encoded.subarray(8, 12).toString());
        assert.strictEqual(image.bitmap.width, decoded.width);
        assert.strictEqual(image.bitmap.height, decoded.height);
        assert.strictEqual(decoded.data.length, decoded.width * decoded.height * 4);
    });

    it('should preserve the WebP destination when Jimp is used', async function() {
        let tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'publii-webp-'));
        let sourcePath = path.join(__dirname, 'mock-data', 'avatar.png');
        let destinationPath = path.join(tempDir, 'avatar-small.webp');
        let fallbackDestinationPath = path.join(tempDir, 'avatar-small.png');
        let image = new Image({
            db: null,
            appDir: path.join(__dirname, '..', '..', '..'),
            sitesDir: tempDir,
            appConfig: { resizeEngine: 'jimp' }
        }, {
            site: 'test',
            id: '1',
            path: sourcePath
        });

        try {
            let result = await image.processWithJimp({
                originalPath: sourcePath,
                destinationPath,
                fallbackDestinationPath,
                sourceExtension: '.png',
                format: 'webp',
                width: 100,
                height: 100,
                crop: false,
                forceWebp: true,
                imagesQuality: 60,
                alphaQuality: 100,
                webpLossless: false
            });

            assert.strictEqual(destinationPath, result);
            assert.strictEqual(true, fs.existsSync(destinationPath));
            assert.strictEqual(false, fs.existsSync(fallbackDestinationPath));
            assert.strictEqual('WEBP', fs.readFileSync(destinationPath).subarray(8, 12).toString());
        } finally {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    });
});
