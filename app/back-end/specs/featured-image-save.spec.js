const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { DatabaseSync } = require('node:sqlite');
const Post = require('../post');
const Page = require('../page');
const Tag = require('../tag');
const Author = require('../author');
const Image = require('../image');
const ContentHelper = require('../modules/render-html/helpers/content');

const siteName = 'featured-image-save-test';
const schema = fs.readFileSync(path.resolve(__dirname, '../sql/1.0.0.sql'), 'utf8');
const imageData = {
    alt: 'Existing alternative text',
    caption: 'Existing caption',
    credits: 'Existing credits'
};

describe('Featured image filenames when saving content', function () {
    let directory;
    let siteDirectory;
    let database;
    let application;

    beforeEach(function () {
        directory = fs.mkdtempSync(path.join(os.tmpdir(), 'publii-featured-image-save-'));
        siteDirectory = path.join(directory, siteName);
        database = new DatabaseSync(':memory:');
        database.exec(schema);

        const siteConfig = {
            name: siteName,
            theme: 'test-theme',
            advanced: {
                responsiveImages: true,
                urls: { cleanUrls: false }
            }
        };
        const imageConfig = {
            dimensions: {
                small: { width: 100, height: 'auto' }
            }
        };
        writeJson('input/config/site.config.json', siteConfig);
        writeJson('input/themes/test-theme/config.json', {
            name: 'test-theme',
            files: {
                responsiveImages: {
                    contentImages: imageConfig,
                    featuredImages: imageConfig
                }
            }
        });
        application = {
            appDir: path.resolve(__dirname, '../..'),
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
        const filename = path.join(siteDirectory, relativePath);
        fs.mkdirSync(path.dirname(filename), { recursive: true });
        fs.writeFileSync(filename, JSON.stringify(value));
    }

    function addImage(filename, id = 1, mediaType = 'posts') {
        const mediaDirectory = path.join(siteDirectory, 'input/media', mediaType, String(id));
        const file = path.parse(filename);
        const files = [
            path.join(mediaDirectory, filename),
            path.join(mediaDirectory, 'responsive', file.name + '-small' + file.ext)
        ];

        return files.map(filePath => {
            const contents = Buffer.from('Existing bytes for ' + filePath);
            fs.mkdirSync(path.dirname(filePath), { recursive: true });
            fs.writeFileSync(filePath, contents);

            return {
                path: filePath,
                contents,
                modifiedAt: fs.statSync(filePath).mtimeMs
            };
        });
    }

    function assertImageUnchanged(files) {
        for (const file of files) {
            assert.deepEqual(fs.readFileSync(file.path), file.contents, file.path);
            assert.equal(fs.statSync(file.path).mtimeMs, file.modifiedAt, file.path);
        }
    }

    function seedItem(kind, filename) {
        database.prepare(`
            INSERT INTO posts VALUES (1, 'Original title', '1', 'image-save-test', '', @imageID, 1, 1, @status, '')
        `).run({
            imageID: filename ? 10 : 0,
            status: kind === 'page' ? 'draft,is-page' : 'draft'
        });

        if (filename) {
            database.prepare(`
                INSERT INTO posts_images VALUES (10, 1, @filename, '', '', @data)
            `).run({
                filename,
                data: JSON.stringify(imageData)
            });
        }
    }

    function createItem(Model, kind, filename, options = {}) {
        const id = options.id === undefined ? 1 : options.id;
        const mediaDirectory = path.join(siteDirectory, 'input/media/posts', id === 0 ? 'temp' : String(id));

        return new Model(application, {
            site: siteName,
            id,
            title: 'Updated title',
            slug: 'image-save-test',
            author: 1,
            tags: [],
            status: kind === 'page' ? 'draft,is-page' : 'draft',
            text: options.text || '',
            template: '',
            creationDate: 1,
            modificationDate: 2,
            additionalData: {},
            postViewSettings: {},
            pageViewSettings: {},
            featuredImage: filename ? pathToFileURL(path.join(mediaDirectory, filename)).href : '',
            featuredImageFilename: filename,
            featuredImageData: options.imageData || imageData
        });
    }

    function assertStoredImage(filename, expectedData = imageData, id = 1) {
        const rows = database.prepare(`
            SELECT pi.url, pi.additional_data
            FROM posts p
            JOIN posts_images pi ON pi.id = p.featured_image_id AND pi.post_id = p.id
            WHERE p.id = @id
        `).all({ id });
        assert.equal(rows.length, 1);
        assert.equal(rows[0].url, filename);
        assert.deepEqual(JSON.parse(rows[0].additional_data), expectedData);
        assert.equal(database.prepare('SELECT COUNT(*) AS count FROM posts_images WHERE post_id = @id').get({ id }).count, 1);
    }

    for (const [kind, Model] of [['post', Post], ['page', Page]]) {
        describe(kind, function () {
            for (const filename of [
                'marylou-fortier--S_aTuH96xw-unsplash-1920.webp',
                'Portrait (final) 2.JPG',
                'photo.v2--final.avif',
                'already-normalized-2.png'
            ]) {
                it('preserves the existing filename and image bytes across repeated saves: ' + filename, function () {
                    seedItem(kind, filename);
                    const files = addImage(filename);
                    let currentFilename = filename;

                    for (let attempt = 0; attempt < 3; attempt++) {
                        const item = createItem(Model, kind, currentFilename);
                        item.save();

                        assertStoredImage(filename);
                        assertImageUnchanged(files);
                        currentFilename = item.load().featuredImage.url;
                        assert.equal(currentFilename, filename);
                    }

                    createItem(Model, kind, currentFilename).checkAndCleanImages(true);
                    assertImageUnchanged(files);
                });
            }

            for (const editor of ['tinymce', 'markdown', 'blockeditor']) {
                it('preserves content and gallery image paths and files across saves from ' + editor, function () {
                    seedItem(kind, 'featured--image.webp');
                    const featured = addImage('featured--image.webp');
                    const content = addImage('content--image.webp');
                    const galleryDirectory = path.join(siteDirectory, 'input/media/posts/1/gallery');
                    fs.mkdirSync(galleryDirectory, { recursive: true });
                    const galleryFiles = ['gallery--image.webp', 'gallery--image-thumbnail.webp'].map(filename => {
                        const filePath = path.join(galleryDirectory, filename);
                        const contents = Buffer.from('Existing bytes for ' + filename);
                        fs.writeFileSync(filePath, contents);

                        return {
                            path: filePath,
                            contents,
                            modifiedAt: fs.statSync(filePath).mtimeMs
                        };
                    });
                    const galleryHtml = '<div class="gallery" data-columns="3">' +
                        '<figure class="gallery__item">' +
                        '<a href="#DOMAIN_NAME#gallery/gallery--image.webp" data-size="100x100">' +
                        '<img src="#DOMAIN_NAME#gallery/gallery--image-thumbnail.webp" alt="Gallery image">' +
                        '</a></figure></div>';
                    let text = '<img src="#DOMAIN_NAME#content--image.webp" alt="Content image">' + galleryHtml;

                    if (editor === 'markdown') {
                        text = '![Content image](#DOMAIN_NAME#content--image.webp)\n\n' + galleryHtml;
                    } else if (editor === 'blockeditor') {
                        text = JSON.stringify([
                            {
                                type: 'publii-image',
                                content: {
                                    image: '#DOMAIN_NAME#content--image.webp',
                                    imageHeight: 100,
                                    imageWidth: 100,
                                    alt: 'Content image',
                                    caption: ''
                                },
                                config: {
                                    advanced: {},
                                    imageAlign: 'center',
                                    link: { url: '' }
                                }
                            },
                            {
                                type: 'publii-gallery',
                                content: {
                                    images: [
                                        {
                                            src: '#DOMAIN_NAME#gallery/gallery--image.webp',
                                            thumbnailSrc: '#DOMAIN_NAME#gallery/gallery--image-thumbnail.webp',
                                            dimensions: '100x100',
                                            height: 100,
                                            width: 100,
                                            alt: 'Gallery image',
                                            caption: ''
                                        }
                                    ]
                                },
                                config: {
                                    advanced: {},
                                    imageAlign: 'center',
                                    columns: 3
                                }
                            }
                        ]);
                    }

                    for (let attempt = 0; attempt < 3; attempt++) {
                        const item = createItem(Model, kind, 'featured--image.webp', { text });
                        item.additionalData.editor = editor;
                        item.save();
                        const saved = item.load();
                        assert.equal(saved[kind + 's'][0].text, text);
                        assertStoredImage('featured--image.webp');
                        assertImageUnchanged([...featured, ...content, ...galleryFiles]);

                        const published = ContentHelper.prepareContent(1, text, 'https://example.com', {}, {
                            siteConfig: {
                                domain: 'https://example.com',
                                advanced: { gdpr: {} }
                            },
                            inputDir: path.join(siteDirectory, 'input')
                        }, editor);
                        for (const relativePath of [
                            'content--image.webp',
                            'gallery/gallery--image.webp',
                            'gallery/gallery--image-thumbnail.webp'
                        ]) {
                            assert.ok(published.includes('https://example.com/media/posts/1/' + relativePath));
                        }
                    }
                });
            }

            it('updates image descriptions without changing the existing filename or files', function () {
                const filename = 'existing--portrait.webp';
                seedItem(kind, filename);
                const files = addImage(filename);
                const changedData = {
                    alt: 'Updated alternative text',
                    caption: 'Updated caption',
                    credits: 'Updated credits'
                };

                createItem(Model, kind, filename, { imageData: changedData }).save();

                assertStoredImage(filename, changedData);
                assertImageUnchanged(files);
            });

            it('stores an uploaded collision suffix without overwriting an existing image', function () {
                const filename = 'new-photo.webp';
                seedItem(kind, '');
                const existing = addImage(filename);
                const mediaDirectory = path.dirname(existing[0].path);
                const image = new Image(application, {
                    site: siteName,
                    id: 1,
                    imageType: 'featuredImages'
                });
                const uploadPath = image.generateFileName('new--photo.webp', 1, mediaDirectory);
                assert.equal(path.basename(uploadPath), 'new-photo-2.webp');
                const uploaded = addImage(path.basename(uploadPath));
                const text = '<img src="#DOMAIN_NAME#new-photo.webp">';

                createItem(Model, kind, path.basename(uploadPath), { text }).save();

                assertStoredImage('new-photo-2.webp');
                assertImageUnchanged(existing);
                assertImageUnchanged(uploaded);
            });

            it('replaces the featured image while preserving the old image when used in content', function () {
                const oldFilename = 'existing--portrait.webp';
                const newFilename = 'replacement-2.webp';
                seedItem(kind, oldFilename);
                const oldFiles = addImage(oldFilename);
                const newFiles = addImage(newFilename);
                const text = '<img src="#DOMAIN_NAME#' + oldFilename + '">';

                createItem(Model, kind, newFilename, { text }).save();

                assertStoredImage(newFilename);
                assertImageUnchanged(oldFiles);
                assertImageUnchanged(newFiles);
            });

            it('removes the featured image association while preserving an image used in content', function () {
                const filename = 'existing--portrait.webp';
                seedItem(kind, filename);
                const files = addImage(filename);
                const text = '<img src="#DOMAIN_NAME#' + filename + '">';

                createItem(Model, kind, '', { text }).save();

                assert.equal(database.prepare('SELECT featured_image_id FROM posts WHERE id = 1').get().featured_image_id, 0);
                assert.equal(database.prepare('SELECT COUNT(*) AS count FROM posts_images').get().count, 0);
                assertImageUnchanged(files);
            });

            it('keeps a missing image reference and its descriptions without guessing another filename', function () {
                const filename = 'missing--portrait.webp';
                seedItem(kind, filename);

                createItem(Model, kind, filename).save();

                assertStoredImage(filename);
                assert.equal(fs.existsSync(path.join(siteDirectory, 'input/media/posts/1')), false);
            });

            it('preserves the uploaded filename when moving media from a new item temporary directory', function () {
                const filename = 'new-portrait-2.webp';
                const files = addImage(filename, 'temp');
                const item = createItem(Model, kind, filename, { id: 0 });

                item.save();

                assertStoredImage(filename, imageData, item.id);
                for (const file of files) {
                    const destination = file.path.replace(
                        path.join('posts', 'temp'),
                        path.join('posts', String(item.id))
                    );
                    assert.deepEqual(fs.readFileSync(destination), file.contents);
                    assert.equal(fs.existsSync(file.path), false);
                }
            });
        });
    }

    for (const [kind, Model, table] of [
        ['tag', Tag, 'tags'],
        ['author', Author, 'authors']
    ]) {
        describe(kind, function () {
            for (const filename of [
                'marylou-fortier--S_aTuH96xw-unsplash-1920.webp',
                'Portrait (final) 2.JPG'
            ]) {
                it('preserves the existing filename, metadata and files across repeated saves: ' + filename, function () {
                    const additionalData = {
                        featuredImage: filename,
                        featuredImageAlt: imageData.alt,
                        featuredImageCaption: imageData.caption,
                        featuredImageCredits: imageData.credits,
                        viewConfig: {}
                    };
                    const query = kind === 'tag'
                        ? "INSERT INTO tags VALUES (1, 'Original tag', 'original-tag', '', @data)"
                        : "INSERT INTO authors VALUES (1, 'Original author', 'original-author', '', '{}', @data)";
                    database.prepare(query).run({ data: JSON.stringify(additionalData) });
                    const files = addImage(filename, 1, table);
                    let savedData = additionalData;

                    for (let attempt = 0; attempt < 3; attempt++) {
                        const item = new Model(application, {
                            site: siteName,
                            id: 1,
                            name: 'Updated ' + kind,
                            slug: 'updated-tag',
                            username: 'updated-author',
                            description: '',
                            config: '{}',
                            additionalData: savedData,
                            imageConfigFields: []
                        });
                        assert.equal(item.save().status, true);
                        const row = database.prepare('SELECT additional_data FROM ' + table + ' WHERE id = 1').get();
                        savedData = JSON.parse(row.additional_data);

                        assert.deepEqual(savedData, additionalData);
                        assertImageUnchanged(files);
                        item.checkAndCleanImages(true);
                        assertImageUnchanged(files);
                    }
                });
            }
        });
    }
});
