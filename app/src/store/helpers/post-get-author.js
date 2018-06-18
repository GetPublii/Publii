export default (state, postID) => {
    let authorName = state.currentSite.postsAuthors.filter(postAuthor => {
        return postAuthor.postID === postID;
    });

    if(authorName.length) {
        return authorName[0].authorName;
    }

    return '';
};
