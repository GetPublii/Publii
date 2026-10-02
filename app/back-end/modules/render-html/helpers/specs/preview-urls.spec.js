/*
 * URLs of the preview: the preview on the local server uses the same URLs as the website on the server,
 * the preview rendered for the filesystem (file:///) needs index.html in every URL.
 * Uses an in-memory renderer mock; no site is modified.
 */
const assert = require('node:assert/strict');
const Handlebars = require('handlebars');
const URLHelper = require('../url');
const ContentHelper = require('../content');
const menuURLHelper = require('../../handlebars/helpers/menu-url');
const pageURLHelper = require('../../handlebars/helpers/page-url');

const SERVER_PREVIEW_URL = 'http://127.0.0.1:3000/demo';
const FILE_PREVIEW_URL = 'file:///sites/demo/preview';

function createRenderer (options = {}) {
    return {
        previewMode: !!options.previewMode,
        previewUrl: options.previewUrl || false,
        siteConfig: {
            domain: options.domain || 'https://example.test',
            advanced: {
                usePageAsFrontpage: false,
                urls: Object.assign({
                    cleanUrls: true,
                    addIndex: false,
                    postsPrefix: '',
                    tagsPrefix: 'tags',
                    tagsPrefixAfterPostsPrefix: false,
                    pageName: 'page'
                }, options.urls)
            }
        },
        cachedItems: {
            pages: {},
            pagesStructureHierarchy: {}
        }
    };
}

const production = urls => createRenderer({ urls });
const serverPreview = urls => createRenderer({ previewMode: true, previewUrl: SERVER_PREVIEW_URL, domain: SERVER_PREVIEW_URL, urls });
const filePreview = urls => createRenderer({ previewMode: true, domain: FILE_PREVIEW_URL, urls });

function compile (renderer, template, context = {}) {
    let handlebars = Handlebars.create();
    menuURLHelper(renderer, handlebars);
    pageURLHelper(renderer, handlebars);

    return handlebars.compile(template)(context);
}

describe('Preview URLs', function () {
    describe('URLHelper', function () {
        it('adds index.html only for the file preview or the "Always add index.html" option', function () {
            assert.equal(URLHelper.usesIndexHtml(production()), false);
            assert.equal(URLHelper.usesIndexHtml(production({ addIndex: true })), true);
            assert.equal(URLHelper.usesIndexHtml(serverPreview()), false);
            assert.equal(URLHelper.usesIndexHtml(serverPreview({ addIndex: true })), true);
            assert.equal(URLHelper.usesIndexHtml(filePreview()), true);
            assert.equal(URLHelper.usesIndexHtml(filePreview({ addIndex: true })), true);
        });

        it('recognizes the preview rendered for the filesystem', function () {
            assert.equal(URLHelper.isFilePreview(production()), false);
            assert.equal(URLHelper.isFilePreview(serverPreview()), false);
            assert.equal(URLHelper.isFilePreview(filePreview()), true);
            // Mocks and older code without the preview URL behave like the file preview
            assert.equal(URLHelper.isFilePreview({ previewMode: true }), true);
        });
    });

    describe('pageUrl helper', function () {
        it('builds pagination URLs like on the server for the server preview', function () {
            assert.equal(compile(serverPreview(), "{{pageUrl '' 1}}"), SERVER_PREVIEW_URL + '/');
            assert.equal(compile(serverPreview(), "{{pageUrl '' 2}}"), SERVER_PREVIEW_URL + '/page/2/');
            assert.equal(compile(serverPreview(), "{{pageUrl 'tags/news' 3}}"), SERVER_PREVIEW_URL + '/tags/news/page/3/');
            assert.equal(compile(production(), "{{pageUrl '' 2}}"), 'https://example.test/page/2/');
        });

        it('keeps index.html for the file preview and the "Always add index.html" option', function () {
            assert.equal(compile(filePreview(), "{{pageUrl '' 1}}"), FILE_PREVIEW_URL + '/index.html');
            assert.equal(compile(filePreview(), "{{pageUrl '' 2}}"), FILE_PREVIEW_URL + '/page/2/index.html');
            assert.equal(compile(production({ addIndex: true }), "{{pageUrl '' 2}}"), 'https://example.test/page/2/index.html');
            assert.equal(compile(serverPreview({ addIndex: true }), "{{pageUrl '' 2}}"), SERVER_PREVIEW_URL + '/page/2/index.html');
        });
    });

    describe('menuUrl helper', function () {
        it('uses clean URLs of posts in the server preview', function () {
            let post = { type: 'post', link: 'hello-world' };

            assert.equal(compile(serverPreview(), '{{menuUrl}}', post), SERVER_PREVIEW_URL + '/hello-world/');
            assert.equal(compile(serverPreview({ postsPrefix: 'blog' }), '{{menuUrl}}', post), SERVER_PREVIEW_URL + '/blog/hello-world/');
            assert.equal(compile(filePreview(), '{{menuUrl}}', post), FILE_PREVIEW_URL + '/hello-world/index.html');
            assert.equal(compile(production(), '{{menuUrl}}', post), 'https://example.test/hello-world/');
        });

        it('keeps the .html suffix of posts when clean URLs are disabled', function () {
            let post = { type: 'post', link: 'hello-world' };

            assert.equal(compile(serverPreview({ cleanUrls: false }), '{{menuUrl}}', post), SERVER_PREVIEW_URL + '/hello-world.html');
            assert.equal(compile(filePreview({ cleanUrls: false }), '{{menuUrl}}', post), FILE_PREVIEW_URL + '/hello-world.html');
        });

        it('builds URLs of the frontpage, tags and authors like on the server', function () {
            for (let [item, expected] of [
                [{ type: 'frontpage' }, '/'],
                [{ type: 'tags' }, '/tags/'],
                [{ type: 'tag', link: 'news' }, '/tags/news/'],
                [{ type: 'author', link: 'anna' }, '/authors/anna/']
            ]) {
                let renderer = serverPreview({ authorsPrefix: 'authors' });
                let fileRenderer = filePreview({ authorsPrefix: 'authors' });

                assert.equal(compile(renderer, '{{menuUrl}}', item), SERVER_PREVIEW_URL + expected, item.type);
                assert.equal(compile(fileRenderer, '{{menuUrl}}', item), FILE_PREVIEW_URL + expected + 'index.html', item.type);
            }
        });
    });

    describe('internal links', function () {
        it('resolves links to the frontpage, blog page and tags list like on the server', function () {
            let text = '<a href="#INTERNAL_LINK#/frontpage/1">a</a><a href="#INTERNAL_LINK#/blogpage/1">b</a><a href="#INTERNAL_LINK#/tags/1">c</a>';
            let resolve = (renderer, type) => ContentHelper.prepareInternalLinks(text, renderer, type);

            assert.equal(resolve(serverPreview(), 'frontpage').includes('href="' + SERVER_PREVIEW_URL + '"'), true);
            assert.equal(resolve(serverPreview(), 'blogpage').includes('href="' + SERVER_PREVIEW_URL + '"'), true);
            assert.equal(resolve(serverPreview(), 'tags').includes('href="' + SERVER_PREVIEW_URL + '/tags/"'), true);

            assert.equal(resolve(filePreview(), 'frontpage').includes('href="' + FILE_PREVIEW_URL + '/index.html"'), true);
            assert.equal(resolve(filePreview(), 'blogpage').includes('href="' + FILE_PREVIEW_URL + '/index.html"'), true);
            assert.equal(resolve(filePreview(), 'tags').includes('href="' + FILE_PREVIEW_URL + '/tags/index.html"'), true);
        });
    });
});
