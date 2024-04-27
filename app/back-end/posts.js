/*
 * Posts instance
 */

const Model = require('./model.js');

class Posts extends Model {
    constructor(appInstance, postsData) {
        super(appInstance, postsData);
    }

    /*
     * Load posts
     */
    load() {
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
                p.status NOT LIKE '%is-page%'
                AND (
                    pad.key = '_core' OR
                    pad.key IS NULL
                )
            ORDER BY 
                id DESC`;

        return this.db.prepare(sqlQuery).all();
    }

    /*
     * Load references between posts and tags
     */
    loadTagsXRef() {
        let sqlQuery = `
            SELECT 
                post_id AS postID, 
                tag_id AS tagID
            FROM 
                posts_tags 
            ORDER BY 
                post_id DESC`;

        return this.db.prepare(sqlQuery).all();
    }

    /*
     * Load references between posts and authors
     */
    loadAuthorsXRef() {
        let sqlQuery = `
            SELECT 
                p.id AS postID,
                a.id AS authorID,
                a.name AS authorName
            FROM 
                posts AS p 
            LEFT JOIN 
                authors AS a 
            ON
                p.authors = a.id 
            WHERE
                p.status NOT LIKE '%is-page%'
            ORDER BY 
                p.id DESC`;

        return this.db.prepare(sqlQuery).all();
    }
}

module.exports = Posts;
