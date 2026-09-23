/*
 * Regression tests for the thumbnail regeneration panel in Tools.
 * Covers the summary before a run, progress, problems, a stopped run, a run of
 * another website and the translations of the panel.
 * Uses a mocked store and main process API; no worker is started.
 *
 * Run with the full test suite from the repository root: npm test
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const {
    CHANNELS,
    createInitialState,
    createThumbnailsRegeneration
} = require('../../helpers/thumbnails-regeneration');

const repo = path.resolve(__dirname, '../../../..');
const appRequire = createRequire(path.join(repo, 'app/package.json'));
const Vue = appRequire('vue');
const VueI18n = appRequire('vue-i18n');
const compiler = appRequire('vue-template-compiler');
Vue.use(VueI18n);
const originalSilent = Vue.config.silent;
Vue.config.silent = true;
after(() => { Vue.config.silent = originalSilent; });

const locales = ['en-gb', 'pl', 'de'];
const languages = Object.fromEntries(locales.map(locale => [locale, JSON.parse(fs.readFileSync(path.join(repo, 'app/default-files/default-languages', locale, 'translations.json'), 'utf8'))]));

function setup(summary = { status: 'ready', images: 1280, theme: 'Reveral', format: 'webp', responsiveImages: true }, locale = 'en-gb') {
    const listeners = {};
    const sends = [];
    const routes = [];
    const api = {
        send: (...args) => sends.push(args),
        invoke: () => Promise.resolve(summary),
        receive: (channel, callback) => { listeners[channel] = callback; },
        receiveOnce: (channel, callback) => { listeners[channel] = callback; },
        stopReceiveAll: (channel) => { delete listeners[channel]; }
    };
    const store = {
        state: {
            currentSite: { config: { name: 'demo' } },
            sites: { demo: { displayName: 'Demo' }, other: { displayName: 'Other website' } },
            components: { thumbnailsRegeneration: createInitialState() }
        },
        commit: (name, value) => {
            assert.equal(name, 'setThumbnailsRegeneration');
            store.state.components.thumbnailsRegeneration = value;
        }
    };
    const regeneration = createThumbnailsRegeneration({ api, store });
    const source = fs.readFileSync(path.join(repo, 'app/src/components/ThumbnailsRegenerationPanel.vue'), 'utf8');
    const parsed = compiler.parseComponent(source);
    const compilation = compiler.compile(parsed.template.content);
    assert.deepEqual(compilation.errors, []);
    const context = { module: { exports: {} }, getThumbnailsRegeneration: () => regeneration, Intl, Date, Promise, document: { activeElement: null } };
    vm.runInNewContext(parsed.script.content.replace(/^import .*;\s*$/gm, '').replace('export default', 'module.exports ='), context);
    const component = context.module.exports;
    const i18n = new VueI18n({ locale, fallbackLocale: 'en-gb', messages: JSON.parse(JSON.stringify(languages)) });
    // The panel reads the store reactively, like Vuex state
    Vue.observable(store.state);
    const instance = new Vue({
        ...component,
        mixins: [{
            beforeCreate () {
                this.$store = store;
                this.$router = { push: route => routes.push(route) };
            }
        }],
        i18n,
        render: new Function(compilation.render),
        staticRenderFns: compilation.staticRenderFns.map(code => new Function(code))
    });

    return {
        instance,
        store,
        regeneration,
        sends,
        routes,
        emit: (channel, data) => listeners[channel](Object.assign({
            runId: store.state.components.thumbnailsRegeneration.runId
        }, data)),
        setSummary: value => {
            summary = value;
        },
        job: () => store.state.components.thumbnailsRegeneration
    };
}

function allNodes(node) {
    return node ? [node, ...(node.children || []).flatMap(allNodes), ...(node.componentOptions && node.componentOptions.children ? node.componentOptions.children.flatMap(allNodes) : [])] : [];
}

function text(node) {
    return allNodes(node).map(n => n.text || '').join('').replace(/\s+/g, ' ').trim();
}

function screen(instance) {
    const nodes = allNodes(instance._render());
    const byClass = name => nodes.filter(n => n.data && (n.data.staticClass || '').split(' ').includes(name));
    const orb = nodes.find(n => n.tag === 'progress-orb');

    return {
        title: text(byClass('progress-status-title')[0]),
        summary: text(byClass('progress-status-message')[0]),
        percent: text(byClass('progress-status-percent')[0]),
        notes: byClass('thumbnails-regeneration-notes').flatMap(node =>
            (node.children || []).filter(child => child.tag).map(text)
        ),
        buttons: nodes.filter(n => n.tag === 'p-button').map(n => ({ label: text(n), ...n.data.attrs })),
        headings: nodes.filter(n => n.tag === 'h3').map(text),
        listItems: nodes.filter(n => n.tag === 'li').map(text),
        orb: orb ? orb.data.attrs : null,
        icon: orb ? orb.data.scopedSlots.icon()[0].data.attrs.name : null
    };
}

async function ready(test) {
    await test.instance.loadSummary();
    await Promise.resolve();
}

describe('Thumbnail regeneration panel', function () {
    it('describes the images, theme and format before the first run', async function () {
        const test = setup();
        await ready(test);
        const view = screen(test.instance);

        assert.equal(view.title, 'Ready to regenerate');
        assert.equal(view.summary, 'Images: 1,280 · Theme: Reveral · Format: WebP');
        assert.deepEqual(view.notes, ['Thumbnails are replaced after the new files are ready. Original images stay unchanged.']);
        assert.deepEqual(view.buttons, []);
        assert.deepEqual({ ...test.instance.actions }, { canStart: true, isRunning: false, isCancelled: false });
        assert.equal(view.orb.phase, 'idle');
        assert.equal(view.orb.role, null);
    });

    it('explains why nothing can be regenerated and offers no action', async function () {
        for (const [summary, title] of [
            [{ status: 'no-theme' }, 'No theme selected'],
            [{ status: 'no-images', images: 0, theme: 'Reveral' }, 'No images to regenerate'],
            [{ status: 'no-responsive-images-config', theme: 'Simple' }, 'This theme doesn\'t use thumbnails']
        ]) {
            const test = setup(summary);
            await ready(test);
            const view = screen(test.instance);

            assert.equal(view.title, title);
            assert.equal(test.instance.actions.canStart, false);
        }
    });

    it('refreshes the image count when returning after a successful regeneration', async function () {
        const test = setup();
        await ready(test);
        test.regeneration.start('demo');
        test.emit(CHANNELS.progress, {
            value: 100,
            processed: 2,
            total: 2,
            image: 'posts/1/a.jpg',
            thumbnails: 6
        });
        test.emit(CHANNELS.success, {});

        assert.equal(screen(test.instance).title, 'Regeneration complete');

        for (const images of [1, 3]) {
            test.setSummary({
                status: 'ready',
                images,
                theme: 'Reveral',
                format: 'webp',
                responsiveImages: true
            });
            await ready(test);

            assert.equal(test.job().status, 'idle');
            assert.equal(screen(test.instance).title, 'Ready to regenerate');
            assert.equal(screen(test.instance).summary, `Images: ${images} · Theme: Reveral · Format: WebP`);
        }
    });

    it('keeps ongoing regeneration and its progress when returning to the panel', async function () {
        const test = setup();
        await ready(test);
        test.regeneration.start('demo');
        test.emit(CHANNELS.progress, {
            value: 50,
            processed: 1,
            total: 2,
            image: 'posts/1/a.jpg',
            thumbnails: 6
        });
        await ready(test);

        assert.equal(test.job().status, 'running');
        assert.equal(test.job().processed, 1);
        assert.equal(test.instance.actions.isRunning, true);
    });

    it('keeps a failed result available when returning to the panel', async function () {
        const test = setup();
        await ready(test);
        test.regeneration.start('demo');
        test.emit(CHANNELS.progress, {
            value: 100,
            processed: 1,
            total: 1,
            image: 'posts/1/broken.jpg',
            broken: true,
            errorMessage: 'Input file is corrupt'
        });
        test.emit(CHANNELS.success, {});
        await ready(test);

        assert.equal(test.job().status, 'done');
        assert.equal(test.instance.showProblems, true);
        assert.equal(test.job().problems.length, 1);
    });

    it('mentions gallery-only thumbnails when responsive images are off', async function () {
        const test = setup({ status: 'ready', images: 4, theme: 'Reveral', format: 'none', responsiveImages: false });
        await ready(test);
        const view = screen(test.instance);

        assert.equal(view.summary, 'Images: 4 · Theme: Reveral · Format: same as originals');
        assert.equal(view.notes.length, 2);
    });

    it('shows the progress with a single Cancel action while images are processed', async function () {
        const test = setup();
        await ready(test);
        test.regeneration.start('demo');

        let view = screen(test.instance);
        assert.equal(view.summary, 'Preparing images…');
        assert.equal(view.percent, '');
        assert.equal(view.orb.indeterminate, true);
        assert.equal(view.orb['aria-valuenow'], null);

        test.emit(CHANNELS.progress, { value: 25, processed: 1, total: 4, image: 'posts/58/hero.jpg', thumbnails: 6 });
        view = screen(test.instance);

        assert.deepEqual(test.sends, [[
            'app-site-regenerate-thumbnails',
            { name: 'demo', runId: test.job().runId }
        ]]);
        assert.equal(view.title, 'Regenerating thumbnails...');
        assert.equal(view.summary, 'Images: 1 of 4');
        assert.equal(view.percent, '25%');
        assert.deepEqual({ ...test.instance.actions }, { canStart: false, isRunning: true, isCancelled: false });
        assert.equal(view.orb.phase, 'rendering');
        assert.equal(view.icon, 'image');
        assert.equal(view.orb.progress, 25);
        assert.equal(view.orb.indeterminate, false);
        assert.equal(view.orb['aria-valuenow'], 25);
    });

    it('estimates the remaining time once the pace is known', async function () {
        const test = setup();
        await ready(test);
        test.regeneration.start('demo');
        test.job().startedAt = Date.now() - 30000;
        test.emit(CHANNELS.progress, { value: 10, processed: 10, total: 100, image: 'posts/1/a.jpg', thumbnails: 1 });

        assert.equal(screen(test.instance).summary, 'Images: 10 of 100 · about 5 min left');
    });

    it('lists the images which could not be processed and opens their log', async function () {
        const test = setup();
        await ready(test);
        test.regeneration.start('demo');
        test.emit(CHANNELS.progress, { value: 50, processed: 1, total: 2, image: 'posts/1/a.jpg', thumbnails: 6 });
        test.emit(CHANNELS.progress, { value: 100, processed: 2, total: 2, image: 'posts/1/b.jpg', thumbnails: 0, broken: true, errorMessage: 'Input file is corrupt' });
        test.emit(CHANNELS.success, { brokenFilesCount: 1 });

        const view = screen(test.instance);

        assert.equal(view.title, 'Some images couldn\'t be processed');
        assert.match(view.summary, /^Not processed: 1 · Images: 2 · Thumbnails: 6 · Time: \d+ s$/);
        assert.equal(view.orb.phase, 'warning');
        assert.equal(view.icon, 'triangle-alert');
        assert.equal(view.orb.progress, 100);
        assert.equal(view.percent, '');
        assert.deepEqual(view.headings, ['Problems (1)']);
        assert.equal(view.listItems[0], 'posts/1/b.jpg Input file is corrupt');
        assert.deepEqual(view.buttons.map(button => button.label), ['Open log viewer', 'Recently processed images']);
        assert.deepEqual({ ...test.instance.actions }, { canStart: true, isRunning: false, isCancelled: false });

        test.instance.openLogViewer();
        assert.deepEqual(JSON.parse(JSON.stringify(test.routes)), [{ path: '/site/demo/tools/log-viewer', query: { file: 'regenerate-process.log' } }]);
    });

    it('says what a stopped run leaves behind and offers to run it again', async function () {
        const test = setup();
        await ready(test);
        test.regeneration.start('demo');
        test.emit(CHANNELS.progress, { value: 32, processed: 412, total: 1280, image: 'posts/1/a.jpg', thumbnails: 6 });
        test.regeneration.stop();

        const view = screen(test.instance);

        assert.deepEqual(test.sends[1], ['app-site-abort-regenerate-thumbnails', true]);
        assert.equal(view.title, 'Regeneration cancelled');
        assert.equal(view.summary, 'Images: 412 of 1,280');
        assert.deepEqual(view.notes, ['Existing thumbnails were kept for images that were not completed. Regenerating again starts from the beginning.']);
        assert.equal(test.instance.actions.canStart, true);
        assert.equal(view.orb.phase, 'idle');
        assert.equal(view.orb.role, null);
        assert.equal(view.percent, '');
        assert.equal(test.instance.actions.isCancelled, true);
    });

    it('does not start a website while another one is being regenerated', async function () {
        const test = setup();
        await ready(test);
        test.store.state.components.thumbnailsRegeneration = Object.assign(createInitialState(), { site: 'other', status: 'running' });

        const view = screen(test.instance);

        assert.equal(view.title, 'Ready to regenerate');
        assert.equal(test.instance.actions.canStart, false);
        assert.deepEqual(view.notes, ['Thumbnails of Other website are being regenerated. You can start this website when it finishes.']);
    });

    it('starts from the header, cancels beside the orb status and returns focus for another run', async function () {
        const test = setup();
        await ready(test);
        const source = fs.readFileSync(path.join(repo, 'app/src/components/RegenerateThumbnails.vue'), 'utf8');
        const parsed = compiler.parseComponent(source);
        const compilation = compiler.compile(parsed.template.content);
        assert.deepEqual(compilation.errors, []);
        const document = { activeElement: null };
        const context = {
            module: { exports: {} },
            BackToTools: {},
            ThumbnailsRegenerationPanel: {},
            getThumbnailsRegeneration: () => test.regeneration,
            document
        };
        vm.runInNewContext(parsed.script.content.replace(/^import .*;\s*$/gm, '').replace('export default', 'module.exports ='), context);
        const page = new Vue({
            ...context.module.exports,
            i18n: test.instance.$i18n,
            render: new Function(compilation.render),
            staticRenderFns: compilation.staticRenderFns.map(code => new Function(code))
        });
        page.$store = test.store;

        function renderActions() {
            page.setActions(test.instance.actions);
            const nodes = allNodes(page._render());
            const header = nodes.find(node => node.tag === 'p-header');
            const headerButtons = allNodes(header).filter(node => node.tag === 'p-button');
            assert.equal(headerButtons.length, 2);
            const panel = nodes.find(node => node.componentOptions && node.componentOptions.tag === 'thumbnails-regeneration-panel');
            test.instance.$options._parentVnode = panel;
            const panelNodes = allNodes(test.instance._render());
            const actions = panelNodes.find(node => node.data && node.data.staticClass === 'progress-status-action');
            return {
                start: headerButtons[1],
                cancel: allNodes(actions).filter(node => node.tag === 'p-button')
            };
        }

        let buttons = renderActions();
        assert.equal(text(buttons.start), 'Regenerate');
        assert.equal(buttons.start.data.attrs.disabled, false);
        assert.deepEqual(buttons.cancel, []);
        buttons.start.data.attrs.onClick();
        await Vue.nextTick();
        buttons = renderActions();
        assert.equal(buttons.start.data.attrs.disabled, true);
        assert.deepEqual(buttons.cancel.map(text), ['Cancel']);
        assert.equal(buttons.cancel[0].data.attrs.appearance, 'clean-muted');
        assert.equal(buttons.cancel[0].data.attrs.size, 'small');
        assert.equal(test.job().status, 'running');

        buttons.cancel[0].data.attrs.onClick();
        await Vue.nextTick();
        buttons = renderActions();
        assert.equal(text(buttons.start), 'Regenerate again');
        assert.equal(buttons.start.data.attrs.disabled, false);
        assert.deepEqual(buttons.cancel, []);
        assert.equal(test.job().status, 'stopped');

        buttons.start.data.attrs.onClick();
        assert.equal(test.job().status, 'running');
        assert.equal(test.job().processed, 0);
        test.regeneration.stop();

        // Starting disables the header action; cancelling removes the local action.
        const focused = [];
        page.$refs.startButton = { $el: { focus: () => focused.push('start') } };
        page.$refs.stopButton = { $el: { focus: () => focused.push('cancel') } };
        page.actions = { canStart: true, isRunning: false, isCancelled: true };
        document.activeElement = page.$refs.startButton.$el;
        page.setActions({ canStart: false, isRunning: true, isCancelled: false });
        await Vue.nextTick();
        document.activeElement = page.$refs.stopButton.$el;
        page.setActions({ canStart: true, isRunning: false, isCancelled: true });
        await Vue.nextTick();
        assert.deepEqual(focused, ['cancel', 'start']);
    });

    it('shows a completed orb after success and a static error icon after failure', async function () {
        const test = setup();
        await ready(test);
        test.regeneration.start('demo');
        test.emit(CHANNELS.progress, { value: 100, processed: 1, total: 1, thumbnails: 2 });
        test.emit(CHANNELS.success, {});
        let view = screen(test.instance);
        assert.equal(view.orb.phase, 'success');
        assert.equal(view.icon, 'check');
        assert.equal(view.orb.progress, 100);
        assert.equal(view.orb.indeterminate, false);
        assert.equal(view.percent, '');

        test.regeneration.start('demo');
        test.emit(CHANNELS.error, { message: 'Unable to start the worker' });
        view = screen(test.instance);
        assert.equal(view.orb.phase, 'error');
        assert.equal(view.icon, 'triangle-alert');
        assert.equal(view.orb.role, null);
        assert.equal(view.percent, '');
        assert.equal(test.instance.actions.canStart, true);
    });

    it('has every panel text in all bundled languages', function () {
        const keys = Object.keys(languages['en-gb'].tools.thumbnails);

        for (const locale of ['pl', 'de']) {
            assert.deepEqual(Object.keys(languages[locale].tools.thumbnails).sort(), keys.slice().sort(), locale);
        }

        const source = fs.readFileSync(path.join(repo, 'app/src/components/ThumbnailsRegenerationPanel.vue'), 'utf8');
        const used = [...source.matchAll(/'tools\.thumbnails\.([a-zA-Z]+)'/g)].map(match => match[1]);

        for (const key of used) {
            assert.ok(keys.includes(key), key);
        }
    });

    it('formats numbers and times in the language of the app', async function () {
        const test = setup(undefined, 'pl');
        await ready(test);

        // Polish groups digits only from five-digit numbers
        assert.equal(screen(test.instance).summary, 'Obrazy: 1280 · Motyw: Reveral · Format: WebP');
        assert.equal(test.instance.formatNumber(12800).replace(/\s/g, ' '), '12 800');
        assert.equal(test.instance.formatDuration(134000), '2 min 14 s');
    });
});
