/**
 * Helper for loading author data
 *
 * {{#getAuthor AUTHOR_ID}}
 *    <p>{{ name }}</p>
 * {{/getAuthor}}
 * 
 * {{#getAuthor "AUTHOR_USERNAME"}}
 *    <p>{{ name }}</p>
 * {{/getAuthor}}
 *
 * IMPORTANT: It requires availability of the @website.contentStructure global variable
 */
 function getAuthorHelper(rendererInstance, Handlebars) {
    Handlebars.registerHelper('getAuthor', function (selectedAuthor, options) {
        if (!rendererInstance.contentStructure.authors) {
            return 'Error: @website.contentStructure global variable is not available.';
        }

        let authorData; 
        
        if (typeof selectedAuthor === 'number') {
            authorData = rendererInstance.contentStructure.authors.filter(author => author.id === selectedAuthor);
        } else {
            authorData = rendererInstance.contentStructure.authors.filter(author => author.username === selectedAuthor);
        }

        if(!authorData.length) {
            return '';
        }

        return options.fn(authorData[0]);
    });
}

module.exports = getAuthorHelper;
