/*
 * Helpers for the content fields API (window.app.setContentElementField and window.app.setContentElementsFields)
 *
 * Maps item types to the DB tables and applies the fields saved by the back-end to the items in the store.
 */

const ITEM_TYPES = {
    post: { table: 'posts', collection: 'posts' },
    page: { table: 'posts', collection: 'pages' },
    tag: { table: 'tags', collection: 'tags' },
    author: { table: 'authors', collection: 'authors' }
};

// Names of the DB JSON fields which are stored under different keys in the store
const STORE_JSON_FIELDS = {
    post: { _core: 'additional_data' },
    page: { _core: 'additional_data' },
    tag: { additional_data: 'additionalData' },
    author: { additional_data: 'additionalData' }
};

function getTableForItemType (itemType) {
    return Object.prototype.hasOwnProperty.call(ITEM_TYPES, itemType) ? ITEM_TYPES[itemType].table : false;
}

function getCollectionForItemType (itemType) {
    return Object.prototype.hasOwnProperty.call(ITEM_TYPES, itemType) ? ITEM_TYPES[itemType].collection : false;
}

// JSON columns are mapped for both types - 'json' (single subfield) and 'field' (whole column replaced)
function getStoreFieldName (itemType, field) {
    if (STORE_JSON_FIELDS[itemType] && Object.prototype.hasOwnProperty.call(STORE_JSON_FIELDS[itemType], field)) {
        return STORE_JSON_FIELDS[itemType][field];
    }

    return field;
}

function parseStoredJson (value) {
    if (value && typeof value === 'object') {
        return Object.assign({}, value);
    }

    if (typeof value !== 'string' || value === '') {
        return {};
    }

    try {
        let parsed = JSON.parse(value);
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch (e) {
        return {};
    }
}

/**
 * Applies fields returned by the back-end to the store item
 *
 * @param {object} item - item from the store
 * @param {string} itemType - post, page, tag or author
 * @param {Array} fields - normalized fields returned by the back-end
 */
function applyFieldsToItem (item, itemType, fields) {
    for (let fieldObj of fields) {
        let storeField = getStoreFieldName(itemType, fieldObj.field);

        if (fieldObj.type === 'field') {
            let storedValue = item[storeField];

            // Whole JSON column replaced - keep the format used in the store
            if (storedValue && typeof storedValue === 'object') {
                item[storeField] = parseStoredJson(fieldObj.value);
            } else {
                item[storeField] = fieldObj.value;
            }

            continue;
        }

        if (fieldObj.type === 'json') {
            let storedValue = item[storeField];
            let jsonData = parseStoredJson(storedValue);
            jsonData[fieldObj.subfield] = fieldObj.value;
            // Keep the format used in the store (some items keep parsed objects)
            item[storeField] = storedValue && typeof storedValue === 'object' ? jsonData : JSON.stringify(jsonData);
        }
    }

    return item;
}

module.exports = {
    getTableForItemType,
    getCollectionForItemType,
    getStoreFieldName,
    applyFieldsToItem
};
