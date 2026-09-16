/*
 * Regression tests for internal links resolved inside config objects and custom HTML (#2306, #2586).
 * Uses an in-memory renderer mock; no site is modified.
 * Included in the full suite: npm test
 */
const assert = require('node:assert/strict');
const ContentHelper = require('../content');
const RendererContext = require('../../renderer-context');

function createRenderer(advanced = {}) {
    return {
        previewMode: false,
        siteConfig: {
            domain: 'https://example.test',
            advanced: {
                urls: { tagsPrefix: 'tags' },
                ...advanced
            }
        },
        themeConfig: {},
        plugins: {
            hasInsertions: () => false,
            hasModifiers: () => false
        },
        cachedItems: {
            posts: { 12: { url: 'https://example.test/post/' } },
            pages: { 7: { url: 'https://example.test/page/' } },
            tags: { 3: { url: 'https://example.test/tag/' } },
            authors: {
                1: { username: 'anna-nowak', url: 'https://example.test/author/' },
                2: { username: 'anna', url: 'https://example.test/author-anna/' }
            }
        }
    };
}

describe('Internal links in config objects', function () {
    it('resolves an internal link in a theme option with HTML (#2586)', function () {
        const config = { copyrightText: '<p><a href="#INTERNAL_LINK#/page/7">text</a></p>' };
        const result = ContentHelper.setInternalLinksInObject(config, createRenderer());

        assert.equal(result.copyrightText, '<p><a href="https://example.test/page/">text</a></p>');
    });

    it('resolves all internal link types in nested objects and arrays', function () {
        const markers = ['post/12', 'page/7', 'tag/3', 'tags/1', 'author/anna-nowak', 'frontpage/1', 'blogpage/1', 'file/media/files/guide.pdf'];
        const html = markers.map(marker => `<a href="#INTERNAL_LINK#/${marker}">Read</a>`).join('');
        const config = { footer: { text: html }, repeater: [{ content: html }] };
        const result = ContentHelper.setInternalLinksInObject(config, createRenderer());

        for (const value of [result.footer.text, result.repeater[0].content]) {
            assert.ok(!value.includes('#INTERNAL_LINK#'));
            assert.equal((value.match(/href="https:\/\/example\.test/g) || []).length, markers.length);
        }
    });

    it('keeps backslashes, quotes and new lines intact (#2306)', function () {
        const text = '<a href="#INTERNAL_LINK#/file/media/files/guide.pdf">PDF</a>\n"quoted" C:\\Users\\demo';
        const result = ContentHelper.setInternalLinksInObject({ text }, createRenderer());

        assert.equal(result.text, '<a href="https://example.test/media/files/guide.pdf">PDF</a>\n"quoted" C:\\Users\\demo');
    });

    it('resolves file and author links in plain text values without quotes', function () {
        const config = {
            fileUrl: '#INTERNAL_LINK#/file/media/files/guide.pdf',
            authorUrl: '#INTERNAL_LINK#/author/anna-nowak'
        };
        const result = ContentHelper.setInternalLinksInObject(config, createRenderer());

        assert.equal(result.fileUrl, 'https://example.test/media/files/guide.pdf');
        assert.equal(result.authorUrl, 'https://example.test/author/');
    });

    it('keeps the next lines of a multi-line plain text value intact', function () {
        const result = ContentHelper.setInternalLinksInObject({ text: '#INTERNAL_LINK#/file/media/files/guide.pdf\nNext line' }, createRenderer());

        assert.equal(result.text, 'https://example.test/media/files/guide.pdf\nNext line');
    });

    it('returns a deep copy and leaves the source config untouched', function () {
        const config = { logo: 'media/website/logo.png', nested: { link: '<a href="#INTERNAL_LINK#/post/12">Post</a>' } };
        const snapshot = JSON.parse(JSON.stringify(config));
        const result = ContentHelper.setInternalLinksInObject(config, createRenderer());

        result.logo = 'changed';
        result.nested.link = 'changed';

        assert.deepEqual(config, snapshot);
    });

    it('preserves non-string values', function () {
        const config = { enabled: true, count: 5, empty: null, list: [1, false, 'plain'] };

        assert.deepEqual(ContentHelper.setInternalLinksInObject(config, createRenderer()), config);
    });

    it('marks links to non-existing items instead of throwing', function () {
        const result = ContentHelper.setInternalLinksInObject({ text: '<a href="#INTERNAL_LINK#/page/999">Gone</a>' }, createRenderer());

        assert.equal(result.text, '<a href="#non-existing-page-with-id-999">Gone</a>');
    });
});

describe('Internal links in custom HTML code', function () {
    it('resolves internal links in a custom HTML option', function () {
        const renderer = createRenderer({ customFooterCode: '<a href="#INTERNAL_LINK#/post/12">Post</a>' });
        const context = new RendererContext(renderer);

        assert.equal(context.getCustomHTMLCode('customFooterCode', false), '<a href="https://example.test/post/">Post</a>');
    });

    it('resolves internal links in theme-defined custom HTML areas', function () {
        const context = new RendererContext(createRenderer());
        const result = context.getCustomHTMLCodeObject({ banner: '<a href="#INTERNAL_LINK#/tag/3">Tag</a>' }, false);

        assert.equal(result.banner, '<a href="https://example.test/tag/">Tag</a>');
    });
});

describe('File and author internal links', function () {
    it('resolves every file link in a single line', function () {
        const css = '.a{background:url(#INTERNAL_LINK#/file/media/files/a.jpg)}.b{background:url(#INTERNAL_LINK#/file/media/files/b.jpg)}';

        assert.equal(
            ContentHelper.setInternalLinks(css, createRenderer()),
            '.a{background:url(https://example.test/media/files/a.jpg)}.b{background:url(https://example.test/media/files/b.jpg)}'
        );
    });

    it('resolves every author link in a single line, ending at punctuation', function () {
        const text = 'Authors: #INTERNAL_LINK#/author/anna-nowak, #INTERNAL_LINK#/author/anna.';

        assert.equal(
            ContentHelper.setInternalLinks(text, createRenderer()),
            'Authors: https://example.test/author/, https://example.test/author-anna/.'
        );
    });

    it('does not mix up authors whose usernames share a prefix', function () {
        const html = '<a href="#INTERNAL_LINK#/author/anna">A</a><a href="#INTERNAL_LINK#/author/anna-nowak">B</a>';

        assert.equal(
            ContentHelper.setInternalLinks(html, createRenderer()),
            '<a href="https://example.test/author-anna/">A</a><a href="https://example.test/author/">B</a>'
        );
    });

    it('resolves links inside escaped HTML attributes', function () {
        const html = '<a href=\\"#INTERNAL_LINK#/author/anna-nowak\\">A</a><a href=\\"#INTERNAL_LINK#/file/media/files/guide.pdf\\">B</a>';

        assert.equal(
            ContentHelper.setInternalLinks(html, createRenderer()),
            '<a href=\\"https://example.test/author/\\">A</a><a href=\\"https://example.test/media/files/guide.pdf\\">B</a>'
        );
    });

    it('keeps links to unknown authors unchanged', function () {
        const html = '<a href="#INTERNAL_LINK#/author/unknown">X</a>';

        assert.equal(ContentHelper.setInternalLinks(html, createRenderer()), html);
    });
});
