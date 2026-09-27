const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');

const root = path.resolve(__dirname, '../../../..');
const appRequire = createRequire(path.join(root, 'app/package.json'));
const Vue = appRequire('vue');
const VueI18n = appRequire('vue-i18n');
const compiler = require('vue-template-compiler');
const helpers = require('../../helpers/tools-list');
const getExtensionNotifications = require('../../helpers/extension-notifications');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const mixinContext = { module: { exports: {} } };
vm.runInNewContext(
    read('app/src/components/mixins/CollectionCheckboxes.js').replace('export default', 'module.exports ='),
    mixinContext
);
const CollectionCheckboxes = mixinContext.module.exports;
const source = compiler.parseComponent(read('app/src/components/SitePlugins.vue'));
const template = compiler.compile(source.template.content);
const filterSource = compiler.parseComponent(read('app/src/components/basic-elements/CollectionFilterButton.vue'));
const filterTemplate = compiler.compile(filterSource.template.content);
const filterContext = { module: { exports: {} } };
vm.runInNewContext(
    filterSource.script.content.replace('export default', 'module.exports ='),
    filterContext
);
const CollectionFilterButton = {
    ...filterContext.module.exports,
    render: new Function(filterTemplate.render),
    staticRenderFns: filterTemplate.staticRenderFns.map(code => new Function(code))
};
const messages = Object.fromEntries(['en-gb', 'pl', 'de'].map(locale => [
    locale,
    JSON.parse(read('app/default-files/default-languages/' + locale + '/translations.json'))
]));

Vue.use(VueI18n);

function plugin(directory, overrides = {}) {
    return {
        name: directory,
        scope: 'site',
        directory,
        version: '1.0.0',
        minimumPubliiVersion: '0.48.0',
        description: 'A plugin description',
        author: 'Example',
        thumbnail: '/fixture/' + directory + '/thumbnail.svg',
        hasSettings: true,
        ...overrides
    };
}

function setup(locale = 'en-gb') {
    const requests = [];
    const events = [];
    const routes = [];
    const api = {
        async invoke(channel, data) {
            requests.push([channel, data]);
            return channel.endsWith('get-state')
                ? { status: true, states: { Alpha: true, Beta: false, Future: false } }
                : { status: true, enabled: data.enabled };
        },
        shellOpenExternal() {}
    };
    const store = {
        getters: {
            sitePlugins: [
                plugin('Beta', { description: 'Zażółć gęślą jaźń' }),
                plugin('Alpha'),
                plugin('Future', { minimumPubliiVersion: '0.49.0' })
            ],
            notifications: {
                plugins: { Alpha: { version: '1.1.0', links: { download: 'https://example.com/update' } } },
                discontinued: { plugins: { Beta: { text: 'Retired plugin' } } }
            }
        },
        state: {
            app: {
                config: {},
                versionInfo: { version: '0.48.0' }
            }
        }
    };
    const route = { params: { name: 'demo' } };
    const context = {
        module: { exports: {} },
        CollectionFilterButton,
        CollectionCheckboxes,
        Vue,
        Map,
        Set,
        ToolsPluginDetails: {},
        Tooltip: {},
        CollectionSortButton: {},
        ...helpers,
        getExtensionNotifications,
        mainProcessAPI: api,
        document: { activeElement: null },
        escapeHTML: value => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'),
        mapGetters(names) {
            return Object.fromEntries(names.map(name => [name, function () {
                return this.$store.getters[name];
            }]));
        }
    };
    vm.runInNewContext(
        source.script.content.replace(/^import .*;\s*$/gm, '').replace('export default', 'module.exports ='),
        context
    );
    const options = context.module.exports;
    const instance = new Vue({
        ...options,
        beforeCreate() {
            this.$store = store;
            this.$route = route;
            this.$router = { push: destination => routes.push(destination) };
            this.$bus = { $emit: (...args) => events.push(args), $on() {}, $off() {} };
        },
        i18n: new VueI18n({ locale, fallbackLocale: 'en-gb', messages, silentTranslationWarn: true }),
        render: new Function(template.render),
        staticRenderFns: template.staticRenderFns.map(code => new Function(code))
    });
    instance.isLoading = false;
    instance.pluginsStatus = { Alpha: true, Beta: false, Future: false };
    return {
        instance,
        options,
        api,
        store,
        route,
        requests,
        events,
        routes,
        document: context.document
    };
}

