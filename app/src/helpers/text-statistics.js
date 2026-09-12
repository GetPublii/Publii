const wordSegmenter = new Intl.Segmenter(undefined, { granularity: 'word' });
const characterSegmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

function countTextStatistics (text) {
    // TinyMCE uses a zero-width no-break space as an internal caret marker.
    let content = text.replace(/\uFEFF/g, '');
    let words = 0;
    let uniqueWords = new Set();
    let characters = 0;
    let charactersWithoutSpaces = 0;

    for (let item of wordSegmenter.segment(content)) {
        if (!item.isWordLike) {
            continue;
        }

        words += 1;
        uniqueWords.add(item.segment.normalize('NFC').toLowerCase().replace(/\u2019/g, "'"));
    }

    for (let item of characterSegmenter.segment(content)) {
        // Line and paragraph breaks separate words but are not printed characters.
        if (/^[\r\n]+$/u.test(item.segment)) {
            continue;
        }

        characters += 1;

        if (!/^\s+$/u.test(item.segment)) {
            charactersWithoutSpaces += 1;
        }
    }

    return {
        words,
        uniqueWords: uniqueWords.size,
        characters,
        charactersWithoutSpaces
    };
}

module.exports = countTextStatistics;
