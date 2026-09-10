const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const Vue = require('vue');
const VueI18n = require('vue-i18n');
const compiler = require('vue-template-compiler');
const getExtensionNotifications = require('../../helpers/extension-notifications');

Vue.use(VueI18n);

function loadComponent(name, storage) {
    const source = fs.readFileSync(path.join(__dirname, '..', name + '.vue'), 'utf8');
    const context = {
        module: { exports: {} },
        getExtensionNotifications,
        mapGetters: keys => Object.fromEntries(keys.map(key => [key, function () {
            return this.$store.getters[key];
        }])),
        GoToLastOpenedWebsite: {
            methods: {
                goBack() {}
            }
        },
        TopBarAppBar: {},
        TopBarDropDown: {},
        TopBarDropDownItem: {},
        Tooltip: {},
        localStorage: storage
    };
    const script = source.match(/<script>([\s\S]*?)<\/script>/)[1];
    vm.runInNewContext(
        script.replace(/^import[^\n]+\n/gm, '').replace('export default', 'module.exports ='),
        context
    );
    const template = source.slice(source.indexOf('<template>') + 10, source.lastIndexOf('</template>'));
    return { ...context.module.exports, ...compiler.compileToFunctions(template) };
}

function descendants(node) {
    return [node, ...(node.children || []).flatMap(descendants)];
}

function fixture(locale = 'en-gb', readStatus = '') {
    const translations = require('../../../default-files/default-languages/' + locale + '/translations.json');
    const storage = new Map();
    const options = loadComponent('NotificationsCenter', {
        setItem: (key, value) => storage.set(key, value)
    });
    const state = Vue.observable({
        app: {
            notificationsReadStatus: readStatus,
            notificationsCount: 0,
            versionInfo: { version: '1.0', build: '1' },
            notifications: {
                themes: { sample: { version: '2.0', links: { download: 'https://example.test/theme' } } },
                plugins: {},
                discontinued: { themes: { sample: true }, plugins: { sample: true } }
            }
        },
        themes: [{ name: 'Sample theme', directory: 'sample', version: '1.0' }],
        plugins: [{ name: 'Sample plugin', directory: 'sample', version: '1.0' }],
        themesPath: '/themes',
        pluginsPath: '/plugins'
    });
    const store = {
        state,
        getters: {
            notificationsStatus: 'accepted',
            get notifications() {
                return state.app.notifications;
            },
            get notificationsCount() {
                return state.app.notificationsCount;
            }
        },
        commit(name, value) {
            if (name === 'setNotificationsReadStatus') {
                state.app.notificationsReadStatus = value;
            }
            if (name === 'setNotificationsCount') {
                state.app.notificationsCount = value;
            }
        }
    };
    const instance = new Vue({
        ...options,
        i18n: new VueI18n({ locale, messages: { [locale]: translations } })
    });
    instance.$store = store;
    instance.$bus = new Vue();
    const topbar = loadComponent('TopBar');
    const updateCounter = () => topbar.methods.updateNotificationsCounters.call({ $store: store });
    instance.$bus.$on('app-update-notifications-counters', updateCounter);
    updateCounter();
    return { instance, state, storage, updateCounter };
}

