/**
 * Returns array of current site tags
 *
 * @param state
 * @param getters
 *
 * @returns {array}
 */

export default (state, getters) => (filterValue, orderBy = 'id', order = 'DESC') => {
    let trashedPostsIDs = new Set();

    for (let post of state.currentSite.posts) {
        if (post.status && post.status.indexOf('trashed') > -1) {
            trashedPostsIDs.add(post.id);
        }
    }

    let postsCounters = new Map();

    for (let postTag of state.currentSite.postsTags) {
        if (trashedPostsIDs.has(postTag.postID)) {
            continue;
        }

        postsCounters.set(postTag.tagID, (postsCounters.get(postTag.tagID) || 0) + 1);
    }

    let tags = [];

    for (let tag of state.currentSite.tags) {
        if (filterValue && tag.name.toLowerCase().indexOf(filterValue) === -1) {
            continue;
        }

        tags.push({
            ...tag,
            postsCounter: postsCounters.get(tag.id) || 0
        });
    }

    tags.sort((tagA, tagB) => {
        if (orderBy === 'name') {
            if (order === 'DESC') {
                return -(tagA.name.localeCompare(tagB.name))
            }

            return tagA.name.localeCompare(tagB.name);
        }

        if (order === 'DESC') {
            return tagB[orderBy] - tagA[orderBy];
        }

        return tagA[orderBy] - tagB[orderBy];
    });

    return tags;
};