describe('Site Plugins collection', () => {
    it('compiles every changed template', () => {
        assert.deepEqual(template.errors, []);
        assert.deepEqual(filterTemplate.errors, []);
        for (const file of ['Tools.vue', 'ToolsPluginDetails.vue', 'SidebarMenu.vue', 'ServerSettings.vue', 'basic-elements/Checkbox.vue']) {
            const parsed = compiler.parseComponent(read('app/src/components/' + file));
            assert.deepEqual(compiler.compile(parsed.template.content).errors, []);
        }
    });

    it('contains only plugins and sorts them by name in both directions', () => {
        const { instance: list } = setup();
        assert.deepEqual(Array.from(list.visiblePlugins, item => item.name), ['Alpha', 'Beta', 'Future']);
        list.sortBy('name');
        assert.deepEqual(Array.from(list.visiblePlugins, item => item.name), ['Future', 'Beta', 'Alpha']);
    });

    it('sorts plugin versions numerically and states in both directions', () => {
        const { instance: list, store } = setup();
        store.getters.sitePlugins[0].version = '1.10.0';
        store.getters.sitePlugins[1].version = '1.2.0';
        store.getters.sitePlugins[2].version = '2.0.0';
        list.sortBy('version');
        assert.deepEqual(Array.from(list.visiblePlugins, item => item.name), ['Alpha', 'Beta', 'Future']);
        list.sortBy('version');
        assert.deepEqual(Array.from(list.visiblePlugins, item => item.name), ['Future', 'Beta', 'Alpha']);
        list.sortBy('status');
        assert.deepEqual(Array.from(list.visiblePlugins, item => item.name), ['Beta', 'Future', 'Alpha']);
        list.sortBy('status');
        assert.equal(list.visiblePlugins[0].name, 'Alpha');
    });

    it('filters plugin status and notices and restores all plugins when cleared', () => {
        const { instance: list } = setup();
        list.changePluginFilter('statusFilter', 'enabled');
        assert.deepEqual(Array.from(list.visiblePlugins, item => item.name), ['Alpha']);
        list.changePluginFilter('noticeFilter', 'updates');
        assert.deepEqual(Array.from(list.visiblePlugins, item => item.name), ['Alpha']);
        list.changePluginFilter('statusFilter', 'disabled');
        assert.equal(list.visiblePlugins.length, 0);
        list.clearFilters();
        assert.equal(list.visiblePlugins.length, 3);
    });

    it('combines status, notice, full descriptions and diacritic-insensitive search', () => {
        const { instance: list } = setup();
        list.changeQuery('zazolc gesla');
        assert.deepEqual(Array.from(list.visiblePlugins, item => item.name), ['Beta']);
        list.changePluginFilter('noticeFilter', 'discontinued');
        list.changePluginFilter('statusFilter', 'disabled');
        assert.deepEqual(Array.from(list.visiblePlugins, item => item.name), ['Beta']);
        list.changePluginFilter('statusFilter', 'enabled');
        assert.equal(list.visiblePlugins.length, 0);
        list.clearFilters();
        assert.equal(list.visiblePlugins.length, 3);
    });

    it('keeps website status counts stable across search and notice filters', () => {
        const { instance: list } = setup();
        assert.deepEqual(Array.from(list.statusFilters, filter => filter.count), [3, 1, 2]);
        list.changeQuery('Alpha');
        list.noticeActions.find(action => action.value === 'updates').onClick();
        assert.equal(list.visiblePlugins.length, 1);
        assert.deepEqual(Array.from(list.statusFilters, filter => filter.count), [3, 1, 2]);
        Vue.set(list.pluginsStatus, 'Beta', true);
        assert.deepEqual(Array.from(list.statusFilters, filter => filter.count), [3, 2, 1]);
    });

    it('does not report unknown plugin states as disabled counts', () => {
        const { instance: list } = setup();
        list.isLoading = true;
        assert.deepEqual(Array.from(list.statusFilters, filter => filter.count), [3, null, null]);
        list.isLoading = false;
        list.loadError = true;
        assert.deepEqual(Array.from(list.statusFilters, filter => filter.count), [3, null, null]);
        list.loadError = false;
        assert.deepEqual(Array.from(list.statusFilters, filter => filter.count), [3, 1, 2]);
    });

    it('combines the notice menu with status and search, and removes only the notice', () => {
        const { instance: list } = setup();
        let focusRestored = false;
        list.$refs.noticeMenu = {
            focusTrigger () {
                focusRestored = true;
            }
        };
        list.changeQuery('description');
        list.changePluginFilter('statusFilter', 'disabled');
        list.noticeActions.find(action => action.value === 'incompatible').onClick();
        assert.deepEqual(Array.from(list.visiblePlugins, item => item.name), ['Future']);
        assert.equal(list.activeNoticeLabel, 'Incompatible');
        assert.deepEqual(Array.from(list.noticeActions, action => action.checked), [false, true, false]);
        list.clearNoticeFilter();
        assert.equal(list.noticeFilter, 'any');
        assert.equal(list.statusFilter, 'disabled');
        assert.equal(list.query, 'description');
        assert.equal(list.activeNoticeLabel, '');
        assert.equal(focusRestored, true);
    });

    it('prunes selection when the notice changes and locks filter actions during a batch', () => {
        const { instance: list } = setup();
        list.toggleAll();
        list.noticeActions.find(action => action.value === 'updates').onClick();
        assert.deepEqual(Array.from(list.selectedItems), ['Alpha']);
        list.operation = 'enable';
        list.noticeActions.find(action => action.value === 'incompatible').onClick();
        list.changePluginFilter('statusFilter', 'disabled');
        list.clearNoticeFilter();
        assert.equal(list.noticeFilter, 'updates');
        assert.equal(list.statusFilter, 'any');
    });

    it('searches plugin descriptions without including built-in tools', () => {
        const { instance: list } = setup();
        list.changeQuery('File manager');
        assert.equal(list.visiblePlugins.length, 0);
        list.changeQuery('description');
        assert.equal(list.visiblePlugins.length, 2);
        list.clearFilters();
        assert.equal(list.visiblePlugins.length, 3);
    });

    it('selects visible plugins only and keeps selection by directory through sorting', () => {
        const { instance: list } = setup();
        list.toggleAll();
        assert.deepEqual(Array.from(list.selectedItems), ['Alpha', 'Beta', 'Future']);
        assert.equal(list.allVisibleSelected, true);
        list.sortBy('name');
        assert.equal(list.selectedItems.length, 3);
        list.changeQuery('Beta');
        assert.deepEqual(Array.from(list.selectedItems), ['Beta']);
        list.toggleSelection('tool-backups');
        assert.deepEqual(Array.from(list.selectedItems), ['Beta']);
        list.changeQuery('no matches');
        assert.equal(list.selectedItems.length, 0);
    });

    it('counts only actionable changes and excludes incompatible plugins from activation', () => {
        const { instance: list } = setup();
        list.toggleAll();
        assert.deepEqual(Array.from(list.enableCandidates, item => item.name), ['Beta']);
        assert.deepEqual(Array.from(list.disableCandidates, item => item.name), ['Alpha']);
        Vue.set(list.pluginsStatus, 'Future', true);
        assert.equal(list.disableCandidates.length, 2);
    });

    it('keeps failed state reads distinct from disabled plugins and permits retry', async () => {
        const { instance: list, api, events } = setup();
        api.invoke = async () => ({ status: false });
        await list.loadStates();
        assert.equal(list.loadError, true);
        const alert = events.find(([channel]) => channel === 'alert-display')[1];
        assert.equal(alert.okLabel, 'Refresh');
        assert.ok(!source.template.content.includes('list-feedback'));
        await list.loadStates();
        assert.equal(events.filter(([channel]) => channel === 'alert-display').length, 1);
        assert.equal(list.visiblePlugins[0].stateKnown, false);
        list.toggleAll();
        assert.equal(list.selectedItems.length, 0);
        api.invoke = async () => ({ status: true, states: { Beta: true } });
        await list.loadStates();
        assert.equal(list.loadError, false);
        assert.ok(events.some(([channel]) => channel === 'alert-dismiss'));
        assert.equal(list.visiblePlugins.find(item => item.name === 'Beta').enabled, true);
    });

    it('ignores late state replies after switching sites', async () => {
        const { instance: list, api, route } = setup();
        let resolve;
        api.invoke = () => new Promise(done => { resolve = done; });
        const request = list.loadStates();
        route.params.name = 'other';
        list.resetView();
        resolve({ status: true, states: { Alpha: true } });
        await request;
        assert.equal(Object.keys(list.pluginsStatus).length, 0);
    });

    it('runs a fixed batch sequentially and preserves failed selections', async () => {
        const { instance: list, api, requests, events, store } = setup();
        store.getters.sitePlugins[0].name = 'Beta <plugin & name>';
        list.pluginsStatus = { Alpha: false, Beta: false, Future: false };
        list.toggleAll();
        let active = 0;
        api.invoke = async (channel, data) => {
            requests.push([channel, data]);
            active += 1;
            assert.equal(active, 1);
            list.changeQuery('no matches');
            assert.equal(list.query, '');
            await Vue.nextTick();
            active -= 1;
            return { status: data.pluginName !== 'Beta' };
        };
        await list.bulkChange(true);
        assert.deepEqual(requests.map(([, data]) => data.pluginName), ['Alpha', 'Beta']);
        assert.deepEqual(Array.from(list.selectedItems), ['Beta', 'Future']);
        assert.equal(list.pluginsStatus.Alpha, true);
        assert.equal(list.pluginsStatus.Beta, false);
        assert.equal(list.switchVersions.Beta, 1);
        assert.equal(events.length, 1);
        assert.equal(events[0][0], 'alert-display');
        assert.equal(events[0][1].message, list.$t('tools.list.partialFailure', { done: 1, failed: 1 }) +
            '<br><br>Beta &lt;plugin &amp; name&gt;');
        assert.equal(list.busy, false);
    });

    it('keeps individual changes quiet and confirms bulk actions without a count', async () => {
        const { instance: list, events } = setup();
        const beta = () => list.items.find(item => item.directory === 'Beta');

        await list.changeOne(beta(), true);
        await list.changeOne(beta(), false);
        assert.equal(events.length, 0);

        list.pluginsStatus = { Alpha: false, Beta: false, Future: false };
        list.toggleAll();
        await list.bulkChange(true);
        list.toggleAll();
        list.bulkChange(false);
        const confirmation = events.find(([event]) => event === 'confirm-display')[1];
        await confirmation.okClick();

        list.selectedItems = ['Beta'];
        await list.bulkChange(true);

        const notifications = events.filter(([event]) => event === 'message-display');
        assert.equal(notifications.length, 3);
        const expected = [
            'Plugins enabled',
            'Plugins disabled',
            'Plugins enabled'
        ];

        notifications.forEach(([, config], index) => {
            assert.equal(config.message, expected[index]);
            assert.equal(config.type, 'success');
            assert.equal(config.lifeTime, 3);
        });
    });

    for (const enabled of [true, false]) {
        it('returns focus to the row menu after ' + (enabled ? 'enabling' : 'disabling') + ' without opening search', async () => {
            const { instance: list, document } = setup();
            const focused = [];
            const trigger = {
                isConnected: true,
                disabled: false,
                focus () {
                    focused.push('menu');
                }
            };
            const menuItem = {
                isConnected: true,
                closest () {
                    return {
                        querySelector () {
                            return trigger;
                        }
                    };
                }
            };
            document.activeElement = menuItem;
            list.$refs.search = {
                isOpen: false,
                value: '',
                open () {
                    this.isOpen = true;
                }
            };
            list.pluginsStatus.Beta = !enabled;
            const beta = list.items.find(item => item.directory === 'Beta');
            const action = list.pluginActions(beta).find(item => item.icon === (enabled ? 'power' : 'power-off'));
            const operation = action.onClick();
            menuItem.isConnected = false;

            await operation;
            await Vue.nextTick();

            assert.equal(list.pluginsStatus.Beta, enabled);
            assert.equal(list.$refs.search.isOpen, false);
            assert.equal(list.$refs.search.value, '');
            assert.deepEqual(focused, ['menu']);
        });
    }

    for (const isOpen of [false, true]) {
        it('preserves ' + (isOpen ? 'expanded' : 'collapsed') + ' search when the previous focus target disappears', async () => {
            const { instance: list, document } = setup();
            const focused = [];
            document.activeElement = { isConnected: false };
            list.$refs.search = {
                isOpen,
                value: isOpen ? 'is:disabled Beta' : '',
                open () {
                    this.isOpen = true;
                    this.value = '';
                },
                $refs: {
                    open: {
                        focus () {
                            focused.push('search-button');
                        }
                    },
                    'input-field': {
                        focus () {
                            focused.push('search-input');
                        }
                    }
                }
            };
            if (isOpen) {
                list.changeQuery('is:disabled Beta');
            }
            const beta = list.items.find(item => item.directory === 'Beta');

            await list.changeOne(beta, true);
            await Vue.nextTick();

            assert.equal(list.$refs.search.isOpen, isOpen);
            assert.equal(list.$refs.search.value, isOpen ? 'is:disabled Beta' : '');
            assert.equal(list.statusFilter, isOpen ? 'disabled' : 'any');
            assert.equal(list.query, isOpen ? 'Beta' : '');
            assert.deepEqual(focused, [isOpen ? 'search-input' : 'search-button']);
        });
    }

    it('reports a rejected save in a standard alert and keeps the confirmed state', async () => {
        const { instance: list, api, events } = setup();
        const beta = list.items.find(item => item.directory === 'Beta');
        api.invoke = async () => {
            throw new Error('Save failed');
        };

        await list.changeOne(beta, true);

        assert.equal(list.pluginsStatus.Beta, false);
        assert.equal(list.switchVersions.Beta, 1);
        assert.equal(list.busy, false);
        assert.equal(events.length, 1);
        assert.equal(events[0][0], 'alert-display');
        assert.equal(events[0][1].message, list.$t('tools.list.partialFailure', { done: 0, failed: 1 }) + '<br><br>Beta');
        assert.equal(typeof events[0][1].okClick, 'function');
    });

    it('freezes filtered rows until the operation ends and rejects duplicate toggles', async () => {
        const { instance: list, api, events } = setup();
        list.changePluginFilter('statusFilter', 'disabled');
        const beta = list.visiblePlugins.find(item => item.name === 'Beta');
        let finish;
        let requests = 0;
        api.invoke = () => {
            requests += 1;
            return new Promise(resolve => { finish = resolve; });
        };
        const task = list.changeOne(beta, true);
        list.changeOne(beta, true);
        assert.equal(requests, 1);
        assert.equal(list.visiblePlugins.length, 2);
        assert.equal(events.length, 0);
        finish({ status: true });
        await task;
        assert.deepEqual(Array.from(list.visiblePlugins, item => item.name), ['Future']);
        assert.equal(events.length, 0);
    });

    it('does not apply stale batches or feedback to another site', async () => {
        const { instance: list, api, route, events } = setup();
        list.pluginsStatus = {};
        list.toggleAll();
        let requests = 0;
        api.invoke = async () => {
            requests += 1;
            route.params.name = 'other';
            list.resetView();
            return { status: true };
        };
        await list.bulkChange(true);
        assert.equal(requests, 1);
        assert.equal(Object.keys(list.pluginsStatus).length, 0);
        assert.ok(!events.some(([channel]) => channel === 'alert-display' || channel === 'message-display'));
        assert.equal(list.busy, false);
    });

    it('confirms bulk disabling with escaped names and ignores stale confirmations', async () => {
        const { instance: list, store, events, route, requests } = setup();
        store.getters.sitePlugins[0].name = '<img src=x>';
        list.pluginsStatus = { Alpha: true, Beta: true };
        list.toggleAll();
        list.bulkChange(false);
        assert.equal(list.confirmationOpen, true);
        const confirmation = events[0][1];
        assert.ok(confirmation.message.includes('&lt;img'));
        assert.ok(!confirmation.message.includes('<img'));
        route.params.name = 'other';
        list.resetView();
        confirmation.okClick();
        await Vue.nextTick();
        assert.equal(requests.length, 0);
    });

    it('opens global installation management separately from the local plugin list', () => {
        const { instance: list, routes } = setup();
        list.managePlugins();
        assert.deepEqual(routes, ['/app-plugins']);
        assert.ok(!source.template.content.includes('pickPluginPackage'));
        assert.ok(!source.template.content.includes('dropPackage'));
        assert.ok(!source.template.content.includes('globalMode'));
        const actions = list.pluginActions(list.items[0]);
        assert.ok(!actions.some(action => action.label === list.$t('plugins.deletePlugin')));
    });

    it('opens settings only for enabled compatible configurable plugins', () => {
        const { instance: list, routes } = setup();
        const alpha = list.items.find(item => item.directory === 'Alpha');
        const beta = list.items.find(item => item.directory === 'Beta');
        const future = list.items.find(item => item.directory === 'Future');
        list.openPlugin(alpha);
        assert.deepEqual(routes, ['/site/demo/plugins/Alpha']);

        for (const item of [
            beta,
            { ...future, enabled: true },
            { ...alpha, hasSettings: false },
            { ...alpha, stateKnown: false }
        ]) {
            list.openPlugin(item);
            assert.deepEqual(routes, ['/site/demo/plugins/Alpha']);
            assert.equal(list.detailsDirectory, '');
        }

        for (const state of ['operation', 'confirmationOpen']) {
            list[state] = state === 'operation' ? 'enable' : true;
            list.openPlugin(alpha);
            list.openPlugin(beta);
            assert.deepEqual(routes, ['/site/demo/plugins/Alpha']);
            assert.equal(list.detailsDirectory, '');
            list[state] = state === 'operation' ? '' : false;
        }

        const details = list.pluginActions(beta).find(action => action.label === list.$t('tools.list.details'));
        details.onClick();
        assert.equal(list.detailsDirectory, 'Beta');
        assert.deepEqual(routes, ['/site/demo/plugins/Alpha']);
        assert.ok(!list.pluginActions(list.detailsPlugin).some(action => action.label === 'Delete'));
    });

    it('explains unavailable settings and hints activation only when it would make settings available', () => {
        const { instance: list } = setup();
        const alpha = list.items.find(item => item.directory === 'Alpha');
        const beta = list.items.find(item => item.directory === 'Beta');
        const future = list.items.find(item => item.directory === 'Future');
        const requiresVersion = list.$t('tools.list.requiresVersion', { version: future.minimumPubliiVersion });
        const cases = [
            {
                item: alpha,
                hint: false,
                reason: ''
            },
            {
                item: beta,
                hint: true,
                reason: list.$t('tools.list.enableForSettings')
            },
            {
                item: future,
                hint: false,
                reason: requiresVersion
            },
            {
                item: { ...beta, hasSettings: false },
                hint: false,
                reason: list.$t('toolsPlugin.thisPluginHasNoOptions')
            },
            {
                item: { ...future, hasSettings: false },
                hint: false,
                reason: requiresVersion
            },
            {
                item: { ...future, stateKnown: false, hasSettings: false },
                hint: false,
                reason: list.$t('tools.list.unknownState')
            }
        ];

        for (const { item, hint, reason } of cases) {
            assert.equal(list.canHintEnable(item), hint);
            assert.equal(list.settingsUnavailableReason(item), reason);
        }

        list.isLoading = true;
        const unknown = list.items.find(item => item.directory === 'Beta');
        assert.equal(list.canHintEnable(unknown), false);
        assert.equal(list.settingsUnavailableReason(unknown), list.$t('ui.loading'));
        list.isLoading = false;

        for (const state of ['operation', 'confirmationOpen']) {
            list[state] = state === 'operation' ? 'enable' : true;

            for (const { item } of cases) {
                assert.equal(list.canHintEnable(item), false);
                assert.equal(list.settingsUnavailableReason(item), '');
            }

            list[state] = state === 'operation' ? '' : false;
        }
    });

    it('opens the plugin context menu by mouse and keyboard and blocks it during changes', () => {
        const { instance: list } = setup();
        const item = list.items[0];
        const calls = [];
        let prevented = 0;
        list.$refs['actions-' + item.directory] = [{
            open (index) {
                calls.push(index);
            }
        }];
        const event = type => ({
            type,
            preventDefault () {
                prevented += 1;
            }
        });

        list.openContextMenu(event('contextmenu'), item);
        list.openContextMenu(event('keydown'), item);
        list.operation = 'enable';
        list.openContextMenu(event('contextmenu'), item);

        assert.deepEqual(calls, [null, 0]);
        assert.equal(prevented, 2);
    });

    it('never exposes executable or credentialed metadata links', () => {
        assert.equal(helpers.externalLink('javascript:alert(1)'), '');
        assert.equal(helpers.externalLink('https://user:pass@example.com'), '');
        assert.equal(helpers.externalLink('https://example.com/releases'), 'https://example.com/releases');
    });

    for (const locale of ['en-gb', 'pl', 'de']) {
        it(`${locale}: renders and resolves all listing labels`, () => {
            const { instance: list } = setup(locale);
            assert.equal(list._render().tag, 'section');
            const nodes = node => {
                const children = [...(node.children || [])];
                const component = node.componentOptions;

                if (component && component.Ctor.options.name === 'collection-filter-button') {
                    const filter = new component.Ctor({ propsData: component.propsData });
                    children.push(filter._render());
                }

                return [node, ...children.flatMap(nodes)];
            };
            const statusButtons = nodes(list._render()).filter(node =>
                node.tag === 'button' && node.data.attrs && node.data.attrs['aria-pressed']
            );
            assert.equal(statusButtons.length, 3);
            assert.deepEqual(statusButtons.map(node => node.data.attrs['aria-pressed']), ['true', 'false', 'false']);
            list.isLoading = true;
            const loadingButtons = nodes(list._render()).filter(node =>
                node.tag === 'button' && node.data.attrs && node.data.attrs['aria-pressed']
            );
            assert.deepEqual(loadingButtons.map(node => !!node.data.attrs.disabled), [false, true, true]);
            list.isLoading = false;
            list.changePluginFilter('noticeFilter', 'updates');
            const clearButton = nodes(list._render()).find(node =>
                node.data && node.data.staticClass && node.data.staticClass.includes('notice-filter-clear')
            );
            assert.equal(clearButton.tag, 'button');
            assert.ok(clearButton.data.attrs['aria-label'].includes(list.activeNoticeLabel));
            assert.ok(!list.noticeActions.some(item => item.label.startsWith('tools.list.')));
            assert.ok(!list.statusFilters.some(item => item.label.startsWith('tools.list.')));
            const literalKeys = [...source.template.content.matchAll(/\$t\('tools\.list\.([^']+)'/g)].map(match => match[1]);
            for (const key of literalKeys) {
                assert.equal(typeof key.split('.').reduce((value, part) => value && value[part], messages[locale].tools.list), 'string', key);
            }
            for (const key of Object.keys(messages['en-gb'].tools.list)) {
                assert.ok(messages[locale].tools.list[key], key);
            }
        });
    }
});

describe('Tools checkbox compatibility', () => {
    it('keeps controlled selection and adds an optional native indeterminate state', async () => {
        const parsed = compiler.parseComponent(read('app/src/components/basic-elements/Checkbox.vue'));
        const result = compiler.compile(parsed.template.content);
        const context = { module: { exports: {} } };
        vm.runInNewContext(parsed.script.content.replace('export default', 'module.exports ='), context);
        const options = context.module.exports;
        const selected = [];
        const checkbox = new Vue({
            ...options,
            propsData: { value: 'plugin', checked: false, indeterminate: true, onClick: value => selected.push(value) },
            render: new Function(result.render)
        });
        const node = checkbox._render();
        assert.equal(node.data.domProps.indeterminate, true);
        assert.equal(node.data.domProps.checked, false);
        const input = { disabled: false, checked: true, indeterminate: false };
        let prevented = false;
        node.data.on.click({
            target: input,
            preventDefault() {
                prevented = true;
            },
            stopPropagation() {}
        });
        await checkbox.$nextTick();
        assert.equal(prevented, false);
        assert.equal(input.checked, false);
        assert.equal(input.indeterminate, true);
        assert.deepEqual(selected, ['plugin']);
        assert.equal(options.props.indeterminate.default, false);
    });
});
