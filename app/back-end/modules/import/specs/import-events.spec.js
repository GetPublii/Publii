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

        // The report lives among the logs of the website, which are identified by its UUID
        let reportPath = path.join(logsDir, 'sites', 'uuid-test-site', 'import-report-wordpress.log');
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

    it('accepts only an optional boolean cleanup option and forwards it to the worker', function() {
        const vm = require('vm');
        const { createRequire } = require('module');
        const filename = path.join(__dirname, '../../../events/import.js');
        const localRequire = createRequire(filename);
        const messages = [];
        const context = {
            module: { exports: {} },
            __dirname: path.dirname(filename),
            require(name) {
                if (name === 'electron') {
                    return { ipcMain: { on() {}, handle() {} } };
                }
                if (name === '../helpers/ipc.helper.js') {
                    return {
                        forkWorkerWithLogs() {
                            return { on() {}, send: message => messages.push(message) };
                        }
                    };
                }
                return localRequire(name);
            }
        };
        vm.runInNewContext(fs.readFileSync(filename, 'utf8'), context);
        const events = new context.module.exports(appInstance);
        const filePath = path.join(temporaryDir, 'sample.xml');
        fs.writeFileSync(filePath, '<rss />');
        const config = {
            siteName: 'test-site',
            filePath,
            importAuthors: 'publii-author',
            usedTaxonomy: 'both',
            slugStrategy: 'wordpress',
            autop: false,
            importMenus: true,
            postTypes: ['post', 'page']
        };
        for (const cleanHtml of [undefined, false, true]) {
            assert.strictEqual(events.validateImportInput({ ...config, cleanHtml }, true), true);
            events.importFile(appInstance, { ...config, cleanHtml }, { send() {} });
            assert.strictEqual(messages.at(-1).cleanHtml, cleanHtml === true);
        }
        for (const cleanHtml of ['true', 'false', 1, null, {}, []]) {
            assert.strictEqual(events.validateImportInput({ ...config, cleanHtml }, true), false);
        }
    });

    it('passes the cleanup selection through the import worker and closes its database', async function() {
        const vm = require('vm');
        const filename = path.join(__dirname, '../../../workers/import/import.js');
        for (const cleanHtml of [undefined, false, true]) {
            let listener;
            let parameters;
            let closed = false;
            const messages = [];
            const context = {
                process: {
                    on(name, callback) {
                        listener = callback;
                    },
                    send: message => messages.push(message)
                },
                console,
                setTimeout() {},
                require() {
                    return class {
                        async importFile(...args) {
                            parameters = args;
                            return { status: 'success' };
                        }
                        closeDatabase() {
                            closed = true;
                        }
                    };
                }
            };
            vm.runInNewContext(fs.readFileSync(filename, 'utf8'), context);
            await listener({ type: 'dependencies', cleanHtml });
            assert.strictEqual(parameters.at(-1), cleanHtml === true);
            assert.strictEqual(messages[0].status, 'success');
            assert.strictEqual(closed, true);
        }
    });

    it('persists HTML cleanup details and remains compatible with old reports', function() {
        const summary = {
            posts: 2,
            report: {
                htmlCleanup: {
                    enabled: true,
                    changedItems: 1,
                    removedClasses: 12,
                    skippedItems: [{ itemID: 2, title: 'Widget', reason: 'active-content' }]
                }
            }
        };
        assert.strictEqual(reportStore.save('test-site', summary), true);
        const reopenedStore = new WordPressImportReport(appInstance);
        assert.deepStrictEqual(reopenedStore.load('test-site').summary, summary);
        assert.strictEqual(reopenedStore.save('test-site', { report: { warnings: [] } }), true);
        assert.strictEqual(reopenedStore.load('test-site').summary.report.htmlCleanup, undefined);
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

    it('keeps the most recent WordPress import report of every website', function() {
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
        let thirdSummary = {
            report: {
                generatedAt: '2026-08-30T12:00:00.000Z'
            }
        };

        assert.strictEqual(reportStore.save('test-site', firstSummary), true);
        assert.strictEqual(reportStore.save('second-site', secondSummary), true);
        assert.deepStrictEqual(reportStore.load('test-site').summary, firstSummary);
        assert.deepStrictEqual(reportStore.load('second-site').summary, secondSummary);

        assert.strictEqual(reportStore.save('test-site', thirdSummary), true);
        assert.deepStrictEqual(reportStore.load('test-site').summary, thirdSummary);
        assert.deepStrictEqual(reportStore.load('second-site').summary, secondSummary);
    });

    it('still loads a report stored for all websites by an older version', function() {
        let legacyPayload = {
            schemaVersion: 1,
            importer: 'wordpress',
            siteName: 'test-site',
            siteUUID: 'uuid-test-site',
            generatedAt: '2026-08-30T10:00:00.000Z',
            summary: {
                report: {
                    generatedAt: '2026-08-30T10:00:00.000Z'
                }
            }
        };

        fs.writeFileSync(path.join(logsDir, 'import-report-wordpress.log'), JSON.stringify(legacyPayload), 'utf8');

        assert.deepStrictEqual(reportStore.load('test-site').summary, legacyPayload.summary);
        assert.strictEqual(reportStore.load('second-site'), null);
    });

    it('does not store a report for a website which is not on the sites list', function() {
        fs.ensureDirSync(path.join(sitesDir, 'unlisted-site'));

        assert.strictEqual(reportStore.save('unlisted-site', { report: {} }), false);
    });

    it('ignores malformed report files', function() {
        let siteLogsDir = path.join(logsDir, 'sites', 'uuid-test-site');

        fs.ensureDirSync(siteLogsDir);
        fs.writeFileSync(path.join(siteLogsDir, 'import-report-wordpress.log'), '{broken', 'utf8');
        assert.strictEqual(reportStore.load('test-site'), null);

        fs.removeSync(siteLogsDir);
        fs.writeFileSync(path.join(logsDir, 'import-report-wordpress.log'), '{broken', 'utf8');
        assert.strictEqual(reportStore.load('test-site'), null);
    });
});
