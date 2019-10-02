const ipcMain = require('electron').ipcMain;
const Posts = require('../posts.js');
const Authors = require('../authors.js');

/*
 * Events for the IPC communication regarding authors list
 */

class AuthorsEvents {
    constructor(appInstance) {
        // Load
        ipcMain.on('app-tags-load', function (event, siteData) {
            let postsData = new Posts(appInstance, siteData);
            let authorsData = new Authors(appInstance, siteData);

            event.sender.send('app-tags-loaded', {
                authors: authorsData.load(),
                postsAuthors: postsData.loadAuthorsXRef()
            });
        });
    }
}

module.exports = AuthorsEvents;
