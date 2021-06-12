/**
 * Returns prepared array with languages
 *
 * @param state
 * @param getters
 *
 * @returns {array}
 */

 export default (state, getters) => {
    return state.languages.map(language => {
        return {
            name: language.name,
            version: language.version,
            directory: language.directory,
            publiiSupport: language.publiiSupport,
            thumbnail: state.languagesPath + '/' + language.directory + '/' + 'thumbnail.png'
        };
    });
};
