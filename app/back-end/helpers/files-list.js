const fs = require('fs');
const path = require('path');

/**
 * Recursively lists given paths
 */
async function listAll (paths) {
    let results = [];

    for (let dir of paths) {
        walk(path.join(dir), results);
    }

    return results;
}

function walk (itemPath, results) {
    let isDir = fs.statSync(itemPath).isDirectory();
    results.push({ path: itemPath, mode: { dir: isDir } });

    if (isDir) {
        for (let entry of fs.readdirSync(itemPath)) {
            walk(path.join(itemPath, entry), results);
        }
    }
}

module.exports = listAll;
