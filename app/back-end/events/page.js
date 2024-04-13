const ipcMain = require('electron').ipcMain;
const Page = require('../page.js');

/*
 * Events for the IPC communication regarding pages
 */

class PageEvents {
    constructor(appInstance) {
        // Load
        ipcMain.on('app-page-load', function (event, pageData) {
            let page = new Page(appInstance, pageData);
            let result = page.load();
            event.sender.send('app-page-loaded', result);
        });

        // Save
        ipcMain.on('app-page-save', function (event, pageData) {
            let page = new Page(appInstance, pageData);
            let result = page.save();
            event.sender.send('app-page-saved', result);
        });

        // Delete
        ipcMain.on('app-page-delete', function (event, pageData) {
            let result = false;

            for(let i = 0; i < pageData.ids.length; i++) {
                let page = new Page(appInstance, {
                    site: pageData.site,
                    id: pageData.ids[i]
                });

                result = page.delete();
            }

            event.sender.send('app-page-deleted', result);
        });

        // Delete
        ipcMain.on('app-page-duplicate', function (event, pageData) {
            let result = false;

            for(let i = 0; i < pageData.ids.length; i++) {
                let page = new Page(appInstance, {
                    site: pageData.site,
                    id: pageData.ids[i]
                });

                result = page.duplicate();
            }

            event.sender.send('app-page-duplicated', result);
        });

        // Status change
        ipcMain.on('app-page-status-change', function (event, pageData) {
            let result = false;

            for(let i = 0; i < pageData.ids.length; i++) {
                let page = new Page(appInstance, {
                    site: pageData.site,
                    id: pageData.ids[i]
                });

                result = page.changeStatus(pageData.status, pageData.inverse);
            }

            event.sender.send('app-page-status-changed', result);
        });

        // Cancelled edition
        ipcMain.on('app-page-cancel', function(event, pageData) {
            let page = new Page(appInstance, pageData);
            let result = page.checkAndCleanImages(true);
            event.sender.send('app-page-cancelled', result);
        });
    }
}

module.exports = PageEvents;
