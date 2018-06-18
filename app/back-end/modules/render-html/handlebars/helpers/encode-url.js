const Handlebars = require('handlebars');

/**
 * Helper for creating encoded output of URLs
 *
 * Useful for the social media scripts where you have to put
 * full URL to your website as an URL param
 *
 * {{encodeUrl "text"}}
 *
 * @returns {string} - text prepared to be displayed as an URL inside other URLs
 */
function encodeUrl(text) {
    let output = encodeURI(text);

    return new Handlebars.SafeString(output);
}

module.exports = encodeUrl;
