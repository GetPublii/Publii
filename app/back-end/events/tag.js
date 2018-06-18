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
    }
}

module.exports = TagEvents;
