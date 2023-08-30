const fs = require('fs');
const url = require('url');
const path = require('path');
const moment = require('moment');
const { XMLParser } = require('fast-xml-parser');
const download = require('image-downloader');
const automaticParagraphs = require('./automatic-paragraphs.js');
const slug = require('./../../helpers/slug');
const Author = require('./../../author.js');
const Tag = require('./../../tag.js');
const Post = require('./../../post.js');
const Utils = require('./../../helpers/utils.js');

/**
 * Class used to parse WXR files
 */
class WxrParser {
    /**
     * Create an instance
     *
     * @param appInstance
     * @param siteName
     */
    constructor(appInstance, siteName) {
        this.appInstance = appInstance;
        this.siteName = siteName;
        this.importAuthors = false;
        this.autop = false;
        this.usedTaxonomy = 'tags';
        this.postTypes = [];
        this.temp = {
            authors: [],
            posts: [],
            tags: [],
            images: [],
            mapping: {
                authors: [],
                tags: [],
                images: [],
                posts: []
            },
            imagesQueue: {}
        };

        // Allow download.image to be replaced in tests.
        this._downloadImage = download.image;

        // Allow tests to override the per-image delay.
        this.delayBetweenImages = 250;
    }

    /**
     * Load WXR file and parse it
     *
     * @param filePath
     */
    loadFile(filePath) {
        this.filePath = filePath;
        this.fileContent = fs.readFileSync(this.filePath, 'utf8');
        this.fileContent = this.fileContent.trim();
        this.parseFile();
    }

    /**
     * Check if loaded WXR file is a WXR file
     *
     * @returns {boolean}
     */
    isWXR() {
        if(path.parse(this.filePath).ext !== '.xml') {
            return false;
        }

        if(
            this.fileContent.indexOf('<!-- generator="WordPress') === -1 &&
            this.fileContent.indexOf('<wp:wxr_version>') === -1
        ) {
            return false;
        }

        return true;
    }

    /**
     * Transform XML to JSON
     *
     * @returns {boolean}
     */
    parseFile() {
        let results = false;
        try {
            let xmlParser = new XMLParser({
                ignoreAttributes: false,
                attributeNamePrefix : "@_",
                isArray: (name, jpath, isLeafNode, isAttribute) => {
                    // We always want an array of items.
                    if(jpath == 'rss.channel.item') return true;
                }
            });
            results = xmlParser.parse(this.fileContent);
        } catch(e) {
            console.log('An error occurred:', e);
            return false;
        }

        this.parsedContent = results;

        return true;
    }

    /**
     * Analyzes WXR content and returns its stats
     *
     * @returns {{authors: number, categories: number, tags: number, images: number, posts: number}}
     */
    getWxrStats() {
        let authors = this.parsedContent.rss.channel['wp:author'];
        let categories = this.parsedContent.rss.channel['wp:category'];
        let tags = this.parsedContent.rss.channel['wp:tag'];
        let items = this.parsedContent.rss.channel['item'];
        let postTypes = this.getPostTypes(items);

        let stats = {
            authors: this.getItemsCount(authors),
            categories: this.getItemsCount(categories),
            tags: this.getItemsCount(tags),
            types: {
                image: this.getItemsCount(items, 'attachment'),
                post: this.getItemsCount(items, 'post'),
                page: this.getItemsCount(items, 'page')
            }
        };

        for(let postType of postTypes) {
            stats.types[postType] = this.getItemsCount(items, postType);
        }

        return stats;
    }

    /**
     * Return number of items of given type
     *
     * @param items
     * @param filterType
     * @returns {number}
     */
    getItemsCount(items, filterType = false) {
        if(filterType) {
            items = items.filter(item => item['wp:post_type'] === filterType);
        }

        if(items && items.length) {
            return items.length;
        }

        if(items) {
            return 1;
        }

        return 0;
    }

    /**
     * Detects post types (without default post types)
     *
     * @param items
     * @returns {Array}
     */
    getPostTypes(items) {
        let skippedTypes = ['post', 'page', 'attachment', 'nav_menu_item'];
        let foundedTypes = [];

        for(let item of items) {
            if(skippedTypes.indexOf(item['wp:post_type']) !== -1) {
                continue;
            }

            if(foundedTypes.indexOf(item['wp:post_type']) !== -1) {
                continue;
            }

            foundedTypes.push(item['wp:post_type']);
        }

        return foundedTypes;
    }

