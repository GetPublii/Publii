const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const sharp = require('sharp');
const conversion = require('../../../shared/image-conversion.js');
const ContentHelper = require('../../modules/render-html/helpers/content.js');

function gallery(original, thumbnail) {
    return `<figure class="gallery__item"><a href="${original}"><img src="${thumbnail}"></a></figure>`;
}

describe('Image conversion format compatibility', function () {
    it('keeps native AVIF, GIF and SVG formats in every conversion mode', function () {
        for (const mode of ['none', 'webp', 'avif', true, false]) {
            for (const extension of ['.avif', '.AVIF', '.gif', '.svg']) {
                assert.equal(conversion.getOutputExtension(extension, mode), extension);
            }
        }
    });

    it('supports the legacy boolean WebP helper argument', function () {
        assert.equal(ContentHelper._getSrcSet('https://example.com/photo.JPG', 'small', true), 'https://example.com/responsive/photo-small.webp');
        assert.equal(ContentHelper._getSrcSet('https://example.com/photo.JPG', 'small', false), 'https://example.com/responsive/photo-small.JPG');
    });

    it('restores gallery extensions across all source and target formats', function () {
        for (const originalExtension of ['jpg', 'JPEG', 'png', 'webp', 'avif']) {
            for (const thumbnailExtension of ['jpg', 'webp', 'avif']) {
                for (const mode of ['none', 'webp', 'avif']) {
                    const original = 'file:///site/gallery/photo.' + originalExtension;
                    const thumbnail = 'file:///site/gallery/photo-thumbnail.' + thumbnailExtension;
                    const output = conversion.convertGalleryThumbnails(gallery(original, thumbnail), mode);
                    const expected = mode === 'avif' && originalExtension !== 'avif'
                        ? 'avif'
                        : mode === 'webp' && ['jpg', 'JPEG', 'png'].includes(originalExtension)
                            ? 'webp'
                            : originalExtension;
                    assert.ok(output.includes('src="file:///site/gallery/photo-thumbnail.' + expected + '"'));
                    assert.ok(output.includes('href="' + original + '"'));
                }
            }
        }
    });

    it('keeps animated WebP out of AVIF conversion for local files, published URLs and editor galleries', async function () {
        const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'publii-animated-webp-'));
        const media = path.join(directory, 'media/posts/1');
        fs.mkdirSync(media, { recursive: true });
        const originalPath = path.join(media, 'animated photo.webp');

        try {
            const firstFrame = await sharp({
                create: { width: 16, height: 16, channels: 3, background: '#ff0000' }
            }).png().toBuffer();
            const secondFrame = await sharp({
                create: { width: 16, height: 16, channels: 3, background: '#0000ff' }
            }).png().toBuffer();
            await sharp([firstFrame, secondFrame], { join: { animated: true } }).webp().toFile(originalPath);
            assert.equal((await sharp(originalPath).metadata()).pages, 2);
            assert.equal(conversion.isAnimatedWebp(originalPath), true);
            const context = conversion.createContext({ forceAvif: true }, directory, 'https://example.com/blog');
            const url = 'https://example.com/blog/media/posts/1/animated%20photo.webp';
            assert.equal(conversion.getOutputExtension('.webp', context, originalPath), '.webp');
            assert.match(ContentHelper._getSrcSet(url, 'small', context), /animated%20photo-small\.webp$/);
            const fileUrl = pathToFileURL(originalPath).href;
            assert.match(conversion.convertGalleryThumbnails(gallery(fileUrl, fileUrl.replace('.webp', '-thumbnail.webp')), context), /-thumbnail\.webp/);
        } finally {
            fs.rmSync(directory, { recursive: true, force: true });
        }
    });
});
