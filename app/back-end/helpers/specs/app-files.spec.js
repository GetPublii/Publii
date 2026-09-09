const assert = require('node:assert/strict');
const os = require('node:os');
const path = require('node:path');
const fs = require('fs-extra');
const AppFiles = require('../app-files.js');
const Utils = require('../utils.js');

describe('Website relocation data safety', function () {
    let base;
    let source;
    let destination;
    let application;
    let helper;
    let originalCopy;
    let originalMkdir;
    let originalRename;
    let originalWrite;
    let originalRemove;
    let originalLog;

    function createSite(directory, name, contents = name) {
        fs.outputFileSync(path.join(directory, name, 'input', 'db.sqlite'), contents);
        fs.outputFileSync(path.join(directory, name, 'input', 'media', 'photo.jpg'), 'photo-' + contents);
    }

    function database(directory, name) {
        return fs.readFileSync(path.join(directory, name, 'input', 'db.sqlite'), 'utf8');
    }

    function relocate() {
        return helper.relocateSites(source, destination, () => {
            helper.saveConfig({ sitesLocation: destination });
        });
    }

    function assertOriginals() {
        assert.equal(database(source, 'alpha'), 'alpha');
        assert.equal(database(source, 'beta'), 'beta');
        assert.equal(application.sitesDir, source);
        assert.equal(application.app.sitesDir, source);
        assert.equal(fs.readJsonSync(application.appConfigPath).sitesLocation, source);
        assert.equal(fs.readFileSync(path.join(destination, 'keep.txt'), 'utf8'), 'existing data');
    }

    beforeEach(function () {
        base = fs.mkdtempSync(path.join(os.tmpdir(), 'publii-relocation-test-'));
        source = path.join(base, 'source');
        destination = path.join(base, 'destination');
        createSite(source, 'alpha');
        createSite(source, 'beta');
        fs.outputFileSync(path.join(destination, 'keep.txt'), 'existing data');
        application = {
            sitesDir: source,
            app: { sitesDir: source },
            appConfigPath: path.join(base, 'app-config.json')
        };
        fs.writeJsonSync(application.appConfigPath, { sitesLocation: source });
        helper = new AppFiles(application);
        originalCopy = fs.copySync;
        originalMkdir = fs.mkdirSync;
        originalRename = fs.renameSync;
        originalWrite = fs.writeFileSync;
        originalRemove = Utils.removePathRecursively;
        originalLog = console.log;
        console.log = () => {};
    });

    afterEach(function () {
        fs.copySync = originalCopy;
        fs.mkdirSync = originalMkdir;
        fs.renameSync = originalRename;
        fs.writeFileSync = originalWrite;
        Utils.removePathRecursively = originalRemove;
        console.log = originalLog;
        fs.removeSync(base);
    });

    it('copies complete sites and persists the destination before removing originals', function () {
        fs.outputFileSync(path.join(source, 'notes', 'readme.txt'), 'leave here');
        const timestamp = new Date('2024-01-01T12:00:00Z');
        const media = path.join('alpha', 'input', 'media', 'photo.jpg');
        fs.utimesSync(path.join(source, media), timestamp, timestamp);
        let saved = false;
        const result = helper.relocateSites(source, destination, () => {
            assertOriginals();
            assert.equal(database(destination, 'alpha'), 'alpha');
            assert.equal(database(destination, 'beta'), 'beta');
            helper.saveConfig({ sitesLocation: destination });
            saved = true;
        });

        assert.equal(result, true);
        assert.equal(saved, true);
        assert.equal(application.sitesDir, destination);
        assert.equal(application.app.sitesDir, destination);
        assert.equal(fs.readJsonSync(application.appConfigPath).sitesLocation, destination);
        assert.deepEqual(fs.readdirSync(source), ['notes']);
        assert.equal(fs.readFileSync(path.join(destination, media), 'utf8'), 'photo-alpha');
        assert.equal(fs.statSync(path.join(destination, media)).mtimeMs, timestamp.getTime());
        assert.deepEqual(fs.readdirSync(destination).sort(), ['alpha', 'beta', 'keep.txt']);
    });

    for (const kind of ['directory', 'file', 'dangling symlink']) {
        it('rejects a destination ' + kind + ' collision before copying', function () {
            const conflict = path.join(destination, 'beta');

            if (kind === 'directory') {
                createSite(destination, 'beta', 'existing beta');
            } else if (kind === 'file') {
                fs.writeFileSync(conflict, 'existing beta');
            } else {
                fs.symlinkSync(path.join(base, 'missing'), conflict, 'junction');
            }

            let copies = 0;
            fs.copySync = () => {
                copies++;
            };

            assert.equal(relocate(), false);
            assert.equal(copies, 0);
            assertOriginals();
            assert.equal(fs.existsSync(path.join(destination, 'alpha')), false);

            if (kind === 'directory') {
                assert.equal(database(destination, 'beta'), 'existing beta');
            } else if (kind === 'file') {
                assert.equal(fs.readFileSync(conflict, 'utf8'), 'existing beta');
            } else {
                assert.equal(fs.lstatSync(conflict).isSymbolicLink(), true);
            }
        });
    }

    it('removes only its copies after a partial failure on the second website', function () {
        fs.copySync = (from, to, options) => {
            if (path.basename(from) === 'beta') {
                fs.outputFileSync(path.join(to, 'partial.txt'), 'incomplete');
                throw new Error('Simulated disk full');
            }

            originalCopy(from, to, options);
        };

        assert.equal(relocate(), false);
        assertOriginals();
        assert.deepEqual(fs.readdirSync(destination), ['keep.txt']);
    });

    it('preserves a destination created after the preflight check', function () {
        fs.mkdirSync = (directory, options) => {
            if (directory === path.join(fs.realpathSync(destination), 'beta')) {
                originalMkdir(directory);
                fs.writeFileSync(path.join(directory, 'external.txt'), 'keep this');
            }

            return originalMkdir(directory, options);
        };

        assert.equal(relocate(), false);
        assertOriginals();
        assert.equal(fs.readFileSync(path.join(destination, 'beta', 'external.txt'), 'utf8'), 'keep this');
        assert.equal(fs.existsSync(path.join(destination, 'alpha')), false);
    });

    for (const failure of ['write', 'rename']) {
        it('preserves the old settings and originals when config ' + failure + ' fails', function () {
            if (failure === 'write') {
                fs.writeFileSync = (file, ...args) => {
                    if (String(file).includes('.publii-config-')) {
                        originalWrite(file, '{');
                        throw new Error('Simulated settings write failure');
                    }

                    return originalWrite(file, ...args);
                };
            } else {
                fs.renameSync = () => {
                    throw new Error('Simulated settings rename failure');
                };
            }

            assert.equal(relocate(), false);
            assertOriginals();
            assert.deepEqual(fs.readdirSync(destination), ['keep.txt']);
            assert.deepEqual(fs.readdirSync(base).sort(), ['app-config.json', 'destination', 'source']);
        });
    }

    it('keeps the complete new location if deleting an original fails after commit', function () {
        Utils.removePathRecursively = directory => {
            if (directory === path.join(source, 'beta')) {
                throw new Error('Simulated locked source directory');
            }

            originalRemove(directory);
        };

        assert.equal(relocate(), true);
        assert.equal(fs.existsSync(path.join(source, 'alpha')), false);
        assert.equal(database(source, 'beta'), 'beta');
        assert.equal(database(destination, 'alpha'), 'alpha');
        assert.equal(database(destination, 'beta'), 'beta');
        assert.equal(fs.readJsonSync(application.appConfigPath).sitesLocation, destination);
        assert.equal(application.sitesDir, destination);
    });

    it('preserves originals and existing data even when rollback cleanup fails', function () {
        fs.copySync = () => {
            throw new Error('Simulated copy failure');
        };
        Utils.removePathRecursively = () => {
            throw new Error('Simulated cleanup failure');
        };

        assert.equal(relocate(), false);
        assertOriginals();
    });

    it('rejects missing, identical, nested and symlink-aliased locations', function () {
        const nested = path.join(source, 'nested');
        const alias = path.join(base, 'alias');
        fs.ensureDirSync(nested);
        fs.symlinkSync(source, alias, 'junction');

        for (const target of [path.join(base, 'missing'), source, nested, base, alias]) {
            assert.equal(helper.relocateSites(source, target, () => {
                assert.fail('Must not save an invalid location');
            }), false, target);
            assertOriginals();
        }
    });

    it('refuses a linked website without deleting the link or its target', function () {
        createSite(base, 'external');
        fs.symlinkSync(path.join(base, 'external'), path.join(source, 'linked'), 'junction');
        assert.equal(relocate(), false);
        assertOriginals();
        assert.equal(database(base, 'external'), 'external');
        assert.equal(fs.lstatSync(path.join(source, 'linked')).isSymbolicLink(), true);
    });
});
