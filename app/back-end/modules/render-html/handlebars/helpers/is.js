/**
 * Helper for detecting contexts
 *
 * {{#is 'index'}}
 *
 * {{#is 'tag,post'}}
 *
 * Available phrases: index, blogindex, tag, post, page, author, 404, search, pagination, index-pagination, tag-pagination, author-pagination
 *
 * @returns {callback}
 */
function is(conditional, options) {
    let contextIsCorrect = false;
    let contextsToCheck = conditional.split(',');
    contextsToCheck = contextsToCheck.map(context => context.trim());

    for (let context of contextsToCheck) {
        if (options.data.context.indexOf(context) > -1) {
            contextIsCorrect = true;
            break;
        }
    }

    if (contextIsCorrect) {
        return options.fn(this);
    } else {
        return options.inverse(this);
    }
}

module.exports = is;
