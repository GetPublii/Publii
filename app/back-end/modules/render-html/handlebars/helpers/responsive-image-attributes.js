const Handlebars = require('handlebars');
const responsiveSrcSet = require('./responsive-srcset.js');
const responsiveSizes = require('./responsive-sizes.js');

/**
 * Helper for sizes attribute for the images from options
 *
 * {{responsiveImageAttributes @config.custom.imageOptionName [group]}}
 * 
 * {{responsiveImageAttributes 'featuredImage' srcset.post sizes.post}}
 *
 * @returns {string} - string with the srcset and sizes attributes
 */
function responsiveImageAttributesHelper(rendererInstance, Handlebars) {
    Handlebars.registerHelper('responsiveImageAttributes', function (firstParam, secondParam, thirdParam) {
        if (firstParam === 'featuredImage') {
            if (secondParam && thirdParam) {
                return new Handlebars.SafeString('srcset="' + secondParam + '" sizes="' + thirdParam + '"');
            }

            return '';
        }

        let srcSet = responsiveSrcSet.returnSrcSetAttribute.bind(rendererInstance)(firstParam);
        let sizes = responsiveSizes.returnSizesAttribute.bind(rendererInstance)(secondParam);

        if (srcSet) {
            return new Handlebars.SafeString(srcSet + ' ' + sizes);
        }

        return new Handlebars.SafeString(srcSet);
    });
}

module.exports = responsiveImageAttributesHelper;
