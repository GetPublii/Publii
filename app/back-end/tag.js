/*
 * Tag instance
 */

const fs = require('fs');
const path = require('path');
const Model = require('./model.js');
const Tags = require('./tags.js');
const slug = require('./helpers/slug');

class Tag extends Model {
    constructor(appInstance, tagData, storeMode = true) {
        super(appInstance, tagData);
        this.id = parseInt(tagData.id, 10);
        this.tagsData = new Tags(appInstance, tagData);
        this.storeMode = storeMode;

        if(tagData.name || tagData.name === '') {
            this.name = tagData.name;
            this.slug = tagData.slug;
            this.description = tagData.description;
            this.additionalData = tagData.additionalData;
            this.prepareTagName();
        }
    }

    /*
     * Save tag
     */
    save() {
        if(this.name === '') {
            return {
                status: false,
                message: 'tag-empty-name'
            };
        }

        if(this.slug === '' || this.createSlug(this.slug) === '') {
            this.slug = this.createSlug(this.name);
        }

        if(!this.isTagNameUnique()) {
            return {
                status: false,
                message: 'tag-duplicate-name'
            };
        }

        if(this.isTagRestrictedSlug()) {
            return {
                status: false,
                message: 'tag-restricted-slug'
            };
        }

        if(!this.isTagSlugUnique()) {
            return {
                status: false,
                message: 'tag-duplicate-slug'
            };
        }

        if(this.id !== 0) {
            return this.updateTag();
        }

        return this.addTag();
    }

    /*
     * Add new tag
     */
    addTag() {
        let sqlQuery = this.db.prepare(`INSERT INTO tags VALUES(null, ?, ?, ?, ?)`);
        sqlQuery.run([
            this.name,
            this.createSlug(this.slug),
            this.description,
            JSON.stringify(this.additionalData)
        ]);

        return {
            status: true,
            message: 'tag-added',
            tags: this.tagsData.load()
        };
    }

    /*
     * Update existing tag
     */
    updateTag() {
        let sqlQuery = this.db.prepare(`UPDATE tags
                        SET
                            name = ?,
                            slug = ?,
                            description = ?,
                            additional_data = ?
                        WHERE
                            id = ?`);
        sqlQuery.run([
            this.name,
            this.createSlug(this.slug),
            this.description,
            JSON.stringify(this.additionalData),
            this.id
        ]);

        return {
            status: true,
            message: 'tag-updated',
            tags: this.tagsData.load()
        };
    }

    /*
     * Prepare tag name to save
     */
    prepareTagName() {
        if(typeof this.name == 'undefined') {
            this.name = '';
        }
        // Remove leading and ending spaces (trim it)
        // it will also exclude case when tag name contains only
        // whitespaces
        this.name = this.name.replace(/^\s+/, '').replace(/\s+$/, '');
    }

    /*
     * Check if the tag name is unique
     */
    isTagNameUnique() {
        let stmt = this.db.prepare('SELECT * FROM tags WHERE name LIKE @name AND id != @id');
        stmt.run({
            name: this.escape(this.name),
            id: this.id
        });

        for (const tag of stmt.iterate()) {
            if (tag.name === this.name) {
                return false;
            }
        }

        return true;
    }

    isTagSlugUnique() {
        let stmt = this.db.prepare('SELECT slug FROM tags WHERE id != @id');
        stmt.run({
            id: this.id
        });

        for (const tag of stmt.iterate()) {
            if (this.slug === tag.slug) {
                return false;
            }
        }

        return true;
    }

    /*
     * Check if the tag slug is not restricted
     */
    isTagRestrictedSlug() {
        let slug = this.createSlug(this.slug);

        if(this.application.sites[this.site].advanced.urls.tagsPrefix !== '') {
            return false;
        }

        let restrictedSlugs = [
            'amp',
            'assets',
            this.application.sites[this.site].advanced.urls.authorsPrefix,
            'media',
            this.application.sites[this.site].advanced.urls.pageName
        ];

        return restrictedSlugs.indexOf(slug) > -1;
    }

    /*
     * Delete tag
     */
    delete() {
        let tagsSqlQuery = `DELETE FROM tags WHERE id=${this.id}`;
        let postTagsSqlQuery = `DELETE FROM posts_tags WHERE tag_id=${this.id}`;
        this.db.run(tagsSqlQuery);
        this.db.run(postTagsSqlQuery);
        
        return {
            status: true,
            message: 'tag-deleted'
        };
    }

    /*
     * Create slug for given string
     */
    createSlug(string) {
        return slug(string);
    }
}

module.exports = Tag;
