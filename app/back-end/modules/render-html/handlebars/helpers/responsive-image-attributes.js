const Handlebars = require('handlebars');
const responsiveSrcSet = require('./responsive-srcset.js');
const responsiveSizes = require('./responsive-sizes.js');

/**
 * Helper for sizes attribute for the images from options
 *
 * {{responsiveImageAttributes @config.custom.imageOptionName [type] [group]}}
 * 
 * {{responsiveImageAttributes 'featuredImage' srcset.post sizes.post}}
 * {{responsiveImageAttributes 'tagImage' srcset.post sizes.post}}
 * {{responsiveImageAttributes 'authorImage' srcset.post sizes.post}}
 *
 * @returns {string} - string with the srcset and sizes attributes
 */
function responsiveImageAttributesHelper(rendererInstance, Handlebars) {
    Handlebars.registerHelper('responsiveImageAttributes', function (firstParam, secondParam, thirdParam) {
        if (!firstParam) { 
            return '';
        }
        
        if (
            firstParam === 'featuredImage' || 
            firstParam === 'tagImage' || 
            firstParam === 'authorImage'
        ) {
            if (secondParam && thirdParam) {
                return new Handlebars.SafeString('srcset="' + secondParam + '" sizes="' + thirdParam + '"');
            }

            return '';
        }

        let srcSet = responsiveSrcSet.returnSrcSetAttribute.bind(rendererInstance)(firstParam, secondParam, thirdParam);

        if (typeof secondParam !== 'string') {
            if (firstParam.indexOf('/media/authors/') > -1) {
                secondParam = 'authorImages';
            } else if (firstParam.indexOf('/media/tags/') > -1) {
                secondParam = 'tagImages';
            } else if (firstParam.indexOf('/media/posts/') > -1 || firstParam.indexOf('/media/pages/') > -1) {
                secondParam = 'contentImages';
            } else if (firstParam.indexOf('/media/website/') > -1) {
                secondParam = 'optionImages';
            }
        }

        let sizes = responsiveSizes.returnSizesAttribute.bind(rendererInstance)(secondParam, thirdParam);

        if (srcSet) {
            return new Handlebars.SafeString(srcSet + ' ' + sizes);
        }

        return new Handlebars.SafeString(srcSet);
    });
}

module.exports = responsiveImageAttributesHelper;
