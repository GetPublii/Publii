const assert = require('node:assert/strict');
const SeoSettings = require('../seo-settings');

describe('SEO settings for the plugins API', function () {
    function site (advanced = {}, themeSettings = {}, config = {}) {
        return {
            config: Object.assign({
                name: 'my-site',
                displayName: 'My Site',
                domain: 'https://example.com',
                advanced: Object.assign({
                    urls: {
                        cleanUrls: true,
                        postsPrefix: 'blog',
                        tagsPrefix: 'tags',
                        authorsPrefix: 'authors',
                        pageName: 'page',
                        tagsPrefixAfterPostsPrefix: false,
                        authorsPrefixAfterPostsPrefix: true,
                        addIndex: false
                    }
                }, advanced)
            }, config),
            themeSettings
        };
    }

    it('returns the default meta values as they are stored and an empty string for missing ones', function () {
        let settings = SeoSettings.getSeoSettings(site({
            noIndexThisPage: 1,
            metaTitle: '%sitename',
            postMetaTitle: '%posttitle - %sitename',
            metaRobotsTags: 'noindex, follow'
        }));

        assert.equal(settings.siteName, 'my-site');
        assert.equal(settings.displayName, 'My Site');
        assert.equal(settings.noIndexThisPage, true);
        assert.equal(settings.metaTitle, '%sitename');
        assert.equal(settings.postMetaTitle, '%posttitle - %sitename');
        assert.equal(settings.metaRobotsTags, 'noindex, follow');
        assert.equal(settings.postMetaDescription, '');
        assert.equal(settings.metaRobotsAuthors, '');
    });

    it('returns the domain, URL settings and pagination noindex options', function () {
        let settings = SeoSettings.getSeoSettings(site({ homepageNoIndexPagination: true, tagNoIndexPagination: 0 }));

        assert.equal(settings.domain, 'https://example.com');
        assert.deepEqual(settings.urls, {
            cleanUrls: true,
            postsPrefix: 'blog',
            tagsPrefix: 'tags',
            authorsPrefix: 'authors',
            pageName: 'page',
            tagsPrefixAfterPostsPrefix: false,
            authorsPrefixAfterPostsPrefix: true,
            addIndex: false
        });
        assert.equal(settings.homepageNoIndexPagination, true);
        assert.equal(settings.tagNoIndexPagination, false);
        assert.equal(settings.authorNoIndexPagination, false);
    });

    it('detects tag and author pages with the same rules as the tag and author forms', function () {
        let enabled = SeoSettings.getSeoSettings(site({}, { renderer: { createTagPages: true, createAuthorPages: true } }));
        let notSupported = SeoSettings.getSeoSettings(site({}, {
            supportedFeatures: { tagPages: false, authorPages: false },
            renderer: { createTagPages: true, createAuthorPages: true }
        }));
        let disabled = SeoSettings.getSeoSettings(site({}, { supportedFeatures: {}, renderer: { createTagPages: false } }));

        assert.equal(enabled.tagPagesEnabled, true);
        assert.equal(enabled.authorPagesEnabled, true);
        assert.equal(notSupported.tagPagesEnabled, false);
        assert.equal(notSupported.authorPagesEnabled, false);
        assert.equal(disabled.tagPagesEnabled, false);
        assert.equal(disabled.authorPagesEnabled, false);
    });

    it('returns safe defaults when the site data is not loaded', function () {
        let settings = SeoSettings.getSeoSettings(undefined);

        assert.equal(settings.siteName, '');
        assert.equal(settings.domain, '');
        assert.equal(settings.urls.cleanUrls, false);
        assert.equal(settings.noIndexThisPage, false);
        assert.equal(settings.metaTitle, '');
        assert.equal(settings.tagPagesEnabled, false);
    });
});
