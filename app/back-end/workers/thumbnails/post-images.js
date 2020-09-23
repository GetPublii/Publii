const Image = require('./../../image.js');
const normalizePath = require('normalize-path');
const sizeOf = require('image-size');

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
