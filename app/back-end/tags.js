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

        return this.db.prepare(sqlQuery).all();
    }
}

module.exports = Tags;
