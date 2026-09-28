const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const compiler = require('vue-template-compiler');
const Vue = require('vue');
const Handlebars = require('handlebars');

const source = fs.readFileSync(path.join(__dirname, '../basic-elements/OrderedSelect.vue'), 'utf8');
const parsed = compiler.parseComponent(source);
const context = {
    module: { exports: {} },
    ActionMenu: {},
    Sortable: {}
};
vm.runInNewContext(
    parsed.script.content.replace(/^import .*;\s*$/gm, '').replace('export default', 'module.exports ='),
    context
);

function setup (value = [31, 7, 12], multiple = true) {
    const input = [];
    const focused = [];
    const instance = new Vue({
        ...context.module.exports,
        propsData: {
            value,
            multiple,
            customLabel: id => 'Item ' + id
        },
        methods: {
            ...context.module.exports.methods,
            $t: (key, params) => key + ':' + JSON.stringify(params || {})
        }
    });
    instance.$on('input', updated => input.push(Array.from(updated)));
    instance.focusOption = index => focused.push(index);
    instance.deactivate = () => {};
    return { instance, input, focused };
}

function sortableEvent (instance, from, to) {
    instance._sortable = {};
    const original = instance.selectedOptions.map(option => ({
        getAttribute: () => instance.optionKey(option)
    }));
    const children = original.slice();
    const moved = children.splice(from, 1)[0];
    children.splice(to, 0, moved);
    const container = {
        children,
        appendChild (element) {
            children.splice(children.indexOf(element), 1);
            children.push(element);
        }
    };
    return {
        from: container,
        to: container,
        oldDraggableIndex: from,
        newDraggableIndex: to,
        original
    };
}

