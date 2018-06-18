import postFilter from '../helpers/post-filter.js';
import postGetAuthor from '../helpers/post-get-author.js';
import postGetTags from '../helpers/post-get-tags.js';

/**
 * Returns array of current site tags
 *
 * @param state
 * @param getters
 *
 * @returns {array}
 */

export default (state, getters) => (filterValue) => {
    if(!state.currentSite.posts) {
        return [];
    }

    let posts = state.currentSite.posts.filter(post => {
        if(!postFilter(state, post, filterValue)) {
            return false;
        }

        return true;
    }).map(post => {
        return {
            id: post.id,
            title: post.title,
            tags: postGetTags(state, post.id),
            created: post.created_at,
            modified: post.modified_at,
            isHidden: post.status.indexOf('hidden') > -1,
            isDraft: post.status.indexOf('draft') > -1,
            isFeatured: post.status.indexOf('featured') > -1,
            isTrashed: post.status.indexOf('trashed') > -1,
            author_id: post.authors,
            author: postGetAuthor(state, post.id)
        }
    });

    return posts;
};
