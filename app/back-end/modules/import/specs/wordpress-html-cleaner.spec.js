const assert = require('assert');
const { parseFragment } = require('parse5');
const { cleanHtml, normalizeTextAlignment } = require('../wordpress-html-cleaner');
const WxrUtils = require('../wxr-utils');

describe('WordPress HTML cleanup', function() {
    for (const background of [
        'background:#000',
        'background-color:#000',
        'background:#000!important;background-color:#222',
        'background-color:#000;background:#222!important'
    ]) {
        it('removes solid backgrounds together with foreground color: ' + background, function() {
            const result = cleanHtml('<p style="' + background + ';color:#fff">Contrast</p>');

            assert.strictEqual(result.html, '<p>Contrast</p>');
            assert.strictEqual(result.stats.removedStyles, 1);
            assert.strictEqual(result.skippedReason, null);
        });
    }

    for (const style of [
        'background:url(photo.jpg) center/cover #000;color:#fff',
        'background-image:url(photo.jpg);background-color:#000;color:#fff',
        'background:linear-gradient(#000,#333);color:#fff',
        'background:var(--panel-background);color:#fff',
        'background-color:var(--panel-background);color:#fff',
        'background:inherit;color:#fff',
        'background:#000;color:var(--foreground)'
    ]) {
        it('protects complex backgrounds with inherited and nested text colors: ' + style, function() {
            const html = '<section class="theme-panel" style="color:#fff">' +
                '<div class="cover" style="' + style + '">' +
                '<p class="caption" style="color:#fff">Caption</p>' +
                '</div></section>';
            const result = cleanHtml(html);

            assert.strictEqual(result.html, html);
            assert.strictEqual(result.stats.preservedBlocks, 1);
            assert.strictEqual(result.stats.removedClasses, 0);
            assert.strictEqual(result.stats.removedStyleDeclarations, 0);
        });
    }

    it('cleans ordinary content beside a protected background', function() {
        const cover = '<div class="cover" style="background-image:url(photo.jpg);color:#fff">Caption</div>';
        const result = cleanHtml('<p class="theme-text" style="color:red">Intro</p>' + cover);

        assert.strictEqual(result.html, '<p>Intro</p>' + cover);
        assert.strictEqual(result.stats.preservedBlocks, 1);
        assert.strictEqual(result.stats.removedClasses, 1);
    });

    for (const alignment of ['left', 'center', 'right']) {
        it('preserves the position of a legacy ' + alignment + '-aligned table', function() {
            const html = '<table align="' + alignment + '"><tbody><tr><td>Cell</td></tr></tbody></table>';
            const result = cleanHtml(html);

            assert.strictEqual(result.html, html);
            assert.strictEqual(result.stats.semanticConversions, 0);
            assert.strictEqual(result.stats.removedAttributes, 0);
        });
    }

    it('converts table and cell text alignment without removing the table position', function() {
        const html = '<table align="left" style="text-align:center;color:red">' +
            '<tbody><tr><td align="right">Cell</td></tr></tbody></table>';
        const result = cleanHtml(html);

        assert.strictEqual(result.html, '<table align="left" class="align-center">' +
            '<tbody><tr><td class="align-right">Cell</td></tr></tbody></table>');
        assert.strictEqual(result.stats.semanticConversions, 2);
        assert.strictEqual(result.stats.removedAttributes, 1);
    });

    it('removes presentation classes, styles and editor attributes without losing text or entities', function() {
        const result = cleanHtml('<p class="wp-block-paragraph theme-red" style="color:red" data-mce-style="color:red">A &amp; <span class="wp-text">B</span> C&nbsp;D</p>');
        assert.strictEqual(result.html, '<p>A &amp; <span>B</span> C&nbsp;D</p>');
        assert.strictEqual(result.stats.removedClasses, 3);
        assert.strictEqual(result.stats.removedStyles, 1);
        assert.strictEqual(result.stats.removedAttributes, 1);
    });

    it('converts alignment while retaining containers and inline emphasis styles', function() {
        const result = cleanHtml('<p class="align-right wp-block" style="text-align:center;color:red"><span style="font-weight:700;font-style:italic">Text</span></p>');
        assert.strictEqual(result.html, '<p class="align-center"><span style="font-weight:700;font-style:italic">Text</span></p>');
        assert.strictEqual(result.stats.semanticConversions, 1);
        assert.strictEqual(cleanHtml(result.html).html, result.html);
    });

    it('respects CSS importance, duplicate declarations, comments and escaped property names', function() {
        const result = cleanHtml('<p style="text-align:left!important;text-align:right;co\\6cor: red;font-weight:400!important;font-weight:bold">A</p>');
        assert.match(result.html, /class="align-left"/);
        assert.doesNotMatch(result.html, /<strong>/);
        assert.match(result.html, /400 !important/);
        assert.doesNotMatch(result.html, /color:/);
    });

    it('keeps style resets and layout or whitespace behavior that cannot be converted safely', function() {
        const result = cleanHtml('<p style="font-weight:bold"><span style="font-weight:normal">A</span>B</p><div style="display:none;color:red">Hidden</div><p style="white-space:pre-wrap">a  b\nc</p>');
        assert.match(result.html, /<p style="font-weight:bold">/);
        assert.match(result.html, /font-weight:normal/);
        assert.match(result.html, /display: none/);
        assert.match(result.html, /white-space:pre-wrap/);
        assert.doesNotMatch(result.html, /<strong>/);
        assert.strictEqual(result.stats.preservedStyles, 4);
    });

    it('keeps image and gallery contracts after WordPress conversion', function() {
        const html = WxrUtils.normalizeWordPressImageMarkup(
            '<figure class="wp-block-image alignwide"><img src="photo.jpg" alt="A" width="800" height="600"></figure>' +
            '<div class="gallery gallery-wrapper--full theme-gallery" data-is-empty="false" data-translation="Add images" data-columns="3"><figure class="gallery__item"><a href="full.jpg" data-size="800x600"><img src="thumb.jpg" alt="B" width="400" height="300"></a><figcaption>Caption</figcaption></figure></div>'
        );
        const result = cleanHtml(html);
        for (const fragment of ['post__image--wide', 'gallery-wrapper--full', 'gallery__item', 'data-columns="3"', 'data-size="800x600"', 'data-is-empty="false"', 'data-translation="Add images"', 'width="800"', '<figcaption>Caption</figcaption>']) {
            assert.ok(result.html.includes(fragment), fragment);
        }
        assert.doesNotMatch(result.html, /theme-gallery/);
        assert.deepStrictEqual(WxrUtils.getImageUrls(result.html), WxrUtils.getImageUrls(html));
    });

    for (const className of [
        'align-left', 'align-right', 'align-center', 'align-justify',
        'post__image', 'post__image--left', 'post__image--right', 'post__image--center',
        'post__image--wide', 'post__image--full', 'post__video', 'post__iframe', 'post__toc',
        'gallery', 'gallery__item', 'gallery-wrapper', 'gallery-wrapper--wide', 'gallery-wrapper--full',
        'separator', 'separator--dot', 'separator--dots', 'separator--long-line',
        'msg', 'msg--highlight', 'msg--info', 'msg--success', 'msg--warning', 'ordered-list', 'dropcap'
    ]) {
        it('preserves the Publii class ' + className, function() {
            const result = cleanHtml('<div class="' + className + ' wordpress-class"><p>Text</p></div>');
            assert.strictEqual(result.html, '<div class="' + className + '"><p>Text</p></div>');
        });
    }

    it('preserves consent overlays and all their state, style and functional attributes', function() {
        const consent = '<div class="pec-wrapper" data-consent-group-id="video"><iframe data-consent-src="video.html"></iframe><div class="pec-overlay is-active" aria-hidden="false"><div class="pec-overlay-inner"><button class="pec-button" onclick="enableConsent()">Enable</button></div></div></div>';
        const result = cleanHtml('<p class="wp-text">Intro</p>' + consent);
        assert.strictEqual(result.html, '<p>Intro</p>' + consent);
        assert.strictEqual(result.stats.preservedBlocks, 1);
    });

    for (const markup of [
        '<pre class="language-js line-numbers" data-start="2"><code class="language-js"><span class="token keyword" style="color:red">const</span> a = "&lt;p class=\'x\'&gt;";\n  a++;</code></pre>',
        '<code class="language-html">&lt;span style="color:red"&gt;</code>',
        '<figure class="wp-embed"><iframe src="https://example.org/?a=1&amp;b=2" allowfullscreen data-responsive="false" style="aspect-ratio:16/9"></iframe></figure>',
        '<div class="player" style="aspect-ratio:16/9"><video controls poster="poster.jpg"><source src="movie.mp4" type="video/mp4"><track kind="captions" src="captions.vtt"></video></div>',
        '<picture><source srcset="a.webp 1x, b.webp 2x" type="image/webp"><img src="a.jpg" alt="A"></picture>',
        '<svg class="icon" viewBox="0 0 10 10"><path stroke="currentColor" d="M0 0L10 10"/></svg>',
        '<form class="contact" action="/send"><input name="name" required><button type="submit">Send</button></form>',
        '<blockquote class="instagram-media" data-instgrm-permalink="https://example.org/post" style="background:white">Embed</blockquote>',
        '<custom-widget class="wp-widget" data-source="/feed"><span class="target">Text</span></custom-widget>'
    ]) {
        it('keeps protected markup byte for byte: ' + markup.slice(0, 65), function() {
            const result = cleanHtml(markup);
            assert.strictEqual(result.html, markup);
            assert.strictEqual(result.stats.preservedBlocks, 1);
        });
    }

    it('preserves anchors, accessibility, language, structured data and functional media attributes', function() {
        const html = '<p id="intro" lang="pl" dir="ltr" role="note" aria-label="Intro" itemscope itemtype="https://schema.org/Thing" class="wp-text"><a href="#intro" name="legacy" rel="nofollow noopener" target="_blank" download="doc.pdf">Link</a><img src="photo.jpg" srcset="photo.jpg 1x, retina.jpg 2x" sizes="100vw" loading="lazy" decoding="async" data-responsive="false" width="800" height="600" alt="Photo"></p>';
        assert.strictEqual(cleanHtml(html).html, html.replace(' class="wp-text"', ''));
    });

    it('preserves table semantics, list numbering, dates, quotations and read-more markers', function() {
        const html = '<table class="wp-table"><caption>Data</caption><tbody><tr><th id="col" scope="col">A</th></tr><tr><td headers="col" colspan="2" rowspan="2">B</td></tr></tbody></table><ol start="4" reversed><li value="8">Item</li></ol><time datetime="2026-09-20">Today</time><blockquote cite="https://example.org">Quote</blockquote><hr id="read-more" data-translation="Read more">';
        assert.strictEqual(cleanHtml(html).html, html.replace(' class="wp-table"', ''));
    });

    it('preserves all containers and whitespace while removing their classes', function() {
        const result = cleanHtml('<div class="wp-group"><p>A<span class="wp-text"> B </span>C</p><p>D</p></div><div class="wp-text">E</div><div>F</div><span id="anchor"></span>');
        assert.strictEqual(result.html, '<div><p>A<span> B </span>C</p><p>D</p></div><div>E</div><div>F</div><span id="anchor"></span>');
    });

    it('preserves WordPress comments and shortcodes for the existing migration report', function() {
        const html = '<!-- wp:latest-posts {"postsToShow":3} /--><p class="wp-text">[plugin id="5"]Text[/plugin]</p><!-- wp:custom/block --><div>Block</div><!-- /wp:custom/block -->';
        const output = cleanHtml(html).html;
        const withoutOffsets = items => items.map(({ index, ...item }) => item);
        assert.deepStrictEqual(withoutOffsets(WxrUtils.extractWordPressBlocks(output)), withoutOffsets(WxrUtils.extractWordPressBlocks(html)));
        assert.deepStrictEqual(withoutOffsets(WxrUtils.extractShortcodes(output)), withoutOffsets(WxrUtils.extractShortcodes(html)));
    });

    for (const html of ['<p class="x"><script>init(".x")</script>Text</p>', '<style>.x{display:none}</style><p class="x">Hidden</p>']) {
        it('skips content with scripts or styles that can depend on distant classes', function() {
            const result = cleanHtml(html);
            assert.strictEqual(result.html, html);
            assert.strictEqual(result.skippedReason, 'active-content');
            assert.strictEqual(result.stats.removedClasses, 0);
        });
    }

    it('removes decorative CSS longhands even when CSS normalization merges them', function() {
        const result = cleanHtml('<p style="margin-top:1px;margin-right:1px;margin-bottom:1px;margin-left:1px">A</p>');
        assert.strictEqual(result.html, '<p>A</p>');
        assert.strictEqual(result.stats.removedStyleDeclarations, 4);
        assert.strictEqual(result.stats.removedStyles, 1);
    });

    it('preserves actual block-editor quote markup and image and gallery layouts', function() {
        const renderQuote = require('../../../../src/components/block-editor/components/default-blocks/publii-quote/render');
        const renderImage = require('../../../../src/components/block-editor/components/default-blocks/publii-image/render');
        const renderGallery = require('../../../../src/components/block-editor/components/default-blocks/publii-gallery/render');
        const advanced = { id: 'anchor', cssClasses: '' };
        const quote = renderQuote({ config: { advanced }, content: { author: 'Author', text: 'Quote' } });
        assert.strictEqual(cleanHtml(quote).html, quote);

        for (const imageAlign of ['left', 'right', 'center', 'wide', 'full']) {
            const image = renderImage({
                config: { advanced, imageAlign, link: { url: '' } },
                content: { caption: 'Caption', image: 'photo.jpg', imageWidth: 800, imageHeight: 600, alt: 'Photo' }
            });
            assert.strictEqual(cleanHtml(image).html, image);
        }

        for (const imageAlign of ['center', 'wide', 'full']) {
            const gallery = renderGallery({
                config: { advanced, imageAlign, columns: 3 },
                content: {
                    images: [{ src: 'full.jpg', thumbnailSrc: 'thumb.jpg', dimensions: '800x600', width: 400, height: 300, caption: 'Caption', alt: 'Photo' }]
                }
            });
            assert.strictEqual(cleanHtml(gallery).html, gallery);
        }
    });

    it('preserves inherited syntax highlighting, hidden text and interactive controls', function() {
        const html = '<div class="language-js line-numbers"><pre><code>const a = 1;</code></pre></div><span class="screen-reader-text">Label</span><span role="button" class="widget" data-action="open" tabindex="0">Open</span>';
        assert.strictEqual(cleanHtml(html).html, html);
    });

    it('removes empty presentation attributes without removing wrappers or whitespace', function() {
        const result = cleanHtml('<p class="" style=""><span class=""> A </span>B</p>');
        assert.strictEqual(result.html, '<p><span> A </span>B</p>');
    });

    it('keeps malformed HTML without attempting lossy repair', function() {
        const html = '<p class="one" class="two" style="color:red">Text';
        const result = cleanHtml(html);
        assert.strictEqual(result.html, html);
        assert.strictEqual(result.skippedReason, 'invalid-html');
    });

    for (const style of [
        'font-style:italic',
        'font-style:oblique 12deg',
        'font-style:normal!important',
        'font-weight:bold',
        'font-weight:600',
        'font-weight:700',
        'font-weight:900',
        'font-weight:normal!important',
        'font-weight:var(--weight)',
        'font:italic bold 16px/1.5 serif'
    ]) {
        it('preserves typographic formatting without inferring emphasis: ' + style, function() {
            const html = '<span style="' + style + '">Text &amp; more</span>';
            const result = cleanHtml(html);
            assert.strictEqual(result.html, html);
            assert.strictEqual(result.stats.semanticConversions, 0);
            assert.strictEqual(result.stats.removedStyleDeclarations, 0);
            assert.strictEqual(result.stats.preservedStyles, 1);
        });
    }

    it('removes decorative styles while preserving explicit emphasis, numeric weights and resets', function() {
        const html = '<div class="theme" style="font-weight:600;color:red">' +
            '<p style="font-style:italic;background-color:yellow">' +
            '<strong style="font-weight:normal;color:blue">A</strong>' +
            '<em style="font-style:normal;color:green">B</em>' +
            '<b style="font-weight:900;padding:4px">C</b>' +
            '</p></div>';
        const result = cleanHtml(html);
        assert.match(result.html, /<div style="font-weight: 600;?">/);
        assert.match(result.html, /<p style="font-style: italic;?">/);
        assert.match(result.html, /<strong style="font-weight: normal;?">A<\/strong>/);
        assert.match(result.html, /<em style="font-style: normal;?">B<\/em>/);
        assert.match(result.html, /<b style="font-weight: 900;?">C<\/b>/);
        assert.doesNotMatch(result.html, /color|padding|class=/);
        assert.strictEqual(result.stats.semanticConversions, 0);
        assert.strictEqual(result.stats.removedStyleDeclarations, 5);
        assert.strictEqual(result.stats.preservedStyles, 5);
        assert.strictEqual(cleanHtml(result.html).html, result.html);
    });

    it('preserves element structure, text and comments while cleaning their attributes', function() {
        const html = '<section class="theme"><div class="wp-group">' +
            '<p class="theme" style="text-align:center;color:red">' +
            'A &amp; <!-- preserved --><strong class="theme"><em class="theme">B</em></strong>' +
            '<b class="theme">C<i class="theme">D</i></b>' +
            '<span class="theme"><u class="theme">E</u><s class="theme">F</s></span>' +
            '<del class="theme">G</del><ins class="theme">H</ins>' +
            '<sub class="theme">I</sub><sup class="theme">J</sup>' +
            '<mark class="theme">K</mark>&nbsp;<br><span class="theme"></span>' +
            '</p><div class="theme"><div class="theme">L</div></div>' +
            '</div></section>';

        function contentTree(node) {
            return {
                name: node.nodeName,
                text: node.value,
                comment: node.data,
                children: (node.childNodes || []).map(contentTree)
            };
        }

        const result = cleanHtml(html);
        const errors = [];
        const parsed = parseFragment(result.html, {
            onParseError(error) {
                errors.push(error);
            }
        });
        assert.deepStrictEqual(errors, []);
        assert.deepStrictEqual(contentTree(parsed), contentTree(parseFragment(html)));
        assert.match(result.html, /A &amp; <!-- preserved -->/);
        assert.match(result.html, /&nbsp;<br><span><\/span>/);
        assert.match(result.html, /class="align-center"/);
        assert.doesNotMatch(result.html, /theme|wp-group|color:red/);
        assert.strictEqual(cleanHtml(result.html).html, result.html);
    });

    it('keeps authored emphasis and original tag spelling without adding or removing tags', function() {
        const html = '<DIV class="theme"><P><EM>Emphasis</EM><STRONG>Important</STRONG>' +
            '<B>Bold</B><I>Italic</I><SPAN></SPAN></P></DIV>';
        assert.strictEqual(cleanHtml(html).html, html.replace(' class="theme"', ''));
    });

    it('keeps block formatting without introducing elements or parse errors', function() {
        for (const html of ['<div style="font-weight:bold"><p>Text</p></div>', '<p style="font-style:italic">Text <a href="/">link</a></p>', '<table><tr><td style="font-weight:bold">Text</td></tr></table>']) {
            const errors = [];
            const result = cleanHtml(html);
            parseFragment(result.html, { onParseError: error => errors.push(error) });
            assert.deepStrictEqual(errors, []);
            assert.strictEqual(cleanHtml(result.html).html, result.html);
        }
    });
});

