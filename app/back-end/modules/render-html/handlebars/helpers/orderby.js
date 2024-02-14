/**
 * Helper used to order collection
 *
 * @param collection
 * @param field
 * @param direction
 * @param langForLocaleCompare
 */

function orderby (collection, field, direction, langForLocaleCompare = false) {
    collection.sort((itemA, itemB) => {
        if (typeof itemA[field] === 'string') {
            if (langForLocaleCompare) {
                if (direction === 'ASC') {
                    return itemA[field].localeCompare(itemB[field], langForLocaleCompare);
                } else {
                    return -1 * itemA[field].localeCompare(itemB[field], langForLocaleCompare);
                }
            }

            if (direction === 'ASC') {
                return itemA[field].localeCompare(itemB[field]);
            } else {
                return -1 * itemA[field].localeCompare(itemB[field]);
            }
        } else {
            if (direction === 'ASC') {
                return itemA[field] - itemB[field];
            } else {
                return itemB[field] - itemA[field];
            }
        }
    });
}

module.exports = orderby;
