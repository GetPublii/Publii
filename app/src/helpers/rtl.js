/**
 * RTL (right-to-left) language helpers for the Publii UI.
 *
 * UI direction is derived from the active app language code (e.g. fa-ir, ar-bh).
 * Known RTL language roots cover Persian, Arabic, Hebrew, Urdu, etc.
 * Language packs may also declare "direction": "rtl" in config.json.
 */

const RTL_LANGUAGE_ROOTS = [
    'ar',  // Arabic
    'fa',  // Persian / Farsi
    'he',  // Hebrew
    'iw',  // Hebrew (legacy)
    'ur',  // Urdu
    'yi',  // Yiddish
    'ps',  // Pashto
    'sd',  // Sindhi
    'ckb', // Central Kurdish (Sorani)
    'ku',  // Kurdish
    'dv',  // Dhivehi
    'ha',  // Hausa (often RTL in Arabic script contexts)
    'ug',  // Uyghur
    'syr', // Syriac
    'arc'  // Aramaic
];

/**
 * Normalize language directory / locale code to a comparable root.
 * @param {string} languageCode e.g. "fa-ir", "ar-bh", "en-gb"
 * @returns {string}
 */
export function getLanguageRoot (languageCode) {
    if (!languageCode || typeof languageCode !== 'string') {
        return '';
    }

    return languageCode.toLowerCase().replace(/_/g, '-').split('-')[0];
}

/**
 * Whether a language code (or explicit direction) should use RTL UI.
 * @param {string} languageCode
 * @param {string} [explicitDirection] optional "rtl" | "ltr" from language config
 * @returns {boolean}
 */
export function isRtlLanguage (languageCode, explicitDirection) {
    if (explicitDirection === 'rtl') {
        return true;
    }

    if (explicitDirection === 'ltr') {
        return false;
    }

    const root = getLanguageRoot(languageCode);
    return RTL_LANGUAGE_ROOTS.indexOf(root) > -1;
}

/**
 * Apply document-level direction for the whole app UI.
 * @param {boolean} isRtl
 */
export function applyDocumentDirection (isRtl) {
    const dir = isRtl ? 'rtl' : 'ltr';
    const html = document.documentElement;
    const body = document.body;

    html.setAttribute('dir', dir);
    html.setAttribute('lang', html.getAttribute('lang') || (isRtl ? 'fa' : 'en'));

    if (body) {
        body.setAttribute('dir', dir);
        body.classList.toggle('is-rtl', isRtl);
        body.classList.toggle('is-ltr', !isRtl);
    }
}

/**
 * Resolve RTL from Vuex / i18n language state.
 * @param {string} languageCode current app language directory (e.g. fa-ir)
 * @param {string} [explicitDirection]
 * @returns {boolean}
 */
export function resolveAppIsRtl (languageCode, explicitDirection) {
    return isRtlLanguage(languageCode, explicitDirection);
}

export default {
    RTL_LANGUAGE_ROOTS,
    getLanguageRoot,
    isRtlLanguage,
    applyDocumentDirection,
    resolveAppIsRtl
};
