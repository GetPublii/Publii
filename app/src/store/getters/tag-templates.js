/**
 * Returns prepared array with tag templates
 *
 * @param state
 * @param getters
 *
 * @returns {array}
 */

export default (state, getters) => {
    let tagTemplates = {
        "": "Default"
    };

    if(!state.currentSite.tagTemplates || !state.currentSite.tagTemplates[0]) {
        return tagTemplates;
    }

    for(let i = 0; i < state.currentSite.tagTemplates.length; i++) {
        tagTemplates[state.currentSite.tagTemplates[i][0]] = state.currentSite.tagTemplates[i][1];
    }

    return tagTemplates;
};
