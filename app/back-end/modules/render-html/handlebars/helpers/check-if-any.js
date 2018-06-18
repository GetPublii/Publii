/**
 * Helper for creating conditions where all
 * elements are connected using OR operator
 *
 * {{#checkIfAny value1 value2 ... valueN}}
 *    ...
 * {{/checkIfAny}}
 *
 * @returns {callback} -  true if at least one of the provided values is true otherwhise false
 */
function checkIfAny() {
    let args = Array.from(arguments);
    let options = args.pop();
    let result = args.filter(argument => !!argument == true);

    if(result.length > 0) {
        return options.fn(this);
    }

    return options.inverse(this);
}

module.exports = checkIfAny;
