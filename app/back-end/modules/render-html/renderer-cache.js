const Post = require('./items/post');
const Author = require('./items/author');
const Tag = require('./items/tag');
const FeaturedImage = require('./items/featured-image');
const PostViewSettingsHelper = require('./helpers/post-view-settings.js');
const RendererHelpers = require('./helpers/helpers.js');

class RendererCache {
    /**
     * Constructor of the instance
     *
     * @param rendererInstance
     */
    constructor(rendererInstance, themeConfig) {
        this.renderer = rendererInstance;
        this.db = this.renderer.db;
        this.themeConfig = themeConfig;
    }

    /**
     * Generate cache for all necessary items
     */
    create() {
        // We need tag posts count before storing tags
        this.getTagPostCounts();
        this.getTags();
        // We need author posts count before storing tags
        this.getAuthorPostCounts();
        this.getAuthors();
        // Set post-related items
        this.getFeaturedImages();
        this.getPostTags();
        // At the end we get posts as it uses other cached items
        this.getPosts();
    }

    /**
     * Retrieves tags data
     */
    getTags() {
        console.time('TAGS - QUERY');
        let tags = this.db.prepare(`
            SELECT
                t.id AS id,
                t.name AS name,
                t.slug AS slug,
                t.description AS description,
                t.additional_data AS additional_data
            FROM
                tags AS t
            ;
        `).all();
        console.timeEnd('TAGS - QUERY');

        console.time('TAGS - STORE');
        // Data are automatically stored in the this.renderer.cachedItems
        tags.map(tag => new Tag(tag, this.renderer));
        console.timeEnd('TAGS - STORE');
    }

    /**
     *  Retrieves post counts for all tags
     */
    getTagPostCounts() {
        console.time('TAGS POST COUNT - QUERY');
        let includeFeaturedPosts = '';
        let shouldSkipFeaturedPosts = RendererHelpers.getRendererOptionValue('tagsIncludeFeaturedInPosts', this.themeConfig) === false;

        if (shouldSkipFeaturedPosts) {
            includeFeaturedPosts = 'AND p.status NOT LIKE "%featured%"';
        }

        let tagsPostCount = this.db.prepare(`
            SELECT
                pt.tag_id AS id,
                COUNT(p.id) AS count
            FROM
                posts AS p
            LEFT JOIN
                posts_tags AS pt
            ON
                p.id = pt.post_id
            WHERE
                p.status LIKE "%published%" AND
                p.status NOT LIKE "%hidden%" AND
                p.status NOT LIKE "%trashed%"
                ${includeFeaturedPosts}
            GROUP BY
                pt.tag_id;
        `).all();
        console.timeEnd('TAGS POST COUNT - QUERY');

        console.time('TAGS POST COUNT - STORE');
        for(let tagPostCount of tagsPostCount) {
            this.renderer.cachedItems.tagsPostCounts[tagPostCount.id] = tagPostCount.count;
        }
        console.timeEnd('TAGS POST COUNT - STORE');
    }

    /**
     * Retrieves authors data
     */
    getAuthors() {
        console.time('AUTHORS - QUERY');
        let authors = this.db.prepare(`
            SELECT
                id,
                name,
                username,
                config
            FROM
                authors;
        `).all();
        console.timeEnd('AUTHORS - QUERY');

        console.time('AUTHORS - STORE');
        // Data are automatically stored in the this.renderer.cachedItems
        authors.map(author => new Author(author, this.renderer));
        console.timeEnd('AUTHORS - STORE');
    }

