/*
 * Authors instance
 */

const Model = require('./model.js');

class Authors extends Model {
    /**
     * Authors constructor
     *
     * @param appInstance
     * @param authorsData
     */
    constructor(appInstance, authorsData) {
        super(appInstance, authorsData);
    }

    /**
     * Load authors
     */
    load() {
        let sqlQuery = `SELECT
            id,
            name,
            username,
            config,
            additional_data AS additionalData
        FROM
            authors
        GROUP BY
            id
        ORDER BY
            id ASC`;
            
        let rows = this.db.prepare(sqlQuery).get();
        let results = [];
        
        for (const author of rows.iterate()) {
           results.push(author);
        }

        return results;
    }
}

module.exports = Authors;
