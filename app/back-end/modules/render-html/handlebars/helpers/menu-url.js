const Handlebars = require('handlebars');
const slug = require('./../../../../helpers/slug');

/**
 * Helper for creating URLs in menu
 *
 * {{menuUrl}}
 *
 * Available types:
 * - post
 * - tag
 * - frontpage
 * - external
 * - internal
 *
 * @returns {string} - URL for the current menu item
 */
function menuURLHelper(rendererInstance, Handlebars) {
    Handlebars.registerHelper('menuUrl', function() {
        let output = '';
        let baseUrl = rendererInstance.siteConfig.domain;

        // Link to the single post pages
        if(this.type === 'post') {
            if(rendererInstance.siteConfig.advanced.urls.cleanUrls) {
                output = baseUrl + '/' + this.link + '/';
                // In the preview mode we have to load URLs with
                // index.html as filesystem on OS doesn't behave
                // as the server environment and not redirect to
                // a proper URL
                if(rendererInstance.previewMode || rendererInstance.siteConfig.advanced.urls.addIndex) {
                    output += 'index.html';
                }
            } else {
                output = baseUrl + '/' + this.link + '.html';
            }
        }

        // Link to the tag pages
        if(this.type === 'tag') {
            output = baseUrl + '/' + this.link + '/';

            if(rendererInstance.siteConfig.advanced.urls.tagsPrefix !== '') {
                output = baseUrl + '/' + rendererInstance.siteConfig.advanced.urls.tagsPrefix + '/' + this.link + '/';
            }

            // In the preview mode we have to load URLs with
            // index.html as filesystem on OS doesn't behave
            // as the server environment and not redirect to
            // a proper URL
            if(rendererInstance.previewMode || rendererInstance.siteConfig.advanced.urls.addIndex) {
                output += 'index.html';
            }
        }

        // Link to the author pages
        if(this.type === 'author') {
            output = baseUrl + '/' + rendererInstance.siteConfig.advanced.urls.authorsPrefix + '/' + slug(this.link) + '/';

            // In the preview mode we have to load URLs with
            // index.html as filesystem on OS doesn't behave
            // as the server environment and not redirect to
            // a proper URL
            if(rendererInstance.previewMode || rendererInstance.siteConfig.advanced.urls.addIndex) {
                output += 'index.html';
            }
        }

        // Link to the frontpage - just the page domain name
        if(this.type === 'frontpage') {
            output = baseUrl + '/';

            // In the preview mode we have to load URLs with
            // index.html as filesystem on OS doesn't behave
            // as the server environment and not redirect to
            // a proper URL
            if(rendererInstance.previewMode || rendererInstance.siteConfig.advanced.urls.addIndex) {
                output += 'index.html';
            }
        }

        // External links which should start with protocol
        if(this.type === 'external') {
            output = this.link;
        }

        // Internal links which should start with the page domain name
        if(this.type === 'internal') {
            output = baseUrl + '/' + this.link;
        }

        output = Handlebars.Utils.escapeExpression(output);

        return new Handlebars.SafeString(output);
    });
}

module.exports = menuURLHelper;
