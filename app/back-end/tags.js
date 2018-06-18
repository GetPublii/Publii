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
            additional_data
        FROM
            tags
        GROUP BY
            id
        ORDER BY
            id DESC`;

        let results = this.getResults(this.db.exec(sqlQuery));

        results = results.map(function(tag) {
            return {
                id: tag[0],
                name: tag[1],
                slug: tag[2],
                description: tag[3],
                additionalData: tag[4]
            }
        });

        return results;
    }
}

module.exports = Tags;
