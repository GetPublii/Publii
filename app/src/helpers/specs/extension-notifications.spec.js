const assert = require('node:assert/strict');
const getExtensionNotifications = require('../extension-notifications');

function extension(directory, name = directory) {
    return { directory, name, version: '1.0.0' };
}

function update(version = '2.0.0') {
    return {
        name: 'Sample extension',
        version,
        links: { download: 'https://example.test/download' }
    };
}

describe('Extension notifications', function () {
    for (const type of ['THEME', 'PLUGIN']) {
        function rows(overrides = {}) {
            return getExtensionNotifications({
                type,
                installed: [extension('sample')],
                ...overrides
            });
        }

        it(type + ': keeps discontinued extensions visible without an update', function () {
            const [row] = rows({ discontinued: { sample: { name: 'Sample' } } });
            assert.equal(row.name, 'Sample');
            assert.equal(row.isUnread, true);
            assert.equal(row.isDiscontinuedUnread, true);
            assert.equal(row.hasUpdate, false);
            assert.deepEqual(row.links, {});
            assert.deepEqual(row.notificationIDs, ['DISCONTINUED-' + type + '-sample']);
        });

        it(type + ': accepts optional explanation text without changing notification identity', function () {
            const options = {
                discontinued: { sample: { name: 'Sample', text: '  A specific reason.  ' } },
                readNotificationIDs: ['DISCONTINUED-' + type + '-sample']
            };
            const [row] = rows(options);
            assert.equal(row.discontinuedText, 'A specific reason.');
            assert.equal(row.isUnread, false);
            assert.deepEqual(row.notificationIDs, ['DISCONTINUED-' + type + '-sample']);
        });

        it(type + ': falls back for absent, blank or invalid explanation text', function () {
            for (const text of [undefined, null, '', '  \n  ', 42, {}, []]) {
                const [row] = rows({ discontinued: { sample: { text } } });
                assert.equal(row.discontinuedText, '');
            }
            assert.equal(rows({ discontinued: { sample: true } })[0].discontinuedText, '');
        });

        it(type + ': combines both notices without losing download or release notes', function () {
            const latest = update();
            latest.links.releaseNotes = 'https://example.test/release';
            latest.description = 'Release description';
            const result = rows({
                available: { sample: latest },
                discontinued: { sample: { name: 'Discontinued sample' } }
            });
            assert.equal(result.length, 1);
            assert.equal(result[0].hasUpdate, true);
            assert.equal(result[0].isDiscontinued, true);
            assert.equal(result[0].description, latest.description);
            assert.deepEqual(result[0].links, latest.links);
            assert.equal(result[0].notificationIDs.length, 2);
        });

        it(type + ': preserves previously read updates and separately announces discontinued support', function () {
            const options = {
                available: { sample: update() },
                readNotificationIDs: [type + '-sample-2.0.0']
            };
            assert.equal(rows(options)[0].isUnread, false);
            options.discontinued = { sample: true };
            assert.equal(rows(options)[0].isDiscontinuedUnread, true);
            assert.equal(rows(options)[0].isUnread, true);
        });

        it(type + ': keeps the discontinued status after acknowledgement and announces a later version', function () {
            const options = {
                available: { sample: update() },
                discontinued: { sample: true },
                readNotificationIDs: [type + '-sample-2.0.0', 'DISCONTINUED-' + type + '-sample']
            };
            let row = rows(options)[0];
            assert.equal(row.isUnread, false);
            assert.equal(row.isDiscontinued, true);
            options.available.sample = update('3.0.0');
            row = rows(options)[0];
            assert.equal(row.isUnread, true);
            assert.equal(row.isDiscontinuedUnread, false);
        });

        it(type + ': ignores uninstalled extensions and versions already installed', function () {
            const options = {
                available: { sample: update('1.0.0'), missing: update() },
                discontinued: { missing: true }
            };
            assert.deepEqual(rows(options), []);
            options.available.sample.version = '0.9.0';
            assert.deepEqual(rows(options), []);
            options.discontinued.sample = true;
            assert.equal(rows(options)[0].hasUpdate, false);
            options.installed = [];
            assert.deepEqual(rows(options), []);
        });

        it(type + ': handles omitted notification collections and missing links', function () {
            assert.deepEqual(rows(), []);
            assert.deepEqual(rows({ available: null, discontinued: null }), []);
            const [row] = rows({ available: { sample: { version: '2.0.0' } } });
            assert.equal(row.name, 'sample');
            assert.deepEqual(row.links, {});
        });
    }

    it('prioritizes unread discontinued notices, then unread updates, then read rows', function () {
        const input = {
            type: 'THEME',
            installed: [
                extension('read', 'A read notice'),
                extension('update', 'B new update'),
                extension('zulu', 'Zulu discontinued'),
                extension('alpha', 'Alpha discontinued')
            ],
            available: { update: update() },
            discontinued: { read: true, zulu: true, alpha: true },
            readNotificationIDs: ['DISCONTINUED-THEME-read']
        };
        const before = JSON.stringify(input);
        const result = getExtensionNotifications(input);
        assert.deepEqual(result.map(row => row.directory), ['alpha', 'zulu', 'update', 'read']);
        assert.equal(JSON.stringify(input), before);
    });

    it('separates themes and plugins that share a directory name', function () {
        const options = {
            installed: [extension('same')],
            discontinued: { same: true },
            readNotificationIDs: ['DISCONTINUED-THEME-same']
        };
        assert.equal(getExtensionNotifications({ ...options, type: 'THEME' })[0].isUnread, false);
        assert.equal(getExtensionNotifications({ ...options, type: 'PLUGIN' })[0].isUnread, true);
    });
});
