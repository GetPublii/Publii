/*
 * Model base class
 */

const fs = require('fs');
const path = require('path');

class Model {
    /**
     * Model constructor
     *
     * @param appInstance
     * @param data
     */
    constructor(appInstance, data) {
        this.application = appInstance;
        this.db = this.application.db;
        this.site = data.site;
        this.appDir = this.application.appDir;
        this.siteDir = path.join(this.application.sitesDir, this.site);
        this.dbPath = path.join(this.siteDir, 'input', 'db.sqlite');
    }

    /**
     * Saves DB into file
     */
    storeDB() {
        // Save db
        let data = this.db.export();
        let output = new Buffer(data);
        fs.writeFileSync(this.dbPath, output);
    }

    /**
     * Escapes given string
     *
     * @param stringToEscape
     * @returns {*}
     */
    escape(stringToEscape) {
        if(stringToEscape == '') {
            return stringToEscape;
        }

        return stringToEscape
            .replace(/\\/g, "\\\\")
            .replace(/\'/g, "\\\'")
            .replace(/\"/g, "\\\"")
            .replace(/\n/g, "\\\n")
            .replace(/\r/g, "\\\r")
            .replace(/\x00/g, "\\\x00")
            .replace(/\x1a/g, "\\\x1a");
    }

    /**
     * Get results array or empty array
     *
     * @param results
     * @returns {Array}
     */
    getResults(results) {
        if(results[0]) {
            return results[0].values;
        }

        return [];
    }
}

module.exports = Model;