    /**
     * Set configuration of parser and importer
     *
     * @param authors
     * @param taxonomy
     * @param autop
     * @param postTypes
     */
    setConfig(authors, taxonomy, autop, postTypes) {
        this.importAuthors = false;
        this.usedTaxonomy = taxonomy;
        this.autop = autop;
        this.postTypes = postTypes;

        console.log('(i) CONFIG:');
        console.log('- Import authors: ' + this.importAuthors);
        console.log('- Used taxonomy: ' + this.usedTaxonomy);
        console.log('- Use autop: '+ this.autop + "\n\n");
        console.log('- Post types: '+ this.postTypes.toString() + "\n\n");

        if(authors === 'wp-authors') {
            this.importAuthors = true;
        }
    }

    /**
     * Import authors related data
     */
    importAuthorsData() {
        // If authors import is disabled - skip authors import
        if(!this.importAuthors) {
            return;
        }

        // get all authors items
        let authors = this.parsedContent.rss.channel['wp:author'];

        if(!authors.length) {
            this.createAuthor(authors, 0, 1);
            return;
        }

        for(let i = 0; i < authors.length; i++) {
            this.createAuthor(authors[i], i, authors.length);
        }
    }

    /**
     * Creates an author
     *
     * @param authorData
     * @param index
     * @param totalNumber
     */
    createAuthor(authorData, index, totalNumber) {
        let authorUsername = slug(authorData['wp:author_login']);
        // For each author item insert author object
        let newAuthor = new Author(this.appInstance, {
            id: 0,
            site: this.siteName,
            name: authorData['wp:author_display_name'],
            username: authorUsername,
            config: JSON.stringify({
                email: authorData['wp:author_email'],
                avatar: '',
                useGravatar: false,
                description: '',
                metaTitle: '',
                metaDescription: '',
                template: ''
            }),
            additionalData: ''
        }, false);

        let newAuthorResult = newAuthor.save();
        let authors = newAuthorResult.authors;
        let newAuthorResultFiltered = authors.filter(author => author.username === authorUsername);

        // Store tag ID in the internal array AS:
        // wp:tag_slug -> tag ID in Publii
        this.temp.authors[authorUsername] = newAuthorResultFiltered[0].id;
        this.temp.mapping.authors[authorData['wp:author_id']] = newAuthorResultFiltered[0].id;

        process.send({
            type: 'progress',
            message: {
                translation: 'core.wpImport.authorsProgressInfo',
                translationVars: {
                    progress: (index + 1),
                    total: totalNumber
                }
            }
        });

        console.log('-> Imported author (' + (index + 1) + ' / ' + totalNumber + '): ' + authorUsername);
    }

    /**
     * Import tags related data
     */
    importTagsData() {
        let items = false;

        if(this.usedTaxonomy === 'tags') {
            items = this.parsedContent.rss.channel['wp:tag'];
        } else {
            items = this.parsedContent.rss.channel['wp:category'];
        }

        if(items && !items.length) {
            return;
        }

        if(items && items.length) {
            for (let i = 0; i < items.length; i++) {
                this.createTag(items[i], i, items.length);
            }
        }
    }

    /**
     * Creates tag
     *
     * @param tagData
     * @param index
     * @param totalNumber
     */
    createTag(tagData, index, totalNumber) {
        let itemName = '';
        let itemSlug = '';

        if(this.usedTaxonomy === 'tags') {
            itemName = (tagData['wp:tag_name']).toString();
            itemSlug = (tagData['wp:tag_slug']).toString();
        } else {
            itemName = (tagData['wp:cat_name']).toString();
            itemSlug = (tagData['wp:category_nicename']).toString();
        }

        // For each author item insert author object
        let newItem = new Tag(this.appInstance, {
            id: 0,
            site: this.siteName,
            name: itemName,
            slug: itemSlug,
            description: '',
            additionalData: ''
        }, false);

        let newItemResult = newItem.save();

        if(!newItemResult.tags) {
            itemSlug += '-2';

            newItem = new Tag(this.appInstance, {
                id: 0,
                site: this.siteName,
                name: itemName,
                slug: itemSlug,
                description: '',
                additionalData: ''
            });

            newItemResult = newItem.save();

            if(!newItemResult.tags) {
                return;
            }
        }

        let newItemResultFiltered = newItemResult.tags.filter(tag => tag.slug === slug(itemSlug));
        this.temp.tags[itemSlug] = newItemResultFiltered[0].id;
        this.temp.mapping.tags[tagData['wp:term_id']] = newItemResultFiltered[0].id;

        process.send({
            type: 'progress',
            message: {
                translation: 'core.wpImport.tagsProgressInfo',
                translationVars: {
                    progress: (index + 1),
                    total: totalNumber
                }
            }
        });

        console.log('-> Imported tag (' + (index + 1) + ' / ' + totalNumber + '): ' + itemName);
    }

