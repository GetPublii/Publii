const assert = require('node:assert/strict');
const { convertCovers } = require('../wordpress-cover');
const { cleanHtml } = require('../wordpress-html-cleaner');
const WxrUtils = require('../wxr-utils');

describe('WordPress Cover conversion', function() {
    const overlay = '<span aria-hidden="true" class="wp-block-cover__background has-background-dim"></span>';
    const image = '<img class="wp-block-cover__image-background wp-image-761" alt="Wind &amp; sky" ' +
        'src="https://example.org/wind.jpg" data-object-fit="cover">';
    const content = '<p class="has-text-align-center">Fixed <em>background</em></p>';

    function cover(media = image, body = content, attributes = '') {
        return '<div class="wp-block-cover is-light has-parallax"' + attributes + '>' +
            overlay + media + '<div class="wp-block-cover__inner-container">' + body + '</div></div>';
    }

    function importMarkup(html) {
        return cleanHtml(WxrUtils.normalizeWordPressImageMarkup(convertCovers(html).html)).html;
    }

    it('converts an image Cover to a Publii image and text without redundant layers or wrappers', function() {
        const html = cover();
        const result = convertCovers(html);

        assert.equal(result.convertedCovers, 1);
        assert.equal(importMarkup(html), '<img alt="Wind &amp; sky" src="https://example.org/wind.jpg" class="post__image">' +
            '<p class="align-center">Fixed <em>background</em></p>');
        assert.equal(convertCovers(result.html).html, result.html);
        assert.equal(convertCovers(result.html).convertedCovers, 0);
    });

    for (const url of [
        'https://example.org/wind.jpg',
        'https://example.org/wind.jpg?a=1&amp;b=2',
        '//example.org/wind.jpg',
        '/uploads/wind.jpg'
    ]) {
        it('exposes CSS background images to the normal image import: ' + url, function() {
            const background = '<div role="img" aria-label="Wind &amp; sky" ' +
                'class="wp-block-cover__image-background" ' +
                'style="background-position:50% 50%;background-image:url(&quot;' + url + '&quot;)"></div>';
            const result = convertCovers(cover(background));

            assert.equal(result.convertedCovers, 1);
            assert.deepEqual(WxrUtils.getImageUrls(result.html), [url]);
            assert.match(result.html, /alt="Wind &amp; sky"/);
            assert.doesNotMatch(result.html, /background-image|wp-block-cover|role="img"/);
        });
    }

    it('preserves responsive image data, intrinsic sizes and loading attributes', function() {
        const media = image.replace('data-object-fit="cover"',
            'width="800" height="600" loading="lazy" srcset="small.jpg 400w, large.jpg 800w" sizes="100vw"');
        const output = importMarkup(cover(media));

        for (const attribute of ['width="800"', 'height="600"', 'loading="lazy"',
            'srcset="small.jpg 400w, large.jpg 800w"', 'sizes="100vw"']) {
            assert.ok(output.includes(attribute), attribute);
        }
    });

    it('retains anchors and language on wrappers while removing Cover presentation', function() {
        const html = cover(image, content, ' id="hero" lang="pl" style="min-height:500px;color:white"')
            .replace('class="wp-block-cover__inner-container"', 'class="wp-block-cover__inner-container" id="caption"');
        const output = importMarkup(html);

        assert.match(output, /^<div id="hero" lang="pl">/);
        assert.match(output, /<div id="caption"><p class="align-center">/);
        assert.doesNotMatch(output, /wp-block-cover|min-height|color:/);
    });

    it('preserves wide image layout and original inner comments, links and nested content', function() {
        const body = '<!-- Keep --><h2>Title &amp; more</h2><div><p><a href="#intro">Text</a></p></div>';
        const html = cover(image, body).replace('wp-block-cover is-light', 'wp-block-cover alignwide is-light');
        const output = importMarkup(html);

        assert.match(output, /class="post__image post__image--wide"/);
        assert.ok(output.endsWith(body));
    });

    it('converts sibling Covers independently without changing surrounding markup', function() {
        const first = cover();
        const second = cover(image, '<p>Second</p>');
        const html = '<p>Before</p>' + first + '\n<!-- between -->\n' + second + '<p>After</p>';
        const result = convertCovers(html);

        assert.equal(result.convertedCovers, 2);
        assert.equal(result.html, '<p>Before</p>' + convertCovers(first).html +
            '\n<!-- between -->\n' + convertCovers(second).html + '<p>After</p>');
    });

    it('removes a recognized gradient overlay without losing the underlying image', function() {
        const html = cover().replace('has-background-dim"', 'has-background-dim" style="background:linear-gradient(red,blue)"');

        assert.equal(convertCovers(html).convertedCovers, 1);
        assert.equal(importMarkup(html), importMarkup(cover()));
    });

    it('retains an overlay with an additional image', function() {
        const html = cover().replace('has-background-dim"', 'has-background-dim" style="background:url(overlay.png)"');

        assert.deepEqual(convertCovers(html), { html, convertedCovers: 0 });
    });

    it('renders through the native Publii image pipeline without WordPress wrappers', function() {
        const ContentHelper = require('../../render-html/helpers/content');
        const renderer = {
            inputDir: '',
            siteConfig: {
                domain: 'https://publii.example',
                advanced: {
                    responsiveImages: false,
                    mediaLazyLoad: true,
                    gdpr: {}
                }
            }
        };
        const imported = importMarkup(cover()).replace('https://example.org/wind.jpg', '#DOMAIN_NAME#wind.jpg');
        const output = ContentHelper.prepareContent(6, imported, 'https://publii.example', {}, renderer);

        assert.match(output, /^<figure class="post__image"><img loading="lazy"/);
        assert.match(output, /src="https:\/\/publii.example\/media\/posts\/6\/wind.jpg"/);
        assert.match(output, /<\/figure><p class="align-center">Fixed <em>background<\/em><\/p>$/);
        assert.doesNotMatch(output, /<div|<span|wp-block-cover|data-object-fit/);
    });

    for (const html of [
        cover().replace('wp-block-cover is-light', 'custom-cover is-light'),
        cover().replace('wp-block-cover__inner-container', 'custom-content'),
        cover().replace('aria-hidden="true"', 'id="overlay-anchor" aria-hidden="true"'),
        cover().replace('</span>', 'Keep this</span>'),
        cover().replace('</span>', '<!-- Keep --></span>'),
        cover().replace(image, image + image),
        cover().replace(image, '<video class="wp-block-cover__video-background" src="movie.mp4"></video>'),
        cover().replace('data-object-fit="cover"', 'onclick="openImage()"'),
        cover(image, content, ' data-widget="cover"'),
        cover(image, content, ' hidden'),
        cover(image, cover()),
        '<pre>' + cover() + '</pre>',
        '<template>' + cover() + '</template>',
        '<div data-widget="custom">' + cover() + '</div>',
        '<script>init()</script>' + cover(),
        '<style>.wp-block-cover{display:none}</style>' + cover(),
        cover().replace('alt="Wind &amp; sky"', 'alt="A" alt="B"'),
        '<p>Before' + cover() + 'After</p>'
    ]) {
        it('preserves unsupported, interactive or ambiguous markup: ' + html.slice(0, 75), function() {
            assert.deepEqual(convertCovers(html), { html, convertedCovers: 0 });
        });
    }

    for (const style of [
        'background-image:linear-gradient(red,blue)',
        'background-image:url(one.jpg),url(two.jpg)',
        'background-image:var(--image)',
        'background-image:url(one.jpg);background-image:url(two.jpg)',
        'background-image:url(one.jpg);background:none',
        'background-image:url(one.jpg);display:none',
        'background-image:url(one.jpg);visibility:hidden',
        'background-image:url(one.jpg);clip-path:circle(20%)',
        'background-image:url(javascript:alert)',
        'background-image:url(data:image/png;base64,AAA)'
    ]) {
        it('retains unsupported backgrounds instead of guessing: ' + style, function() {
            const media = '<div role="img" class="wp-block-cover__image-background" style="' + style + '"></div>';
            const html = cover(media);

            assert.deepEqual(convertCovers(html), { html, convertedCovers: 0 });
        });
    }
});
