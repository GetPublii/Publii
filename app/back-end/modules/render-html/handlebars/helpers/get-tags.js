/**
 * Helper for loading tags data
 *
 * {{#getTags "TAG_ID_1,TAG_ID_2,TAG_ID_N" "prefix" "suffix"}}
 * <li>{{ name }}</li>
 * {{/getTags}}
 *
 * Tags are ordered by the ID order in the string.
 *
 * The second parameter creates HTML prefix, the third parameter creates HTML suffix for the generated output.
 *
 * IMPORTANT: It requires availability of the @website.contentStructure global variable
 */
function getTagsHelper(rendererInstance, Handlebars) {
    Handlebars.registerHelper('getTags', function (tagsIDs, prefix, suffix, options) {
        if (!rendererInstance.contentStructure.tags) {
            return 'Error: @website.contentStructure global variable is not available.';
        }

        let content = '';
        tagsIDs = tagsIDs.split(',').map(n => parseInt(n, 10));

        for (let i = 0; i < tagsIDs.length; i++) {
            let tagData = rendererInstance.contentStructure.tags.filter(tag => tag.id === tagsIDs[i]);

            if (tagData.length) {
                options.data.index = i;
                content += options.fn(tagData[0]);
            }
        }

        if(content === '') {
            return '';
        }

        content = [prefix, content, suffix].join('');

        return content;
    });
}

module.exports = getTagsHelper;
