/**
 * Helper for checking if a specifc value is inside comma-separated string
 *
 * {{#contains 'abc' (concatenate ['abc', 'def'])}}
 *
 * @returns {callback}
 */
function contains (needle, haystack, options) {
    if (needle === undefined || haystack === undefined) {
        return false;
    }

    haystack = haystack.split(',');

    if (typeof needle === 'number') {
        haystack = haystack.map(n => parseInt(n, 10));
    }

    if (haystack.indexOf(needle) > -1) {
        return options.fn(this);
    }

    return options.inverse(this)
}

module.exports = contains;
