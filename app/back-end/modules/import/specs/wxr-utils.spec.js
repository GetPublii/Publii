const assert = require('assert');
const WxrUtils = require('../wxr-utils.js');
const WxrParser = require('../wxr-parser.js');
const ContentHelper = require('../../render-html/helpers/content.js');

describe('WXR import utilities', function() {
    describe('#asArray', function() {
        it('normalizes missing, single and repeated WXR nodes', function() {
            assert.deepStrictEqual(WxrUtils.asArray(undefined), []);
            assert.deepStrictEqual(WxrUtils.asArray({ id: 1 }), [{ id: 1 }]);
            assert.deepStrictEqual(WxrUtils.asArray([{ id: 1 }]), [{ id: 1 }]);
        });
    });

    describe('#sanitizeTitle', function() {
        it('converts WordPress title markup to safe plain text', function() {
            assert.strictEqual(
                WxrUtils.sanitizeTitle('Markup: Title <em>With</em> <b>Mark<sup>up</sup></b>'),
                'Markup: Title With Markup'
            );
        });

        it('decodes HTML entities once and normalizes whitespace', function() {
            assert.strictEqual(
                WxrUtils.sanitizeTitle('Rock &amp; Roll &#039;  <br>  title'),
                "Rock & Roll ' title"
            );
        });

        it('preserves angle brackets which are plain title text rather than HTML tags', function() {
            assert.strictEqual(
                WxrUtils.sanitizeTitle('Comparison: 2 < 3 and 5 > 4'),
                'Comparison: 2 < 3 and 5 > 4'
            );
        });
    });

    describe('#createItemSlug', function() {
        it('preserves wp:post_name instead of regenerating it from the title', function() {
            assert.strictEqual(WxrUtils.createItemSlug({
                title: 'A completely different title',
                'wp:post_name': 'preserved-wordpress-slug'
            }), 'preserved-wordpress-slug');
        });

        it('uses the title when WordPress did not export a slug', function() {
            assert.strictEqual(WxrUtils.createItemSlug({
                title: 'Fallback title',
                'wp:post_name': ''
            }), 'fallback-title');
        });

        it('uses the last URL segment before the title when preserving WordPress slugs', function() {
            assert.strictEqual(WxrUtils.createItemSlug({
                title: 'Changed title',
                link: 'https://example.com/2024/05/category/original-url-slug/',
                'wp:post_name': ''
            }), 'original-url-slug');
        });

        it('generates a new slug from the title when requested', function() {
            assert.strictEqual(WxrUtils.createItemSlug({
                title: 'A completely different title',
                link: 'https://example.com/original-url-slug/',
                'wp:post_name': 'preserved-wordpress-slug'
            }, 'title'), 'a-completely-different-title');
        });

        it('cleans title markup and HTML entities before generating a slug', function() {
            assert.strictEqual(WxrUtils.createItemSlug({
                title: 'Markup: Title &lt;em&gt;With&lt;/em&gt; &lt;b&gt;Mark&lt;sup&gt;up&lt;/sup&gt;&lt;/b&gt; &amp; More',
                'wp:post_name': 'old-slug'
            }, 'title'), 'markup-title-with-markup-and-more');

            assert.ok(!WxrUtils.createItemSlug({
                title: 'Special &lt;strong&gt;title&lt;/strong&gt; &gt;',
                'wp:post_name': ''
            }, 'title').includes('greater'));
        });

        it('decodes a percent-encoded WordPress slug before normalizing it', function() {
            assert.strictEqual(WxrUtils.createItemSlug({
                title: 'Different title',
                'wp:post_name': 'if-you-say-it-you%e2%80%99ll-know'
            }), 'if-you-say-it-youll-know');
        });
    });

    describe('#createPubliiStatus', function() {
        it('publishes only content explicitly published in WordPress', function() {
            assert.strictEqual(WxrUtils.createPubliiStatus({ 'wp:status': 'publish' }), 'published');
            assert.strictEqual(WxrUtils.createPubliiStatus({ 'wp:status': 'pending' }), 'draft');
            assert.strictEqual(WxrUtils.createPubliiStatus({ 'wp:status': 'future' }), 'draft');
            assert.strictEqual(WxrUtils.createPubliiStatus({ 'wp:status': 'private' }), 'draft');
            assert.strictEqual(WxrUtils.createPubliiStatus({ 'wp:status': 'trash' }), 'draft,trashed');
        });

        it('maps WordPress sticky posts and Publii pages', function() {
            assert.strictEqual(WxrUtils.createPubliiStatus({
                'wp:status': 'publish',
                'wp:is_sticky': 1
            }), 'published,featured');
            assert.strictEqual(WxrUtils.createPubliiStatus({ 'wp:status': 'publish' }, true), 'published,is-page');
        });
    });

    describe('#isWordPressSystemPostType', function() {
        it('distinguishes WordPress internal records from real custom post types', function() {
            assert.strictEqual(WxrUtils.isWordPressSystemPostType('wp_template_part'), true);
            assert.strictEqual(WxrUtils.isWordPressSystemPostType('WP_GLOBAL_STYLES'), true);
            assert.strictEqual(WxrUtils.isWordPressSystemPostType('book'), false);
        });
    });

    describe('SEO metadata adapters', function() {
        function createItem(metaValues, postType = 'post') {
            return {
                title: 'Example',
                'wp:post_type': postType,
                'wp:postmeta': Object.entries(metaValues).map(entry => ({
                    'wp:meta_key': entry[0],
                    'wp:meta_value': entry[1]
                }))
            };
        }

        it('detects one provider without mixing values from another provider', function() {
            let yoastItem = createItem({
                _yoast_wpseo_title: '%%title%% %%sep%% %%sitename%%',
                _yoast_wpseo_metadesc: 'Yoast description'
            });
            let rankMathItem = createItem({ rank_math_description: 'Rank Math description' });
            let stats = WxrUtils.getSeoProviderStats([yoastItem, rankMathItem]);
            let data = WxrUtils.getSeoData(yoastItem, 'yoast');

            assert.deepStrictEqual(stats.detected, ['yoast', 'rank-math']);
            assert.strictEqual(stats.ambiguous, true);
            assert.strictEqual(data.metaTitle, '%posttitle - %sitename');
            assert.strictEqual(data.metaDesc, 'Yoast description');
        });

        it('converts serialized Rank Math robots and reports unsupported directives', function() {
            let data = WxrUtils.getSeoData(createItem({
                rank_math_robots: 'a:3:{i:0;s:7:"noindex";i:1;s:8:"nofollow";i:2;s:12:"noimageindex";}'
            }), 'rank-math');

            assert.strictEqual(data.metaRobots, 'noindex, nofollow');
            assert.deepStrictEqual(data.issues, [{
                field: 'robots',
                reason: 'unsupported-robots-directives',
                value: 'noimageindex'
            }]);
        });

        it('does not mistake ordinary AIOSEO hashtags for template variables', function() {
            let data = WxrUtils.getSeoData(createItem({
                _aioseop_description: 'News about #seo and #post_title'
            }), 'aioseo');

            assert.strictEqual(data.metaDesc, 'News about #seo and %posttitle');
            assert.deepStrictEqual(data.issues, []);
        });

        it('skips fields containing unsupported SEO template variables', function() {
            let data = WxrUtils.getSeoData(createItem({
                _yoast_wpseo_title: '%%title%% %%category%%'
            }), 'yoast');

            assert.strictEqual(data.metaTitle, '');
            assert.strictEqual(data.issues[0].reason, 'unsupported-template-variables');
            assert.strictEqual(data.issues[0].value, 'category');
        });
    });

    describe('#getImageUrls', function() {
        it('supports regular and common lazy-loading source attributes', function() {
            let html = [
                '<img src="https://example.com/a.jpg">',
                "<img src='https://example.com/b.jpg'>",
                '<img src=https://example.com/c.jpg>',
                '<img src="data:image/gif;base64,abc" data-src="https://example.com/lazy.jpg">',
                '<img data-lazy-src="https://example.com/plugin-lazy.jpg">',
                '<img src="data:image/png;base64,abc">'
            ].join('');

            assert.deepStrictEqual(WxrUtils.getImageUrls(html), [
                'https://example.com/a.jpg',
                'https://example.com/b.jpg',
                'https://example.com/c.jpg',
                'https://example.com/lazy.jpg',
                'https://example.com/plugin-lazy.jpg'
            ]);
        });

        it('distinguishes gallery images from regular content images', function() {
            let html = '<img src="https://example.com/shared.jpg">' +
                '<div class="gallery" data-columns="2"><figure class="gallery__item">' +
                '<a href="https://example.com/shared.jpg"><img src="https://example.com/shared.jpg"></a>' +
                '</figure><figure class="gallery__item"><img src="https://example.com/gallery.jpg"></figure></div>';

            assert.deepStrictEqual(WxrUtils.getImageReferences(html), [
                { url: 'https://example.com/shared.jpg', gallery: false },
                { url: 'https://example.com/shared.jpg', gallery: true },
                { url: 'https://example.com/gallery.jpg', gallery: true }
            ]);
        });
    });

    describe('#replaceGalleryImageUrls', function() {
        it('stores the full image and thumbnail using Publii gallery attributes', function() {
            let html = '<div class="gallery" data-columns="3">' +
                '<figure class="gallery__item"><a href="https://example.com/photo.jpg">' +
                '<img src="https://example.com/photo.jpg" srcset="old.jpg 2x" sizes="100vw" alt="Photo">' +
                '</a><figcaption>Caption</figcaption></figure>' +
                '<figure class="gallery__item"><a href="https://example.com/other.jpg">' +
                '<img src="https://example.com/other.jpg"></a></figure></div>';
            let migrated = WxrUtils.replaceGalleryImageUrls(
                html,
                ['http://example.com/photo.jpg', 'https://example.com/photo.jpg'],
                {
                    fullUrl: '#DOMAIN_NAME#gallery/photo.jpg',
                    thumbnailUrl: '#DOMAIN_NAME#gallery/photo-thumbnail.jpg',
                    fullWidth: 1600,
                    fullHeight: 900,
                    thumbnailWidth: 720,
                    thumbnailHeight: 405
                }
            );

            assert.strictEqual(
                migrated,
                '<div class="gallery" data-columns="3">' +
                    '<figure class="gallery__item"><a href="#DOMAIN_NAME#gallery/photo.jpg" data-size="1600x900">' +
                    '<img src="#DOMAIN_NAME#gallery/photo-thumbnail.jpg" alt="Photo" width="720" height="405">' +
                    '</a><figcaption>Caption</figcaption></figure>' +
                    '<figure class="gallery__item"><a href="https://example.com/other.jpg">' +
                    '<img src="https://example.com/other.jpg"></a></figure></div>'
            );
        });
    });

    describe('#replaceContentImageUrls', function() {
        it('does not overwrite a gallery or a separate external link using the same source URL', function() {
            let source = 'https://example.com/shared.jpg';
            let html = '<p><a href="' + source + '">Download</a></p>' +
                '<img src="' + source + '" data-srcset="old.jpg 2x">' +
                '<div class="gallery" data-columns="1"><figure class="gallery__item">' +
                '<a href="' + source + '"><img src="' + source + '"></a></figure></div>';
            let migrated = WxrUtils.replaceContentImageUrls(html, [source], '#DOMAIN_NAME#shared.jpg');

            assert.strictEqual(
                migrated,
                '<p><a href="https://example.com/shared.jpg">Download</a></p>' +
                    '<img src="#DOMAIN_NAME#shared.jpg" data-srcset="old.jpg 2x">' +
                    '<div class="gallery" data-columns="1"><figure class="gallery__item">' +
                    '<a href="https://example.com/shared.jpg"><img src="https://example.com/shared.jpg"></a>' +
                    '</figure></div>'
            );
        });
    });

    describe('WordPress gallery shortcodes', function() {
        it('converts explicit attachment IDs to editable Publii gallery markup', function() {
            let parser = new WxrParser(null, 'test-site');
            parser.temp.images[10] = {
                sourceID: '10',
                url: 'https://example.com/one.jpg?x=1&y=2',
                alt: 'One & "first"',
                caption: '<em>First caption</em>',
                parentID: '50',
                menuOrder: 2
            };
            parser.temp.images[11] = {
                sourceID: '11',
                url: 'https://example.com/two.jpg',
                alt: '',
                caption: '',
                parentID: '50',
                menuOrder: 1
            };

            let migrated = parser.preparePostText(
                '[gallery columns="2" ids="11,10"]',
                { 'wp:post_id': '50' }
            );

            assert.strictEqual(
                migrated,
                '<div class="gallery" data-is-empty="false" data-translation="Add images" data-columns="2">' +
                    '<figure class="gallery__item"><a href="https://example.com/two.jpg" data-size="">' +
                    '<img src="https://example.com/two.jpg" alt=""></a></figure>' +
                    '<figure class="gallery__item"><a href="https://example.com/one.jpg?x=1&amp;y=2" data-size="">' +
                    '<img src="https://example.com/one.jpg?x=1&amp;y=2" alt="One &amp; &quot;first&quot;">' +
                    '</a><figcaption><em>First caption</em></figcaption></figure></div>'
            );
        });

        it('uses attachments belonging to the post when the shortcode omits IDs', function() {
            let parser = new WxrParser(null, 'test-site');
            parser.temp.images[20] = {
                sourceID: '20', url: 'https://example.com/late.jpg', parentID: '50', menuOrder: 2
            };
            parser.temp.images[21] = {
                sourceID: '21', url: 'https://example.com/first.jpg', parentID: '50', menuOrder: 1
            };
            parser.temp.images[22] = {
                sourceID: '22', url: 'https://example.com/other-post.jpg', parentID: '99', menuOrder: 0
            };

            let migrated = parser.preparePostText('[gallery exclude="20"]', { 'wp:post_id': '50' });

            assert.ok(migrated.includes('data-columns="3"'));
            assert.ok(migrated.includes('https://example.com/first.jpg'));
            assert.ok(!migrated.includes('late.jpg'));
            assert.ok(!migrated.includes('other-post.jpg'));
        });
    });

    describe('#replaceStandaloneVideoEmbeds', function() {
        it('converts a standalone YouTube URL and preserves the remaining content', function() {
            let parser = new WxrParser(null, 'test-site');
            let migrated = parser.preparePostText(
                'https://www.youtube.com/watch?v=SQEQr7c0-dw\n\n' +
                'Learn more about <a href="https://codex.wordpress.org/Embeds">WordPress Embeds</a>.'
            );

            assert.ok(migrated.includes('<figure class="post__video"><iframe'));
            assert.ok(migrated.includes(
                'src="https://www.youtube.com/embed/SQEQr7c0-dw?feature=oembed"'
            ));
            assert.ok(migrated.includes(
                'Learn more about <a href="https://codex.wordpress.org/Embeds">WordPress Embeds</a>.'
            ));
            assert.ok(!migrated.includes('https://www.youtube.com/watch?v=SQEQr7c0-dw'));
        });

        it('preserves YouTube playlist and start-time parameters', function() {
            let migrated = WxrUtils.replaceStandaloneVideoEmbeds(
                'https://youtu.be/SQEQr7c0-dw?list=PL_test-123&t=1m30s'
            );

            assert.ok(migrated.includes(
                'src="https://www.youtube.com/embed/SQEQr7c0-dw?feature=oembed&amp;list=PL_test-123&amp;start=90"'
            ));
        });

        it('converts YouTube playlists without a video ID', function() {
            let migrated = WxrUtils.replaceStandaloneVideoEmbeds(
                '<p>https://www.youtube.com/playlist?list=PL_test-123</p>'
            );

            assert.ok(migrated.includes(
                'src="https://www.youtube.com/embed/videoseries?list=PL_test-123"'
            ));
        });

        it('converts Vimeo URLs, including private unlisted links', function() {
            let standard = WxrUtils.replaceStandaloneVideoEmbeds('https://vimeo.com/76979871');
            let unlisted = WxrUtils.replaceStandaloneVideoEmbeds(
                '[embed]https://vimeo.com/76979871/a1b2c3[/embed]'
            );

            assert.ok(standard.includes('src="https://player.vimeo.com/video/76979871"'));
            assert.ok(unlisted.includes(
                'src="https://player.vimeo.com/video/76979871?h=a1b2c3"'
            ));
        });

        it('converts WordPress YouTube and Vimeo shortcodes', function() {
            let youtube = WxrUtils.replaceStandaloneVideoEmbeds(
                '<!-- wp:shortcode -->\n' +
                '[youtube https://www.youtube.com/watch?v=ssfHW5lwFZg]\n' +
                '<!-- /wp:shortcode -->'
            );
            let vimeoUrl = WxrUtils.replaceStandaloneVideoEmbeds(
                '[vimeo=https://vimeo.com/76979871]'
            );
            let vimeoID = WxrUtils.replaceStandaloneVideoEmbeds('[vimeo 22439234]');

            assert.ok(youtube.includes('src="https://www.youtube.com/embed/ssfHW5lwFZg?feature=oembed"'));
            assert.ok(!youtube.includes('[youtube'));
            assert.ok(!youtube.includes('wp:shortcode'));
            assert.deepStrictEqual(WxrUtils.extractShortcodes(youtube), []);
            assert.deepStrictEqual(WxrUtils.extractWordPressBlocks(youtube), []);
            assert.ok(vimeoUrl.includes('src="https://player.vimeo.com/video/76979871"'));
            assert.ok(vimeoID.includes('src="https://player.vimeo.com/video/22439234"'));
        });

        it('does not convert invalid, escaped or code-sample video shortcodes', function() {
            let html = '[youtube https://example.com/video] ' +
                '[[youtube https://www.youtube.com/watch?v=ssfHW5lwFZg]] ' +
                '<code>[vimeo https://vimeo.com/76979871]</code>';

            assert.strictEqual(WxrUtils.replaceStandaloneVideoEmbeds(html), html);
        });

        it('converts a Gutenberg YouTube block and keeps its caption', function() {
            let html = '<!-- wp:core-embed/youtube {"url":"https://youtu.be/ex8fMxXJDJw"} -->' +
                '<figure class="wp-block-embed-youtube wp-block-embed is-type-video is-provider-youtube">' +
                '<div class="wp-block-embed__wrapper">\nhttps://youtu.be/ex8fMxXJDJw\n</div>' +
                '<figcaption class="wp-element-caption">YouTube<br></figcaption></figure>' +
                '<!-- /wp:core-embed/youtube -->';
            let migrated = WxrUtils.replaceStandaloneVideoEmbeds(html);

            assert.ok(migrated.startsWith('<figure class="post__video"><iframe'));
            assert.ok(migrated.includes('src="https://www.youtube.com/embed/ex8fMxXJDJw?feature=oembed"'));
            assert.ok(migrated.includes('<figcaption>YouTube<br></figcaption>'));
            assert.ok(!migrated.includes('wp-block-embed'));
            assert.ok(!migrated.includes('<!-- wp:'));
        });

        it('converts a Gutenberg Vimeo block', function() {
            let html = '<!-- wp:embed {"url":"https://vimeo.com/76979871","providerNameSlug":"vimeo"} -->' +
                '<figure class="wp-block-embed is-type-video is-provider-vimeo wp-block-embed-vimeo">' +
                '<div class="wp-block-embed__wrapper">https://vimeo.com/76979871</div></figure>' +
                '<!-- /wp:embed -->';
            let migrated = WxrUtils.replaceStandaloneVideoEmbeds(html);

            assert.ok(migrated.includes('class="post__video"'));
            assert.ok(migrated.includes('src="https://player.vimeo.com/video/76979871"'));
            assert.ok(!migrated.includes('wp-block-embed'));
        });

        it('remains valid when automatic paragraph conversion is enabled', function() {
            let parser = new WxrParser(null, 'test-site');
            parser.autop = true;
            let migrated = parser.preparePostText(
                'Before.\n\nhttps://vimeo.com/76979871\n\nAfter.'
            );

            assert.ok(migrated.includes('<p>Before.</p>'));
            assert.ok(migrated.includes('<figure class="post__video"><iframe'));
            assert.ok(migrated.includes('After.</p>'));
            assert.ok(!/<p>\s*<figure class="post__video">/.test(migrated));
        });

        it('leaves links, prose, code, existing embeds and unsupported pages unchanged', function() {
            let html = '<p><a href="https://youtu.be/SQEQr7c0-dw">Watch it</a></p>\n' +
                '<p>Video: https://vimeo.com/76979871</p>\n' +
                '<pre>https://youtu.be/SQEQr7c0-dw</pre>\n' +
                '<iframe src="https://www.youtube.com/embed/SQEQr7c0-dw"></iframe>\n' +
                'https://www.youtube.com/@WordPress';

            assert.strictEqual(WxrUtils.replaceStandaloneVideoEmbeds(html), html);
        });

        it('renders imported videos without adding a second Publii wrapper', function() {
            let renderer = {
                siteConfig: {
                    advanced: {
                        responsiveImages: false,
                        mediaLazyLoad: false,
                        forceWebp: false,
                        gdpr: {
                            vimeoNoTrack: false,
                            ytNoCookies: true
                        }
                    }
                }
            };
            let editorHtml = WxrUtils.replaceStandaloneVideoEmbeds(
                'https://www.youtube.com/watch?v=SQEQr7c0-dw'
            );
            let output = ContentHelper.prepareContent(
                42,
                editorHtml,
                'https://publii.example',
                {},
                renderer,
                'tinymce'
            );

            assert.ok(output.includes('<figure class="post__video"><iframe'));
            assert.ok(output.includes('https://www.youtube-nocookie.com/embed/SQEQr7c0-dw'));
            assert.ok(!output.includes('<div class="post__iframe"><figure class="post__video">'));
        });
    });

    describe('#stripWordPressResponsiveAttributes', function() {
        it('removes responsive URLs which still point at WordPress', function() {
            let html = '<img src="#DOMAIN_NAME#a.jpg" srcset="old-2x.jpg 2x" sizes="100vw" ' +
                'data-srcset="lazy-2x.jpg 2x" data-sizes="auto">';

            assert.strictEqual(
                WxrUtils.stripWordPressResponsiveAttributes(html, '#DOMAIN_NAME#a.jpg'),
                '<img src="#DOMAIN_NAME#a.jpg">'
            );
        });
    });

    describe('#removeSelfLinkedImageAnchor', function() {
        it('removes a full-size WordPress image self-link when img src uses resize parameters', function() {
            let html = '<figure><a href="https://example.com/uploads/photo.jpg">' +
                '<img src="#DOMAIN_NAME#photo.jpg"></a></figure>';

            assert.strictEqual(
                WxrUtils.removeSelfLinkedImageAnchor(
                    html,
                    ['https://example.com/uploads/photo.jpg?w=604'],
                    '#DOMAIN_NAME#photo.jpg'
                ),
                '<figure><img src="#DOMAIN_NAME#photo.jpg"></figure>'
            );
        });

        it('preserves an image link that points to a page', function() {
            let html = '<a href="https://example.com/photo/"><img src="#DOMAIN_NAME#photo.jpg"></a>';

            assert.strictEqual(
                WxrUtils.removeSelfLinkedImageAnchor(
                    html,
                    ['https://example.com/uploads/photo.jpg?w=604'],
                    '#DOMAIN_NAME#photo.jpg'
                ),
                html
            );
        });

        it('matches equivalent HTTP and HTTPS image URLs', function() {
            let html = '<a href="http://example.com/uploads/photo.jpg">' +
                '<img src="#DOMAIN_NAME#photo.jpg"></a>';

            assert.strictEqual(
                WxrUtils.removeSelfLinkedImageAnchor(
                    html,
                    ['https://example.com/uploads/photo.jpg?size=large'],
                    '#DOMAIN_NAME#photo.jpg'
                ),
                '<img src="#DOMAIN_NAME#photo.jpg">'
            );
        });

        it('removes a self-link already rewritten to the local image URL', function() {
            let html = '<a href="#DOMAIN_NAME#photo.jpg"><img src="#DOMAIN_NAME#photo.jpg"></a>';

            assert.strictEqual(
                WxrUtils.removeSelfLinkedImageAnchor(
                    html,
                    ['https://example.com/uploads/photo.jpg'],
                    '#DOMAIN_NAME#photo.jpg'
                ),
                '<img src="#DOMAIN_NAME#photo.jpg">'
            );
        });
    });

    describe('#createMediaFilename', function() {
        it('creates safe and deterministic unique filenames', function() {
            let used = new Set();
            let first = WxrUtils.createMediaFilename('https://example.com/media/My Image.jpg?ver=1', used);
            let second = WxrUtils.createMediaFilename('https://cdn.example.com/media/My Image.jpg?ver=2', used);

            assert.strictEqual(first, 'My-Image.jpg');
            assert.match(second, /^My-Image-[a-f0-9]{8}\.jpg$/);
        });
    });

    describe('#imageDownloadUrlVariants', function() {
        it('retries HTTP image URLs over HTTPS and without resize parameters', function() {
            assert.deepStrictEqual(
                WxrUtils.imageDownloadUrlVariants('http://example.com/image.jpg?w=300'),
                [
                    'http://example.com/image.jpg?w=300',
                    'https://example.com/image.jpg?w=300',
                    'http://example.com/image.jpg',
                    'https://example.com/image.jpg'
                ]
            );
        });

        it('does not add redundant variants for a canonical HTTPS image URL', function() {
            assert.deepStrictEqual(
                WxrUtils.imageDownloadUrlVariants('https://example.com/image.jpg'),
                ['https://example.com/image.jpg']
            );
        });
    });

    describe('#getDownloadErrorReason', function() {
        it('extracts a compact HTTP status from image-downloader errors', function() {
            assert.strictEqual(
                WxrUtils.getDownloadErrorReason(new Error('Request Failed.\nStatus Code: 404')),
                'HTTP 404'
            );
        });
    });

    describe('#sourceUrlVariants', function() {
        it('creates absolute and relative variants for internal-link migration', function() {
            let variants = WxrUtils.sourceUrlVariants('https://example.com/parent/page/');

            assert.ok(variants.includes('https://example.com/parent/page/'));
            assert.ok(variants.includes('https://example.com/parent/page'));
            assert.ok(variants.includes('/parent/page/'));
            assert.ok(variants.includes('/parent/page'));
        });

        it('does not map a missing item URL to the WordPress home page', function() {
            assert.deepStrictEqual(WxrUtils.sourceUrlVariants('', 'https://example.com/'), []);
        });

        it('does not create a relative root mapping for query-based WordPress URLs', function() {
            let variants = WxrUtils.sourceUrlVariants('https://example.com/?p=962');

            assert.ok(variants.includes('https://example.com/?p=962'));
            assert.ok(!variants.includes('/'));
        });
    });

    describe('#normalizeWordPressImageMarkup', function() {
        it('puts Publii image classes on IMG when there is no caption', function() {
            let html = '<figure class="wp-block-image size-full alignwide">' +
                '<img src="image.jpg" class="wp-image-12 custom-image"></figure>';

            assert.strictEqual(
                WxrUtils.normalizeWordPressImageMarkup(html),
                '<img src="image.jpg" class="post__image post__image--wide custom-image">'
            );
        });

        it('puts Publii image classes on FIGURE and not IMG when a caption exists', function() {
            let html = '<figure class="wp-block-image aligncenter size-large">' +
                '<img src="image.jpg" class="wp-image-12 custom-image">' +
                '<figcaption class="wp-element-caption">A caption</figcaption></figure>';
            let migrated = WxrUtils.normalizeWordPressImageMarkup(html);

            assert.strictEqual(
                migrated,
                '<figure class="post__image post__image--center"><img src="image.jpg" class="custom-image">' +
                    '<figcaption>A caption</figcaption></figure>'
            );
            assert.ok(!/<img[^>]*post__image/.test(migrated));
        });

        it('converts legacy WordPress caption shortcodes and preserves caption HTML', function() {
            let html = '[caption id="attachment_12" align="alignleft" width="300"]' +
                '<a href="image.jpg"><img class="size-full wp-image-12" src="image.jpg" /></a> ' +
                'Caption with <a href="/more">a link</a>.[/caption]';

            assert.strictEqual(
                WxrUtils.normalizeWordPressImageMarkup(html),
                '<figure class="post__image post__image--left"><a href="image.jpg"><img src="image.jpg" /></a>' +
                    '<figcaption>Caption with <a href="/more">a link</a>.</figcaption></figure>'
            );
        });

        it('does not create FIGURE for an empty WordPress caption', function() {
            let html = '[caption align="alignright"]<img src="image.jpg" class="wp-image-12">[/caption]';

            assert.strictEqual(
                WxrUtils.normalizeWordPressImageMarkup(html),
                '<img src="image.jpg" class="post__image post__image--right">'
            );
        });

        it('unwraps the older Gutenberg image container and keeps layout on IMG without a caption', function() {
            let html = '<div class="wp-block-image"><figure class="alignright">' +
                '<img src="image.jpg" class="wp-image-12"></figure></div>';

            assert.strictEqual(
                WxrUtils.normalizeWordPressImageMarkup(html),
                '<img src="image.jpg" class="post__image post__image--right">'
            );
        });

        it('converts a WordPress gallery to Publii gallery markup without post image classes', function() {
            let html = '<figure class="wp-block-gallery columns-2 alignwide"><ul class="blocks-gallery-grid">' +
                '<li class="blocks-gallery-item"><figure><img src="one.jpg" class="wp-image-1" width="100" height="80">' +
                '<figcaption class="blocks-gallery-item__caption">One</figcaption></figure></li>' +
                '<li class="blocks-gallery-item"><figure><img src="two.jpg" class="wp-image-2"></figure></li>' +
                '</ul></figure>';
            let migrated = WxrUtils.normalizeWordPressImageMarkup(html);

            assert.strictEqual(
                migrated,
                '<div class="gallery gallery-wrapper--wide" data-is-empty="false" ' +
                    'data-translation="Add images" data-columns="2">' +
                    '<figure class="gallery__item"><a href="one.jpg" data-size="100x80">' +
                    '<img src="one.jpg" width="100" height="80"><\/a><figcaption>One</figcaption></figure>' +
                    '<figure class="gallery__item"><a href="two.jpg" data-size="">' +
                    '<img src="two.jpg"><\/a></figure></div>'
            );
            assert.ok(!migrated.includes('post__image'));
            assert.ok(!migrated.includes('wp-image-'));
        });

        it('maps text alignment and separator classes with Publii equivalents', function() {
            let html = '<p class="has-text-align-center custom">Text</p>' +
                '<hr class="wp-block-separator has-alpha-channel-opacity is-style-wide">';

            assert.strictEqual(
                WxrUtils.normalizeWordPressImageMarkup(html),
                '<p class="align-center custom">Text</p><hr class="separator separator--long-line">'
            );
        });
    });

    describe('Publii image rendering compatibility', function() {
        it('renders plain images, captioned images and galleries without double wrappers', function() {
            let renderer = {
                siteConfig: {
                    advanced: {
                        responsiveImages: false,
                        mediaLazyLoad: false,
                        forceWebp: false,
                        gdpr: {
                            vimeoNoTrack: false,
                            ytNoCookies: false
                        }
                    }
                }
            };
            let editorHtml = '<p><img src="#DOMAIN_NAME#plain.jpg" class="post__image post__image--center"></p>' +
                '<figure class="post__image post__image--left"><img src="#DOMAIN_NAME#caption.jpg">' +
                '<figcaption>Caption</figcaption></figure>' +
                '<div class="gallery gallery-wrapper--wide" data-is-empty="false" ' +
                'data-translation="Add images" data-columns="2"><figure class="gallery__item">' +
                '<a href="#DOMAIN_NAME#one.jpg" data-size="100x80"><img src="#DOMAIN_NAME#one.jpg"></a>' +
                '</figure></div>';
            let output = ContentHelper.prepareContent(
                42,
                editorHtml,
                'https://publii.example',
                {},
                renderer,
                'tinymce'
            );

            assert.ok(output.includes(
                '<figure class="post__image post__image--center">' +
                '<img src="https://publii.example/media/posts/42/plain.jpg" ></figure>'
            ));
            assert.ok(output.includes(
                '<figure class="post__image post__image--left">' +
                '<img src="https://publii.example/media/posts/42/caption.jpg">' +
                '<figcaption>Caption</figcaption></figure>'
            ));
            assert.ok(output.includes('<div class="gallery-wrapper gallery-wrapper--wide">' +
                '<div class="gallery" data-is-empty="false" data-translation="Add images" data-columns="2">'));
            assert.ok(!/<figure class="post__image[^>]*>\s*<figure/.test(output));
        });
    });

    describe('#replaceInternalUrl', function() {
        it('rewrites exact relative URLs without changing longer paths', function() {
            let html = '<a href="/page">Page</a><a href="/page-two">Other</a>';
            let migrated = WxrUtils.replaceInternalUrl(html, '/page', '#INTERNAL_LINK#/page/10');

            assert.strictEqual(
                migrated,
                '<a href="#INTERNAL_LINK#/page/10">Page</a><a href="/page-two">Other</a>'
            );
        });

        it('does not rewrite an absolute URL which is only a prefix of another URL', function() {
            let html = '<a href="https://example.com/page">Page</a>' +
                '<a href="https://example.com/page-two">Other</a>';
            let migrated = WxrUtils.replaceInternalUrl(
                html,
                'https://example.com/page',
                '#INTERNAL_LINK#/page/10'
            );

            assert.strictEqual(
                migrated,
                '<a href="#INTERNAL_LINK#/page/10">Page</a>' +
                    '<a href="https://example.com/page-two">Other</a>'
            );
        });
    });

    describe('#migrationReportExtraction', function() {
        it('finds remaining WordPress shortcodes but ignores escaped and closing forms', function() {
            let shortcodes = WxrUtils.extractShortcodes(
                '[contact-form-7 id="12"] [[gallery]] [/contact-form-7] [broken-shortcode /] ' +
                '[simple boat] [caption boat]Content[/caption]'
            );

            assert.deepStrictEqual(shortcodes.map(item => item.name), [
                'contact-form-7',
                'broken-shortcode',
                'caption'
            ]);
        });

        it('finds opening Gutenberg block comments without counting closing comments', function() {
            let blocks = WxrUtils.extractWordPressBlocks(
                '<!-- wp:latest-posts {"postsToShow":5} /-->' +
                '<!-- wp:woocommerce/product-collection --><!-- /wp:woocommerce/product-collection -->'
            );

            assert.deepStrictEqual(blocks.map(item => item.name), [
                'latest-posts',
                'woocommerce/product-collection'
            ]);
        });

        it('extracts unique anchor destinations without image sources', function() {
            assert.deepStrictEqual(
                WxrUtils.extractLinkUrls(
                    '<a href="/missing/?a=1&amp;b=2">One</a>' +
                    '<a href="/missing/?a=1&amp;b=2"><img src="/image.jpg"></a>'
                ),
                ['/missing/?a=1&b=2']
            );
        });
    });
});
