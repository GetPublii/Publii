const fs = require('fs');
const path = require('path');
const ipcMain = require('electron').ipcMain;
const Image = require('../image.js');
const childProcess = require('child_process');

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
            let sitePath = path.join(appInstance.sitesDir, siteName);

            if (filePath.indexOf('media/plugins/') === 0) {
                filePath = path.join(sitePath, 'input', filePath);
            }

            if (filePath.indexOf(sitePath) !== 0) {
                return;
            }

            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        });
    }
}

module.exports = ImageUploaderEvents;
