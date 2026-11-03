'use strict';

/*
 * Prepares app/dist for the editor loaded by app/dist/index.html:
 *   - builds the standalone editor stylesheets (app/dist/css),
 *   - recreates app/dist/vendor with HugeRTE and jQuery copied from
 *     app/src/helpers/vendor.
 *
 * Cross-platform replacement for the former shell/cmd script chains behind
 * `npm run prepare-editor` and `npm run prepare-editor:win`.
 */

const fs = require('node:fs');
const path = require('node:path');
const prepareEditorCss = require('./prepare-editor-css.js');

const appDir = path.join(__dirname, '..', '..', 'app');
const vendorSrcDir = path.join(appDir, 'src', 'helpers', 'vendor');
const vendorDistDir = path.join(appDir, 'dist', 'vendor');
const vendorPackages = ['hugerte', 'jquery'];

prepareEditorCss();

fs.rmSync(vendorDistDir, { recursive: true, force: true });
fs.mkdirSync(vendorDistDir, { recursive: true });

for (const name of vendorPackages) {
    fs.cpSync(path.join(vendorSrcDir, name), path.join(vendorDistDir, name), { recursive: true });
    console.log('Copied: app/dist/vendor/' + name);
}
