/**
 * Helper for loading posts data which contains a specific custom fields
 * 
 * QueryString options:
 * * count - how many posts should be included in the result
 * * allowed - which post statuses should be included
 * * customField - which custom field should be used
 * * customFieldValue - which value of custom field is expected
 * * customFieldCompare - default: 'equals', other available values: 'not-equals', 'greater', 'greater-equals', 'lesser', 'lesser-equals' (for numeric values), 'starts-with', 'ends-with', 'contains', 'not-contains' (for string values)
 * * excluded - which posts should be excluded
 * * excluded_status - which posts statuses should be excluded
 * * offset - how many posts to skip
 * * orderby - order field or customField
 * * ordering - order direction - asc, desc, random
 * * orderbyCompareLanguage - if orderby=customField, you can specify in which language ordering will be done.
 * 
 * {{#getPostsByCustomFields "count=5&allowed=hidden,featured&customField=test&customFieldValue=10&customFieldCompare=not-equals&excluded=1,2&offset=10&orderby=modified_at&ordering=desc"}}
 *    <h2>{{ title }}</h2>
 *    <div>{{{ excerpt }}}</div>
 * {{/getPostsByCustomFields}}
 *
 * IMPORTANT: It requires availability of the @website.contentStructure global variable
 */
function getPostsByCustomFieldsHelper (rendererInstance, Handlebars) {
    Handlebars.registerHelper('getPostsByCustomFields', function (queryString, options) {
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
        let customFieldValue = false;
        let customFieldCompare = 'equals';
        let compareLanguage = false;

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

        if (queryStringData['customField']) {
            customField = queryStringData['customField'];
        }

        if (queryStringData['customFieldValue']) {
            customFieldValue = queryStringData['customFieldValue'];
        }

        if (queryStringData['customFieldCompare']) {
            customFieldCompare = queryStringData['customFieldCompare'];
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

        if (queryStringData['orderbyCompareLanguage']) {
            compareLanguage = queryStringData['orderbyCompareLanguage'];
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

        filteredPosts = filteredPosts.filter(post => {
            if (!post.postViewConfig[customField]) {
                return false;
            }

            switch (customFieldCompare) {
                case 'equals': 
                    return post.postViewConfig[customField] == customFieldValue;
                case 'not-equals': 
                    return post.postViewConfig[customField] != customFieldValue;
                case 'greater': 
                    return parseInt(post.postViewConfig[customField], 10) > parseInt(customFieldValue, 10);
                case 'greater-equals': 
                    return parseInt(post.postViewConfig[customField], 10) >= parseInt(customFieldValue, 10);
                case 'lesser': 
                    return parseInt(post.postViewConfig[customField], 10) < parseInt(customFieldValue, 10);
                case 'lesser-equals': 
                    return parseInt(post.postViewConfig[customField], 10) <= parseInt(customFieldValue, 10);
                case 'starts-with': 
                    return post.postViewConfig[customField].indexOf(customFieldValue) === 0;
                case 'ends-with': 
                    return post.postViewConfig[customField].lastIndexOf(customFieldValue) === post.postViewConfig[customField].length - customFieldValue.length;
                case 'contains': 
                    return post.postViewConfig[customField].indexOf(customFieldValue) !== -1;
                case 'not-contains': 
                    return post.postViewConfig[customField].indexOf(customFieldValue) === -1;
            }
        });

        postsData = filteredPosts;

        if (orderby && ordering && ordering !== 'random') {
            postsData.sort((itemA, itemB) => {
                if (orderby === 'customField') {
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

module.exports = getPostsByCustomFieldsHelper;
