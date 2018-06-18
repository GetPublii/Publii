const Handlebars = require('handlebars');
const path = require('path');
const normalizePath = require('normalize-path');
const UtilsHelper = require('./../../../../helpers/utils.js');

/**
 * Helper for sizes attribute for the images from options
 *
 * {{responsiveSizes [group]}}
 *
 * @returns {string} - string with the sizes attribute
 */
function responsiveSizesHelper(rendererInstance, Handlebars) {
    Handlebars.registerHelper('responsiveSizes', function (group) {
        let output = '';

        // Check if the responsive config exists
        if(!UtilsHelper.responsiveImagesConfigExists(rendererInstance.themeConfig)) {
            return output;
        }

        let responsiveConfig = rendererInstance.themeConfig.files.responsiveImages;
        let useGroup = false;

        if(typeof group === "string") {
            useGroup = true;
        }

        // Check for the config
        if(useGroup) {
            if(responsiveConfig.optionImages && responsiveConfig.optionImages.sizes) {
                output = ' sizes="' + responsiveConfig.optionImages.sizes[group] + '" ';
            } else if(responsiveConfig.contentImages && responsiveConfig.contentImages.sizes) {
                output = ' sizes="' + responsiveConfig.contentImages.sizes[group] + '" ';
            }
        } else {
            if(responsiveConfig.optionImages && responsiveConfig.optionImages.sizes) {
                output = ' sizes="' + responsiveConfig.optionImages.sizes + '" ';
            } else if(responsiveConfig.contentImages && responsiveConfig.contentImages.sizes) {
                output = ' sizes="' + responsiveConfig.contentImages.sizes + '" ';
            }
        }

        return new Handlebars.SafeString(output);
    });
}

module.exports = responsiveSizesHelper;
