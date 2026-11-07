const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const DBUtils = require('../helpers/db.utils.js');
const openDatabase = require('../helpers/db.connection.js');
const ContentFields = require('../content-fields.js');

const siteName = 'content-fields-test';
const schema = fs.readFileSync(path.resolve(__dirname, '../sql/1.0.0.sql'), 'utf8');

describe('Content fields API (plugins)', function () {
    let database;
    let siteConfig;
    let application;
    let contentFields;

    beforeEach(function () {
        database = new DBUtils(openDatabase(':memory:'));
        database.exec(schema);
        siteConfig = {
            name: siteName,
            advanced: {
                urls: {
                    cleanUrls: true,
                    postsPrefix: '',
                    tagsPrefix: '',
                    authorsPrefix: 'authors',
                    pageName: 'page'
                }
            }
        };
        application = {
            appDir: path.resolve(__dirname, '../..'),
            sitesDir: path.resolve(__dirname, 'not-used'),
            sites: { [siteName]: siteConfig },
            getDbForSite: () => database
        };
        contentFields = new ContentFields(application, { site: siteName });
    });

    afterEach(function () {
        database.close();
    });

    function addPost(id, title, slug, status = 'published') {
        database.prepare(`INSERT INTO posts VALUES(@id, @title, '1', @slug, '', 0, 1000, 1000, @status, '')`).run({ id, title, slug, status });
    }

    function addPostData(postID, key, value) {
        database.prepare(`INSERT INTO posts_additional_data VALUES(NULL, @postID, @key, @value)`).run({ postID, key, value });
    }

    function getPostData(postID, key) {
        let rows = database.prepare(`SELECT value FROM posts_additional_data WHERE post_id = @postID AND key = @key`).all({ postID, key });
        return rows.map(row => JSON.parse(row.value));
    }

    function getPost(id) {
        return database.prepare(`SELECT * FROM posts WHERE id = @id`).get({ id });
    }

    function addTag(id, name, slug, additionalData = '') {
        database.prepare(`INSERT INTO tags VALUES(@id, @name, @slug, '', @additionalData)`).run({ id, name, slug, additionalData });
    }

    function getTag(id) {
        return database.prepare(`SELECT * FROM tags WHERE id = @id`).get({ id });
    }

    function addAuthor(id, name, username, config = '{}', additionalData = '{}') {
        database.prepare(`INSERT INTO authors VALUES(@id, @name, @username, '', @config, @additionalData)`).run({ id, name, username, config, additionalData });
    }

    function getAuthor(id) {
        return database.prepare(`SELECT * FROM authors WHERE id = @id`).get({ id });
    }

    describe('posts and pages', function () {
        it('updates only the _core data, even when other additional data was saved earlier', function () {
            addPost(1, 'Post', 'post');
            addPostData(1, 'postViewSettings', JSON.stringify({ displayDate: 1 }));
            addPostData(1, '_core', JSON.stringify({ metaTitle: 'Old', metaDesc: 'Description', canonicalUrl: '' }));

            let result = contentFields.update('posts', 1, [
                { field: '_core', subfield: 'metaTitle', value: 'Hello!', type: 'json' }
            ]);

            assert.equal(result.status, 'success');
            assert.deepEqual(getPostData(1, '_core'), [{ metaTitle: 'Hello!', metaDesc: 'Description', canonicalUrl: '' }]);
            assert.deepEqual(getPostData(1, 'postViewSettings'), [{ displayDate: 1 }]);
        });

        it('creates the _core data when the post does not have it', function () {
            addPost(1, 'Post', 'post');

            let result = contentFields.update('posts', 1, [
                { field: '_core', subfield: 'metaRobots', value: 'noindex, follow', type: 'json' }
            ]);

            assert.equal(result.status, 'success');
            assert.deepEqual(getPostData(1, '_core'), [{ metaRobots: 'noindex, follow' }]);
        });

        it('normalizes the slug and returns saved values', function () {
            addPost(1, 'Post', 'post');

            let result = contentFields.update('posts', 1, [
                { field: 'title', value: '  New title  ', type: 'field' },
                { field: 'slug', value: '  Hello   World!  ', type: 'field' }
            ], { updateModificationDate: false });

            assert.equal(result.status, 'success');
            assert.deepEqual(result.item, {
                itemID: 1,
                fields: [
                    { field: 'title', value: 'New title', type: 'field' },
                    { field: 'slug', value: 'hello-world', type: 'field' }
                ]
            });
            assert.equal(getPost(1).slug, 'hello-world');
            assert.equal(getPost(1).title, 'New title');
        });

        it('does not update the modification date by default (backward compatibility)', function () {
            addPost(1, 'Post', 'post');

            let result = contentFields.update('posts', 1, [{ field: 'title', value: 'Changed', type: 'field' }]);

            assert.equal(result.status, 'success');
            assert.equal(Number(getPost(1).modified_at), 1000);
            assert.deepEqual(result.item.fields, [{ field: 'title', value: 'Changed', type: 'field' }]);
        });

        it('updates the modification date when it is enabled', function () {
            addPost(1, 'Post', 'post');
            let before = Date.now();

            let result = contentFields.update('posts', 1, [{ field: 'title', value: 'Changed', type: 'field' }], { updateModificationDate: true });
            let modifiedAt = Number(getPost(1).modified_at);

            assert.equal(result.status, 'success');
            assert.ok(modifiedAt >= before);
            assert.deepEqual(result.item.fields[1], { field: 'modified_at', value: modifiedAt, type: 'field' });
        });

        it('does not update the modification date when it is disabled', function () {
            addPost(1, 'Post', 'post');

            let result = contentFields.update('posts', 1, [{ field: 'title', value: 'Changed', type: 'field' }], { updateModificationDate: false });

            assert.equal(result.status, 'success');
            assert.equal(Number(getPost(1).modified_at), 1000);
            assert.equal(result.item.fields.length, 1);
        });

        it('rejects duplicated, empty and restricted slugs', function () {
            addPost(1, 'First', 'first');
            addPost(2, 'Page', 'about', 'published,is-page');

            let duplicate = contentFields.update('posts', 1, [{ field: 'slug', value: 'About', type: 'field' }]);
            assert.equal(duplicate.status, 'error');
            assert.equal(duplicate.errorCode, 'duplicate-slug');
            assert.equal(duplicate.itemID, 1);
            assert.equal(duplicate.field, 'slug');
            assert.equal(duplicate.conflictingItemID, 2);

            assert.equal(contentFields.update('posts', 1, [{ field: 'slug', value: ' !!! ', type: 'field' }]).errorCode, 'empty-slug');
            assert.equal(contentFields.update('posts', 1, [{ field: 'slug', value: 'authors', type: 'field' }]).errorCode, 'restricted-slug');
            assert.equal(contentFields.update('posts', 1, [{ field: 'title', value: '   ', type: 'field' }]).errorCode, 'empty-name');
            assert.equal(getPost(1).slug, 'first');
            assert.equal(getPost(1).title, 'First');
        });

        it('allows restricted slugs when clean URLs are disabled', function () {
            siteConfig.advanced.urls.cleanUrls = false;
            addPost(1, 'First', 'first');

            assert.equal(contentFields.update('posts', 1, [{ field: 'slug', value: 'media', type: 'field' }]).status, 'success');
        });
    });

    describe('tags', function () {
        it('updates JSON data of tags with empty additional data', function () {
            addTag(1, 'Tag', 'tag', '');

            let result = contentFields.update('tags', 1, [
                { field: 'additional_data', subfield: 'metaTitle', value: 'Tag title', type: 'json' },
                { field: 'additional_data', subfield: 'metaRobots', value: '', type: 'json' }
            ]);

            assert.equal(result.status, 'success');
            assert.deepEqual(JSON.parse(getTag(1).additional_data), { metaTitle: 'Tag title', metaRobots: '' });
        });

        it('allows to replace whole additional data of tags', function () {
            addTag(1, 'Tag', 'tag', '');

            assert.equal(contentFields.update('tags', 1, [{ field: 'additional_data', value: '{"isHidden":true}', type: 'field' }]).status, 'success');
            assert.deepEqual(JSON.parse(getTag(1).additional_data), { isHidden: true });
        });

        it('preserves other keys in the JSON data', function () {
            addTag(1, 'Tag', 'tag', JSON.stringify({ isHidden: true, metaDescription: 'Old' }));

            contentFields.update('tags', 1, [{ field: 'additional_data', subfield: 'metaDescription', value: 'New', type: 'json' }]);

            assert.deepEqual(JSON.parse(getTag(1).additional_data), { isHidden: true, metaDescription: 'New' });
        });

        it('rejects duplicated names and slugs', function () {
            addTag(1, 'First', 'first');
            addTag(2, 'Second', 'second');

            assert.equal(contentFields.update('tags', 1, [{ field: 'name', value: 'Second', type: 'field' }]).errorCode, 'duplicate-name');
            assert.equal(contentFields.update('tags', 1, [{ field: 'slug', value: 'second', type: 'field' }]).errorCode, 'duplicate-slug');
            assert.equal(getTag(1).name, 'First');
        });

        it('rejects restricted slugs only when tags prefix is empty', function () {
            addTag(1, 'First', 'first');

            assert.equal(contentFields.update('tags', 1, [{ field: 'slug', value: 'page', type: 'field' }]).errorCode, 'restricted-slug');

            siteConfig.advanced.urls.tagsPrefix = 'tags';
            assert.equal(contentFields.update('tags', 1, [{ field: 'slug', value: 'page', type: 'field' }]).status, 'success');
        });

        it('does not overwrite broken JSON data', function () {
            addTag(1, 'Tag', 'tag', '{broken');

            let result = contentFields.update('tags', 1, [{ field: 'additional_data', subfield: 'metaTitle', value: 'X', type: 'json' }]);

            assert.equal(result.errorCode, 'invalid-json-data');
            assert.equal(getTag(1).additional_data, '{broken');
        });
    });

    describe('authors', function () {
        it('updates meta data in config and meta robots in additional data', function () {
            addAuthor(1, 'Author', 'author', JSON.stringify({ email: 'a@example.com' }), '');

            let result = contentFields.update('authors', 1, [
                { field: 'config', subfield: 'metaTitle', value: 'Author title', type: 'json' },
                { field: 'config', subfield: 'metaDescription', value: 'Author desc', type: 'json' },
                { field: 'additional_data', subfield: 'metaRobots', value: 'index, follow', type: 'json' }
            ]);

            assert.equal(result.status, 'success');
            assert.deepEqual(JSON.parse(getAuthor(1).config), { email: 'a@example.com', metaTitle: 'Author title', metaDescription: 'Author desc' });
            assert.deepEqual(JSON.parse(getAuthor(1).additional_data), { metaRobots: 'index, follow' });
        });

        it('normalizes the username and checks if it is unique', function () {
            addAuthor(1, 'First', 'first');
            addAuthor(2, 'Second', 'Second-Author');

            assert.equal(contentFields.update('authors', 1, [{ field: 'username', value: 'second author', type: 'field' }]).errorCode, 'duplicate-slug');
            assert.equal(contentFields.update('authors', 1, [{ field: 'name', value: 'Second', type: 'field' }]).errorCode, 'duplicate-name');

            let result = contentFields.update('authors', 1, [{ field: 'username', value: 'John Doe', type: 'field' }]);
            assert.equal(result.status, 'success');
            assert.equal(getAuthor(1).username, 'john-doe');
        });

        it('allows to replace whole JSON columns with a JSON object (backward compatibility)', function () {
            addAuthor(1, 'First', 'first', JSON.stringify({ email: 'old@example.com' }), '');

            let result = contentFields.update('authors', 1, [
                { field: 'config', value: '{"metaTitle":"Raw"}', type: 'field' },
                { field: 'additional_data', value: '{"metaRobots":"noindex, follow"}', type: 'field' }
            ]);

            assert.equal(result.status, 'success');
            assert.deepEqual(result.item.fields[0], { field: 'config', value: '{"metaTitle":"Raw"}', type: 'field' });
            assert.deepEqual(JSON.parse(getAuthor(1).config), { metaTitle: 'Raw' });
            assert.deepEqual(JSON.parse(getAuthor(1).additional_data), { metaRobots: 'noindex, follow' });
        });

        it('rejects invalid values of whole JSON columns and other columns', function () {
            addAuthor(1, 'First', 'first', '{"email":"a@example.com"}');

            assert.equal(contentFields.update('authors', 1, [{ field: 'config', value: '{broken', type: 'field' }]).errorCode, 'invalid-json-value');
            assert.equal(contentFields.update('authors', 1, [{ field: 'config', value: '[]', type: 'field' }]).errorCode, 'invalid-json-value');
            assert.equal(contentFields.update('authors', 1, [{ field: 'config', value: '', type: 'field' }]).errorCode, 'invalid-json-value');
            assert.equal(contentFields.update('authors', 1, [{ field: 'config', value: { a: 1 }, type: 'field' }]).errorCode, 'invalid-value');
            assert.equal(contentFields.update('authors', 1, [{ field: 'password', value: 'x', type: 'field' }]).errorCode, 'invalid-column');
            assert.equal(getAuthor(1).config, '{"email":"a@example.com"}');
        });
    });

    describe('batch updates', function () {
        it('saves all items in one transaction', function () {
            addTag(1, 'First', 'first');
            addTag(2, 'Second', 'second');

            let result = contentFields.updateBatch('tags', [
                { itemID: 1, fieldsToUpdate: [{ field: 'additional_data', subfield: 'metaTitle', value: 'One', type: 'json' }] },
                { itemID: 2, fieldsToUpdate: [{ field: 'additional_data', subfield: 'metaTitle', value: 'Two', type: 'json' }] }
            ]);

            assert.equal(result.status, 'success');
            assert.equal(result.items.length, 2);
            assert.equal(JSON.parse(getTag(1).additional_data).metaTitle, 'One');
            assert.equal(JSON.parse(getTag(2).additional_data).metaTitle, 'Two');
        });

        it('saves nothing when any item is invalid', function () {
            addPost(1, 'First', 'first');
            addPost(2, 'Second', 'second');

            let result = contentFields.updateBatch('posts', [
                { itemID: 1, fieldsToUpdate: [{ field: 'title', value: 'Changed', type: 'field' }, { field: '_core', subfield: 'metaTitle', value: 'X', type: 'json' }] },
                { itemID: 2, fieldsToUpdate: [{ field: 'slug', value: 'first', type: 'field' }] }
            ]);

            assert.equal(result.status, 'error');
            assert.equal(result.errorCode, 'duplicate-slug');
            assert.equal(result.itemID, 2);
            assert.equal(getPost(1).title, 'First');
            assert.equal(Number(getPost(1).modified_at), 1000);
            assert.deepEqual(getPostData(1, '_core'), []);
        });

        it('allows to swap slugs between items', function () {
            addPost(1, 'First', 'first');
            addPost(2, 'Second', 'second');

            let result = contentFields.updateBatch('posts', [
                { itemID: 1, fieldsToUpdate: [{ field: 'slug', value: 'second', type: 'field' }] },
                { itemID: 2, fieldsToUpdate: [{ field: 'slug', value: 'first', type: 'field' }] }
            ]);

            assert.equal(result.status, 'success');
            assert.equal(getPost(1).slug, 'second');
            assert.equal(getPost(2).slug, 'first');
        });

        it('detects duplicates inside the batch', function () {
            addPost(1, 'First', 'first');
            addPost(2, 'Second', 'second');

            let result = contentFields.updateBatch('posts', [
                { itemID: 1, fieldsToUpdate: [{ field: 'slug', value: 'same', type: 'field' }] },
                { itemID: 2, fieldsToUpdate: [{ field: 'slug', value: 'same', type: 'field' }] }
            ]);

            assert.equal(result.errorCode, 'duplicate-slug');
            assert.equal(getPost(1).slug, 'first');
        });
    });

    describe('validation', function () {
        it('rejects invalid tables, items and fields', function () {
            addPost(1, 'First', 'first');

            assert.equal(contentFields.update('posts_additional_data', 1, [{ field: 'value', value: 'x', type: 'field' }]).errorCode, 'invalid-table');
            assert.equal(contentFields.update('constructor', 1, [{ field: 'value', value: 'x', type: 'field' }]).errorCode, 'invalid-table');
            assert.equal(contentFields.update('posts', 99, [{ field: 'title', value: 'x', type: 'field' }]).errorCode, 'item-not-found');
            assert.equal(contentFields.update('posts', 'abc', [{ field: 'title', value: 'x', type: 'field' }]).errorCode, 'invalid-item-id');
            assert.equal(contentFields.update('posts', 1, []).errorCode, 'invalid-data');
            assert.equal(contentFields.update('posts', 1, [{ field: 'status', value: 'x', type: 'field' }]).errorCode, 'invalid-column');
            assert.equal(contentFields.update('posts', 1, [{ field: '_core', value: '{}', type: 'field' }]).errorCode, 'invalid-column');
            assert.equal(contentFields.update('posts', 1, [{ field: 'title', value: 5, type: 'field' }]).errorCode, 'invalid-value');
            assert.equal(contentFields.update('posts', 1, [{ field: 'title', value: 'x', type: 'sql' }]).errorCode, 'invalid-field-type');
            assert.equal(contentFields.update('posts', 1, [{ field: 'editor', subfield: 'x', value: 'x', type: 'json' }]).errorCode, 'invalid-column');
            assert.equal(contentFields.update('posts', 1, [{ field: '_core', subfield: '__proto__', value: 'x', type: 'json' }]).errorCode, 'invalid-subfield');
            assert.equal(contentFields.update('posts', 1, [{ field: '_core', subfield: 'metaTitle', type: 'json' }]).errorCode, 'invalid-value');
        });

        it('reports missing database', function () {
            application.getDbForSite = () => false;
            let model = new ContentFields(application, { site: siteName });

            assert.equal(model.update('posts', 1, [{ field: 'title', value: 'x', type: 'field' }]).errorCode, 'db-unavailable');
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

        it('handles single and batch updates via invoke', async function () {
            const handlers = new Map();
            const ContentEvents = loadContentEvents(handlers);
            new ContentEvents(application);
            addTag(1, 'First', 'first');

            let single = await handlers.get('app-content-fields-update')({}, {
                site: siteName,
                table: 'tags',
                itemID: 1,
                fieldsToUpdate: [{ field: 'slug', value: 'New Slug', type: 'field' }]
            });
            let batch = await handlers.get('app-content-fields-batch-update')({}, {
                site: siteName,
                table: 'tags',
                items: [{ itemID: 1, fieldsToUpdate: [{ field: 'name', value: 'Renamed', type: 'field' }] }]
            });

            assert.equal(single.status, 'success');
            assert.equal(single.item.fields[0].value, 'new-slug');
            assert.equal(batch.status, 'success');
            assert.equal(getTag(1).name, 'Renamed');
        });

        it('rejects invalid site names', async function () {
            const handlers = new Map();
            const ContentEvents = loadContentEvents(handlers);
            new ContentEvents(application);

            let result = await handlers.get('app-content-fields-update')({}, { site: '../other', table: 'tags', itemID: 1, fieldsToUpdate: [] });
            assert.equal(result.status, 'error');
            assert.equal(result.errorCode, 'invalid-site');
            assert.equal((await handlers.get('app-content-fields-batch-update')({}, null)).errorCode, 'invalid-site');
        });

        it('exposes the channels only via invoke in the preload script', function () {
            const preload = fs.readFileSync(path.resolve(__dirname, '../app-preload.js'), 'utf8');
            const invoke = preload.slice(preload.indexOf('    invoke:'), preload.indexOf('    stopReceive:'));
            const beforeInvoke = preload.slice(0, preload.indexOf('    invoke:'));

            assert.ok(invoke.includes("'app-content-fields-update'"));
            assert.ok(invoke.includes("'app-content-fields-batch-update'"));
            assert.ok(!beforeInvoke.includes("'app-content-fields-update'"));
            assert.ok(!preload.includes("'app-content-fields-updated'"));
        });
    });
});
