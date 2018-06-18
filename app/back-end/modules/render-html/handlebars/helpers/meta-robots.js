const Handlebars = require('handlebars');

/**
 * Helper for generating meta_robots
 *
 * {{metaRobots}}
 *
 * @returns {string} <meta> tag with the meta robots value
 */
function metaRobots(options) {
    let output = '';

    if(options.data.root.metaRobotsRaw !== '') {
        output = '<meta name="robots" content="' + options.data.root.metaRobotsRaw + '" />';
    }

    if(
        Array.isArray(options.data.context) &&
        options.data.context[0] &&
        options.data.context[0].indexOf('404') !== -1
    ) {
        output = '<meta name="robots" content="noindex, follow" />';
    }

    return new Handlebars.SafeString(output);
}

module.exports = metaRobots;
