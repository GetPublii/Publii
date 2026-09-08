const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const compiler = require('vue-template-compiler');

const sourceRoot = path.resolve(__dirname, '../..');
const directiveSource = fs.readFileSync(path.join(sourceRoot, 'helpers/tooltip.js'), 'utf8');
const component = compiler.parseComponent(fs.readFileSync(path.join(sourceRoot, 'components/basic-elements/Tooltip.vue'), 'utf8'));

function element () {
    const attributes = new Map();
    const listeners = new Map();

    return {
        attributes,
        listeners,
        children: [],
        isConnected: true,
        focusVisible: true,
        rect: { left: 100, top: 100, bottom: 120, width: 20, height: 20 },
        addEventListener (type, handler) {
            if (!listeners.has(type)) {
                listeners.set(type, new Set());
            }

            listeners.get(type).add(handler);
        },
        removeEventListener (type, handler) {
            if (listeners.has(type)) {
                listeners.get(type).delete(handler);
            }
        },
        fire (type, event = {}) {
            for (const handler of listeners.get(type) || []) {
                handler({ pointerType: 'mouse', buttons: 0, ...event });
            }
        },
        getAttribute: name => attributes.get(name) || null,
        setAttribute: (name, value) => attributes.set(name, value),
        removeAttribute: name => attributes.delete(name),
        matches () {
            return this.focusVisible;
        },
        appendChild (child) {
            this.children.push(child);
        },
        remove () {
            this.isConnected = false;
        },
        getBoundingClientRect () {
            return this.rect;
        }
    };
}

function setup () {
    let now = 0;
    let nextTimer = 0;
    const timers = new Map();
    const views = [];
    const document = element();
    document.body = element();
    document.documentElement = { clientWidth: 800, clientHeight: 600 };
    document.createElement = element;
    document.getElementById = () => null;
    const window = element();
    const context = {
        module: { exports: {} },
        document,
        window,
        Date: { now: () => now },
        setTimeout (callback, delay) {
            const id = ++nextTimer;
            timers.set(id, { callback, time: now + delay });
            return id;
        },
        clearTimeout: id => timers.delete(id)
    };

    vm.runInNewContext(component.script.content.replace('export default', 'module.exports ='), context);
    context.Tooltip = context.module.exports;
    context.Vue = {
        extend (options) {
            return class {
                constructor () {
                    Object.assign(this, options.data(), options.methods);
                    this.$el = element();
                    this.$el.rect = { width: 180, height: 30 };
                    this.events = {};
                    views.push(this);
                }
                $mount () {
                    return this;
                }
                $on (name, callback) {
                    this.events[name] = callback;
                }
                $nextTick (callback) {
                    callback();
                }
                $destroy () {
                    this.destroyed = true;
                }
            };
        }
    };

    const executableDirective = directiveSource
        .replace(/^import .*;\n/gm, '')
        .replace('export function setTooltipsEnabled', 'function setTooltipsEnabled')
        .replace('export default', 'module.exports =');
    vm.runInNewContext(executableDirective, context);
    const directive = context.module.exports;

    return {
        directive,
        setTooltipsEnabled: context.setTooltipsEnabled,
        views,
        document,
        window,
        timers,
        bind (value = 'Hidden', modifiers = {}, target = element()) {
            directive.inserted(target, { value, modifiers });
            return target;
        },
        advance (duration) {
            const end = now + duration;

            while (true) {
                const next = Array.from(timers.entries())
                    .filter(([, timer]) => timer.time <= end)
                    .sort((a, b) => a[1].time - b[1].time)[0];

                if (!next) {
                    break;
                }

                now = next[1].time;
                timers.delete(next[0]);
                next[1].callback();
            }

            now = end;
        }
    };
}

