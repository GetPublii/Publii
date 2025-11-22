/*
 * Model base class
 */

const fs = require('fs');
const path = require('path');

class Model {
    /**
     * Model constructor
     *
     * @param appInstance
     * @param data
     */
    constructor(appInstance, data) {
        this.application = appInstance;
        this.db = this.application.db;
        this.site = data.site;
        this.appDir = this.application.appDir;
        this.siteDir = path.join(this.application.sitesDir, this.site);
        this.dbPath = path.join(this.siteDir, 'input', 'db.sqlite');
    }

    /**
     * Escapes given string
     *
     * @param stringToEscape
     * @returns {*}
     */
    escape(stringToEscape) {
        if(stringToEscape == '') {
            return stringToEscape;
        }

        return stringToEscape
            .replace(/\\/g, "\\\\")
            .replace(/\'/g, "\\\'")
            .replace(/\"/g, "\\\"")
            .replace(/\n/g, "\\\n")
            .replace(/\r/g, "\\\r")
            .replace(/\x00/g, "\\\x00")
            .replace(/\x1a/g, "\\\x1a");
    }

    /**
     * Modify field
     * 
     * @param {string} table - table name
     * @param {number} itemID - item ID
     * @param {Array} fieldsToUpdate - array of fields to update
     * 
     *   [{
     *       field: 'slug',
     *       value: 'new-slug-value',
     *       type: 'field'
     *   },
     *   {
     *       field: '_core',
     *       subfield: 'metaDesc'
     *       value: 'New Title',
     *       type: 'json'
     *   }]
     */
    updateField (table, itemID, fieldsToUpdate) {
        const ALLOWED_TABLES = [
            'authors',
            'posts',
            'posts_additional_data',
            'tags'
        ];

        const ALLOWED_COLUMNS_BY_TABLE = {
            'authors': ['name', 'username', 'config', 'additional_data'],
            'posts': ['slug', 'title', 'text'],
            'posts_additional_data': ['key', 'value'],
            'tags': ['name', 'slug', 'description', 'additional_data']
        };

        if (!ALLOWED_TABLES.includes(table)) {
            return {
                status: 'error',
                error: 'Invalid table name: ' + table
            };
        }

        let invalidField = false;

        fieldsToUpdate.forEach(fieldObj => {
            if (invalidField) {
                return;
            }

            let dbColumnName;
            let tableName = table;
            let idColumn = 'id';

            if (table === 'posts' && fieldObj.field === '_core') {
                tableName = 'posts_additional_data';
            }

            if (tableName === 'posts_additional_data') {
                idColumn = 'post_id';
            }

            let allowedFieldsForThisTable = ALLOWED_COLUMNS_BY_TABLE[tableName] || [];
            
            if (tableName === 'posts_additional_data') {
                dbColumnName = 'value';
            } else {
                dbColumnName = fieldObj.field;
            }

            if (!allowedFieldsForThisTable.includes(dbColumnName)) {
                invalidField = dbColumnName;
                return;
            }

            if (fieldObj.type === 'field') {
                let sql = this.db.prepare(`UPDATE ${tableName} SET ${dbColumnName} = @column WHERE ${idColumn} = @id`);
                sql.run({
                    column: fieldObj.value, 
                    id: itemID
                });
            } else if (fieldObj.type === 'json') {
                let sqlSelect;
                let sqlUpdate;
                let jsonData;

                if (table === 'posts_additional_data') {
                    sqlSelect = this.db.prepare(`SELECT value FROM ${tableName} WHERE ${idColumn} = @id AND key = @field`);
                    let row = sqlSelect.get({
                        id: itemID, 
                        field: fieldObj.field
                    });
                    jsonData = row ? JSON.parse(row.value) : {};
                } else {
                    sqlSelect = this.db.prepare(`SELECT ${dbColumnName} FROM ${tableName} WHERE ${idColumn} = @id`);
                    let row = sqlSelect.get({
                        id: itemID
                    });
                    jsonData = row ? JSON.parse(row[dbColumnName]) : {};
                }

                jsonData[fieldObj.subfield] = fieldObj.value;
                let newJsonString = JSON.stringify(jsonData);

                if (table === 'posts_additional_data') {
                    sqlUpdate = this.db.prepare(`UPDATE ${tableName} SET value = @json WHERE ${idColumn} = @id AND key = @field`);
                    sqlUpdate.run({
                        json: newJsonString, 
                        id: itemID, 
                        field: fieldObj.field
                    });
                } else {
                    sqlUpdate = this.db.prepare(`UPDATE ${tableName} SET ${dbColumnName} = @json WHERE ${idColumn} = @id AND key = @field`);
                    sqlUpdate.run({
                        json: newJsonString, 
                        id: itemID,
                        field: fieldObj.field
                    });
                }
            }
        });

        if (invalidField) {
            return {
                status: 'error',
                error: 'Invalid table column name: ' + invalidField
            }; 
        }

        return {
            status: 'success'
        };
    }
}

module.exports = Model;
