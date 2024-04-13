/*
 * Pages instance
 */

const Model = require('./model.js');

class Pages extends Model {
    constructor(appInstance, pagesData) {
        super(appInstance, pagesData);
    }

    /*
     * Load pages
     */
    load () {
        let sqlQuery = `
            SELECT 
                p.id AS id, 
                p.title AS title, 
                p.authors AS authors, 
                p.slug AS slug, 
                p.created_at AS created_at, 
                p.modified_at AS modified_at, 
                p.status AS status,
                pad.value AS additional_data
            FROM 
                posts AS p
            LEFT JOIN
                posts_additional_data AS pad
                ON
                pad.post_id = p.id
            WHERE
                p.status LIKE '%is-page%' AND
                (
                    pad.key = '_core' OR
                    pad.key IS NULL
                )
            ORDER BY 
                id DESC`;

        return this.db.prepare(sqlQuery).all();
    }

    /*
     * Load references between pages and authors
     */
    loadAuthorsXRef() {
        let sqlQuery = `
            SELECT 
                p.id AS pageID,
                a.id AS authorID,
                a.name AS authorName
            FROM 
                posts AS p 
            LEFT JOIN 
                authors AS a 
            ON
                p.authors = a.id 
            WHERE
                p.status LIKE '%is-page%'
            ORDER BY 
                p.id DESC`;

        return this.db.prepare(sqlQuery).all();
    }
}

module.exports = Pages;
