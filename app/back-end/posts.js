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
                id, 
                title, 
                authors, 
                slug, 
                created_at, 
                modified_at, 
                status 
            FROM 
                posts 
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
            ORDER BY 
                p.id DESC`;

        return this.db.prepare(sqlQuery).all();
    }
}

module.exports = Posts;
