// Necessary packages
const fs = require('fs');
const path = require('path');
const sizeOf = require('image-size');
const sqlString = require('sqlstring');
const normalizePath = require('normalize-path');
const slug = require('./../../../helpers/slug');
const RendererContext = require('../renderer-context.js');
const URLHelper = require('../helpers/url.js');
const ContentHelper = require('../helpers/content.js');

/**
 * Class used create context
 * for the single post theme previews
 */

class RendererContextPostPreview extends RendererContext {
    loadData() {
        // Prepare data
        this.postID = parseInt(this.renderer.postData.postID, 10);
        this.title = this.renderer.postData.title;
        this.postImage = this.renderer.postData.featuredImage;

        // Retrieve post tags
        if(this.renderer.postData.tags === '') {
            this.tags = false;
        } else {
            this.tags = this.renderer.postData.tags.split(',');
        }

        // Retrieve all tags
        this.allTags = this.getAllTags();

        // Retrieve menu data
        this.menus = this.getMenus();
    }

    prepareData() {
        let postURL = this.siteConfig.domain + '/preview.html';
        let preparedText = this.prepareContent(this.renderer.postData.text, this.renderer.postData.id);

        this.post = {
            id: this.renderer.postData.id,
            title: this.renderer.postData.title,
            author: this.renderer.cachedItems.authors[this.renderer.postData.author],
            url: postURL,
            text: preparedText.replace(/\<hr\s+id=["']{1}read-more["']{1}\s?\/?\>/gmi, ''),
            excerpt: ContentHelper.prepareExcerpt(this.themeConfig.config.excerptLength, preparedText),
            createdAt: this.renderer.postData.creationDate,
            modifiedAt: this.renderer.postData.modificationDate,
            status: this.renderer.postData.status,
            featuredImage: {},
            hasGallery: preparedText.indexOf('class="gallery') !== -1
        };

        if(this.postImage) {
            this.post.featuredImage = this.getPostFeaturedImages(this.post.id, true);
        }

        if(this.tags) {
            this.tags = this.tags.map(tag => {
                return {
                    id: 0,
                    name: tag,
                    slug: '',
                    description: 'It is an example description for the preview mode',
                    additionalData: '',
                    postsNumber: 0,
                    url: '#'
                };
            });

            this.tags.sort((tagA, tagB) => {
                if(tagA.name < tagB.name) {
                    return -1;
                }

                if(tagA.name > tagB.name) {
                    return 1;
                }

                return 0;
            });
        }

        this.metaTitle = 'It is an example value for the preview mode';
        this.metaDescription = 'It is an example value for the preview mode';
        this.metaRobots = 'It is an example value for the preview mode';

        this.post.tags = this.tags;

        // load related posts
        this.loadRelatedPosts();

        // load previous and next posts (only on the visible posts)
        if((this.themeConfig.renderer && !this.themeConfig.renderer.renderPrevNextPosts) || this.post.status.indexOf('hidden') > -1) {
            this.nextPost = false;
            this.previousPost = false;
        } else {
            if(this.renderer.postData.id !== 0) {
                this.loadPost('next', false);
            }

            this.loadPost('previous', false);
        }

        // load previous and next similar posts (only on the visible posts)
        if((this.themeConfig.renderer && !this.themeConfig.renderer.renderSimilarPosts) || this.post.status.indexOf('hidden') > -1) {
            this.nextSimilarPost = false;
            this.previousSimilarPost = false;
        } else {
            if(this.renderer.postData.id !== 0) {
                this.loadPost('next', true);
            }

            this.loadPost('previous', true);
        }
    }

    loadPost(type, similarPost = false) {
        let postType = similarPost ? type + 'SimilarPost' : type + 'Post';
        let operator = type === 'previous' ? '<=' : '>=';
        let postData = false;
        let temporaryPostsOrdering = this.postsOrdering;

        // For the next posts we have to reverse the results
        if(type === 'next') {
            if(temporaryPostsOrdering.indexOf('ASC') > -1) {
                temporaryPostsOrdering = temporaryPostsOrdering.replace('ASC', 'DESC');
            } else {
                temporaryPostsOrdering = temporaryPostsOrdering.replace('DESC', 'ASC');
            }
        }

        this.post.createdAt = parseInt(this.post.createdAt, 10);
        this.post.id = parseInt(this.post.id, 10);

        let tagsCondition = '';

        if(similarPost) {
            let tags = this.post.tags ? this.post.tags.map(tag => parseInt(tag.id, 10)) : [];

            if(tags.length) {
                tagsCondition = ' AND pt.tag_id IN(' + tags.join(',') + ') ';
            }

            // Retrieve post
            postData = this.db.exec(`
                SELECT
                    p.id AS id
                FROM
                    posts AS p
                LEFT JOIN
                    posts_tags AS pt
                    ON
                    p.id = pt.post_id
                WHERE
                    p.created_at ${operator} ${this.post.createdAt} AND
                    p.id != ${this.post.id} AND
                    p.status LIKE "%published%" AND
                    p.status NOT LIKE "%trashed%" AND
                    p.status NOT LIKE "%hidden%"
                    ${tagsCondition}
                GROUP BY
                    p.id
                ORDER BY
                    ${temporaryPostsOrdering}
                LIMIT 1
            `);
        } else {
            // Retrieve post
            postData = this.db.exec(`
                SELECT
                    id
                FROM
                    posts
                WHERE
                    created_at ${operator} ${this.post.createdAt} AND
                    id != ${this.post.id} AND
                    status LIKE "%published%" AND
                    status NOT LIKE "%trashed%" AND
                    status NOT LIKE "%hidden%"
                ORDER BY
                    ${temporaryPostsOrdering}
                LIMIT 1
            `);
        }

        postData = postData[0] ? postData[0].values[0] : false;

        if(!postData) {
            return false;
        }

        this[postType] = this.renderer.cachedItems.posts[postData[0]];
    }

    loadRelatedPosts() {
        if(this.themeConfig.renderer && (!this.themeConfig.renderer.renderRelatedPosts || this.themeConfig.renderer.relatedPostsNumber === 0)) {
            this.relatedPosts = [];
            return;
        }

        this.post.id = parseInt(this.post.id, 10);
        let tags = this.post.tags ? this.post.tags.map(tag => parseInt(tag.id, 10)) : [];
        let relatedPostsNumber = 5;
        let tagsCondition = '';
        let postTitleConditions = [];
        let conditions = [];

        if(this.themeConfig.renderer && this.themeConfig.renderer.relatedPostsNumber) {
            relatedPostsNumber = this.themeConfig.renderer.relatedPostsNumber;
        }

        // Get tags
        if(tags.length) {
            tagsCondition = ' pt.tag_id IN(' + tags.join(',') + ') ';
            conditions.push(tagsCondition);
        }

        // Get words to compare (with length bigger than 3 chars)
        let stringsToCompare = this.post.title.split(' ');
        stringsToCompare = stringsToCompare.filter(word => word.length > 3);

        if(stringsToCompare.length) {
            for (let toCompare of stringsToCompare) {
                postTitleConditions.push(' LOWER(p.title) LIKE LOWER("%' + sqlString.escape(toCompare).replace(/'/g, '').replace(/"/g, '') + '%") ')
            }

            postTitleConditions = '(' + postTitleConditions.join('OR') + ')';
            conditions.push(postTitleConditions);
        }

        if(conditions.length > 1) {
            conditions = conditions.join(' OR ');
            conditions = ' ( ' + conditions + ' ) ';
        }

        if(conditions.length) {
            conditions = ' AND ' + conditions;
        }

        // Retrieve post
        let postsData = this.db.exec(`
            SELECT
                p.id AS id
            FROM
                posts AS p
            LEFT JOIN
                posts_tags AS pt
                ON
                p.id = pt.post_id
            WHERE
                p.id != ${this.post.id} AND
                p.status LIKE "%published%" AND
                p.status NOT LIKE "%trashed%" AND
                p.status NOT LIKE "%hidden%"
                ${conditions}
            GROUP BY
                p.id
            LIMIT ${relatedPostsNumber}
        `);

        postsData = postsData[0] ? postsData[0].values : false;

        this.relatedPosts = [];

        if(!postsData) {
            return false;
        }

        for(let i = 0; i < postsData.length; i++) {
            this.relatedPosts[i] = this.renderer.cachedItems.posts[postsData[i][0]];
        }
    }

    setContext() {
        this.loadData();
        this.prepareData();

        let metaRobotsValue = this.metaRobots;

        if(this.siteConfig.advanced.noIndexThisPage) {
            metaRobotsValue = 'noindex,nofollow';
        }

        this.context = {
            title: this.metaTitle !== '' ? this.metaTitle : this.title,
            post: this.post,
            tags: this.allTags,
            metaTitleRaw: this.metaTitle,
            metaDescriptionRaw: this.metaDescription,
            metaRobotsRaw: metaRobotsValue,
            previousPost: this.previousPost,
            nextPost: this.nextPost,
            siteOwner: this.renderer.cachedItems.authors[1],
            menus: this.menus
        };
    }

    getContext(postID) {
        this.postID = postID;
        this.setContext();

        return this.context;
    }

    getPostFeaturedImages(postID, mainPost = false) {
        let postImage = false;

        // Retrieve post image
        if(mainPost === true) {
            postImage = [{
                values: [
                    [
                        0,
                        this.renderer.postData.featuredImageFilename,
                        JSON.stringify(this.renderer.postData.featuredImageData)
                    ]
                ]
            }];
        } else {
            postImage = this.db.exec(`
                SELECT
                    pi.id,
                    pi.url,
                    pi.additional_data
                FROM
                    posts as p
                LEFT JOIN
                    posts_images as pi
                    ON
                    p.featured_image_id = pi.id
                WHERE
                    p.id = ${postID}
                ORDER BY
                    pi.id DESC
                LIMIT 1
            `);
        }

        if (postImage[0]) {
            let url = '';
            let alt = '';
            let caption = '';
            let credits = '';
            let imageDimensions = false;

            if (postImage[0].values[0][2]) {
                let data = JSON.parse(postImage[0].values[0][2]);
                let postDirectory = postID;

                if(postDirectory === 0) {
                    postDirectory = 'temp';
                }

                let imagePath = URLHelper.createImageURL(this.inputDir, postDirectory, postImage[0].values[0][1]);
                let domain = this.siteConfig.domain;

                url = URLHelper.createImageURL(domain, postDirectory, postImage[0].values[0][1]);
                alt = data.alt;
                caption = data.caption;
                credits = data.credits;
                try {
                    imageDimensions = sizeOf(imagePath);
                } catch(e) {
                    console.log('post-preview.js: wrong image path - missing dimensions');
                    imageDimensions = false;
                }
            } else {
                return false;
            }

            let featuredImageSrcSet = false;
            let featuredImageSizes = false;

            if(!this.isGif(url)) {
                featuredImageSrcSet = ContentHelper.getFeaturedImageSrcset(url, this.themeConfig);
                featuredImageSizes = ContentHelper.getFeaturedImageSizes(this.themeConfig);
            } else {
                featuredImageSrcSet = '';
                featuredImageSizes = '';
            }

            let featuredImageData = {
                id: postImage[0].values[0][0],
                url: url,
                alt: alt,
                caption: caption,
                credits: credits,
                height: imageDimensions.height,
                width: imageDimensions.width,
                srcset: featuredImageSrcSet,
                sizes: featuredImageSizes
            };

            // Create alternative names for dimensions
            let dimensions = false;

            if (
                this.themeConfig.files &&
                this.themeConfig.files.responsiveImages
            ) {
                if (
                    this.themeConfig.files.responsiveImages.featuredImages &&
                    this.themeConfig.files.responsiveImages.featuredImages.dimensions
                ) {
                    dimensions = this.themeConfig.files.responsiveImages.featuredImages.dimensions;
                } else if (
                    this.themeConfig.files.responsiveImages.contentImages &&
                    this.themeConfig.files.responsiveImages.contentImages.dimensions
                ) {
                    dimensions = this.themeConfig.files.responsiveImages.featuredImages.dimensions;
                }

                if (dimensions) {
                    let dimensionNames = Object.keys(dimensions);

                    for (let dimensionName of dimensionNames) {
                        let base = path.parse(url).base;
                        let filename = path.parse(url).name;
                        let extension = path.parse(url).ext;
                        let newFilename = filename + '-' + dimensionName + extension;
                        let capitalizedDimensionName = dimensionName.charAt(0).toUpperCase() + dimensionName.slice(1);

                        if(!this.isGif(url)) {
                            featuredImageData['url' + capitalizedDimensionName] = url.replace(base, newFilename);
                        } else {
                            featuredImageData['url' + capitalizedDimensionName] = url;
                        }
                    }
                }
            }

            return featuredImageData;
        }

        return false;
    }

    prepareContent(originalText, postID) {
        let self = this;
        let domain = normalizePath(self.siteConfig.domain);
        domain = URLHelper.fixProtocols(domain);

        // Get media URL
        let postDirectory = postID;

        if(postDirectory === 0) {
            postDirectory = 'temp';
        }

        let domainMediaPath = domain + '/media/posts/' + postDirectory + '/';

        // Replace domain name constat with real URL to media directory
        let preparedText = originalText.split('#DOMAIN_NAME#').join(domainMediaPath);

        // Remove content for AMP or non-AMP depending from ampMode value
        preparedText = preparedText.replace(/<publii-amp>.*<\/publii-amp>/gmi, '');
        preparedText = preparedText.replace(/<publii-non-amp>/gmi, '');
        preparedText = preparedText.replace(/<\/publii-non-amp>/gmi, '');

        // Remove contenteditable attributes
        preparedText = preparedText.replace(/contentEditable="true"/gi, '');

        // Remove read more text
        preparedText = preparedText.replace(/\<hr\s+id=["']{1}read-more["']{1}\s?\/?\>/gmi, '');

        // Remove the last empty paragraph
        preparedText = preparedText.replace(/<p>&nbsp;<\/p>\s?$/gmi, '');

        // Find all images and add srcset and sizes attributes
        preparedText = preparedText.replace(/<img.*?src="(.*?)"/gmi, function(matches, url) {
            if(
                ContentHelper.getContentImageSrcset(url, self.themeConfig) !== false &&
                !(
                    url.toLowerCase().indexOf('.jpg') === -1 &&
                    url.toLowerCase().indexOf('.jpeg') === -1 &&
                    url.toLowerCase().indexOf('.png') === -1
                ) &&
                url.toLowerCase().indexOf('/gallery/') === -1
            ) {
                if(ContentHelper.getContentImageSizes(self.themeConfig)) {
                    return matches +
                        ' sizes="' + ContentHelper.getContentImageSizes(self.themeConfig) + '"' +
                        ' srcset="' + ContentHelper.getContentImageSrcset(url, self.themeConfig) + '" ';
                } else {
                    return matches +
                        ' srcset="' + ContentHelper.getContentImageSrcset(url, self.themeConfig) + '" ';
                }
            } else {
                return matches;
            }
        });

        return preparedText;
    }

    /**
     * Detects if image is a GIF
     */
    isGif(url) {
        if(url.slice(-4) === '.gif') {
            return true;
        }

        return false;
    }
}

module.exports = RendererContextPostPreview;
