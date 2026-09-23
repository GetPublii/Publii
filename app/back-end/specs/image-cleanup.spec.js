const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const sharp = require('sharp');
const Post = require('../post');
const Page = require('../page');
const Tag = require('../tag');
const Author = require('../author');
const Themes = require('../themes');
const Plugins = require('../plugins');

const siteName = 'image-cleanup-test';
const appDirectory = path.resolve(__dirname, '../..');

describe('Image files when discarding edits', function () {
    let directory;
    let inputDirectory;
    let database;
    let application;
    let siteConfig;

    beforeEach(function () {
        directory = fs.mkdtempSync(path.join(os.tmpdir(), 'publii-image-cleanup-'));
        inputDirectory = path.join(directory, siteName, 'input');
        database = new DatabaseSync(':memory:');
        database.exec(`
            CREATE TABLE posts (
                id INTEGER PRIMARY KEY,
                text TEXT,
                featured_image_id INTEGER
            );
            CREATE TABLE posts_images (
                id INTEGER PRIMARY KEY,
                post_id INTEGER,
                url TEXT
            );
            CREATE TABLE posts_additional_data (
                post_id INTEGER,
                key TEXT,
                value TEXT
            );
            CREATE TABLE tags (
                id INTEGER PRIMARY KEY,
                additional_data TEXT
            );
            CREATE TABLE authors (
                id INTEGER PRIMARY KEY,
                name TEXT,
                username TEXT,
                config TEXT,
                additional_data TEXT
            );
        `);
        siteConfig = {
            name: siteName,
            theme: 'test-theme',
            advanced: {
                responsiveImages: true,
                forceWebp: false,
                forceAvif: false
            }
        };
        const imageConfig = {
            dimensions: {
                small: { width: 100, height: 'auto' }
            }
        };
        writeJson('config/site.config.json', siteConfig);
        writeJson('themes/test-theme/config.json', {
            name: 'test-theme',
            files: {
                responsiveImages: {
                    contentImages: imageConfig,
                    featuredImages: imageConfig,
                    galleryImages: imageConfig,
                    tagImages: imageConfig,
                    authorImages: imageConfig,
                    optionImages: imageConfig
                }
            }
        });
        application = {
            appDir: appDirectory,
            sitesDir: directory,
            sites: { [siteName]: siteConfig },
            getDbForSite: () => database
        };
    });

    afterEach(function () {
        database.close();
        fs.rmSync(directory, { recursive: true, force: true });
    });

    function writeJson(relativePath, value) {
        const filename = path.join(inputDirectory, relativePath);
        fs.mkdirSync(path.dirname(filename), { recursive: true });
        fs.writeFileSync(filename, JSON.stringify(value));
    }

    function addImage(mediaDirectory, filename) {
        const original = path.join(inputDirectory, 'media', mediaDirectory, filename);
        const thumbnailExtension = siteConfig.advanced.forceAvif
            ? '.avif'
            : siteConfig.advanced.forceWebp ? '.webp' : path.extname(filename);
        const thumbnail = path.join(
            path.dirname(original),
            'responsive',
            path.parse(filename).name + '-small' + thumbnailExtension
        );
        fs.mkdirSync(path.dirname(thumbnail), { recursive: true });
        fs.writeFileSync(original, 'original image bytes');
        fs.writeFileSync(thumbnail, 'thumbnail bytes');
        return { original, thumbnail };
    }

    function addGalleryImage(filename, thumbnailExtension) {
        const galleryDirectory = path.join(inputDirectory, 'media/posts/1/gallery');
        const original = path.join(galleryDirectory, filename);
        const thumbnail = path.join(
            galleryDirectory,
            path.parse(filename).name + '-thumbnail.' + thumbnailExtension
        );
        fs.mkdirSync(galleryDirectory, { recursive: true });
        fs.writeFileSync(original, 'original image bytes');
        fs.writeFileSync(thumbnail, 'thumbnail bytes');
        return { original, thumbnail };
    }

    function assertImage(image, exists) {
        for (const filename of [image.original, image.thumbnail]) {
            assert.equal(fs.existsSync(filename), exists, filename);
        }

        if (exists) {
            assert.equal(fs.readFileSync(image.original, 'utf8'), 'original image bytes');
            assert.equal(fs.readFileSync(image.thumbnail, 'utf8'), 'thumbnail bytes');
        }
    }

    function saveItem(kind, options = {}) {
        database.prepare('INSERT INTO posts VALUES (1, @text, @imageID)').run({
            text: options.text || '',
            imageID: options.featured === false ? 0 : 10
        });

        if (options.featured !== false) {
            database.prepare('INSERT INTO posts_images VALUES (10, 1, @url)').run({
                url: 'saved.jpg'
            });
        }

        database.prepare('INSERT INTO posts_additional_data VALUES (1, @key, @value)').run({
            key: kind + 'ViewSettings',
            value: JSON.stringify(options.settings || {})
        });
    }

    for (const [kind, Model] of [['post', Post], ['page', Page]]) {
        describe(kind, function () {
            it('preserves the saved featured image and thumbnails after removing it and discarding changes', function () {
                saveItem(kind);
                const saved = addImage('posts/1', 'saved.jpg');
                const item = new Model(application, {
                    site: siteName,
                    id: 1,
                    text: '',
                    featuredImageFilename: ''
                });

                item.checkAndCleanImages(true);

                assertImage(saved, true);
                assert.equal(database.prepare('SELECT featured_image_id FROM posts WHERE id = 1').get().featured_image_id, 10);
                assert.equal(database.prepare('SELECT url FROM posts_images WHERE id = 10').get().url, 'saved.jpg');
            });

            it('keeps the selected saved image and removes discarded and obsolete image files', function () {
                saveItem(kind);
                database.exec("INSERT INTO posts_images VALUES (9, 1, 'obsolete.jpg')");
                const saved = addImage('posts/1', 'saved.jpg');
                const replacement = addImage('posts/1', 'replacement.jpg');
                const obsolete = addImage('posts/1', 'obsolete.jpg');
                const item = new Model(application, {
                    site: siteName,
                    id: 1,
                    featuredImageFilename: 'replacement.jpg'
                });

                item.checkAndCleanImages(true);

                assertImage(saved, true);
                assertImage(replacement, false);
                assertImage(obsolete, false);
            });

            it('restores image references from saved text, galleries and view options before cleanup', function () {
                saveItem(kind, {
                    text: '<img src="#DOMAIN_NAME#content.jpg"><img src="#DOMAIN_NAME#gallery/gallery.jpg">',
                    settings: { hero: { type: 'image', value: 'option.jpg' } }
                });
                const images = [
                    addImage('posts/1', 'content.jpg'),
                    addImage('posts/1/gallery', 'gallery.jpg'),
                    addImage('posts/1', 'option.jpg')
                ];
                const discarded = addImage('posts/1', 'discarded.jpg');
                const item = new Model(application, {
                    site: siteName,
                    id: 1,
                    text: '<img src="#DOMAIN_NAME#discarded.jpg">',
                    featuredImageFilename: ''
                });

                item.checkAndCleanImages(true);

                images.forEach(image => assertImage(image, true));
                assertImage(discarded, false);
            });

            const galleryFormats = [
                { mode: 'webp', original: 'jpg', savedThumbnail: 'jpg', currentThumbnail: 'webp' },
                { mode: 'avif', original: 'jpg', savedThumbnail: 'webp', currentThumbnail: 'avif' },
                { mode: 'none', original: 'jpg', savedThumbnail: 'avif', currentThumbnail: 'jpg' },
                { mode: 'avif', original: 'webp', savedThumbnail: 'webp', currentThumbnail: 'avif' },
                { mode: 'webp', original: 'avif', savedThumbnail: 'avif', currentThumbnail: 'avif' }
            ];

            for (const format of galleryFormats) {
                for (const discard of [true, false]) {
                    it(`keeps gallery thumbnails after format conversion to ${format.mode} (${format.original}, discard=${discard})`, function () {
                        siteConfig.advanced.forceWebp = format.mode === 'webp';
                        siteConfig.advanced.forceAvif = format.mode === 'avif';
                        writeJson('config/site.config.json', siteConfig);
                        const gallery = addGalleryImage('gallery-photo.' + format.original, format.currentThumbnail);
                        const unused = addGalleryImage('unused-photo.' + format.original, format.currentThumbnail);
                        const text = '<div class="gallery" data-columns="3">' +
                            '<figure class="gallery__item">' +
                            `<a href="#DOMAIN_NAME#gallery/gallery-photo.${format.original}" data-size="120x80">` +
                            `<img src="#DOMAIN_NAME#gallery/gallery-photo-thumbnail.${format.savedThumbnail}" alt="Gallery photo">` +
                            '</a></figure></div>';
                        saveItem(kind, { text });
                        const savedFeatured = addImage('posts/1', 'saved.jpg');
                        const item = new Model(application, {
                            site: siteName,
                            id: 1,
                            text,
                            featuredImageFilename: ''
                        });

                        item.checkAndCleanImages(discard);

                        assertImage(gallery, true);
                        assertImage(unused, false);
                        assertImage(savedFeatured, discard);
                        assert.equal(database.prepare('SELECT text FROM posts WHERE id = 1').get().text, text);
                    });
                }
            }

            for (const editor of ['tinymce', 'markdown', 'blockeditor']) {
                it(`preserves saved content and converted gallery files from ${editor}`, function () {
                    siteConfig.advanced.forceWebp = true;
                    writeJson('config/site.config.json', siteConfig);
                    const image = addImage('posts/1', 'content.jpg');
                    const gallery = addGalleryImage('gallery-photo.jpg', 'webp');
                    const discarded = addGalleryImage('discarded.jpg', 'webp');
                    const htmlGallery = '<figure class="gallery__item">' +
                        '<a href="#DOMAIN_NAME#gallery/gallery-photo.jpg">' +
                        '<img src="#DOMAIN_NAME#gallery/gallery-photo-thumbnail.jpg">' +
                        '</a></figure>';
                    let text = '<img src="#DOMAIN_NAME#content.jpg">' + htmlGallery;

                    if (editor === 'markdown') {
                        text = '![Content image](#DOMAIN_NAME#content.jpg)\n\n' + htmlGallery;
                    } else if (editor === 'blockeditor') {
                        text = JSON.stringify([
                            {
                                type: 'publii-image',
                                content: { src: '#DOMAIN_NAME#content.jpg' }
                            },
                            {
                                type: 'publii-gallery',
                                content: {
                                    images: [{
                                        src: '#DOMAIN_NAME#gallery/gallery-photo.jpg',
                                        thumbnailSrc: '#DOMAIN_NAME#gallery/gallery-photo-thumbnail.jpg'
                                    }]
                                }
                            }
                        ]);
                    }

                    saveItem(kind, { text });
                    const item = new Model(application, {
                        site: siteName,
                        id: 1,
                        text: '',
                        featuredImageFilename: ''
                    });

                    item.checkAndCleanImages(true);

                    assertImage(image, true);
                    assertImage(gallery, true);
                    assertImage(discarded, false);
                });
            }

            it('keeps an animated WebP gallery thumbnail when AVIF conversion is enabled', async function () {
                siteConfig.advanced.forceAvif = true;
                writeJson('config/site.config.json', siteConfig);
                const gallery = addGalleryImage('animated.webp', 'webp');
                const frames = [];

                for (const background of ['#ff0000', '#0000ff']) {
                    frames.push(await sharp({
                        create: { width: 16, height: 16, channels: 3, background }
                    }).png().toBuffer());
                }

                const animated = await sharp(frames, { join: { animated: true } }).webp().toBuffer();
                fs.writeFileSync(gallery.original, animated);
                saveItem(kind, {
                    text: '<figure class="gallery__item">' +
                        '<a href="#DOMAIN_NAME#gallery/animated.webp">' +
                        '<img src="#DOMAIN_NAME#gallery/animated-thumbnail.avif">' +
                        '</a></figure>'
                });
                const item = new Model(application, { site: siteName, id: 1 });

                item.checkAndCleanImages(true);

                assert.deepEqual(fs.readFileSync(gallery.original), animated);
                assert.equal(fs.readFileSync(gallery.thumbnail, 'utf8'), 'thumbnail bytes');
            });

            it('uses saved empty text and no featured image instead of keeping discarded additions', function () {
                saveItem(kind, { featured: false });
                const discarded = addImage('posts/1', 'discarded.jpg');
                const item = new Model(application, {
                    site: siteName,
                    id: 1,
                    text: '<img src="#DOMAIN_NAME#discarded.jpg">',
                    featuredImageFilename: 'discarded.jpg'
                });

                item.checkAndCleanImages(true);

                assertImage(discarded, false);
            });

            it('removes temporary uploads when a new item is discarded', function () {
                const discarded = addImage('posts/temp', 'discarded.jpg');
                const item = new Model(application, {
                    site: siteName,
                    id: 0,
                    text: '<img src="#DOMAIN_NAME#discarded.jpg">',
                    featuredImageFilename: 'discarded.jpg'
                });

                item.checkAndCleanImages(true);

                assertImage(discarded, false);
            });

            it('still cleans removed images when changes are saved', function () {
                saveItem(kind);
                const removed = addImage('posts/1', 'saved.jpg');
                const replacement = addImage('posts/1', 'replacement.jpg');
                const item = new Model(application, {
                    site: siteName,
                    id: 1,
                    featuredImageFilename: 'replacement.jpg'
                });

                item.checkAndCleanImages();

                assertImage(removed, false);
                assertImage(replacement, true);
            });

            it('preserves files when saved view settings cannot be parsed', function () {
                saveItem(kind);
                database.exec("UPDATE posts_additional_data SET value = '{invalid json'");
                const saved = addImage('posts/1', 'saved.jpg');
                const item = new Model(application, { site: siteName, id: 1 });
                const originalError = console.error;
                const errors = [];

                try {
                    console.error = (...args) => errors.push(args);
                    item.checkAndCleanImages(true);
                } finally {
                    console.error = originalError;
                }

                assertImage(saved, true);
                assert.equal(errors.length, 1);
            });

            it('does not delete images when the saved item cannot be found', function () {
                const saved = addImage('posts/1', 'saved.jpg');
                const item = new Model(application, { site: siteName, id: 1 });

                item.checkAndCleanImages(true);

                assertImage(saved, true);
            });
        });
    }

    for (const [kind, Model] of [['tag', Tag], ['author', Author]]) {
        it(`${kind}: preserves saved featured and option images when a replacement is discarded`, function () {
            const additionalData = JSON.stringify({
                featuredImage: 'saved.jpg',
                viewConfig: { hero: 'option.jpg' }
            });
            database.prepare(`INSERT INTO ${kind}s (id, additional_data) VALUES (1, @data)`).run({
                data: additionalData
            });
            const saved = addImage(kind + 's/1', 'saved.jpg');
            const option = addImage(kind + 's/1', 'option.jpg');
            const replacement = addImage(kind + 's/1', 'replacement.jpg');
            const item = new Model(application, {
                site: siteName,
                id: 1,
                imageConfigFields: ['hero'],
                additionalData: {
                    featuredImage: 'replacement.jpg',
                    viewConfig: { hero: '' }
                }
            });

            item.checkAndCleanImages(true);

            assertImage(saved, true);
            assertImage(option, true);
            assertImage(replacement, false);
        });
    }

    it('preserves an author avatar independently of featured and option images on cancel', function () {
        writeJson('config/theme.config.json', { postConfig: {}, tagConfig: {}, authorConfig: {} });
        database.prepare('INSERT INTO authors (id, config, additional_data) VALUES (1, @config, @data)').run({
            config: JSON.stringify({ avatar: 'avatar.jpg' }),
            data: JSON.stringify({ featuredImage: 'featured.jpg', viewConfig: { hero: 'option.jpg' } })
        });
        const images = [
            addImage('website', 'avatar.jpg'),
            addImage('authors/1', 'featured.jpg'),
            addImage('authors/1', 'option.jpg')
        ];
        const discardedAvatar = addImage('website', 'discarded-avatar.jpg');
        const discardedFeatured = addImage('authors/1', 'discarded-featured.jpg');
        const author = new Author(application, {
            site: siteName,
            id: 1,
            imageConfigFields: ['hero'],
            additionalData: { featuredImage: '', viewConfig: {} }
        });

        author.checkAndCleanImages(true);

        images.forEach(image => assertImage(image, true));
        assertImage(discardedAvatar, false);
        assertImage(discardedFeatured, false);
    });

    it('keeps default page images stored in the same folder as default post images', function () {
        const config = {
            postConfig: { hero: 'post-default.jpg' },
            pageConfig: { hero: 'page-default.jpg' },
            tagConfig: {},
            authorConfig: {}
        };
        fs.mkdirSync(path.join(inputDirectory, 'media/website'), { recursive: true });
        const postImage = addImage('posts/defaults', 'post-default.jpg');
        const pageImage = addImage('posts/defaults', 'page-default.jpg');
        const unused = addImage('posts/defaults', 'unused.jpg');

        new Themes(application, { site: siteName }).checkAndCleanImages(JSON.stringify(config));

        assertImage(postImage, true);
        assertImage(pageImage, true);
        assertImage(unused, false);
    });

    it('keeps website logo, Open Graph image and saved repeater uploads', function () {
        siteConfig.advanced.openGraphImage = 'open-graph.jpg';
        writeJson('config/site.config.json', siteConfig);
        const config = {
            config: { logo: 'media/website/logo.jpg' },
            customConfig: {
                slides: [{ image: 'media/website/slide.jpg', smallUpload: 'media/website/small.jpg' }]
            },
            postConfig: {},
            pageConfig: {},
            tagConfig: {},
            authorConfig: {}
        };
        const saved = ['logo.jpg', 'open-graph.jpg', 'slide.jpg', 'small.jpg'].map(filename => addImage('website', filename));
        const unused = addImage('website', 'unused.jpg');

        new Themes(application, { site: siteName }).checkAndCleanImages(JSON.stringify(config));

        saved.forEach(image => assertImage(image, true));
        assertImage(unused, false);
    });

    it('cleans plugin uploads only after saving and preserves images used in repeaters or another field', function () {
        const plugin = new Plugins(appDirectory, directory);
        const folder = path.join(inputDirectory, 'media/plugins/test-plugin');
        fs.mkdirSync(folder, { recursive: true });
        fs.mkdirSync(path.join(inputDirectory, 'config/plugins'), { recursive: true });
        const initial = {
            image: 'shared.jpg',
            smallUpload: 'shared.jpg',
            rows: [{ image: 'slide.webp', smallUpload: 'small.png' }]
        };
        writeJson('config/plugins/test-plugin.json', initial);

        for (const filename of ['shared.jpg', 'slide.webp', 'small.png', 'unused.jpg']) {
            fs.writeFileSync(path.join(folder, filename), filename);
        }

        const changes = { ...initial, image: '' };
        assert.equal(plugin.savePluginConfig(siteName, 'test-plugin', changes), true);

        for (const filename of ['shared.jpg', 'slide.webp', 'small.png']) {
            assert.equal(fs.readFileSync(path.join(folder, filename), 'utf8'), filename);
        }

        assert.equal(fs.existsSync(path.join(folder, 'unused.jpg')), false);
        assert.equal(plugin.savePluginConfig(siteName, 'test-plugin', { ...changes, smallUpload: '' }), true);
        assert.equal(fs.existsSync(path.join(folder, 'shared.jpg')), false);
    });

    it('keeps saved theme images, including repeaters and defaults, when cleaning unused uploads', function () {
        const config = {
            customConfig: {
                hero: 'media/website/hero.jpg',
                slides: [{ image: 'media/website/slide.jpg' }]
            },
            postConfig: { hero: 'post-default.jpg' },
            tagConfig: { hero: 'tag-default.jpg' },
            authorConfig: { hero: 'author-default.jpg' }
        };
        writeJson('config/theme.config.json', config);
        const saved = [
            addImage('website', 'hero.jpg'),
            addImage('website', 'slide.jpg'),
            addImage('posts/defaults', 'post-default.jpg'),
            addImage('tags/defaults', 'tag-default.jpg'),
            addImage('authors/defaults', 'author-default.jpg')
        ];
        const discarded = addImage('website', 'discarded.jpg');
        const themes = new Themes(application, { site: siteName });
        const savedConfig = fs.readFileSync(path.join(inputDirectory, 'config/theme.config.json'), 'utf8');

        themes.checkAndCleanImages(savedConfig);

        saved.forEach(image => assertImage(image, true));
        assertImage(discarded, false);
    });
});
