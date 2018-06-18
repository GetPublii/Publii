const fs = require('fs-extra');
const path = require('path');
const ipcMain = require('electron').ipcMain;
const isBinaryFile = require('isbinaryfile');

/*
 * Events for the IPC communication regarding file manager
 */

class FileManagerEvents {
    /**
     * Creating an events instance
     *
     * @param appInstance
     */
    constructor(appInstance) {
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
        let siteName = config.siteName;
        let dirPath = config.dirPath;
        let basePath = path.join(this.app.sitesDir, siteName, 'input', dirPath);
        let files = fs.readdirSync(basePath);
        let output = [];
        let iterator = 0;

        for(let file of files) {
            if(file === '.DS_Store' || file === 'Thumbs.db') {
                continue;
            }

            let fullPath = path.join(basePath, file);
            let fileStats = fs.statSync(fullPath);

            if(!fileStats.isFile()) {
                continue;
            }

            output.push({
                name: file,
                fullPath: fullPath,
                icon: this.getIcon(path.parse(file).ext),
                size: fileStats.size,
                isBinary: false,
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
        let self = this;

        if(!output.length || iterator >= output.length) {
            sender.send('app-file-manager-listed', output);
            return;
        }

        isBinaryFile(output[iterator].fullPath, function(err, result) {
            if(err) {
                output[iterator].isBinary = false;
            } else {
                output[iterator].isBinary = result;
            }

            iterator++;
            self.checkIfIsBinaryFile(output, iterator, sender);
        });
    }

    /**
     * Returns icon file string according to given extension
     *
     * @param extension
     * @return icon string
     */
    getIcon(extension) {
        extension = extension.replace('.', '');

        switch(extension) {
            case '':
            case 'txt':
            case 'rdf':
            case 'doc':
            case 'docx':
            case 'xls':
            case 'xlsx':
                return 'txt';
            case 'js':
            case 'css':
            case 'php':
            case 'html':
            case 'htm':
            case 'xml':
                return 'code';
            case 'jpg':
            case 'jpeg':
            case 'png':
            case 'webp':
            case 'bmp':
            case 'gif':
            case 'svg':
                return 'img';
            case 'mp4':
            case 'webm':
            case 'ogg':
            case 'flv':
            case 'avi':
            case 'mov':
            case 'wmv':
            case 'm4v':
            case '3gp':
                return 'video';
            case 'tar':
            case 'zip':
            case 'rar':
            case 'gz':
            case 'iso':
            case 'dmg':
            case 'bz2':
            case 'lz':
            case '7z':
            case 'ace':
            case 'apk':
            case 'jar':
                return 'zip';
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
            case 'pdf':
                return 'pdf';
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
        let siteName = config.siteName;
        let dirPath = config.dirPath;
        let fileToMove = config.fileToMove;
        let fileName = path.parse(fileToMove).base;
        let destinationPath = path.join(this.app.sitesDir, siteName, 'input', dirPath);
        let fullPath = path.join(destinationPath, fileName);

        if(fs.existsSync(fullPath)) {
            sender.send('app-file-manager-uploaded', false);
        }

        fs.copySync(fileToMove, fullPath);
        sender.send('app-file-manager-uploaded', true);
    }

    /**
     * Create new file
     *
     * @param config
     * @param sender
     */
    createFile(config, sender) {
        let siteName = config.siteName;
        let dirPath = config.dirPath;
        let fileToSave = config.fileToSave;
        let filePath = path.join(this.app.sitesDir, siteName, 'input', dirPath, fileToSave);

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
        let siteName = config.siteName;
        let dirPath = config.dirPath;
        let filesToDelete = config.filesToDelete;

        for(let file of filesToDelete) {
            let fullPath = path.join(this.app.sitesDir, siteName, 'input', dirPath, file);

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
        let siteName = config.siteName;
        let dirPath = config.dirPath;
        let filenameToCheck = config.filenameToCheck;
        let fullPath = path.join(this.app.sitesDir, siteName, 'input', dirPath, filenameToCheck);
        let result = fs.existsSync(fullPath);

        sender.send('app-file-manager-checked-name', result);
    }
}

module.exports = FileManagerEvents;
