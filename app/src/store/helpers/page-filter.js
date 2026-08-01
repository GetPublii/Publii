export default (filterValue, lookups) => {
    filterValue = filterValue.toLowerCase();

    // Check for author
    if (filterValue.indexOf('author:') === 0) {
        let authorToFind = filterValue.replace('author:', '');

        return page => {
            if (page.status.indexOf('trashed') > -1) {
                return false;
            }

            let authorName = lookups.pagesAuthors.get(page.id);
            return !!authorName && authorName.toLowerCase() === authorToFind;
        };
    }

    let searchPhrase = filterValue.replace('is:published', '')
                                  .replace('is:trashed', '')
                                  .replace('is:draft', '')
                                  .trim()
                                  .toLowerCase();

    let isPublishedFilter = filterValue.indexOf('is:published') === 0;
    let isTrashedFilter = filterValue.indexOf('is:trashed') === 0;
    let isDraftFilter = filterValue.indexOf('is:draft') === 0;
    let emptyFilter = filterValue.trim() === '';

    return page => {
        let title = page.title.toLowerCase();
        let slug = page.slug.toLowerCase();
        let matchesSearchPhrase = searchPhrase === '' || title.indexOf(searchPhrase) > -1 || slug.indexOf(searchPhrase) > -1;

        // Check for published pages
        if (
            isPublishedFilter &&
            page.status.indexOf('draft') === -1 &&
            page.status.indexOf('trashed') === -1
        ) {
            return matchesSearchPhrase;
        }

        // Check for trashed pages
        if (
            isTrashedFilter &&
            page.status.indexOf('trashed') > -1
        ) {
            return matchesSearchPhrase;
        }

        // Check for draft pages
        if (
            isDraftFilter &&
            page.status.indexOf('draft') > -1 &&
            page.status.indexOf('trashed') === -1
        ) {
            return matchesSearchPhrase;
        }

        // Check the easy cases first
        if (
            (
                emptyFilter ||
                title.indexOf(filterValue) > -1 ||
                slug.indexOf(filterValue) > -1
            ) &&
            page.status.indexOf('trashed') === -1
        ) {
            return true;
        }

        // Unfortunately - there is no criteria which this page meets
        return false;
    };
};
