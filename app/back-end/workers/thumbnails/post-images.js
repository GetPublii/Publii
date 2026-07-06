const Image = require('./../../image.js');
const normalizePath = require('normalize-path');
const sizeOf = require('image-size');
const fs = require('fs');

let result = false;
let appInstance = false;
let imageData = false;
let image = false;

process.on('message', function(msg){
    if(msg.type == 'dependencies') {
        appInstance = msg.appInstance;
        imageData = msg.imageData;
        image = new Image(appInstance, imageData);
        result = image.save(false);
    } else if(msg.type == 'start-regenerating') {
        if(!result.newPath) {
            // When process is ready - finish it by sending a proper event
            process.send({
                type: 'finished',
                result: result
            });

            setTimeout(function () {
                process.exit();
            }, 1000);

            return;
        }

        if(!imageData.imageType) {
            imageData.imageType = 'contentImages';
        }

        let promises = image.createResponsiveImages(result.newPath, imageData.imageType);

        if(!promises.length) {
            setTimeout(() => {
                let thumbnailDimensions = false;

                try {
                    thumbnailDimensions = sizeOf(result.url);
                } catch(e) {
                    thumbnailDimensions = false;
                }

                process.send({
                    type: 'finished',
                    result: {
                        baseImage: result,
                        thumbnailPath: result.url,
                        thumbnailDimensions: thumbnailDimensions
                    }
                });
            }, 250);

            setTimeout(function() {
                process.exit();
            }, 1000);

            return;
        }

        Promise.all(promises).then(res => {
            let unprocessable = res.find(item => item && item.error === 'IMAGE_UNPROCESSABLE');

            if (unprocessable) {
                // Clean up: remove the copied base image and any successfully
                // generated thumbnails so the user's media folder doesn't get
                // littered with an unusable file.
                try {
                    if (result && result.newPath && fs.existsSync(result.newPath)) {
                        fs.unlinkSync(result.newPath);
                    }

                    for (const item of res) {
                        if (typeof item === 'string' && fs.existsSync(item)) {
                            fs.unlinkSync(item);
                        }
                    }
                } catch (cleanupErr) {
                    console.log('Cleanup after failed image upload failed:', cleanupErr && cleanupErr.message);
                }

                setTimeout(() => {
                    process.send({
                        type: 'finished',
                        result: {
                            error: true,
                            translation: 'core.images.imageUnprocessable',
                            file: (result && result.filename) || (unprocessable.file || '')
                        }
                    });
                }, 250);

                setTimeout(function () {
                    process.exit();
                }, 1000);

                return;
            }

            setTimeout(() => {
                let thumbnailDimensions = false;

                try {
                    thumbnailDimensions = sizeOf(res[0]);
                } catch(e) {
                    thumbnailDimensions = false;
                }

                // When process is ready - finish it by sending a proper event
                process.send({
                    type: 'finished',
                    result: {
                        baseImage: result,
                        thumbnailPath: res.map(url => 'file:///' + normalizePath(url)),
                        thumbnailDimensions: thumbnailDimensions
                    }
                });
            }, 250);

            setTimeout(function() {
                process.exit();
            }, 1000);
        }).catch(err => console.log(err));
    }
});
