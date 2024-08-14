export default (state, page, filterValue) => {
    filterValue = filterValue.toLowerCase();
    page = JSON.parse(JSON.stringify(page));
    page.title = page.title.toLowerCase();
    page.slug = page.slug.toLowerCase();
    let deletedPagesIDs = state.currentSite.pages.filter(page => page.status.indexOf('trashed') > -1).map(page => page.id);

    // Check for author
    if (filterValue.indexOf('author:') === 0) {
        let authorToFind = filterValue.replace('author:', '');

        let results = state.currentSite.pagesAuthors.filter(pageAuthor => {
            return  pageAuthor.pageID === page.id && 
                    deletedPagesIDs.indexOf(pageAuthor.pageID) === -1 && 
                    pageAuthor.authorName.toLowerCase() === authorToFind;
        });

        if(results.length) {
            return true;
        }

        return false;
    }

    let searchPhrase = filterValue.replace('is:published', '')
                                  .replace('is:trashed', '')
                                  .replace('is:draft', '')
                                  .trim();
    searchPhrase = searchPhrase.toLowerCase();

    searchPhrase = searchPhrase.toLowerCase();

    // Check for published pages
    if(
        filterValue.indexOf('is:published') === 0 &&
        page.status.indexOf('draft') === -1 &&
        page.status.indexOf('trashed') === -1
    ) {
        if(searchPhrase !== '') {
            return page.title.indexOf(searchPhrase) > -1 || page.slug.indexOf('searchPhrase') > -1;
        }

        return true;
    }

    // Check for trashed pages
    if(
        filterValue.indexOf('is:trashed') === 0 &&
        page.status.indexOf('trashed') > -1
    ) {
        if(searchPhrase !== '') {
            return page.title.indexOf(searchPhrase) > -1 || page.slug.indexOf('searchPhrase') > -1;
        }

        return true;
    }

    // Check for draft pages
    if(
        filterValue.indexOf('is:draft') === 0 &&
        page.status.indexOf('draft') > -1 &&
        page.status.indexOf('trashed') === -1
    ) {
        if(searchPhrase !== '') {
            return page.title.indexOf(searchPhrase) > -1 || page.slug.indexOf('searchPhrase') > -1;
        }

        return true;
    }

    // Check the easy cases first
    if(
        (
            filterValue.trim() === '' || 
            page.title.indexOf(filterValue) > -1 ||
            page.slug.indexOf(filterValue) > -1
        ) &&
        page.status.indexOf('trashed') === -1
    ) {
        return true;
    }

    // Unfortunately - there is no criteria which this page meets
    return false;
};
