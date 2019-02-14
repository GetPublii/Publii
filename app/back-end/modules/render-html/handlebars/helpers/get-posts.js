/**
 * Helper for loading posts data
 *
 * {{#getPosts "POST_ID_1,POST_ID_2,POST_ID_N" "prefix" "suffix"}}
 * <article>
 *    <h2>{{ title }}</h2>
 *    <div>{{{ excerpt }}}</div>
 * </article>
 * {{/getPosts}}
 *
 * Posts are ordered by the ID order in the string.
 *
 * The second parameter creates HTML prefix, the third parameter creates HTML suffix for the generated output.
 *
 * IMPORTANT: It requires availability of the @website.contentStructure global variable
 */
function getPostsHelper(rendererInstance, Handlebars) {
    Handlebars.registerHelper('getPosts', function (postIDs, prefix, suffix, options) {
        if (!rendererInstance.contentStructure.posts) {
            return 'Error: @website.contentStructure global variable is not available.';
        }

        let content = '';
        postIDs = postIDs.split(',').map(n => parseInt(n, 10));

        for (let i = 0; i < postIDs.length; i++) {
            let postData = rendererInstance.contentStructure.posts.filter(post => post.id === postIDs[i]);

            if (postData.length) {
                options.data.index = i;
                content += options.fn(postData[0]);
            }
        }

        if(content === '') {
            return '';
        }

        content = [prefix, content, suffix].join('');

        return content;
    });
}

module.exports = getPostsHelper;
