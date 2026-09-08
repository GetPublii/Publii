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
        ipcMain.handle('app-image:upload', (event, imageData) => {
            return this.uploadImage(appInstance, imageData);
        });

        // Retain the event API for existing editor and plugin integrations.
        ipcMain.on('app-image-upload', async (event, imageData) => {
            const result = await this.uploadImage(appInstance, imageData);

            if (!event.sender.isDestroyed()) {
                event.sender.send('app-image-uploaded', result);
            }
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

    uploadImage(appInstance, imageData) {
        return new Promise(resolve => {
            let imageProcess;
            let finished = false;
            const failure = {
                error: true,
                translation: 'core.images.imageUnprocessable',
                file: typeof imageData?.path === 'string' ? path.basename(imageData.path) : ''
            };
            const finish = result => {
                if (finished) {
                    return;
                }

                finished = true;
                resolve(result);
            };

            try {
                imageProcess = childProcess.fork(__dirname + '/../workers/thumbnails/post-images');
                imageProcess.on('error', () => finish(failure));
                imageProcess.on('exit', () => finish(failure));
                imageProcess.on('disconnect', () => finish(failure));
                imageProcess.on('message', data => {
                    if (finished || !data) {
                        return;
                    }

                    if (data.type === 'image-copied') {
                        imageProcess.send({ type: 'start-regenerating' }, error => {
                            if (error) {
                                finish(failure);
                            }
                        });
                    } else if (data.type === 'finished') {
                        finish(data.result || failure);
                    }
                });
                imageProcess.send({
                    type: 'dependencies',
                    appInstance: {
                        appConfig: appInstance.appConfig,
                        appDir: appInstance.appDir,
                        sitesDir: appInstance.sitesDir
                    },
                    imageData
                }, error => {
                    if (error) {
                        finish(failure);
                    }
                });
            } catch (error) {
                finish(failure);
            }
        });
    }
}

module.exports = ImageUploaderEvents;
