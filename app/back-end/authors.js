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
            
        return this.db.prepare(sqlQuery).all();
    }
}

module.exports = Authors;
