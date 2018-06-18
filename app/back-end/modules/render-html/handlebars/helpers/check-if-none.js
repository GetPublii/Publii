/**
 * Helper for creating conditions where all
 * elements are connected using AND operator
 * and are all false
 *
 * {{#checkIfNone value1 value2 ... valueN}}
 *    ...
 * {{/checkIfNone}}
 *
 * @returns {callback|boolean} - true if any of the provided values is true otherwhise false
 */
function checkIfNone() {
    let args = Array.from(arguments);
    let options = args.pop();
    let result = args.filter(argument => !!argument === true);

    if(result.length === 0) {
        return options.fn(this);
    }

    return options.inverse(this);
}

module.exports = checkIfNone;
