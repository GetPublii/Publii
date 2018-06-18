/**
 * Helper for creating conditions
 *
 * {{#checkIf author '&&' avatar}}
 *    ...
 * {{/checkIf}}
 *
 * Available operators:
 * '==', '!=', '===', '!==', '&&',
 * '||', '<', '<=', '>', '>='
 *
 * @returns {callback|boolean} - true if provided logical condition based on three arguments is true otherwhise false
 */
function checkIf(v1, operator, v2, options) {
    if(v1 === undefined || v2 === undefined) {
        return false;
    }

    switch (operator) {
        case "&&":
            return (v1 && v2) ? options.fn(this) : options.inverse(this);
        case "||":
            return (v1 || v2) ? options.fn(this) : options.inverse(this);
        case "==":
            return (v1 == v2) ? options.fn(this) : options.inverse(this);
        case "===":
            return (v1 === v2) ? options.fn(this) : options.inverse(this);
        case "!=":
            return (v1 != v2) ? options.fn(this) : options.inverse(this);
        case "!==":
            return (v1 !== v2) ? options.fn(this) : options.inverse(this);
        case "<":
            return (v1 < v2) ? options.fn(this) : options.inverse(this);
        case ">":
            return (v1 > v2) ? options.fn(this) : options.inverse(this);
        case "<=":
            return (v1 <= v2) ? options.fn(this) : options.inverse(this);
        case ">=":
            return (v1 >= v2) ? options.fn(this) : options.inverse(this);
    }

    return false;
}

module.exports = checkIf;
