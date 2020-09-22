const Handlebars = require('handlebars');
const UtilsHelper = require('./../../../../helpers/utils.js');

/**
 * Helper for sizes attribute for the images from options
 *
 * {{responsiveSizes [group]}}
 *
 * @returns {string} - string with the sizes attribute
 */
function responsiveSizesHelper(rendererInstance, Handlebars) {
    Handlebars.registerHelper('responsiveSizes', returnSizesAttribute.bind(rendererInstance));
}

function returnSizesAttribute (group) {
    let output = '';

    // Check if the responsive config exists
    if(!UtilsHelper.responsiveImagesConfigExists(this.themeConfig)) {
        return output;
    }

    let responsiveConfig = this.themeConfig.files.responsiveImages;
    let useGroup = false;

    if(typeof group === "string") {
        useGroup = true;
    }

    // Check for the config
    if(useGroup) {
        if (responsiveConfig.optionImages && responsiveConfig.optionImages.sizes) {
            output = ' sizes="' + responsiveConfig.optionImages.sizes[group] + '" ';
        } else if (responsiveConfig.optionImages && responsiveConfig.tagImages.sizes) {
            output = ' sizes="' + responsiveConfig.tagImages.sizes[group] + '" ';
        } else if (responsiveConfig.optionImages && responsiveConfig.authorImages.sizes) {
            output = ' sizes="' + responsiveConfig.authorImages.sizes[group] + '" ';
        } else if(responsiveConfig.contentImages && responsiveConfig.contentImages.sizes) {
            output = ' sizes="' + responsiveConfig.contentImages.sizes[group] + '" ';
        }
    } else {
        if(responsiveConfig.optionImages && responsiveConfig.optionImages.sizes) {
            output = ' sizes="' + responsiveConfig.optionImages.sizes + '" ';
        } else if(responsiveConfig.optionImages && responsiveConfig.tagImages.sizes) {
            output = ' sizes="' + responsiveConfig.tagImages.sizes + '" ';
        } else if(responsiveConfig.optionImages && responsiveConfig.authorImages.sizes) {
            output = ' sizes="' + responsiveConfig.authorImages.sizes + '" ';
        } else if(responsiveConfig.contentImages && responsiveConfig.contentImages.sizes) {
            output = ' sizes="' + responsiveConfig.contentImages.sizes + '" ';
        }
    }

    return new Handlebars.SafeString(output);
}

module.exports = {
    responsiveSizesHelper,
    returnSizesAttribute
};
