const fs = require('fs-extra');
const path = require('path');
const ipcMain = require('electron').ipcMain;
const isBinaryFileSync = require('isbinaryfile').isBinaryFileSync;
const PathValidator = require('../helpers/path-validator.js');

/*
 * Events for the IPC communication regarding file manager
 */

const { isValidDirSegment, isValidDirPath, isValidFileName, resolveValidPath } = PathValidator;

class FileManagerEvents {
    /**
     * Creating an events instance
     *
     * @param appInstance
     */
    constructor (appInstance) {
        let self = this;
        this.app = appInstance;

        /*
         * List files in a specific directory
         */
        ipcMain.on('app-file-manager-list', function(event, config) {
            self.listFiles(config, event.sender);
        });

        /*
         * Upload file
         */
        ipcMain.on('app-file-manager-upload', function(event, config) {
            self.uploadFile(config, event.sender);
        });

        /*
         * Create file
         */
        ipcMain.on('app-file-manager-create', function(event, config) {
            self.createFile(config, event.sender);
        });

        /*
         * Delete files
         */
        ipcMain.on('app-file-manager-delete', function(event, config) {
            self.deleteFiles(config, event.sender);
        });

        /*
         * Check filename
         */
        ipcMain.on('app-file-manager-check-name', function(event, config) {
            self.checkFilename(config, event.sender);
        });
    }

    /**
     * Listing files from a specific directory
     *
     * @param config
     * @param sender
     */
    listFiles(config, sender) {
        if (!config || typeof config !== 'object' ||
            !isValidDirSegment(config.siteName) ||
            !isValidDirPath(config.dirPath)) {
            sender.send('app-file-manager-listed', []);
            return;
        }

        let siteBase = path.join(this.app.sitesDir, config.siteName, 'input');
        let basePath = config.dirPath.length === 0
            ? resolveValidPath(siteBase)
            : resolveValidPath(siteBase, config.dirPath);

        if (!basePath || !fs.existsSync(basePath)) {
            sender.send('app-file-manager-listed', []);
            return;
        }

        let files = fs.readdirSync(basePath);
        let output = [];

        for(let file of files) {
            if(file === '.DS_Store' || file === 'Thumbs.db') {
                continue;
            }

            let fullPath = path.join(basePath, file);
            let fileStats = fs.statSync(fullPath);
            let isDirectory = fileStats.isDirectory();

            output.push({
                name: file,
                fullPath: fullPath,
                icon: this.getIcon(path.parse(file).ext, isDirectory),
                size: fileStats.size,
                isBinary: false,
                isCatalog: isDirectory,
                createdAt: fileStats.ctime,
                modifiedAt: fileStats.mtime
            });
        }

        this.checkIfIsBinaryFile(output, 0, sender);
    }

    /**
     * Checks if files are binary
     *
     * @param output
     * @param iterator
     * @param sender
     */
    checkIfIsBinaryFile(output, iterator, sender) {
        if(!output.length || iterator >= output.length) {
            sender.send('app-file-manager-listed', output);
            return;
        }

        if (output[iterator] && output[iterator].fullPath && fs.lstatSync(output[iterator].fullPath).isFile()) {
            output[iterator].isBinary = isBinaryFileSync(output[iterator].fullPath);
        }

        iterator++;
        this.checkIfIsBinaryFile(output, iterator, sender);
    }

    /**
     * Returns icon file string according to given extension
     *
     * @param extension
     * @return icon string
     */
    getIcon(extension, isDirectory = false) {
        if (isDirectory) {
            return 'catalog';
        }

        extension = extension.replace('.', '');

        switch(extension) {
            case '':
            case 'txt':
            case 'rdf':
                return 'txt';
            case 'doc':
                return 'doc';
            case 'docx':
                return 'docx';
            case 'xls':
                return 'xls';
            case 'xlsx':
                return 'xlsx';
            case 'pdf':
                return 'pdf';
            case 'asp':
            case 'aspx': 
            case 'cfm':
            case 'cgi':
            case 'pl':
            case 'jsp':
            case 'php':
            case 'py':
            case 'rss':
            case 'xhtml':
            case 'vue':
            case 'scss':
                return 'code';
            case 'js':
                return 'js'; 
            case 'css':
                return 'css';
            case 'html':
                return 'html';
            case 'htm':
                return 'htm';
            case 'xml':
                return 'xml';
            case 'webp':
                return 'webp';
            case 'bmp':
                return 'img';
            case 'tiff':
                return 'tiff';
            case 'avif':
                return 'avif';
            case 'jpg':
                return 'jpg';
            case 'jpeg':
                return 'jpeg';
            case 'png':
                return 'png';
            case 'svg':
                return 'svg';
            case 'gif':
                return 'gif';
            case 'webm':
            case 'ogg': 
            case 'flv':
            case 'wmv':
            case 'm4v':
            case '3gp':
            case '3g2':
            case 'mkv':
            case 'mpg':
            case 'mpeg':
            case 'rm':
            case 'swf':
            case 'vob':
                return 'video';
            case 'avi':
                return 'avi';
            case 'mov':
                return 'mov';
            case 'mp4':
                return 'mp4';
            case 'tar':
            case 'zip':            
            case 'gz':
            case 'iso':
            case 'dmg':
            case 'bz2':
            case 'lz':          
            case 'ace':
            case 'apk':
            case 'jar':
                return 'zip';
            case '7z':
                return '7z';
            case 'rar':
                return 'rar';
            case 'mp3':
            case '3gp':
            case 'aac':
            case 'aax':
            case 'flac':
            case 'm4p':
            case 'ogg':
            case 'wav':
            case 'wma':
            case 'vox':
                return 'music';            
            default:
                return 'unknown';
        }
    }

