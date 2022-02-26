/**
 * Helper for loading authors data
 *
 * {{#getAuthors "AUTHOR_ID_1,AUTHOR_ID_2,AUTHOR_ID_N" "prefix" "suffix"}}
 * <li>{{ name }}</li>
 * {{/getAuthors}}
 *
 * Authors are ordered by the ID order in the string.
 *
 * The second parameter creates HTML prefix, the third parameter creates HTML suffix for the generated output.
 *
 * IMPORTANT: It requires availability of the @website.contentStructure global variable
 */
 function getAuthorsHelper(rendererInstance, Handlebars) {
    Handlebars.registerHelper('getAuthors', function (authorsIDs, prefix, suffix, options) {
        if (!rendererInstance.contentStructure.authors) {
            return 'Error: @website.contentStructure global variable is not available.';
        }

        let content = '';
        authorsIDs = authorsIDs.split(',').map(n => parseInt(n, 10));

        for (let i = 0; i < authorsIDs.length; i++) {
            let authorData = rendererInstance.contentStructure.authors.filter(author => author.id === authorsIDs[i]);

            if (authorData.length) {
                options.data.index = i;
                content += options.fn(authorData[0]);
            }
        }

        if(content === '') {
            return '';
        }

        content = [prefix, content, suffix].join('');

        return content;
    });
}

module.exports = getAuthorsHelper;
