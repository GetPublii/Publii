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
            additional_data
        FROM
            authors
        GROUP BY
            id
        ORDER BY
            id ASC`;
        let results = this.getResults(this.db.exec(sqlQuery));

        results = results.map(function(author) {
            return {
                id: author[0],
                name: author[1],
                username: author[2],
                config: author[3],
                additionalData: author[4]
            };
        });

        return results;
    }
}

module.exports = Authors;
