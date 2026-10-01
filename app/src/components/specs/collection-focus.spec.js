const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const Vue = require('../../../node_modules/vue');
const focusReturnTarget = require('../../helpers/focus-return-target');

function loadComponent(name, globals = {}) {
    const source = fs.readFileSync(path.join(__dirname, '..', name + '.vue'), 'utf8');
    const script = source.match(/<script>([\s\S]*?)<\/script>/)[1];
    const context = {
        module: { exports: {} },
        Vue,
        focusReturnTarget,
        CollectionSortButton: {},
        CollectionFilterButton: {},
        CollectionCheckboxes: {},
        CollectionOrdering: {},
        EditorSelection: {},
        SidebarScrollFade: {},
        SidebarKeyboard: {},
        AuthorForm: {},
        TagForm: {},
        Tooltip: {},
        Utils: { debouncedFunction: callback => callback },
        ...globals
    };
    vm.runInNewContext(
        script.replace(/^import .*;\s*$/gm, '').replace('export default', 'module.exports ='),
        context
    );
    return context.module.exports;
}

function pagesFixture() {
    const options = loadComponent('Pages');
    const pending = [];
    let focused = null;
    const control = id => ({
        isConnected: true,
        focus() {
            focused = id;
        }
    });
    const list = {
        hierarchyMode: true,
        subpageSelected: false,
        subpageSelectedChildren: [],
        items: [
            { id: 2, parentIds: [] },
            { id: 3, parentIds: [2] }
        ],
        $refs: {},
        $nextTick: callback => pending.push(callback)
    };
    for (const name of ['selectItem', 'unselectItem', 'focusHierarchyAction', 'moveSelectedItem', 'findAndRemoveItem', 'findItemAndParent']) {
        list[name] = options.methods[name].bind(list);
    }
    return {
        list,
        control,
        focused: () => focused,
        flush() {
            while (pending.length) {
                pending.shift()();
            }
        }
    };
}

describe('Collection focus continuity', () => {
    for (const [kind, name] of [['author', 'Authors'], ['tag', 'Tags']]) {
        it(name + ': captures the menu trigger before the editor and menu update', () => {
            const trigger = {};
            const menu = {
                querySelector(selector) {
                    assert.equal(selector, '[data-action-menu-trigger]');
                    return trigger;
                }
            };
            const document = {
                activeElement: { closest: () => menu },
                querySelector: () => ({
                    classList: { remove() {} },
                    parentNode: { parentNode: { classList: { add() {} } } }
                })
            };
            const options = loadComponent(name, { document, setTimeout() {} });
            const list = {};
            options.methods['edit' + kind[0].toUpperCase() + kind.slice(1)].call(list, { id: 7 });
            assert.equal(list.editorVisible, true);
            assert.equal(list.editorTrigger, trigger);
        });

        it(name + ': preserves the open section for the same record and resets it for another record', async () => {
            const options = loadComponent(kind[0].toUpperCase() + kind.slice(1) + 'Form');
            const form = new Vue(options);
            form.$bus = new Vue();
            form.$t = key => key;
            form.$refs.sidebarContent = { scrollTop: 0 };
            options.mounted.call(form);
            const open = id => form.$bus.$emit('show-' + kind + '-item-editor', { id, additionalData: '{}' });
            open(7);
            await Vue.nextTick();
            assert.equal(form.openedItem, 'basic');

            for (const section of ['seo', '']) {
                form.openedItem = section;
                open(7);
                await Vue.nextTick();
                assert.equal(form.openedItem, section);
            }

            open(8);
            await Vue.nextTick();
            assert.equal(form.openedItem, 'basic');
            form.$destroy();
        });
    }

    it('Pages: focuses Unselect after Move and returns to Move after cancellation', () => {
        const f = pagesFixture();
        f.list.selectItem(2);
        assert.deepEqual(Array.from(f.list.subpageSelectedChildren), [3]);
        f.list.$refs['hierarchy-unselect-2'] = [f.control('unselect')];
        f.flush();
        assert.equal(f.focused(), 'unselect');
        f.list.unselectItem();
        f.list.$refs['hierarchy-move-2'] = [f.control('move')];
        f.flush();
        assert.equal(f.focused(), 'move');
        assert.equal(f.list.subpageSelected, false);
        assert.equal(f.list.subpageSelectedChildren.length, 0);
    });

    it('Pages: keeps the moved row focused without changing hierarchy persistence', () => {
        const f = pagesFixture();
        f.list.pagesHierarchy = [
            { id: 2, subpages: [] },
            { id: 3, subpages: [] }
        ];
        let saved = 0;
        f.list.hierarchySave = () => saved++;
        f.list.subpageSelected = 2;
        f.list.moveSelectedItem('after', 3);
        f.list.$refs['hierarchy-move-2'] = [f.control('move')];
        f.flush();
        assert.deepEqual(f.list.pagesHierarchy.map(item => item.id), [3, 2]);
        assert.equal(saved, 1);
        assert.equal(f.focused(), 'move');
    });

    it('Pages: does not focus a stale control after leaving hierarchy mode or removing the row', () => {
        for (const hierarchyMode of [false, true]) {
            const f = pagesFixture();
            f.list.selectItem(2);
            const control = f.control('unselect');
            control.isConnected = !hierarchyMode;
            f.list.$refs['hierarchy-unselect-2'] = [control];
            f.list.hierarchyMode = hierarchyMode;
            f.flush();
            assert.equal(f.focused(), null);
        }
    });
});
