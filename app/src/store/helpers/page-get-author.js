export default (state, pageID) => {
    let authorName = state.currentSite.pagesAuthors.filter(pageAuthor => {
        return pageAuthor.pageID === pageID;
    });

    if (authorName.length) {
        return authorName[0].authorName;
    }

    return '';
};
