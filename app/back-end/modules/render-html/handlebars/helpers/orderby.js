/**
 * Helper used to order collection
 *
 * @param collection
 * @param field
 * @param direction
 */

function orderby (collection, field, direction) {
    collection.sort((itemA, itemB) => {
        if(typeof itemA[field] === 'string') {
            if (direction === 'ASC') {
                if(itemA[field] < itemB[field]) {
                    return -1;
                } else if(itemA[field] === itemB[field]) {
                    return 0;
                } else {
                    return 1;
                }
            } else {
                if(itemA[field] > itemB[field]) {
                    return -1;
                } else if(itemA[field] === itemB[field]) {
                    return 0;
                } else {
                    return 1;
                }
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
