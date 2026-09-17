const assert = require('node:assert/strict');
const { resolveSpellcheckerLanguage } = require('../spellchecker-language.js');

describe('Spellchecker language', function () {
    const availableLanguages = ['en', 'en-GB', 'en-US', 'pl', 'de', 'pt-BR'];

    it('prefers the exact language of the website', function () {
        assert.equal(resolveSpellcheckerLanguage('en-gb', availableLanguages), 'en-GB');
        assert.equal(resolveSpellcheckerLanguage('EN-us', availableLanguages), 'en-US');
        assert.equal(resolveSpellcheckerLanguage('pl', availableLanguages), 'pl');
    });

    it('falls back to the base language', function () {
        assert.equal(resolveSpellcheckerLanguage('pl-PL', availableLanguages), 'pl');
        assert.equal(resolveSpellcheckerLanguage('de-at', availableLanguages), 'de');
    });

    it('returns null when the language is not supported', function () {
        assert.equal(resolveSpellcheckerLanguage('pt-PT', availableLanguages), null);
        assert.equal(resolveSpellcheckerLanguage('null', availableLanguages), null);
        assert.equal(resolveSpellcheckerLanguage(undefined, availableLanguages), null);
        assert.equal(resolveSpellcheckerLanguage('pl', undefined), null);
    });
});
