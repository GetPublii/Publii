const Post = require('./items/post');
const Author = require('./items/author');
const Tag = require('./items/tag');
const FeaturedImage = require('./items/featured-image');
const PostViewSettingsHelper = require('./helpers/post-view-settings.js');

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
        let tags = this.db.exec(`
            SELECT
                t.id AS id,
                t.name AS name,
                t.slug AS slug,
                t.description AS description,
                t.additional_data AS additional_data
            FROM
                tags AS t
            ;
        `);
        console.timeEnd('TAGS - QUERY');

        console.time('TAGS - STORE');
        tags = tags[0] ? tags[0].values : [];
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

        if(this.themeConfig.renderer && !this.themeConfig.renderer.tagsIncludeFeaturedInPosts) {
            includeFeaturedPosts = 'AND p.status NOT LIKE "%featured%"';
        }

        let tagsPostCount = this.db.exec(`
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
        `);
        console.timeEnd('TAGS POST COUNT - QUERY');

        console.time('TAGS POST COUNT - STORE');
        tagsPostCount = tagsPostCount[0] ? tagsPostCount[0].values : [];

        for(let tagPostCount of tagsPostCount) {
            this.renderer.cachedItems.tagsPostCounts[tagPostCount[0]] = tagPostCount[1];
        }
        console.timeEnd('TAGS POST COUNT - STORE');
    }

    /**
     * Retrieves authors data
     */
    getAuthors() {
        console.time('AUTHORS - QUERY');
        let authors = this.db.exec(`
            SELECT
                id,
                name,
                username,
                config
            FROM
                authors;
        `);
        console.timeEnd('AUTHORS - QUERY');

        console.time('AUTHORS - STORE');
        authors = authors[0] ? authors[0].values : [];
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

        if(this.themeConfig.renderer && !this.themeConfig.renderer.authorsIncludeFeaturedInPosts) {
            includeFeaturedPosts = 'AND p.status NOT LIKE "%featured%"';
        }

        let authorPostCounts = this.db.exec(`
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
        `);
        console.timeEnd('AUTHORS POST COUNT - QUERY');

        console.time('AUTHORS POST COUNT - STORE');
        authorPostCounts = authorPostCounts[0] ? authorPostCounts[0].values : [];

        for(let count of authorPostCounts) {
            this.renderer.cachedItems.authorsPostCounts[count[0]] = count[1];
        }
        console.timeEnd('AUTHORS POST COUNT - STORE');
    }

    /**
     * Retrieves featured images data
     */
    getFeaturedImages() {
        console.time('FEATURED IMAGES - QUERY');
        let featuredImages = this.db.exec(`
            SELECT
                pi.id,
                pi.post_id,
                pi.url,
                pi.additional_data
            FROM
                posts as p
            LEFT JOIN
                posts_images as pi
                ON
                p.featured_image_id = pi.id
            ORDER BY
                pi.id DESC
        `);
        console.timeEnd('FEATURED IMAGES - QUERY');

        console.time('FEATURED IMAGES - STORE');
        featuredImages = featuredImages[0] ? featuredImages[0].values : [];
        featuredImages.map(image => new FeaturedImage(image, this.renderer));
        console.timeEnd('FEATURED IMAGES - STORE');
    }

    /**
     * Retrieves post-tags relations
     */
    getPostTags() {
        console.time('POST TAGS - QUERY');
        // Retrieve post tags
        let postTags = this.db.exec(`
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
        `);
        console.timeEnd('POST TAGS - QUERY');

        console.time('POST TAGS - STORE');
        postTags = postTags[0] ? postTags[0].values : [];

        for(let postTag of postTags) {
            if(this.renderer.cachedItems.postTags[postTag[0]]) {
                this.renderer.cachedItems.postTags[postTag[0]].push(postTag[1]);
            } else {
                this.renderer.cachedItems.postTags[postTag[0]] = [postTag[1]];
            }
        }

        console.timeEnd('POST TAGS - STORE');
    }

    /**
     * Retrieves posts data
     */
    getPosts() {
        console.time('POSTS - QUERY');
        let posts = this.db.exec(`
            SELECT
                *
            FROM
                posts
            WHERE
                status NOT LIKE "%trashed%"
            ORDER BY
                id ASC;
        `);
        console.timeEnd('POSTS - QUERY');

        console.time('POSTS - STORE');
        posts = posts[0] ? posts[0].values : [];
        let postViewConfigObject = JSON.parse(JSON.stringify(this.themeConfig.postConfig));

        posts = posts.map(post => {
            let postViewConfig = this.getPostViewSettings(postViewConfigObject, post[0]);
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
        let postViewSettings = false;
        let outputConfig = {};

        postViewData = this.db.exec(`
            SELECT
                value
            FROM
                posts_additional_data
            WHERE
                post_id = ${postID}
                AND
                key = "postViewSettings"
        `);

        postViewSettings = postViewData[0] ? JSON.parse(postViewData[0].values[0]) : {};

        return PostViewSettingsHelper.override(postViewSettings, defaultPostViewConfig);
    }
}

module.exports = RendererCache;
