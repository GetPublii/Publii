/*
 * ZIP archives helper - creates and extracts ZIP files using fflate
 */

const fs = require('fs');
const path = require('path');
const fflate = require('fflate');

// Limits applied when extracting user-provided ZIP files
const MAX_EXTRACTED_ENTRIES = 10000;
const MAX_EXTRACTED_SIZE = 1024 * 1024 * 1024; // 1 GB

// File types stored without compression when creating ZIP archives
const STORED_EXTENSIONS = [
    '.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif',
    '.mp4', '.webm', '.mp3', '.ogg', '.m4a',
    '.woff', '.woff2', '.zip', '.gz'
];

class ZipHelper {
    /**
     * Extracts a ZIP file into the given directory - entries which would escape the target directory cause an error (user-provided files)
     *
     * @param zipFilePath - path to the ZIP file
     * @param targetDir - directory where the ZIP content will be written
     */
    static extractZipSafely (zipFilePath, targetDir) {
        let entriesCount = 0;
        let totalSize = 0;
        let zipContent = fflate.unzipSync(fs.readFileSync(zipFilePath), {
            filter: entryInfo => {
                entriesCount++;
                totalSize += entryInfo.originalSize;

                if (entriesCount > MAX_EXTRACTED_ENTRIES || totalSize > MAX_EXTRACTED_SIZE) {
                    throw new Error('ZIP file exceeds the allowed size limits');
                }

                return true;
            }
        });
        let safeBase = path.resolve(targetDir);
        let entryNames = Object.keys(zipContent);

        fs.mkdirSync(safeBase, { recursive: true });

        for (let entryName of entryNames) {
            if (path.isAbsolute(entryName) || entryName.split(/[/\\]+/).some(segment => segment === '..')) {
                throw new Error('ZIP file contains an invalid entry path: ' + entryName);
            }

            let entryPath = path.resolve(safeBase, entryName);

            if (entryPath !== safeBase && !entryPath.startsWith(safeBase + path.sep)) {
                throw new Error('ZIP file contains an invalid entry path: ' + entryName);
            }

            if (entryName.endsWith('/')) {
                fs.mkdirSync(entryPath, { recursive: true });
                continue;
            }

            fs.mkdirSync(path.dirname(entryPath), { recursive: true });
            fs.writeFileSync(entryPath, zipContent[entryName]);
        }
    }

    /**
     * Creates a ZIP archive from the given directory contents - files are streamed one by one, so memory usage stays flat regardless of the directory size
     *
     * @param sourceDir - directory to compress
     * @param outputFilePath - path of the ZIP file to create
     * @returns {Promise}
     */
    static createZipFromDirectory (sourceDir, outputFilePath) {
        return new Promise((resolve, reject) => {
            let output = fs.createWriteStream(outputFilePath);
            let zip = new fflate.Zip();
            let backpressure = false;
            let failed = false;

            let fail = err => {
                if (failed) {
                    return;
                }

                failed = true;
                output.destroy();
                reject(err);
            };

            output.on('error', fail);
            output.on('drain', () => { backpressure = false; });
            output.on('close', () => {
                if (!failed) {
                    resolve();
                }
            });

            zip.ondata = (err, data, final) => {
                if (err) {
                    return fail(err);
                }

                if (data.length && !output.write(data)) {
                    backpressure = true;
                }

                if (final) {
                    output.end();
                }
            };

            let files = [];
            let emptyDirs = [];
            let collectEntries = (dir, prefix) => {
                let items = fs.readdirSync(dir, { withFileTypes: true });

                if (!items.length && prefix !== '') {
                    emptyDirs.push(prefix + '/');
                }

                for (let item of items) {
                    let itemPath = path.join(dir, item.name);
                    let entryName = prefix === '' ? item.name : prefix + '/' + item.name;

                    if (item.isDirectory()) {
                        collectEntries(itemPath, entryName);
                    } else if (item.isFile()) {
                        files.push({ path: itemPath, name: entryName });
                    }
                }
            };

            let addNextFile = index => {
                if (failed) {
                    return;
                }

                if (index >= files.length) {
                    zip.end();
                    return;
                }

                let file = files[index];
                let extension = path.extname(file.name).toLowerCase();
                let entry = STORED_EXTENSIONS.includes(extension)
                    ? new fflate.ZipPassThrough(file.name)
                    : new fflate.ZipDeflate(file.name);
                zip.add(entry);

                let readStream = fs.createReadStream(file.path);
                readStream.on('error', fail);
                readStream.on('data', chunk => {
                    if (failed) {
                        readStream.destroy();
                        return;
                    }

                    entry.push(chunk);

                    if (backpressure) {
                        readStream.pause();
                        output.once('drain', () => readStream.resume());
                    }
                });
                readStream.on('end', () => {
                    entry.push(new Uint8Array(0), true);
                    addNextFile(index + 1);
                });
            };

            try {
                collectEntries(path.resolve(sourceDir), '');
            } catch (err) {
                return fail(err);
            }

            for (let dirName of emptyDirs) {
                let dirEntry = new fflate.ZipPassThrough(dirName);
                zip.add(dirEntry);
                dirEntry.push(new Uint8Array(0), true);
            }

            addNextFile(0);
        });
    }
}

module.exports = ZipHelper;
