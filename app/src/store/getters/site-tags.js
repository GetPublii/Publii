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

    tags = tags.map(tag => {
        let postsCounter = 0;

        postsCounter = state.currentSite.postsTags.filter(postTag => {
            return postTag.tagID === tag.id;
        }).length;

        tag.postsCounter = postsCounter;

        return tag;
    });

    return tags;
};
