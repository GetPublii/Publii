/*
 * Picks the spellchecker language supported by Chromium for the language of a website
 */

/**
 * Returns the exact language (i.e. en-GB) or - when it is not available - its base language (i.e. en)
 *
 * @param {string} language - language code from the site config
 * @param {string[]} availableLanguages - session.availableSpellCheckerLanguages
 * @returns {string|null}
 */
function resolveSpellcheckerLanguage (language, availableLanguages) {
    if (typeof language !== 'string' || !Array.isArray(availableLanguages)) {
        return null;
    }

    let languageParts = language.toLocaleLowerCase().split('-');
    let baseLanguage = languageParts[0];
    let exactLanguage = languageParts[1] ? baseLanguage + '-' + languageParts[1].toLocaleUpperCase() : baseLanguage;

    return [exactLanguage, baseLanguage].find(item => availableLanguages.indexOf(item) > -1) || null;
}

module.exports = {
    resolveSpellcheckerLanguage
};
