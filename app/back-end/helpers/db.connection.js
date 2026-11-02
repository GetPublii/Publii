/*
 * Opens SQLite database using the built-in node:sqlite module
 */
const DATABASE_OPTIONS = {
    // The same busy timeout as better-sqlite3 had - the site DB is shared between the main process and workers
    timeout: 5000,
    // better-sqlite3 ignored named params which are not used in the query
    allowUnknownNamedParameters: true
};

function openDatabase (dbPath) {
    // Loaded on demand, so modules can be required in specs running on Node.js without node:sqlite
    const { DatabaseSync } = require('node:sqlite');
    return new DatabaseSync(dbPath, DATABASE_OPTIONS);
}

module.exports = openDatabase;
