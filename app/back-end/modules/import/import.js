/*
 * Class used to import data from WP to Publii using WXR file
 */

const fs = require('fs-extra');
const path = require('path');
const WxrParser = require('./wxr-parser');
const Database = require('better-sqlite3');
const DBUtils = require('../../helpers/db.utils.js');

class Import {
    /**
     * Creates an instance
     *
     * @param appInstance
     * @param siteName
     * @param filePath
     */
    constructor(appInstance, siteName, filePath) {
        this.appInstance = appInstance;
        this.siteName = siteName;
        this.filePath = filePath;
        this.connectWithDB();

        this.parser = new WxrParser(appInstance, siteName);
        this.parser.loadFile(this.filePath);
    }

    /**
     * Creates DB instance for the importer
     */
    connectWithDB() {
        if(!this.appInstance) {
            return;
        }

        const dbPath = path.join(this.appInstance.sitesDir, this.siteName, 'input', 'db.sqlite');

        if (this.appInstance.db) {
            try {
                this.appInstance.db.close();
            } catch (e) {
                console.log('[WP IMPORT] DB already closed');
            }
        }

        this.appInstance.db = new DBUtils(new Database(dbPath));
    }

    /**
     * Checks the file
     *
     * @returns {*}
     */
    checkFile() {
        if (this.parser.isWXR()) {
            try {
                let result = this.parser.getWxrStats();

                if (result) {
                    return {
                        status: 'success',
                        message: result
                    };
                }

                return {
                    status: 'error',
                    message: 'An error occurred during parsing selected WXR file'
                };
            } catch (e) {
                return {
                    status: 'error',
                    message: 'An error occurred during parsing selected WXR file'
                };
            }
        }

        return {
            status: 'error',
            message: 'Selected file is not a proper WXR file.'
        };
    }

    /**
     * Imports data from the given WXR file
     *
     * @param importAuthors
     * @param usedTaxonomy
     * @param autop
     * @param postTypes
     * @param slugStrategy
     * @param importMenus
     * @param seoProvider
     * @returns {{status: string, message: boolean}}
     */
    async importFile(importAuthors, usedTaxonomy, autop, postTypes, slugStrategy = 'wordpress', importMenus = true, seoProvider = 'auto') {
        console.log('(i) Import started');
        this.parser.setConfig(importAuthors, usedTaxonomy, autop, postTypes, slugStrategy, importMenus, seoProvider);
        this.parser.loadExistingImportMappings();

        let transactionStarted = false;

        try {
            this.appInstance.db.exec('BEGIN IMMEDIATE');
            transactionStarted = true;
            this.parser.importAuthorsData();
            this.parser.importTagsData();
            this.parser.getImageURLs();
            this.parser.importPostsData();
            this.parser.importPagesData();
            this.parser.rewriteImportedInternalLinks();
            this.parser.applyImportedSeoCanonicals();
            this.appInstance.db.exec('COMMIT');
            transactionStarted = false;

            this.parser.savePagesHierarchy();
            this.parser.importMenusData();
            await this.parser.importImages();
            this.parser.buildImportReport();
            console.log('(i) Import is done');

            return {
                status: 'success',
                message: true,
                summary: this.parser.getSummary()
            };
        } catch (e) {
            if (transactionStarted) {
                try {
                    this.appInstance.db.exec('ROLLBACK');
                } catch (rollbackError) {
                    console.log('[WP IMPORT] Rollback failed:', rollbackError);
                }
            }

            throw e;
        }
    }

    closeDatabase() {
        if (!this.appInstance || !this.appInstance.db) {
            return;
        }

        try {
            this.appInstance.db.close();
        } catch (e) {
            console.log('[WP IMPORT] DB already closed');
        }
    }
}

module.exports = Import;
