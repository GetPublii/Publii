const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const DBUtils = require('../helpers/db.utils.js');
const openDatabase = require('../helpers/db.connection.js');
const ContentDetails = require('../content-details.js');

const siteName = 'content-details-test';
const schema = fs.readFileSync(path.resolve(__dirname, '../sql/1.0.0.sql'), 'utf8');

describe('Content details API (plugins)', function () {
    let database;
    let sitesDir;
    let siteConfig;
    let application;
    let contentDetails;

    function writeJson(filePath, data) {
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(filePath, JSON.stringify(data));
    }

    function themeConfigWithExcerptLength(value) {
        return {
            name: 'Test theme',
            config: [{ name: 'excerptLength', label: 'Excerpt length', value, type: 'number' }],
            customConfig: [],
            postConfig: [],
            pageConfig: [],
            tagConfig: [],
            authorConfig: []
        };
    }

    beforeEach(function () {
        sitesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'publii-content-details-'));
        database = new DBUtils(openDatabase(':memory:'));
        database.exec(schema);
        siteConfig = { name: siteName, theme: 'test-theme', advanced: { urls: { cleanUrls: true } } };
        application = {
            appDir: path.resolve(__dirname, '../..'),
            sitesDir,
            sites: { [siteName]: siteConfig },
            getDbForSite: () => database
        };
        writeJson(path.join(sitesDir, siteName, 'input', 'themes', 'test-theme', 'config.json'), themeConfigWithExcerptLength(5));
        contentDetails = new ContentDetails(application, { site: siteName });
    });

    afterEach(function () {
        database.close();
        fs.rmSync(sitesDir, { recursive: true, force: true });
    });

    function addPost(id, text = '', status = 'published', editor = null) {
        database.prepare(`INSERT INTO posts VALUES(@id, 'Post', '1', @slug, @text, 0, 1000, 1000, @status, '')`).run({ id, slug: 'post-' + id, text, status });

        if (editor) {
            database.prepare(`INSERT INTO posts_additional_data VALUES(NULL, @id, '_core', @value)`).run({ id, value: JSON.stringify({ editor, metaTitle: '' }) });
        }
    }

    function addFeaturedImage(postID, imageID, file, additionalData) {
        database.prepare(`INSERT INTO posts_images VALUES(@imageID, @postID, @file, '', '', @additionalData)`).run({ imageID, postID, file, additionalData });
        database.prepare(`UPDATE posts SET featured_image_id = @imageID WHERE id = @postID`).run({ imageID, postID });
    }

    function mediaURL(postID, file = '') {
        return pathToFileURL(path.join(sitesDir, siteName, 'input', 'media', 'posts', String(postID))).href + '/' + file;
    }

    describe('items', function () {
        it('reads posts or pages, newest first, and always returns the editor', function () {
            addPost(1);
            addPost(2, '', 'published,is-page');
            addPost(3, '', 'draft', 'markdown');

            let posts = contentDetails.read('post', { include: [] });
            let pages = contentDetails.read('page', { include: [] });

            assert.deepEqual(posts, { status: 'success', items: [{ itemID: 3, editor: 'markdown' }, { itemID: 1, editor: 'tinymce' }] });
            assert.deepEqual(pages.items, [{ itemID: 2, editor: 'tinymce' }]);
        });

        it('returns the asked items in the same order and reports missing ones', function () {
            addPost(1);
            addPost(2);
            addPost(3, '', 'published,is-page');

            let result = contentDetails.read('post', { include: [], ids: [2, 1, 99, 3] });

            assert.deepEqual(result.items.map(item => item.itemID), [2, 1, 99, 3]);
            assert.equal(result.items[2].errors[0].errorCode, 'item-not-found');
            // A page is not a post
            assert.equal(result.items[3].errors[0].errorCode, 'item-not-found');
        });

        it('reads only the asked details and skips unknown ones', function () {
            addPost(1, '<p>Text</p>');

            let item = contentDetails.read('post', { include: ['excerpt', 'futureDetail'] }).items[0];

            assert.deepEqual(Object.keys(item), ['itemID', 'editor', 'excerpt']);
            assert.deepEqual(Object.keys(contentDetails.read('post').items[0]), ['itemID', 'editor', 'featuredImage', 'excerpt', 'images']);
        });

        it('rejects invalid options, item types and a missing database', function () {
            assert.equal(contentDetails.read('tag').errorCode, 'invalid-item-type');
            assert.equal(contentDetails.read('post', { include: 'images' }).errorCode, 'invalid-option');
            assert.equal(contentDetails.read('post', { ids: [1, 'abc'] }).errorCode, 'invalid-item-id');
            assert.equal(contentDetails.read('post', { ids: 5 }).errorCode, 'invalid-item-id');

            application.getDbForSite = () => false;
            assert.equal(new ContentDetails(application, { site: siteName }).read('post').errorCode, 'db-unavailable');
        });

        it('changes nothing in the database', function () {
            addPost(1, '<p><img src="#DOMAIN_NAME#a.jpg" alt=""></p>');
            addFeaturedImage(1, 5, 'photo.jpg', '{"alt":"A"}');
            let before = JSON.stringify([database.prepare('SELECT * FROM posts').all(), database.prepare('SELECT * FROM posts_images').all()]);

            contentDetails.read('post');

            assert.equal(JSON.stringify([database.prepare('SELECT * FROM posts').all(), database.prepare('SELECT * FROM posts_images').all()]), before);
        });
    });

    describe('featured image', function () {
        it('returns the file, its address on disk and the texts', function () {
            addPost(1);
            addPost(2);
            addFeaturedImage(1, 5, 'photo.jpg', JSON.stringify({ alt: 'Moon', caption: '', credits: 'Bob', custom: 1 }));

            let items = contentDetails.read('post', { include: ['featuredImage'] }).items;

            assert.deepEqual(items[1].featuredImage, {
                file: 'photo.jpg',
                url: mediaURL(1, 'photo.jpg'),
                alt: 'Moon',
                caption: '',
                credits: 'Bob'
            });
            assert.equal(items[0].featuredImage, null);
        });

        it('treats an image without a file as no image - the same as saving does', function () {
            addPost(1);
            addFeaturedImage(1, 5, '', '{"alt":"Old"}');

            assert.equal(contentDetails.read('post', { include: ['featuredImage'] }).items[0].featuredImage, null);
        });

        it('returns empty texts for missing data and reports broken data', function () {
            addPost(1);
            addPost(2);
            addFeaturedImage(1, 5, 'a.jpg', '');
            addFeaturedImage(2, 6, 'b.jpg', '{broken');

            let items = contentDetails.read('post', { include: ['featuredImage'] }).items;

            assert.deepEqual([items[1].featuredImage.alt, items[1].featuredImage.caption], ['', '']);
            assert.equal(items[0].featuredImage.alt, null);
            assert.deepEqual(items[0].errors.map(error => [error.errorCode, error.field]), [['invalid-json-data', 'featuredImage']]);
        });
    });

    describe('excerpt', function () {
        it('uses the excerpt length of the theme and the saved theme settings', function () {
            addPost(1, '<p>One two three four five six seven</p>');

            assert.deepEqual(contentDetails.read('post', { include: ['excerpt'] }).items[0].excerpt, { text: 'One two three four five…', source: 'auto' });

            writeJson(path.join(sitesDir, siteName, 'input', 'config', 'theme.config.json'), { config: { excerptLength: 3 } });
            assert.equal(contentDetails.read('post', { include: ['excerpt'] }).items[0].excerpt.text, 'One two three…');
        });

        it('uses the default excerpt length when the theme is missing', function () {
            siteConfig.theme = 'missing-theme';
            addPost(1, '<p>' + 'word '.repeat(40) + '</p>');

            let excerpt = contentDetails.read('post', { include: ['excerpt'] }).items[0].excerpt;

            assert.equal(excerpt.text.split(' ').length, 30);
        });

        it('uses the text before the read more marker', function () {
            addPost(1, '<p>Intro &amp; <b>more</b></p><hr id="read-more"><p>Rest of the post</p>');
            addPost(2, 'Markdown intro\n\n---READMORE---\n\nRest', 'published', 'markdown');

            let items = contentDetails.read('post', { include: ['excerpt'] }).items;

            assert.deepEqual(items[1].excerpt, { text: 'Intro & more', source: 'read-more' });
            assert.deepEqual(items[0].excerpt, { text: 'Markdown intro', source: 'read-more' });
        });

        it('reports empty content', function () {
            addPost(1, '');

            assert.deepEqual(contentDetails.read('post', { include: ['excerpt'] }).items[0].excerpt, { text: '', source: 'empty' });
        });
    });

    describe('images', function () {
        it('lists images of the WYSIWYG content with addresses on disk', function () {
            addPost(1, '<p><img src="#DOMAIN_NAME#a.jpg" alt=""></p><figure><img src="#DOMAIN_NAME#b.jpg" alt="B"><figcaption>Caption</figcaption></figure>');

            let images = contentDetails.read('post', { include: ['images'] }).items[0].images;

            assert.deepEqual(images.map(image => [image.src, image.alt, image.caption]), [
                [mediaURL(1, 'a.jpg'), '', ''],
                [mediaURL(1, 'b.jpg'), 'B', 'Caption']
            ]);
        });

        it('lists images of the Markdown and block editor content', function () {
            let blocks = [{
                type: 'publii-image',
                config: { imageAlign: 'center', link: { url: '', noFollow: false, targetBlank: false, sponsored: false, ugc: false }, advanced: { cssClasses: '', id: '' } },
                content: { image: '#DOMAIN_NAME#block.jpg', imageHeight: 10, imageWidth: 10, alt: 'Block', caption: '' }
            }];

            addPost(1, '![Markdown](#DOMAIN_NAME#md.jpg)', 'published', 'markdown');
            addPost(2, JSON.stringify(blocks), 'published', 'blockeditor');

            let items = contentDetails.read('post', { include: ['images'] }).items;

            assert.deepEqual(items[1].images.map(image => [image.src, image.alt]), [[mediaURL(1, 'md.jpg'), 'Markdown']]);
            assert.deepEqual(items[0].images.map(image => [image.src, image.alt]), [[mediaURL(2, 'block.jpg'), 'Block']]);
        });

        it('reports content which cannot be read without stopping other items', function () {
            addPost(1, '<p><img src="a.jpg" alt="A"></p>');
            addPost(2, '[{broken', 'published', 'blockeditor');

            let items = contentDetails.read('post', { include: ['images', 'excerpt'] }).items;

            assert.equal(items[0].images, null);
            assert.equal(items[0].excerpt, null);
            assert.deepEqual(items[0].errors.map(error => [error.errorCode, error.field]), [['invalid-content', 'text']]);
            assert.equal(items[1].images.length, 1);
            assert.equal(items[1].errors, undefined);
        });

        it('reports broken editor data and reads the content as WYSIWYG content', function () {
            addPost(1, '<p><img src="a.jpg" alt="A"></p>');
            database.prepare(`INSERT INTO posts_additional_data VALUES(NULL, 1, '_core', '{broken')`).run();

            let item = contentDetails.read('post', { include: ['images'] }).items[0];

            assert.equal(item.editor, 'tinymce');
            assert.equal(item.images.length, 1);
            assert.deepEqual(item.errors.map(error => error.field), ['_core']);
        });
    });

    describe('IPC events', function () {
        function loadContentEvents(handlers) {
            const filename = path.resolve(__dirname, '../events/content.js');
            const realRequire = createRequire(filename);
            const context = {
                module: { exports: {} },
                console,
                require(name) {
                    if (name === 'electron') {
                        return {
                            ipcMain: {
                                handle(channel, handler) {
                                    handlers.set(channel, handler);
                                }
                            }
                        };
                    }

                    return realRequire(name);
                }
            };

            vm.runInNewContext(fs.readFileSync(filename, 'utf8'), context, { filename });
            return context.module.exports;
        }

        it('reads details via invoke', async function () {
            const handlers = new Map();
            const ContentEvents = loadContentEvents(handlers);
            new ContentEvents(application);
            addPost(1, '<p><img src="a.jpg" alt=""></p>');

            let result = await handlers.get('app-content-details-read')({}, {
                site: siteName,
                itemType: 'post',
                options: { include: ['images'], ids: [1] }
            });

            assert.equal(result.status, 'success');
            assert.deepEqual(result.items[0].images.map(image => image.alt), ['']);
        });

        it('rejects invalid site names', async function () {
            const handlers = new Map();
            const ContentEvents = loadContentEvents(handlers);
            new ContentEvents(application);

            assert.equal((await handlers.get('app-content-details-read')({}, { site: '../other', itemType: 'post' })).errorCode, 'invalid-site');
            assert.equal((await handlers.get('app-content-details-read')({}, null)).errorCode, 'invalid-site');
        });

        it('exposes the channel only via invoke in the preload script', function () {
            const preload = fs.readFileSync(path.resolve(__dirname, '../app-preload.js'), 'utf8');
            const invoke = preload.slice(preload.indexOf('    invoke:'), preload.indexOf('    stopReceive:'));
            const beforeInvoke = preload.slice(0, preload.indexOf('    invoke:'));

            assert.ok(invoke.includes("'app-content-details-read'"));
            assert.ok(!beforeInvoke.includes("'app-content-details-read'"));
        });
    });
});
