const Handlebars = require('handlebars');
const path = require('path');
const normalizePath = require('normalize-path');
const UtilsHelper = require('./../../../../helpers/utils.js');
const URLHelper = require('./../../helpers/url.js');

/**
 * Helper for srcset attribute from the provided image
 *
 * {{responsiveSrcSet @config.custom.imageOptionName [group]}}
 *
 * @returns {string} - string with the srcset attribute
 */
function responsiveSrcSetHelper(rendererInstance, Handlebars) {
    Handlebars.registerHelper('responsiveSrcSet', returnSrcSetAttribute.bind(rendererInstance));
}

function returnSrcSetAttribute (url, group) {
    if (!url) {
        return;
    }

    url = URLHelper.fixProtocols(normalizePath(url));
    let output = '';
    let dimensions = false;
    let dimensionsData = false;

    // Check if the responsive config exists
    if(!UtilsHelper.responsiveImagesConfigExists(this.themeConfig)) {
        return output;
    }

    // skip GIF and SVG images
    if(url.slice(-4) === '.gif' || url.slice(-4) === '.svg') {
        return output;
    }

    if(typeof group !== "string") {
        group = false;
    }

    // Check for the config
    if(UtilsHelper.responsiveImagesConfigExists(this.themeConfig, 'optionImages')) {
        dimensions = UtilsHelper.responsiveImagesDimensions(this.themeConfig, 'optionImages', group);
        dimensionsData = UtilsHelper.responsiveImagesData(this.themeConfig, 'optionImages', group);
    } else if(UtilsHelper.responsiveImagesConfigExists(this.themeConfig, 'contentImages')) {
        dimensions = UtilsHelper.responsiveImagesDimensions(this.themeConfig, 'contentImages');
        dimensionsData = UtilsHelper.responsiveImagesData(this.themeConfig, 'contentImages');
    }

    if(!dimensions) {
        return false;
    }

    let srcset = [];

    for(let name of dimensions) {
        let filename = url.split('/');
        filename = filename[filename.length-1];
        let filenameFile = path.parse(filename).name;
        let filenameExtension = path.parse(filename).ext;
        let baseUrlWithoutFilename = url.replace(filename, '');
        let responsiveImage = baseUrlWithoutFilename + 'responsive/' + filenameFile + '-' + name + filenameExtension;
        srcset.push(responsiveImage + ' ' + dimensionsData[name].width + 'w');
    }

    output = ' srcset="' + srcset.join(' ,') + '" ';

    return new Handlebars.SafeString(output);
}

module.exports = {
    responsiveSrcSetHelper,
    returnSrcSetAttribute
};
