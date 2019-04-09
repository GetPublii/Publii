/**
 * Helper for loading posts data which contains a specific tag(s) - specified by tag ID or tag slugs separated by comma
 *
 * Get up to five posts which contains a tag with given ID
 * 
 * {{#getPostsByTags 5 TAG_ID1 ""}}
 *    <h2>{{ title }}</h2>
 *    <div>{{{ excerpt }}}</div>
 * {{/getPostByTags}}
 * 
 * Get up to five posts which contains one of the given tag slugs
 * 
 * {{#getPostByTags 5 "TAG_SLUG1,TAG_SLUG2" ""}}
 *    <h2>{{ title }}</h2>
 *    <div>{{{ excerpt }}}</div>
 * {{/getPostByTags}}
 * 
 * Get up to five posts which contains one of the given tag slugs excluding posts with ID equal to 1 or 2
 * 
 * {{#getPostByTags 5 "TAG_SLUG1,TAG_SLUG2" "1,2"}}
 *    <h2>{{ title }}</h2>
 *    <div>{{{ excerpt }}}</div>
 * {{/getPostByTags}}
 *
 * IMPORTANT: It requires availability of the @website.contentStructure global variable
 */
function getPostsByTagsHelper (rendererInstance, Handlebars) {
    Handlebars.registerHelper('getPostsByTags', function (count, selectedTags, excludedPosts, options) {
        if (!rendererInstance.contentStructure.posts) {
            return 'Error: @website.contentStructure global variable is not available.';
        }

        if (count === -1) {
            count = 999;
        }

        let postsData;
        let content = '';
        let filteredPosts = JSON.parse(JSON.stringify(rendererInstance.contentStructure.posts));

        if (typeof excludedPosts === 'number' || typeof excludedPosts === 'string' && excludedPosts !== '') {
            if (typeof excludedPosts === 'number') {
                let excludedPost = excludedPosts;
                filteredPosts = filteredPosts.filter(post => post.id !== excludedPost)
            } else {
                excludedPosts = excludedPosts.split(',').map(n => parseInt(n, 10));
                filteredPosts = filteredPosts.filter(post => excludedPosts.indexOf(post.id) === -1);
            }
        }

        if (typeof selectedTags === 'number') {
            let tagID = selectedTags;
            postsData = filteredPosts.filter(post => post.tags.filter(tag => tag.id === tagID).length);            
        } else {
            let tagsSlugs = selectedTags.split(',');
            postsData = filteredPosts.filter(post => post.tags.filter(tag => tagsSlugs.indexOf(tag.slug) > -1).length);
        }

        for (let i = 0; i < count; i++) {
            if (postsData.length >= i + 1) {
                options.data.index = i;
                content += options.fn(postsData[i]);
            } else {
                break;
            }
        }

        if (content === '') {
            return '';
        }

        return content;
    });
}

module.exports = getPostsByTagsHelper;
