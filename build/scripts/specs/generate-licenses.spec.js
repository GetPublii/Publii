const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
    buildNpmEntries,
    buildVendorEntries,
    findLicenseFile,
    getPackageNameFromLocation,
    isLicenseAllowed,
    normalizeLicense,
    normalizeRepositoryUrl,
    sortEntries
} = require('../generate-licenses');

const allowedLicenses = ['MIT', 'Apache-2.0', 'BSD-3-Clause', 'LGPL-3.0-or-later'];

function createInstance(data) {
    return Object.assign({
        version: '1.0.0',
        license: 'MIT',
        homepage: null,
        licenseFile: null
    }, data);
}

function buildEntries(instances, options = {}) {
    const localLicenses = new Set(options.localLicenses || []);

    return buildNpmEntries(instances, {
        fileExists: filePath => [...localLicenses].some(name => filePath === `licenses/${name}/license.txt`),
        declaredLicenses: options.declaredLicenses || {},
        allowedLicenses
    });
}

describe('License list generator', () => {
    describe('SPDX expressions', () => {
        it('accepts allowed identifiers case-insensitively', () => {
            assert.strictEqual(isLicenseAllowed('MIT', allowedLicenses), true);
            assert.strictEqual(isLicenseAllowed('apache-2.0', allowedLicenses), true);
            assert.strictEqual(isLicenseAllowed('SSPL-1.0', allowedLicenses), false);
        });

        it('requires one allowed license for OR and all licenses for AND', () => {
            assert.strictEqual(isLicenseAllowed('(SSPL-1.0 OR MIT)', allowedLicenses), true);
            assert.strictEqual(isLicenseAllowed('MIT AND SSPL-1.0', allowedLicenses), false);
            assert.strictEqual(isLicenseAllowed('Apache-2.0 AND LGPL-3.0-or-later AND MIT', allowedLicenses), true);
            assert.strictEqual(isLicenseAllowed('(MIT AND BSD-3-Clause) OR SSPL-1.0', allowedLicenses), true);
        });

        it('evaluates a license with an exception as its base license', () => {
            assert.strictEqual(isLicenseAllowed('Apache-2.0 WITH LLVM-exception', allowedLicenses), true);
        });

        it('rejects malformed expressions', () => {
            for (const expression of ['', 'MIT OR', '(MIT', 'MIT)', 'SEE LICENSE IN LICENSE.md', 'MIT WITH']) {
                assert.throws(() => isLicenseAllowed(expression, allowedLicenses), /Invalid SPDX expression/, expression);
            }
        });
    });

    describe('package metadata', () => {
        it('reads license names from legacy package.json formats', () => {
            assert.strictEqual(normalizeLicense({ license: 'MIT' }), 'MIT');
            assert.strictEqual(normalizeLicense({ license: { type: 'ISC' } }), 'ISC');
            assert.strictEqual(normalizeLicense({ licenses: [{ type: 'MIT' }, { type: 'Apache-2.0' }] }), 'MIT OR Apache-2.0');
            assert.strictEqual(normalizeLicense({}), null);
        });

        it('normalizes repository URLs to web addresses', () => {
            const expected = 'https://github.com/user/repo';

            for (const repository of [
                'user/repo',
                'github:user/repo',
                'git+https://github.com/user/repo.git',
                'git://github.com/user/repo.git',
                'git+ssh://git@github.com/user/repo.git',
                'git@github.com:user/repo.git',
                { type: 'git', url: 'https://github.com/user/repo.git' }
            ]) {
                assert.strictEqual(normalizeRepositoryUrl(repository), expected, JSON.stringify(repository));
            }

            assert.strictEqual(normalizeRepositoryUrl('gitlab:user/repo'), 'https://gitlab.com/user/repo');
            assert.strictEqual(normalizeRepositoryUrl('file:../local'), null);
            assert.strictEqual(normalizeRepositoryUrl(undefined), null);
        });

        it('reads package names from nested and scoped lockfile locations', () => {
            assert.strictEqual(getPackageNameFromLocation('node_modules/isarray'), 'isarray');
            assert.strictEqual(getPackageNameFromLocation('node_modules/ftp/node_modules/isarray'), 'isarray');
            assert.strictEqual(getPackageNameFromLocation('node_modules/a/node_modules/@scope/name'), '@scope/name');
        });
    });

    describe('license files', () => {
        let directory;

        beforeEach(() => {
            directory = fs.mkdtempSync(path.join(os.tmpdir(), 'publii-licenses-'));
        });

        afterEach(() => {
            fs.rmSync(directory, { recursive: true, force: true });
        });

        function createFiles(files) {
            for (const file of files) {
                fs.writeFileSync(path.join(directory, file), '');
            }
        }

        it('never uses README files', () => {
            createFiles(['README.md', 'index.js']);
            assert.strictEqual(findLicenseFile(directory), null);
        });

        it('prefers the main license file over variants', () => {
            createFiles(['LICENSE-APACHE', 'LICENSE-MIT', 'LICENSE.md']);
            assert.strictEqual(findLicenseFile(directory), 'LICENSE.md');
        });

        it('accepts licence and copying variants', () => {
            createFiles(['COPYING']);
            assert.strictEqual(findLicenseFile(directory), 'COPYING');
        });

        it('ignores directories named like license files', () => {
            fs.mkdirSync(path.join(directory, 'license'));
            assert.strictEqual(findLicenseFile(directory), null);
        });
    });

    describe('npm entries', () => {
        it('groups versions and uses the license file of the hoisted package', () => {
            const result = buildEntries([
                createInstance({ name: 'agent-base', version: '6.0.2', location: 'node_modules/teeny-request/node_modules/agent-base' }),
                createInstance({ name: 'agent-base', version: '7.1.4', location: 'node_modules/agent-base', licenseFile: 'node_modules/agent-base/LICENSE', homepage: 'https://example.com' })
            ]);

            assert.deepStrictEqual(result.entries['agent-base'], {
                versions: ['6.0.2', '7.1.4'],
                license: 'MIT',
                homepage: 'https://example.com',
                licenseFile: 'node_modules/agent-base/LICENSE'
            });
            assert.deepStrictEqual(result.missingLicenseFiles, []);
        });

        it('uses a local license file only when no installed version ships one', () => {
            const result = buildEntries([
                createInstance({ name: 'tr46', location: 'node_modules/tr46' })
            ], { localLicenses: ['tr46'] });

            assert.strictEqual(result.entries.tr46.licenseFile, 'licenses/tr46/license.txt');
            assert.ok(result.usedLocalLicenses.has('tr46'));
        });

        it('reports redundant local license files', () => {
            const result = buildEntries([
                createInstance({ name: 'he', location: 'node_modules/he', licenseFile: 'node_modules/he/LICENSE-MIT.txt' })
            ], { localLicenses: ['he'] });

            assert.strictEqual(result.entries.he.licenseFile, 'node_modules/he/LICENSE-MIT.txt');
            assert.ok(result.redundantLocalLicenses.has('he'));
            assert.strictEqual(result.warnings.length, 1);
        });

        it('reports packages without any license file', () => {
            const result = buildEntries([
                createInstance({ name: '@scope/name', version: '2.0.0', location: 'node_modules/@scope/name' })
            ]);

            assert.strictEqual(result.missingLicenseFiles.length, 1);
            assert.match(result.missingLicenseFiles[0], /^@scope\/name@2\.0\.0 .*app\/licenses\/@scope\/name\/license\.txt$/);
            assert.strictEqual(result.entries['@scope/name'].licenseFile, undefined);
        });

        it('reports missing and disallowed licenses', () => {
            const result = buildEntries([
                createInstance({ name: 'no-license', location: 'node_modules/no-license', license: null, licenseFile: 'node_modules/no-license/LICENSE' }),
                createInstance({ name: 'sspl', location: 'node_modules/sspl', license: 'SSPL-1.0', licenseFile: 'node_modules/sspl/LICENSE' })
            ]);

            assert.strictEqual(result.licensePolicy.length, 2);
            assert.match(result.licensePolicy[0], /^no-license@1\.0\.0: no license in package\.json/);
            assert.match(result.licensePolicy[1], /^sspl@1\.0\.0: license "SSPL-1\.0" is not on the allowed list/);
        });

        it('uses declared licenses and reports unused declarations', () => {
            const result = buildEntries([
                createInstance({ name: 'no-license', location: 'node_modules/no-license', license: null, licenseFile: 'node_modules/no-license/LICENSE' })
            ], {
                declaredLicenses: {
                    'no-license@1.0.0': 'MIT',
                    'removed-package': 'MIT'
                }
            });

            assert.deepStrictEqual(result.licensePolicy, []);
            assert.strictEqual(result.entries['no-license'].license, 'MIT');
            assert.strictEqual(result.warnings.length, 1);
            assert.match(result.warnings[0], /removed-package/);
        });
    });

    describe('vendor entries', () => {
        it('validates vendor entries and rejects duplicates of npm packages', () => {
            const result = buildVendorEntries({
                jquery: { license: 'MIT', homepage: 'https://jquery.com/' },
                codemirror: { license: 'MIT', homepage: 'https://codemirror.net/' },
                'no-file': { license: 'MIT' },
                'no-license': {}
            }, {
                codemirror: { versions: ['5.65.13'] }
            }, {
                fileExists: filePath => filePath !== 'licenses/no-file/license.txt',
                allowedLicenses
            });

            assert.deepStrictEqual(result.entries.jquery, {
                license: 'MIT',
                homepage: 'https://jquery.com/',
                licenseFile: 'licenses/jquery/license.txt',
                vendor: true
            });
            assert.strictEqual(result.entries.codemirror, undefined);
            assert.deepStrictEqual(result.errors, [
                'codemirror: installed from npm - remove it from vendor-licenses.json',
                'no-file: missing app/licenses/no-file/license.txt',
                'no-license: missing "license" (SPDX expression)'
            ]);
        });

        it('supports custom license files opened in the default browser', () => {
            const result = buildVendorEntries({
                chromium: { license: 'BSD-3-Clause', licenseFile: 'LICENSES.chromium.html', openExternally: true },
                'text-file': { license: 'MIT', licenseFile: 'text-file.txt', openExternally: true },
                outside: { license: 'MIT', licenseFile: '../package.json' }
            }, {}, {
                fileExists: () => true,
                allowedLicenses: ['BSD-3-Clause', 'MIT']
            });

            assert.deepStrictEqual(result.entries.chromium, {
                license: 'BSD-3-Clause',
                licenseFile: 'licenses/LICENSES.chromium.html',
                openExternally: true,
                vendor: true
            });
            assert.deepStrictEqual(result.errors, [
                'text-file: "openExternally" supports only HTML license files',
                'outside: "licenseFile" has to be placed in app/licenses'
            ]);
        });
    });

    it('sorts entries alphabetically ignoring the scope prefix', () => {
        const sorted = sortEntries({ zlib: {}, '@aws-sdk/core': {}, axios: {}, Buffer: {} });
        assert.deepStrictEqual(Object.keys(sorted), ['@aws-sdk/core', 'axios', 'Buffer', 'zlib']);
    });
});
