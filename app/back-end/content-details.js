/*
 * Reads details of posts and pages which are not in the lists of the store - used by the plugins
 * via window.app.getContentElementsDetails. Read only - nothing is changed.
 *
 *   - featuredImage - file and alt, caption, credits of the featured image (saved with the featuredImage field of the content fields API)
 *   - excerpt - the excerpt as the renderer creates it: the text before the "read more" marker or the first words of the content
 *   - images - images used in the content, with their alt texts (see helpers/content-images.js)
 *
 * The content is converted to HTML by the same helpers as during rendering, so the results are the same
 * for all editors (WYSIWYG, Markdown and block editor).
 */

const path = require('path');
const { pathToFileURL } = require('url');
const stripTags = require('striptags');
const { decode } = require('html-entities');
const Model = require('./model.js');
const Themes = require('./themes.js');
const ContentHelper = require('./modules/render-html/helpers/content.js');
const { extractImages } = require('./helpers/content-images.js');

const ITEM_TYPES = ['post', 'page'];
const INCLUDE_VALUES = ['featuredImage', 'excerpt', 'images'];
// Used only when the theme config cannot be loaded - the default value of the Publii themes
const DEFAULT_EXCERPT_LENGTH = 30;
const READ_MORE_MARKER = /<hr\s+id=["']{1}read-more["']{1}[\s\S]*?\/?>/i;

class ContentDetailsError extends Error {
    constructor (code, message) {
        super(message);
        this.code = code;
    }
}

class ContentDetails extends Model {
    constructor (appInstance, data) {
        super(appInstance, data);
    }

    /**
     * @param {string} itemType - post or page
     * @param {object} options
     *   - include - details to read: featuredImage, excerpt, images (all by default)
     *   - ids - IDs of the items to read (all items of the type by default) - items are returned in the same order
     *
     * @returns {object} - { status: 'success', items: [{ itemID, editor, featuredImage, excerpt, images, errors }] }
     *                     or { status: 'error', errorCode, error }
     *                     errors of the item are returned only when something could not be read
     */
    read (itemType, options = {}) {
        try {
            let include = this.getInclude(options);
            let ids = this.getIDs(options);

            if (!ITEM_TYPES.includes(itemType)) {
                throw new ContentDetailsError('invalid-item-type', 'Invalid item type: ' + itemType);
            }

            if (!this.db) {
                throw new ContentDetailsError('db-unavailable', 'Database of the website is not available');
            }

            let rows = this.loadRows(itemType, include, ids);
            // The editor is always returned - it says how the plugin can read the content
            let coreData = this.loadCoreData(rows.map(row => row.id));
            let excerptLength = include.includes('excerpt') ? this.getExcerptLength() : null;
            let items;

            if (ids) {
                let rowsByID = new Map(rows.map(row => [row.id, row]));
                items = ids.map(id => rowsByID.has(id) ? this.readItem(rowsByID.get(id), include, coreData[id], excerptLength) : this.notFound(id));
            } else {
                items = rows.map(row => this.readItem(row, include, coreData[row.id], excerptLength));
            }

            return {
                status: 'success',
                items
            };
        } catch (e) {
            return this.errorResult(e);
        }
    }

    getInclude (options) {
        if (!options || typeof options.include === 'undefined') {
            return INCLUDE_VALUES.slice();
        }

        if (!Array.isArray(options.include)) {
            throw new ContentDetailsError('invalid-option', 'The include option must be an array');
        }

        // Unknown values are skipped - plugins can ask for details added in newer Publii versions
        return INCLUDE_VALUES.filter(value => options.include.includes(value));
    }

    getIDs (options) {
        if (!options || typeof options.ids === 'undefined' || options.ids === null) {
            return null;
        }

        if (!Array.isArray(options.ids) || options.ids.some(id => !Number.isInteger(Number(id)) || Number(id) <= 0)) {
            throw new ContentDetailsError('invalid-item-id', 'The ids option must be an array of item IDs');
        }

        return options.ids.map(Number);
    }

    loadRows (itemType, include, ids) {
        let needsText = include.includes('excerpt') || include.includes('images');
        let statusCondition = itemType === 'page' ? `p.status LIKE '%is-page%'` : `p.status NOT LIKE '%is-page%'`;
        let rows = this.db.prepare(`
            SELECT
                p.id AS id,
                ${needsText ? 'p.text' : `''`} AS text,
                pi.id AS imageID,
                pi.url AS imageFile,
                pi.additional_data AS imageData
            FROM
                posts AS p
            LEFT JOIN
                posts_images AS pi
                ON
                    pi.id = p.featured_image_id AND
                    pi.post_id = p.id
            WHERE
                ${statusCondition}
            ORDER BY
                p.id DESC
        `).all();

        if (ids) {
            let requested = new Set(ids);
            rows = rows.filter(row => requested.has(row.id));
        }

        return rows;
    }

    /*
     * The _core data stores the editor used for the content
     */
    loadCoreData (ids) {
        if (!ids.length) {
            return {};
        }

        let wanted = new Set(ids);
        let coreData = {};
        let rows = this.db.prepare(`SELECT post_id AS id, value FROM posts_additional_data WHERE key = '_core' ORDER BY id ASC`).all();

        for (let row of rows) {
            if (wanted.has(row.id) && !Object.prototype.hasOwnProperty.call(coreData, row.id)) {
                coreData[row.id] = row.value;
            }
        }

        return coreData;
    }

    readItem (row, include, coreValue, excerptLength) {
        let errors = [];
        let item = {
            itemID: row.id,
            editor: this.getEditor(coreValue, errors)
        };

        if (include.includes('featuredImage')) {
            item.featuredImage = this.getFeaturedImage(row, errors);
        }

        if (include.includes('excerpt') || include.includes('images')) {
            let html = this.getHtml(row, item.editor, errors);

            if (include.includes('excerpt')) {
                item.excerpt = html === null ? null : this.getExcerpt(html, excerptLength);
            }

            if (include.includes('images')) {
                item.images = html === null ? null : extractImages(html);
            }
        }

        if (errors.length) {
            item.errors = errors;
        }

        return item;
    }

    notFound (id) {
        return {
            itemID: id,
            errors: [{ errorCode: 'item-not-found', error: 'Item not found: ' + id, field: null }]
        };
    }

    /*
     * The same default as in the renderer - content without the editor info is the WYSIWYG content
     */
    getEditor (coreValue, errors) {
        if (!coreValue) {
            return 'tinymce';
        }

        try {
            let coreData = JSON.parse(coreValue);
            return coreData && typeof coreData.editor === 'string' && coreData.editor ? coreData.editor : 'tinymce';
        } catch (e) {
            errors.push({ errorCode: 'invalid-json-data', error: 'Stored data of the field _core is not a valid JSON', field: '_core' });
            return 'tinymce';
        }
    }

    getFeaturedImage (row, errors) {
        if (!row.imageID || !row.imageFile) {
            return null;
        }

        let data = {};

        if (row.imageData) {
            try {
                let parsed = JSON.parse(row.imageData);
                data = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
            } catch (e) {
                errors.push({ errorCode: 'invalid-json-data', error: 'Stored data of the featured image is not a valid JSON', field: 'featuredImage' });
                data = null;
            }
        }

        let text = key => data === null ? null : (typeof data[key] === 'string' ? data[key] : '');

        return {
            file: row.imageFile,
            url: pathToFileURL(path.join(this.getMediaDir(row.id), row.imageFile)).href,
            alt: text('alt'),
            caption: text('caption'),
            credits: text('credits')
        };
    }

    getMediaDir (itemID) {
        return path.join(this.siteDir, 'input', 'media', 'posts', String(itemID));
    }

    /*
     * Converts the content to HTML like ContentHelper.prepareContent - media paths point to the files on disk
     */
    getHtml (row, editor, errors) {
        let mediaURL = pathToFileURL(this.getMediaDir(row.id)).href + '/';
        let text = typeof row.text === 'string' ? row.text : '';

        try {
            let html = ContentHelper.parseText(text.split('#DOMAIN_NAME#').join(mediaURL), editor);

            if (typeof html !== 'string') {
                html = '';
            }

            // Content for AMP pages is not used anymore - the same as during rendering
            html = html.replace(/<publii-amp>[\s\S]*?<\/publii-amp>/gmi, '');
            html = html.replace(/<\/?publii-non-amp>/gmi, '');

            return html;
        } catch (e) {
            errors.push({ errorCode: 'invalid-content', error: 'Content cannot be read: ' + e.message, field: 'text' });
            return null;
        }
    }

    /*
     * The same excerpt as in the renderer, as plain text
     */
    getExcerpt (html, excerptLength) {
        let hasReadMore = READ_MORE_MARKER.test(html);
        let excerpt = ContentHelper.prepareExcerpt(excerptLength, html);
        let text = decode(stripTags(excerpt || '')).replace(/\s+/g, ' ').trim();

        return {
            text,
            source: hasReadMore ? 'read-more' : (text ? 'auto' : 'empty')
        };
    }

    /*
     * Excerpt length from the theme settings - loaded like in the renderer
     */
    getExcerptLength () {
        let siteConfig = this.application.sites ? this.application.sites[this.site] : null;
        let themeName = siteConfig && siteConfig.theme;

        if (!themeName) {
            return DEFAULT_EXCERPT_LENGTH;
        }

        try {
            let inputDir = path.join(this.siteDir, 'input');
            let themeConfig = Themes.loadThemeConfig(path.join(inputDir, 'config', 'theme.config.json'), path.join(inputDir, 'themes', themeName));

            if (!themeConfig || !Array.isArray(themeConfig.config)) {
                return DEFAULT_EXCERPT_LENGTH;
            }

            let option = themeConfig.config.find(configOption => configOption && configOption.name === 'excerptLength');
            return option ? option.value : undefined;
        } catch (e) {
            return DEFAULT_EXCERPT_LENGTH;
        }
    }

    errorResult (error) {
        if (error instanceof ContentDetailsError) {
            return {
                status: 'error',
                errorCode: error.code,
                error: error.message
            };
        }

        console.log('[ContentDetails] Unexpected error:', error && error.message);

        return {
            status: 'error',
            errorCode: 'unexpected-error',
            error: error && error.message ? error.message : 'Unexpected error'
        };
    }
}

module.exports = ContentDetails;