describe('Notification Center extension notices', function () {
    for (const locale of ['en-gb', 'pl', 'de']) {
        it(locale + ': renders combined rows, status text and only valid download actions', function () {
            const { instance } = fixture(locale);
            const nodes = descendants(instance._render());
            const rows = nodes.filter(node => node.data && node.data.class && node.data.class['is-extension-notification']);
            assert.equal(rows.length, 2);
            const badges = nodes.filter(node => node.data && node.data.staticClass === 'notification-discontinued-badge');
            assert.equal(badges.length, 2);
            const downloads = nodes.filter(node => node.tag === 'p-button' && node.data.attrs.icon === 'download');
            assert.equal(downloads.length, 1);
            const text = nodes.map(node => node.text || '').join('');
            assert.equal(/\bnotifications\.[a-zA-Z]/.test(text), false);
            assert.equal(text.includes(instance.$t('notifications.discontinuedPluginInfo')), true);
            assert.equal(text.includes(instance.$t('notifications.discontinuedThemeInfo')), true);
            const groups = nodes.filter(node => node.tag === 'fields-group');
            assert.deepEqual(groups.map(node => node.data.attrs.title), [
                instance.$t('notifications.themeUpdatesAndNotices'),
                instance.$t('notifications.pluginUpdatesAndNotices')
            ]);
            assert.equal(nodes.some(node => node.tag === 'empty-state'), false);
            const buttons = nodes.filter(node => node.tag === 'button' && node.data.staticClass === 'notification-action');
            assert.equal(buttons.length, 2);
            assert.equal(buttons.every(node => node.data.attrs.type === 'button' && !node.data.attrs.disabled), true);
        });
    }

    it('renders custom explanations as plain text instead of the generic translated message', function () {
        const { instance, state } = fixture();
        const reason = 'A custom reason with <strong>literal markup</strong>.';
        state.app.notifications.discontinued.themes.sample = { name: 'Theme', text: reason };
        state.app.notifications.discontinued.plugins.sample = { name: 'Plugin', text: reason };
        const nodes = descendants(instance._render());
        const descriptions = nodes.filter(node => node.data && node.data.staticClass === 'notification-discontinued-info');
        assert.equal(descriptions.length, 2);
        for (const description of descriptions) {
            assert.equal(description.children.length, 1);
            assert.equal(description.children[0].text.trim(), reason);
            assert.equal(description.children[0].tag, undefined);
        }
        const text = nodes.map(node => node.text || '').join('');
        assert.equal(text.includes(instance.$t('notifications.discontinuedThemeInfo')), false);
        assert.equal(text.includes(instance.$t('notifications.discontinuedPluginInfo')), false);
        assert.equal(state.app.notificationsCount, 2);
    });

    it('counts one row per extension and persists group-specific acknowledgement', function () {
        const { instance, state, storage } = fixture();
        assert.equal(state.app.notificationsCount, 2);
        instance.markAsRead('themes');
        assert.equal(state.app.notificationsCount, 1);
        assert.equal(instance.themeNotifications.length, 1);
        assert.equal(instance.themeNotifications[0].isDiscontinued, true);
        assert.equal(instance.themeNotifications[0].isUnread, false);
        assert.equal(instance.unreadThemeNotifications, false);
        assert.equal(instance.unreadPluginNotifications, true);
        const saved = storage.get('publii-notifications-readed');
        assert.equal(saved.includes('THEME-sample-2.0'), true);
        assert.equal(saved.includes('DISCONTINUED-THEME-sample'), true);
        assert.equal(saved.includes('DISCONTINUED-PLUGIN-sample'), false);
        const reopened = fixture('en-gb', saved);
        assert.equal(reopened.instance.themeNotifications[0].isUnread, false);
        instance.markAsRead('themes');
        assert.equal(storage.get('publii-notifications-readed'), saved);
        instance.markAsRead('plugins');
        assert.equal(state.app.notificationsCount, 0);
        assert.equal(instance.pluginNotifications[0].isDiscontinued, true);
        const nodes = descendants(instance._render());
        const buttons = nodes.filter(node => node.tag === 'button' && node.data.staticClass === 'notification-action');
        assert.equal(buttons.every(node => node.data.attrs.disabled), true);
    });

    it('persists acknowledgement for directories containing spaces and non-ASCII characters', function () {
        const { instance, state, storage, updateCounter } = fixture();
        const directory = 'Zażółć plugin';
        state.plugins[0].directory = directory;
        Vue.set(state.app.notifications.plugins, directory, { version: '2.0' });
        Vue.set(state.app.notifications.discontinued.plugins, directory, true);
        updateCounter();
        instance.markAsRead('themes');
        instance.markAsRead('plugins');
        assert.equal(state.app.notificationsCount, 0);
        assert.equal(instance.pluginNotifications[0].isUnread, false);
        const saved = storage.get('publii-notifications-readed');
        assert.equal(instance.pluginNotifications[0].notificationIDs.every(id => saved.split(';').includes(id)), true);
    });

    it('counts a later update without making the acknowledged discontinued notice new again', function () {
        const { instance, state, updateCounter } = fixture();
        instance.markAsRead('themes');
        instance.markAsRead('plugins');
        state.app.notifications.themes.sample.version = '3.0';
        updateCounter();
        assert.equal(state.app.notificationsCount, 1);
        assert.equal(instance.themeNotifications[0].isUnread, true);
        assert.equal(instance.themeNotifications[0].isDiscontinuedUnread, false);
    });

    it('keeps Publii and news counters independent and excludes removed extensions', function () {
        const { instance, state, updateCounter } = fixture();
        Vue.set(state.app.notifications, 'publii', { version: '2.0', build: '2' });
        Vue.set(state.app.notifications, 'news', [{ id: 'news-1', validFrom: '2000-01-01', validTo: '2100-01-01' }]);
        updateCounter();
        assert.equal(state.app.notificationsCount, 4);
        instance.markAsRead('news');
        instance.markAsRead('publii');
        assert.equal(state.app.notificationsCount, 2);
        state.themes = [];
        state.plugins = [];
        updateCounter();
        assert.equal(state.app.notificationsCount, 0);
        assert.equal(instance.themeNotifications.length, 0);
        assert.equal(instance.pluginNotifications.length, 0);
    });
});


describe('Application menu notification bell', function () {
    function bellFixture(readStatus = '') {
        const center = fixture('en-gb', readStatus);
        const dropdown = new Vue({
            ...loadComponent('TopBarDropDown'),
            i18n: center.instance.$i18n
        });
        dropdown.$store = center.instance.$store;
        dropdown.$route = { path: '/site/sample/posts/' };
        return { ...center, dropdown };
    }

    function visibleBadge(dropdown) {
        const nodes = descendants(dropdown._render());
        const badge = nodes.find(node => node.data && node.data.staticClass === 'topbar-app-settings-bell-badge');
        return badge ? badge.children.map(child => child.text || '').join('').trim() : null;
    }

    it('shows an exclamation mark for an unread discontinued notice without changing the menu or tooltip', function () {
        const { dropdown } = bellFixture();
        assert.equal(visibleBadge(dropdown), '!');
        assert.equal(dropdown.badgeValue, 2);
        assert.equal(dropdown.triggerTooltip.text, dropdown.notificationCountText);
    });

    it('returns to a number when discontinued notices are read but an update is still unread', function () {
        const { dropdown } = bellFixture('DISCONTINUED-THEME-sample;DISCONTINUED-PLUGIN-sample');
        assert.equal(visibleBadge(dropdown), '1');
    });

    it('keeps the exclamation mark until all discontinued notices are read and then returns to the menu icon', function () {
        const { instance, dropdown } = bellFixture();
        instance.markAsRead('themes');
        assert.equal(visibleBadge(dropdown), '!');
        instance.markAsRead('plugins');
        assert.equal(visibleBadge(dropdown), null);
        assert.equal(dropdown.hasNotificationUpdates, false);
    });

    it('shows only the remaining update count after the discontinued extensions are removed', function () {
        const { state, dropdown, updateCounter } = bellFixture();
        state.plugins = [];
        state.app.notifications.discontinued.themes = {};
        updateCounter();
        assert.equal(visibleBadge(dropdown), '1');
    });
});
