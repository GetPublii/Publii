const fs = require('fs');
const path = require('path');
const ipcMain = require('electron').ipcMain;
const Image = require('../image.js');
const childProcess = require('child_process');
const PathValidator = require('../helpers/path-validator.js');

const { isValidDirSegment, resolveValidPath } = PathValidator;

/*
 * Events for the IPC communication regarding post images
 */

class ImageUploaderEvents {
    constructor(appInstance) {
        // Upload
        ipcMain.on('app-image-upload', function (event, imageData) {
            let imageProcess = childProcess.fork(__dirname + '/../workers/thumbnails/post-images');
            imageProcess.send({
                type: 'dependencies',
                appInstance: {
                    appConfig: appInstance.appConfig,
                    appDir: appInstance.appDir,
                    sitesDir: appInstance.sitesDir,
                    db: appInstance.db
                },
                imageData: imageData
            });

            imageProcess.on('message', function(data) {
                if(data.type === 'image-copied') {
                    imageProcess.send({
                        type: 'start-regenerating'
                    });
                } else if(data.type === 'finished') {
                    event.sender.send('app-image-uploaded', data.result);
                }
            });
        });

        // Remove
        ipcMain.on('app-image-upload-remove', function (event, filePath, siteName) {
            if (typeof filePath !== 'string' ||
                filePath.length === 0 ||
                filePath.indexOf('\0') !== -1 ||
                !isValidDirSegment(siteName)) {
                return;
            }

            let sitePath = resolveValidPath(appInstance.sitesDir, siteName);

            if (!sitePath) {
                return;
            }

            let resolvedFilePath;

            if (filePath.indexOf('media/plugins/') === 0) {
                resolvedFilePath = resolveValidPath(sitePath, 'input', filePath);
            } else {
                resolvedFilePath = path.resolve(filePath);

                if (resolvedFilePath !== sitePath &&
                    !resolvedFilePath.startsWith(sitePath + path.sep)) {
                    return;
                }
            }

            if (!resolvedFilePath) {
                return;
            }

            if (fs.existsSync(resolvedFilePath) && fs.statSync(resolvedFilePath).isFile()) {
                fs.unlinkSync(resolvedFilePath);
            }
        });
    }
}

module.exports = ImageUploaderEvents;
