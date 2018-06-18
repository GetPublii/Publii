/**
 * Returns array of current site tags
 *
 * @param state
 * @param getters
 *
 * @returns {array}
 */

export default (state, getters) => (filterValue) => {
    let tags = state.currentSite.tags.filter(tag => {
        if(!filterValue) {
            return true;
        }

        if(tag.name.toLowerCase().indexOf(filterValue) > -1) {
            return true;
        }

        return false;
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
