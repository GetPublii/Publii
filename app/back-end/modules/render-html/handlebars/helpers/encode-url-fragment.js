const Handlebars = require('handlebars');

/**
 * Helper for creating encoded output inside URLs
 *
 * {{encodeUrlFragment "text"}}
 *
 * @returns {string} - text prepared to be displayed as a part of URLs
 */
function encodeUrlFragment(text) {
    let output = encodeURIComponent(text);

    return new Handlebars.SafeString(output);
}

module.exports = encodeUrlFragment;
