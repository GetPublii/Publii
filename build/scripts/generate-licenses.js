#!/usr/bin/env node

'use strict';

/*
 * Generates app/licenses/all-licenses.json (used by the Credits screen)
 * from the production dependencies listed in app/package-lock.json
 * and the manually maintained app/licenses/vendor-licenses.json.
 *
 * Usage:
 *   node build/scripts/generate-licenses.js          - validate and save the list
 *   node build/scripts/generate-licenses.js --check  - validate only, fail when the saved list is outdated
 */

const fs = require('fs');
const path = require('path');
const config = require('./licenses.config.js');

const projectRoot = path.resolve(__dirname, '../..');
const appRoot = path.join(projectRoot, 'app');
const licensesDirectory = path.join(appRoot, 'licenses');
const rootPackageFile = path.join(projectRoot, 'package.json');
const packageFile = path.join(appRoot, 'package.json');
const lockFile = path.join(appRoot, 'package-lock.json');
const vendorFile = path.join(licensesDirectory, 'vendor-licenses.json');
const outputFile = path.join(licensesDirectory, 'all-licenses.json');
const configPath = 'build/scripts/licenses.config.js';
const localLicenseFileName = 'license.txt';
// electron-builder does not ship Electron's LICENSES.chromium.html in the macOS bundle,
// so this copy (from the Electron release zip) is the only one in the macOS package
const requiredFiles = ['LICENSES.chromium.html'];
const managedFiles = new Set(['all-licenses.json', 'vendor-licenses.json', ...requiredFiles]);
const licenseFilePattern = /^(licen[cs]e|copying|unlicense)([.-][\w.-]*)?$/i;
const preferredLicenseFilePattern = /^licen[cs]e(\.(md|txt))?$/i;
const spdxOperators = ['and', 'or', 'with'];