describe('Ordered content selections', () => {
    it('moves an existing selection without mutating saved input or changing ID types', () => {
        const original = [31, '7', 12];
        const { instance, input, focused } = setup(original);
        instance.moveOption(12, 0);
        assert.deepEqual(original, [31, '7', 12]);
        assert.deepEqual(input, [[12, 31, '7']]);
        assert.deepEqual(focused, [0]);
        assert.match(instance.announcement, /"position":1,"total":3/);
    });

    it('does not modify single selections, empty selections or a one-item selection', () => {
        for (const [value, multiple] of [[31, false], [null, false], [[], true], [[31], true]]) {
            const { instance, input } = setup(value, multiple);
            instance.moveOption(31, 0);
            assert.equal(instance.canReorder, false);
            assert.deepEqual(input, []);
        }
    });

    it('ignores boundaries, missing selections and moves to the current position', () => {
        const { instance, input } = setup();
        instance.moveOption(31, -1);
        instance.moveOption(12, 3);
        instance.moveOption(999, 0);
        instance.moveOption(31, 0);
        assert.deepEqual(input, []);
    });

    it('supports the keyboard and leaves menu navigation keys with the existing menu', () => {
        const { instance, input } = setup();
        const menuKeys = [];
        const event = {
            key: 'ArrowRight',
            preventDefault () {},
            stopPropagation () {}
        };
        instance.handleKeydown(31, event, event => menuKeys.push(event.key));
        instance.handleKeydown(31, { ...event, key: 'End' }, event => menuKeys.push(event.key));
        instance.handleKeydown(12, { ...event, key: 'Home' }, event => menuKeys.push(event.key));
        instance.handleKeydown(31, { ...event, key: 'ArrowDown' }, event => menuKeys.push(event.key));
        assert.deepEqual(input, [[7, 31, 12], [7, 12, 31], [12, 31, 7]]);
        assert.deepEqual(menuKeys, ['ArrowDown']);
    });

    it('offers click actions with the correct first and last position boundaries', () => {
        const { instance, input } = setup();
        assert.equal(instance.moveActions(31)[0].disabled, true);
        assert.equal(instance.moveActions(12)[1].disabled, true);
        instance.moveActions(7)[0].onClick();
        assert.deepEqual(input, [[7, 31, 12]]);
    });

    it('commits a drag in either direction and restores the DOM before Vue updates it', () => {
        const scenarios = [
            { from: 0, to: 1, expected: [7, 31, 12] },
            { from: 0, to: 2, expected: [7, 12, 31] },
            { from: 2, to: 0, expected: [12, 31, 7] },
            { from: 2, to: 1, expected: [31, 12, 7] }
        ];
        for (const scenario of scenarios) {
            const { instance, input, focused } = setup();
            const event = sortableEvent(instance, scenario.from, scenario.to);
            instance.startDrag();
            assert.deepEqual(input, []);
            instance.finishDrag(event);
            assert.deepEqual(input, [scenario.expected]);
            assert.deepEqual(event.from.children, event.original);
            assert.deepEqual(focused, []);
            assert.equal(instance.dragging, false);
        }
    });

    it('does not change the selection when dropped at its original position', () => {
        const { instance, input } = setup();
        const event = sortableEvent(instance, 1, 1);
        instance.startDrag();
        instance.finishDrag(event);
        assert.deepEqual(input, []);
    });

    it('rejects cross-field drops and preserves the original DOM order', () => {
        const { instance, input } = setup();
        const event = sortableEvent(instance, 0, 2);
        event.to = {};
        instance.startDrag();
        instance.finishDrag(event);
        assert.deepEqual(input, []);
        assert.deepEqual(event.from.children, event.original);
    });

    it('does not overwrite a selection changed by the parent during a drag', () => {
        const { instance, input } = setup();
        const event = sortableEvent(instance, 0, 2);
        instance.startDrag();
        instance.value = [12, 7];
        instance.finishDrag(event);
        assert.deepEqual(input, []);
        assert.equal(instance.dragging, false);
        assert.deepEqual(event.from.children.slice(-2).map(element => element.getAttribute()), ['number:12', 'number:7']);
    });

    it('cleans up the sortable instance and ignores a late drop after destruction', () => {
        const { instance, input } = setup();
        const event = sortableEvent(instance, 0, 2);
        let destroyed = false;
        instance._sortable.destroy = () => { destroyed = true; };
        instance.startDrag();
        instance.destroySorting();
        instance.finishDrag(event);
        assert.equal(destroyed, true);
        assert.equal(instance.dragging, false);
        assert.deepEqual(input, []);
    });

    it('disables the sorting animation when reduced motion is requested', () => {
        const { instance } = setup();
        const options = [];
        instance._sortable = { option: (key, value) => options.push([key, value]) };
        instance._motionPreference = { matches: true };
        instance.updateMotionPreference();
        instance._motionPreference.matches = false;
        instance.updateMotionPreference();
        assert.deepEqual(options, [['animation', 0], ['animation', 150]]);
    });

    it('uses the existing removal operation and restores focus beside the removed item', () => {
        const { instance, focused } = setup();
        const removed = [];
        instance.removeOption(7, option => removed.push(option));
        assert.deepEqual(removed, [7]);
        assert.deepEqual(focused, [1]);
    });

    it('compiles all four consumers with the new control', () => {
        assert.deepEqual(compiler.compile(parsed.template.content).errors, []);
        for (const name of ['PostsDropDown', 'PagesDropDown', 'TagsDropDown', 'AuthorsDropDown']) {
            const consumer = compiler.parseComponent(fs.readFileSync(path.join(__dirname, '../basic-elements/' + name + '.vue'), 'utf8'));
            assert.deepEqual(compiler.compile(consumer.template.content).errors, []);
            assert.ok(consumer.script.content.includes("import OrderedSelect from './OrderedSelect.vue'"));
        }
    });
});

for (const [collection, helper, file] of [
    ['posts', 'getPosts', 'get-posts'],
    ['pages', 'getPages', 'get-pages'],
    ['tags', 'getTags', 'get-tags'],
    ['authors', 'getAuthors', 'get-authors']
]) {
    it(helper + ' renders the reordered selection after a JSON round trip', () => {
        const { instance, input } = setup();
        instance.moveOption(12, 0);
        const saved = JSON.parse(JSON.stringify(input[0]));
        const handlebars = Handlebars.create();
        const root = '../../../back-end/modules/render-html/handlebars/helpers/';
        handlebars.registerHelper('concatenate', require(root + 'concatenate.js'));
        require(root + file + '.js')({ contentStructure: { [collection]: [{ id: 7 }, { id: 31 }, { id: 12 }] } }, handlebars);
        const template = handlebars.compile('{{#' + helper + ' (concatenate selected) "" ""}}{{id}};{{/' + helper + '}}');
        assert.equal(template({ selected: saved }), '12;31;7;');
    });
}
