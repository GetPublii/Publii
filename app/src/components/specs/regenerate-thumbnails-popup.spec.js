/* Exercise the popup with real Vue state and the shared regeneration controller. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const { CHANNELS, createInitialState, createThumbnailsRegeneration } = require('../../helpers/thumbnails-regeneration');

const repo = path.resolve(__dirname, '../../../..');
const appRequire = createRequire(path.join(repo, 'app/package.json'));
const Vue = appRequire('vue');
const VueI18n = appRequire('vue-i18n');
const compiler = appRequire('vue-template-compiler');
Vue.use(VueI18n);

function nodes(vnode) {
    return vnode ? [vnode, ...(vnode.children || []).flatMap(nodes)] : [];
}

function setup(locale = 'en-gb') {
    const listeners = {};
    const sends = [];
    const callbacks = [];
    const bus = new Vue();
    bus.$on('regenerate-thumbnails-close', value => callbacks.push(value));
    const store = {
        state: Vue.observable({
            currentSite: { config: { name: 'demo' } },
            components: { thumbnailsRegeneration: createInitialState() }
        }),
        commit(name, value) {
            store.state.components.thumbnailsRegeneration = value;
        }
    };
    const controller = createThumbnailsRegeneration({
        store,
        api: {
            send: (...args) => sends.push(args),
            receive: (channel, callback) => { listeners[channel] = callback; },
            stopReceiveAll: channel => { delete listeners[channel]; }
        }
    });
    const source = fs.readFileSync(path.join(repo, 'app/src/components/RegenerateThumbnailsPopup.vue'), 'utf8');
    const parsed = compiler.parseComponent(source);
    const compiled = compiler.compile(parsed.template.content);
    assert.deepEqual(compiled.errors, []);
    const context = {
        module: { exports: {} },
        getThumbnailsRegeneration: () => controller,
        document: { activeElement: null },
        Intl,
        Date
    };
    vm.runInNewContext(parsed.script.content.replace(/^import .*;\s*$/gm, '').replace('export default', 'module.exports ='), context);
    const translations = JSON.parse(fs.readFileSync(path.join(repo, 'app/default-files/default-languages', locale, 'translations.json'), 'utf8'));
    const instance = new Vue({
        ...context.module.exports,
        beforeCreate() {
            this.$store = store;
            this.$bus = bus;
        },
        i18n: new VueI18n({ locale, messages: { [locale]: translations } }),
        render: new Function(compiled.render),
        staticRenderFns: compiled.staticRenderFns.map(code => new Function(code))
    });

    return {
        instance,
        store,
        controller,
        sends,
        callbacks,
        emit(channel, data = {}) {
            listeners[channel]({
                runId: store.state.components.thumbnailsRegeneration.runId,
                ...data
            });
        },
        buttons() {
            return nodes(instance._render()).filter(node => node.tag === 'p-button');
        },
        orb() {
            return nodes(instance._render()).find(node => node.tag === 'progress-orb').data.attrs;
        }
    };
}

describe('Thumbnail regeneration popup', function () {
    for (const locale of ['en-gb', 'pl', 'de']) {
        it(`explains each trigger and the initial action in ${locale}`, function () {
            const test = setup(locale);
            const messages = new Set();

            for (const reason of ['settings', 'theme', 'import']) {
                test.instance.show({ reason });
                messages.add(test.instance.message);
                assert.ok(test.instance.message.length > 20);
                assert.equal(test.instance.message.includes('tools.thumbnails.'), false);
            }

            assert.equal(messages.size, 3);
            assert.equal(test.orb().phase, 'idle');
            assert.equal(test.orb()['aria-hidden'], 'true');
            assert.equal(test.buttons().length, 2);
            assert.equal(test.instance.title.includes('tools.thumbnails.'), false);
            test.instance.$destroy();
        });
    }

    it('restarts an earlier job and offers only Cancel throughout preparation and progress', async function () {
        const test = setup();
        test.controller.start('demo');
        const oldRun = test.store.state.components.thumbnailsRegeneration.runId;
        test.instance.show();
        test.buttons()[0].data.attrs.onClick();
        await Vue.nextTick();
        assert.notEqual(test.store.state.components.thumbnailsRegeneration.runId, oldRun);
        assert.equal(test.orb().indeterminate, true);
        assert.equal(test.orb()['aria-valuenow'], null);
        assert.equal(test.buttons().length, 1);
        assert.equal(test.buttons()[0].data.attrs.width, 'full');

        test.emit(CHANNELS.progress, { processed: 42, total: 129, value: 32, thumbnails: 5 });
        await Vue.nextTick();
        assert.equal(test.orb().indeterminate, false);
        assert.equal(test.orb()['aria-valuenow'], 32);
        assert.match(test.instance.message, /42 of 129/);
        test.buttons()[0].data.attrs.onClick();
        assert.equal(test.instance.isVisible, false);
        assert.equal(test.store.state.components.thumbnailsRegeneration.status, 'stopped');
        assert.equal(test.sends.at(-1)[0], 'app-site-abort-regenerate-thumbnails');
        test.instance.$destroy();
    });

    it('continues the saved-settings flow once after a successful run', async function () {
        const test = setup();
        const callback = { siteName: 'demo', showPreview: true };
        test.instance.show({ savedSettingsCallback: callback });
        test.instance.regenerate();
        test.emit(CHANNELS.success, { processed: 129, total: 129 });
        await Vue.nextTick();
        assert.equal(test.instance.isVisible, false);
        assert.deepEqual(test.callbacks, [callback]);
        test.instance.skip();
        assert.equal(test.callbacks.length, 1);
        test.instance.$destroy();
    });

    it('keeps import completion visible until acknowledged', async function () {
        const test = setup();
        test.instance.show({ reason: 'import' });
        test.instance.regenerate();
        test.emit(CHANNELS.progress, { processed: 1, total: 1, value: 100, thumbnails: 5 });
        test.emit(CHANNELS.success, { processed: 1, total: 1 });
        await Vue.nextTick();
        assert.equal(test.instance.isVisible, true);
        assert.equal(test.orb().phase, 'success');
        assert.match(test.instance.message, /Images: 1 · Thumbnails: 5/);
        assert.equal(test.buttons().length, 1);
        test.buttons()[0].data.attrs.onClick();
        assert.equal(test.instance.isVisible, false);
        assert.equal(test.callbacks.length, 0);
        test.instance.$destroy();
    });

    for (const result of ['warning', 'error']) {
        it(`requires acknowledgement before continuing settings on ${result}`, async function () {
            const test = setup();
            test.instance.show({ savedSettingsCallback: { siteName: 'demo' } });
            test.instance.regenerate();

            if (result === 'warning') {
                test.emit(CHANNELS.progress, { image: 'posts/1/broken.jpg', broken: true, total: 1 });
                test.emit(CHANNELS.success, { processed: 1, total: 1 });
            } else {
                test.emit(CHANNELS.error, { message: { translation: 'tools.thumbnails.noThemeText' } });
            }

            await Vue.nextTick();
            assert.equal(test.instance.isVisible, true);
            assert.equal(test.orb().phase, result);
            assert.equal(test.instance.orbIcon, 'triangle-alert');
            assert.ok(test.instance.message.length > 20);
            assert.equal(test.callbacks.length, 0);
            test.buttons()[0].data.attrs.onClick();
            assert.equal(test.callbacks.length, 1);
            test.instance.$destroy();
        });
    }

    it('skips without starting and cancels with the settings callback intact', function () {
        const test = setup();
        test.instance.show({ savedSettingsCallback: { siteName: 'first' } });
        test.buttons()[1].data.attrs.onClick();
        assert.equal(test.sends.length, 0);
        assert.equal(test.callbacks[0].siteName, 'first');
        test.instance.show({ savedSettingsCallback: { siteName: 'second' } });
        test.instance.regenerate();
        test.instance.abortRegenerate();
        assert.equal(test.callbacks[1].siteName, 'second');
        assert.equal(test.store.state.components.thumbnailsRegeneration.status, 'stopped');
        test.instance.$destroy();
    });
});
