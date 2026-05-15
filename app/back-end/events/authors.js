const ipcMain = require('electron').ipcMain;
const Posts = require('../posts.js');
const Authors = require('../authors.js');
const PathValidator = require('../helpers/path-validator.js');

const { isValidDirSegment } = PathValidator;

/*
 * Events for the IPC communication regarding authors list
 */

class AuthorsEvents {
    constructor(appInstance) {
        // Load
        ipcMain.on('app-authors-load', function (event, siteData) {
            if (!siteData || !isValidDirSegment(siteData.site)) {
                event.sender.send('app-authors-loaded', { authors: [], postsAuthors: [] });
                return;
            }

            let postsData = new Posts(appInstance, siteData);
            let authorsData = new Authors(appInstance, siteData);

            event.sender.send('app-authors-loaded', {
                authors: authorsData.load(),
                postsAuthors: postsData.loadAuthorsXRef()
            });
        });
    }
}

module.exports = AuthorsEvents;
