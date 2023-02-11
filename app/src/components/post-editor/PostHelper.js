class PostHelper {
    static async preparePostData (newPostStatus, postID, $store, postData) {
        let finalStatus = newPostStatus;
        let mediaPath = PostHelper.getMediaPath($store, postID);
        let preparedText = '';
        
        if (postData.editor === 'tinymce') {
            preparedText = $('#post-editor').val();
        }

        if (postData.editor === 'markdown') {
            preparedText = postData.text;
        }

        if (postData.editor === 'blockeditor') {
            preparedText = $('#post-editor').val();
        }
        
        // Remove directxory path from images src attribute
        preparedText = preparedText.replace(/file:(\/){1,}/gmi, 'file:///');
        preparedText = preparedText.split(mediaPath).join('#DOMAIN_NAME#');
        preparedText = preparedText.replace(/file:(\/){1,}\#DOMAIN_NAME\#/gmi, '#DOMAIN_NAME#');

        if (postData.isHidden) {
            finalStatus += ',hidden';
        }

        if (postData.isTrashed) {
            finalStatus += ',trashed';
        }

        if (postData.isFeatured) {
            finalStatus += ',featured';
        }

        if (postData.isExcludedOnHomepage) {
            finalStatus += ',excluded_homepage';
        }

        let postViewSettings = {};

        $store.state.currentSite.themeSettings.postConfig.forEach(field => {
            let fieldType = 'select';

            if (typeof field.type !== 'undefined') {
                fieldType = field.type;
            }

            postViewSettings[field.name] = {
                type: fieldType,
                value: postData.postViewOptions[field.name]
            };
        });

        if (postData.slug === '') {
            postData.slug = await mainProcessAPI.invoke('app-main-process-create-slug', postData.title);
        }

        let creationDate = postData.creationDate.timestamp;

        if (!postData.creationDate.timestamp) {
            creationDate = Date.now();
        }

        return {
            'site': $store.state.currentSite.config.name,
            'title': postData.title,
            'slug': postData.slug,
            'text': preparedText,
            'tags': postData.tags,
            'status': finalStatus,
            'creationDate': creationDate,
            'modificationDate': Date.now(),
            'template': postData.template,
            'featuredImage': postData.featuredImage.path === null ? '' : 'file:///' + PostHelper.getMediaPath($store, postID) + postData.featuredImage.path,
            'featuredImageFilename': postData.featuredImage.path,
            'featuredImageData': {
                alt: postData.featuredImage.alt,
                caption: postData.featuredImage.caption,
                credits: postData.featuredImage.credits
            },
            'additionalData': {
                metaTitle: postData.metaTitle,
                metaDesc: postData.metaDescription,
                metaRobots: postData.metaRobots,
                canonicalUrl: postData.canonicalUrl,
                mainTag: postData.mainTag,
                editor: postData.editor
            },
            'postViewSettings': postViewSettings,
            'id': postID,
            'author': parseInt(postData.author, 10)
        };
    }

    static loadPostData (data, $store, $moment) {
        let postData = {
            title: '',
            text: '',
            slug: '',
            author: 1,
            tags: [],
            mainTag: '',
            template: '',
            creationDate: {
                text: '',
                timestamp: 0
            },
            modificationDate: {
                text: '',
                timestamp: 0
            },
            isFeatured: false,
            isHidden: false,
            isTrashed: false,
            isExcludedOnHomepage: false,
            status: '',
            metaTitle: '',
            metaDescription: '',
            metaRobots: 'index, follow',
            canonicalUrl: '',
            featuredImage: {
                path: '',
                alt: '',
                caption: '',
                credits: ''
            },
            postViewOptions: {}
        };

        // Set post elements
        postData.title = data.posts[0].title;
        let mediaPath = PostHelper.getMediaPath($store, data.posts[0].id);
        let preparedText = data.posts[0].text;
        preparedText = preparedText.split('#DOMAIN_NAME#').join('file:///' + mediaPath);
        preparedText = PostHelper.setWebpCompatibility($store, preparedText);
        postData.text = preparedText;

        // Set tags
        postData.tags = [];

        if (data.tags.length) {
            for (let i = 0; i < data.tags.length; i++) {
                postData.tags.push(data.tags[i].name);
            }
        }

        postData.mainTag = data.additionalData.mainTag || '';

        // Set author
        postData.author = data.author[0].id;

        // Dates
        let format = 'MMM DD, YYYY  HH:mm';

        if($store.state.app.config.timeFormat == 12) {
            format = 'MMM DD, YYYY  hh:mm a';
        }

        postData.creationDate.text = $moment(data.posts[0].created_at).format(format);
        postData.modificationDate.text = $moment(data.posts[0].modified_at).format(format);
        postData.creationDate.timestamp = data.posts[0].created_at;
        postData.modificationDate.timestamp = data.posts[0].modified_at;
        postData.status = data.posts[0].status.split(',').join(', ');
        postData.isHidden = data.posts[0].status.indexOf('hidden') > -1;
        postData.isFeatured = data.posts[0].status.indexOf('featured') > -1;
        postData.isExcludedOnHomepage = data.posts[0].status.indexOf('excluded_homepage') > -1;
        postData.isTrashed = data.posts[0].status.indexOf('trashed') > -1;

        // Set image
        if (data.featuredImage) {
            postData.featuredImage.path = !data.featuredImage.url ? '' : data.featuredImage.url;

            if(data.featuredImage.additional_data) {
                try {
                    let imageData = JSON.parse(data.featuredImage.additional_data);
                    postData.featuredImage.alt = imageData.alt;
                    postData.featuredImage.caption = imageData.caption;
                    postData.featuredImage.credits = imageData.credits;
                } catch(e) {
                    console.warning('Unable to load featured image data: ');
                    console.warning(data.featuredImage.additional_data);
                }
            }
        }

        // Set SEO
        postData.slug = data.posts[0].slug;
        postData.metaTitle = data.additionalData.metaTitle || "";
        postData.metaDescription = data.additionalData.metaDesc || "";
        postData.metaRobots = data.additionalData.metaRobots || "";
        postData.canonicalUrl = data.additionalData.canonicalUrl || "";

        // Update post template
        postData.template = data.posts[0].template;

        // Update post view settings
        let postViewFields = Object.keys(data.postViewSettings);

        for(let i = 0; i < postViewFields.length; i++) {
            let newValue = '';

            if(
                data.postViewSettings[postViewFields[i]] && data.postViewSettings[postViewFields[i]].value
            ) {
                newValue = data.postViewSettings[postViewFields[i]].value;
            } else {
                newValue = data.postViewSettings[postViewFields[i]];
            }

            postData.postViewOptions[postViewFields[i]] = newValue;
        }

        return postData;
    }

    static getMediaPath ($store, postID) {
        let mediaPath = $store.state.currentSite.siteDir.replace(/&/gmi, '&amp;');
        mediaPath = mediaPath.replace(/\\/g, '/');
        mediaPath += '/input/media/posts/';
        mediaPath += postID === 0 ? 'temp' : postID;
        mediaPath += '/';

        return mediaPath;
    }

    static setWebpCompatibility ($store, text) {
        let forceWebp = !!$store.state.currentSite.config.advanced.forceWebp;

        text = text.replace(/\<figure class="gallery__item">[\s\S]*?<a[\s\S]*?href="(.*?)"[\s\S]+?>[\s\S]*?<img[\s\S]*?src="(.*?)"/gmi, (matches, linkUrl, imgUrl) => {
            if (linkUrl && imgUrl) {
                if (
                    forceWebp && 
                    PostHelper.getImageType(linkUrl) === 'webp-compatible' && 
                    !PostHelper.isWebpImage(imgUrl)
                ) {
                    let imgExtension = PostHelper.getImageExtension(imgUrl);
                    let newImgUrl = imgUrl.substr(0, imgUrl.length + (-1 * imgExtension.length)) + '.webp';
                    matches = matches.replace(imgUrl, newImgUrl);
                } else if (
                    !forceWebp && 
                    PostHelper.getImageType(linkUrl) === 'webp-compatible' && 
                    PostHelper.isWebpImage(imgUrl)
                ) {
                    let imgExtension = PostHelper.getImageExtension(linkUrl);
                    let newImgUrl = imgUrl.substr(0, imgUrl.length - 5) + imgExtension;
                    matches = matches.replace(imgUrl, newImgUrl);
                }
            }

            return matches;
        });

        return text;
    }

    static isWebpImage (url) {
        if (url.substr(-5).toLowerCase() === '.webp') {
            return true;
        }

        return false;
    }

    static getImageType (url) {
        if (url.substr(-5).toLowerCase() === '.webp') {
            return 'webp';
        }

        if (
            url.substr(-5).toLowerCase() === '.jpeg' ||
            url.substr(-4).toLowerCase() === '.jpg' ||
            url.substr(-4).toLowerCase() === '.png'
        ) {
            return 'webp-compatible';
        }

        return 'other';
    }

    static getImageExtension (url) {
        if (url.substr(-5).toLowerCase() === '.webp' || url.substr(-5).toLowerCase() === '.jpeg') {
            return url.substr(-5);
        } 

        if (url.substr(-4).toLowerCase() === '.jpg' || url.substr(-4).toLowerCase() === '.png') {
            return url.substr(-4);
        } 

        return false;
    }
}

export default PostHelper;
