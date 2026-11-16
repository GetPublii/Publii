const assert = require('node:assert/strict');
const ContentFieldsStore = require('../content-fields-store');

describe('Content fields API - store helpers', function () {
    it('maps item types to tables and store collections', function () {
        assert.equal(ContentFieldsStore.getTableForItemType('post'), 'posts');
        assert.equal(ContentFieldsStore.getTableForItemType('page'), 'posts');
        assert.equal(ContentFieldsStore.getTableForItemType('tag'), 'tags');
        assert.equal(ContentFieldsStore.getTableForItemType('author'), 'authors');
        assert.equal(ContentFieldsStore.getTableForItemType('toString'), false);
        assert.equal(ContentFieldsStore.getCollectionForItemType('page'), 'pages');
        assert.equal(ContentFieldsStore.getCollectionForItemType('menu'), false);
    });

    it('stores _core data of posts and pages in additional_data', function () {
        let post = { id: 1, title: 'Post', modified_at: 1, additional_data: JSON.stringify({ metaDesc: 'Desc' }) };

        ContentFieldsStore.applyFieldsToItem(post, 'post', [
            { field: '_core', subfield: 'metaTitle', value: 'Title', type: 'json' },
            { field: 'title', value: 'New', type: 'field' },
            { field: 'modified_at', value: 5, type: 'field' }
        ]);

        assert.deepEqual(JSON.parse(post.additional_data), { metaDesc: 'Desc', metaTitle: 'Title' });
        assert.equal(post.title, 'New');
        assert.equal(post.modified_at, 5);
    });

    it('does not add the featured image data to the items of posts and pages', function () {
        let post = { id: 1, title: 'Post', additional_data: '{"metaTitle":"Old"}' };
        let page = { id: 2, title: 'Page', additional_data: null };
        let postBefore = structuredClone(post);

        ContentFieldsStore.applyFieldsToItem(post, 'post', [{ field: 'featuredImage', subfield: 'alt', value: 'Alt', type: 'json' }]);
        ContentFieldsStore.applyFieldsToItem(page, 'page', [
            { field: 'featuredImage', subfield: 'caption', value: 'Caption', type: 'json' },
            { field: '_core', subfield: 'metaTitle', value: 'Title', type: 'json' }
        ]);

        assert.deepEqual(post, postBefore);
        assert.deepEqual(Object.keys(page), ['id', 'title', 'additional_data']);
        assert.deepEqual(JSON.parse(page.additional_data), { metaTitle: 'Title' });
    });

    it('creates _core data for posts without additional data', function () {
        let page = { id: 1, additional_data: null };

        ContentFieldsStore.applyFieldsToItem(page, 'page', [{ field: '_core', subfield: 'metaRobots', value: 'noindex, follow', type: 'json' }]);

        assert.deepEqual(JSON.parse(page.additional_data), { metaRobots: 'noindex, follow' });
    });

    it('stores additional_data of tags and authors in additionalData', function () {
        let tag = { id: 1, additionalData: '' };
        let author = { id: 1, config: '{"email":"a@example.com"}', additionalData: '{}' };

        ContentFieldsStore.applyFieldsToItem(tag, 'tag', [{ field: 'additional_data', subfield: 'metaTitle', value: 'Tag', type: 'json' }]);
        ContentFieldsStore.applyFieldsToItem(author, 'author', [
            { field: 'config', subfield: 'metaTitle', value: 'Author', type: 'json' },
            { field: 'additional_data', subfield: 'metaRobots', value: '', type: 'json' }
        ]);

        assert.deepEqual(JSON.parse(tag.additionalData), { metaTitle: 'Tag' });
        assert.equal(Object.hasOwn(tag, 'additional_data'), false);
        assert.deepEqual(JSON.parse(author.config), { email: 'a@example.com', metaTitle: 'Author' });
        assert.deepEqual(JSON.parse(author.additionalData), { metaRobots: '' });
    });

    it('maps whole JSON columns replaced with the field type', function () {
        let tag = { id: 1, additionalData: '{"metaTitle":"Old"}' };
        let author = { id: 1, config: '{}', additionalData: { metaRobots: '' } };

        ContentFieldsStore.applyFieldsToItem(tag, 'tag', [{ field: 'additional_data', value: '{"isHidden":true}', type: 'field' }]);
        ContentFieldsStore.applyFieldsToItem(author, 'author', [
            { field: 'config', value: '{"metaTitle":"Raw"}', type: 'field' },
            { field: 'additional_data', value: '{"metaRobots":"index, follow"}', type: 'field' }
        ]);

        assert.equal(tag.additionalData, '{"isHidden":true}');
        assert.equal(Object.hasOwn(tag, 'additional_data'), false);
        assert.equal(author.config, '{"metaTitle":"Raw"}');
        assert.deepEqual(author.additionalData, { metaRobots: 'index, follow' });
    });

    it('sends only known options as booleans, disabled by default', function () {
        assert.deepEqual(ContentFieldsStore.getRequestOptions(), { updateModificationDate: false, validateOnly: false });
        assert.deepEqual(ContentFieldsStore.getRequestOptions({ updateModificationDate: 'yes', validateOnly: 1, other: true }), { updateModificationDate: false, validateOnly: false });
        assert.deepEqual(ContentFieldsStore.getRequestOptions({ updateModificationDate: true, validateOnly: true }), { updateModificationDate: true, validateOnly: true });
        assert.equal(ContentFieldsStore.isValidateOnly(null), false);
        assert.equal(ContentFieldsStore.isValidateOnly({ validateOnly: true }), true);
    });

    it('keeps parsed JSON objects as objects', function () {
        let tag = { id: 1, additionalData: { isHidden: true } };

        ContentFieldsStore.applyFieldsToItem(tag, 'tag', [{ field: 'additional_data', subfield: 'metaTitle', value: 'Tag', type: 'json' }]);

        assert.deepEqual(tag.additionalData, { isHidden: true, metaTitle: 'Tag' });
    });
});
