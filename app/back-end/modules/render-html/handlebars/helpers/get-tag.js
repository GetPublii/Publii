/**
 * Helper for loading tag data
 *
 * {{#getTag TAG_ID}}
 *    <p>{{ name }}</p>
 * {{/getTag}}
 * 
 * {{#getTag "TAG_SLUG"}}
 *    <p>{{ name }}</p>
 * {{/getTag}}
 *
 * IMPORTANT: It requires availability of the @website.contentStructure global variable
 */
function getTagHelper(rendererInstance, Handlebars) {
    Handlebars.registerHelper('getTag', function (selectedTag, options) {
        if (!rendererInstance.contentStructure.tags) {
            return 'Error: @website.contentStructure global variable is not available.';
        }

        let tagData; 
        
        if (typeof selectedTag === 'number') {
            tagData = rendererInstance.contentStructure.tags.filter(tag => tag.id === selectedTag);
        } else {
            tagData = rendererInstance.contentStructure.tags.filter(tag => tag.slug === selectedTag);
        }

        if(!tagData.length) {
            return '';
        }

        return options.fn(tagData[0]);
    });
}

module.exports = getTagHelper;
