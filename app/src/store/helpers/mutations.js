import Vue from 'vue';
import defaultAstAppConfig from './../../../config/AST.app.config';
import Utils from './../../helpers/utils.js';
import MenuStructure from './menu-structure.js';

const editorFontFamilyAliases = {
    'var(--font-base)': 'sans-serif',
    'var(--font-serif)': 'serif',
    'var(--font-family-sans)': 'sans-serif',
    'var(--font-family-serif)': 'serif'
};

function normalizeEditorFontFamily (value) {
    return editorFontFamilyAliases[value] || value || defaultAstAppConfig.editorFontFamily;
}

function getEmptyCurrentSite () {
    return {
        config: {},
        posts: [],
        pages: [],
        tags: [],
        postsTags: [],
        postsAuthors: [],
        postTemplates: [],
        pagesAuthors: [],
        pageTemplates: [],
        themes: [],
        images: [],
        menuStructure: [],
        themeSettings: [],
        siteDir: ''
    };
}

export default {
    init (state, initialData) {
        state.app.config = Object.assign(JSON.parse(JSON.stringify(defaultAstAppConfig)), initialData.config);
        state.app.config.editorFontFamily = normalizeEditorFontFamily(state.app.config.editorFontFamily);
        state.app.customConfig = initialData.customConfig;
        state.app.versionInfo = initialData.version;
        state.currentSite = getEmptyCurrentSite();
        state.languages = initialData.languages;
        state.languagesPath = initialData.languagesPath;
        state.languagesDefaultPath = initialData.languagesDefaultPath;
        state.plugins = initialData.plugins;
        state.pluginsPath = initialData.pluginsPath;
        state.sites = initialData.sites;
        state.app.sitesLocationMissing = initialData.sitesLocationMissing === true;
        state.app.skipSplashScreen = initialData.skipSplashScreen === true;
        state.themes = initialData.themes;
        state.themesPath = initialData.themesPath;
        state.dirs = initialData.dirs;
        state.vendorPath = initialData.vendorPath;
        state.wysiwygTranslation = initialData.currentLanguage.wysiwygTranslation;

        // Set default ordering based on the app config
        let pagesOrdering = state.app.config.pagesOrdering ? state.app.config.pagesOrdering.split(' ') : ['', 'DESC'];
        let postsOrdering = state.app.config.postsOrdering ? state.app.config.postsOrdering.split(' ') : ['id', 'DESC'];
        let tagsOrdering = state.app.config.tagsOrdering ? state.app.config.tagsOrdering.split(' ') : ['id', 'DESC'];
        let authorsOrdering = state.app.config.authorsOrdering ? state.app.config.authorsOrdering.split(' ') : ['id', 'DESC'];

        Vue.set(state, 'ordering', {
            pages: {
                orderBy: pagesOrdering[0],
                order: pagesOrdering[1]
            },
            posts: {
                orderBy: postsOrdering[0],
                order: postsOrdering[1]
            },
            tags: {
                orderBy: tagsOrdering[0],
                order: tagsOrdering[1]
            },
            authors: {
                orderBy: authorsOrdering[0],
                order: authorsOrdering[1]
            }
        });
    },
    setAppConfig (state, newAppConfig) {
        state.app.config = Utils.deepMerge(state.app.config, newAppConfig);
        state.app.config.editorFontFamily = normalizeEditorFontFamily(state.app.config.editorFontFamily);
    },
    setAppTheme (state, newTheme) {
        state.app.theme = newTheme;
    },
    setSiteDir (state, newSitesLocation) {
        if (!state.currentSite.siteDir) {
            return;
        }

        state.currentSite.siteDir = state.currentSite.siteDir.replace(
            state.app.config.sitesLocation,
            newSitesLocation
        );
    },
    clearCurrentSite (state) {
        state.currentSite = getEmptyCurrentSite();
    },
    copySiteConfig (state, siteName) {
        state.currentSite.config = JSON.parse(JSON.stringify(state.sites[siteName]));
    },
    setSiteConfig (state, siteData) {
        let siteName = siteData.name;

        if (!siteName) {
            siteName = siteData.config.name;
        }

        Vue.set(state.sites, siteName, JSON.parse(JSON.stringify(siteData.config)));
        state.currentSite.config = JSON.parse(JSON.stringify(siteData.config));
    },
    replaceSiteConfig (state, data) {
        let currentSiteConfigCopy = JSON.parse(JSON.stringify(state.currentSite.config));
        state.currentSite.config = Utils.deepMerge(currentSiteConfigCopy, data.newSettings);
        let oldSiteCopy = JSON.parse(JSON.stringify(state.sites[data.oldName]));
        state.sites[state.currentSite.config.name] = Utils.deepMerge(oldSiteCopy, data.newSettings);
    },
    replaceSite (state, sitesData) {
        state.sites[sitesData.newSiteName] = state.sites[sitesData.oldSiteName];
        state.sites[sitesData.newSiteName].displayName = sitesData.displayName;
        Vue.delete(state.sites, sitesData.oldSiteName);
    },
    removeWebsite (state, name) {
        Vue.delete(state.sites, name);
    },
    cloneWebsite (state, data) {
        let copiedData = JSON.parse(JSON.stringify(data.newSiteConfig));
        Vue.set(state.sites, data.newSiteCatalog, copiedData);
    },
    addNewSite (state, siteData) {
        state.currentSite = {
            config: JSON.parse(JSON.stringify(siteData.siteConfig)),
            posts: [],
            pages: [],
            tags: [],
            authors: JSON.parse(JSON.stringify(siteData.authors)),
            postsTags: [],
            postsAuthors: [],
            postTemplates: [],
            pagesAuthors: [],
            pageTemplates: [],
            themes: [],
            images: [],
            menuStructure: [],
            themeSettings: [],
            siteDir: siteData.siteDir
        };

        Vue.set(state.sites, siteData.siteConfig.name, Object.assign({}, siteData.siteConfig));
    },
    switchSite (state, data) {
        state.currentSite = {
            config: JSON.parse(JSON.stringify(state.currentSite.config))
        };

        Utils.deepMerge(state.currentSite, {
            posts: data ? data.posts : [],
            pages: data ? data.pages : [],
            tags: data ? data.tags : [],
            postsTags: data ? data.postsTags: [],
            authors: data ? data.authors : [],
            postsAuthors: data ? data.postsAuthors : [],
            postTemplates: data ? data.postTemplates : [],
            pagesAuthors: data ? data.pagesAuthors : [],
            pageTemplates: data ? data.pageTemplates : [],
            tagTemplates: data ? data.tagTemplates : [],
            authorTemplates: data ? data.authorTemplates : [],
            themes: data ? data.themes : AST.themes,
            themeHasOverrides: data ? data.themeHasOverrides : false,
            themeSettings: data ? data.themeSettings : {},
            menuStructure: MenuStructure.normalizeMenuStructure(data ? data.menuStructure : []),
            siteDir: data ? data.siteDir : '',
            sidebar: {
                status: state.currentSite.config.synced
            }
        });

        state.currentSite = Object.assign({}, state.currentSite);
        state.components.sidebar.status = state.currentSite.config.synced;
        
        // Reset ordering after website switch
        let pagesOrdering = state.app.config.pagesOrdering ? state.app.config.pagesOrdering.split(' ') : ['', 'DESC'];
        let postsOrdering = state.app.config.postsOrdering ? state.app.config.postsOrdering.split(' ') : ['id', 'DESC'];
        let tagsOrdering = state.app.config.tagsOrdering ? state.app.config.tagsOrdering.split(' ') : ['id', 'DESC'];
        let authorsOrdering = state.app.config.authorsOrdering ? state.app.config.authorsOrdering.split(' ') : ['id', 'DESC'];

        Vue.set(state, 'ordering', {
            pages: {
                orderBy: pagesOrdering[0],
                order: pagesOrdering[1]
            },
            posts: {
                orderBy: postsOrdering[0],
                order: postsOrdering[1]
            },
            tags: {
                orderBy: tagsOrdering[0],
                order: tagsOrdering[1]
            },
            authors: {
                orderBy: authorsOrdering[0],
                order: authorsOrdering[1]
            }
        });

        /*
        if (window.spellCheckHandler) {
            window.spellCheckHandler.switchLanguage(state.currentSite.config.language);
        }
        */
    },
    setSites (state, sites) {
        state.sites = Object.assign({}, sites);
    },
    setSitesLocationMissing (state, isMissing) {
        state.app.sitesLocationMissing = isMissing === true;
    },
    setLocalPreview (state, localPreview) {
        let sites = localPreview && Array.isArray(localPreview.sites) ? localPreview.sites : [];

        state.app.localPreview = {
            running: !!(localPreview && localPreview.running),
            port: localPreview && localPreview.port ? localPreview.port : null,
            requestedPort: localPreview && localPreview.requestedPort ? localPreview.requestedPort : null,
            sites: sites.map(site => ({ name: site.name, url: site.url }))
        };
    },
    setNewThemeConfig (state, data) {
        state.currentSite.config.theme = data.themeName;
        state.currentSite.themeSettings = data.newThemeConfig;
    },
    setNotifications (state, notificationsData) {
        state.app.notifications = Object.assign({}, notificationsData);
    },
    setNotificationsCount (state, notificationsCount) {
        state.app.notificationsCount = notificationsCount;
    },
    replaceAppThemes (state, newThemes) {
        state.themes = newThemes.slice();
    },
    updateSiteThemes (state) {
        state.currentSite.themes = state.currentSite.themes.filter(theme => theme.location !== 'app');
        state.currentSite.themes = [...state.currentSite.themes, ...state.themes].slice();
    },
    replaceSiteThemes (state, themes) {
        state.currentSite.themes = themes.slice();
    },
    replaceAppLanguages (state, newLanguages) {
        state.languages = newLanguages.slice();
    },
    replaceAppPlugins (state, newPlugins) {
        state.plugins = newPlugins.slice();
    },
    setTags (state, tags) {
        Vue.set(state.currentSite, 'tags', tags.slice());
    },
    setPostsTags (state, postsTags) {
        Vue.set(state.currentSite, 'postsTags', postsTags.slice());
    },
    removeTags (state, tagIDs) {
        state.currentSite.tags = state.currentSite.tags.filter(tag => tagIDs.indexOf(tag.id) === -1);
        state.currentSite.postsTags = state.currentSite.postsTags.filter(postTag => tagIDs.indexOf(postTag.tagID) === -1);
    },
    setAuthors (state, authors) {
        Vue.set(state.currentSite, 'authors', authors.slice());
    },
    setPostAuthors (state, postsAuthors) {
        Vue.set(state.currentSite, 'postsAuthors', postsAuthors.slice());
    },
    setPageAuthors (state, pagesAuthors) {
        Vue.set(state.currentSite, 'pagesAuthors', pagesAuthors.slice());
    },
    removeAuthors (state, authorIDs) {
        state.currentSite.authors = state.currentSite.authors.filter(author => authorIDs.indexOf(author.id) === -1);
        state.currentSite.postsAuthors = state.currentSite.postsAuthors.filter(postAuthor => authorIDs.indexOf(postAuthor.authorID) === -1);
        state.currentSite.pagesAuthors = state.currentSite.pagesAuthors.filter(pageAuthor => authorIDs.indexOf(pageAuthor.authorID) === -1);
    },
    removePosts (state, postIDs) {
        state.currentSite.posts = state.currentSite.posts.filter(post => postIDs.indexOf(post.id) === -1);
    },
    removePages (state, pageIDs) {
        state.currentSite.pages = state.currentSite.pages.filter(page => pageIDs.indexOf(page.id) === -1);
    },
    changePostsToPages (state, config) {
        // Move posts with the given IDs to pages
        state.currentSite.pages = state.currentSite.pages.concat(state.currentSite.posts.filter(post => config.postIDs.indexOf(post.id) !== -1));
        // remove posts with the given IDs 
        state.currentSite.posts = state.currentSite.posts.filter(post => config.postIDs.indexOf(post.id) === -1);
        // remove tag references
        state.currentSite.postsTags = state.currentSite.postsTags.filter(postTags => config.postIDs.indexOf(postTags.postID) === -1);
        // move authors references
        state.currentSite.postsAuthors.forEach(postAuthor => {
            if (config.postIDs.indexOf(postAuthor.postID) > -1) {
                state.currentSite.pagesAuthors.push({
                    authorID: postAuthor.authorID,
                    authorName: postAuthor.authorName,
                    pageID: postAuthor.postID
                });
            }
        });
        state.currentSite.postsAuthors = state.currentSite.postsAuthors.filter(postAuthor => config.postIDs.indexOf(postAuthor.postID) === -1);
        // add status is-page to the pages with given IDs
        state.currentSite.pages = state.currentSite.pages.map(function(page) {
            if(config.postIDs.indexOf(page.id) !== -1) {
                let currentStatus = page.status.split(',');

                if(currentStatus.indexOf('is-page') === -1) {
                    currentStatus.push('is-page');
                }

                page.status = currentStatus.filter(status => ['excluded_homepage', 'featured', 'hidden'].indexOf(status) === -1).join(',');
                page.template = '*';
            }

            return page;
        });
    },
    changePagesToPosts (state, config) {
        // Move pages with the given IDs to pages
        state.currentSite.posts = state.currentSite.posts.concat(state.currentSite.pages.filter(page => config.pageIDs.indexOf(page.id) !== -1));
        // remove pages with the given IDs 
        state.currentSite.pages = state.currentSite.pages.filter(page => config.pageIDs.indexOf(page.id) === -1);
        // remove status is-page from the pages with given IDs
        state.currentSite.posts = state.currentSite.posts.map(function(post) {
            if(config.pageIDs.indexOf(post.id) !== -1) {
                let currentStatus = post.status.split(',');
                post.status = currentStatus.filter(status => status !== 'is-page').join(',');
                post.template = '*';
            }

            return post;
        });
    },
    changePostsStatus (state, config) {
        state.currentSite.posts = state.currentSite.posts.map(function(post) {
            if(config.postIDs.indexOf(post.id) !== -1) {
                let currentStatus = post.status.split(',');

                if(!config.inverse) {
                    if(currentStatus.indexOf(config.status) === -1) {
                        currentStatus.push(config.status);
                    }
                } else {
                    if(currentStatus.indexOf(config.status) > -1) {
                        currentStatus = currentStatus.filter(postStatus => postStatus !== config.status);
                    }
                }

                post.status = currentStatus.join(',');
            }

            return post;
        });
    },
    changePagesStatus (state, config) {
        state.currentSite.pages = state.currentSite.pages.map(function(page) {
            if(config.pageIDs.indexOf(page.id) !== -1) {
                let currentStatus = page.status.split(',');

                if(!config.inverse) {
                    if(currentStatus.indexOf(config.status) === -1) {
                        currentStatus.push(config.status);
                    }
                } else {
                    if(currentStatus.indexOf(config.status) > -1) {
                        currentStatus = currentStatus.filter(pageStatus => pageStatus !== config.status);
                    }
                }

                page.status = currentStatus.join(',');
            }

            return page;
        });
    },
    changeTagsVisibility (state, config) {
        state.currentSite.tags = state.currentSite.tags.map(function(tag) {
            if (config.tagsIDs.indexOf(tag.id) !== -1) {
                tag.additionalData = JSON.parse(tag.additionalData);

                if (!config.inverse) {
                    tag.additionalData.isHidden = true;
                } else {
                    tag.additionalData.isHidden = false;
                }

                tag.additionalData = JSON.stringify(tag.additionalData);
            }

            return tag;
        });
    },
    refreshSiteConfig (state, newData) {
        let currentSiteConfigCopy = Object.assign({}, state.currentSite.config);
        state.currentSite.config = Utils.deepMerge(currentSiteConfigCopy, newData.newSettings);
        let oldSiteConfigCopy = Object.assign({}, state.sites[newData.siteName]);
        state.sites[state.currentSite.config.name] = Object.assign({}, Utils.deepMerge(oldSiteConfigCopy, newData.newSettings));
    },
    refreshSiteThemeConfig (state, newData) {
        state.currentSite.config.theme = newData.themeName;
        state.currentSite.themeSettings = Object.assign({}, newData.newThemeConfig);
    },
    setSidebarStatus (state, newStatus) {
        state.components.sidebar.status = newStatus;
    },
    setThumbnailsRegeneration (state, newState) {
        state.components.thumbnailsRegeneration = newState;
    },
    setSyncStatus (state, newStatus) {
        state.components.sidebar.syncInProgress = newStatus;
    },
    setMenuPosition (state, newPositionData) {
        state.currentSite.menuStructure[newPositionData.index].position = newPositionData.position;
        state.currentSite.menuStructure[newPositionData.index].maxLevels = newPositionData.maxLevels ? newPositionData.maxLevels : ''; 
    },
    addNewMenu (state, newMenuName) {
        state.currentSite.menuStructure.push({
            name: newMenuName,
            position: "",
            items: []
        });
    },
    deleteMenuByIDs (state, menuIDs) {
        state.currentSite.menuStructure = state.currentSite.menuStructure.filter((item, index) => menuIDs.indexOf(index) === -1);
    },
    editMenuName (state, newMenuData) {
        state.currentSite.menuStructure[newMenuData.index].name = newMenuData.newName;
    },
    addNewMenuItem (state, data) {
        const menu = state.currentSite.menuStructure[data.menuID];

        if (!menu || !data.menuItem) {
            return;
        }

        const item = MenuStructure.prepareMenuItem(data.menuItem, state.currentSite.menuStructure);

        if (item) {
            getMenuItemChildren(menu).push(item);
        }
    },
    addNewSubmenuItem (state, data) {
        const menu = state.currentSite.menuStructure[data.menuID];
        const parent = menu && findMenuItemByID(menu.items, data.parentID);

        if (!parent || !data.menuItem) {
            return;
        }

        const item = MenuStructure.prepareMenuItem(data.menuItem, state.currentSite.menuStructure);

        if (item) {
            getMenuItemChildren(parent).push(item);
        }
    },
    editMenuItem (state, data) {
        const menu = state.currentSite.menuStructure[data.menuID];
        const editedItem = data.menuItem;
        const item = menu && editedItem && findMenuItemByID(menu.items, editedItem.id);

        if (!item) {
            return;
        }

        for (const field of ['label', 'title', 'type', 'link', 'target', 'rel', 'cssClass']) {
            Vue.set(item, field, editedItem[field]);
        }

        Vue.set(item, 'isHidden', !!editedItem.isHidden);
    },
    showMenuItem (state, data) {
        const menu = state.currentSite.menuStructure[data.menuID];
        const item = menu && findMenuItemByID(menu.items, data.itemID);

        if (item) {
            Vue.set(item, 'isHidden', false);
        }
    },
    hideMenuItem (state, data) {
        const menu = state.currentSite.menuStructure[data.menuID];
        const item = menu && findMenuItemByID(menu.items, data.itemID);

        if (item) {
            Vue.set(item, 'isHidden', true);
        }
    },
    deleteMenuItem (state, data) {
        const menu = state.currentSite.menuStructure[data.menuID];
        const found = menu && findMenuItemByIDwithParent(menu.items, data.menuItemID);

        if (found) {
            found.siblings.splice(found.siblings.indexOf(found.item), 1);
        }
    },
    duplicateMenuItem (state, data) {
        const menu = state.currentSite.menuStructure[data.menuID];
        const found = menu && findMenuItemByIDwithParent(menu.items, data.menuItemID);

        if (!found) {
            return;
        }

        const clone = MenuStructure.prepareMenuItem(found.item, state.currentSite.menuStructure, true);
        found.siblings.push(clone);
    },
    moveMenuItem (state, data) {
        if (!['before', 'after', 'child'].includes(data.position)) {
            return;
        }

        const menu = state.currentSite.menuStructure[data.menuID];
        const source = menu && findMenuItemByIDwithParent(menu.items, data.targetID);
        const destination = menu && findMenuItemByIDwithParent(menu.items, data.destinationID);

        if (!source || !destination || source.item === destination.item) {
            return;
        }

        // Never detach an item if its destination is inside that item's own subtree.
        if (findMenuItemByID(source.item.items, data.destinationID)) {
            return;
        }

        const siblings = data.position === 'child'
            ? getMenuItemChildren(destination.item)
            : destination.siblings;

        source.siblings.splice(source.siblings.indexOf(source.item), 1);

        if (data.position === 'child') {
            siblings.push(source.item);
        } else {
            const index = siblings.indexOf(destination.item);
            siblings.splice(index + (data.position === 'after' ? 1 : 0), 0, source.item);
        }
    },
    reorderMenuItems (state, data) {
        const menu = state.currentSite.menuStructure[data.menuID];
        const item = menu && findMenuItemByID(menu.items, data.itemID);

        if (item && Array.isArray(data.items)) {
            Vue.set(item, 'items', data.items.slice());
        }
    },
    refreshAfterPostUpdate (state, data) {
        state.currentSite.posts = data.posts;
        state.currentSite.tags = data.tags;
        state.currentSite.postsTags = data.postsTags;
        state.currentSite.postsAuthors = data.postsAuthors;
        state.currentSite.authors = data.authors;
    },
    refreshAfterPageUpdate (state, data) {
        state.currentSite.pages = data.pages;
        state.currentSite.pagesAuthors = data.pagesAuthors;
        state.currentSite.authors = data.authors;
    },
    setThemeConfig (state, data) {
        state.currentSite.themeSettings.config = data.newConfig.config.slice();
        state.currentSite.themeSettings.customConfig = data.newConfig.customConfig.slice();
        state.currentSite.themeSettings.postConfig = data.newConfig.postConfig.slice();
        state.currentSite.themeSettings.pageConfig = data.newConfig.pageConfig.slice();
        state.currentSite.themeSettings.tagConfig = data.newConfig.tagConfig.slice();
        state.currentSite.themeSettings.authorConfig = data.newConfig.authorConfig.slice();
        state.currentSite.themeSettings.defaultTemplates = JSON.parse(JSON.stringify(data.newConfig.defaultTemplates));
    },
    setEditorOpenState (state, isOpened) {
        state.app.editorOpened = isOpened;
    },
    setOrdering (state, data) {
        state.ordering[data.type].orderBy = data.orderBy;
        state.ordering[data.type].order = data.order;
    },
    setSyncDate (state, date) {
        Vue.set(state.currentSite.config, 'syncDate', date);
        Vue.set(state.currentSite.config, 'synced', 'synced');
        Vue.set(state.components.sidebar, 'status', state.currentSite.config.synced);
    },
    setWindowState (state, newState) {
        state.app.windowIsMaximized = newState;
    },
    setAppLanguage (state, language) {
        state.app.config.language = language;
    },
    setAppLanguageType (state, type) {
        state.app.config.languageType = type;
    },
    setWysiwygTranslation (state, translations) {
        state.wysiwygTranslation = translations;
    },
    setAppUIZoomLevel (state, zoomLevel) {
        state.app.config.uiZoomLevel = parseFloat(zoomLevel);
    },
    setAppNotificationsStatus (state, enabled) {
        state.app.config.notificationsStatus = enabled;
    },
    setNotificationsReadStatus (state, status) {
        state.app.notificationsReadStatus = status;
    },
    setNotificationsSeenIDs (state, ids) {
        state.app.notificationsSeenIDs = ids;
    },
    updateCurrentSiteItem(state, { itemType, itemID, field, value, type, subfield }) {
        let itemArray;

        switch (itemType) {
            case 'post': itemArray = state.currentSite.posts; break;
            case 'page': itemArray = state.currentSite.pages; break;
            case 'tag': itemArray = state.currentSite.tags; break;
            case 'author': itemArray = state.currentSite.authors; break;
            default: console.error(`[Vuex Mutation] Unknown itemType: ${itemType}`); return;
        }

        let  item = itemArray.find(i => i.id === itemID);
        
        if (!item) {
            console.error(`[Vuex Mutation] Element not found: ${itemType} using ID: ${itemID}`);
            return;
        }

        if (type === 'field') {
            item[field] = value;
        } else if (type === 'json') {
            let jsonFieldName = field;
            
            if ((itemType === 'post' || itemType === 'page') && field === '_core') {
                jsonFieldName = 'additional_data';
            }

            if (typeof item[jsonFieldName] === 'undefined') {
                console.warn(`[Vuex Mutation] Non-existing JSON field: ${jsonFieldName}`);
                return;
            }

            let jsonData = {};

            try {
                jsonData = JSON.parse(item[jsonFieldName] || '{}');
            } catch (e) {
                console.error(`[Vuex Mutation] JSON parsing error in ${itemType} #${itemID}, field ${jsonFieldName}:`, e);
            }
            
            jsonData[subfield] = value;
            item[jsonFieldName] = JSON.stringify(jsonData);
        }
    }
};

function findMenuItemByID (items, menuItemID) {
    const found = findMenuItemByIDwithParent(items, menuItemID);
    return found ? found.item : null;
}

function findMenuItemByIDwithParent (items, menuItemID) {
    if (!Array.isArray(items)) {
        return null;
    }

    for (const item of items) {
        if (!item || typeof item !== 'object') {
            continue;
        }

        if (item.id === menuItemID) {
            return { item, siblings: items };
        }

        const found = findMenuItemByIDwithParent(item.items, menuItemID);

        if (found) {
            return found;
        }
    }

    return null;
}

function getMenuItemChildren (item) {
    if (!Array.isArray(item.items)) {
        Vue.set(item, 'items', []);
    }

    return item.items;
}
