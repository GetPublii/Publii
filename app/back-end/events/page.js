const fs = require('fs');
const path = require('path');
const ipcMain = require('electron').ipcMain;
const Page = require('../page.js');

/*
 * Events for the IPC communication regarding pages
 */

class PageEvents {
    constructor(appInstance) {
        this.app = appInstance;

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

        // Load pages hierarchy
        ipcMain.on('app-pages-hierarchy-load', (event, siteName) => {
            let pagesFile = path.join(this.app.sitesDir, siteName, 'input', 'config', 'pages.config.json');

            if (fs.existsSync(pagesFile)) {
                let pagesHierarchy = JSON.parse(fs.readFileSync(pagesFile, { encoding: 'utf8' }));
                pagesHierarchy = this.removeDuplicatedDataFromHierarchy(pagesHierarchy);
                event.sender.send('app-pages-hierarchy-loaded', pagesHierarchy);
            } else {
                event.sender.send('app-pages-hierarchy-loaded', null);
            }
        });

        // Save pages hierarchy
        ipcMain.on('app-pages-hierarchy-save', (event, pagesData) => {
            let pagesFile = path.join(this.app.sitesDir, pagesData.siteName, 'input', 'config', 'pages.config.json');
            pagesData.hierarchy = this.removeNullDataFromHierarchy(pagesData.hierarchy);
            pagesData.hierarchy = this.removeDuplicatedDataFromHierarchy(pagesData.hierarchy);
            fs.writeFileSync(pagesFile, JSON.stringify(pagesData.hierarchy, null, 4), { encoding: 'utf8' });
        });

        // Update pages hierarchy during post conversion
        ipcMain.on('app-pages-hierarchy-update', (event, postIDs) => {
            let pagesFile = path.join(this.app.sitesDir, pagesData.siteName, 'input', 'config', 'pages.config.json');
            let pagesHierarchy = JSON.parse(fs.readFileSync(pagesFile, { encoding: 'utf8' }));

            for (let i = 0; i < postIDs.length; i++) {
                pagesHierarchy.push({
                    id: postIDs[i],
                    subpages: []
                });
            }
            
            pagesHierarchy = this.removeNullDataFromHierarchy(pagesHierarchy);
            pagesHierarchy = this.removeDuplicatedDataFromHierarchy(pagesHierarchy);
            fs.writeFileSync(pagesFile, JSON.stringify(updatedHierarchy, null, 4), { encoding: 'utf8' });
        });
    }

    removeNullDataFromHierarchy (data) {
        return data
            .filter(item => item !== null)
            .map(item => ({
                ...item,
                subpages: item.subpages ? this.removeNullDataFromHierarchy(item.subpages) : []
            }));
    }

    removeDuplicatedDataFromHierarchy (data) {
        let existingIds = new Set();

        return data.filter(item => {
            if (existingIds.has(item.id)) {
                return false;
            }

            existingIds.add(item.id);
            return true;
        });      
    }
}

module.exports = PageEvents;
