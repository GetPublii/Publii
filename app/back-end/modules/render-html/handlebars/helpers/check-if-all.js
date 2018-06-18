/**
 * Helper for creating conditions where all
 * elements are connected using AND operator
 *
 * {{#checkIfAll value1 value2 ... valueN}}
 *    ...
 * {{/checkIfAll}}
 *
 * @returns {callback} - true if all provided values are true otherwhise false
 */
function checkIfAll() {
    let args = Array.from(arguments);
    let options = args.pop();
    let allLength = args.length;
    let result = args.filter(argument => !!argument === true);

    if(result.length > 0 && result.length === allLength) {
        return options.fn(this);
    }

    return options.inverse(this);
}

module.exports = checkIfAll;
