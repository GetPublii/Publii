/**
 * Helper for loading single post data which contains a specific tag(s) - specified by tag ID or tag slugs separated by comma
 *
 * Get post which contains a tag with given ID
 * 
 * {{#getPostByTags TAG_ID1 ""}}
 *    <h2>{{ title }}</h2>
 *    <div>{{{ excerpt }}}</div>
 * {{/getPostByTags}}
 * 
 * Get post which contains one of the given tag slugs
 * 
 * {{#getPostByTags "TAG_SLUG1,TAG_SLUG2" ""}}
 *    <h2>{{ title }}</h2>
 *    <div>{{{ excerpt }}}</div>
 * {{/getPostByTags}}
 * 
 * Get post which contains one of the given tag slugs excluding posts with ID equal to 1 or 2
 * 
 * {{#getPostByTags "TAG_SLUG1,TAG_SLUG2" "1,2"}}
 *    <h2>{{ title }}</h2>
 *    <div>{{{ excerpt }}}</div>
 * {{/getPostByTags}}
 *
 * IMPORTANT: It requires availability of the @website.contentStructure global variable
 */
function getPostByTagsHelper (rendererInstance, Handlebars) {
    Handlebars.registerHelper('getPostByTags', function (selectedTags, excludedPosts, options) {
        if (!rendererInstance.contentStructure.posts) {
            return 'Error: @website.contentStructure global variable is not available.';
        }

        let postData;
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
            postData = filteredPosts.filter(post => post.tags.filter(tag => tag.id === tagID).length || post.hiddenTags.filter(tag => tag.id === tagID).length);            
        } else {
            let tagsSlugs = selectedTags.split(',');
            postData = filteredPosts.filter(post => post.tags.filter(tag => tagsSlugs.indexOf(tag.slug) > -1).length || post.hiddenTags.filter(tag => tagsSlugs.indexOf(tag.slug) > -1).length);
        }

        if(!postData.length) {
            return '';
        }

        return options.fn(postData[0]);
    });
}

module.exports = getPostByTagsHelper;
