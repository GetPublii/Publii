import Vue from 'vue';
import defaultAstAppConfig from './../../../config/AST.app.config';
import Utils from './../../helpers/utils.js';

export default {
    init (state, initialData) {
        state.app.config = Object.assign(JSON.parse(JSON.stringify(defaultAstAppConfig)), initialData.config);
        state.app.customConfig = initialData.customConfig;
        state.app.versionInfo = initialData.version;
        state.currentSite = {};
        state.languages = initialData.languages;
        state.languagesPath = initialData.languagesPath;
        state.languagesDefaultPath = initialData.languagesDefaultPath;
        state.plugins = initialData.plugins;
        state.pluginsPath = initialData.pluginsPath;
        state.sites = initialData.sites;
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
        state.currentSite = {
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
            menuStructure: data ? data.menuStructure : [],
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
    setNewThemeConfig (state, data) {
        state.currentSite.config.theme = data.themeName;
        state.currentSite.themeSettings = data.newThemeConfig;
    },
    setNotification (state, notificationData) {
        state.app.notification = Object.assign({}, notificationData);
    },
    replaceAppThemes (state, newThemes) {
        state.themes = newThemes.slice();
    },
    updateSiteThemes (state) {
        state.currentSite.themes = state.currentSite.themes.filter(theme => theme.location !== 'app');
        state.currentSite.themes = [...state.currentSite.themes, ...state.themes].slice();
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
        state.currentSite.menuStructure = state.currentSite.menuStructure.map((menu, index) => {
            if (index === data.menuID) {
                menu.items.push(data.menuItem);
            }

            return menu;
        });
    },
    addNewSubmenuItem (state, data) {
        state.currentSite.menuStructure = state.currentSite.menuStructure.map((menu, index) => {
            if (index === data.menuID) {
                menu.items = insertSubmenuItem(menu.items, data.menuItem, data.parentID);
            }

            return menu;
        });
    },
    editMenuItem (state, data) {
        state.currentSite.menuStructure = state.currentSite.menuStructure.map((menu, index) => {
            if (index === data.menuID) {
                menu.items = menu.items.map(item => editMenuItemByID(item, data.menuItem));
            }

            return menu;
        });
    },
    showMenuItem (state, data) {
        state.currentSite.menuStructure = state.currentSite.menuStructure.map((menu, index) => {
            if (index === data.menuID) {
                menu.items = menu.items.map(item => showMenuItemByID(item, data.itemID));
            }

            return menu;
        });
    },
    hideMenuItem (state, data) {
        state.currentSite.menuStructure = state.currentSite.menuStructure.map((menu, index) => {
            if (index === data.menuID) {
                menu.items = menu.items.map(item => hideMenuItemByID(item, data.itemID));
            }

            return menu;
        });
    },
    deleteMenuItem(state, data) {
        state.currentSite.menuStructure = state.currentSite.menuStructure.map((menu, index) => {
            if(index === data.menuID) {
                menu.items = menu.items.filter(item => deleteMenuItemByID(item, data.menuItemID));
            }

            return menu;
        });
    },
    duplicateMenuItem(state, data) {
        state.currentSite.menuStructure = state.currentSite.menuStructure.map((menu, index) => {
            if (index === data.menuID) {
                let dataToDuplicate = findMenuItemByIDwithParent(menu.items, data.menuItemID);
                let itemToDuplicate = dataToDuplicate.item;

                if (itemToDuplicate) {
                    let clone = JSON.parse(JSON.stringify(itemToDuplicate));
                    let newID = +new Date();
                    let cloneUpdated = updateMenuItemIDs(clone, newID);
                    menu.items = insertMenuItem(menu.items, cloneUpdated, dataToDuplicate.parentItemID);
                }
            }

            return menu;
        });
    },
    moveMenuItem (state, data) {
        if (data.position === 'child') {
            let destination = findMenuItemByID(state.currentSite.menuStructure[data.menuID].items, data.destinationID);
            let target = JSON.parse(JSON.stringify(findMenuItemByID(state.currentSite.menuStructure[data.menuID].items, data.targetID)));
            
            state.currentSite.menuStructure = state.currentSite.menuStructure.map((menu, index) => {
                if (index === data.menuID) {
                    menu.items = menu.items.filter(item => deleteMenuItemByID(item, data.targetID));
                }
    
                return menu;
            });

            destination.items.push(target);
        } else if (data.position === 'after' || data.position === 'before') {
            let destination = findMenuItemByIDwithParent(state.currentSite.menuStructure[data.menuID].items, data.destinationID);
            let target = JSON.parse(JSON.stringify(findMenuItemByID(state.currentSite.menuStructure[data.menuID].items, data.targetID)));
            let destinationParent;
            
            if (destination.parentItemID) {
                destinationParent = findMenuItemByID(state.currentSite.menuStructure[data.menuID].items, destination.parentItemID);
            } else {
                destinationParent = state.currentSite.menuStructure[data.menuID];
            }
            
            state.currentSite.menuStructure = state.currentSite.menuStructure.map((menu, index) => {
                if (index === data.menuID) {
                    menu.items = menu.items.filter(item => deleteMenuItemByID(item, data.targetID));
                }
    
                return menu;
            });

            let destinationIndex = destinationParent.items.findIndex(item => item.id === destination.item.id);

            if (destinationIndex === -1) {
                return;
            }

            if (data.position === 'after') {
                if (destinationIndex < destinationParent.items.length - 1) {
                    destinationParent.items.splice(destinationIndex + 1, 0, target);
                } else {
                    destinationParent.items.push(target);
                }
            } else if (data.position === 'before') {
                if (destinationIndex > 0) {
                    destinationParent.items.splice(destinationIndex, 0, target);
                } else {
                    destinationParent.items.unshift(target);
                }
            }
        }
    },
    reorderMenuItems (state, data) {
        let itemToModify = findMenuItemByID(state.currentSite.menuStructure[data.menuID].items, data.itemID);
        Vue.set(itemToModify, 'items', data.items.slice());
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
        state.editorOpened = isOpened;
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
    }
};

function findMenuItemByID (items, menuItemID) {
    if (items) {
        for (var i = 0; i < items.length; i++) {
            if (items[i].id == menuItemID) {
                return items[i];
            }

            var found = findMenuItemByID(items[i].items, menuItemID);

            if (found) {
                return found;
            }
        }
    }
}

function findMenuItemByIDwithParent (items, menuItemID, parentItemID = 0) {
    if (items) {
        for (let i = 0; i < items.length; i++) {
            if (items[i].id == menuItemID) {
                return {
                    item: items[i],
                    parentItemID: parentItemID
                };
            }

            let found = findMenuItemByIDwithParent(items[i].items, menuItemID, items[i].id);

            if (found) {
                return found;
            }
        }
    }
}

function insertSubmenuItem (menuItems, menuItem, parentItemID) {
    return menuItems.map(item => {
        if (item.id === parentItemID) {
            item.items.push(menuItem);
            return item;
        }

        if (item.items) {
            item.items = insertSubmenuItem(item.items, menuItem, parentItemID);
        }

        return item;
    });
}

function insertMenuItem (menuItems, menuItem, parentItemID) {
    if (parentItemID === 0) {
        menuItems.push(menuItem);
        return menuItems;
    }
    
    return menuItems.map(item => {
        if (item.id === parentItemID) {
            item.items.push(menuItem);
            return item;
        }

        if (item.items) {
            item.items = insertMenuItem(item.items, menuItem, parentItemID);
        }

        return item;
    });
}

function editMenuItemByID (item, editedMenuItem) {
    item.items = item.items.map(item => editMenuItemByID(item, editedMenuItem));

    if (item.id === editedMenuItem.id) {
        item.label = editedMenuItem.label;
        item.title = editedMenuItem.title;
        item.type = editedMenuItem.type;
        item.link = editedMenuItem.link;
        item.target = editedMenuItem.target;
        item.rel = editedMenuItem.rel;
        item.cssClass = editedMenuItem.cssClass;
        item.isHidden = editedMenuItem.isHidden || false;
    }

    return item;
}

function deleteMenuItemByID (item, id) {
    if(item.id === id) {
        return false;
    }

    item.items = item.items.filter(item => deleteMenuItemByID(item, id));

    return item.id !== id;
}

function updateMenuItemIDs (item, newID) {
    item = JSON.stringify(item);
    let offsetIndex = 0;

    item = item.replace(/"id":[0-9]{1,}/g, () => {
        offsetIndex++;
        return ('"id":' + newID + offsetIndex);
    });

    return JSON.parse(item);
}

function hideMenuItemByID (item, itemID) {
    item.items = item.items.map(subitem => hideMenuItemByID(subitem, itemID));

    if (item.id === itemID) {
        item.isHidden = true;
    }

    return item;
}

function showMenuItemByID (item, itemID) {
    item.items = item.items.map(subitem => showMenuItemByID(subitem, itemID));

    if (item.id === itemID) {
        item.isHidden = false;
    }

    return item;
}
