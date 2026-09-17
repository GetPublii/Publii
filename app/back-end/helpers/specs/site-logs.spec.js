const assert = require('node:assert/strict');
const fs = require('fs-extra');
const os = require('node:os');
const path = require('node:path');
const SiteLogs = require('../site-logs.js');

describe('Website logs', function () {
    let logsDir;
    let application;

    beforeEach(function () {
        logsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'publii-site-logs-'));
        application = {
            app: {
                getPath: name => name === 'logs' ? logsDir : ''
            },
            sites: {
                'with-uuid': { uuid: 'uuid-1723-456' },
                'legacy-site': {}
            }
        };
    });

    afterEach(function () {
        fs.removeSync(logsDir);
    });

    it('uses the UUID of the website and falls back to its name', function () {
        assert.equal(SiteLogs.getDirectory(application, 'with-uuid'), path.join(logsDir, 'sites', 'uuid-1723-456'));
        assert.equal(SiteLogs.getDirectory(application, 'legacy-site'), path.join(logsDir, 'sites', 'legacy-site'));
        assert.equal(fs.existsSync(path.join(logsDir, 'sites', 'uuid-1723-456')), true);
    });

    it('does not create directories for unknown or unsafe websites', function () {
        assert.equal(SiteLogs.getDirectory(application, 'unknown'), null);
        assert.equal(SiteLogs.getDirectory(application, '../outside'), null);
        assert.equal(SiteLogs.getDirectory(application, undefined), null);
        assert.equal(SiteLogs.getWorkerLogsDirectory(application, 'unknown'), logsDir);
        assert.equal(fs.existsSync(path.join(logsDir, 'sites')), false);

        application.sites.unsafe = { uuid: '../outside' };
        assert.equal(SiteLogs.getDirectory(application, 'unsafe'), path.join(logsDir, 'sites', 'unsafe'));
    });

    it('lists logs of the website together with the general logs only', function () {
        let siteDir = SiteLogs.getDirectory(application, 'with-uuid');
        let otherDir = SiteLogs.getDirectory(application, 'legacy-site');

        fs.writeFileSync(path.join(siteDir, 'rendering-process.log'), 'site');
        fs.writeFileSync(path.join(siteDir, 'deployment-errors.log'), 'site');
        fs.writeFileSync(path.join(siteDir, 'notes.json'), 'not a log');
        fs.writeFileSync(path.join(otherDir, 'regenerate-process.log'), 'another website');
        fs.writeFileSync(path.join(logsDir, 'themes-copy-errors.txt'), 'general');
        fs.writeFileSync(path.join(logsDir, 'import-check-process.log'), 'general');
        // Leftovers of the versions which kept logs of all websites in a single place
        fs.writeFileSync(path.join(logsDir, 'rendering-process.log'), 'legacy');
        fs.writeFileSync(path.join(logsDir, 'import-report-wordpress.log'), 'legacy');

        assert.deepEqual(SiteLogs.list(application, 'with-uuid'), {
            site: ['deployment-errors.log', 'rendering-process.log'],
            app: ['import-check-process.log', 'themes-copy-errors.txt']
        });
        assert.deepEqual(SiteLogs.list(application, 'unknown'), {
            site: [],
            app: ['import-check-process.log', 'themes-copy-errors.txt']
        });
    });

    it('reads only the listed files', function () {
        let siteDir = SiteLogs.getDirectory(application, 'with-uuid');
        let otherDir = SiteLogs.getDirectory(application, 'legacy-site');

        fs.writeFileSync(path.join(siteDir, 'rendering-process.log'), 'site');
        fs.writeFileSync(path.join(otherDir, 'regenerate-process.log'), 'another website');
        fs.writeFileSync(path.join(logsDir, 'themes-copy-errors.txt'), 'general');
        fs.writeFileSync(path.join(logsDir, 'rendering-errors.log'), 'legacy');

        assert.equal(SiteLogs.resolveFile(application, 'with-uuid', 'rendering-process.log'), path.join(siteDir, 'rendering-process.log'));
        assert.equal(SiteLogs.resolveFile(application, 'with-uuid', 'themes-copy-errors.txt'), path.join(logsDir, 'themes-copy-errors.txt'));
        assert.equal(SiteLogs.resolveFile(application, 'with-uuid', 'regenerate-process.log'), null);
        assert.equal(SiteLogs.resolveFile(application, 'with-uuid', 'rendering-errors.log'), null);
        assert.equal(SiteLogs.resolveFile(application, 'with-uuid', '../sites/legacy-site/regenerate-process.log'), null);
        assert.equal(SiteLogs.resolveFile(application, 'with-uuid', undefined), null);
    });

    it('never follows symbolic links placed among the logs', function () {
        let siteDir = SiteLogs.getDirectory(application, 'with-uuid');
        let outsideDir = fs.mkdtempSync(path.join(os.tmpdir(), 'publii-site-logs-outside-'));

        try {
            fs.writeFileSync(path.join(outsideDir, 'secret.txt'), 'outside');
            fs.writeFileSync(path.join(siteDir, 'rendering-process.log'), 'site');

            try {
                fs.symlinkSync(path.join(outsideDir, 'secret.txt'), path.join(siteDir, 'linked.log'));
                fs.symlinkSync(path.join(outsideDir, 'secret.txt'), path.join(logsDir, 'linked-general.txt'));
                fs.symlinkSync(outsideDir, path.join(logsDir, 'sites', 'legacy-site'), 'dir');
            } catch (error) {
                // Creating symbolic links requires additional privileges on Windows
                this.skip();
            }

            assert.deepEqual(SiteLogs.list(application, 'with-uuid'), {
                site: ['rendering-process.log'],
                app: []
            });
            assert.equal(SiteLogs.resolveFile(application, 'with-uuid', 'linked.log'), null);
            assert.equal(SiteLogs.resolveFile(application, 'with-uuid', 'linked-general.txt'), null);

            // The whole directory of a website replaced with a link to another location
            assert.deepEqual(SiteLogs.list(application, 'legacy-site').site, []);
            assert.equal(SiteLogs.resolveFile(application, 'legacy-site', 'secret.txt'), null);
        } finally {
            fs.removeSync(outsideDir);
        }
    });

    it('removes logs of a deleted website', function () {
        let siteDir = SiteLogs.getDirectory(application, 'with-uuid');
        let otherDir = SiteLogs.getDirectory(application, 'legacy-site');

        SiteLogs.remove(application, 'with-uuid');
        SiteLogs.remove(application, 'unknown');

        assert.equal(fs.existsSync(siteDir), false);
        assert.equal(fs.existsSync(otherDir), true);
    });

    it('keeps logs of a renamed website which has no UUID', function () {
        let legacyDir = SiteLogs.getDirectory(application, 'legacy-site');
        let uuidDir = SiteLogs.getDirectory(application, 'with-uuid');

        fs.writeFileSync(path.join(legacyDir, 'rendering-process.log'), 'site');

        SiteLogs.rename(application, 'legacy-site', 'renamed-site', undefined);
        SiteLogs.rename(application, 'with-uuid', 'renamed-uuid-site', 'uuid-1723-456');

        assert.equal(fs.existsSync(legacyDir), false);
        assert.equal(fs.readFileSync(path.join(logsDir, 'sites', 'renamed-site', 'rendering-process.log'), 'utf8'), 'site');
        assert.equal(fs.existsSync(uuidDir), true);
        assert.equal(fs.existsSync(path.join(logsDir, 'sites', 'renamed-uuid-site')), false);
    });
});
