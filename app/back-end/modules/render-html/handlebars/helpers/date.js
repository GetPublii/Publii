const Handlebars = require('handlebars');
const moment = require('moment');

/**
 * Helper for creating customized date output
 *
 * {{date timestamp "format"}}
 *
 * Format compatible with moment().js: http://momentjs.com/
 *
 * @returns {string} - date formatted using specified format
 *
 */
function dateHelper(rendererInstance, Handlebars) {
    Handlebars.registerHelper('date', function (timestamp, dateFormat) {
        // If date format is not a string - then it is empty or is an object with
        // options for the helper
        if(typeof dateFormat !== 'string') {
            dateFormat = 'MMM Do YYYY';
        }

        if(!rendererInstance.siteConfig.language || (rendererInstance.siteConfig.domain !== '' && rendererInstance.siteConfig.domain !== 'en-us')) {
            moment.locale(rendererInstance.siteConfig.language);
        }

        let output = moment(timestamp).format(dateFormat);

        return new Handlebars.SafeString(output);
    });
}

module.exports = dateHelper;
