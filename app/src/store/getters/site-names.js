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
    siteNames.sort((a, b) => a.localeCompare(b));
    return siteNames;
};
