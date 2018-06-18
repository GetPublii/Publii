/**
 * Returns array with website names
 *
 * @param state
 * @param getters
 *
 * @returns {array}
 */

export default (state, getters) => {
    let displayNames = {};
    let siteNames = Object.keys(state.sites);

    for(let name of siteNames) {
        let displayName = state.sites[name].displayName;

        if(!displayName) {
            displayName = state.sites[name].name;
        }

        displayNames[name] = displayName;
    }

    return displayNames;
};
