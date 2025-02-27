class ItemHelper {
    static async prepareItemData (newStatus, itemID, $store, itemData, itemType = 'post') {
        let finalStatus = newStatus;
        let mediaPath = ItemHelper.getMediaPath($store, itemID, itemType);
        let preparedText = '';
        
        if (itemData.editor === 'tinymce') {
            preparedText = $('#post-editor').val();
        }

        if (itemData.editor === 'markdown') {
            preparedText = itemData.text;
        }

        if (itemData.editor === 'blockeditor') {
            preparedText = $('#post-editor').val();
        }
        
        // Remove directxory path from images src attribute
        preparedText = preparedText.replace(/file:(\/){1,}/gmi, 'file:///');
        preparedText = preparedText.split(mediaPath).join('#DOMAIN_NAME#');
        preparedText = preparedText.replace(/file:(\/){1,}\#DOMAIN_NAME\#/gmi, '#DOMAIN_NAME#');

        if (itemType === 'page') {
            finalStatus += ',is-page';
        }

        if (itemData.isHidden) {
            finalStatus += ',hidden';
        }

        if (itemData.isTrashed) {
            finalStatus += ',trashed';
        }

        if (itemData.isFeatured) {
            finalStatus += ',featured';
        }

        if (itemData.isExcludedOnHomepage) {
            finalStatus += ',excluded_homepage';
        }

        let itemViewSettings = {};

        if (itemType === 'post') {
            $store.state.currentSite.themeSettings.postConfig.forEach(field => {
                let fieldType = 'select';

                if (typeof field.type !== 'undefined') {
                    fieldType = field.type;
                }

                itemViewSettings[field.name] = {
                    type: fieldType,
                    value: itemData.viewOptions[field.name]
                };
            });
        } else if (itemType === 'page') {
            $store.state.currentSite.themeSettings.pageConfig.forEach(field => {
                let fieldType = 'select';

                if (typeof field.type !== 'undefined') {
                    fieldType = field.type;
                }

                itemViewSettings[field.name] = {
                    type: fieldType,
                    value: itemData.viewOptions[field.name]
                };
            });
        }

        if (itemData.slug === '') {
            itemData.slug = await mainProcessAPI.invoke('app-main-process-create-slug', itemData.title);
        }

        let creationDate = itemData.creationDate.timestamp;

        if (!itemData.creationDate.timestamp) {
            creationDate = Date.now();
        }

        let preparedData = {
            'site': $store.state.currentSite.config.name,
            'title': itemData.title,
            'slug': itemData.slug,
            'text': preparedText,
            'status': finalStatus,
            'creationDate': creationDate,
            'modificationDate': Date.now(),
            'template': itemData.template,
            'featuredImage': itemData.featuredImage.path === null ? '' : 'file:///' + ItemHelper.getMediaPath($store, itemID, itemType) + itemData.featuredImage.path,
            'featuredImageFilename': itemData.featuredImage.path,
            'featuredImageData': {
                alt: itemData.featuredImage.alt,
                caption: itemData.featuredImage.caption,
                credits: itemData.featuredImage.credits
            },
            'additionalData': {
                metaTitle: itemData.metaTitle,
                metaDesc: itemData.metaDescription,
                metaRobots: itemData.metaRobots,
                canonicalUrl: itemData.canonicalUrl,
                editor: itemData.editor
            },
            'id': itemID,
            'author': parseInt(itemData.author, 10)
        };

        if (itemType === 'post') {
            preparedData.tags = itemData.tags;

            if (preparedData.tags && preparedData.tags.length) {
                preparedData.tags = [...new Set(preparedData.tags)];
            }
            
            preparedData.additionalData.mainTag = itemData.mainTag;
            preparedData.postViewSettings = itemViewSettings;
        } else if (itemType === 'page') {
            preparedData.pageViewSettings = itemViewSettings;
        }

        return preparedData;
    }

    static loadItemData (data, $store, $moment, itemType = 'post') {
        let itemData = {
            title: '',
            text: '',
            slug: '',
            author: 1,
            template: '',
            creationDate: {
                text: '',
                timestamp: 0
            },
            modificationDate: {
                text: '',
                timestamp: 0
            },
            isTrashed: false,
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
            }
        };

        if (itemType === 'post') {
            itemData.tags = [];
            itemData.viewOptions = {};
            itemData.mainTag = '';
            itemData.isFeatured = false;
            itemData.isHidden = false;
            itemData.isExcludedOnHomepage = false;
        } else if (itemType === 'page') {
            itemData.viewOptions = {};
        }

        // Set post elements
        itemData.title = data[itemType + 's'][0].title;
        let mediaPath = ItemHelper.getMediaPath($store, data[itemType + 's'][0].id, itemType);
        let preparedText = data[itemType + 's'][0].text;
        preparedText = preparedText.split('#DOMAIN_NAME#').join('file:///' + mediaPath);
        preparedText = ItemHelper.setWebpCompatibility($store, preparedText);
        itemData.text = preparedText;

        // Set tags
        if (itemType === 'post') {
            itemData.tags = [];

            if (data.tags.length) {
                for (let i = 0; i < data.tags.length; i++) {
                    itemData.tags.push(data.tags[i].name);
                }
            }

            itemData.mainTag = data.additionalData.mainTag || '';
        }

        // Set author
        itemData.author = data.author[0].id;

        // Dates
        let format = 'MMM DD, YYYY  HH:mm';

        if($store.state.app.config.timeFormat == 12) {
            format = 'MMM DD, YYYY  hh:mm a';
        }

        itemData.creationDate.text = $moment(data[itemType + 's'][0].created_at).format(format);
        itemData.modificationDate.text = $moment(data[itemType + 's'][0].modified_at).format(format);
        itemData.creationDate.timestamp = data[itemType + 's'][0].created_at;
        itemData.modificationDate.timestamp = data[itemType + 's'][0].modified_at;
        itemData.status = data[itemType + 's'][0].status.split(',').join(', ');
        itemData.isTrashed = data[itemType + 's'][0].status.indexOf('trashed') > -1;

        if (itemType === 'post') {
            itemData.isHidden = data[itemType + 's'][0].status.indexOf('hidden') > -1;
            itemData.isFeatured = data[itemType + 's'][0].status.indexOf('featured') > -1;
            itemData.isExcludedOnHomepage = data[itemType + 's'][0].status.indexOf('excluded_homepage') > -1;
        }

        // Set image
        if (data.featuredImage) {
            itemData.featuredImage.path = !data.featuredImage.url ? '' : data.featuredImage.url;

            if(data.featuredImage.additional_data) {
                try {
                    let imageData = JSON.parse(data.featuredImage.additional_data);
                    itemData.featuredImage.alt = imageData.alt;
                    itemData.featuredImage.caption = imageData.caption;
                    itemData.featuredImage.credits = imageData.credits;
                } catch(e) {
                    console.warning('Unable to load featured image data: ');
                    console.warning(data.featuredImage.additional_data);
                }
            }
        }

        // Set SEO
        itemData.slug = data[itemType + 's'][0].slug;
        itemData.metaTitle = data.additionalData.metaTitle || "";
        itemData.metaDescription = data.additionalData.metaDesc || "";
        itemData.metaRobots = data.additionalData.metaRobots || "";
        itemData.canonicalUrl = data.additionalData.canonicalUrl || "";

        // Update post template
        itemData.template = data[itemType + 's'][0].template;

        // Update item view settings
        if (itemType === 'post' || itemType === 'page') {
            ItemHelper.updateViewSettings(itemType, data, itemData);
        }

        return itemData;
    }

    static updateViewSettings(itemType, data, itemData) {
        let settingsKey = itemType + 'ViewSettings';
        let viewSettings = data[settingsKey];
        let viewFields = Object.keys(viewSettings);

        for (let i = 0; i < viewFields.length; i++) {
            let newValue = '';
    
            if (viewSettings[viewFields[i]] && viewSettings[viewFields[i]].value) {
                newValue = viewSettings[viewFields[i]].value;
            } else {
                newValue = viewSettings[viewFields[i]];
            }
    
            itemData.viewOptions[viewFields[i]] = newValue;
        }
    }

    static getMediaPath ($store, itemID, itemType = 'post') {
        let mediaPath = $store.state.currentSite.siteDir.replace(/&/gmi, '&amp;');
        mediaPath = mediaPath.replace(/\\/g, '/');
        mediaPath += '/input/media/';
        
        if (itemType === 'post' || itemType === 'page') {
            mediaPath += 'posts/';
        }

        mediaPath += itemID === 0 ? 'temp' : itemID;
        mediaPath += '/';

        return mediaPath;
    }

    static setWebpCompatibility ($store, text) {
        let forceWebp = !!$store.state.currentSite.config.advanced.forceWebp;

        text = text.replace(/\<figure class="gallery__item">[\s\S]*?<a[\s\S]*?href="(.*?)"[\s\S]+?>[\s\S]*?<img[\s\S]*?src="(.*?)"/gmi, (matches, linkUrl, imgUrl) => {
            if (linkUrl && imgUrl) {
                if (
                    forceWebp && 
                    ItemHelper.getImageType(linkUrl) === 'webp-compatible' && 
                    !ItemHelper.isWebpImage(imgUrl)
                ) {
                    let imgExtension = ItemHelper.getImageExtension(imgUrl);
                    let newImgUrl = imgUrl.substr(0, imgUrl.length + (-1 * imgExtension.length)) + '.webp';
                    matches = matches.replace(imgUrl, newImgUrl);
                } else if (
                    !forceWebp && 
                    ItemHelper.getImageType(linkUrl) === 'webp-compatible' && 
                    ItemHelper.isWebpImage(imgUrl)
                ) {
                    let imgExtension = ItemHelper.getImageExtension(linkUrl);
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

export default ItemHelper;
