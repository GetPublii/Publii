const assert = require('node:assert/strict');
const { parseFragment } = require('parse5');
const ContentHelper = require('../content');
const PostPreview = require('../../contexts/post-preview');
const PagePreview = require('../../contexts/page-preview');

for (const contextName of ['generation', 'post-preview', 'page-preview']) {
    describe('Content image wrapping: ' + contextName, function() {
        function render(html) {
            const siteConfig = {
                domain: 'https://publii.example',
                advanced: {
                    responsiveImages: false,
                    mediaLazyLoad: false,
                    gdpr: {}
                }
            };
            const context = {
                siteConfig,
                renderer: { siteConfig, inputDir: '' },
                themeConfig: {},
                editor: 'tinymce'
            };

            if (contextName === 'post-preview') {
                return PostPreview.prototype.prepareContent.call(context, html, 6);
            }

            if (contextName === 'page-preview') {
                return PagePreview.prototype.prepareContent.call(context, html, 6);
            }

            return ContentHelper.prepareContent(6, html, siteConfig.domain, {}, context.renderer);
        }

        for (const paragraph of [
            '<p class="align-center">Fixed background</p>',
            '<p>Text with <em>emphasis</em> and <a href="/page/">a link</a>.</p>',
            '<p title="A > B">Quoted attribute</p>'
        ]) {
            it('keeps the paragraph between two images outside their figures: ' + paragraph, function() {
                const first = '<img src="one.jpg" class="post__image">';
                const second = '<img src="two.jpg" class="post__image">';
                const output = render(first + paragraph + '\n' + second + '<p>After</p>');
                const nodes = parseFragment(output).childNodes.filter(node => node.tagName);

                assert.deepEqual(nodes.map(node => node.tagName), ['figure', 'p', 'figure', 'p']);
                assert.ok(output.includes('</figure>' + paragraph));
                assert.ok(output.endsWith('</figure><p>After</p>'));
                assert.equal(nodes[2].childNodes.filter(node => node.tagName).length, 1);
                assert.equal(nodes[2].childNodes[0].tagName, 'img');
            });
        }

        for (const attributes of ['', ' class="align-center"', ' title="A > B"']) {
            it('still unwraps paragraphs containing only one block image: ' + attributes, function() {
                const output = render('<p' + attributes + '>\n<img src="one.jpg" class="post__image">\n</p>');
                const nodes = parseFragment(output).childNodes.filter(node => node.tagName);

                assert.deepEqual(nodes.map(node => node.tagName), ['figure']);
                assert.equal(nodes[0].childNodes.filter(node => node.tagName)[0].tagName, 'img');
                assert.doesNotMatch(output, /<p\b/);
            });
        }
    });
}
