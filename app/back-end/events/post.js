const ipcMain = require('electron').ipcMain;
const Post = require('../post.js');
const PathValidator = require('../helpers/path-validator.js');

const { isValidDirSegment } = PathValidator;

/*
 * Events for the IPC communication regarding single tags
 */

class PostEvents {
    constructor(appInstance) {
        // Load
        ipcMain.on('app-post-load', function (event, postData) {
            if (!postData || !isValidDirSegment(postData.site)) {
                event.sender.send('app-post-loaded', false);
                return;
            }

            let post = new Post(appInstance, postData);
            let result = post.load();
            event.sender.send('app-post-loaded', result);
        });

        // Save
        ipcMain.on('app-post-save', function (event, postData) {
            if (!postData || !isValidDirSegment(postData.site)) {
                event.sender.send('app-post-saved', false);
                return;
            }

            let post = new Post(appInstance, postData);
            let result = post.save();
            event.sender.send('app-post-saved', result);
        });

        // Delete
        ipcMain.on('app-post-delete', function (event, postData) {
            if (!postData || !isValidDirSegment(postData.site) || !Array.isArray(postData.ids)) {
                event.sender.send('app-post-deleted', false);
                return;
            }

            let result = false;

            for(let i = 0; i < postData.ids.length; i++) {
                let post = new Post(appInstance, {
                    site: postData.site,
                    id: postData.ids[i]
                });

                result = post.delete();
            }

            event.sender.send('app-post-deleted', result);
        });

        // Delete
        ipcMain.on('app-post-duplicate', function (event, postData) {
            if (!postData || !isValidDirSegment(postData.site) || !Array.isArray(postData.ids)) {
                event.sender.send('app-post-duplicated', false);
                return;
            }

            let result = false;

            for(let i = 0; i < postData.ids.length; i++) {
                let post = new Post(appInstance, {
                    site: postData.site,
                    id: postData.ids[i]
                });

                result = post.duplicate();
            }

            event.sender.send('app-post-duplicated', result);
        });

        // Status change
        ipcMain.on('app-post-status-change', function (event, postData) {
            if (!postData || !isValidDirSegment(postData.site) || !Array.isArray(postData.ids)) {
                event.sender.send('app-post-status-changed', false);
                return;
            }

            let result = false;

            for(let i = 0; i < postData.ids.length; i++) {
                let post = new Post(appInstance, {
                    site: postData.site,
                    id: postData.ids[i]
                });

                result = post.changeStatus(postData.status, postData.inverse);
            }

            event.sender.send('app-post-status-changed', result);
        });

        // Cancelled edition
        ipcMain.on('app-post-cancel', function(event, postData) {
            if (!postData || !isValidDirSegment(postData.site)) {
                event.sender.send('app-post-cancelled', false);
                return;
            }

            let post = new Post(appInstance, postData);
            let result = post.checkAndCleanImages(true);
            event.sender.send('app-post-cancelled', result);
        });
    }
}

module.exports = PostEvents;
