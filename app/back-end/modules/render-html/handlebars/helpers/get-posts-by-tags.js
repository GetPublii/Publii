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
 * * excluded_status - which posts statuses should be excluded
 * * offset - how many posts to skip
 * * orderby - order field or customField
 * * ordering - order direction - asc, desc, random
 * * customField - use when orderby=customField - name of the field to be used for ordering
 * * orderbyCompareLanguage - if orderby=customField, you can specify in which language ordering will be done.
 * * tag_as - specify if we select by tag id or slug
 * * operator - (OR or AND as value) - defines how the tags should be selected (post must have all tags at once time - AND, or one of them - OR)
 * 
 * {{#getPostsByTags "count=5&allowed=hidden,featured&tag_as=id&tags=1,2,3&excluded=1,2&offset=10&orderby=modified_at&ordering=desc&operator=AND"}}
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
        let excludedStatus = '';
        let orderby = false;
        let ordering = 'desc';
        let customField = false;
        let compareLanguage = false;
        let tagAs = 'slug';
        let operator = 'OR';

        if (typeof queryString === 'string' && queryString.indexOf('=') > -1) {
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

            if (queryStringData['excluded_status']) {
                excludedStatus = queryStringData['excluded_status'];
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

            if (queryStringData['customField']) {
                customField = queryStringData['customField'];
            }

            if (queryStringData['orderbyCompareLanguage']) {
                compareLanguage = queryStringData['orderbyCompareLanguage'];
            }

            if (queryStringData['tag_as']) {
                tagAs = queryStringData['tag_as'];
            }

            if (queryStringData['operator']) {
                operator = queryStringData['operator'];

                if (operator !== 'AND' && operator !== 'OR') {
                    operator = 'OR';
                }
            }
        } else {
            if (queryString === -1 || queryString === '-1') {
                count = 999;
            } else {
                count = parseInt(queryString, 10);
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

            if (excludedStatus !== '') {
                excludedStatus = excludedStatus.split(',');
            }

            filteredPosts = filteredPosts.filter(post => {
                if (excludedStatus) {
                    for (let i = 0; i < excludedStatus.length; i++) {
                        if (post.status.indexOf(excludedStatus[i]) > -1) {
                            return false;
                        }
                    }
                }
                
                for (let i = 0; i < allowedStatus.length; i++) {
                    if (post.status.indexOf(allowedStatus[i]) > -1) {
                        return true;
                    }
                }

                return false;
            });
        } else if (allowedStatus === 'any' && excludedStatus !== '') {
            excludedStatus = excludedStatus.split(',');

            filteredPosts = filteredPosts.filter(post => {
                for (let i = 0; i < excludedStatus.length; i++) {
                    if (post.status.indexOf(excludedStatus[i]) > -1) {
                        return false;
                    }
                }

                return true;
            });
        }

        if (typeof selectedTags === 'number') {
            let tagID = selectedTags;
            postsData = filteredPosts.filter(post => post.tags.filter(tag => tag.id === tagID).length || post.hiddenTags.filter(tag => tag.id === tagID).length);    
        } else if (typeof selectedTags === 'string') {
            if (tagAs === 'slug') {
                let tagsSlugs = [...new Set(selectedTags.split(','))];

                if (operator === 'OR') {
                    postsData = filteredPosts.filter(post => post.tags.filter(tag => tagsSlugs.indexOf(tag.slug) > -1).length || post.hiddenTags.filter(tag => tagsSlugs.indexOf(tag.slug) > -1).length);
                } else if (operator === 'AND') {
                    postsData = filteredPosts.filter(post => post.tags.filter(tag => tagsSlugs.indexOf(tag.slug) > -1).length + post.hiddenTags.filter(tag => tagsSlugs.indexOf(tag.slug) > -1).length === tagsSlugs.length);
                }
            } else {
                let tagsIDs = [...new Set(selectedTags.split(',').map(id => parseInt(id, 10)))];

                if (operator === 'OR') {
                    postsData = filteredPosts.filter(post => post.tags.filter(tag => tagsIDs.indexOf(tag.id) > -1).length || post.hiddenTags.filter(tag => tagsIDs.indexOf(tag.id) > -1).length);
                } else if (operator === 'AND') {
                    postsData = filteredPosts.filter(post => post.tags.filter(tag => tagsIDs.indexOf(tag.id) > -1).length + post.hiddenTags.filter(tag => tagsIDs.indexOf(tag.id) > -1).length === tagsIDs.length);
                }
            }
        } else {
            postsData = filteredPosts;
        }

        if (orderby && ordering && ordering !== 'random') {
            postsData.sort((itemA, itemB) => {
                if (orderby === 'customField' && customField) {
                    if (isNaN(itemA.postViewConfig[customField]) && isNaN(itemB.postViewConfig[customField])) {
                        if (ordering === 'asc') {
                            if (compareLanguage) {
                                return itemA.postViewConfig[customField].localeCompare(itemB.postViewConfig[customField], compareLanguage);
                            } else {
                                return itemA.postViewConfig[customField].localeCompare(itemB.postViewConfig[customField]);
                            }
                        } else {
                            if (compareLanguage) {
                                return -(itemA.postViewConfig[customField].localeCompare(itemB.postViewConfig[customField], compareLanguage));
                            } else {
                                return -(itemA.postViewConfig[customField].localeCompare(itemB.postViewConfig[customField]));
                            }
                        }
                    } else {
                        if (ordering === 'asc') {
                            return parseInt(itemA.postViewConfig[customField], 10) - parseInt(itemB.postViewConfig[customField], 10);
                        } else {
                            return parseInt(itemB.postViewConfig[customField], 10) - parseInt(itemA.postViewConfig[customField], 10);
                        }
                    }
                }

                if (orderby !== 'customField') {
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
                }
            });
        } else if (ordering === 'random') {
            postsData.sort(() => 0.5 - Math.random());
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
