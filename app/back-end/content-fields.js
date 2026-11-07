/*
 * Updates selected fields of the content items (posts, pages, tags, authors)
 *
 * Used by the plugins via window.app.setContentElementField and window.app.setContentElementsFields.
 * All changes are validated in the same way as in the post/tag/author forms and saved
 * in a single transaction - when any of the fields is invalid, nothing is saved.
 *
 * Fields format:
 *
 *   [{
 *       field: 'slug',
 *       value: 'new-slug-value',
 *       type: 'field'
 *   },
 *   {
 *       field: '_core',
 *       subfield: 'metaDesc',
 *       value: 'New description',
 *       type: 'json'
 *   }]
 */

const Model = require('./model.js');
const slug = require('./helpers/slug');

const FORBIDDEN_SUBFIELDS = ['__proto__', 'constructor', 'prototype'];

const TABLES_SCHEMA = {
    posts: {
        columns: ['title', 'slug', 'text'],
        // stored in the posts_additional_data table (key = field name)
        jsonFields: ['_core'],
        nameColumn: 'title',
        slugColumn: 'slug',
        uniqueName: false
    },
    tags: {
        columns: ['name', 'slug', 'description'],
        jsonFields: ['additional_data'],
        nameColumn: 'name',
        slugColumn: 'slug',
        uniqueName: true
    },
    authors: {
        columns: ['name', 'username'],
        jsonFields: ['config', 'additional_data'],
        nameColumn: 'name',
        slugColumn: 'username',
        uniqueName: true
    }
};

class ContentFieldError extends Error {
    constructor (code, message, details = {}) {
        super(message);
        this.code = code;
        this.details = details;
    }
}

class ContentFields extends Model {
    constructor (appInstance, data) {
        super(appInstance, data);
    }

    /**
     * Updates fields of a single item
     *
     * @param {string} table - posts, tags or authors
     * @param {number} itemID
     * @param {Array} fieldsToUpdate
     * @param {object} options - { updateModificationDate: false } - when true, modified_at of posts and pages is updated
     *
     * @returns {object} - { status: 'success', item: { itemID, fields } } or { status: 'error', errorCode, error, itemID, field }
     */
    update (table, itemID, fieldsToUpdate, options = {}) {
        let result = this.updateBatch(table, [{ itemID, fieldsToUpdate }], options);

        if (result.status !== 'success') {
            return result;
        }

        return {
            status: 'success',
            item: result.items[0]
        };
    }

    /**
     * Updates fields of many items in one transaction
     *
     * @param {string} table - posts, tags or authors
     * @param {Array} items - [{ itemID, fieldsToUpdate }]
     * @param {object} options - { updateModificationDate: false } - when true, modified_at of posts and pages is updated
     *
     * @returns {object} - { status: 'success', items: [{ itemID, fields }] } or { status: 'error', errorCode, error, itemID, field }
     */
    updateBatch (table, items, options = {}) {
        let schema = TABLES_SCHEMA[table];

        if (!Object.prototype.hasOwnProperty.call(TABLES_SCHEMA, table)) {
            return this.errorResult(new ContentFieldError('invalid-table', 'Invalid table name: ' + table));
        }

        if (!this.db) {
            return this.errorResult(new ContentFieldError('db-unavailable', 'Database of the website is not available'));
        }

        if (!Array.isArray(items) || !items.length) {
            return this.errorResult(new ContentFieldError('invalid-data', 'List of items to update is empty'));
        }

        // Disabled by default - the API did not change the modification date before this option was added
        let updateModificationDate = !!(options && options.updateModificationDate === true);
        let modificationDate = Date.now();
        let changedUniqueValues = [];
        let results = [];

        this.db.exec('BEGIN');

        try {
            for (let item of items) {
                results.push(this.updateItem(table, schema, item, changedUniqueValues, updateModificationDate, modificationDate));
            }

            // Uniqueness is checked after all changes are applied - thanks to it, it is possible to swap slugs between items
            this.checkUniqueValues(table, schema, changedUniqueValues);
            this.db.exec('COMMIT');
        } catch (e) {
            try {
                this.db.exec('ROLLBACK');
            } catch (rollbackError) {
                console.log('[ContentFields] Rollback error:', rollbackError.message);
            }

            return this.errorResult(e);
        }

        return {
            status: 'success',
            items: results
        };
    }

