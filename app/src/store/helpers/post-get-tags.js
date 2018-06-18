export default (state, postID) => {
    let postsTags = state.currentSite.postsTags.filter(postTag => {
        return postTag.postID === postID;
    }).map(postTag => {
        return postTag.tagID;
    });

    if(postsTags.length) {
        postsTags = postsTags.map(postTag => {
            let tagName = state.currentSite.tags.filter(tag => {
                return postTag === tag.id;
            });

            if(tagName.length) {
                tagName = tagName[0].name;
            } else {
                tagName = '';
            }

            return {
                name: tagName,
                id: postTag
            };
        });

        postsTags = postsTags.filter(postTag => {
            return postTag.name !== ''
        });

        return postsTags;
    }

    return false;
}
