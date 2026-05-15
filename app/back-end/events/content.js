const ipcMain = require('electron').ipcMain;
const Model = require('../model.js');
const PathValidator = require('../helpers/path-validator.js');

const { isValidDirSegment } = PathValidator;

/*
 * Events for the IPC communication regarding content items
 */

class ContentEvents {
    constructor(appInstance) {
        // Save
        ipcMain.on('app-content-fields-update', function (event, contentData) {
            if (!contentData || !isValidDirSegment(contentData.site)) {
                event.sender.send('app-content-fields-updated', false);
                return;
            }

            let model = new Model(appInstance, {
                site: contentData.site
            });

            let result = model.updateField(contentData.table, contentData.itemID, contentData.fieldsToUpdate);
            event.sender.send('app-content-fields-updated', result);
        });
    }
}

module.exports = ContentEvents;
