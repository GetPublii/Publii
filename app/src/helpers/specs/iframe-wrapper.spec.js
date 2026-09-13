const assert = require('node:assert/strict');
const wrapIframes = require('../../../shared/iframe-wrapper');

const iframe = '<iframe src="https://example.com/map" width="600" height="450" title="Map"></iframe>';
const wrapped = '<div class="post__iframe">' + iframe + '</div>';
const optOut = iframe.replace('<iframe ', '<iframe data-responsive="false" ');

const fixtures = [
    {
        name: 'wraps a standalone iframe without changing its attributes',
        input: iframe,
        expected: wrapped
    },
    {
        name: 'removes a standard wrapper after opting out',
        input: '<div class="post__iframe">' + optOut + '</div>',
        expected: optOut
    },
    {
        name: 'preserves whitespace when removing a standard wrapper',
        input: "<div class='post__iframe'>\n  " + optOut + '\n</div>',
        expected: '\n  ' + optOut + '\n'
    },
    {
        name: 'removes nested standard wrappers in one pass',
        input: '<div class="post__iframe"><div class="post__iframe">' + optOut + '</div></div>',
        expected: optOut
    },
    {
        name: 'unwraps only the opted-out embed among adjacent wrappers',
        input: '<p>Before</p><div class="post__iframe">' + optOut + '</div>' + wrapped,
        expected: '<p>Before</p>' + optOut + wrapped
    },
    {
        name: 'preserves a custom wrapper with an id',
        input: '<div id="map" class="post__iframe">' + optOut + '</div>'
    },
    {
        name: 'preserves a wrapper with custom classes',
        input: '<div class="post__iframe custom">' + optOut + '</div>'
    },
    {
        name: 'preserves additional content in a wrapper',
        input: '<div class="post__iframe">Before' + optOut + '</div>'
    },
    {
        name: 'preserves a wrapper shared by multiple embeds',
        input: '<div class="post__iframe">' + iframe + optOut + '</div>'
    },
    {
        name: 'preserves video figures when opting out',
        input: '<figure class="post__video">' + optOut + '</figure>'
    },
    {
        name: 'does not unwrap iframe examples inside scripts',
        input: '<script>const html = `<div class="post__iframe">' + optOut + '</div>`;</script>'
    },
    {
        name: 'keeps an existing wrapper with custom attributes and nested elements',
        input: '<div id="map" class="custom post__iframe"><div>' + iframe + '</div></div>'
    },
    {
        name: 'keeps video embeds and wraps a separate iframe after the video',
        input: '<figure class="custom post__video"><div>' + iframe + '</div></figure>' + iframe,
        expected: '<figure class="custom post__video"><div>' + iframe + '</div></figure>' + wrapped
    },
    {
        name: 'recognizes single-quoted wrapper classes',
        input: "<div class='post__iframe custom'>" + iframe + '</div>'
    },
    {
        name: 'recognizes unquoted wrapper classes',
        input: '<div class=post__iframe>' + iframe + '</div>'
    },
    {
        name: 'requires a whole class name',
        input: '<div class="post__iframe-custom">' + iframe + '</div>',
        expected: '<div class="post__iframe-custom">' + wrapped + '</div>'
    },
    {
        name: 'does not treat data-class as a wrapper class',
        input: '<div data-class="post__iframe">' + iframe + '</div>',
        expected: '<div data-class="post__iframe">' + wrapped + '</div>'
    },
    {
        name: 'removes a paragraph containing only an iframe',
        input: '<p>\n' + iframe + '</p>',
        expected: '\n' + wrapped
    },
    {
        name: 'preserves text and formatting around an iframe without duplicating an anchor',
        input: '<p id="intro" class="align-center">Before' + iframe + 'After</p>',
        expected: '<p id="intro" class="align-center">Before</p>' + wrapped + '<p class="align-center">After</p>'
    },
    {
        name: 'preserves inline formatting around nested and direct iframes',
        input: '<p><strong>Before' + iframe + 'After</strong>' + iframe + 'End</p>',
        expected: '<p><strong>Before</strong></p>' + wrapped + '<p><strong>After</strong></p>' + wrapped + '<p>End</p>'
    },
    {
        name: 'handles consecutive iframes inside one paragraph',
        input: '<p>' + iframe + iframe + '</p>',
        expected: wrapped + wrapped
    },
    {
        name: 'handles an omitted paragraph end tag',
        input: '<p>' + iframe + '<p>After',
        expected: wrapped + '<p>After'
    },
    {
        name: 'handles a paragraph ending at the end of its container',
        input: '<section><p>' + iframe + '</section>',
        expected: '<section>' + wrapped + '</section>'
    },
    {
        name: 'handles a paragraph ending at the end of content',
        input: '<p>' + iframe,
        expected: wrapped
    },
    {
        name: 'does not confuse a custom element with an iframe',
        input: '<iframe-preview>Text</iframe-preview>' + iframe,
        expected: '<iframe-preview>Text</iframe-preview>' + wrapped
    },
    {
        name: 'retains custom attributes on an otherwise empty paragraph',
        input: '<p id="map" class="align-center">' + iframe + '</p>',
        expected: '<div id="map" class="align-center">' + wrapped + '</div>'
    },
    {
        name: 'does not touch comments or raw-text content',
        input: '<!--' + iframe + '--><script>const html = `' + iframe + '`;</script>' +
            '<textarea>' + iframe + '</textarea><style>/*' + iframe + '*/</style>'
    },
    {
        name: 'preserves iframe markup in quoted attributes',
        input: "<div data-example='" + iframe + "'>Text</div>"
    },
    {
        name: 'preserves srcdoc and iframe fallback content',
        input: '<iframe srcdoc=\'<p title="a > b">Map</p>\'>Fallback</iframe>',
        expected: '<div class="post__iframe"><iframe srcdoc=\'<p title="a > b">Map</p>\'>Fallback</iframe></div>'
    },
    {
        name: 'supports multiline and uppercase iframe tags',
        input: '<IFRAME\n src="about:blank"\n title="a > b"></IFRAME>',
        expected: '<div class="post__iframe"><IFRAME\n src="about:blank"\n title="a > b"></IFRAME></div>'
    },
    {
        name: 'leaves an incomplete iframe unchanged',
        input: '<iframe src="about:blank">'
    },
    {
        name: 'leaves images, galleries, video and audio unchanged',
        input: '<figure class="post__image"><img src="photo.jpg"></figure>' +
            '<div class="gallery"><figure class="gallery__item"><img src="photo.jpg"></figure></div>' +
            '<figure class="post__video"><video src="movie.mp4"></video></figure>' +
            '<figure class="post__audio"><audio src="music.mp3"></audio></figure>'
    }
];

describe('Persistent iframe wrappers', function () {
    for (const fixture of fixtures) {
        it(fixture.name, function () {
            const expected = fixture.expected ?? fixture.input;
            const output = wrapIframes(fixture.input);
            assert.equal(output, expected);
            assert.equal(wrapIframes(output), output, 'normalizing again must not add wrappers');
        });
    }

    for (const attribute of ['data-responsive="false"', "data-responsive='false'", 'data-responsive=false']) {
        it('respects ' + attribute, function () {
            const input = iframe.replace('<iframe ', '<iframe ' + attribute + ' ');
            assert.equal(wrapIframes(input), input);
        });
    }
});
