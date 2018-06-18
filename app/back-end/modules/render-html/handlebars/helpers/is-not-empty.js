/**
 * Helper for checking if collection is not empty
 *
 * {{#isNotEmpty value}}
 *    ...
 * {{/isNotEmpty}}
 *
 * @returns {callback}
 *
 */
function isNotEmpty(obj, options) {
    if(Object.keys(obj).length === 0) {
        return options.inverse(this);
    } else {
        return options.fn(this);
    }
}

module.exports = isNotEmpty;
