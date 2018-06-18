const Handlebars = require('handlebars');

/**
 * Helper functin used for creating translatable phrases
 *
 * {{ translate 'key.subkey' [string1 string2 ...] }}
 *
 * @returns {string} - translation for a given strings
 */
function translate(key) {
    let translation = '[MISSING TRANSLATION]';

    /*
     * this is pointing to the rendererInstance
     */
    if(this.translations.user) {
        let result = resolveObject(this.translations.user, key);

        if(result) {
            translation = result;
        } else if(this.translations.theme) {
            let result = resolveObject(this.translations.theme, key);

            if (result) {
                translation = result;
            }
        }
    } else if(this.translations.theme) {
        let result = resolveObject(this.translations.theme, key);

        if(result) {
            translation = result;
        }
    }

    if(typeof translation === 'object') {
        // Parse complex translation (plurals)
        let numberToUse = Array.prototype.slice.call(arguments).slice(1);
        numberToUse.pop();

        if(numberToUse.length != 1 || isNaN(numberToUse[0])) {
            translation = '[NO NUMBER FOR THE PLURAL PHRASE]';
        } else {
            let number = parseInt(numberToUse[0], 10);

            if(translation[number]) {
                translation = translation[number];
            } else {
                if(translation.default) {
                    translation = translation.default;
                } else {
                    translation = '[THERE IS NO DEFINITION FOR THE DEFAULT VALUE IN THE PLURAL PHRASE]';
                }
            }
        }
    } else if(translation.indexOf('%s') > -1) {
        // Parse arguments and merge into translation
        let phrasesToReplace = Array.prototype.slice.call(arguments).slice(1);
        phrasesToReplace.pop();

        if(translation.match(/%s/g).length !== phrasesToReplace.length) {
            translation = '[WRONG TRANSLATION ARGUMENTS NUMBER]';
        } else {
            let textToTransform = translation;

            for(let i = 0; i < phrasesToReplace.length; i++) {
                textToTransform = textToTransform.replace('%s', phrasesToReplace[i]);
            }

            translation = textToTransform;
        }
    }

    return new Handlebars.SafeString(translation);
}

/**
 * Helper function to return a value inside the object for a given object path
 *
 * @param {object} obj - object to traverse
 * @param {string} path - path in the object structure
 *
 * @returns {mixed} - undefined if specific value does not exist inside the object
 *                    or the value under specific object path
 */
function resolveObject(obj, path) {
    if(!obj || !path) {
        return undefined;
    }

    return path.split('.').reduce(function(previous, current) {
        return previous ? previous[current] : undefined
    }, obj);
}

/**
 * Helper for creating translatable phrases
 *
 * {{ translate 'key.subkey' [string1 string2 ...] }}
 */
function translateHelper(rendererInstance, Handlebars) {
    Handlebars.registerHelper('translate', translate.bind(rendererInstance));
}

module.exports = {
    translateHelper: translateHelper,
    __resolveObject: resolveObject,
    __translate: translate
};
