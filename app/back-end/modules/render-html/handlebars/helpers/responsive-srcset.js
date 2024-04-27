const Handlebars = require('handlebars');
const path = require('path');
const normalizePath = require('normalize-path');
const UtilsHelper = require('./../../../../helpers/utils.js');
const URLHelper = require('./../../helpers/url.js');

/**
 * Helper for srcset attribute from the provided image
 *
 * {{responsiveSrcSet @config.custom.imageOptionName [type] [group]}}
 *
 * @returns {string} - string with the srcset attribute
 */
function responsiveSrcSetHelper(rendererInstance, Handlebars) {
    Handlebars.registerHelper('responsiveSrcSet', returnSrcSetAttribute.bind(rendererInstance));
}

function returnSrcSetAttribute (url, type, group) {
    if (!url) {
        return;
    }

    url = URLHelper.fixProtocols(normalizePath(url));
    let output = '';
    let dimensions = false;
    let dimensionsData = false;

    if (!UtilsHelper.responsiveImagesConfigExists(this.themeConfig)) {
        return output;
    }

    // skip GIF and SVG images
    if (url.slice(-4) === '.gif' || url.slice(-4) === '.svg') {
        return output;
    }

    if (typeof type !== "string") {
        type = false;
    }

    if (typeof group !== "string") {
        group = false;
    }

    if (!type) {
        if (url.indexOf('/media/authors/') > -1) {
            type = 'authorImages';
        } else if (url.indexOf('/media/tags/') > -1) {
            type = 'tagImages';
        } else if (url.indexOf('/media/posts/') > -1 || url.indexOf('/media/pages/') > -1) {
            type = 'contentImages';
        } else if (url.indexOf('/media/website/') > -1) {
            type = 'optionImages';
        }
    }

    if (UtilsHelper.responsiveImagesConfigExists(this.themeConfig, type)) {
        dimensions = UtilsHelper.responsiveImagesDimensions(this.themeConfig, type, group);
        dimensionsData = UtilsHelper.responsiveImagesData(this.themeConfig, type, group);
    }

    if (!dimensions) {
        return;
    }

    let srcset = [];

    for(let name of dimensions) {
        let filename = url.split('/');
        filename = filename[filename.length-1];
        let filenameFile = path.parse(filename).name;
        let filenameExtension = path.parse(filename).ext;
        let useWebp = false;

        if (this.siteConfig?.advanced?.forceWebp) {
            useWebp = true;
        }

        if (useWebp) {
            filenameExtension = '.webp';
        }

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
