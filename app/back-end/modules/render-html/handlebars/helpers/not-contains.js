/**
 * Helper for checking if a specifc value is not inside comma-separated string
 *
 * {{#notContains 'abc' 'abc,def'}}
 *
 * @returns {callback}
 */
function notContains (needle, haystack, options) {
    if (needle === undefined || haystack === undefined) {
        return;
    }

    if (typeof haystack === 'object' && haystack.string) {
        haystack = haystack.string;
    }

    haystack = haystack.split(',');

    if (typeof needle === 'number') {
        haystack = haystack.map(n => parseInt(n, 10));
    }

    if (haystack.indexOf(needle) === -1) {
        return options.fn(this);
    }

    return options.inverse(this)
}

module.exports = notContains;
