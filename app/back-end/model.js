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
}

module.exports = Model;
