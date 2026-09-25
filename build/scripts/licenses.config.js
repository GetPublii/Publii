'use strict';

/*
 * Configuration of build/scripts/generate-licenses.js
 */
module.exports = {
    /*
     * Production packages skipped entirely (prefix match on the package name).
     * Use only for packages which do not ship any runtime code.
     */
    exclude: [],

    /*
     * SPDX expressions for packages which do not declare a license in their
     * package.json (or declare a non-SPDX value). Key: "name" or "name@version".
     * Add an entry only after verifying the license in the package sources.
     */
    declaredLicenses: {
        'exif-parser@0.1.12': 'MIT',
        'nanobus@3.3.0': 'MIT',
        'component-props@1.1.1': 'MIT'
    },

    /*
     * SPDX identifiers compatible with GPL-3.0 which are accepted
     * in the production dependencies (case-insensitive)
     */
    allowedLicenses: [
        '0BSD',
        'Apache-2.0',
        'BlueOak-1.0.0',
        'BSD-2-Clause',
        'BSD-3-Clause',
        'CC0-1.0',
        'GPL-3.0',
        'GPL-3.0-only',
        'GPL-3.0-or-later',
        'ISC',
        'LGPL-2.1',
        'LGPL-2.1-only',
        'LGPL-2.1-or-later',
        'LGPL-3.0',
        'LGPL-3.0-only',
        'LGPL-3.0-or-later',
        'MIT',
        'MIT-0',
        'MPL-2.0',
        'Unlicense',
        'Zlib'
    ]
};
