const ipcMain = require('electron').ipcMain;
const Posts = require('../posts.js');
const Tags = require('../tags.js');

/*
 * Events for the IPC communication regarding tags list
 */

class TagsEvents {
    constructor(appInstance) {
        // Load
        ipcMain.on('app-tags-load', function (event, siteData) {
            let postsData = new Posts(appInstance, siteData);
            let tagsData = new Tags(appInstance, siteData);

            event.sender.send('app-tags-loaded', {
                tags: tagsData.load(),
                postsTags: postsData.loadTagsXRef()
            });
        });
    }
}

module.exports = TagsEvents;