function readJson(filePath) {
    if (!fs.existsSync(filePath)) {
        return null;
    }

    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function compareVersions(a, b) {
    return String(a).localeCompare(String(b), 'en', { numeric: true });
}

function compareStrings(a, b) {
    return a < b ? -1 : (a > b ? 1 : 0);
}

function sortObject(object) {
    return Object.keys(object || {}).sort().reduce((result, key) => {
        result[key] = object[key];
        return result;
    }, {});
}

function compact(object) {
    return Object.keys(object).reduce((result, key) => {
        if (object[key] !== null && object[key] !== undefined) {
            result[key] = object[key];
        }

        return result;
    }, {});
}

function getPackageNameFromLocation(location) {
    const marker = 'node_modules/';
    return location.slice(location.lastIndexOf(marker) + marker.length);
}

function getNestingLevel(location) {
    return location.split('node_modules/').length - 1;
}

function getLocalLicensePath(name) {
    return `licenses/${name}/${localLicenseFileName}`;
}

function isHttpUrl(url) {
    return typeof url === 'string' && /^https?:\/\/\S+$/i.test(url);
}

function normalizeLicense(packageData) {
    let license = packageData.license || packageData.licenses;

    if (Array.isArray(license)) {
        license = license
            .map(item => (item && item.type) || item)
            .filter(item => typeof item === 'string')
            .join(' OR ');
    } else if (license && typeof license === 'object') {
        license = license.type;
    }

    return typeof license === 'string' && license.trim() ? license.trim() : null;
}

function normalizeRepositoryUrl(repository) {
    let url = typeof repository === 'string' ? repository : repository && repository.url;

    if (typeof url !== 'string' || !url.trim()) {
        return null;
    }

    url = url.trim();

    const shorthand = url.match(/^(?:(github|gitlab|bitbucket):)?([\w-][\w.-]*\/[\w.-]+)$/);

    if (shorthand) {
        const hosts = {
            github: 'github.com',
            gitlab: 'gitlab.com',
            bitbucket: 'bitbucket.org'
        };

        return `https://${hosts[shorthand[1] || 'github']}/${shorthand[2].replace(/\.git$/, '')}`;
    }

    url = url
        .replace(/^git\+/, '')
        .replace(/^git@([^:/]+):/, 'https://$1/')
        .replace(/^(?:git|ssh):\/\/(?:git@)?/, 'https://')
        .replace(/#.*$/, '')
        .replace(/\.git$/, '')
        .replace(/\/+$/, '');

    return isHttpUrl(url) ? url : null;
}

function getHomepage(packageData) {
    if (isHttpUrl(packageData.homepage)) {
        return packageData.homepage;
    }

    return normalizeRepositoryUrl(packageData.repository);
}

/*
 * Returns the name of the license file shipped with the package.
 * README files are never used - electron-builder strips them from the final package.
 */
function findLicenseFile(directory) {
    let files;

    try {
        files = fs.readdirSync(directory, { withFileTypes: true });
    } catch (error) {
        return null;
    }

    const candidates = files
        .filter(file => file.isFile() && licenseFilePattern.test(file.name))
        .map(file => file.name)
        .sort((a, b) => {
            return Number(preferredLicenseFilePattern.test(b)) - Number(preferredLicenseFilePattern.test(a)) || compareStrings(a, b);
        });

    return candidates[0] || null;
}

/*
 * Checks a SPDX expression against the list of allowed licenses:
 * "A OR B" requires one of them, "A AND B" requires both,
 * "A WITH exception" is evaluated as "A" (an exception only adds permissions).
 * Throws on a malformed expression.
 */
function isLicenseAllowed(expression, allowedLicenses) {
    const allowed = new Set(allowedLicenses.map(license => license.toLowerCase()));
    const tokens = String(expression).match(/\(|\)|[^\s()]+/g) || [];
    let position = 0;

    const peek = () => (tokens[position] || '').toLowerCase();
    const isIdentifier = token => Boolean(token) && token !== '(' && token !== ')' && !spdxOperators.includes(token.toLowerCase());
    const fail = () => {
        throw new Error(`Invalid SPDX expression: "${expression}"`);
    };

    function parsePrimary() {
        const token = tokens[position++];

        if (token === '(') {
            const result = parseOr();

            if (tokens[position++] !== ')') {
                fail();
            }

            return result;
        }

        if (!isIdentifier(token)) {
            fail();
        }

        return allowed.has(token.toLowerCase());
    }

    function parseWith() {
        const result = parsePrimary();

        if (peek() === 'with') {
            if (!isIdentifier(tokens[position + 1])) {
                fail();
            }

            position += 2;
        }

        return result;
    }

    function parseAnd() {
        let result = parseWith();

        while (peek() === 'and') {
            position++;
            result = parseWith() && result;
        }

        return result;
    }

    function parseOr() {
        let result = parseAnd();

        while (peek() === 'or') {
            position++;
            result = parseAnd() || result;
        }

        return result;
    }

    const result = parseOr();

    if (position !== tokens.length) {
        fail();
    }

    return result;
}

function getLicensePolicyProblem(license, allowedLicenses) {
    try {
        if (isLicenseAllowed(license, allowedLicenses)) {
            return null;
        }

        return `license "${license}" is not on the allowed list in ${configPath}`;
    } catch (error) {
        return `"${license}" is not a valid SPDX expression - verify the license and add it to declaredLicenses in ${configPath}`;
    }
}

/*
 * Reads production packages from the lockfile and their metadata from node_modules
 */
function collectInstances(lock, report) {
    const instances = [];
    const usedExcludes = new Set();

    for (const [location, meta] of Object.entries(lock.packages || {})) {
        if (!location || meta.dev || meta.link || meta.extraneous) {
            continue;
        }

        const name = meta.name || getPackageNameFromLocation(location);
        const exclude = config.exclude.find(prefix => name.indexOf(prefix) === 0);

        if (exclude) {
            usedExcludes.add(exclude);
            report.excluded.add(name);
            continue;
        }

        // Platform-specific binaries (e.g. @img/sharp-win32-x64) share the license of their parent
        // package - skipping them makes the list independent of the machine which generated it
        if (meta.os || meta.cpu) {
            report.platformSpecific.add(name);
            continue;
        }

        const directory = path.join(appRoot, location);
        const packageData = readJson(path.join(directory, 'package.json'));

        if (!packageData) {
            if (meta.optional) {
                report.warnings.push(`${location}: optional package is not installed - skipped`);
            } else {
                report.errors.installation.push(`${location}: not installed - run "npm ci" in app/`);
            }

            continue;
        }

        if (meta.version && packageData.version !== meta.version) {
            report.errors.installation.push(`${location}: installed ${packageData.version}, package-lock.json expects ${meta.version} - run "npm ci" in app/`);
        }

        const licenseFile = findLicenseFile(directory);

        instances.push({
            name,
            version: packageData.version,
            location,
            license: normalizeLicense(packageData),
            homepage: getHomepage(packageData),
            licenseFile: licenseFile ? `${location}/${licenseFile}` : null
        });
    }

    for (const prefix of config.exclude) {
        if (!usedExcludes.has(prefix)) {
            report.warnings.push(`exclude "${prefix}" in ${configPath} does not match any production package - remove it`);
        }
    }

    return instances;
}

/*
 * Groups package instances by name (one entry per package, all installed versions listed)
 * and resolves the license file: the file shipped with the package has priority,
 * app/licenses/<name>/license.txt is used only when no installed version ships one.
 */
function buildNpmEntries(instances, options) {
    const { fileExists, declaredLicenses, allowedLicenses } = options;
    const entries = {};
    const missingLicenseFiles = [];
    const licensePolicy = [];
    const warnings = [];
    const usedLocalLicenses = new Set();
    const redundantLocalLicenses = new Set();
    const usedDeclarations = new Set();
    const groups = new Map();

    for (const instance of instances) {
        if (!groups.has(instance.name)) {
            groups.set(instance.name, []);
        }

        groups.get(instance.name).push(instance);
    }

    for (const [name, group] of groups) {
        group.sort((a, b) => getNestingLevel(a.location) - getNestingLevel(b.location) || compareVersions(b.version, a.version));

        const versions = [...new Set(group.map(instance => instance.version))].sort(compareVersions);
        const licenses = [];

        for (const instance of group) {
            const id = `${name}@${instance.version}`;
            const declarationKey = [id, name].find(key => Object.prototype.hasOwnProperty.call(declaredLicenses, key));
            const license = declarationKey ? declaredLicenses[declarationKey] : instance.license;

            if (declarationKey) {
                usedDeclarations.add(declarationKey);
            }

            if (!license) {
                licensePolicy.push(`${id}: no license in package.json - verify it and add it to declaredLicenses in ${configPath}`);
                continue;
            }

            const problem = getLicensePolicyProblem(license, allowedLicenses);

            if (problem) {
                licensePolicy.push(`${id}: ${problem}`);
            }

            licenses.push(license);
        }

        const homepage = (group.find(instance => instance.homepage) || {}).homepage || null;
        const instanceWithLicenseFile = group.find(instance => instance.licenseFile);
        const localLicensePath = getLocalLicensePath(name);
        const hasLocalLicense = fileExists(localLicensePath);
        let licenseFile = null;

        if (instanceWithLicenseFile) {
            licenseFile = instanceWithLicenseFile.licenseFile;

            if (hasLocalLicense) {
                redundantLocalLicenses.add(name);
                warnings.push(`app/${localLicensePath}: redundant - ${name} ships ${instanceWithLicenseFile.licenseFile}, remove it`);
            }
        } else if (hasLocalLicense) {
            licenseFile = localLicensePath;
            usedLocalLicenses.add(name);
        } else {
            const details = [licenses[0] || 'unknown license', homepage].filter(Boolean).join(', ');
            missingLicenseFiles.push(`${name}@${versions.join(', ')} (${details}) -> app/${localLicensePath}`);
        }

        entries[name] = compact({
            versions,
            license: licenses[0] || null,
            homepage,
            licenseFile
        });
    }

    for (const key of Object.keys(declaredLicenses)) {
        if (!usedDeclarations.has(key)) {
            warnings.push(`declaredLicenses["${key}"] in ${configPath} does not match any production package - remove it`);
        }
    }

    return {
        entries,
        missingLicenseFiles,
        licensePolicy,
        warnings,
        usedLocalLicenses,
        redundantLocalLicenses
    };
}

/*
 * Vendor entry: { license, homepage, licenseFile?, openExternally? }
 * licenseFile - path relative to app/licenses (default: <name>/license.txt)
 * openExternally - the license is opened in the default browser instead of being displayed
 *                  in the app (for big HTML files, which have to be listed in build.asarUnpack)
 */
function buildVendorEntries(vendorLicenses, npmEntries, options) {
    const { fileExists, allowedLicenses } = options;
    const entries = {};
    const errors = [];

    for (const [name, data] of Object.entries(vendorLicenses)) {
        const licenseFile = data.licenseFile ? `licenses/${data.licenseFile}` : getLocalLicensePath(name);

        if (npmEntries[name]) {
            errors.push(`${name}: installed from npm - remove it from vendor-licenses.json`);
            continue;
        }

        if (/(^|[/\\])\.\.([/\\]|$)/.test(licenseFile)) {
            errors.push(`${name}: "licenseFile" has to be placed in app/licenses`);
        } else if (!fileExists(licenseFile)) {
            errors.push(`${name}: missing app/${licenseFile}`);
        }

        if (data.openExternally && path.extname(licenseFile).toLowerCase() !== '.html') {
            errors.push(`${name}: "openExternally" supports only HTML license files`);
        }

        if (!data.license) {
            errors.push(`${name}: missing "license" (SPDX expression)`);
        } else {
            const problem = getLicensePolicyProblem(data.license, allowedLicenses);

            if (problem) {
                errors.push(`${name}: ${problem}`);
            }
        }

        entries[name] = compact({
            license: data.license || null,
            homepage: isHttpUrl(data.homepage) ? data.homepage : null,
            licenseFile,
            openExternally: data.openExternally === true ? true : null,
            vendor: true
        });
    }

    return { entries, errors };
}

/*
 * Lists license directories in app/licenses (scoped packages use nested @scope/name directories)
 */
function listLocalLicenses() {
    const directories = [];
    const files = [];

    for (const item of fs.readdirSync(licensesDirectory, { withFileTypes: true })) {
        // Hidden system and tool files (.DS_Store etc.)
        if (item.name.indexOf('.') === 0) {
            continue;
        }

        if (!item.isDirectory()) {
            if (!managedFiles.has(item.name)) {
                files.push(item.name);
            }

            continue;
        }

        if (item.name.indexOf('@') !== 0) {
            directories.push(item.name);
            continue;
        }

        for (const scopedItem of fs.readdirSync(path.join(licensesDirectory, item.name), { withFileTypes: true })) {
            if (scopedItem.isDirectory()) {
                directories.push(`${item.name}/${scopedItem.name}`);
            }
        }
    }

    return { directories, files };
}

function sortEntries(entries) {
    const sortKey = name => name.replace(/^@/, '').toLowerCase();

    return Object.keys(entries)
        .sort((a, b) => compareStrings(sortKey(a), sortKey(b)) || compareStrings(a, b))
        .reduce((result, key) => {
            result[key] = entries[key];
            return result;
        }, {});
}

function checkLockFile(packageData, lock, report) {
    if (!packageData) {
        report.errors.installation.push('app/package.json not found');
        return false;
    }

    if (!lock || !lock.packages || lock.lockfileVersion < 2) {
        report.errors.installation.push('app/package-lock.json not found or created by npm < 7 - run "npm install" in app/');
        return false;
    }

    const lockRoot = lock.packages[''] || {};

    for (const field of ['dependencies', 'optionalDependencies']) {
        if (JSON.stringify(sortObject(packageData[field])) !== JSON.stringify(sortObject(lockRoot[field]))) {
            report.errors.installation.push(`app/package-lock.json is out of sync with app/package.json (${field}) - run "npm install" in app/`);
        }
    }

    return true;
}

function printList(label, items, method = 'error') {
    if (!items.length) {
        return;
    }

    console[method](`\n${label}`);

    for (const item of items) {
        console[method](`  - ${item}`);
    }
}

function main() {
    const checkOnly = process.argv.includes('--check');
    const report = {
        errors: {
            installation: [],
            missingLicenseFiles: [],
            licensePolicy: [],
            vendor: []
        },
        warnings: [],
        excluded: new Set(),
        platformSpecific: new Set()
    };
    const packageData = readJson(packageFile);
    const lock = readJson(lockFile);
    const vendorLicenses = readJson(vendorFile) || {};
    const asarUnpack = ((readJson(rootPackageFile) || {}).build || {}).asarUnpack || [];
    const fileExists = relativePath => fs.existsSync(path.join(appRoot, relativePath));
    let npm = { entries: {}, usedLocalLicenses: new Set(), redundantLocalLicenses: new Set() };
    let vendor = { entries: {} };

    if (checkLockFile(packageData, lock, report)) {
        const instances = collectInstances(lock, report);

        npm = buildNpmEntries(instances, {
            fileExists,
            declaredLicenses: config.declaredLicenses,
            allowedLicenses: config.allowedLicenses
        });
        vendor = buildVendorEntries(vendorLicenses, npm.entries, {
            fileExists,
            allowedLicenses: config.allowedLicenses
        });

        report.errors.missingLicenseFiles.push(...npm.missingLicenseFiles);
        report.errors.licensePolicy.push(...npm.licensePolicy);
        report.errors.vendor.push(...vendor.errors);
        report.warnings.push(...npm.warnings);

        // Files opened in the default browser cannot be read from app.asar
        for (const [name, entry] of Object.entries(vendor.entries)) {
            if (entry.openExternally && !asarUnpack.includes(entry.licenseFile)) {
                report.errors.vendor.push(`${name}: add "${entry.licenseFile}" to build.asarUnpack in package.json`);
            }
        }

        const localLicenses = listLocalLicenses();

        for (const name of localLicenses.directories) {
            if (!npm.usedLocalLicenses.has(name) && !npm.redundantLocalLicenses.has(name) && !vendorLicenses[name]) {
                report.warnings.push(`app/licenses/${name}: not used by any production package or vendor entry - remove it`);
            }
        }

        for (const name of localLicenses.files) {
            report.warnings.push(`app/licenses/${name}: unexpected file - remove it`);
        }

        for (const name of requiredFiles) {
            if (!fs.existsSync(path.join(licensesDirectory, name))) {
                report.errors.vendor.push(`missing app/licenses/${name} - copy it from the Electron release zip`);
            }
        }
    }

    const errorsCount = Object.values(report.errors).reduce((sum, items) => sum + items.length, 0);

    console.log('Publii licenses');
    console.log(`  ✓ npm packages (production): ${Object.keys(npm.entries).length}`);
    console.log(`  ✓ vendor entries: ${Object.keys(vendor.entries).length}`);
    console.log(`  ✓ local license files in use: ${npm.usedLocalLicenses.size}`);
    console.log(`  - platform-specific packages skipped: ${report.platformSpecific.size}`);
    console.log(`  - excluded packages: ${report.excluded.size}`);

    printList('Installation problems:', report.errors.installation);
    printList('Missing license files (add the license text to the given path):', report.errors.missingLicenseFiles);
    printList('License problems:', report.errors.licensePolicy);
    printList('Vendor problems (app/licenses/vendor-licenses.json):', report.errors.vendor);
    printList('Warnings:', report.warnings, 'warn');

    if (errorsCount) {
        console.error(`\nFound ${errorsCount} error(s) - app/licenses/all-licenses.json was not ${checkOnly ? 'checked' : 'saved'}.`);
        process.exitCode = 1;
        return;
    }

    const output = JSON.stringify(sortEntries(Object.assign({}, npm.entries, vendor.entries)), null, 4) + '\n';

    if (checkOnly) {
        const currentOutput = fs.existsSync(outputFile) ? fs.readFileSync(outputFile, 'utf8') : '';

        if (currentOutput !== output) {
            console.error('\napp/licenses/all-licenses.json is outdated - run "npm run licenses".');
            process.exitCode = 1;
            return;
        }

        console.log('\napp/licenses/all-licenses.json is up to date.');
        return;
    }

    fs.writeFileSync(outputFile, output);
    console.log('\napp/licenses/all-licenses.json was saved.');
}

if (require.main === module) {
    main();
}

module.exports = {
    buildNpmEntries,
    buildVendorEntries,
    findLicenseFile,
    getPackageNameFromLocation,
    isLicenseAllowed,
    normalizeLicense,
    normalizeRepositoryUrl,
    sortEntries
};
