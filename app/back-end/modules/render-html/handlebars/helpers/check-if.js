/**
 * Helper for creating conditions
 *
 * {{#checkIf author '&&' avatar}}
 *    ...
 * {{/checkIf}}
 *
 * Available operators:
 * '==', '!=', '===', '!==', '&&', '||', '<', '<=', '>', '>=',
 * 'and', 'or', 'equal', 'strictEqual', 'different', 'strictDifferent', 'lesser', 'lesserEqual', 'greater', 'greaterEqual', 'contains', 'notContains'
 *
 * @returns {callback|boolean} - true if provided logical condition based on three arguments is true otherwhise false
 */
function checkIf(v1, operator, v2, options) {
    if(v1 === undefined || v2 === undefined) {
        return false;
    }

    switch (operator) {
        case "&&":
        case "and":
            return (v1 && v2) ? options.fn(this) : options.inverse(this);
        case "||":
        case "or":
            return (v1 || v2) ? options.fn(this) : options.inverse(this);
        case "==":
        case "equal":
            return (v1 == v2) ? options.fn(this) : options.inverse(this);
        case "===":
        case "strictEqual":
            return (v1 === v2) ? options.fn(this) : options.inverse(this);
        case "!=":
        case "different":
            return (v1 != v2) ? options.fn(this) : options.inverse(this);
        case "!==":
        case "strictDifferent":
            return (v1 !== v2) ? options.fn(this) : options.inverse(this);
        case "<":
        case "lesser":
            return (v1 < v2) ? options.fn(this) : options.inverse(this);
        case ">":
        case "greater":
            return (v1 > v2) ? options.fn(this) : options.inverse(this);
        case "<=":
        case "lesserEqual":
            return (v1 <= v2) ? options.fn(this) : options.inverse(this);
        case ">=":
        case "greaterEqual":
            return (v1 >= v2) ? options.fn(this) : options.inverse(this);
        case "contains": 
            return (v1.indexOf(v2) > -1) ? options.fn(this) : options.inverse(this);
        case "notContains": 
            return (v1.indexOf(v2) === -1) ? options.fn(this) : options.inverse(this);
    }

    return false;
}

module.exports = checkIf;
