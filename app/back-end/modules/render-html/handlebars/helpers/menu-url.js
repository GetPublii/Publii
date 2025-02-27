const Handlebars = require('handlebars');
const slug = require('./../../../../helpers/slug');

/**
 * Helper for creating URLs in menu
 *
 * {{menuUrl}}
 *
 * Available types:
 * - post
 * - page
 * - tag
 * - frontpage
 * - blogpage
 * - tags
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
        if (this.type === 'post') {
            if (rendererInstance.siteConfig.advanced.urls.cleanUrls) {
                if (rendererInstance.siteConfig.advanced.urls.postsPrefix) {
                    output = baseUrl + '/' + rendererInstance.siteConfig.advanced.urls.postsPrefix + '/' + this.link + '/';
                } else {
                    output = baseUrl + '/' + this.link + '/';
                }
                // In the preview mode we have to load URLs with
                // index.html as filesystem on OS doesn't behave
                // as the server environment and not redirect to
                // a proper URL
                if(rendererInstance.previewMode || rendererInstance.siteConfig.advanced.urls.addIndex) {
                    output += 'index.html';
                }
            } else {
                if (rendererInstance.siteConfig.advanced.urls.postsPrefix) {
                    output = baseUrl + '/' + rendererInstance.siteConfig.advanced.urls.postsPrefix + '/' + this.link + '.html';
                } else {
                    output = baseUrl + '/' + this.link + '.html';
                }
            }
        }

        // Link to the single page
        if (this.type === 'page') {
            let parentItems = rendererInstance.cachedItems.pagesStructureHierarchy[this.linkID];
            let pageSlug = this.link;

            if (rendererInstance.siteConfig.advanced.usePageAsFrontpage && rendererInstance.siteConfig.advanced.pageAsFrontpage === this.linkID) {
                output = baseUrl + '/';

                // In the preview mode we have to load URLs with
                // index.html as filesystem on OS doesn't behave
                // as the server environment and not redirect to
                // a proper URL
                if (rendererInstance.previewMode || rendererInstance.siteConfig.advanced.urls.addIndex) {
                    output += 'index.html';
                }   
            } else {
                if (rendererInstance.siteConfig.advanced.urls.cleanUrls && parentItems && parentItems.length) {
                    let slugs = [];

                    for (let i = 0; i < parentItems.length; i++) {
                        if (rendererInstance.cachedItems.pages[parentItems[i]]) {
                            slugs.push(rendererInstance.cachedItems.pages[parentItems[i]].slug);
                        }
                    }

                    slugs.push(this.link);
                    pageSlug = slugs.join('/');
                }

                if (rendererInstance.siteConfig.advanced.urls.cleanUrls) {
                    output = baseUrl + '/' + pageSlug + '/';
                    // In the preview mode we have to load URLs with
                    // index.html as filesystem on OS doesn't behave
                    // as the server environment and not redirect to
                    // a proper URL
                    if (rendererInstance.previewMode || rendererInstance.siteConfig.advanced.urls.addIndex) {
                        output += 'index.html';
                    }
                } else {
                    output = baseUrl + '/' + pageSlug + '.html';
                }
            }
        }

        // Link to the tag pages
        if (this.type === 'tag') {
            output = baseUrl + '/' + this.link + '/';

            if (rendererInstance.siteConfig.advanced.urls.tagsPrefix !== '') {
                output = baseUrl + '/' + rendererInstance.siteConfig.advanced.urls.tagsPrefix + '/' + this.link + '/';
            }

            if (rendererInstance.siteConfig.advanced.urls.postsPrefix && rendererInstance.siteConfig.advanced.urls.tagsPrefixAfterPostsPrefix) {
                output = baseUrl + '/' + rendererInstance.siteConfig.advanced.urls.postsPrefix + '/' + rendererInstance.siteConfig.advanced.urls.tagsPrefix + '/' + this.link + '/';
            }

            // In the preview mode we have to load URLs with
            // index.html as filesystem on OS doesn't behave
            // as the server environment and not redirect to
            // a proper URL
            if (rendererInstance.previewMode || rendererInstance.siteConfig.advanced.urls.addIndex) {
                output += 'index.html';
            }
        }

        // Link to the author pages
        if (this.type === 'author') {
            output = baseUrl + '/' + rendererInstance.siteConfig.advanced.urls.authorsPrefix + '/' + slug(this.link) + '/';

            if (rendererInstance.siteConfig.advanced.urls.postsPrefix && rendererInstance.siteConfig.advanced.urls.authorsPrefixAfterPostsPrefix) {
                output = baseUrl + '/' + rendererInstance.siteConfig.advanced.urls.postsPrefix + '/' + rendererInstance.siteConfig.advanced.urls.authorsPrefix + '/' + slug(this.link) + '/';
            }

            // In the preview mode we have to load URLs with
            // index.html as filesystem on OS doesn't behave
            // as the server environment and not redirect to
            // a proper URL
            if (rendererInstance.previewMode || rendererInstance.siteConfig.advanced.urls.addIndex) {
                output += 'index.html';
            }
        }

        // Link to the frontpage - just the page domain name
        if (this.type === 'frontpage') {
            output = baseUrl + '/';

            // In the preview mode we have to load URLs with
            // index.html as filesystem on OS doesn't behave
            // as the server environment and not redirect to
            // a proper URL
            if (rendererInstance.previewMode || rendererInstance.siteConfig.advanced.urls.addIndex) {
                output += 'index.html';
            }
        }

        // Link to the blogpage - just the page domain name or page with posts prefix
        if (this.type === 'blogpage') {
            output = baseUrl + '/';

            if (rendererInstance.siteConfig.advanced.urls.postsPrefix) {
                output = baseUrl + '/' + rendererInstance.siteConfig.advanced.urls.postsPrefix + '/';
            }

            // In the preview mode we have to load URLs with
            // index.html as filesystem on OS doesn't behave
            // as the server environment and not redirect to
            // a proper URL
            if (rendererInstance.previewMode || rendererInstance.siteConfig.advanced.urls.addIndex) {
                output += 'index.html';
            }
        }

        // Link to the tags list - just the page domain name with tags prefix
        if (this.type === 'tags') {
            output = baseUrl + '/' + rendererInstance.siteConfig.advanced.urls.tagsPrefix + '/';

            if (rendererInstance.siteConfig.advanced.urls.postsPrefix && rendererInstance.siteConfig.advanced.urls.tagsPrefixAfterPostsPrefix) {
                output = baseUrl + '/' + rendererInstance.siteConfig.advanced.urls.postsPrefix + '/' + rendererInstance.siteConfig.advanced.urls.tagsPrefix + '/';
            }

            // In the preview mode we have to load URLs with
            // index.html as filesystem on OS doesn't behave
            // as the server environment and not redirect to
            // a proper URL
            if (rendererInstance.previewMode || rendererInstance.siteConfig.advanced.urls.addIndex) {
                output += 'index.html';
            }
        }

        // External links which should start with protocol
        if (this.type === 'external') {
            output = this.link;
        }

        // Internal links which should start with the page domain name
        if (this.type === 'internal') {
            output = baseUrl + '/' + this.link;
        }

        output = Handlebars.Utils.escapeExpression(output);

        return new Handlebars.SafeString(output);
    });
}

module.exports = menuURLHelper;
