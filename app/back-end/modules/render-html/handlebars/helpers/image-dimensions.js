const Handlebars = require('handlebars');
const sizeOf = require('image-size');
const path = require('path');
const normalizePath = require('normalize-path');

/**
 * Helper for creating width/height attributes from the provided image
 *
 * {{imageDimensions @config.custom.imageOptionName}}
 *
 * @returns {string} - string with width and height attributes based on a given image
 */
function imageDimensionsHelper(rendererInstance, Handlebars) {
    Handlebars.registerHelper('imageDimensions', function (url) {
        if (!url) {
            return '';
        }

        url = normalizePath(url);
        let basicUrl = normalizePath(rendererInstance.siteConfig.domain);
        let basicDir = normalizePath(rendererInstance.inputDir);
        let imagePath = url.replace(basicUrl, '');
        imagePath = path.join(basicDir, imagePath);
        let output = '';

        try {
            let dimensions = sizeOf(imagePath);

            if(dimensions) {
                output = ' width="' + dimensions.width + '" height="' + dimensions.height + '" ';
            }
        } catch(e) {
            console.log('Image dimensions HSB helper: wrong image path - missing dimensions');
        }


        return new Handlebars.SafeString(output);
    });
}

module.exports = imageDimensionsHelper;
