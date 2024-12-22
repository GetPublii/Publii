const assert = require('assert');
const URLHelper = require('../url.js');

describe('URL helper', function() {
    describe('#URLHelper.createSlug', function() {
        it('should create a slug from a given text', function () {
            assert.equal('lorem-ipsum', URLHelper.createSlug('lorem ipsum'));
        });

        it('should create a slug without dots', function () {
            assert.equal('loremipsum', URLHelper.createSlug('lorem.ipsum'));
        });
    });

    describe('#URLHelper.createTagPermalink', function() {
        let urlsConfig = {
            tagsPrefix: ''
        };

        let urlsConfigWithPrefix = {
            tagsPrefix: 'tags'
        };

        it('should create a slug from a given tag name', function () {
            assert.equal(
                'http://example.com/lorem-ipsum/',
                URLHelper.createTagPermalink('http://example.com', urlsConfig, 'lorem ipsum')
            );
        });

        it('should add index.html when it is requried', function () {
            assert.equal(
                'http://example.com/lorem-ipsum/index.html',
                URLHelper.createTagPermalink('http://example.com', urlsConfig, 'lorem ipsum', true)
            );
        });

        it('should create a prefixed slug from a given tag name', function () {
            assert.equal(
                'http://example.com/tags/lorem-ipsum/',
                URLHelper.createTagPermalink('http://example.com', urlsConfigWithPrefix, 'lorem ipsum')
            );
        });

        it('should add index.html when it is requried for prefixed slug', function () {
            assert.equal(
                'http://example.com/tags/lorem-ipsum/index.html',
                URLHelper.createTagPermalink('http://example.com', urlsConfigWithPrefix, 'lorem ipsum', true)
            );
        });
    });

    describe('#URLHelper.createPaginationPermalink', function() {
        let themeConfig = {
            supportedFeatures: {
                postsPage: false
            }
        };

        let siteConfig = {
            domain: 'http://example.com',
            advanced: {
                urls: {
                    cleanUrls: false,
                    tagsPrefix: '',
                    authorsPrefix: 'authors',
                    pageName: 'page',
                    errorPage: '404.html',
                    searchPage: 'search.html'
                }
            }
        };

        it('should create a proper URL for different types of pages', function () {
            assert.equal(
                'http://example.com/lorem-ipsum/page/2/',
                URLHelper.createPaginationPermalink(siteConfig, themeConfig, 2, '', 'lorem-ipsum')
            );

            assert.equal(
                'http://example.com/page/2/',
                URLHelper.createPaginationPermalink(siteConfig, themeConfig, 2, '', false)
            );

            assert.equal(
                'http://example.com/authors/lorem-ipsum/page/2/',
                URLHelper.createPaginationPermalink(siteConfig, themeConfig, 2, 'author', 'lorem-ipsum')
            );
        });

        it('should create a proper URL for the first page', function () {
            assert.equal(
                'http://example.com/lorem-ipsum/',
                URLHelper.createPaginationPermalink(siteConfig, themeConfig, 1, '', 'lorem-ipsum')
            );

            assert.equal(
                'http://example.com/',
                URLHelper.createPaginationPermalink(siteConfig, themeConfig, 1, '', false)
            );

            assert.equal(
                'http://example.com/authors/lorem-ipsum/',
                URLHelper.createPaginationPermalink(siteConfig, themeConfig, 1, 'author', 'lorem-ipsum')
            );
        });

        it('should create a proper URL with index.html when it is required', function () {
            assert.equal(
                'http://example.com/lorem-ipsum/index.html',
                URLHelper.createPaginationPermalink(siteConfig, themeConfig, 1, '', 'lorem-ipsum', true)
            );

            assert.equal(
                'http://example.com/index.html',
                URLHelper.createPaginationPermalink(siteConfig, themeConfig, 1, '', false, true)
            );

            assert.equal(
                'http://example.com/authors/lorem-ipsum/index.html',
                URLHelper.createPaginationPermalink(siteConfig, themeConfig, 1, 'author', 'lorem-ipsum', true)
            );

            assert.equal(
                'http://example.com/lorem-ipsum/page/2/index.html',
                URLHelper.createPaginationPermalink(siteConfig, themeConfig, 2, '', 'lorem-ipsum', true)
            );

            assert.equal(
                'http://example.com/page/2/index.html',
                URLHelper.createPaginationPermalink(siteConfig, themeConfig, 2, '', false, true)
            );

            assert.equal(
                'http://example.com/authors/lorem-ipsum/page/2/index.html',
                URLHelper.createPaginationPermalink(siteConfig, themeConfig, 2, 'author', 'lorem-ipsum', true)
            );
        });
    });

    describe('#URLHelper.createImageURL', function() {
        it('should create a proper URL for different types of pages', function () {
            assert.equal(
                'http://example.com/media/posts/10/img.jpg',
                URLHelper.createImageURL('http://example.com', 10, 'img.jpg', 'post')
            );
        });
    });

    describe('#URLHelper.transformAssetURLIntoPath', function() {
        // inputDir, assetUrl, websiteUrl

        it('should create a proper path for a given media URL', function () {
            assert.equal('sites/media/posts/10/img.jpg', URLHelper.transformAssetURLIntoPath('sites', 'http://example.com/media/posts/10/img.jpg', 'http://example.com'));
        });

        it('should remove index.html from the website URL', function () {
            assert.equal('sites/media/posts/10/img.jpg', URLHelper.transformAssetURLIntoPath('sites', 'http://example.com/media/posts/10/img.jpg', 'http://example.com/index.html'));
        });
    });

    describe('#URLHelper.fixProtocols', function() {
        it('should fix http protocol URLs', function () {
            assert.equal('http://example.com/index.html', URLHelper.fixProtocols('http:/example.com/index.html'));
            assert.equal('http://example.com/index.html', URLHelper.fixProtocols('http:///example.com/index.html'));
        });

        it('should fix https protocol URLs', function () {
            assert.equal('https://example.com/index.html', URLHelper.fixProtocols('https:/example.com/index.html'));
            assert.equal('https://example.com/index.html', URLHelper.fixProtocols('https:///example.com/index.html'));
        });

        it('should fix file protocol URLs', function () {
            assert.equal('file:///example.com/index.html', URLHelper.fixProtocols('file:/example.com/index.html'));
            assert.equal('file:///example.com/index.html', URLHelper.fixProtocols('file://example.com/index.html'));
        });
    });
});
