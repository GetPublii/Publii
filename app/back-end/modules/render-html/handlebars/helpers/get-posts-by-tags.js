/**
 * Helper for loading posts data which contains a specific tag(s) - specified by tag ID or tag slugs separated by comma
 *
 * Get up to five posts which contains a tag with given ID
 * 
 * {{#getPostsByTags 5 TAG_ID1 ""}}
 *    <h2>{{ title }}</h2>
 *    <div>{{{ excerpt }}}</div>
 * {{/getPostByTags}}
 * 
 * Get up to five posts which contains one of the given tag slugs
 * 
 * {{#getPostsByTags 5 "TAG_SLUG1,TAG_SLUG2" ""}}
 *    <h2>{{ title }}</h2>
 *    <div>{{{ excerpt }}}</div>
 * {{/getPostsByTags}}
 * 
 * Get up to five posts which contains one of the given tag slugs excluding posts with ID equal to 1 or 2
 * 
 * {{#getPostsByTags 5 "TAG_SLUG1,TAG_SLUG2" "1,2"}}
 *    <h2>{{ title }}</h2>
 *    <div>{{{ excerpt }}}</div>
 * {{/getPostsByTags}}
 * 
 * QueryString options:
 * * count - how many posts should be included in the result
 * * allowed - which post statuses should be included
 * * tags - which tags should be used
 * * excluded - which posts should be excluded
 * * offset - how many posts to skip
 * * orderby - order field
 * * ordering - order direction
 * * tag_as - specify if we select by tag id or slug
 * 
 * {{#getPostsByTags "count=5&allowed=hidden,featured&tags=1,2,3&excluded=1,2&offset=10&orderby=modified_at&ordering=asc"}}
 *    <h2>{{ title }}</h2>
 *    <div>{{{ excerpt }}}</div>
 * {{/getPostsByTags}}
 *
 * IMPORTANT: It requires availability of the @website.contentStructure global variable
 */
function getPostsByTagsHelper (rendererInstance, Handlebars) {
    Handlebars.registerHelper('getPostsByTags', function (queryString, selectedTags, excludedPosts, options) {
        if (!rendererInstance.contentStructure.posts) {
            return 'Error: @website.contentStructure global variable is not available.';
        }

        let count;
        let offset = 0;
        let allowedStatus = 'any';
        let orderby = false;
        let ordering = 'desc';
        let tagAs = 'slug';

        if (typeof queryString === 'string') {
            options = selectedTags; // have to override option with second argument as query string syntax uses only one argument
            queryString = queryString.split('&').map(pair => pair.split('='));
            let queryStringData = {};

            for (let i = 0; i < queryString.length; i++) {
                let key = queryString[i][0];
                let value = queryString[i][1];
                queryStringData[key] = value;
            }

            if (queryStringData['count']) {
                count = parseInt(queryStringData['count'], 10);

                if (count === -1) {
                    count = 999;
                }
            }

            if (queryStringData['excluded']) {
                excludedPosts = queryStringData['excluded'];
            }

            if (queryStringData['tags']) {
                selectedTags = queryStringData['tags'];
            }

            if (queryStringData['allowed']) {
                allowedStatus = queryStringData['allowed'];
            }

            if (queryStringData['offset']) {
                offset = parseInt(queryStringData['offset']);
            }

            if (queryStringData['orderby']) {
                orderby = queryStringData['orderby'];
            }

            if (queryStringData['ordering']) {
                ordering = queryStringData['ordering'];
            }

            if (queryStringData['tag_as']) {
                tagAs = queryStringData['tag_as'];
            }
        } else {
            if (queryString === -1) {
                count = 999;
            } else {
                count = queryString;
            }
        }

        let postsData;
        let content = '';
        let filteredPosts = JSON.parse(JSON.stringify(rendererInstance.contentStructure.posts));

        if (typeof excludedPosts === 'number' || (typeof excludedPosts === 'string' && excludedPosts !== '')) {
            if (typeof excludedPosts === 'number') {
                let excludedPost = excludedPosts;
                filteredPosts = filteredPosts.filter(post => post.id !== excludedPost)
            } else {
                excludedPosts = excludedPosts.split(',').map(n => parseInt(n, 10));
                filteredPosts = filteredPosts.filter(post => excludedPosts.indexOf(post.id) === -1);
            }
        }

        if (allowedStatus !== 'any') {
            allowedStatus = allowedStatus.split(',');
            filteredPosts = filteredPosts.filter(post => {
                let hasAllowedStatus = false;

                for (let i = 0; i < allowedStatus.length; i++) {
                    if (post.status.indexOf(allowedStatus[i]) > -1) {
                        hasAllowedStatus = true;
                        break;
                    }
                }

                return hasAllowedStatus;
            });
        }

        if (typeof selectedTags === 'number') {
            let tagID = selectedTags;
            postsData = filteredPosts.filter(post => post.tags.filter(tag => tag.id === tagID).length);            
        } else if (typeof selectedTags === 'string') {
            if (tagAs === 'slug') {
                let tagsSlugs = selectedTags.split(',');
                postsData = filteredPosts.filter(post => post.tags.filter(tag => tagsSlugs.indexOf(tag.slug) > -1).length);
            } else {
                let tagsIDs = selectedTags.split(',').map(id => parseInt(id, 10));
                postsData = filteredPosts.filter(post => post.tags.filter(tag => tagsIDs.indexOf(tag.id) > -1).length);
            }
        } else {
            postsData = filteredPosts;
        }

        if (orderby && ordering) {
            postsData.sort((itemA, itemB) => {
                if(typeof itemA[orderby] === 'string') {
                    if (ordering === 'asc') {
                        return itemA[orderby].localeCompare(itemB[orderby]);
                    } else {
                        return -(itemA[orderby].localeCompare(itemB[orderby]));
                    }
                } else {
                    if (ordering === 'asc') {
                        return itemA[orderby] - itemB[orderby];
                    } else {
                        return itemB[orderby] - itemA[orderby];
                    }
                }
            });
        }

        for (let i = offset; i < count + offset; i++) {
            if (postsData.length >= i + 1) {
                options.data.index = i;
                content += options.fn(postsData[i]);
            } else {
                break;
            }
        }

        if (content === '') {
            return '';
        }

        return content;
    });
}

module.exports = getPostsByTagsHelper;
