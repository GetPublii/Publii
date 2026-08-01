import createPageFilter from '../helpers/page-filter.js';

const coreDataCache = new WeakMap();

function getPageCoreData (page) {
    let cached = coreDataCache.get(page);

    if (cached && cached.raw === page.additional_data) {
        return cached;
    }

    let additionalData = JSON.parse(page.additional_data);
    let coreData = {
        raw: page.additional_data,
        editor: 'tinymce'
    };

    if (additionalData && additionalData.editor) {
        coreData.editor = additionalData.editor;
    }

    coreDataCache.set(page, coreData);
    return coreData;
}

/**
 * Returns array of current site pages
 *
 * @param state
 * @param getters
 *
 * @returns {array}
 */

export default (state, getters) => (filterValue, orderBy = '', order = 'DESC') => {
    if (!state.currentSite.pages) {
        return [];
    }

    let pagesAuthors = new Map();

    for (let xref of state.currentSite.pagesAuthors) {
        if (!pagesAuthors.has(xref.pageID)) {
            pagesAuthors.set(xref.pageID, xref.authorName);
        }
    }

    let pageFilter = createPageFilter(filterValue, { pagesAuthors });
    let pages = [];

    for (let page of state.currentSite.pages) {
        if (page.title === null || !pageFilter(page)) {
            continue;
        }

        let coreData = getPageCoreData(page);

        pages.push({
            id: page.id,
            editor: coreData.editor,
            title: page.title,
            slug: page.slug,
            status: page.status,
            created: page.created_at,
            modified: page.modified_at,
            isDraft: page.status.indexOf('draft') > -1,
            isTrashed: page.status.indexOf('trashed') > -1,
            author_id: page.authors,
            author: pagesAuthors.get(page.id) || ''
        });
    }

    pages.sort((pageA, pageB) => {
        if (orderBy === 'title') {
            if (order === 'DESC') {
                return -(pageA.title.localeCompare(pageB.title))
            }

            return pageA.title.localeCompare(pageB.title);
        }

        if (orderBy === 'author') {
            if (order === 'DESC') {
                return -(pageA.author.localeCompare(pageB.author))
            }

            return pageA.author.localeCompare(pageB.author);
        }

        if (orderBy !== '' && order === 'DESC') {
            return pageB[orderBy] - pageA[orderBy];
        }

        return pageA[orderBy] - pageB[orderBy];
    });

    return pages;
};
