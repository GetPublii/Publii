/**
 * Helper for doing a simple math operations
 *
 * {{math @index '+' 1}}
 *
 * {{math @index '-' 1}}
 *
 * Available phrases operations: +, -, *, /, %
 *
 * @returns {number} - value based on the operation result
 */
function math(a, operator, b) {
    a = parseFloat(a);
    b = parseFloat(b);

    return {
        "+": a + b,
        "-": a - b,
        "*": a * b,
        "/": a / b,
        "%": a % b
    }[operator];
}

module.exports = math;
