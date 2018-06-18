/**
 * Helper for checking if collection is empty
 *
 * {{#isEmpty value}}
 *    ...
 * {{/isEmpty}}
 *
 * @returns {callback}
 */
function isEmpty(obj, options) {
    if(Object.keys(obj).length === 0) {
        return options.fn(this);
    } else {
        return options.inverse(this);
    }
}

module.exports = isEmpty;
