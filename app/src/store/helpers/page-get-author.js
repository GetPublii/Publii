export default (state, postID) => {
    let authorName = state.currentSite.pagesAuthors.filter(pageAuthor => {
        return pageAuthor.postID === postID;
    });

    if (authorName.length) {
        return authorName[0].authorName;
    }

    return '';
};
