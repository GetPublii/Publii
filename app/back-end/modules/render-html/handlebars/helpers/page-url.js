/**
 * Helper for creating pagination URL
 *
 * {{pageUrl @pagination.context NUMBER}}
 *
 * @returns {string} URL for the specific page in the pagination for the given context
 */
function pageURLHelper(rendererInstance, Handlebars) {
    Handlebars.registerHelper('pageUrl', function (context, number) {
        let path = [rendererInstance.siteConfig.domain];
        number = parseInt(number, 10);

        // Skip context for homepage
        if (context !== '') {
            path.push(context);
        }

        // Skip page/X for URLs in page = 1
        if (number > 1) {
            path.push(rendererInstance.siteConfig.advanced.urls.pageName);
            path.push(number);
        }

        if(rendererInstance.previewMode || rendererInstance.siteConfig.advanced.urls.addIndex) {
            path.push('index.html');
        }

        // Connect the URL parts
        path = path.join('/');

        if(!rendererInstance.previewMode) {
            path += '/';
        }

        let url = Handlebars.Utils.escapeExpression(path);

        return new Handlebars.SafeString(url);
    });
}

module.exports = pageURLHelper;
