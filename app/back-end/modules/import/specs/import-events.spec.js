const assert = require('assert');
const fs = require('fs-extra');
const os = require('os');
const path = require('path');
const WordPressImportReport = require('../wordpress-import-report.js');

describe('WordPress import report persistence', function() {
    let temporaryDir;
    let logsDir;
    let sitesDir;
    let appInstance;
    let reportStore;

    beforeEach(function() {
        temporaryDir = fs.mkdtempSync(path.join(os.tmpdir(), 'publii-import-report-'));
        logsDir = path.join(temporaryDir, 'logs');
        sitesDir = path.join(temporaryDir, 'sites');
        fs.ensureDirSync(logsDir);
        fs.ensureDirSync(path.join(sitesDir, 'test-site'));
        fs.ensureDirSync(path.join(sitesDir, 'second-site'));

        appInstance = {
            sitesDir,
            sites: {
                'test-site': { uuid: 'uuid-test-site' },
                'second-site': { uuid: 'uuid-second-site' }
            },
            app: {
                getPath: function(name) {
                    return name === 'logs' ? logsDir : '';
                }
            }
        };
        reportStore = new WordPressImportReport(appInstance);
    });

    afterEach(function() {
        fs.removeSync(temporaryDir);
    });

    it('stores and loads the latest report for the matching site UUID', function() {
        let summary = {
            posts: 2,
            report: {
                generatedAt: '2026-08-30T10:00:00.000Z',
                redirects: [],
                warnings: []
            }
        };

        assert.strictEqual(reportStore.save('test-site', summary), true);

        let reportPath = path.join(logsDir, 'import-report-wordpress.log');
        let storedPayload = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
        let loadedPayload = reportStore.load('test-site');

        assert.strictEqual(storedPayload.schemaVersion, 1);
        assert.strictEqual(storedPayload.importer, 'wordpress');
        assert.strictEqual(storedPayload.siteName, 'test-site');
        assert.strictEqual(storedPayload.siteUUID, 'uuid-test-site');
        assert.deepStrictEqual(loadedPayload.summary, summary);

        appInstance.sites['test-site'].uuid = 'uuid-after-clone';
        assert.strictEqual(reportStore.load('test-site'), null);
    });

    it('persists the successful result received at the end of the import worker', function() {
        let data = {
            type: 'result',
            status: 'success',
            summary: {
                posts: 1,
                warnings: [],
                report: {
                    generatedAt: '2026-08-30T10:30:00.000Z',
                    warnings: []
                }
            }
        };

        assert.strictEqual(reportStore.persistImportResult('test-site', data), true);
        assert.deepStrictEqual(reportStore.load('test-site').summary, data.summary);
    });

    it('adds a warning instead of failing the import when the report cannot be saved', function() {
        let data = {
            type: 'result',
            status: 'success',
            summary: {
                report: {}
            }
        };

        assert.strictEqual(reportStore.persistImportResult('missing-site', data), false);
        assert.strictEqual(data.summary.warnings.length, 1);
        assert.strictEqual(data.summary.report.warnings.length, 1);
    });

    it('keeps only the most recent WordPress import report', function() {
        let firstSummary = {
            report: {
                generatedAt: '2026-08-30T10:00:00.000Z'
            }
        };
        let secondSummary = {
            report: {
                generatedAt: '2026-08-30T11:00:00.000Z'
            }
        };

        assert.strictEqual(reportStore.save('test-site', firstSummary), true);
        assert.strictEqual(reportStore.save('second-site', secondSummary), true);
        assert.strictEqual(reportStore.load('test-site'), null);
        assert.deepStrictEqual(
            reportStore.load('second-site').summary,
            secondSummary
        );
    });

    it('ignores malformed report files', function() {
        fs.writeFileSync(path.join(logsDir, 'import-report-wordpress.log'), '{broken', 'utf8');
        assert.strictEqual(reportStore.load('test-site'), null);
    });
});
