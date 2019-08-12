const Handlebars = require('handlebars');

/**
 * Helper for concatenating values
 *
 * {{concatenate 'abc' 3 'def'}}
 *
 * @returns {callback}
 */
function concatenate () {
    let inputs = Array.from(arguments);
    inputs.pop();

    return inputs.join('');
}

module.exports = concatenate;
