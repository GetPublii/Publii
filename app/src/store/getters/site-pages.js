import pageFilter from '../helpers/page-filter.js';
import pageGetAuthor from '../helpers/page-get-author.js';

/**
 * Returns array of current site pages
 *
 * @param state
 * @param getters
 *
 * @returns {array}
 */

export default (state, getters) => (filterValue) => {
    if (!state.currentSite.pages) {
        return [];
    }

    let pages = state.currentSite.pages.filter(page => {
        if (!pageFilter(state, page, filterValue)) {
            return false;
        }

        return true;
    }).map(page => {
        let additionalData = JSON.parse(page.additional_data);
        let pageEditor = 'tinymce';

        if (additionalData && additionalData.editor) {
            pageEditor = additionalData.editor;
        }

        return {
            id: page.id,
            editor: pageEditor,
            title: page.title,
            slug: page.slug,
            status: page.status,
            created: page.created_at,
            modified: page.modified_at,
            isDraft: page.status.indexOf('draft') > -1,
            isTrashed: page.status.indexOf('trashed') > -1,
            author_id: page.authors,
            author: pageGetAuthor(state, page.id)
        }
    });

    pages.sort((pageA, pageB) => {
        return pageB.id - pageA.id;
    });

    return pages;
};
