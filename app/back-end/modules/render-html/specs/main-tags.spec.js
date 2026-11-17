const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const Handlebars = require('handlebars');
const RendererCache = require('../renderer-cache');
const RendererContext = require('../renderer-context');
const RendererPlugins = require('../renderer-plugins');
const HomeContext = require('../contexts/home');
const TagsContext = require('../contexts/tags');
const SearchContext = require('../contexts/search');
const TagContext = require('../contexts/tag');
const AuthorContext = require('../contexts/author');

const schema = fs.readFileSync(path.resolve(__dirname, '../../../sql/1.0.0.sql'), 'utf8');

describe('Main tags shared with themes and plugins', function () {
    let database;
    let renderer;
    let context;

    beforeEach(function () {
        database = new DatabaseSync(':memory:');
        database.exec(schema);
        renderer = {
            db: database,
            siteConfig: {
                name: 'Main tags test',
                domain: 'https://example.test',
                advanced: {
                    urls: {
                        tagsPrefix: 'tags'
                    },
                    gdpr: {},
                    displayEmptyTags: false,
                    metaTitle: '',
                    metaDescription: '',
                    tagsMetaTitle: '',
                    tagsMetaDescription: '',
                    tagMetaTitle: '',
                    tagMetaDescription: '',
                    authorMetaTitle: '',
                    authorMetaDescription: '',
                    searchMetaTitle: '',
                    searchMetaDescription: ''
                }
            },
            themeConfig: {
                config: {
                    excerptLength: 30
                },
                renderer: {},
                tagConfig: {},
                postConfig: {}
            },
            viewConfigStructure: {
                tagConfig: {},
                postConfig: {}
            },
            plugins: new RendererPlugins(''),
            cachedItems: {
                posts: {},
                pages: {},
                tags: {},
                mainTags: {},
                authors: {
                    1: {
                        id: 1,
                        name: 'Test author',
                        config: {},
                        additionalData: {}
                    }
                },
                postTags: {},
                tagsPostCounts: {},
                featuredImages: {
                    posts: {},
                    tags: {}
                }
            }
        };
        context = new RendererContext(renderer);

        addTag(1, 'Zulu');
        addTag(2, 'Alpha');
        addTag(3, 'A hidden tag', { isHidden: true });
        addTag(4, 'Unused');
    });

    afterEach(function () {
        database.close();
    });

    function addTag(id, name, additionalData = {}) {
        database.prepare(`
            INSERT INTO tags (id, name, slug, description, additional_data)
            VALUES (?, ?, ?, ?, ?)
        `).run(id, name, name.toLowerCase().replace(/ /g, '-'), 'Tag description', JSON.stringify(additionalData));
    }

    function addPost({ tags = [], core, status = 'published' } = {}) {
        const result = database.prepare(`
            INSERT INTO posts (title, authors, slug, text, created_at, modified_at, status, template)
            VALUES ('Test post', '1', 'test-post', '<p>Test content</p>', 1, 1, ?, 'post')
        `).run(status);
        const id = Number(result.lastInsertRowid);

        for (const tagID of tags) {
            database.prepare('INSERT INTO posts_tags (post_id, tag_id) VALUES (?, ?)').run(id, tagID);
        }

        if (core !== undefined) {
            database.prepare(`
                INSERT INTO posts_additional_data (post_id, key, value)
                VALUES (?, '_core', ?)
            `).run(id, JSON.stringify(core));
        }

        return id;
    }

    function prepareCache() {
        renderer.cachedItems.posts = {};
        renderer.cachedItems.postTags = {};
        renderer.cachedItems.tags = {};
        renderer.cachedItems.mainTags = {};
        renderer.cachedItems.tagsPostCounts = {};
        const cache = new RendererCache(renderer, renderer.themeConfig);
        cache.getTagPostCounts();
        cache.getTags();
        cache.getPostTags();
        cache.getPosts();
    }

    function loadCommonData() {
        renderer.commonData = {
            tags: context.getAllTags(),
            mainTags: context.getAllMainTags(),
            authors: [],
            pages: [],
            menus: {},
            unassignedMenus: {},
            featuredPosts: {
                homepage: [],
                tag: [],
                author: []
            },
            hiddenPosts: []
        };
    }

    function mainTagIDs() {
        return context.getAllMainTags().map(tag => tag.id);
    }

    it('includes single-tag fallbacks with missing or empty metadata without saving them', function () {
        const first = addPost({ tags: [1] });
        const second = addPost({ tags: [2], core: { mainTag: '' } });
        const metadata = database.prepare('SELECT * FROM posts_additional_data').all();
        prepareCache();

        assert.deepEqual(mainTagIDs(), [2, 1]);
        assert.equal(renderer.cachedItems.posts[first].mainTag.id, 1);
        assert.equal(renderer.cachedItems.posts[second].mainTag.id, 2);
        assert.deepEqual(database.prepare('SELECT * FROM posts_additional_data').all(), metadata);
    });

    it('uses the same alphabetical visible-tag fallback as the post', function () {
        const postID = addPost({ tags: [1, 3, 2], core: { mainTag: '' } });
        prepareCache();

        assert.equal(renderer.cachedItems.posts[postID].mainTag.id, 2);
        assert.deepEqual(mainTagIDs(), [2]);
    });

    it('keeps an explicit choice instead of adding the alphabetical fallback', function () {
        addPost({ tags: [1, 2], core: { mainTag: 1 } });
        prepareCache();

        assert.deepEqual(mainTagIDs(), [1]);
    });

    it('deduplicates explicit numeric and string IDs together with automatic choices', function () {
        addPost({ tags: [1], core: { mainTag: 1 } });
        addPost({ tags: [1], core: { mainTag: '1' } });
        addPost({ tags: [1] });
        addPost({ tags: [2] });
        prepareCache();

        assert.deepEqual(mainTagIDs(), [2, 1]);
    });

    it('keeps different tag IDs even when their names match', function () {
        addTag(5, 'Alpha');
        addPost({ tags: [2] });
        addPost({ tags: [5] });
        prepareCache();

        assert.deepEqual(mainTagIDs().sort(), [2, 5]);
    });

    const excludedStatuses = [
        'draft',
        'published,draft',
        'published,trashed',
        'published,hidden',
        'published,is-page',
        'scheduled'
    ];

    for (const status of excludedStatuses) {
        it('ignores an explicit main tag from ' + status + ' even when a public post uses that tag', function () {
            addPost({
                tags: [1, 2],
                core: {
                    mainTag: ''
                }
            });
            addPost({
                tags: [1],
                core: {
                    mainTag: 1
                },
                status
            });
            prepareCache();

            for (const displayEmptyTags of [false, true]) {
                renderer.siteConfig.advanced.displayEmptyTags = displayEmptyTags;
                loadCommonData();
                const home = new HomeContext(renderer).getContext();

                assert.deepEqual(mainTagIDs(), [2]);
                assert.deepEqual(home.mainTags.map(tag => tag.id), [2]);
                assert.equal(home.tags.find(tag => tag.id === 1).isMainTag, false);
            }
        });
    }

    it('preserves the displayEmptyTags setting for explicit choices on public posts', function () {
        renderer.themeConfig.renderer.tagsIncludeFeaturedInPosts = false;
        addPost({
            tags: [4],
            core: {
                mainTag: 4
            },
            status: 'published,featured'
        });
        prepareCache();

        assert.deepEqual(mainTagIDs(), []);
        renderer.siteConfig.advanced.displayEmptyTags = true;
        assert.deepEqual(mainTagIDs(), [4]);
    });

    it('does not restore main tags from drafts when displayEmptyTags is enabled', function () {
        addPost({
            tags: [4],
            core: {
                mainTag: 4
            },
            status: 'draft'
        });
        renderer.siteConfig.advanced.displayEmptyTags = true;
        prepareCache();

        assert.deepEqual(mainTagIDs(), []);
    });

    it('updates the list across publication, draft, trash, hiding and republication', function () {
        addPost({ tags: [1, 2] });
        const postID = addPost({
            tags: [1],
            core: {
                mainTag: 1
            }
        });

        for (const status of ['published', 'draft', 'published,trashed', 'published,hidden', 'published']) {
            database.prepare('UPDATE posts SET status = ? WHERE id = ?').run(status, postID);
            prepareCache();
            loadCommonData();
            const expected = status === 'published' ? [2, 1] : [2];

            assert.deepEqual(mainTagIDs(), expected);
            assert.deepEqual(new HomeContext(renderer).getContext().mainTags.map(tag => tag.id), expected);
        }
    });

    it('applies existing tag counts and displayEmptyTags to automatic choices', function () {
        renderer.themeConfig.renderer.tagsIncludeFeaturedInPosts = false;
        addPost({ tags: [1], status: 'published;featured' });
        prepareCache();

        assert.equal(renderer.cachedItems.tags[1].postsNumber, 0);
        assert.deepEqual(mainTagIDs(), []);
        renderer.siteConfig.advanced.displayEmptyTags = true;
        assert.deepEqual(mainTagIDs(), [1]);
    });

    it('does not add automatic choices from drafts, trash, hidden posts or pages', function () {
        renderer.siteConfig.advanced.displayEmptyTags = true;

        for (const status of ['draft', 'published;trashed', 'published;hidden', 'published;is-page', 'scheduled']) {
            addPost({ tags: [1], status });
        }

        prepareCache();
        assert.deepEqual(mainTagIDs(), []);
    });

    it('returns an empty list for posts without visible tags', function () {
        addPost();
        addPost({ tags: [3] });
        prepareCache();

        assert.deepEqual(mainTagIDs(), []);
    });

    it('uses the visible fallback for hidden or deleted explicit choices', function () {
        addPost({ tags: [1, 3], core: { mainTag: 3 } });
        addPost({ tags: [2], core: { mainTag: 999 } });
        prepareCache();
        loadCommonData();
        const home = new HomeContext(renderer).getContext();

        assert.deepEqual(home.mainTags.map(tag => tag.id), [2, 1]);
        assert.ok(home.tags.every(tag => tag.id !== 3));
    });

    it('keeps homepage main tags stable across pagination without homepage-excluded posts', function () {
        addPost({ tags: [1] });
        addPost({ tags: [2], status: 'published;featured' });
        addPost({ tags: [4], status: 'published;excluded_homepage' });
        prepareCache();
        loadCommonData();
        const homeContext = new HomeContext(renderer);

        assert.deepEqual(mainTagIDs(), [2, 4, 1]);

        for (const offset of [0, 1]) {
            const home = homeContext.getContext(offset, 1);
            assert.equal(home.posts.length, 1);
            assert.deepEqual(home.mainTags.map(tag => tag.id), [2, 1]);
        }
    });

    for (const core of [undefined, { mainTag: 1 }]) {
        const choice = core ? 'explicit' : 'automatic';

        it('excludes a homepage-excluded ' + choice + ' choice even if that tag is secondary on the homepage', function () {
            addPost({ tags: [1, 2] });
            const excludedPostID = addPost({
                tags: [1],
                core,
                status: 'published,featured,excluded_homepage'
            });
            prepareCache();
            loadCommonData();
            renderer.commonData.featuredPosts.homepage = [{ id: excludedPostID }];
            const home = new HomeContext(renderer).getContext();

            assert.deepEqual(home.mainTags.map(tag => tag.id), [2]);
            assert.equal(home.tags.find(tag => tag.id === 1).isMainTag, false);
            assert.deepEqual(renderer.commonData.mainTags.map(tag => tag.id), [2, 1]);

            const tag = new TagContext(renderer).getContext(1);
            const author = new AuthorContext(renderer).getContext(1);

            for (const data of [tag, author]) {
                assert.deepEqual(data.mainTags.map(item => item.id), [2, 1]);
                assert.ok(data.posts.some(post => post.id === excludedPostID));
            }
        });
    }

    it('keeps a tag used as main by another homepage post and updates it when that post is excluded', function () {
        const homepagePostID = addPost({ tags: [1] });
        addPost({
            tags: [1],
            status: 'published,excluded_homepage'
        });
        prepareCache();
        loadCommonData();

        assert.deepEqual(new HomeContext(renderer).getContext().mainTags.map(tag => tag.id), [1]);

        database.prepare('UPDATE posts SET status = ? WHERE id = ?')
            .run('published,excluded_homepage', homepagePostID);
        prepareCache();
        loadCommonData();

        assert.deepEqual(mainTagIDs(), [1]);
        assert.deepEqual(new HomeContext(renderer).getContext().mainTags, []);
    });

    it('keeps homepage isMainTag flags isolated from global tags and other contexts', function () {
        addPost({ tags: [1, 2] });
        addPost({
            tags: [1],
            status: 'published,excluded_homepage'
        });
        prepareCache();
        loadCommonData();
        const globalTags = new TagsContext(renderer).getContext();
        const commonBefore = JSON.parse(JSON.stringify(renderer.commonData));
        const home = new HomeContext(renderer).getContext();

        assert.deepEqual(renderer.commonData, commonBefore);
        assert.equal(globalTags.tags.find(tag => tag.id === 1).isMainTag, true);
        assert.equal(home.tags.find(tag => tag.id === 1).isMainTag, false);

        new SearchContext(renderer).getContext();
        assert.equal(home.tags.find(tag => tag.id === 1).isMainTag, false);
    });

    it('preserves plugin edits to common main-tag data when selecting homepage tags', function () {
        addPost({ tags: [1] });
        prepareCache();
        loadCommonData();
        renderer.commonData.mainTags[0].name = 'Plugin label';
        renderer.commonData.mainTags[0].pluginData = {
            label: 'Custom field'
        };

        const home = new HomeContext(renderer).getContext();
        assert.equal(home.mainTags[0].name, 'Plugin label');
        assert.deepEqual(home.mainTags[0].pluginData, { label: 'Custom field' });
    });

    it('honors plugin visibility flags for explicit and automatic main tags', function () {
        renderer.plugins.addModifier('postItemData', (instance, post) => {
            if (post.id === 1) {
                post.isHidden = true;
            } else {
                post.isExcludedOnHomepage = true;
            }

            return post;
        }, 1, {});
        addPost({
            tags: [1],
            core: {
                mainTag: 1
            }
        });
        addPost({ tags: [2] });
        prepareCache();
        loadCommonData();

        assert.deepEqual(mainTagIDs(), [2]);
        assert.deepEqual(new HomeContext(renderer).getContext().mainTags, []);
    });

    it('supplies matching mainTags and isMainTag values to existing template contexts', function () {
        addPost({ tags: [1, 2] });
        prepareCache();
        loadCommonData();
        const template = Handlebars.compile(`
            {{#each mainTags}}<button data-filter=".{{slug}}">{{name}}</button>{{/each}}
            {{#each posts}}<article class="{{mainTag.slug}}"></article>{{/each}}
        `);

        for (const Context of [HomeContext, TagsContext, SearchContext]) {
            const data = new Context(renderer).getContext();
            const html = template(data);

            assert.deepEqual(data.mainTags.map(tag => tag.id), [2]);
            assert.equal(data.tags.find(tag => tag.id === 2).isMainTag, true);
            assert.equal(data.tags.find(tag => tag.id === 1).isMainTag, false);
            assert.ok(html.includes('<button data-filter=".alpha">Alpha</button>'));

            if (Context === HomeContext) {
                assert.ok(html.includes('<article class="alpha"></article>'));
            }
        }
    });

    it('preserves file preview tag URLs', function () {
        renderer.previewMode = true;
        renderer.siteConfig.advanced.urls.cleanUrls = true;
        addPost({ tags: [1] });
        prepareCache();

        assert.equal(context.getAllMainTags()[0].url, 'https://example.test/tags/zulu/index.html');
    });

    it('preserves plugin tag fields and returns independent copies without mutating cached data', function () {
        renderer.plugins.addModifier('tagItemData', (instance, tag) => {
            tag.pluginData = {
                label: 'Plugin label'
            };
            tag.featuredImage = {
                url: 'https://example.test/tag.jpg'
            };
            return tag;
        }, 1, {});
        addPost({ tags: [1] });
        prepareCache();
        const snapshot = JSON.parse(JSON.stringify(renderer.cachedItems));
        const tags = context.getAllMainTags();

        assert.deepEqual(tags[0], snapshot.tags[1]);
        assert.equal(tags[0].url, 'https://example.test/tags/zulu/');
        tags[0].pluginData.label = 'Changed by consumer';
        tags[0].featuredImage.url = 'Changed image';
        tags[0].additionalData.isHidden = true;

        assert.deepEqual(renderer.cachedItems, snapshot);
        assert.deepEqual(context.getAllMainTags(), [snapshot.tags[1]]);
    });

    it('honors a plugin-modified post main tag using the canonical cached tag object', function () {
        renderer.plugins.addModifier('postItemData', (instance, post) => {
            post.mainTag = {
                id: '1'
            };
            return post;
        }, 1, {});
        addPost({ tags: [1, 2] });
        prepareCache();

        assert.deepEqual(context.getAllMainTags(), [renderer.cachedItems.tags[1]]);
    });

    it('ignores absent main tags and unknown tag IDs returned by plugins', function () {
        renderer.plugins.addModifier('postItemData', (instance, post) => {
            post.mainTag = post.id === 1 ? false : { id: 999 };
            return post;
        }, 1, {});
        addPost({ tags: [1] });
        addPost({ tags: [2] });
        prepareCache();

        assert.deepEqual(mainTagIDs(), []);
    });

    it('exposes the updated list to plugin events without changing post data', function () {
        addPost({ tags: [1] });
        prepareCache();
        const postsBefore = JSON.parse(JSON.stringify(renderer.cachedItems.posts));
        let receivedTags;
        renderer.plugins.addEvent('beforeRender', instance => {
            receivedTags = instance.commonData.mainTags;
        }, 1, {});
        loadCommonData();
        renderer.plugins.runEvents('beforeRender', renderer);

        assert.deepEqual(receivedTags.map(tag => tag.id), [1]);
        assert.deepEqual(renderer.cachedItems.posts, postsBefore);
    });
});
