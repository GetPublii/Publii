/**
 * Helper for loading pages data which contains a specific custom fields
 * 
 * QueryString options:
 * * count - how many pages should be included in the result
 * * customField - which custom field should be used
 * * customFieldValue - which value of custom field is expected
 * * customFieldCompare - default: 'equals', other available values: 'not-equals', 'greater', 'greater-equals', 'lesser', 'lesser-equals' (for numeric values), 'starts-with', 'ends-with', 'contains', 'not-contains' (for string values)
 * * excluded - which pages should be excluded
 * * offset - how many pages to skip
 * * orderby - order field or customField
 * * ordering - order direction - asc, desc, random
 * * orderbyCompareLanguage - if orderby=customField, you can specify in which language ordering will be done.
 * 
 * {{#getPagesByCustomFields "count=5&customField=test&customFieldValue=10&customFieldCompare=not-equals&excluded=1,2&offset=10&orderby=modified_at&ordering=desc"}}
 *    <h2>{{ title }}</h2>
 *    <div>{{{ excerpt }}}</div>
 * {{/getPagesByCustomFields}}
 *
 * IMPORTANT: It requires availability of the @website.contentStructure global variable
 */
function getPagesByCustomFieldsHelper (rendererInstance, Handlebars) {
    Handlebars.registerHelper('getPagesByCustomFields', function (queryString, options) {
        if (!rendererInstance.contentStructure.pages) {
            return 'Error: @website.contentStructure global variable is not available.';
        }

        let count;
        let offset = 0;
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
            excludedPages = queryStringData['excluded'];
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

        let pagesData;
        let content = '';
        let filteredPages = JSON.parse(JSON.stringify(rendererInstance.contentStructure.pages));

        if (typeof excludedPages === 'number' || (typeof excludedPages === 'string' && excludedPages !== '')) {
            if (typeof excludedPages === 'number') {
                let excludedPage = excludedPages;
                filteredPages = filteredPages.filter(page => page.id !== excludedPage)
            } else {
                excludedPages = excludedPages.split(',').map(n => parseInt(n, 10));
                filteredPages = filteredPages.filter(page => excludedPages.indexOf(page.id) === -1);
            }
        }

        filteredPages = filteredPages.filter(page => {
            if (!page.pageViewConfig[customField]) {
                return false;
            }

            switch (customFieldCompare) {
                case 'equals': 
                    return page.pageViewConfig[customField] == customFieldValue;
                case 'not-equals': 
                    return page.pageViewConfig[customField] != customFieldValue;
                case 'greater': 
                    return parseInt(page.pageViewConfig[customField], 10) > parseInt(customFieldValue, 10);
                case 'greater-equals': 
                    return parseInt(page.pageViewConfig[customField], 10) >= parseInt(customFieldValue, 10);
                case 'lesser': 
                    return parseInt(page.pageViewConfig[customField], 10) < parseInt(customFieldValue, 10);
                case 'lesser-equals': 
                    return parseInt(page.pageViewConfig[customField], 10) <= parseInt(customFieldValue, 10);
                case 'starts-with': 
                    return page.pageViewConfig[customField].indexOf(customFieldValue) === 0;
                case 'ends-with': 
                    return page.pageViewConfig[customField].lastIndexOf(customFieldValue) === page.pageViewConfig[customField].length - customFieldValue.length;
                case 'contains': 
                    return page.pageViewConfig[customField].indexOf(customFieldValue) !== -1;
                case 'not-contains': 
                    return page.pageViewConfig[customField].indexOf(customFieldValue) === -1;
            }
        });

        pagesData = filteredPages;

        if (orderby && ordering && ordering !== 'random') {
            pagesData.sort((itemA, itemB) => {
                if (orderby === 'customField') {
                    if (isNaN(itemA.pageViewConfig[customField]) && isNaN(itemB.pageViewConfig[customField])) {
                        if (ordering === 'asc') {
                            if (compareLanguage) {
                                return itemA.pageViewConfig[customField].localeCompare(itemB.pageViewConfig[customField], compareLanguage);
                            } else {
                                return itemA.pageViewConfig[customField].localeCompare(itemB.pageViewConfig[customField]);
                            }
                        } else {
                            if (compareLanguage) {
                                return -(itemA.pageViewConfig[customField].localeCompare(itemB.pageViewConfig[customField], compareLanguage));
                            } else {
                                return -(itemA.pageViewConfig[customField].localeCompare(itemB.pageViewConfig[customField]));
                            }
                        }
                    } else {
                        if (ordering === 'asc') {
                            return parseInt(itemA.pageViewConfig[customField], 10) - parseInt(itemB.pageViewConfig[customField], 10);
                        } else {
                            return parseInt(itemB.pageViewConfig[customField], 10) - parseInt(itemA.pageViewConfig[customField], 10);
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
            pagesData.sort(() => 0.5 - Math.random());
        }

        for (let i = offset; i < count + offset; i++) {
            if (pagesData.length >= i + 1) {
                options.data.index = i;
                content += options.fn(pagesData[i]);
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

module.exports = getPagesByCustomFieldsHelper;
