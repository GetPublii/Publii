const assert = require('node:assert/strict');
const countTextStatistics = require('../text-statistics');

describe('Editor text statistics', function () {
    it('includes punctuation in both character counts', function () {
        assert.deepEqual(countTextStatistics('Ala ma kota.'), {
            words: 3,
            uniqueWords: 3,
            characters: 12,
            charactersWithoutSpaces: 10
        });
    });

    it('recognizes words independently of surrounding punctuation and letter case', function () {
        assert.deepEqual(countTextStatistics('Kot, kot. KOT!'), {
            words: 3,
            uniqueWords: 1,
            characters: 14,
            charactersWithoutSpaces: 12
        });
        assert.equal(countTextStatistics('kot,pies;kot').words, 3);
        assert.equal(countTextStatistics('kot,pies;kot').uniqueWords, 2);
    });

    it('does not count punctuation-only tokens as words', function () {
        assert.deepEqual(countTextStatistics('... — !!!'), {
            words: 0,
            uniqueWords: 0,
            characters: 9,
            charactersWithoutSpaces: 7
        });
    });

    it('preserves ordinary and non-breaking spaces only in the inclusive count', function () {
        assert.deepEqual(countTextStatistics('A  B\u00A0C\tD'), {
            words: 4,
            uniqueWords: 4,
            characters: 8,
            charactersWithoutSpaces: 4
        });
    });

    it('uses line breaks as word separators without adding characters for paragraph formatting', function () {
        assert.deepEqual(countTextStatistics('Ala\n\nkot\r\npies'), {
            words: 3,
            uniqueWords: 3,
            characters: 10,
            charactersWithoutSpaces: 10
        });
    });

    it('recognizes canonically equivalent accents and typographic apostrophes', function () {
        const accents = countTextStatistics('café cafe\u0301 CAFÉ');
        assert.equal(accents.uniqueWords, 1);
        assert.equal(accents.characters, 14);
        assert.equal(accents.charactersWithoutSpaces, 12);
        assert.equal(countTextStatistics("don't don’t DON'T").uniqueWords, 1);
    });

    it('counts emoji as displayed characters rather than UTF-16 units', function () {
        assert.deepEqual(countTextStatistics('😀 👩‍💻'), {
            words: 0,
            uniqueWords: 0,
            characters: 3,
            charactersWithoutSpaces: 2
        });
    });

    it('supports words in scripts without spaces', function () {
        const result = countTextStatistics('你好世界');
        assert.equal(result.words, 2);
        assert.equal(result.characters, 4);
        assert.equal(result.charactersWithoutSpaces, 4);
    });

    it('ignores internal editor caret markers', function () {
        assert.deepEqual(countTextStatistics('\uFEFFkot\uFEFF'), {
            words: 1,
            uniqueWords: 1,
            characters: 3,
            charactersWithoutSpaces: 3
        });
    });

    it('returns zero statistics for empty content', function () {
        assert.deepEqual(countTextStatistics(''), {
            words: 0,
            uniqueWords: 0,
            characters: 0,
            charactersWithoutSpaces: 0
        });
    });
});
