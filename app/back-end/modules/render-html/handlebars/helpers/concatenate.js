/**
 * Helper for concatenating values
 *
 * {{concatenate 'abc' 3 'def'}}
 *
 * @returns {callback}
 */
function concatenate () {
    return Array.from(arguments).join('');
}

module.exports = concatenate;
