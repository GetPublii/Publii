/**
 * Returns array with website names
 *
 * @param state
 * @param getters
 *
 * @returns {array}
 */

export default (state, getters) => {
    let siteNames = Object.keys(state.sites);

    siteNames.sort(function(a, b){
        if (a.toLowerCase() < b.toLowerCase()) {
            return -1;
        }

        if (a.toLowerCase() > b.toLowerCase()) {
            return 1;
        }

        return 0;
    });

    return siteNames;
};
