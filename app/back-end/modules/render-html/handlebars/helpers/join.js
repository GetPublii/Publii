const Handlebars = require('handlebars');

/**
 * Helper for concatenating values with a specific separator
 *
 * {{join ',' 'a' 1 'b'}}
 *
 * @returns {callback}
 */
function join () {
    let inputs = Array.from(arguments);
    let separator = inputs.shift();
    inputs.pop();

    return inputs.join(separator);
}

module.exports = join;
