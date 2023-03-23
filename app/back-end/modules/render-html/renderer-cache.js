const Post = require('./items/post');
const Author = require('./items/author');
const Tag = require('./items/tag');
const FeaturedImage = require('./items/featured-image');
const ViewSettingsHelper = require('./helpers/view-settings.js');
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
        // Set tag-related items
        this.getFeaturedTagImages();
        // We need tag posts count before storing tags
        this.getTagPostCounts();
        this.getTags();
        // Set author-related items
        this.getFeaturedAuthorImages();
        // We need author posts count before storing tags
        this.getAuthorPostCounts();
        this.getAuthors();
        // Set post-related items
        this.getFeaturedPostImages();
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
        let tagViewConfigObject = JSON.parse(JSON.stringify(this.themeConfig.tagConfig));
        
        tags = tags.map(tag => {
            let tagViewConfig = this.getViewSettings(tagViewConfigObject, tag);
            let newTag = new Tag(tag, this.renderer);
            newTag.setTagViewConfig(tagViewConfig);
            return newTag;
        });

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
            includeFeaturedPosts = 'AND p.status NOT LIKE \'%featured%\'';
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
                p.status LIKE '%published%' AND
                p.status NOT LIKE '%hidden%' AND
                p.status NOT LIKE '%trashed%'
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
     * Retrieves authors featured images data
     */
    getFeaturedAuthorImages() {
        console.time('FEATURED AUTHOR IMAGES - QUERY');
        let authorsData = this.db.prepare(`
            SELECT
                a.id AS item_id,
                a.additional_data AS additional_data
            FROM
                authors as a
            ORDER BY
                a.id DESC
        `).all();
        console.timeEnd('FEATURED AUTHOR IMAGES - QUERY');

        console.time('FEATURED AUTHOR IMAGES - STORE');
        for (let i = 0; i < authorsData.length; i++) {
            let additionalData = false;
            
            if (authorsData[i].additional_data) {
                additionalData = JSON.parse(authorsData[i].additional_data);
            }

            if (additionalData && additionalData.featuredImage) {
                new FeaturedImage({
                    id: 0,
                    item_id: authorsData[i].item_id,
                    url: additionalData.featuredImage,
                    additional_data: JSON.stringify({
                        alt: additionalData.featuredImageAlt,
                        caption: additionalData.featuredImageCaption,
                        credits: additionalData.featuredImageCredits
                    })
                }, this.renderer, 'authorImages');
            }
        }
        console.timeEnd('FEATURED AUTHOR IMAGES - STORE');
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
                config,
                additional_data
            FROM
                authors;
        `).all();
        console.timeEnd('AUTHORS - QUERY');

        console.time('AUTHORS - STORE');
        // Data are automatically stored in the this.renderer.cachedItems
        let authorViewConfigObject = JSON.parse(JSON.stringify(this.themeConfig.authorConfig));
        
        authors = authors.map(author => {
            let authorViewConfig = this.getViewSettings(authorViewConfigObject, author);
            let newAuthor = new Author(author, this.renderer);
            newAuthor.setAuthorViewConfig(authorViewConfig);
            return newAuthor;
        });

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
            includeFeaturedPosts = 'AND p.status NOT LIKE \'%featured%\'';
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
                p.status LIKE '%published%' AND
                p.status NOT LIKE '%hidden%' AND
                p.status NOT LIKE '%trashed%'
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
    getFeaturedPostImages() {
        console.time('FEATURED POST IMAGES - QUERY');
        let featuredImages = this.db.prepare(`
            SELECT
                pi.id AS id,
                pi.post_id AS item_id,
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
        console.timeEnd('FEATURED POST IMAGES - QUERY');

        console.time('FEATURED POST IMAGES - STORE');
        featuredImages.map(image => new FeaturedImage(image, this.renderer, 'featuredImages'));
        console.timeEnd('FEATURED POST IMAGES - STORE');
    }

    /**
     * Retrieves tags featured images data
     */
    getFeaturedTagImages() {
        console.time('FEATURED TAG IMAGES - QUERY');
        let tagsData = this.db.prepare(`
            SELECT
                t.id AS item_id,
                t.additional_data AS additional_data
            FROM
                tags as t
            ORDER BY
                t.id DESC
        `).all();
        console.timeEnd('FEATURED TAG IMAGES - QUERY');

        console.time('FEATURED TAG IMAGES - STORE');
        for (let i = 0; i < tagsData.length; i++) {
            let additionalData = false;
            
            if (tagsData[i].additional_data) {
                additionalData = JSON.parse(tagsData[i].additional_data);
            }

            if (additionalData && additionalData.featuredImage) {
                new FeaturedImage({
                    id: 0,
                    item_id: tagsData[i].item_id,
                    url: additionalData.featuredImage,
                    additional_data: JSON.stringify({
                        alt: additionalData.featuredImageAlt,
                        caption: additionalData.featuredImageCaption,
                        credits: additionalData.featuredImageCredits
                    })
                }, this.renderer, 'tagImages');
            }
        }
        console.timeEnd('FEATURED TAG IMAGES - STORE');
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
                status NOT LIKE '%trashed%' AND
                status NOT LIKE '%draft%'
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
                key = 'postViewSettings'
        `).get({
            id: postID
        });

        if (postViewData && postViewData.value) {
            postViewSettings = JSON.parse(postViewData.value);
        }

        return ViewSettingsHelper.override(postViewSettings, defaultPostViewConfig);
    }

    /**
     * Retrieve view settings
     *
     * @param defaultViewConfig
     * @param itemData
     *
     * @returns {object}
     */
    getViewSettings(defaultViewConfig, itemData) {
        let viewSettings = {};

        if (itemData && itemData.additional_data) {
            try {
                let dataToUse = JSON.parse(itemData.additional_data); 
                
                if (dataToUse.viewConfig) {
                    viewSettings = dataToUse.viewConfig;
                }
            } catch (e) {
                viewSettings = {};
            }
        }

        return ViewSettingsHelper.override(viewSettings, defaultViewConfig);
    }
}

module.exports = RendererCache;
