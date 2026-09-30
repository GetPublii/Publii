const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const Vue = require('vue');
const compiler = require('vue-template-compiler');

function loadComponent(name, bindings = {}) {
    const source = fs.readFileSync(path.join(__dirname, '..', name + '.vue'), 'utf8');
    const parsed = compiler.parseComponent(source);
    const context = {
        module: { exports: {} },
        Vue,
        SidebarScrollFade: {},
        Tooltip: {},
        Utils: {
            debouncedFunction: callback => callback
        },
        ...bindings
    };
    vm.runInNewContext(
        parsed.script.content.replace(/^import .*;\s*$/gm, '').replace('export default', 'module.exports ='),
        context
    );
    return { options: context.module.exports, template: parsed.template && parsed.template.content };
}

function renderOptions(template) {
    const compiled = compiler.compile(template);
    assert.deepEqual(compiled.errors, []);
    return {
        render: new Function(compiled.render),
        staticRenderFns: compiled.staticRenderFns.map(code => new Function(code))
    };
}

function buttonFixture() {
    const timers = new Map();
    let timerID = 0;
    let now = 0;
    const component = loadComponent('basic-elements/Button', {
        Date: { now: () => now },
        setTimeout: (callback, delay) => {
            const id = ++timerID;
            timers.set(id, { callback, delay });
            return id;
        },
        clearTimeout: id => timers.delete(id)
    });
    const button = new Vue({
        ...component.options,
        ...renderOptions(component.template),
        propsData: { icon: 'refresh' }
    });
    button.$slots.default = [button.$createElement('span', 'Refresh')];
    return {
        button,
        timers,
        advance: milliseconds => {
            now += milliseconds;
        }
    };
}

describe('Refresh icon feedback', () => {
    it('keeps the label and unlocks after work while the icon finishes spinning', async () => {
        const { button, timers } = buttonFixture();
        button.disabled = true;
        button.iconLoading = true;
        await Vue.nextTick();
        assert.equal(button.isIconSpinning, true);
        assert.equal(button._render().data.attrs['aria-busy'], 'true');
        assert.ok(button._render().children.some(node => node.tag === 'span'));
        const firstIcon = button._render().children.find(node => node.tag === 'icon');

        button.disabled = false;
        button.iconLoading = false;
        await Vue.nextTick();
        assert.equal(button._render().data.attrs.disabled, false);
        assert.equal(button._render().data.attrs['aria-busy'], null);
        assert.equal(button.isIconSpinning, true);
        assert.equal(Array.from(timers.values())[0].delay, 800);

        button.iconLoading = true;
        await Vue.nextTick();
        assert.equal(timers.size, 0);
        const nextIcon = button._render().children.find(node => node.tag === 'icon');
        assert.notEqual(nextIcon.key, firstIcon.key);
        button.iconLoading = false;
        await Vue.nextTick();
        Array.from(timers.values())[0].callback();
        assert.equal(button.isIconSpinning, false);
        button.$destroy();
    });

    it('keeps spinning during a long operation without adding another full turn', async () => {
        const { button, timers, advance } = buttonFixture();
        button.iconLoading = true;
        await Vue.nextTick();
        advance(1200);
        assert.equal(button.isIconSpinning, true);
        assert.equal(timers.size, 0);
        button.iconLoading = false;
        await Vue.nextTick();
        assert.equal(Array.from(timers.values())[0].delay, 0);
        Array.from(timers.values())[0].callback();
        assert.equal(button.isIconSpinning, false);
        button.$destroy();
    });

    it('clears an unfinished animation timer when the button is destroyed', async () => {
        const { button, timers } = buttonFixture();
        button.iconLoading = true;
        await Vue.nextTick();
        button.iconLoading = false;
        await Vue.nextTick();
        assert.equal(timers.size, 1);
        button.$destroy();
        assert.equal(timers.size, 0);
    });
});

function slugFixture(name) {
    const requests = [];
    const pending = [];
    const mainProcessAPI = {
        invoke: (...args) => {
            requests.push(args);
            return new Promise((resolve, reject) => pending.push({ resolve, reject }));
        }
    };
    const component = loadComponent(name, { mainProcessAPI });
    const buttonTemplate = component.template.match(/<p-button\s[^>]*:onClick="updateSlug"[^>]*>[\s\S]*?<\/p-button>/)[0];
    const instance = new Vue({
        data: component.options.data,
        methods: {
            ...component.options.methods,
            $t: key => key
        },
        ...renderOptions(buttonTemplate)
    });
    const data = name === 'AuthorForm'
        ? instance.authorData
        : name === 'TagForm'
            ? instance.tagData
            : { title: 'New title', slug: 'old-slug' };
    const slugField = name === 'AuthorForm' ? 'username' : 'slug';
    data.name = 'New title';
    data[slugField] = 'old-slug';

    if (name === 'post-editor/Sidebar') {
        const common = loadComponent('mixins/PostEditorsCommon', { mainProcessAPI });
        instance.$parent = new Vue({
            data () {
                return {
                    postData: data,
                    isEdit: true,
                    postSlugEdited: true
                };
            },
            methods: {
                updateSlug: common.options.methods.updateSlug
            }
        });
    }

    return { instance, requests, pending, data, slugField };
}

describe('Slug refresh buttons', () => {
    for (const name of ['AuthorForm', 'TagForm', 'post-editor/Sidebar']) {
        it(name + ': waits for the real slug, blocks duplicate clicks and releases on failure', async () => {
            const { instance, requests, pending, data, slugField } = slugFixture(name);
            const update = instance.updateSlug();
            assert.equal(instance._render().data.attrs['icon-loading'], true);
            assert.equal(instance._render().data.attrs.disabled, true);
            await instance.updateSlug();
            assert.deepEqual(requests, [['app-main-process-create-slug', 'New title']]);
            assert.equal(data[slugField], 'old-slug');
            pending[0].resolve('new-title');
            await update;
            assert.equal(data[slugField], 'new-title');
            assert.equal(instance._render().data.attrs['icon-loading'], false);
            assert.equal(instance._render().data.attrs.disabled, false);

            const failedUpdate = instance.updateSlug();
            const rejection = assert.rejects(failedUpdate, /Unavailable/);
            pending[1].reject(new Error('Unavailable'));
            await rejection;
            assert.equal(data[slugField], 'new-title');
            assert.equal(instance.isUpdatingSlug, false);
            instance.$destroy();
        });
    }

    for (const name of ['AuthorForm', 'TagForm']) {
        it(name + ': does not animate or request a slug for an empty name', async () => {
            const { instance, requests, data } = slugFixture(name);
            data.name = '   ';
            await instance.updateSlug();
            assert.equal(requests.length, 0);
            assert.equal(instance.isUpdatingSlug, false);
            instance.$destroy();
        });
    }
});
