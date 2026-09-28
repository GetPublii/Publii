const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const compiler = require('vue-template-compiler');

const componentsPath = path.resolve(__dirname, '..');

function deferred () {
    let resolve;
    let reject;
    const promise = new Promise((resolvePromise, rejectPromise) => {
        resolve = resolvePromise;
        reject = rejectPromise;
    });

    return { promise, resolve, reject };
}

function loadOptions (componentName, globals = {}) {
    const source = fs.readFileSync(path.join(componentsPath, componentName + '.vue'), 'utf8');
    const component = compiler.parseComponent(source);
    const context = {
        module: { exports: {} },
        SupportedFeaturesCheck: {},
        Repeater: {},
        Vue: { set: (target, key, value) => { target[key] = value; } },
        applyAppAppearance () {},
        PluginsList: {},
        GoToLastOpenedWebsite: {},
        ExtensionInstallation: {},
        Tooltip: {},
        VersionComparator () {},
        mapGetters: () => ({}),
        escapeHTML: value => String(value).replace(/</g, '&lt;').replace(/>/g, '&gt;'),
        document: { querySelector: () => null },
        ...globals
    };

    vm.runInNewContext(
        component.script.content
            .replace(/^import .*;\s*$/gm, '')
            .replace('export default', 'module.exports ='),
        context
    );

    return context.module.exports;
}

function setup (componentName = 'ToolsPlugin') {
    const calls = [];
    const events = [];
    const commits = [];
    const timers = new Map();
    const replies = new Map();
    let timerId = 0;
    const api = {
        invoke (channel, data) {
            const response = deferred();
            calls.push({ channel, data, response });
            return response.promise;
        },
        send (channel, data) {
            calls.push({ channel, data });
        },
        receiveOnce (channel, callback) {
            replies.set(channel, callback);
        }
    };
    const options = loadOptions(componentName, {
        mainProcessAPI: api,
        setTimeout (callback) {
            const id = ++timerId;
            timers.set(id, callback);
            return id;
        },
        clearTimeout (id) {
            timers.delete(id);
        }
    });
    const instance = {
        ...(options.data ? options.data() : {}),
        $nextTick: () => Promise.resolve(),
        $route: { params: { name: 'site-a', pluginname: 'plugin-a' } },
        $t: (key, values) => values ? key + ': ' + (values.sites ?? values.count ?? values.pluginName) : key,
        $bus: { $emit: (name, data) => events.push({ name, data }) },
        $store: { commit: (name, data) => commits.push({ name, data }) }
    };

    for (const [name, method] of Object.entries(options.methods)) {
        instance[name] = method.bind(instance);
    }

    return { instance, options, calls, events, commits, timers, replies };
}

function configResponse (lockId, customOptions = false) {
    return {
        status: true,
        lockId,
        config: {
            pluginData: {
                name: lockId,
                config: [{ name: 'text', type: 'text', value: 'default' }],
                path: '/plugin/' + lockId,
                usePluginSettingsView: customOptions
            },
            pluginConfig: '{}'
        }
    };
}

async function open (harness, lockId = 'lock-a', customOptions = false) {
    const pending = harness.instance.loadPluginConfig('plugin-a', 'site-a');
    harness.calls.at(-1).response.resolve(configResponse(lockId, customOptions));
    await pending;
}

function runTimer (harness) {
    const [id, callback] = harness.timers.entries().next().value;
    harness.timers.delete(id);
    callback();
}