describe('WordPress inline text alignment conversion', function() {
    for (const { style, alignment } of [
        {
            style: '--alignment:left;text-align:right!important;text-align:var(--alignment)',
            alignment: 'right'
        },
        {
            style: '--alignment:left;text-align:var(--alignment)!important;text-align:right',
            alignment: 'left'
        },
        {
            style: '--alignment:left!important;--alignment:right;text-align:var(--alignment)',
            alignment: 'left'
        },
        {
            style: '--alignment:LEFT;text-align:right;text-align:var(--alignment)',
            alignment: 'left'
        },
        {
            style: 'text-align:right!important;text-align:inherit',
            alignment: 'right'
        },
        {
            style: 'text-align:var(--external);text-align:center!important',
            alignment: 'center'
        },
        {
            style: '--alignment:justify;text-align:var(--alignment)',
            alignment: 'justify'
        }
    ]) {
        it('replaces resolved alignment and its unused CSS variable with a Publii class: ' + style, function() {
            const html = '<p style="' + style + '">Text</p>';
            const expected = '<p class="align-' + alignment + '">Text</p>';
            const result = cleanHtml(html);

            assert.strictEqual(normalizeTextAlignment(html), expected);
            assert.strictEqual(result.html, expected);
            assert.strictEqual(result.stats.semanticConversions, 1);
            assert.strictEqual(result.stats.removedStyles, 1);
            assert.strictEqual(cleanHtml(expected).html, expected);
        });
    }

    it('keeps alignment variables that other remaining CSS declarations still use', function() {
        const html = '<p style="--alignment:left;float:var(--alignment);' +
            'text-align:right!important;text-align:var(--alignment)">Text</p>';

        for (const output of [normalizeTextAlignment(html), cleanHtml(html).html]) {
            assert.match(output, /class="align-right"/);
            assert.match(output, /--alignment: left/);
            assert.match(output, /float: var\(--alignment\)/);
            assert.doesNotMatch(output, /text-align:/);
        }
    });

    it('keeps custom properties inherited by descendants while converting the parent alignment', function() {
        const child = '<p style="text-align:var(--alignment)">Text</p>';
        const html = '<div style="--alignment:left;text-align:right!important;' +
            'text-align:var(--alignment)">' + child + '</div>';

        for (const output of [normalizeTextAlignment(html), cleanHtml(html).html]) {
            assert.match(output, /<div style="--alignment: left" class="align-right">/);
            assert.ok(output.includes(child));
        }
    });

    for (const style of [
        'text-align:right;text-align:var(--external)',
        'text-align:var(--external)!important;text-align:right',
        'text-align:var(--external, right)',
        '--alignment:var(--alignment);text-align:var(--alignment)',
        '--a:var(--b);--b:var(--a);text-align:var(--a)',
        'text-align:right;text-align:revert-layer',
        'text-align:right;text-align:inherit'
    ]) {
        it('preserves the original cascade for unresolved alignment: ' + style, function() {
            const html = '<p align="center" style="' + style + '">Text</p>';
            const result = cleanHtml(html);

            assert.strictEqual(normalizeTextAlignment(html), html);
            assert.strictEqual(result.html, html);
            assert.strictEqual(result.stats.semanticConversions, 0);
            assert.strictEqual(result.stats.removedStyleDeclarations, 0);
        });
    }

    for (const alignment of ['left', 'right', 'center', 'justify']) {
        it('converts ' + alignment + ' while keeping other styles, classes and attributes', function() {
            const html = '<p id="anchor" class="theme-text" data-type="text" style="text-align:' +
                alignment + ';color:red;font-size:18px;font-weight:bold;font-style:italic">' +
                '<span class="theme-span">Text &amp; more</span></p>';
            const output = normalizeTextAlignment(html);
            assert.ok(output.includes('class="theme-text align-' + alignment + '"'));
            assert.ok(output.includes('id="anchor" data-type="text"') || output.includes('data-type="text"'));
            assert.ok(output.includes('id="anchor"'));
            assert.ok(output.includes('color: red'));
            assert.ok(output.includes('font-size: 18px'));
            assert.ok(output.includes('font-weight: bold'));
            assert.ok(output.includes('font-style: italic'));
            assert.ok(output.includes('<span class="theme-span">Text &amp; more</span>'));
            assert.doesNotMatch(output, /text-align:/);
            assert.doesNotMatch(output, /<(?:strong|em)>/);
            assert.strictEqual(normalizeTextAlignment(output), output);
        });
    }

    it('removes an empty style after conversion without unwrapping the element', function() {
        const html = '<div><p style="text-align:center"><span>Text</span></p></div>';
        assert.strictEqual(normalizeTextAlignment(html), '<div><p class="align-center"><span>Text</span></p></div>');
    });

    it('replaces conflicting alignment classes without removing unrelated classes', function() {
        const html = '<p class="align-left wp-text align-right msg msg--info" style="text-align:center">Text</p>';
        assert.strictEqual(normalizeTextAlignment(html), '<p class="wp-text msg msg--info align-center">Text</p>');
    });

    it('respects importance and duplicate alignment declarations', function() {
        const html = '<p style="text-align:left!important; text-align:right; color:red">Text</p>';
        const output = normalizeTextAlignment(html);
        assert.ok(output.includes('class="align-left"'));
        assert.ok(output.includes('color: red'));
        assert.doesNotMatch(output, /text-align:/);
    });

    it('recognizes CSS comments, escapes and uppercase property names', function() {
        for (const declaration of ['TEXT-ALIGN: CENTER', 'text-align: /* center */ center', 'text-ali\\67n:center']) {
            const output = normalizeTextAlignment('<h2 style="' + declaration + '">Title</h2>');
            assert.strictEqual(output, '<h2 class="align-center">Title</h2>');
        }
    });

    it('preserves other CSS values containing quotes, semicolons and entities', function() {
        const html = '<p style="background-image:url(&quot;data:image/svg+xml;a;b&quot;);--label:&quot;a;b&quot;;text-align:center">Text</p>';
        const output = normalizeTextAlignment(html);
        assert.ok(output.includes('data:image/svg+xml;a;b'));
        assert.ok(output.includes('--label:'));
        assert.ok(output.includes('a;b'));
        assert.ok(output.includes('class="align-center"'));
    });

    for (const html of [
        '<p class="theme-text" style="color:red">Text</p>',
        '<span style="text-align:center;color:red">Inline text</span>',
        '<p class="align-right" style="text-align:start;color:red">Text</p>',
        '<p style="text-align:var(--alignment);color:red">Text</p>',
        '<p style="text-align:center;all:unset">Text</p>',
        '<div class="" style=""><p align="center">Text</p></div>',
        '<pre style="text-align:center"><code style="text-align:left">&lt;p&gt;\n  code</code></pre>',
        '<div style="text-align:center"><iframe style="text-align:center" src="https://example.org/"></iframe></div>',
        '<div class="pec-overlay is-active" style="text-align:center">Consent</div>',
        '<form style="text-align:center"><input name="name"></form>',
        '<p class="theme-text" style="text-align:center">Text</p><script>init()</script>',
        '<p style="text-align:center" style="color:red">Malformed</p>'
    ]) {
        it('keeps unsupported, protected or unrelated markup: ' + html.slice(0, 70), function() {
            assert.strictEqual(normalizeTextAlignment(html), html);
        });
    }

    it('converts headings, lists, table cells and captions with valid block alignment', function() {
        const html = '<h2 style="text-align:right">Title</h2>' +
            '<ul style="text-align:left"><li style="text-align:justify">Item</li></ul>' +
            '<table><tbody><tr><td style="text-align:center">Cell</td></tr></tbody></table>' +
            '<figure><figcaption style="text-align:center">Caption</figcaption></figure>';
        const output = normalizeTextAlignment(html);
        assert.strictEqual(output, '<h2 class="align-right">Title</h2>' +
            '<ul class="align-left"><li class="align-justify">Item</li></ul>' +
            '<table><tbody><tr><td class="align-center">Cell</td></tr></tbody></table>' +
            '<figure><figcaption class="align-center">Caption</figcaption></figure>');
    });
});
