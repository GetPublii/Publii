const transliterate = require('transliteration').transliterate;
const slug = require('slug');

/*
 * Custom mode of rfc3986 without unicode symbols
 */
slug.defaults.modes['rfc3986-non-unicode'] = {
    replacement: '-',                   // replace spaces with replacement
    symbols: false,                     // replace unicode symbols or not
    remove: /[\.]/g,                    // (optional) regex to remove characters
    lower: true,                        // result in lower case
    charmap: slug.charmap,              // replace special characters
    multicharmap: slug.multicharmap,    // replace multi-characters
    trim: true,                         // remove leading and trailing replacement chars
};

slug.defaults.modes['rfc3986-non-unicode-with-dots'] = {
    replacement: '-',                   // replace spaces with replacement
    symbols: false,                     // replace unicode symbols or not
    lower: true,                        // result in lower case
    charmap: slug.charmap,              // replace special characters
    multicharmap: slug.multicharmap,    // replace multi-characters
    trim: true,                         // remove leading and trailing replacement chars
};

slug.defaults.modes['rfc3986-non-unicode-with-dots-no-lower'] = {
    replacement: '-',                   // replace spaces with replacement
    symbols: false,                     // replace unicode symbols or not
    lower: false,                       // result in lower case
    charmap: slug.charmap,              // replace special characters
    multicharmap: slug.multicharmap,    // replace multi-characters
    trim: true,                         // remove leading and trailing replacement chars
};

slug.defaults.mode = 'rfc3986-non-unicode';

/**
 * Define custom slug charmap
 */
slug.defaults.charmap['ä'] = 'ae';
slug.defaults.charmap['Ä'] = 'AE';
slug.defaults.charmap['ö'] = 'oe';
slug.defaults.charmap['Ö'] = 'OE';
slug.defaults.charmap['ü'] = 'ue';
slug.defaults.charmap['Ü'] = 'UE';
slug.defaults.charmap['ß'] = 'ss';
slug.defaults.charmap['ẞ'] = 'SS';

function createSlug(textToSlugify, filenameMode = false, saveLowerChars = false) {
    textToSlugify = transliterate(textToSlugify, { replace: [
        ['ä', 'ae'], 
        ['Ä', 'AE'], 
        ['ö', 'oe'], 
        ['Ö', 'OE'], 
        ['ü', 'ue'], 
        ['Ü', 'UE'], 
        ['ß', 'ss'], 
        ['ẞ', 'SS'],
        ['«', ''],
        ['»', ''],
        ['$', '']
    ] });

    if(!filenameMode) {
        if(saveLowerChars) {
            slug.defaults.mode = 'rfc3986-non-unicode-with-dots-no-lower';
        }

        textToSlugify = slug(textToSlugify);
        slug.defaults.mode = 'rfc3986-non-unicode';
    } else {
        slug.defaults.mode = 'rfc3986-non-unicode-with-dots';
        textToSlugify = slug(textToSlugify);
        slug.defaults.mode = 'rfc3986-non-unicode';
    }

    return textToSlugify;
}

module.exports = createSlug;
