import createPostFilter from '../helpers/post-filter.js';

const coreDataCache = new WeakMap();

function getPostCoreData (post) {
    let cached = coreDataCache.get(post);

    if (cached && cached.raw === post.additional_data) {
        return cached;
    }

    let additionalData = JSON.parse(post.additional_data);
    let coreData = {
        raw: post.additional_data,
        mainTag: '',
        editor: 'tinymce'
    };

    if (additionalData && additionalData.mainTag) {
        coreData.mainTag = parseInt(additionalData.mainTag, 10);
    }

    if (additionalData && additionalData.editor) {
        coreData.editor = additionalData.editor;
    }

    coreDataCache.set(post, coreData);
    return coreData;
}

/**
 * Returns array of current site posts
 *
 * @param state
 * @param getters
 *
 * @returns {array}
 */

export default (state, getters) => (filterValue, orderBy = 'id', order = 'DESC') => {
    if (!state.currentSite.posts) {
        return [];
    }

    let tagNames = new Map();

    for (let tag of state.currentSite.tags) {
        tagNames.set(tag.id, tag.name);
    }

    let postsTags = new Map();

    for (let xref of state.currentSite.postsTags) {
        let tagName = tagNames.get(xref.tagID);

        if (!tagName) {
            continue;
        }

        let tags = postsTags.get(xref.postID);

        if (!tags) {
            tags = [];
            postsTags.set(xref.postID, tags);
        }

        tags.push({
            name: tagName,
            id: xref.tagID
        });
    }

    for (let tags of postsTags.values()) {
        tags.sort((tagA, tagB) => tagA.name.localeCompare(tagB.name));
    }

    let postsAuthors = new Map();

    for (let xref of state.currentSite.postsAuthors) {
        if (!postsAuthors.has(xref.postID)) {
            postsAuthors.set(xref.postID, xref.authorName);
        }
    }

    let postFilter = createPostFilter(state, filterValue, { postsTags, postsAuthors });
    let posts = [];

    for (let post of state.currentSite.posts) {
        if (post.title === null || !postFilter(post)) {
            continue;
        }

        let coreData = getPostCoreData(post);

        posts.push({
            id: post.id,
            editor: coreData.editor,
            title: post.title,
            slug: post.slug,
            tags: postsTags.get(post.id) || false,
            status: post.status,
            created: post.created_at,
            modified: post.modified_at,
            isHidden: post.status.indexOf('hidden') > -1,
            isExcludedOnHomepage: post.status.indexOf('excluded_homepage') > -1,
            isDraft: post.status.indexOf('draft') > -1,
            isFeatured: post.status.indexOf('featured') > -1,
            isTrashed: post.status.indexOf('trashed') > -1,
            author_id: post.authors,
            author: postsAuthors.get(post.id) || '',
            mainTag: coreData.mainTag
        });
    }

    posts.sort((postA, postB) => {
        if (orderBy === 'title') {
            if (order === 'DESC') {
                return -(postA.title.localeCompare(postB.title))
            }

            return postA.title.localeCompare(postB.title);
        }

        if (orderBy === 'author') {
            if (order === 'DESC') {
                return -(postA.author.localeCompare(postB.author))
            }

            return postA.author.localeCompare(postB.author);
        }

        if (order === 'DESC') {
            return postB[orderBy] - postA[orderBy];
        }

        return postA[orderBy] - postB[orderBy];
    });

    return posts;
};
