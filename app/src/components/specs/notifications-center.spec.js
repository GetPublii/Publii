const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const Vue = require('vue');
const VueI18n = require('vue-i18n');
const compiler = require('vue-template-compiler');
const getExtensionNotifications = require('../../helpers/extension-notifications');
const notificationAttention = require('../../helpers/notification-attention');

Vue.use(VueI18n);

function loadComponent(name, storage, environment = {}) {
    const source = fs.readFileSync(path.join(__dirname, '..', name + '.vue'), 'utf8');
    const context = {
        module: { exports: {} },
        getExtensionNotifications,
        ...notificationAttention,
        document: {
            hidden: false,
            addEventListener() {},
            removeEventListener() {}
        },
        window: {
            addEventListener() {},
            removeEventListener() {}
        },
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
        localStorage: storage,
        setTimeout,
        clearTimeout,
        ...environment
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

function fixture(locale = 'en-gb', readStatus = '', options = {}) {
    const translations = require('../../../default-files/default-languages/' + locale + '/translations.json');
    const storage = options.storage || new Map();
    const localStorage = {
        getItem: key => storage.get(key) || null,
        setItem: (key, value) => storage.set(key, value)
    };
    const component = loadComponent('NotificationsCenter', localStorage, options.environment);
    const state = Vue.observable({
        app: {
            config: {
                notificationsStatus: 'accepted'
            },
            notificationsSeenIDs: notificationAttention.readSeenNotificationIDs(localStorage),
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
            get notificationsStatus() {
                return state.app.config.notificationsStatus;
            },
            set notificationsStatus(value) {
                state.app.config.notificationsStatus = value;
            },
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
            if (name === 'setNotificationsSeenIDs') {
                state.app.notificationsSeenIDs = value;
            }
        }
    };
    const instance = new Vue({
        ...component,
        i18n: new VueI18n({ locale, messages: { [locale]: translations } }),
        beforeCreate() {
            this.$store = store;
            this.$bus = new Vue();
        }
    });
    const topbar = loadComponent('TopBar');
    const updateCounter = () => topbar.methods.updateNotificationsCounters.call({ $store: store });
    instance.$bus.$on('app-update-notifications-counters', updateCounter);
    updateCounter();
    return { instance, state, storage, localStorage, updateCounter };
}

describe('Notification Center extension notices', function () {
    it('ties the refresh icon and click blocking to notification retrieval events', function () {
        const { instance } = fixture();
        const requests = [];
        instance.$options.mounted.forEach(hook => hook.call(instance));
        instance.$bus.$on('app-get-forced-notifications', () => {
            requests.push('retrieve');
            instance.$bus.$emit('app-receiving-notifications');
        });
        const refreshButton = () => descendants(instance._render()).find(node =>
            node.tag === 'p-button' && node.data.attrs.icon === 'refresh'
        );

        assert.equal(refreshButton().data.attrs['icon-loading'], false);
        instance.checkUpdates();
        assert.equal(refreshButton().data.attrs['icon-loading'], true);
        assert.equal(refreshButton().data.attrs.disabled, true);
        instance.checkUpdates();
        assert.equal(requests.length, 1);
        instance.$bus.$emit('app-received-notifications');
        assert.equal(refreshButton().data.attrs['icon-loading'], false);
        assert.equal(refreshButton().data.attrs.disabled, false);
        instance.checkUpdates();
        assert.equal(requests.length, 2);
        instance.$destroy();
    });

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
    function bellFixture(readStatus = '', options = {}) {
        const center = fixture('en-gb', readStatus, options);
        const dropdown = new Vue({
            ...loadComponent('TopBarDropDown', center.localStorage, options.environment),
            i18n: center.instance.$i18n,
            beforeCreate() {
                this.$store = center.instance.$store;
                this.$route = Vue.observable({ path: '/site/sample/posts/' });
                this.$bus = center.instance.$bus;
            }
        });
        dropdown.notificationRevealed = options.revealed !== false;
        return { ...center, dropdown };
    }

    function visibleBadge(dropdown) {
        const nodes = descendants(dropdown._render());
        const badge = nodes.find(node => node.data && node.data.staticClass === 'topbar-app-settings-bell-badge');
        return badge ? badge.children.map(child => child.text || '').join('').trim() : null;
    }

    async function openCenter(instance) {
        instance._isMounted = true;

        for (const hook of instance.$options.mounted) {
            hook.call(instance);
        }

        await Vue.nextTick();
        await Vue.nextTick();
    }

    it('keeps attention after opening only the menu or another application view', async function () {
        const { dropdown, state, storage } = bellFixture();
        dropdown.submenuIsOpen = true;
        await Vue.nextTick();
        dropdown.submenuIsOpen = false;
        dropdown.$route.path = '/app-themes';
        await Vue.nextTick();
        dropdown.$route.path = '/site/sample/posts/';
        await Vue.nextTick();
        assert.equal(visibleBadge(dropdown), '!');
        assert.equal(state.app.notificationsSeenIDs.length, 0);
        assert.equal(storage.has(notificationAttention.SEEN_NOTIFICATIONS_STORAGE_KEY), false);
    });

    it('dismisses attention after displaying the center without reading or removing notifications', async function () {
        const { instance, dropdown, state, updateCounter } = bellFixture();
        Vue.set(state.app.notifications, 'publii', { version: '2.0', build: '2' });
        Vue.set(state.app.notifications, 'news', [{
            id: 'news-1',
            validFrom: '2000-01-01',
            validTo: '2100-01-01'
        }]);
        updateCounter();
        await openCenter(instance);
        assert.equal(visibleBadge(dropdown), null);
        assert.equal(dropdown.triggerTooltip.text, dropdown.$t('ui.openApplicationMenu'));
        assert.equal(dropdown.badgeValue, 4);
        assert.equal(state.app.notificationsReadStatus, '');
        assert.equal(instance.newsToDisplay.length, 1);
        assert.equal(instance.hasPubliiUpdate, true);
        assert.equal(instance.themeNotifications[0].isUnread, true);
        assert.equal(instance.pluginNotifications[0].isUnread, true);
        instance.markAsRead('news');
        assert.equal(instance.newsToDisplay.length, 0);
        assert.equal(state.app.notificationsCount, 3);
        instance.$destroy();
    });

    it('remembers a visit after restarting and detects a different update with the same count', async function () {
        const first = bellFixture();
        await openCenter(first.instance);
        first.instance.$destroy();
        const reopened = bellFixture('', { storage: first.storage });
        assert.equal(visibleBadge(reopened.dropdown), null);
        reopened.state.app.notifications.themes.sample.version = '3.0';
        reopened.updateCounter();
        assert.equal(reopened.state.app.notificationsCount, 2);
        assert.deepEqual([...reopened.dropdown.unseenNotificationIDs], ['THEME-sample-3.0']);
        assert.equal(reopened.dropdown.notificationBellBadgeValue, 2);
    });

    it('acknowledges notifications received while the center is visible, including a delayed first response', async function () {
        const { instance, state } = bellFixture();
        state.app.notifications = {};
        await openCenter(instance);
        assert.equal(state.app.notificationsSeenIDs.length, 0);
        Vue.set(state.app.notifications, 'publii', { version: '2.0', build: '2' });
        await Vue.nextTick();
        await Vue.nextTick();
        assert.equal(state.app.notificationsSeenIDs.includes('PUBLII-2.0-2'), true);
        state.app.notifications.publii.build = '3';
        await Vue.nextTick();
        await Vue.nextTick();
        assert.equal(state.app.notificationsSeenIDs.includes('PUBLII-2.0-3'), true);
        instance.$destroy();
    });

    it('does not acknowledge a hidden center or a response arriving after leaving it', async function () {
        const listeners = new Map();
        const document = {
            hidden: true,
            addEventListener(name, callback) {
                listeners.set(name, callback);
            },
            removeEventListener(name) {
                listeners.delete(name);
            }
        };
        const { instance, state } = bellFixture('', { environment: { document } });
        await openCenter(instance);
        assert.equal(state.app.notificationsSeenIDs.length, 0);
        document.hidden = false;
        await listeners.get('visibilitychange')();
        assert.equal(state.app.notificationsSeenIDs.length, 3);
        Vue.set(state.app.notifications, 'publii', { version: '2.0', build: '2' });
        instance.$destroy();
        await Vue.nextTick();
        await Vue.nextTick();
        assert.equal(state.app.notificationsSeenIDs.includes('PUBLII-2.0-2'), false);
        assert.equal(listeners.size, 0);
    });

    it('dismisses the consent prompt after a visit without accepting or rejecting consent', async function () {
        const { instance, dropdown, state } = bellFixture();
        state.app.config.notificationsStatus = false;
        await openCenter(instance);
        assert.equal(visibleBadge(dropdown), null);
        assert.equal(dropdown.badgeValue, '!');
        assert.equal(state.app.config.notificationsStatus, false);
        assert.equal(state.app.notificationsSeenIDs.includes('NOTIFICATIONS-CONSENT'), true);
        instance.$destroy();
    });

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

    describe('delayed introduction', function () {
        let instances;

        beforeEach(function () {
            instances = [];
        });

        afterEach(function () {
            for (const instance of instances) {
                instance.$destroy();
            }
        });

        function introFixture() {
            const timers = new Map();
            const listeners = new Map();
            let time = 0;
            let nextTimer = 0;
            const document = {
                hidden: false,
                addEventListener(name, callback) {
                    listeners.set(name, callback);
                },
                removeEventListener(name, callback) {
                    if (listeners.get(name) === callback) {
                        listeners.delete(name);
                    }
                }
            };
            const environment = {
                document,
                setTimeout(callback, delay) {
                    const id = ++nextTimer;
                    timers.set(id, { callback, time: time + delay });
                    return id;
                },
                clearTimeout(id) {
                    timers.delete(id);
                }
            };
            const result = bellFixture('', { revealed: false, environment });
            instances.push(result.dropdown);

            return {
                ...result,
                document,
                timers,
                listeners,
                async mount() {
                    for (const hook of result.dropdown.$options.mounted) {
                        hook.call(result.dropdown);
                    }

                    await Vue.nextTick();
                },
                async advance(milliseconds) {
                    const end = time + milliseconds;
                    let next;

                    while ((next = [...timers.entries()]
                        .filter(([, timer]) => timer.time <= end)
                        .sort((a, b) => a[1].time - b[1].time)[0])) {
                        time = next[1].time;
                        timers.delete(next[0]);
                        next[1].callback();
                        await Vue.nextTick();
                    }

                    time = end;
                    await Vue.nextTick();
                },
                async setHidden(hidden) {
                    document.hidden = hidden;
                    listeners.get('visibilitychange')();
                    await Vue.nextTick();
                }
            };
        }

        it('keeps the dots for three seconds while notifications remain available in the menu', async function () {
            const context = introFixture();
            await context.mount();
            assert.equal(visibleBadge(context.dropdown), null);
            assert.equal(context.dropdown.badgeValue, 2);
            assert.equal(context.dropdown.triggerTooltip.text, context.dropdown.notificationCountText);
            await context.advance(2999);
            assert.equal(visibleBadge(context.dropdown), null);
            await context.advance(1);
            assert.equal(visibleBadge(context.dropdown), '!');
            assert.equal(context.dropdown.notificationIntroPlaying, true);
            await context.advance(1160);
            assert.equal(context.dropdown.notificationIntroPlaying, false);
            assert.equal(context.timers.size, 0);
        });

        it('starts the delay when notifications arrive and does not restart it when the count changes', async function () {
            const context = introFixture();
            context.state.app.notificationsCount = 0;
            await context.mount();
            await context.advance(5000);
            assert.equal(context.timers.size, 0);
            context.state.app.notificationsCount = 1;
            await Vue.nextTick();
            await context.advance(2000);
            context.state.app.notificationsCount = 2;
            await Vue.nextTick();
            await context.advance(1000);
            assert.equal(context.dropdown.notificationIntroPlaying, true);
        });

        for (const interaction of ['triggerHovered', 'triggerFocused', 'submenuIsOpen']) {
            it('waits until ' + interaction + ' ends without restarting the delay', async function () {
                const context = introFixture();
                context.dropdown[interaction] = true;
                await context.mount();
                await context.advance(4000);
                assert.equal(visibleBadge(context.dropdown), null);
                assert.equal(context.dropdown.notificationRevealed, false);
                context.dropdown[interaction] = false;
                await Vue.nextTick();
                assert.equal(visibleBadge(context.dropdown), '!');
                assert.equal(context.dropdown.notificationIntroPlaying, true);
            });
        }

        it('cancels a pending reveal if all notifications are read', async function () {
            const context = introFixture();
            await context.mount();
            await context.advance(2000);
            context.state.app.notificationsCount = 0;
            await Vue.nextTick();
            await context.advance(2000);
            assert.equal(context.dropdown.notificationRevealed, false);
            assert.equal(context.timers.size, 0);
        });

        it('waits for a visible website view before introducing the bell', async function () {
            const context = introFixture();
            context.dropdown.$route.path = '/app-settings';
            await context.mount();
            await context.advance(4000);
            assert.equal(context.timers.size, 0);
            context.dropdown.$route.path = '/site/sample/posts/';
            await Vue.nextTick();
            await context.advance(2000);
            await context.setHidden(true);
            await context.advance(4000);
            assert.equal(context.dropdown.notificationRevealed, false);
            await context.setHidden(false);
            await context.advance(2999);
            assert.equal(context.dropdown.notificationRevealed, false);
            await context.advance(1);
            assert.equal(context.dropdown.notificationIntroPlaying, true);
        });

        it('does not replay the introduction when changing websites, reopening the menu or receiving later updates', async function () {
            const context = introFixture();
            await context.mount();
            await context.advance(3000);
            context.dropdown.submenuIsOpen = true;
            await Vue.nextTick();
            assert.equal(context.dropdown.notificationIntroPlaying, false);
            context.dropdown.submenuIsOpen = false;
            context.dropdown.$route.path = '/app-themes';
            await Vue.nextTick();
            context.dropdown.$route.path = '/site/another/posts/';
            await Vue.nextTick();
            assert.equal(visibleBadge(context.dropdown), '!');
            assert.equal(context.dropdown.notificationIntroPlaying, false);
            context.state.app.notificationsCount = 0;
            await Vue.nextTick();
            context.state.app.notificationsCount = 1;
            await Vue.nextTick();
            assert.equal(visibleBadge(context.dropdown), '!');
            assert.equal(context.dropdown.notificationIntroPlaying, false);
            assert.equal(context.timers.size, 0);
        });

        it('does not replay after the header is remounted on returning from an editor', async function () {
            const context = introFixture();
            await context.mount();
            await context.advance(3000);
            const options = context.dropdown.$options;
            context.dropdown.$destroy();
            const remounted = new Vue(options);
            instances.push(remounted);

            for (const hook of remounted.$options.mounted) {
                hook.call(remounted);
            }

            await Vue.nextTick();
            assert.equal(visibleBadge(remounted), '!');
            assert.equal(remounted.notificationIntroPlaying, false);
            assert.equal(context.timers.size, 0);
        });

        it('introduces the bell again for a new version after the center was visited', async function () {
            const context = introFixture();
            await context.mount();
            await context.advance(3000);
            await openCenter(context.instance);
            context.instance.$destroy();
            assert.equal(visibleBadge(context.dropdown), null);
            context.state.app.notifications.themes.sample.version = '3.0';
            context.updateCounter();
            await Vue.nextTick();
            await context.advance(2999);
            assert.equal(visibleBadge(context.dropdown), null);
            await context.advance(1);
            assert.equal(visibleBadge(context.dropdown), '2');
            assert.equal(context.dropdown.notificationIntroPlaying, true);
        });

        it('synchronizes a visit from another window without changing the unread count', async function () {
            const context = introFixture();
            await context.mount();
            await context.advance(3000);
            const ids = notificationAttention.getUnreadNotificationIDs(context.state);
            context.localStorage.setItem(
                notificationAttention.SEEN_NOTIFICATIONS_STORAGE_KEY,
                JSON.stringify(ids)
            );
            context.dropdown.syncSeenNotifications({ key: notificationAttention.SEEN_NOTIFICATIONS_STORAGE_KEY });
            await Vue.nextTick();
            assert.equal(visibleBadge(context.dropdown), null);
            assert.equal(context.dropdown.badgeValue, 2);
        });

        it('uses the same delayed introduction for the notification consent prompt', async function () {
            const context = introFixture();
            context.dropdown.$store.getters.notificationsStatus = false;
            await context.mount();
            assert.equal(visibleBadge(context.dropdown), null);
            await context.advance(3000);
            assert.equal(visibleBadge(context.dropdown), '!');
            assert.equal(context.dropdown.hasNotificationPrompt, true);
        });

        it('does not reveal a bell when notification consent is rejected', async function () {
            const context = introFixture();
            context.dropdown.$store.getters.notificationsStatus = 'rejected';
            await context.mount();
            await context.advance(4000);
            assert.equal(visibleBadge(context.dropdown), null);
            assert.equal(context.timers.size, 0);
        });

        it('cleans up the delay, animation timer and visibility listener on destruction', async function () {
            const pending = introFixture();
            await pending.mount();
            pending.dropdown.$destroy();
            assert.equal(pending.timers.size, 0);
            assert.equal(pending.listeners.size, 0);
            await pending.advance(4000);
            assert.equal(pending.dropdown.notificationRevealed, false);

            const playing = introFixture();
            await playing.mount();
            await playing.advance(3000);
            playing.dropdown.$destroy();
            assert.equal(playing.timers.size, 0);
            assert.equal(playing.listeners.size, 0);
        });
    });
});
