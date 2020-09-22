/**
 * Returns array of current site tags
 *
 * @param state
 * @param getters
 *
 * @returns {array}
 */

export default (state, getters) => (filterValue, orderBy = 'id', order = 'DESC') => {
    let tags = JSON.parse(JSON.stringify(state.currentSite.tags));
    
    tags = tags.filter(tag => {
        if(!filterValue) {
            return true;
        }

        if(tag.name.toLowerCase().indexOf(filterValue) > -1) {
            return true;
        }

        return false;
    });

    let deletedPostsIDs = state.currentSite.posts.filter(post => post.status && post.status.indexOf('trashed') > -1).map(post => post.id);

    tags = tags.map(tag => {
        let postsCounter = 0;

        postsCounter = state.currentSite.postsTags.filter(postTag => {
            return postTag.tagID === tag.id && deletedPostsIDs.indexOf(postTag.postID) === -1;
        }).length;

        tag.postsCounter = postsCounter;

        return tag;
    });

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