    /**
     * Updates single item - must be called inside the transaction
     */
    updateItem (table, schema, item, changedUniqueValues, updateModificationDate, modificationDate) {
        let itemID = item ? Number(item.itemID) : NaN;
        let fieldsToUpdate = item ? item.fieldsToUpdate : null;

        if (!Number.isInteger(itemID) || itemID <= 0) {
            throw new ContentFieldError('invalid-item-id', 'Invalid item ID: ' + (item ? item.itemID : item), { itemID: item ? item.itemID : null });
        }

        if (!Array.isArray(fieldsToUpdate) || !fieldsToUpdate.length) {
            throw new ContentFieldError('invalid-data', 'List of fields to update is empty', { itemID });
        }

        let currentData = this.db.prepare(`SELECT id, ${schema.nameColumn} AS name, ${schema.slugColumn} AS slug FROM ${table} WHERE id = @id`).get({ id: itemID });

        if (!currentData) {
            throw new ContentFieldError('item-not-found', 'Item not found: ' + itemID, { itemID });
        }

        // Validate all fields before saving anything
        let normalizedFields = fieldsToUpdate.map(fieldObj => this.normalizeField(table, schema, itemID, fieldObj));
        let updatedFields = [];

        for (let fieldObj of normalizedFields) {
            if (fieldObj.type === 'field') {
                this.db.prepare(`UPDATE ${table} SET ${fieldObj.field} = @value WHERE id = @id`).run({
                    value: fieldObj.value,
                    id: itemID
                });

                if (fieldObj.field === schema.slugColumn && fieldObj.value !== currentData.slug) {
                    changedUniqueValues.push({ itemID, field: fieldObj.field, kind: 'slug', value: fieldObj.value });
                }

                if (schema.uniqueName && fieldObj.field === schema.nameColumn && fieldObj.value !== currentData.name) {
                    changedUniqueValues.push({ itemID, field: fieldObj.field, kind: 'name', value: fieldObj.value });
                }
            } else {
                this.saveJsonSubfield(table, itemID, fieldObj);
            }

            updatedFields.push(fieldObj);
        }

        if (table === 'posts' && updateModificationDate) {
            this.db.prepare(`UPDATE posts SET modified_at = @modifiedAt WHERE id = @id`).run({
                modifiedAt: modificationDate,
                id: itemID
            });

            updatedFields.push({
                field: 'modified_at',
                value: modificationDate,
                type: 'field'
            });
        }

        return {
            itemID,
            fields: updatedFields
        };
    }

    /**
     * Validates field and returns its normalized version
     */
    normalizeField (table, schema, itemID, fieldObj) {
        if (!fieldObj || typeof fieldObj !== 'object') {
            throw new ContentFieldError('invalid-field', 'Invalid field definition', { itemID });
        }

        let field = fieldObj.field;

        if (fieldObj.type === 'field') {
            // Whole JSON columns of tags and authors can be replaced (backward compatibility),
            // posts keep their JSON data in posts_additional_data, so they are excluded
            let isRawJsonColumn = table !== 'posts' && schema.jsonFields.includes(field);

            if (!schema.columns.includes(field) && !isRawJsonColumn) {
                throw new ContentFieldError('invalid-column', 'Invalid table column name: ' + field, { itemID, field });
            }

            if (typeof fieldObj.value !== 'string') {
                throw new ContentFieldError('invalid-value', 'Value of the field ' + field + ' must be a string', { itemID, field });
            }

            let value = fieldObj.value;

            if (isRawJsonColumn) {
                if (!this.isJsonObjectString(value)) {
                    throw new ContentFieldError('invalid-json-value', 'Value of the field ' + field + ' must be a JSON object', { itemID, field });
                }

                return { field, value, type: 'field' };
            }

            if (field === schema.slugColumn) {
                value = slug(value);

                if (value === '') {
                    throw new ContentFieldError('empty-slug', 'Slug cannot be empty', { itemID, field });
                }

                if (this.getRestrictedSlugs(table).includes(value)) {
                    throw new ContentFieldError('restricted-slug', 'Slug "' + value + '" is restricted', { itemID, field });
                }
            } else if (field === schema.nameColumn) {
                value = value.trim();

                if (value === '') {
                    throw new ContentFieldError('empty-name', 'Field ' + field + ' cannot be empty', { itemID, field });
                }
            }

            return { field, value, type: 'field' };
        }

        if (fieldObj.type === 'json') {
            let subfield = fieldObj.subfield;

            if (!schema.jsonFields.includes(field)) {
                throw new ContentFieldError('invalid-column', 'Invalid table column name: ' + field, { itemID, field });
            }

            if (typeof subfield !== 'string' || subfield.trim() === '' || FORBIDDEN_SUBFIELDS.includes(subfield)) {
                throw new ContentFieldError('invalid-subfield', 'Invalid subfield name: ' + subfield, { itemID, field });
            }

            if (typeof fieldObj.value === 'undefined' || typeof fieldObj.value === 'function' || typeof fieldObj.value === 'symbol') {
                throw new ContentFieldError('invalid-value', 'Invalid value of the subfield ' + subfield, { itemID, field });
            }

            return { field, subfield, value: fieldObj.value, type: 'json' };
        }

        throw new ContentFieldError('invalid-field-type', 'Invalid field type: ' + fieldObj.type, { itemID, field });
    }

