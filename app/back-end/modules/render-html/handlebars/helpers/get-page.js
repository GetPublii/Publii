/**
 * Helper for loading page data
 *
 * {{#getPage PAGE_ID}}
 *    <h2>{{ title }}</h2>
 *    <div>{{{ excerpt }}}</div>
 * {{/getPage}}
 *
 * IMPORTANT: It requires availability of the @website.contentStructure global variable
 */
function getPageHelper(rendererInstance, Handlebars) {
    Handlebars.registerHelper('getPage', function (pageID, options) {
        if (!rendererInstance.contentStructure.pages) {
            return 'Error: @website.contentStructure global variable is not available.';
        }

        let pageData = rendererInstance.contentStructure.pages.filter(page => page.id === pageID);

        if(!pageData.length) {
            return '';
        }

        return options.fn(pageData[0]);
    });
}

module.exports = getPageHelper;