    /**
     * Import posts data
     */
    importPostsData() {
        let posts = this.parsedContent.rss.channel['item'];
        let newPost;

        if(!posts) {
            return;
        }

        posts = posts.filter(item => this.postTypes.indexOf(item['wp:post_type']) !== -1);

        let untitledPostsCount = 1;

        for(let i = 0; i < posts.length; i++) {
            if (!posts[i].title) {
                console.log('(!) Empty post title detected - fallback to "Untitled #X" title');
                posts[i].title = 'Untitled #' + untitledPostsCount++;
            }

            // For each post item insert post object
            let postImages = this.getPostImages(posts[i]['content:encoded']);
            let postSlug = slug(posts[i].title);
            let postAuthor = this.temp.authors[slug(posts[i]['dc:creator'])];
            let postText = this.preparePostText(posts[i]['content:encoded'], postImages);
            let postStatus = posts[i]['wp:status'] === 'draft' ? 'draft' : 'published'
            let postTags = '';
            let postTitle = (posts[i].title).toString();

            if(posts[i]['category'] && (posts[i]['category'].length || posts[i]['category'] instanceof Object)) {
                let tags = false;

                if (!posts[i]['category'].length || typeof posts[i]['category'] === 'string') {
                    posts[i]['category'] = [posts[i]['category']];
                }

                if(this.usedTaxonomy === 'tags') {
                    tags = posts[i]['category'].filter(item => item['@_domain'] === 'post_tag');
                } else {
                    tags = posts[i]['category'].filter(item => item['@_domain'] === 'category');
                }

                postTags = [...new Set(tags.map(tag => tag['#text']))];
            }

            if(!this.importAuthors) {
                postAuthor = '1';
            }

            newPost = new Post(this.appInstance, {
                id: 0,
                site: this.siteName,
                title: postTitle,
                slug: postSlug,
                author: postAuthor,
                status: postStatus,
                tags: postTags,
                text: postText,
                creationDate: moment(posts[i]['wp:post_date']).format('x'),
                modificationDate: moment().format('x'),
                template: '',
                additionalData: '',
                postViewSettings: ''
            }, false);

            let newPostResult = newPost.save();
            let newPostID = newPostResult.postID;

            this.temp.posts[postSlug] = newPostID;
            this.temp.mapping.posts[posts[i]['wp:post_id']] = newPostID;

            // Create queue for download images
            if(postImages.length) {
                this.temp.imagesQueue[newPostID] = postImages;
            }

            let featuredImage = this.getFeaturedPostImage(posts[i]);
            let fileName = false;

            if(featuredImage) {
                fileName = path.parse(featuredImage).base;

                if(!this.temp.imagesQueue[newPostID]) {
                    this.temp.imagesQueue[newPostID] = [];
                }

                this.temp.imagesQueue[newPostID].push(featuredImage);
            }

            if(fileName) {
                let featuredPostImageSqlQuery = newPost.db.prepare(`INSERT INTO posts_images VALUES(NULL, @newPostID, @fileName, '', '', @config)`);
                featuredPostImageSqlQuery.run({
                    newPostID: newPostID,
                    fileName: fileName,
                    config: '{"alt":"","caption":"","credits":""}'
                });

                let featuredPostID = newPost.db.prepare('SELECT last_insert_rowid() AS id').get().id;
                let featuredPostIdUpdate = newPost.db.prepare(`UPDATE posts SET featured_image_id = @featuredPostID WHERE id = @newPostID`);

                featuredPostIdUpdate.run({
                    featuredPostID,
                    newPostID
                });
            }

            process.send({
                type: 'progress',
                message: {
                    translation: 'core.wpImport.postsProgressInfo',
                    translationVars: {
                        progress: (i + 1),
                        total: posts.length
                    }
                }
            });

            console.log('-> Imported post (' + (i+1) + ' / ' + posts.length + '): ' + postTitle);
        }
    }

    /**
     * Create array with all available images for download
     */
    getImageURLs() {
        let items = this.parsedContent.rss.channel['item'];
        items = items.filter(item => item['wp:post_type'] === 'attachment');

        for(let item of items) {
            this.temp.images[item['wp:post_id']] = item['wp:attachment_url'];
        }
    }

    /**
     * Retrieve images connected with a given post text
     *
     * @param postText
     */
    getPostImages(postText) {
        let postImages = [];
        let regex = /<img.*?src="(.*?)"/g;
        let regexResult = null;

        // Get images from the content
        do {
            regexResult = regex.exec(postText);

            if(regexResult !== null) {
                let postImage = regexResult[1];
                postImages.push(postImage);
            }
        } while(regexResult);

        return postImages;
    }

    /**
     * Retrieve featured post image
     *
     * @param postObject
     * @returns {boolean}
     */
    getFeaturedPostImage(postObject) {
        let featuredImage = false;

        if(!postObject['wp:postmeta'] || !postObject['wp:postmeta'].length) {
            return;
        }

        // Get featured image
        for(let postMeta of postObject['wp:postmeta']) {
            if(postMeta['wp:meta_key'] === '_thumbnail_id') {
                let featuredImageID = postMeta['wp:meta_value'];

                if(this.temp.images[featuredImageID]) {
                    featuredImage = this.temp.images[featuredImageID];
                }
            }
        }

        return featuredImage;
    }

