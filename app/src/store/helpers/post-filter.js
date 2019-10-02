export default (state, post, filterValue) => {
    filterValue = filterValue.toLowerCase();
    post = JSON.parse(JSON.stringify(post));
    post.title = post.title.toLowerCase();
    post.slug = post.slug.toLowerCase();
    let deletedPostsIDs = state.currentSite.posts.filter(post => post.status.indexOf('trashed') > -1).map(post => post.id);

    // Check for author
    if(filterValue.indexOf('author:') === 0) {
        let authorToFind = filterValue.replace('author:', '');

        let results = state.currentSite.postsAuthors.filter(postAuthor => {
            return  postAuthor.postID === post.id && 
                    deletedPostsIDs.indexOf(postAuthor.postID) === -1 && 
                    postAuthor.authorName.toLowerCase() === authorToFind;
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
            return  postTags.postID === post.id && 
                    deletedPostsIDs.indexOf(postTags.postID) === -1 && 
                    postTags.tagID === tagID;
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
                                  .replace('is:excluded', '')
                                  .trim();
    searchPhrase = searchPhrase.toLowerCase();

    // Check for published posts
    if(
        filterValue.indexOf('is:published') === 0 &&
        post.status.indexOf('draft') === -1 &&
        post.status.indexOf('trashed') === -1
    ) {
        if(searchPhrase !== '') {
            return post.title.indexOf(searchPhrase) > -1 || post.slug.indexOf('searchPhrase') > -1;
        }

        return true;
    }

    // Check for featured posts
    if(
        filterValue.indexOf('is:featured') === 0 &&
        post.status.indexOf('featured') > -1 &&
        post.status.indexOf('trashed') === -1
    ) {
        if(searchPhrase !== '') {
            return post.title.indexOf(searchPhrase) > -1 || post.slug.indexOf('searchPhrase') > -1;
        }

        return true;
    }

    // Check for trashed posts
    if(
        filterValue.indexOf('is:trashed') === 0 &&
        post.status.indexOf('trashed') > -1
    ) {
        if(searchPhrase !== '') {
            return post.title.indexOf(searchPhrase) > -1 || post.slug.indexOf('searchPhrase') > -1;
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
            return post.title.indexOf(searchPhrase) > -1 || post.slug.indexOf('searchPhrase') > -1;
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
            return post.title.indexOf(searchPhrase) > -1 || post.slug.indexOf('searchPhrase') > -1;
        }

        return true;
    }

    // Check for excluded posts
    if(
        filterValue.indexOf('is:excluded') === 0 &&
        post.status.indexOf('excluded') > -1 &&
        post.status.indexOf('trashed') === -1
    ) {
        if(searchPhrase !== '') {
            return post.title.indexOf(searchPhrase) > -1 || post.slug.indexOf('searchPhrase') > -1;
        }

        return true;
    }

    // Check the easy cases first
    if(
        (
            filterValue.trim() === '' || 
            post.title.indexOf(filterValue) > -1 ||
            post.slug.indexOf(filterValue) > -1
        ) &&
        post.status.indexOf('trashed') === -1
    ) {
        return true;
    }

    // Unfortunately - there is no criteria which this post meets
    return false;
};
