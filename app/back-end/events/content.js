const ipcMain = require('electron').ipcMain;
const ContentFields = require('../content-fields.js');
const ContentDetails = require('../content-details.js');
const PathValidator = require('../helpers/path-validator.js');

const { isValidDirSegment } = PathValidator;

/*
 * Events for the IPC communication regarding content items
 */

class ContentEvents {
    constructor(appInstance) {
        // Update fields of a single item
        ipcMain.handle('app-content-fields-update', function (event, contentData) {
            return ContentEvents.runUpdate(appInstance, contentData, contentFields => contentFields.update(
                contentData.table,
                contentData.itemID,
                contentData.fieldsToUpdate,
                contentData.options
            ));
        });

        // Update fields of many items in one transaction
        ipcMain.handle('app-content-fields-batch-update', function (event, contentData) {
            return ContentEvents.runUpdate(appInstance, contentData, contentFields => contentFields.updateBatch(
                contentData.table,
                contentData.items,
                contentData.options
            ));
        });

        // Read details of posts and pages (featured image, excerpt, images) - nothing is changed
        ipcMain.handle('app-content-details-read', function (event, contentData) {
            return ContentEvents.runRead(appInstance, contentData, contentDetails => contentDetails.read(
                contentData.itemType,
                contentData.options
            ));
        });
    }

    static runRead (appInstance, contentData, callback) {
        if (!contentData || !isValidDirSegment(contentData.site)) {
            return {
                status: 'error',
                errorCode: 'invalid-site',
                error: 'Invalid site name'
            };
        }

        try {
            let contentDetails = new ContentDetails(appInstance, {
                site: contentData.site
            });

            return callback(contentDetails);
        } catch (e) {
            return {
                status: 'error',
                errorCode: 'unexpected-error',
                error: e.message
            };
        }
    }

    static runUpdate (appInstance, contentData, callback) {
        if (!contentData || !isValidDirSegment(contentData.site)) {
            return {
                status: 'error',
                errorCode: 'invalid-site',
                error: 'Invalid site name'
            };
        }

        try {
            let contentFields = new ContentFields(appInstance, {
                site: contentData.site
            });

            return callback(contentFields);
        } catch (e) {
            return {
                status: 'error',
                errorCode: 'unexpected-error',
                error: e.message
            };
        }
    }
}

module.exports = ContentEvents;
