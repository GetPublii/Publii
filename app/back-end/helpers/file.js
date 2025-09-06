const fs = require('fs');

/**
 * FileHelper wraps fs.readFileSync to avoid leaking file descriptors.
 */
class FileHelper {
    /**
     * Reads a file synchronously, ensuring the file descriptor is closed.
     * @param {string|Buffer|URL|integer} path - filename or file descriptor
     * @param {Object|string} [options] - options or encoding
     * @returns {string|Buffer}
     */
    static readFileSync(path, options) {
        let fd;
        try {
            fd = fs.openSync(path, 'r');
            return fs.readFileSync(fd, options);
        } finally {
            if (fd !== undefined) {
                try { fs.closeSync(fd); } catch (e) { /* ignore */ }
            }
        }
    }
}

module.exports = FileHelper;