    /**
     *  Retrieves post counts for all authors
     */
    getAuthorPostCounts() {
        console.time('AUTHORS POST COUNT - QUERY');
        let includeFeaturedPosts = '';
        let shouldSkipFeaturedPosts = RendererHelpers.getRendererOptionValue('authorsIncludeFeaturedInPosts', this.themeConfig) === false;

        if (shouldSkipFeaturedPosts) {
            includeFeaturedPosts = 'AND p.status NOT LIKE "%featured%"';
        }

        let authorPostCounts = this.db.prepare(`
            SELECT
                a.id AS id,
                COUNT(p.id) AS count
            FROM
                posts AS p
            LEFT JOIN
                authors AS a
                ON
                p.authors = a.id
            WHERE
                p.status LIKE "%published%" AND
                p.status NOT LIKE "%hidden%" AND
                p.status NOT LIKE "%trashed%"
                ${includeFeaturedPosts}
            GROUP BY
                a.id
        `).all();
        console.timeEnd('AUTHORS POST COUNT - QUERY');

        console.time('AUTHORS POST COUNT - STORE');
        for(let countData of authorPostCounts) {
            this.renderer.cachedItems.authorsPostCounts[countData.id] = countData.count;
        }
        console.timeEnd('AUTHORS POST COUNT - STORE');
    }

    /**
     * Retrieves featured images data
     */
    getFeaturedImages() {
        console.time('FEATURED IMAGES - QUERY');
        let featuredImages = this.db.prepare(`
            SELECT
                pi.id AS id,
                pi.post_id AS post_id,
                pi.url AS url,
                pi.additional_data AS additional_data
            FROM
                posts as p
            LEFT JOIN
                posts_images as pi
                ON
                p.featured_image_id = pi.id
            ORDER BY
                pi.id DESC
        `).all();
        console.timeEnd('FEATURED IMAGES - QUERY');

        console.time('FEATURED IMAGES - STORE');
        featuredImages.map(image => new FeaturedImage(image, this.renderer));
        console.timeEnd('FEATURED IMAGES - STORE');
    }

    /**
     * Retrieves post-tags relations
     */
    getPostTags() {
        console.time('POST TAGS - QUERY');
        // Retrieve post tags
        let postTags = this.db.prepare(`
            SELECT
                pt.post_id AS postID,
                t.id AS tagID
            FROM
                posts_tags AS pt
            LEFT JOIN
                tags AS t
            ON
                t.id = pt.tag_id
            ORDER BY
                t.id ASC
        `).all();
        console.timeEnd('POST TAGS - QUERY');

        console.time('POST TAGS - STORE');
        for(let postTag of postTags) {
            if(this.renderer.cachedItems.postTags[postTag.postID]) {
                this.renderer.cachedItems.postTags[postTag.postID].push(postTag.tagID);
            } else {
                this.renderer.cachedItems.postTags[postTag.postID] = [postTag.tagID];
            }
        }

        console.timeEnd('POST TAGS - STORE');
    }

    /**
     * Retrieves posts data
     */
    getPosts() {
        console.time('POSTS - QUERY');
        let posts = this.db.prepare(`
            SELECT
                *
            FROM
                posts
            WHERE
                status NOT LIKE "%trashed%" AND
                status NOT LIKE "%draft%"
            ORDER BY
                id ASC;
        `).all();
        console.timeEnd('POSTS - QUERY');

        console.time('POSTS - STORE');
        let postViewConfigObject = JSON.parse(JSON.stringify(this.themeConfig.postConfig));
        
        posts = posts.map(post => {
            let postViewConfig = this.getPostViewSettings(postViewConfigObject, post.id);
            let newPost = new Post(post, this.renderer);
            newPost.setPostViewConfig(postViewConfig);
            return newPost;
        });

        posts.map(post => {
            post.setInternalLinks();
        });
        console.timeEnd('POSTS - STORE');
    }

    /**
     * Retrieve post view settings
     *
     * @param defaultPostViewConfig
     * @param postID
     *
     * @returns {object}
     */
    getPostViewSettings(defaultPostViewConfig, postID) {
        let postViewData = false;
        let postViewSettings = {};

        postViewData = this.db.prepare(`
            SELECT
                value
            FROM
                posts_additional_data
            WHERE
                post_id = @id
                AND
                key = "postViewSettings"
        `).get({
            id: postID
        });

        if (postViewData && postViewData.value) {
            postViewSettings = JSON.parse(postViewData.value);
        }

        return PostViewSettingsHelper.override(postViewSettings, defaultPostViewConfig);
    }
}

module.exports = RendererCache;
