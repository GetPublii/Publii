const Handlebars = require('handlebars');
const UtilsHelper = require('./../../../../helpers/utils.js');

/**
 * Helper for sizes attribute for the images from options
 *
 * {{responsiveSizes type [group]}}
 *
 * @returns {string} - string with the sizes attribute
 */
function responsiveSizesHelper(rendererInstance, Handlebars) {
    Handlebars.registerHelper('responsiveSizes', returnSizesAttribute.bind(rendererInstance));
}

function returnSizesAttribute (type, group) {
    if (!UtilsHelper.responsiveImagesConfigExists(this.themeConfig)) {
        return '';
    }

    let output = '';
    let responsiveConfig = this.themeConfig.files.responsiveImages;
    let useType = false;
    let useGroup = false;

    if (typeof type === "string") {
        useType = true;
    }

    if (typeof group === "string") {
        useGroup = true;
    }

    if (!useType) {
        return '';
    }
    
    if (useGroup && responsiveConfig[type] && responsiveConfig[type].sizes && responsiveConfig[type].sizes[group]) {
        output = ' sizes="' + responsiveConfig[type].sizes[group] + '" ';  
    } else if (!useGroup && responsiveConfig[type] && responsiveConfig[type].sizes) {
        output = ' sizes="' + responsiveConfig[type].sizes + '" ';
    }

    return new Handlebars.SafeString(output);
}

module.exports = {
    responsiveSizesHelper,
    returnSizesAttribute
};
