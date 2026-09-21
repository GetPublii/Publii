const fs = require('fs');
const path = require('path');

/**
 * Returns size of all files in the directory (in bytes) - 0 for a missing directory.
 * Symlinks are neither followed nor counted.
 *
 * @param dir
 * @returns {Promise<number>}
 */
async function getDirectorySize (dir) {
    let entries;
    let size = 0;

    try {
        entries = await fs.promises.readdir(dir, { withFileTypes: true });
    } catch (error) {
        return 0;
    }

    for (let entry of entries) {
        let entryPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            size += await getDirectorySize(entryPath);
            continue;
        }

        if (!entry.isFile()) {
            continue;
        }

        try {
            size += (await fs.promises.stat(entryPath)).size;
        } catch (error) {
            // File removed in the meantime
        }
    }

    return size;
}

module.exports = getDirectorySize;
