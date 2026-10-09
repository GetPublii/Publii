/* Render the shared orb and preview states with Vue, without opening user data. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');

const repo = path.resolve(__dirname, '../../../..');
const appRequire = createRequire(path.join(repo, 'app/package.json'));
const Vue = appRequire('vue');
const compiler = appRequire('vue-template-compiler');
const VueI18n = appRequire('vue-i18n');
Vue.use(VueI18n);

function loadComponent(relativePath, bindings = {}) {
    const source = fs.readFileSync(path.join(repo, 'app/src/components', relativePath), 'utf8');
    const parsed = compiler.parseComponent(source);
    const compiled = compiler.compile(parsed.template.content);
    assert.deepEqual(compiled.errors, []);
    const context = {
        module: { exports: {} },
        ...bindings
    };
    vm.runInNewContext(parsed.script.content.replace(/^import .*;\s*$/gm, '').replace('export default', 'module.exports ='), context);
    return {
        ...context.module.exports,
        render: new Function(compiled.render),
        staticRenderFns: compiled.staticRenderFns.map(code => new Function(code))
    };
}

function nodes(vnode) {
    return vnode ? [vnode, ...(vnode.children || []).flatMap(nodes)] : [];
}

describe('Progress feedback', function () {
    it('keeps the synchronization appearance as default and opts compact panels into flat', function () {
        const component = loadComponent('basic-elements/ProgressOrb.vue');
        const standard = new Vue({
            ...component,
            propsData: { phase: 'uploading', progress: 32 }
        });
        const flat = new Vue({
            ...component,
            propsData: { appearance: 'flat', phase: 'rendering', progress: 32 }
        });
        assert.equal(standard.cssClasses['is-flat'], false);
        assert.equal(flat.cssClasses['is-flat'], true);
        assert.equal(standard.ringStyle.strokeDashoffset, flat.ringStyle.strokeDashoffset);
        assert.ok(parseFloat(standard.ringStyle.strokeDashoffset) > 0);
        flat.indeterminate = true;
        assert.equal(flat.ringStyle, null);
    });

    for (const mode of ['full', 'post', 'homepage', 'tag', 'author']) {
        it(`shows appropriate progress and completion for ${mode} preview`, function () {
            const timers = [];
            const component = loadComponent('RenderingPopup.vue', {
                Utils: {},
                setTimeout: callback => timers.push(callback)
            });
            const instance = new Vue({
                ...component,
                methods: {
                    ...component.methods,
                    $t: key => key
                }
            });
            instance.isVisible = true;
            const partial = mode !== 'full';

            if (partial) {
                const property = 'is' + mode[0].toUpperCase() + mode.slice(1) + 'Preview';
                instance[property] = true;
                instance.previewTitle = 'Preview title';
            }

            instance.progress = 37;
            let rendered = nodes(instance._render());
            let orb = rendered.find(node => node.tag === 'progress-orb');
            let percent = rendered.find(node => node.data && node.data.staticClass === 'progress-status-percent');
            assert.equal(orb.data.attrs.indeterminate, partial);
            assert.equal(orb.data.attrs['aria-valuenow'], partial ? null : 37);
            assert.equal(Boolean(percent), !partial);
            assert.equal(rendered.some(node => node.tag === 'progress-bar'), false);

            instance.renderingProgress({ progress: 100, message: 'Done' });
            rendered = nodes(instance._render());
            orb = rendered.find(node => node.tag === 'progress-orb');
            assert.equal(orb.data.attrs.phase, 'success');
            assert.equal(orb.data.attrs.indeterminate, false);
            assert.equal(orb.data.attrs['aria-valuenow'], 100);
            assert.equal(orb.data.attrs['aria-valuetext'], 'rendering.previewReady');
            assert.equal(instance.isVisible, true);
            timers[0]();
            assert.equal(instance.isVisible, false);
        });
    }
});


describe('Synchronization operation counter', function () {
    function createProgress(propsData = {}) {
        const component = loadComponent('SyncProgress.vue');
        return new Vue({
            ...component,
            propsData: {
                phase: 'uploading',
                progress: 57,
                operations: [5450, 10000],
                ...propsData
            },
            i18n: new VueI18n({ locale: 'en-GB' }),
            methods: {
                $t: key => ({
                    'ui.of': 'of',
                    'sync.operationsDone': 'operations done',
                    'sync.uploadingWebsite': 'Uploading website'
                })[key] || key
            }
        });
    }

    it('uses the same operation ratio for the counter, fill and accessible value', function () {
        const progress = createProgress();
        const rendered = nodes(progress._render());
        const track = rendered.find(node => node.data && node.data.attrs && node.data.attrs.role === 'progressbar');
        const fill = rendered.find(node => node.data && node.data.staticClass === 'sync-progress-fill');
        assert.equal(progress.formattedCompleted, '5,450');
        assert.equal(progress.formattedTotal, '10,000');
        assert.ok(Math.abs(track.data.attrs['aria-valuenow'] - 54.5) < 0.0001);
        assert.equal(parseFloat(fill.data.style.width), track.data.attrs['aria-valuenow']);
        assert.equal(track.data.attrs['aria-valuetext'], '5,450 of 10,000 operations done');
    });

    it('falls back to the provider percentage when counts are missing or invalid', function () {
        for (const operations of [null, [], [0, 0], [-1, 10], [11, 10], [1.5, 10], ['1', 10]]) {
            const progress = createProgress({ operations });
            assert.equal(progress.hasOperations, false);
            assert.equal(progress.clampedProgress, 57);
        }
    });

    it('does not reuse upload counts during preparation, connection, export or completion', function () {
        for (const phase of ['idle', 'rendering', 'connecting', 'success', 'warning', 'error']) {
            assert.equal(createProgress({ phase }).hasOperations, false);
        }

        const manual = createProgress({ isManual: true, indeterminate: true });
        assert.equal(manual.hasOperations, false);
        assert.equal(manual.showsPercentage, false);
        const track = nodes(manual._render()).find(node => node.data && node.data.attrs && node.data.attrs.role === 'progressbar');
        assert.equal(track.data.attrs['aria-valuenow'], null);
    });

    it('keeps a provider status message and avoids repeating the operation numbers', function () {
        const progress = createProgress({ message: 'Uploading website (5450 of 10000 operations done)' });
        assert.equal(progress.detail, '');
        progress.message = 'Saving deployment metadata';
        assert.equal(progress.detail, 'Saving deployment metadata');
    });
});