    /**
     * Move file from a given location to specified catalog
     *
     * @param config
     * @param sender
     */
    uploadFile(config, sender) {
        if (!config || typeof config !== 'object' ||
            !isValidDirSegment(config.siteName) ||
            !isValidDirPath(config.dirPath) ||
            typeof config.fileToMove !== 'string') {
            sender.send('app-file-manager-uploaded', false);
            return;
        }

        let fileName = path.parse(config.fileToMove).base;

        if (!isValidFileName(fileName)) {
            sender.send('app-file-manager-uploaded', false);
            return;
        }

        let siteBase = path.join(this.app.sitesDir, config.siteName, 'input');
        let fullPath = config.dirPath.length === 0
            ? resolveValidPath(siteBase, fileName)
            : resolveValidPath(siteBase, config.dirPath, fileName);

        if (!fullPath) {
            sender.send('app-file-manager-uploaded', false);
            return;
        }

        if(fs.existsSync(fullPath)) {
            sender.send('app-file-manager-uploaded', false);
            return;
        }

        fs.copySync(config.fileToMove, fullPath);
        sender.send('app-file-manager-uploaded', true);
    }

    /**
     * Create new file
     *
     * @param config
     * @param sender
     */
    createFile(config, sender) {
        if (!config || typeof config !== 'object' ||
            !isValidDirSegment(config.siteName) ||
            !isValidDirPath(config.dirPath) ||
            !isValidFileName(config.fileToSave)) {
            sender.send('app-file-manager-created', false);
            return;
        }

        let siteBase = path.join(this.app.sitesDir, config.siteName, 'input');
        let filePath = config.dirPath.length === 0
            ? resolveValidPath(siteBase, config.fileToSave)
            : resolveValidPath(siteBase, config.dirPath, config.fileToSave);

        if (!filePath) {
            sender.send('app-file-manager-created', false);
            return;
        }

        if(fs.existsSync(filePath)) {
            sender.send('app-file-manager-created', false);
            return;
        }

        fs.writeFileSync(filePath, '', {'encoding': 'utf8'})
        sender.send('app-file-manager-created', true);
    }

    /**
     * Delete files
     *
     * @param config
     * @param sender
     */
    deleteFiles(config, sender) {
        if (!config || typeof config !== 'object' ||
            !isValidDirSegment(config.siteName) ||
            !isValidDirPath(config.dirPath) ||
            !Array.isArray(config.filesToDelete)) {
            sender.send('app-file-manager-deleted', false);
            return;
        }

        let siteBase = path.join(this.app.sitesDir, config.siteName, 'input');

        for(let file of config.filesToDelete) {
            if (!isValidFileName(file)) {
                continue;
            }

            let fullPath = config.dirPath.length === 0
                ? resolveValidPath(siteBase, file)
                : resolveValidPath(siteBase, config.dirPath, file);

            if (!fullPath) {
                continue;
            }

            if(fs.existsSync(fullPath)) {
                fs.unlinkSync(fullPath);
            }
        }

        sender.send('app-file-manager-deleted', true);
    }

    /**
     * Check if filename exists
     *
     * @param config
     * @param sender
     */
    checkFilename(config, sender) {
        if (!config || typeof config !== 'object' ||
            !isValidDirSegment(config.siteName) ||
            !isValidDirPath(config.dirPath) ||
            !isValidFileName(config.filenameToCheck)) {
            sender.send('app-file-manager-checked-name', false);
            return;
        }

        let siteBase = path.join(this.app.sitesDir, config.siteName, 'input');
        let fullPath = config.dirPath.length === 0
            ? resolveValidPath(siteBase, config.filenameToCheck)
            : resolveValidPath(siteBase, config.dirPath, config.filenameToCheck);

        if (!fullPath) {
            sender.send('app-file-manager-checked-name', false);
            return;
        }

        sender.send('app-file-manager-checked-name', fs.existsSync(fullPath));
    }
}

module.exports = FileManagerEvents;