    /**
     * Saves value of the subfield in the JSON column (or in the posts_additional_data row)
     */
    saveJsonSubfield (table, itemID, fieldObj) {
        if (table === 'posts') {
            let row = this.db.prepare(`SELECT id, value FROM posts_additional_data WHERE post_id = @id AND key = @key ORDER BY id ASC LIMIT 1`).get({
                id: itemID,
                key: fieldObj.field
            });
            let jsonData = this.parseJsonObject(row ? row.value : '', itemID, fieldObj.field);
            jsonData[fieldObj.subfield] = fieldObj.value;

            if (row) {
                this.db.prepare(`UPDATE posts_additional_data SET value = @value WHERE id = @rowID`).run({
                    value: JSON.stringify(jsonData),
                    rowID: row.id
                });
            } else {
                this.db.prepare(`INSERT INTO posts_additional_data VALUES(NULL, @id, @key, @value)`).run({
                    id: itemID,
                    key: fieldObj.field,
                    value: JSON.stringify(jsonData)
                });
            }

            return;
        }

        let row = this.db.prepare(`SELECT ${fieldObj.field} AS value FROM ${table} WHERE id = @id`).get({ id: itemID });
        let jsonData = this.parseJsonObject(row ? row.value : '', itemID, fieldObj.field);
        jsonData[fieldObj.subfield] = fieldObj.value;

        this.db.prepare(`UPDATE ${table} SET ${fieldObj.field} = @value WHERE id = @id`).run({
            value: JSON.stringify(jsonData),
            id: itemID
        });
    }

    /**
     * Parses JSON stored in DB - empty values are treated as an empty object,
     * but broken data is not overwritten
     */
    parseJsonObject (value, itemID, field) {
        if (value === null || typeof value === 'undefined' || value === '') {
            return {};
        }

        let parsed;

        try {
            parsed = JSON.parse(value);
        } catch (e) {
            throw new ContentFieldError('invalid-json-data', 'Stored data of the field ' + field + ' is not a valid JSON', { itemID, field });
        }

        if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
            throw new ContentFieldError('invalid-json-data', 'Stored data of the field ' + field + ' is not a JSON object', { itemID, field });
        }

        return parsed;
    }

    isJsonObjectString (value) {
        try {
            let parsed = JSON.parse(value);
            return parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed);
        } catch (e) {
            return false;
        }
    }

    /**
     * Returns list of slugs which cannot be used - the same rules as in Post and Tag classes
     */
    getRestrictedSlugs (table) {
        let siteConfig = this.application.sites ? this.application.sites[this.site] : null;
        let urls = siteConfig && siteConfig.advanced && siteConfig.advanced.urls ? siteConfig.advanced.urls : {};

        if (table === 'posts') {
            if (!urls.cleanUrls) {
                return [];
            }

            let restrictedSlugs = ['assets', 'media', urls.authorsPrefix];

            if (urls.tagsPrefix) {
                restrictedSlugs.push(urls.tagsPrefix);
            }

            return restrictedSlugs.filter(Boolean);
        }

        if (table === 'tags') {
            if (urls.tagsPrefix) {
                return [];
            }

            return ['assets', urls.authorsPrefix, 'media', urls.pageName].filter(Boolean);
        }

        return [];
    }

    /**
     * Checks if changed slugs and names are unique - the same rules as in Post, Tag and Author classes
     */
    checkUniqueValues (table, schema, changedUniqueValues) {
        for (let change of changedUniqueValues) {
            let conflict;

            if (change.kind === 'slug' && table === 'authors') {
                conflict = this.db.prepare(`SELECT id, username FROM authors WHERE id != @id`).all({ id: change.itemID })
                                  .find(author => slug(author.username || '') === change.value);
            } else {
                conflict = this.db.prepare(`SELECT id FROM ${table} WHERE ${change.field} = @value AND id != @id LIMIT 1`).get({
                    value: change.value,
                    id: change.itemID
                });
            }

            if (conflict) {
                throw new ContentFieldError(
                    change.kind === 'slug' ? 'duplicate-slug' : 'duplicate-name',
                    (change.kind === 'slug' ? 'Slug' : 'Name') + ' "' + change.value + '" is already used by the item with ID ' + conflict.id,
                    { itemID: change.itemID, field: change.field, conflictingItemID: conflict.id }
                );
            }
        }
    }

    errorResult (error) {
        if (error instanceof ContentFieldError) {
            return {
                status: 'error',
                errorCode: error.code,
                error: error.message,
                itemID: typeof error.details.itemID !== 'undefined' ? error.details.itemID : null,
                field: error.details.field || null,
                conflictingItemID: error.details.conflictingItemID || null
            };
        }

        console.log('[ContentFields] Unexpected error:', error && error.message);

        return {
            status: 'error',
            errorCode: 'unexpected-error',
            error: error && error.message ? error.message : 'Unexpected error',
            itemID: null,
            field: null,
            conflictingItemID: null
        };
    }
}

ContentFields.TABLES_SCHEMA = TABLES_SCHEMA;

module.exports = ContentFields;