describe('Tooltip pilot', () => {
    it('compiles the shared tooltip and Posts templates', () => {
        assert.deepEqual(compiler.compile(component.template.content).errors, []);
        const posts = compiler.parseComponent(fs.readFileSync(path.join(sourceRoot, 'components/Posts.vue'), 'utf8'));
        assert.deepEqual(compiler.compile(posts.template.content).errors, []);
    });

    it('suppresses hover and keyboard tooltips while retaining accessible descriptions', () => {
        const test = setup();
        test.setTooltipsEnabled(false);
        const target = test.bind('Delete theme');
        target.fire('pointerenter');
        target.fire('focus');
        test.advance(1000);

        assert.equal(test.views.length, 0);
        assert.equal(test.timers.size, 0);
        assert.ok(target.getAttribute('aria-describedby'));
        assert.equal(test.document.body.children[0].textContent, 'Delete theme');

        test.setTooltipsEnabled(true);
        target.fire('blur');
        target.fire('focus');
        test.advance(0);
        assert.equal(test.views[0].visible, true);
    });

    it('cancels pending and visible tooltips when the preference is disabled', () => {
        for (const delay of [100, 500]) {
            const test = setup();
            const target = test.bind();
            target.fire('pointerenter');
            test.advance(delay);
            test.setTooltipsEnabled(false);
            test.advance(1000);

            assert.equal(test.timers.size, 0);
            assert.ok(test.views.every(view => !view.visible));

            test.directive.componentUpdated(target, { value: 'Updated', modifiers: {} });
            target.fire('focus');
            test.advance(1000);
            assert.ok(test.views.every(view => !view.visible));
            assert.equal(test.document.body.children[0].textContent, 'Updated');

            test.setTooltipsEnabled(true);
            target.fire('pointerleave');
            target.fire('pointerenter');
            test.advance(500);
            assert.equal(test.views[0].visible, true);
        }
    });

    it('keeps tooltips enabled for configurations without the new preference', () => {
        const test = setup();
        test.setTooltipsEnabled(undefined);
        test.bind().fire('pointerenter');
        test.advance(500);
        assert.equal(test.views[0].visible, true);
    });

    it('delays the first hover and reuses one view for nearby targets', () => {
        const test = setup();
        const first = test.bind('Hidden');
        const second = test.bind('Featured');
        first.fire('pointerenter');
        test.advance(499);
        assert.equal(test.views.length, 0);
        test.advance(1);
        assert.equal(test.views[0].text, 'Hidden');
        first.fire('pointerleave');
        second.fire('pointerenter');
        test.advance(100);
        assert.equal(test.views.length, 1);
        assert.equal(test.views[0].text, 'Featured');
        assert.equal(test.views[0].visible, true);
    });

    it('updates both lines and clears the title when reusing the view for plain text', () => {
        const test = setup();
        const target = test.bind({ title: 'Open application menu', text: 'You have 1 notification' });
        assert.equal(test.document.body.children[0].textContent, 'Open application menu\nYou have 1 notification');
        target.fire('pointerenter');
        test.advance(500);
        assert.equal(test.views[0].title, 'Open application menu');
        assert.equal(test.views[0].text, 'You have 1 notification');

        test.directive.componentUpdated(target, {
            value: { title: 'Menu aplikacji', text: 'Masz 2 powiadomienia' },
            modifiers: {}
        });
        assert.equal(test.views[0].title, 'Menu aplikacji');
        assert.equal(test.views[0].text, 'Masz 2 powiadomienia');
        assert.equal(test.document.body.children[0].textContent, 'Menu aplikacji\nMasz 2 powiadomienia');

        test.bind('Delete theme').fire('pointerenter');
        test.advance(100);
        assert.equal(test.views[0].title, '');
        assert.equal(test.views[0].text, 'Delete theme');
    });

    it('does not show a tooltip after briefly passing over an icon', () => {
        const test = setup();
        const target = test.bind();
        target.fire('pointerenter');
        test.advance(80);
        target.fire('pointerleave');
        test.advance(1000);
        assert.equal(test.views.length, 0);
    });

    it('keeps the tooltip readable while the pointer is over its content', () => {
        const test = setup();
        const target = test.bind();
        target.fire('pointerenter');
        test.advance(500);
        target.fire('pointerleave');
        test.views[0].events.enter();
        test.advance(10000);
        assert.equal(test.views[0].visible, true);
        test.views[0].events.leave();
        test.advance(120);
        assert.equal(test.views[0].visible, false);
    });

    it('preserves keyboard focus and dismisses without reopening on updates', () => {
        const test = setup();
        const target = test.bind('Hidden\nExcluded', { focus: true });
        target.fire('pointerenter');
        test.advance(500);
        assert.equal(test.views.length, 0);
        target.fire('focus');
        test.advance(0);
        assert.equal(test.views[0].visible, true);
        test.document.fire('keydown', { key: 'Escape' });
        test.directive.componentUpdated(target, { value: 'Hidden\nExcluded', modifiers: { focus: true } });
        test.advance(1000);
        assert.equal(test.views[0].visible, false);
        assert.ok(target.getAttribute('aria-describedby'));
    });

    it('keeps descriptions available before focus and preserves other ARIA references', () => {
        const test = setup();
        const target = element();
        target.setAttribute('aria-describedby', 'existing-help');
        test.bind('Hidden', {}, target);
        assert.match(target.getAttribute('aria-describedby'), /^existing-help app-tooltip-description-/);
        assert.equal(test.document.body.children[0].textContent, 'Hidden');
        test.directive.componentUpdated(target, { value: 'Excluded', modifiers: {} });
        assert.equal(test.document.body.children[0].textContent, 'Excluded');
        test.directive.unbind(target);
        assert.equal(target.getAttribute('aria-describedby'), 'existing-help');
        assert.equal(test.document.body.children[0].isConnected, false);
    });

    it('anchors radio focus to its visible label and cleans up bubbling focus listeners', () => {
        const test = setup();
        const label = test.bind({ text: 'Indigo', describe: false }, { focusin: true });
        const radio = element();
        radio.focusVisible = false;
        label.fire('focusin', { target: radio });
        test.advance(500);
        assert.equal(test.views.length, 0);

        radio.focusVisible = true;
        label.fire('focusin', { target: radio });
        test.advance(0);
        assert.equal(test.views[0].visible, true);
        assert.equal(test.views[0].text, 'Indigo');
        assert.equal(label.getAttribute('aria-describedby'), null);
        label.fire('focusout', { relatedTarget: null });
        test.advance(120);
        assert.equal(test.views[0].visible, false);
        test.directive.unbind(label);
        assert.equal(label.listeners.get('focusin').size, 0);
        assert.equal(label.listeners.get('focusout').size, 0);
    });

    it('does not add ARIA descriptions or tab stops to decorative status icons', () => {
        const test = setup();
        const target = test.bind('Hidden', { hover: true });
        assert.equal(target.getAttribute('aria-describedby'), null);
        assert.equal(target.getAttribute('tabindex'), null);
        target.fire('focus');
        test.advance(1000);
        assert.equal(test.views.length, 0);
    });

    it('cancels pending tooltips on scrolling, activation and window changes', () => {
        for (const [owner, type] of [
            ['document', 'scroll'],
            ['document', 'pointerdown'],
            ['document', 'click'],
            ['window', 'resize'],
            ['window', 'blur']
        ]) {
            const test = setup();
            test.bind().fire('pointerenter');
            test[owner].fire(type);
            test.advance(1000);
            assert.equal(test.views.length, 0, type);
        }
    });

    it('suppresses tooltips for open menus, touch and dragging', () => {
        const test = setup();
        test.bind({ text: 'More', disabled: true }).fire('pointerenter');
        test.bind().fire('pointerenter', { pointerType: 'touch' });
        test.bind().fire('pointerenter', { buttons: 1 });
        test.advance(1000);
        assert.equal(test.views.length, 0);
    });

    it('updates visible translations and hides a tooltip when its action opens', () => {
        const test = setup();
        const target = test.bind('More');
        target.fire('pointerenter');
        test.advance(500);
        test.directive.componentUpdated(target, { value: 'Więcej', modifiers: {} });
        assert.equal(test.views[0].text, 'Więcej');
        test.directive.componentUpdated(target, { value: { text: 'Więcej', disabled: true }, modifiers: {} });
        assert.equal(test.views[0].visible, false);
        assert.equal(target.getAttribute('aria-describedby'), null);
    });

    it('cleans up the host, timers and listeners when leaving the pilot screen', () => {
        const test = setup();
        const target = test.bind();
        target.fire('pointerenter');
        test.advance(500);
        test.directive.unbind(target);
        assert.equal(test.views[0].destroyed, true);
        assert.equal(test.views[0].$el.isConnected, false);
        assert.equal(test.timers.size, 0);

        for (const owner of [target, test.document, test.window]) {
            for (const handlers of owner.listeners.values()) {
                assert.equal(handlers.size, 0);
            }
        }
    });

    it('flips below a top-edge trigger and keeps the tooltip inside the viewport', () => {
        const test = setup();
        const target = test.bind();
        target.rect = { left: 790, top: 2, bottom: 22, width: 10, height: 20 };
        target.fire('pointerenter');
        test.advance(500);
        assert.equal(test.views[0].placement, 'bottom');
        assert.equal(parseFloat(test.views[0].position.left) + 180, 792);
        assert.equal(parseFloat(test.views[0].position.top), 30);
    });
});
