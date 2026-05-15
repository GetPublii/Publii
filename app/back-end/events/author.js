const ipcMain = require('electron').ipcMain;
const Author = require('../author.js');
const PathValidator = require('../helpers/path-validator.js');

const { isValidDirSegment } = PathValidator;

/*
 * Events for the IPC communication regarding single tags
 */

class AuthorEvents {
    constructor(appInstance) {
        // Save
        ipcMain.on('app-author-save', function (event, authorData) {
            if (!authorData || !isValidDirSegment(authorData.site)) {
                event.sender.send('app-author-saved', false);
                return;
            }

            let author = new Author(appInstance, authorData);
            let result = author.save();
            event.sender.send('app-author-saved', result);
        });

        // Delete
        ipcMain.on('app-author-delete', function (event, authorData) {
            if (!authorData || !isValidDirSegment(authorData.site) || !Array.isArray(authorData.ids)) {
                event.sender.send('app-author-deleted', false);
                return;
            }

            let result = false;

            for(let i = 0; i < authorData.ids.length; i++) {
                let author = new Author(appInstance, {
                    site: authorData.site,
                    id: authorData.ids[i]
                });

                result = author.delete();
            }

            event.sender.send('app-author-deleted', result);
        });

        // Cancelled edition
        ipcMain.on('app-author-cancel', function(event, authorData) {
            if (!authorData || !isValidDirSegment(authorData.site)) {
                event.sender.send('app-author-cancelled', false);
                return;
            }

            let author = new Author(appInstance, authorData);
            let result = author.checkAndCleanImages(true);
            event.sender.send('app-author-cancelled', result);
        });
    }
}

module.exports = AuthorEvents;
