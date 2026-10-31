const fs = require('fs');

/**
 * FileHelper is a single entry point for synchronous file reads.
 *
 * It delegates to fs.readFileSync, which already closes the descriptor it opens
 * (also on errors). Do not replace it with fs.openSync + fs.readFileSync(fd):
 * for files inside app.asar Electron serves fs.openSync from a temporary copy
 * in the system temp dir, cached for the whole process lifetime. Once the OS
 * cleans the temp dir, every next read fails with ENOENT until the app restarts.
 * fs.readFileSync(path) reads asar entries directly from the archive.
 */
class FileHelper {
    /**
     * Reads a file synchronously.
     * @param {string|Buffer|URL|integer} path - filename or file descriptor (a descriptor is not closed)
     * @param {Object|string} [options] - options or encoding
     * @returns {string|Buffer}
     */
    static readFileSync(path, options) {
        return fs.readFileSync(path, options);
    }
}

module.exports = FileHelper;
