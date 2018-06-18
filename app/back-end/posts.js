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
        let sqlQuery = `SELECT 
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
        let results = this.getResults(this.db.exec(sqlQuery));

        results = results.map(function(post) {
            return {
                id: post[0],
                title: post[1],
                authors: post[2],
                slug: post[3],
                created_at: post[4],
                modified_at: post[5],
                status: post[6]
            };
        });

        return results;
    }

    /*
     * Load references between posts and tags
     */
    loadTagsXRef() {
        let sqlQuery = `SELECT 
                            post_id, 
                            tag_id 
                        FROM 
                            posts_tags 
                        ORDER BY 
                            post_id DESC`;
        let results = this.getResults(this.db.exec(sqlQuery));

        results = results.map(function(xref) {
            return {
                postID: xref[0],
                tagID: xref[1]
            }
        });

        return results;
    }

    /*
     * Load references between posts and authors
     */
    loadAuthorsXRef() {
        let sqlQuery = `SELECT 
                            p.id AS post_id,
                            a.id AS author_id,
                            a.name AS author_name
                        FROM 
                            posts AS p 
                        LEFT JOIN 
                            authors AS a 
                        ON
                            p.authors = a.id 
                        ORDER BY 
                            p.id DESC`;
        let results = this.getResults(this.db.exec(sqlQuery));

        results = results.map(function(xref) {
            return {
                postID: xref[0],
                authorID: xref[1],
                authorName: xref[2]
            }
        });

        return results;
    }
}

module.exports = Posts;