    /**
     * Import images data
     */
    importImages() {
        let postIDs = Object.keys(this.temp.imagesQueue);
        let imagesQueue = [];
        let destinationPath = path.join(
            this.appInstance.sitesDir,
            this.siteName,
            'input',
            'media',
            'posts'
        );
        this.downloadImagesProgress = 0;
        this.totalImages = this.countImages();

        for(let i = 0; i < postIDs.length; i++) {
            let imagesForPost = this.temp.imagesQueue[postIDs[i]];
            imagesForPost = [...new Set(imagesForPost)];

            for(let j = 0; j < imagesForPost.length; j++) {
                let img = imagesForPost[j];
                imagesQueue.push({
                    postID: postIDs[i],
                    imgUrl: img
                });
            }
        }

        this.downloadImages(imagesQueue, destinationPath);
    }

    /**
     * Downloads images from queue
     *
     * @param imagesQueue
     * @param destinationPath
     */
    downloadImages(imagesQueue, destinationPath) {
        if(imagesQueue.length === 0) {
            this.finishImport();
            return;
        }

        let nextImg = imagesQueue.shift();
        let dirPath = path.join(destinationPath, (nextImg.postID).toString());

        if(!Utils.dirExists(dirPath)) {
            fs.mkdirSync(dirPath);
        }

        let image = nextImg.imgUrl;
        let imageFileName = url.parse(image);

        if(imageFileName && imageFileName.pathname) {
            imageFileName = path.basename(imageFileName.pathname);

            this._downloadImage({
                url: image.replace(imageFileName, encodeURIComponent(imageFileName)),
                dest: path.join(dirPath, imageFileName),
                headers: {
                    'User-Agent': 'Publii'
                }
            }).then(({filename, image}) => {
                this.downloadImagesProgress++;

                process.send({
                    type: 'progress',
                    message: {
                        translation: 'core.wpImport.imagesProgressInfo',
                        translationVars: {
                            progress: this.downloadImagesProgress,
                            total: this.totalImages
                        }
                    }
                });

                console.log('-> Downloaded image: ' + filename);

                setTimeout(() => {
                    this.downloadImages(imagesQueue, destinationPath);
                }, this.delayBetweenImages);
            }).catch(err => {
                this.downloadImagesProgress++;

                process.send({
                    type: 'progress',
                    message: {
                        translation: 'core.wpImport.imageDownloadError',
                        translationVars: {
                            image: image
                        }
                    }
                });

                console.log('(!) An error occurred during downloading the image: ' + image);
                console.log(err);

                setTimeout(() => {
                    this.downloadImages(imagesQueue, destinationPath);
                }, this.delayBetweenImages);
            });
        } else {
            console.log('(!!) An error occurred during downloading the image: ' + image);

            setTimeout(() => {
                this.downloadImages(imagesQueue, destinationPath);
            }, this.delayBetweenImages);
        }
    }

    /**
     * Counts images to download
     */
    countImages() {
        let postIDs = Object.keys(this.temp.imagesQueue);
        let sum = 0;

        for(let i = 0; i < postIDs.length; i++) {
            sum += [...new Set(this.temp.imagesQueue[postIDs[i]])].length;
        }

        return sum;
    }

    /**
     * Prepares post text to import
     *
     * @param text
     */
    preparePostText(text, images) {
        // Case when content is empty
        if(typeof text !== 'string') {
            return '';
        }

        // Replace images with #DOMAIN_NAME#
        if(images.length) {
            for (let image of images) {
                let imageFileName = url.parse(image);

                if(imageFileName && imageFileName.pathname) {
                    imageFileName = path.basename(imageFileName.pathname);
                    text = text.split(image).join('#DOMAIN_NAME#' + imageFileName);
                }
            }
        }

        // Remove [caption] from content
        text = text.replace(/\[caption.*?\]/g, '');
        text = text.replace(/\[\/caption\]/g, '');

        // Replace <!-- more --> with Publii separator
        text = text.replace(/<!--more-->/g, '<hr id="read-more" />');

        if(this.autop) {
            console.log('(i) Used automatic paragraphs for the post content');
            text = automaticParagraphs(text);
        }

        return text;
    }

    /**
     * Finishing import process
     */
    finishImport() {
        process.send({
            type: 'result',
            status: 'success',
            message: true
        });

        console.log('(i) Import is done');

        setTimeout(function() {
            process.exit();
        }, 1000);
    }
}

module.exports = WxrParser;
