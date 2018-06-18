/**
 * Helper for creating JSON-safe strings
 *
 * {{{jsonify string|object}}}
 *
 * @returns {string} string prepared for use in JSON
 */
function jsonify(content) {
    return JSON.stringify(content);
}

module.exports = jsonify;
