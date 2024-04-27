/**
 * Helper for loading posts data
 *
 * {{#getPages "PAGE_ID_1,PAGE_ID_2,PAGE_ID_N" "prefix" "suffix"}}
 * <article>
 *    <h2>{{ title }}</h2>
 *    <div>{{{ excerpt }}}</div>
 * </article>
 * {{/getPages}}
 *
 * Pages are ordered by the ID order in the string.
 *
 * The second parameter creates HTML prefix, the third parameter creates HTML suffix for the generated output.
 *
 * IMPORTANT: It requires availability of the @website.contentStructure global variable
 */
function getPagesHelper(rendererInstance, Handlebars) {
    Handlebars.registerHelper('getPages', function (pageIDs, prefix, suffix, options) {
        if (!rendererInstance.contentStructure.pages) {
            return 'Error: @website.contentStructure global variable is not available.';
        }

        let content = '';
        pageIDs = pageIDs.split(',').map(n => parseInt(n, 10));

        for (let i = 0; i < pageIDs.length; i++) {
            let pageData = rendererInstance.contentStructure.pages.filter(page => page.id === pageIDs[i]);

            if (pageData.length) {
                options.data.index = i;
                content += options.fn(pageData[0]);
            }
        }

        if (content === '') {
            return '';
        }

        content = [prefix, content, suffix].join('');

        return content;
    });
}

module.exports = getPagesHelper;
