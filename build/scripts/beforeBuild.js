'use strict';

/**
 * electron-builder `beforeBuild` hook.
 *
 * Removes `cpu-features` (optional dependency of ssh2) from `app/node_modules`
 * before electron-builder rebuilds native modules, so it is neither compiled
 * nor packaged. It comes back with the next `npm install` / `npm ci` in `app/`.
 *
 * Why: electron-builder 26.15+ rebuilds every native module found in the
 * dependency tree through @electron/rebuild and exposes no option to skip one.
 * `cpu-features` is a NAN addon that
 *   (a) needs `buildcheck.gypi`, generated only by its npm install script,
 *       which never runs when node_modules was installed with scripts disabled
 *       (`gyp: buildcheck.gypi not found`), and
 *   (b) fails to compile against Electron 43+ headers with the GCC shipped by
 *       Ubuntu 22.04 (11.x).
 * At the same time the module is dead weight in Publii: ssh2 consults it only
 * when its own native crypto binding (`lib/protocol/crypto`, never rebuilt for
 * Electron) is loaded, so the cipher list is identical with or without it,
 * and ssh2 loads it inside a try/catch.
 *
 * Effects, verified against electron-builder 26.15.3 / @electron/rebuild 4.2:
 *   - @electron/rebuild skips dependencies whose directory does not exist,
 *   - the node_modules collector logs "dependency not found on disk" (warn)
 *     and continues,
 *   - at runtime `require('cpu-features')` throws MODULE_NOT_FOUND, which ssh2
 *     catches.
 */

const fs = require('node:fs');
const path = require('node:path');

const MODULE_NAME = 'cpu-features';

function readPackageName(moduleDir) {
    try {
        return JSON.parse(fs.readFileSync(path.join(moduleDir, 'package.json'), 'utf8')).name;
    } catch (error) {
        return null;
    }
}

/**
 * Removes `node_modules/cpu-features` under `appDir`.
 *
 * @param {string} appDir - electron-builder app directory (`app/`)
 * @returns {{ status: 'absent'|'removed', moduleDir: string }}
 */
function removeCpuFeatures(appDir) {
    const moduleDir = path.join(path.resolve(appDir), 'node_modules', MODULE_NAME);

    if (!fs.existsSync(moduleDir)) {
        return { status: 'absent', moduleDir };
    }

    const name = readPackageName(moduleDir);

    if (name !== MODULE_NAME) {
        throw new Error(
            `beforeBuild: refusing to remove ${path.relative(process.cwd(), moduleDir)}: ` +
            `expected package.json with name "${MODULE_NAME}", found ${name === null ? 'none' : `"${name}"`}`
        );
    }

    fs.rmSync(moduleDir, { recursive: true, force: true });

    return { status: 'removed', moduleDir };
}

function beforeBuild(context) {
    const result = removeCpuFeatures(context.appDir);

    if (result.status === 'removed') {
        console.log(`  • beforeBuild  removed ${path.relative(process.cwd(), result.moduleDir)} (unused by Publii; excluded from native rebuild and package)`);
    }

    // `true` tells electron-builder to proceed with its own native rebuild.
    return true;
}

module.exports = {
    default: beforeBuild,
    removeCpuFeatures
};
