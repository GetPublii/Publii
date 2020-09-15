const ipcMain = require('electron').ipcMain;
const Tag = require('../tag.js');

/*
 * Events for the IPC communication regarding single tags
 */

class TagEvents {
    constructor(appInstance) {
        // Save
        ipcMain.on('app-tag-save', function (event, tagData) {
            let tag = new Tag(appInstance, tagData);
            let result = tag.save();
            event.sender.send('app-tag-saved', result);
        });

        // Delete
        ipcMain.on('app-tag-delete', function (event, tagData) {
            let result = false;

            for(let i = 0; i < tagData.ids.length; i++) {
                let tag = new Tag(appInstance, {
                    site: tagData.site,
                    id: tagData.ids[i]
                });

                result = tag.delete();
            }

            event.sender.send('app-tag-deleted', result);
        });

        // Status change
        ipcMain.on('app-tags-status-change', function (event, tagData) {
            let result = false;

            for(let i = 0; i < tagData.ids.length; i++) {
                let tag = new Tag(appInstance, {
                    site: tagData.site,
                    id: tagData.ids[i]
                });

                result = tag.changeStatus(tagData.status, tagData.inverse);
            }

            event.sender.send('app-tags-status-changed', result);
        });

        // Cancelled edition
        ipcMain.on('app-tag-cancel', function(event, tagData) {
            let tag = new Tag(appInstance, tagData);
            let result = tag.checkAndCleanImages(true);
            event.sender.send('app-tag-cancelled', result);
        });
    }
}

module.exports = TagEvents;