describe('Plugin settings multi-window guard frontend', () => {
    it('keeps a lock for standard and custom settings until the component is destroyed', async () => {
        for (const customOptions of [false, true]) {
            const harness = setup();
            await open(harness, 'lock-a', customOptions);
            assert.equal(harness.instance.settingsLockId, 'lock-a');
            assert.equal(harness.instance.hasPluginCustomOptions, customOptions);
            harness.options.beforeDestroy.call(harness.instance);
            assert.equal(harness.instance.settingsLockId, '');
            assert.equal(harness.calls.at(-1).channel, 'app-site-plugin-settings-close');
            assert.equal(harness.calls.at(-1).data.lockId, 'lock-a');
        }
    });

    it('supports a custom settings page without a standard field schema', async () => {
        const harness = setup();
        const pending = harness.instance.loadPluginConfig('plugin-a', 'site-a');
        const response = configResponse('lock-a', true);
        delete response.config.pluginData.config;
        response.config.pluginConfig = false;
        harness.calls.at(-1).response.resolve(response);
        await pending;
        assert.equal(harness.instance.settingsLockId, 'lock-a');
        assert.equal(harness.instance.hasPluginCustomOptions, true);
        assert.equal(harness.instance.settings.length, 0);
        assert.equal(harness.events.length, 0);
    });

    it('changes locks only after route confirmation and waits for the site switch render', async () => {
        const harness = setup();
        await open(harness);
        assert.equal(harness.options.beforeRouteUpdate, undefined);
        const tick = deferred();
        harness.instance.$nextTick = () => tick.promise;
        const update = harness.options.watch.$route.call(
            harness.instance,
            { name: 'SitePlugin', params: { name: 'site-b', pluginname: 'plugin-b' } },
            harness.instance.$route
        );
        assert.equal(harness.calls.at(-1).channel, 'app-site-plugin-settings-close');
        assert.equal(harness.instance.settingsLockId, '');
        tick.resolve();
        await update;
        assert.equal(harness.calls.at(-1).channel, 'app-site-plugin-settings:open');
        assert.equal(harness.calls.at(-1).data.siteName, 'site-b');
    });

    it('releases an older load response without replacing a newer form', async () => {
        const harness = setup();
        const first = harness.instance.loadPluginConfig('plugin-a', 'site-a');
        const firstResponse = harness.calls.at(-1).response;
        const second = harness.instance.loadPluginConfig('plugin-b', 'site-b');
        harness.calls.at(-1).response.resolve(configResponse('lock-b'));
        await second;
        firstResponse.resolve(configResponse('lock-a'));
        await first;
        assert.equal(harness.instance.settingsLockId, 'lock-b');
        assert.equal(harness.instance.settingsSiteName, 'site-b');
        assert.equal(harness.calls.at(-1).data.lockId, 'lock-a');
    });

    it('releases a load finishing after destruction and shows no popup', async () => {
        const harness = setup();
        const pending = harness.instance.loadPluginConfig('plugin-a', 'site-a');
        const response = harness.calls.at(-1).response;
        harness.options.beforeDestroy.call(harness.instance);
        response.resolve(configResponse('lock-a'));
        await pending;
        assert.equal(harness.calls.at(-1).data.lockId, 'lock-a');
        assert.equal(harness.events.length, 0);
    });

    it('shows the existing translated Alert after a failed read', async () => {
        const harness = setup();
        const pending = harness.instance.loadPluginConfig('plugin-a', 'site-a');
        harness.calls.at(-1).response.reject(new Error('IPC unavailable'));
        await pending;
        assert.equal(harness.instance.settingsLockId, '');
        assert.equal(harness.instance.buttonsLocked, true);
        assert.equal(harness.events[0].name, 'alert-display');
        assert.equal(harness.events[0].data.message, 'toolsPlugin.pluginSettingsLoadError');
    });

    it('releases a lock if the returned settings are malformed', async () => {
        const harness = setup();
        const pending = harness.instance.loadPluginConfig('plugin-a', 'site-a');
        const response = configResponse('lock-a');
        response.config.pluginConfig = '{';
        harness.calls.at(-1).response.resolve(response);
        await pending;
        assert.equal(harness.instance.settingsLockId, '');
        assert.equal(harness.calls.at(-1).data.lockId, 'lock-a');
        assert.equal(harness.events[0].name, 'alert-display');
    });

    it('cancels a pending editor save before reusing the component for another route', async () => {
        const harness = setup();
        await open(harness);
        harness.instance.save(true, 'homepage', false);
        const update = harness.options.watch.$route.call(
            harness.instance,
            { name: 'SitePlugin', params: { name: 'site-b', pluginname: 'plugin-b' } },
            harness.instance.$route
        );
        await update;
        assert.equal(harness.timers.size, 0);
        assert.equal(harness.instance.settingsLockId, '');
        assert.equal(harness.calls.some(call => call.channel === 'app-site-plugin-settings:save'), false);
        assert.equal(harness.calls.at(-2).data.lockId, 'lock-a');
        assert.equal(harness.calls.at(-1).data.pluginName, 'plugin-b');
    });

    it('saves editor values after the flush delay once and with the original lock and site', async () => {
        const harness = setup();
        await open(harness);
        harness.instance.save(false, false, false);
        harness.instance.save(false, false, false);
        assert.equal(harness.timers.size, 1);
        assert.equal(harness.events.filter(event => event.name === 'plugin-settings-before-save').length, 1);
        harness.instance.settingsValues.text = 'flushed editor content';
        runTimer(harness);
        const save = harness.calls.at(-1);
        assert.equal(save.channel, 'app-site-plugin-settings:save');
        assert.equal(save.data.lockId, 'lock-a');
        assert.equal(save.data.siteName, 'site-a');
        assert.equal(save.data.pluginName, 'plugin-a');
        assert.equal(save.data.newConfig.text, 'flushed editor content');
        save.response.resolve(true);
        await new Promise(setImmediate);
        assert.equal(harness.instance.buttonsLocked, false);
        assert.equal(harness.events.at(-1).data.type, 'success');
    });

    it('ignores an earlier save result after the form changes and never starts its preview', async () => {
        const harness = setup();
        await open(harness);
        harness.instance.save(true, 'homepage', false);
        runTimer(harness);
        const save = harness.calls.at(-1);
        await open(harness, 'lock-b');
        save.response.resolve(true);
        await new Promise(setImmediate);
        assert.equal(harness.instance.settingsLockId, 'lock-b');
        assert.equal(harness.events.some(event => event.name === 'message-display'), false);
        assert.equal(harness.events.some(event => event.name === 'rendering-popup-display'), false);
    });

    it('unlocks buttons and reports a rejected save without showing success', async () => {
        const harness = setup();
        await open(harness);
        harness.instance.save(false, false, false);
        runTimer(harness);
        harness.calls.at(-1).response.reject(new Error('Save rejected'));
        await new Promise(setImmediate);
        assert.equal(harness.instance.buttonsLocked, false);
        assert.equal(harness.events.at(-1).data.type, 'warning');
    });

    it('reports blocked installs in an Alert without replacing the catalog or showing success', () => {
        const harness = setup('AppPlugins');
        harness.instance.uploadedPlugin({
            status: 'blocked',
            code: 'settings-open',
            sites: ['<img src=x>', 'Second website']
        });
        assert.equal(harness.commits.length, 0);
        assert.equal(harness.events.length, 1);
        assert.equal(harness.events[0].name, 'alert-display');
        assert.equal(harness.events[0].data.message, 'plugins.settingsOpenMultiple: <strong>&lt;img src=x&gt;</strong>, <strong>Second website</strong>');
    });

    it('checks usage before confirmation and waits for explicit deletion confirmation', async () => {
        const harness = setup('PluginsListItem');
        const pending = harness.instance.deletePlugin('<Plugin>', 'plugin-a');
        assert.equal(harness.calls[0].channel, 'app-plugin:get-usage');
        assert.equal(harness.calls[0].data.pluginName, 'plugin-a');
        assert.equal(harness.events.length, 0);
        await harness.instance.deletePlugin('<Plugin>', 'plugin-a');
        assert.equal(harness.calls.length, 1);
        harness.calls[0].response.resolve({ status: true, sites: ['Zulu', '<Website>'] });
        await pending;

        const confirmation = harness.events[0].data;
        assert.equal(confirmation.dialogLabel, 'plugins.deletePlugin');
        assert.equal(confirmation.detailsLabel, 'plugins.enabledWebsites: 2');
        assert.deepEqual(Array.from(confirmation.details), ['<Website>', 'Zulu']);
        assert.ok(confirmation.message.includes('&lt;Plugin&gt;'));
        assert.equal(harness.calls.length, 1);
        assert.equal(harness.instance.isCheckingUsage, false);

        confirmation.okClick();
        assert.equal(harness.calls.at(-1).channel, 'app-plugin-delete');
    });

    it('shows open settings immediately without deletion confirmation or another request', async () => {
        const harness = setup('PluginsListItem');
        const pending = harness.instance.deletePlugin('A', 'plugin-a');
        harness.calls[0].response.resolve({
            status: false,
            code: 'settings-open',
            sites: ['<Website>', 'Second website']
        });
        await pending;

        assert.equal(harness.events.length, 1);
        assert.equal(harness.events[0].name, 'alert-display');
        assert.equal(harness.events[0].data.message, 'plugins.settingsOpenMultiple: <strong>&lt;Website&gt;</strong>, <strong>Second website</strong>');
        assert.equal(harness.calls.length, 1);
        assert.equal(harness.calls[0].channel, 'app-plugin:get-usage');
        assert.equal(harness.commits.length, 0);
        assert.equal(harness.instance.isCheckingUsage, false);
    });

    it('distinguishes confirmed no usage from failed or unavailable usage checks', async () => {
        for (const response of [{ status: true, sites: [] }, { status: false }, null]) {
            const harness = setup('PluginsListItem');
            const pending = harness.instance.deletePlugin('A', 'plugin-a');
            harness.calls[0].response.resolve(response);
            await pending;
            const confirmation = harness.events[0].data;
            const usageKnown = response && response.status;

            assert.equal(confirmation.message.includes('plugins.notEnabledOnAnyWebsite'), !!usageKnown);
            assert.equal(confirmation.message.includes('plugins.usageCheckError'), !usageKnown);
            assert.equal(confirmation.details.length, 0);
            assert.equal(harness.calls.length, 1);
        }
    });

    it('reports a rejected usage request and ignores responses after leaving the manager', async () => {
        const failed = setup('PluginsListItem');
        const failedRequest = failed.instance.deletePlugin('A', 'plugin-a');
        failed.calls[0].response.reject(new Error('Unavailable'));
        await failedRequest;
        assert.ok(failed.events[0].data.message.includes('plugins.usageCheckError'));
        assert.equal(failed.instance.isCheckingUsage, false);

        const closed = setup('PluginsListItem');
        const closedRequest = closed.instance.deletePlugin('A', 'plugin-a');
        closed.options.beforeDestroy.call(closed.instance);
        closed.calls[0].response.resolve({ status: true, sites: ['Website'] });
        await closedRequest;
        assert.equal(closed.events.length, 0);
    });

    it('clears optional details for the next confirmation and ignores Enter while reading the list', () => {
        let showConfirmation;
        let confirmed = false;
        const options = loadOptions('basic-elements/Confirm', {
            document: {
                activeElement: null,
                body: {
                    classList: { add () {} },
                    addEventListener () {}
                }
            },
            setTimeout (callback) {
                callback();
            }
        });
        const instance = {
            ...options.data.call({ $t: key => key }),
            $t: key => key,
            $bus: {
                $on (event, callback) {
                    showConfirmation = callback;
                }
            },
            $refs: {
                cancelButton: { $el: { focus () {} } }
            },
            onEnterKey () {
                confirmed = true;
            }
        };
        options.mounted.call(instance);
        showConfirmation({
            message: 'Delete plugin?',
            dialogLabel: 'Delete plugin',
            isDanger: true,
            detailsLabel: 'Enabled websites: 1',
            details: ['<Website>']
        });
        assert.equal(instance.details[0], '<Website>');
        options.methods.onDocumentKeyDown.call(instance, {
            key: 'Enter',
            code: 'Enter',
            target: {
                closest (selector) {
                    return selector.includes('.confirmation-details');
                }
            }
        });
        assert.equal(confirmed, false);

        showConfirmation({ message: 'Another confirmation' });
        assert.equal(instance.details.length, 0);
        assert.equal(instance.detailsLabel, '');
    });

    it('reports blocked or failed deletion without false success or catalog replacement', async () => {
        for (const response of [
            { status: false, code: 'settings-open', sites: ['<Website>'] },
            { status: false },
            null
        ]) {
            const harness = setup('PluginsListItem');
            const pending = harness.instance.deletePlugin('A', 'plugin-a');
            harness.calls.at(-1).response.resolve({ status: true, sites: [] });
            await pending;
            harness.events[0].data.okClick();
            harness.replies.get('app-plugin-deleted')(response);
            assert.equal(harness.commits.length, 0);
            assert.equal(harness.events.at(-1).name, 'alert-display');
            assert.equal(harness.events.some(event => event.name === 'message-display'), false);
        }
    });

    it('keeps successful deletion and catalog replacement unchanged', async () => {
        const harness = setup('PluginsListItem');
        const pending = harness.instance.deletePlugin('A', 'plugin-a');
        harness.calls.at(-1).response.resolve({ status: true, sites: [] });
        await pending;
        harness.events[0].data.okClick();
        harness.replies.get('app-plugin-deleted')({ status: true, plugins: [] });
        assert.equal(harness.commits.length, 1);
        assert.equal(harness.commits[0].name, 'replaceAppPlugins');
        assert.equal(harness.events.at(-1).data.type, 'success');
    });
});
