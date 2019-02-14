/**
 * Helper for loading post data
 *
 * {{#getPost POST_ID}}
 *    <h2>{{ title }}</h2>
 *    <div>{{{ excerpt }}}</div>
 * {{/getPost}}
 *
 * IMPORTANT: It requires availability of the @website.contentStructure global variable
 */
function getPostHelper(rendererInstance, Handlebars) {
    Handlebars.registerHelper('getPost', function (postID, options) {
        if (!rendererInstance.contentStructure.posts) {
            return 'Error: @website.contentStructure global variable is not available.';
        }

        let postData = rendererInstance.contentStructure.posts.filter(post => post.id === postID);

        if(!postData.length) {
            return '';
        }

        return options.fn(postData[0]);
    });
}

module.exports = getPostHelper;
