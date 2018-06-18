/**
 * Returns prepared array with themes
 *
 * @param state
 * @param getters
 *
 * @returns {array}
 */

export default (state, getters) => {
    return state.themes.map(theme => {
        return {
            name: theme.name,
            version: theme.version,
            directory: theme.directory,
            thumbnail: state.themesPath + '/' + theme.directory + '/' + 'thumbnail.png'
        };
    });
};
