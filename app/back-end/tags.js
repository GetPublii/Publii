/*
 * Tags instance
 */

const Model = require('./model.js');

class Tags extends Model {
    constructor(appInstance, tagsData) {
        super(appInstance, tagsData);
    }

    /*
     * Load tags
     */
    load() {
        let sqlQuery = `SELECT
            id,
            name,
            slug,
            description,
            additional_data AS additionalData
        FROM
            tags
        GROUP BY
            id
        ORDER BY
            id DESC`;

        let rows = this.db.prepare(sqlQuery).get();
        let results = [];
        
        for (const tag of rows.iterate()) {
           results.push(tag);
        }

        return results;
    }
}

module.exports = Tags;
