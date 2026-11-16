const assert = require('node:assert/strict');
const { extractImages } = require('../content-images.js');
const MarkdownToHtml = require('../../modules/render-html/text-renderers/markdown.js');
const BlocksToHtml = require('../../modules/render-html/text-renderers/blockeditor.js');

describe('Content images (plugins API)', function () {
    it('distinguishes an empty alt from a missing one', function () {
        let images = extractImages(`
            <p><img alt="" class="post__image" src="#DOMAIN_NAME#a.jpg" width="800" height="600"></p>
            <p><img src="#DOMAIN_NAME#b.jpg"></p>
            <p><img src="c.jpg" alt="Tom &amp; Jerry"></p>
        `);

        assert.deepEqual(images.map(image => image.alt), ['', null, 'Tom & Jerry']);
        assert.equal(images[0].src, '#DOMAIN_NAME#a.jpg');
        assert.equal(images[0].width, 800);
        assert.equal(images[0].height, 600);
        assert.equal(images[1].width, null);
    });

    it('reads captions, links and galleries of the WYSIWYG editor', function () {
        let images = extractImages(`
            <figure class="post__image"><img src="moon.jpg" alt="Moon"><figcaption>Night <b>sky</b>
                over the lake</figcaption></figure>
            <div class="gallery" data-columns="3">
                <figure class="gallery__item"><a href="big.jpg" data-size="1200x800"><img src="thumb.jpg" alt="" width="300" height="200"></a><figcaption>One</figcaption></figure>
            </div>
            <p><a name="anchor"><img src="plain.jpg" alt="Plain"></a></p>
        `);

        assert.equal(images[0].caption, 'Night sky over the lake');
        assert.equal(images[0].inLink, false);
        assert.equal(images[0].inGallery, false);
        assert.deepEqual(
            [images[1].inGallery, images[1].inLink, images[1].linkHref, images[1].caption],
            [true, true, 'big.jpg', 'One']
        );
        // A link without href is not a link
        assert.equal(images[2].inLink, false);
    });

    it('reports images marked as decorative or hidden from screen readers', function () {
        let images = extractImages(`
            <img src="icon.svg" alt="" role="presentation">
            <span aria-hidden="true"><img src="divider.png" alt=""></span>
            <img src="photo.jpg" alt="Photo">
        `);

        assert.deepEqual(images.map(image => [image.role, image.ariaHidden]), [
            ['presentation', false],
            [null, true],
            [null, false]
        ]);
    });

    it('reads images of the Markdown editor', function () {
        let images = extractImages(MarkdownToHtml.parse('![](#DOMAIN_NAME#x.jpg)\n\n![Lake at night](#DOMAIN_NAME#y.jpg "Taken in May")'));

        assert.deepEqual(images.map(image => [image.src, image.alt, image.caption]), [
            ['#DOMAIN_NAME#x.jpg', '', ''],
            ['#DOMAIN_NAME#y.jpg', 'Lake at night', 'Taken in May']
        ]);
    });

    it('reads images and galleries of the block editor', function () {
        let advanced = { cssClasses: '', id: '' };
        let html = BlocksToHtml.parse(JSON.stringify([
            {
                type: 'publii-image',
                config: { imageAlign: 'center', link: { url: '', noFollow: false, targetBlank: false, sponsored: false, ugc: false }, advanced },
                content: { image: '#DOMAIN_NAME#lake.jpg', imageHeight: 600, imageWidth: 800, alt: '', caption: 'Lake' }
            },
            {
                type: 'publii-image',
                config: { imageAlign: 'center', link: { url: 'https://example.com', noFollow: false, targetBlank: true, sponsored: false, ugc: false }, advanced },
                content: { image: '#DOMAIN_NAME#banner.jpg', imageHeight: 100, imageWidth: 300, alt: 'Shop', caption: '' }
            },
            {
                type: 'publii-gallery',
                config: { imageAlign: 'center', columns: 3, advanced },
                content: { images: [{ src: '#DOMAIN_NAME#gallery/big.jpg', thumbnailSrc: '#DOMAIN_NAME#gallery/thumb.jpg', height: 200, width: 300, alt: 'One', caption: '', dimensions: '1200x800' }] }
            }
        ]));
        let images = extractImages(html);

        assert.deepEqual(images.map(image => [image.src, image.alt, image.caption, image.inLink, image.inGallery]), [
            ['#DOMAIN_NAME#lake.jpg', '', 'Lake', false, false],
            ['#DOMAIN_NAME#banner.jpg', 'Shop', '', true, false],
            ['#DOMAIN_NAME#gallery/thumb.jpg', 'One', '', true, true]
        ]);
        assert.equal(images[0].width, 800);
    });

    it('returns an empty list for empty or invalid content', function () {
        assert.deepEqual(extractImages(''), []);
        assert.deepEqual(extractImages('   '), []);
        assert.deepEqual(extractImages(null), []);
        assert.deepEqual(extractImages('<p>No images</p>'), []);
        // Unclosed tags are fixed like in a browser
        assert.equal(extractImages('<div><p><img src="a.jpg" alt="x">').length, 1);
    });
});
