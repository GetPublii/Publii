export default (state, post, filterValue) => {
    // Check for author
    if(filterValue.indexOf('author:') === 0) {
        let authorToFind = filterValue.replace('author:', '');

        let results = state.currentSite.postsAuthors.filter(postAuthor => {
            return postAuthor.postID === post.id && postAuthor.authorName.toLowerCase() === authorToFind;
        });

        if(results.length) {
            return true;
        }

        return false;
    }

    // Check for tag
    if(filterValue.indexOf('tag:') === 0) {
        let tagToFind = filterValue.replace('tag:', '');
        let tagID = state.currentSite.tags.filter(tag => {
            return tag.name.toLowerCase() === tagToFind;
        });

        if(tagID.length) {
            tagID = tagID[0].id;
        }

        let results = state.currentSite.postsTags.filter(postTags => {
            return postTags.postID === post.id && postTags.tagID === tagID;
        });

        if(results.length) {
            return true;
        }

        return false;
    }

    let searchPhrase = filterValue.replace('is:published', '')
                                  .replace('is:featured', '')
                                  .replace('is:trashed', '')
                                  .replace('is:draft', '')
                                  .replace('is:hidden', '')
                                  .trim();

    // Check for trashed posts
    if(
        filterValue.indexOf('is:published') === 0 &&
        post.status.indexOf('draft') === -1 &&
        post.status.indexOf('trashed') === -1
    ) {
        if(searchPhrase !== '') {
            return post.title.toLowerCase().indexOf(searchPhrase.toLowerCase()) > -1;
        }

        return true;
    }

    // Check for trashed posts
    if(
        filterValue.indexOf('is:featured') === 0 &&
        post.status.indexOf('featured') > -1 &&
        post.status.indexOf('trashed') === -1
    ) {
        if(searchPhrase !== '') {
            return post.title.toLowerCase().indexOf(searchPhrase.toLowerCase()) > -1;
        }

        return true;
    }

    // Check for trashed posts
    if(
        filterValue.indexOf('is:trashed') === 0 &&
        post.status.indexOf('trashed') > -1
    ) {
        if(searchPhrase !== '') {
            return post.title.toLowerCase().indexOf(searchPhrase.toLowerCase()) > -1;
        }

        return true;
    }

    // Check for draft posts
    if(
        filterValue.indexOf('is:draft') === 0 &&
        post.status.indexOf('draft') > -1 &&
        post.status.indexOf('trashed') === -1
    ) {
        if(searchPhrase !== '') {
            return post.title.toLowerCase().indexOf(searchPhrase.toLowerCase()) > -1;
        }

        return true;
    }

    // Check for hidden posts
    if(
        filterValue.indexOf('is:hidden') === 0 &&
        post.status.indexOf('hidden') > -1 &&
        post.status.indexOf('trashed') === -1
    ) {
        if(searchPhrase !== '') {
            return post.title.toLowerCase().indexOf(searchPhrase.toLowerCase()) > -1;
        }

        return true;
    }

    // Check the easy cases first
    if(
        (filterValue.trim() === '' || post.title.toLowerCase().indexOf(filterValue.toLowerCase()) > -1) &&
        post.status.indexOf('trashed') === -1
    ) {
        return true;
    }

    // Unfortunately - there is no criteria which this post meets
    return false;
};
