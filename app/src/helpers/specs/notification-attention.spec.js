const assert = require('node:assert/strict');
const {
    getUnreadNotificationIDs,
    readSeenNotificationIDs
} = require('../notification-attention');

function fixture() {
    return {
        app: {
            config: { notificationsStatus: 'accepted' },
            versionInfo: { build: '1' },
            notificationsReadStatus: '',
            notifications: {
                publii: { version: '2.0', build: '2' },
                news: [{
                    id: 'news-1',
                    validFrom: '2026-09-01',
                    validTo: '2026-10-01'
                }],
                themes: { sample: { version: '2.0' } },
                plugins: { sample: { version: '3.0' } },
                discontinued: {
                    themes: { sample: true },
                    plugins: { sample: true }
                }
            }
        },
        themes: [{ directory: 'sample', version: '1.0' }],
        plugins: [{ directory: 'sample', version: '1.0' }]
    };
}

const NOW = new Date('2026-09-30').getTime();

describe('Notification attention identities', function () {
    it('identifies every displayed category and separates versions from discontinued notices', function () {
        const state = fixture();
        const before = JSON.stringify(state);
        assert.deepEqual(getUnreadNotificationIDs(state, NOW), [
            'PUBLII-2.0-2',
            'news-1',
            'THEME-sample-2.0',
            'DISCONTINUED-THEME-sample',
            'PLUGIN-sample-3.0',
            'DISCONTINUED-PLUGIN-sample'
        ]);
        assert.equal(JSON.stringify(state), before);
    });

    it('ignores read, expired, future, installed and uninstalled-extension updates', function () {
        const state = fixture();
        state.app.notificationsReadStatus = 'PUBLII-2.0-2;DISCONTINUED-THEME-sample';
        state.themes[0].version = '2.0';
        state.plugins = [];
        state.app.notifications.news = [
            { id: 'expired', validFrom: '2026-01-01', validTo: '2026-02-01' },
            { id: 'future', validFrom: '2027-01-01', validTo: '2027-02-01' }
        ];
        assert.deepEqual(getUnreadNotificationIDs(state, NOW), []);
        state.app.notificationsReadStatus = '';
        state.app.versionInfo.build = '2';
        state.app.notifications.discontinued = {};
        assert.deepEqual(getUnreadNotificationIDs(state, NOW), []);
    });

    it('recognizes new news, Publii builds and extension versions even when the row count stays unchanged', function () {
        const state = fixture();
        const seen = new Set(getUnreadNotificationIDs(state, NOW));
        state.app.notifications.publii.build = '3';
        state.app.notifications.news[0].id = 'news-2';
        state.app.notifications.themes.sample.version = '3.0';
        state.app.notifications.plugins.sample.version = '4.0';
        assert.deepEqual(getUnreadNotificationIDs(state, NOW).filter(id => !seen.has(id)), [
            'PUBLII-2.0-3',
            'news-2',
            'THEME-sample-3.0',
            'PLUGIN-sample-4.0'
        ]);
    });

    it('tracks unanswered consent separately and stays silent when notifications are disabled', function () {
        const state = fixture();
        state.app.config.notificationsStatus = false;
        assert.deepEqual(getUnreadNotificationIDs(state, NOW), ['NOTIFICATIONS-CONSENT']);
        state.app.config.notificationsStatus = 'rejected';
        assert.deepEqual(getUnreadNotificationIDs(state, NOW), []);
    });

    it('restores persisted identities and safely handles missing or malformed storage', function () {
        const ids = ['news-1', 'THEME-sample-2.0'];
        assert.deepEqual(readSeenNotificationIDs({ getItem: () => JSON.stringify(ids) }), ids);

        for (const value of [null, '', '{', '{}', 'false', '123']) {
            assert.deepEqual(readSeenNotificationIDs({ getItem: () => value }), []);
        }

        assert.deepEqual(readSeenNotificationIDs({ getItem: () => '["news-1", null, 2]' }), ['news-1']);
        assert.deepEqual(readSeenNotificationIDs({
            getItem() {
                throw new Error('Storage unavailable');
            }
        }), []);
    });
});
