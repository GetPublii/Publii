'use strict';

/**
 * electron-builder `beforeBuild` hook.
 *
 * electron-builder 26.15+ rebuilds native modules through @electron/rebuild,
 * which calls node-gyp directly and never runs a module's npm `install`
 * script. `cpu-features` (optional dependency of ssh2) generates
 * `buildcheck.gypi` in its install script and its gyp files include that
 * file, so when `app/node_modules` was installed with scripts disabled
 * (`npm ci --ignore-scripts`, `ignore-scripts=true`) the rebuild aborts with:
 *
 *   gyp: buildcheck.gypi not found (cwd: .../app/node_modules/cpu-features)
 *
 * This hook recreates the file exactly the way the install script does
 * (`node buildcheck.js > buildcheck.gypi`) and returns `true`, so
 * electron-builder continues with its regular native rebuild.
 */

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const MODULE_NAME = 'cpu-features';
const GENERATOR_FILE = 'buildcheck.js';
const GYPI_FILE = 'buildcheck.gypi';

function runGenerator(generatorPath, cwd) {
    return execFileSync(process.execPath, [generatorPath], {
        cwd,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'inherit']
    });
}

function isValidGypi(filePath) {
    let content;

    try {
        content = fs.readFileSync(filePath, 'utf8');
    } catch (error) {
        return false;
    }

    if (!content.trim()) {
        return false;
    }

    try {
        JSON.parse(content);
    } catch (error) {
        return false;
    }

    return true;
}

/**
 * Ensures `node_modules/cpu-features/buildcheck.gypi` exists under `appDir`.
 *
 * @param {string} appDir - electron-builder app directory (`app/`)
 * @param {{ run?: typeof runGenerator }} [options] - test seam
 * @returns {{ status: 'absent'|'no-generator'|'present'|'generated', gypiPath: string|null }}
 */
function ensureCpuFeaturesBuildcheck(appDir, options = {}) {
    const run = options.run || runGenerator;
    const moduleDir = path.join(path.resolve(appDir), 'node_modules', MODULE_NAME);
    const generatorPath = path.join(moduleDir, GENERATOR_FILE);
    const gypiPath = path.join(moduleDir, GYPI_FILE);

    if (!fs.existsSync(moduleDir)) {
        return { status: 'absent', gypiPath: null };
    }

    if (!fs.existsSync(generatorPath)) {
        return { status: 'no-generator', gypiPath: null };
    }

    if (isValidGypi(gypiPath)) {
        return { status: 'present', gypiPath };
    }

    let output;

    try {
        output = run(generatorPath, moduleDir);
    } catch (error) {
        throw new Error(
            `beforeBuild: failed to run ${path.relative(process.cwd(), generatorPath)} ` +
            `(needed to generate ${GYPI_FILE} for ${MODULE_NAME}): ${error.message}`
        );
    }

    try {
        JSON.parse(output);
    } catch (error) {
        throw new Error(
            `beforeBuild: ${GENERATOR_FILE} of ${MODULE_NAME} did not produce valid JSON, ` +
            `refusing to write ${GYPI_FILE}: ${error.message}`
        );
    }

    fs.writeFileSync(gypiPath, output);

    return { status: 'generated', gypiPath };
}

function beforeBuild(context) {
    const result = ensureCpuFeaturesBuildcheck(context.appDir);

    if (result.status === 'generated') {
        console.log(`  • beforeBuild  generated ${path.relative(process.cwd(), result.gypiPath)} (install script was not run for ${MODULE_NAME})`);
    }

    // `true` tells electron-builder to proceed with its own native rebuild.
    return true;
}

module.exports = {
    default: beforeBuild,
    ensureCpuFeaturesBuildcheck,
    isValidGypi
};
