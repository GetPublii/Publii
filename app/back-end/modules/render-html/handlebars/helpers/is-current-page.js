/**
 * Helper for checking if a given page number is a current page
 *
 * Useful in pagination
 *
 * {{#isCurrentPage @pagination.currentPage this}}
 *
 * @returns {callback}
 */
function isCurrentPage(current, iteration, options) {
    if (current === iteration) {
        return options.fn(this);
    }

    return options.inverse(this);
}

module.exports = isCurrentPage;
