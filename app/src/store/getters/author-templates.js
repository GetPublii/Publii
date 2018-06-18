/**
 * Returns prepared array with author templates
 *
 * @param state
 * @param getters
 *
 * @returns {array}
 */

export default (state, getters) => {
    let authorTemplates = {
        "": "Default"
    };

    if(!state.currentSite.authorTemplates || !state.currentSite.authorTemplates[0]) {
        return authorTemplates;
    }

    for(let i = 0; i < state.currentSite.authorTemplates.length; i++) {
        authorTemplates[state.currentSite.authorTemplates[i][0]] = state.currentSite.authorTemplates[i][1];
    }

    return authorTemplates;
};
