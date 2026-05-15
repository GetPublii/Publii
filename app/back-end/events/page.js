const fs = require('fs');
const path = require('path');
const FileHelper = require('../helpers/file.js');
const ipcMain = require('electron').ipcMain;
const Page = require('../page.js');
const PathValidator = require('../helpers/path-validator.js');

const { isValidDirSegment, resolveValidPath } = PathValidator;

/*
 * Events for the IPC communication regarding pages
 */

class PageEvents {
    constructor(appInstance) {
        this.app = appInstance;

        // Load
        ipcMain.on('app-page-load', function (event, pageData) {
            if (!pageData || !isValidDirSegment(pageData.site)) {
                event.sender.send('app-page-loaded', false);
                return;
            }

            let page = new Page(appInstance, pageData);
            let result = page.load();
            event.sender.send('app-page-loaded', result);
        });

        // Save
        ipcMain.on('app-page-save', function (event, pageData) {
            if (!pageData || !isValidDirSegment(pageData.site)) {
                event.sender.send('app-page-saved', false);
                return;
            }

            let page = new Page(appInstance, pageData);
            let result = page.save();
            event.sender.send('app-page-saved', result);
        });

        // Delete
        ipcMain.on('app-page-delete', function (event, pageData) {
            if (!pageData || !isValidDirSegment(pageData.site) || !Array.isArray(pageData.ids)) {
                event.sender.send('app-page-deleted', false);
                return;
            }

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
            if (!pageData || !isValidDirSegment(pageData.site) || !Array.isArray(pageData.ids)) {
                event.sender.send('app-page-duplicated', false);
                return;
            }

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
            if (!pageData || !isValidDirSegment(pageData.site) || !Array.isArray(pageData.ids)) {
                event.sender.send('app-page-status-changed', false);
                return;
            }

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
            if (!pageData || !isValidDirSegment(pageData.site)) {
                event.sender.send('app-page-cancelled', false);
                return;
            }

            let page = new Page(appInstance, pageData);
            let result = page.checkAndCleanImages(true);
            event.sender.send('app-page-cancelled', result);
        });

        // Load pages hierarchy
        ipcMain.on('app-pages-hierarchy-load', (event, siteName) => {
            if (!isValidDirSegment(siteName)) {
                event.sender.send('app-pages-hierarchy-loaded', null);
                return;
            }

            let pagesFile = resolveValidPath(this.app.sitesDir, siteName, 'input', 'config', 'pages.config.json');

            if (pagesFile && fs.existsSync(pagesFile)) {
                let pagesHierarchy = JSON.parse(FileHelper.readFileSync(pagesFile, { encoding: 'utf8' }));
                pagesHierarchy = this.removeDuplicatedDataFromHierarchy(pagesHierarchy);
                event.sender.send('app-pages-hierarchy-loaded', pagesHierarchy);
            } else {
                event.sender.send('app-pages-hierarchy-loaded', null);
            }
        });

        // Save pages hierarchy
        ipcMain.on('app-pages-hierarchy-save', (event, pagesData) => {
            if (!pagesData || !isValidDirSegment(pagesData.siteName)) {
                return;
            }

            let pagesFile = resolveValidPath(this.app.sitesDir, pagesData.siteName, 'input', 'config', 'pages.config.json');

            if (!pagesFile) {
                return;
            }

            pagesData.hierarchy = this.removeNullDataFromHierarchy(pagesData.hierarchy);
            pagesData.hierarchy = this.removeDuplicatedDataFromHierarchy(pagesData.hierarchy);
            fs.writeFileSync(pagesFile, JSON.stringify(pagesData.hierarchy, null, 4), { encoding: 'utf8' });
        });

        // Update pages hierarchy during post conversion
        ipcMain.on('app-pages-hierarchy-update', (event, conversionData) => {
            if (!conversionData || !isValidDirSegment(conversionData.siteName)) {
                return;
            }

            let pagesFile = resolveValidPath(this.app.sitesDir, conversionData.siteName, 'input', 'config', 'pages.config.json');

            if (!pagesFile) {
                return;
            }

            let pagesHierarchy = JSON.parse(FileHelper.readFileSync(pagesFile, { encoding: 'utf8' }));

            for (let i = 0; i < conversionData.postIDs.length; i++) {
                pagesHierarchy.push({
                    id: conversionData.postIDs[i],
                    subpages: []
                });
            }

            pagesHierarchy = this.removeNullDataFromHierarchy(pagesHierarchy);
            pagesHierarchy = this.removeDuplicatedDataFromHierarchy(pagesHierarchy);
            fs.writeFileSync(pagesFile, JSON.stringify(pagesHierarchy, null, 4), { encoding: 'utf8' });
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
