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
 * @returns {callback} 
 */
function checkIf(v1, operator, v2, options) {
    if(v1 === undefined || v2 === undefined) {
        return;
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
            if (typeof v1 !== 'string') {
                return;
            }

            if (typeof v2 === 'number') {
                return (v1.split(',').map(v1item => +v1item).indexOf(v2) > -1) ? options.fn(this) : options.inverse(this);    
            } 

            return (v1.split(',').indexOf(v2) > -1) ? options.fn(this) : options.inverse(this);
        case "notContains": 
            if (typeof v1 !== 'string') {
                return;
            }

            if (typeof v2 === 'number') {
                return (v1.split(',').map(v1item => +v1item).indexOf(v2) === -1) ? options.fn(this) : options.inverse(this);    
            } 

            return (v1.split(',').indexOf(v2) === -1) ? options.fn(this) : options.inverse(this);
    }

    return;
}

module.exports = checkIf;
