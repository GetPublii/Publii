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
        let basePath = state.languagesPath;

        if (language.type === 'default') {
            basePath = state.languagesDefaultPath;
        }
        
        return {
            type: language.type,
            name: language.name,
            version: language.version,
            directory: language.directory,
            publiiSupport: language.publiiSupport,
            thumbnail: basePath + '/' + language.directory + '/' + 'thumbnail.svg',
            momentLocale: language.momentLocale,
            wysiwygTranslation: language.wysiwygTranslation
        };
    });
};
