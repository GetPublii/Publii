export default (state, filterValue, lookups) => {
    filterValue = filterValue.toLowerCase();

    // Check for author
    if (filterValue.indexOf('author:') === 0) {
        let authorToFind = filterValue.replace('author:', '');

        return post => {
            if (post.status.indexOf('trashed') > -1) {
                return false;
            }

            let authorName = lookups.postsAuthors.get(post.id);
            return !!authorName && authorName.toLowerCase() === authorToFind;
        };
    }

    // Check for tag
    if (filterValue.indexOf('tag:') === 0) {
        let tagToFind = filterValue.replace('tag:', '');
        let foundTag = state.currentSite.tags.find(tag => tag.name.toLowerCase() === tagToFind);
        let tagID = foundTag ? foundTag.id : false;

        return post => {
            if (tagID === false || post.status.indexOf('trashed') > -1) {
                return false;
            }

            let postTags = lookups.postsTags.get(post.id);
            return !!postTags && postTags.some(postTag => postTag.id === tagID);
        };
    }

    let searchPhrase = filterValue.replace('is:published', '')
                                  .replace('is:featured', '')
                                  .replace('is:trashed', '')
                                  .replace('is:draft', '')
                                  .replace('is:hidden', '')
                                  .replace('is:excluded', '')
                                  .trim()
                                  .toLowerCase();

    let isPublishedFilter = filterValue.indexOf('is:published') === 0;
    let isFeaturedFilter = filterValue.indexOf('is:featured') === 0;
    let isTrashedFilter = filterValue.indexOf('is:trashed') === 0;
    let isDraftFilter = filterValue.indexOf('is:draft') === 0;
    let isHiddenFilter = filterValue.indexOf('is:hidden') === 0;
    let isExcludedFilter = filterValue.indexOf('is:excluded') === 0;
    let emptyFilter = filterValue.trim() === '';

    return post => {
        let title = post.title.toLowerCase();
        let slug = post.slug.toLowerCase();
        let matchesSearchPhrase = searchPhrase === '' || title.indexOf(searchPhrase) > -1 || slug.indexOf(searchPhrase) > -1;

        // Check for published posts
        if (
            isPublishedFilter &&
            post.status.indexOf('draft') === -1 &&
            post.status.indexOf('trashed') === -1
        ) {
            return matchesSearchPhrase;
        }

        // Check for featured posts
        if (
            isFeaturedFilter &&
            post.status.indexOf('featured') > -1 &&
            post.status.indexOf('trashed') === -1
        ) {
            return matchesSearchPhrase;
        }

        // Check for trashed posts
        if (
            isTrashedFilter &&
            post.status.indexOf('trashed') > -1
        ) {
            return matchesSearchPhrase;
        }

        // Check for draft posts
        if (
            isDraftFilter &&
            post.status.indexOf('draft') > -1 &&
            post.status.indexOf('trashed') === -1
        ) {
            return matchesSearchPhrase;
        }

        // Check for hidden posts
        if (
            isHiddenFilter &&
            post.status.indexOf('hidden') > -1 &&
            post.status.indexOf('trashed') === -1
        ) {
            return matchesSearchPhrase;
        }

        // Check for excluded posts
        if (
            isExcludedFilter &&
            post.status.indexOf('excluded') > -1 &&
            post.status.indexOf('trashed') === -1
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
            post.status.indexOf('trashed') === -1
        ) {
            return true;
        }

        // Unfortunately - there is no criteria which this post meets
        return false;
    };
};
