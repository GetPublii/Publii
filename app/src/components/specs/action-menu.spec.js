const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const compiler = require('vue-template-compiler');
const Vue = require('vue');

const source = fs.readFileSync(path.join(__dirname, '../basic-elements/ActionMenu.vue'), 'utf8');
const parsed = compiler.parseComponent(source);
const compiled = compiler.compile(parsed.template.content);
const context = { module: { exports: {} }, Tooltip: {} };
vm.runInNewContext(
    parsed.script.content.replace(/^import .*;\s*$/gm, '').replace('export default', 'module.exports ='),
    context
);

function menu(items) {
    const instance = new Vue({
        ...context.module.exports,
        propsData: { items, label: 'More filters', tooltip: 'More filters' },
        render: new Function(compiled.render),
        staticRenderFns: compiled.staticRenderFns.map(code => new Function(code))
    });
    instance.isOpen = true;
    return instance;
}

function entries(instance) {
    const nodes = node => [node, ...(node.children || []).flatMap(nodes)];
    return nodes(instance._render()).filter(node =>
        node.data && node.data.attrs && ['menuitem', 'menuitemradio'].includes(node.data.attrs.role)
    );
}

describe('ActionMenu optional radio choices', () => {
    it('announces the selected choice without changing ordinary actions', () => {
        assert.deepEqual(compiled.errors, []);
        const instance = menu([
            { type: 'radio', label: 'Updates', checked: true },
            { type: 'radio', label: 'Incompatible', checked: false },
            { label: 'Settings' }
        ]);
        const rendered = entries(instance);
        assert.deepEqual(rendered.map(node => node.data.attrs.role), ['menuitemradio', 'menuitemradio', 'menuitem']);
        assert.deepEqual(rendered.map(node => node.data.attrs['aria-checked']), ['true', 'false', null]);
    });

    it('applies a radio choice and restores the trigger after keyboard activation', () => {
        let selected = false;
        let closed = false;
        let focused = false;
        const instance = menu([{
            type: 'radio',
            label: 'Updates',
            checked: false,
            onClick () {
                selected = true;
            }
        }]);
        instance.close = () => { closed = true; };
        instance.focusTrigger = () => { focused = true; };
        entries(instance)[0].data.on.click({ detail: 0, stopPropagation () {} });
        assert.equal(selected, true);
        assert.equal(closed, true);
        assert.equal(focused, true);
    });
});

describe('ActionMenu custom trigger', () => {
    it('provides the same state, semantics and handlers to a custom button', () => {
        const instance = menu([{ label: 'Publish' }]);
        let scope;
        instance.$scopedSlots = {
            trigger (props) {
                scope = props;
                return [instance.$createElement('button', { attrs: props.attrs }, 'More')];
            }
        };

        instance._render();

        assert.equal(scope.isOpen, true);
        assert.equal(scope.attrs['aria-haspopup'], 'menu');
        assert.equal(scope.attrs['aria-expanded'], 'true');
        assert.equal(scope.attrs['aria-controls'], instance.menuID);
        assert.equal(scope.toggle, instance.toggle);
        assert.equal(scope.keydown, instance.handleTriggerKeydown);

        instance.isOpen = false;
        instance.disabled = true;
        instance._render();

        assert.equal(scope.isOpen, false);
        assert.equal(scope.attrs['aria-expanded'], 'false');
        assert.equal(scope.attrs['aria-controls'], null);
        assert.equal(scope.attrs.disabled, true);
    });

    it('restores focus to the slotted button and preserves the default trigger', async () => {
        const instance = menu([]);
        let customFocus = 0;
        let defaultFocus = 0;
        const customTrigger = {
            isConnected: true,
            focus () {
                customFocus += 1;
            }
        };
        instance.$el = {
            querySelector (selector) {
                assert.equal(selector, '[data-action-menu-trigger]');
                return customTrigger;
            }
        };
        instance.focusTrigger();
        await Vue.nextTick();
        assert.equal(customFocus, 1);

        instance.$refs.trigger = {
            isConnected: true,
            focus () {
                defaultFocus += 1;
            }
        };
        instance.focusTrigger();
        await Vue.nextTick();
        assert.equal(defaultFocus, 1);
        assert.equal(customFocus, 1);
    });
});
