const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function fixture() {
    const context = { module: { exports: {} } };
    const source = fs.readFileSync(path.join(__dirname, '../sidebar-keyboard.js'), 'utf8');
    vm.runInNewContext(source.replace('export default', 'module.exports ='), context);
    const directive = context.module.exports;
    const document = { body: {}, activeElement: null };
    const listeners = new Map();
    const pending = [];
    let closed = 0;
    const control = (inside = false, inert = false) => ({
        inside,
        isConnected: true,
        closest: selector => selector === '[inert]' && inert ? {} : null,
        getClientRects: () => [1],
        focus() {
            document.activeElement = this;
        }
    });
    const trigger = control();
    const hiddenInput = control(true, true);
    const input = control(true);
    const element = {
        ownerDocument: document,
        parentElement: { isConnected: true },
        isConnected: true,
        contains: target => !!target.inside,
        querySelectorAll: () => [hiddenInput, input],
        addEventListener: (name, callback) => listeners.set(name, callback),
        removeEventListener: name => listeners.delete(name)
    };
    const vnode = { context: { $nextTick: callback => pending.push(callback) } };
    const binding = { value: { key: 0, close: () => closed++ } };
    document.activeElement = trigger;
    const flush = () => {
        while (pending.length) {
            pending.shift()();
        }
    };
    const key = (name, extra = {}) => {
        const event = {
            key: name,
            preventDefault() {
                this.defaultPrevented = true;
            },
            stopPropagation() {},
            ...extra
        };
        listeners.get('keydown')(event);
        return event;
    };
    return {
        directive,
        document,
        element,
        vnode,
        binding,
        trigger,
        input,
        listeners,
        control,
        flush,
        key,
        closed: () => closed,
        mount() {
            directive.inserted(element, binding, vnode);
            flush();
        },
        unmount() {
            directive.unbind(element, binding, vnode);
            flush();
        }
    };
}

describe('Nonmodal sidebar keyboard navigation', () => {
    it('focuses the first visible editable field and restores the opener after Escape', () => {
        const f = fixture();
        f.mount();
        assert.equal(f.document.activeElement, f.input);
        assert.equal(f.key('Escape').defaultPrevented, true);
        assert.equal(f.closed(), 1);
        f.unmount();
        assert.equal(f.document.activeElement, f.trigger);
        assert.equal(f.listeners.size, 0);
    });

    it('retains an explicit opener when the menu has already closed before insertion', () => {
        const f = fixture();
        f.binding.value.trigger = f.trigger;
        f.document.activeElement = f.document.body;
        f.mount();
        assert.equal(f.document.activeElement, f.input);
        f.unmount();
        assert.equal(f.document.activeElement, f.trigger);
    });

    it('updates the opener when the same record is opened through another control', () => {
        const f = fixture();
        f.binding.value.trigger = f.trigger;
        f.mount();
        const nextTrigger = f.control();
        f.binding.value.trigger = nextTrigger;
        f.directive.componentUpdated(f.element, f.binding, f.vnode);
        f.flush();
        f.unmount();
        assert.equal(f.document.activeElement, nextTrigger);
    });

    it('leaves Tab native and respects Escape consumed by nested controls or composition', () => {
        const f = fixture();
        f.mount();
        assert.equal(f.key('Tab').defaultPrevented, undefined);
        f.key('Escape', { defaultPrevented: true });
        f.key('Escape', { isComposing: true });
        assert.equal(f.closed(), 0);
        f.unmount();
    });

    it('does not steal focus from an outside control or a newly opened route', () => {
        for (const routeChanged of [false, true]) {
            const f = fixture();
            f.mount();
            const outside = f.control();
            f.document.activeElement = outside;
            f.element.parentElement.isConnected = !routeChanged;
            f.unmount();
            assert.equal(f.document.activeElement, outside);
        }
    });

    it('remembers the new opener when switching records in an existing panel', () => {
        const f = fixture();
        f.mount();
        const nextTrigger = f.control();
        f.document.activeElement = nextTrigger;
        f.binding.value.key = 42;
        f.directive.componentUpdated(f.element, f.binding, f.vnode);
        f.flush();
        assert.equal(f.document.activeElement, f.input);
        f.unmount();
        assert.equal(f.document.activeElement, nextTrigger);
    });

    it('does not refocus the panel during ordinary input updates', () => {
        const f = fixture();
        f.mount();
        const nextInput = f.control(true);
        f.document.activeElement = nextInput;
        f.directive.componentUpdated(f.element, f.binding, f.vnode);
        f.flush();
        assert.equal(f.document.activeElement, nextInput);
        f.unmount();
    });

    it('restores an action menu trigger instead of its removed menu item', () => {
        const f = fixture();
        const menuItem = f.control();
        menuItem.closest = () => ({ querySelector: () => f.trigger });
        f.document.activeElement = menuItem;
        f.mount();
        menuItem.isConnected = false;
        f.unmount();
        assert.equal(f.document.activeElement, f.trigger);
    });

    it('cancels pending focus when the sidebar closes before the next render', () => {
        const f = fixture();
        f.directive.inserted(f.element, f.binding, f.vnode);
        f.directive.unbind(f.element, f.binding, f.vnode);
        f.flush();
        assert.equal(f.document.activeElement, f.trigger);
    });
});
