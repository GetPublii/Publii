const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const Vue = require('vue');
const compiler = require('vue-template-compiler');

const sourceRoot = path.join(__dirname, '../..');
const fixedTime = 1791918000000;

class FixedDate extends Date {
    constructor (...args) {
        super(...(args.length ? args : [fixedTime]));
    }

    static now () {
        return fixedTime;
    }
}

function read (file) {
    return fs.readFileSync(path.join(sourceRoot, file), 'utf8');
}

function evaluate (source, globals = {}) {
    const context = {
        module: { exports: {} },
        Vue,
        Date: FixedDate,
        ...globals
    };
    vm.runInNewContext(
        source.replace(/^import .*;\s*$/gm, '').replace('export default', 'module.exports ='),
        context
    );
    return context.module.exports;
}

const MenuStructure = evaluate(read('store/helpers/menu-structure.js'));
const mutations = evaluate(read('store/helpers/mutations.js'), { MenuStructure });
const menuItemSource = compiler.parseComponent(read('components/MenuItem.vue'));
const options = evaluate(menuItemSource.script.content, {
    Tooltip: {},
    Draggable: {},
    menuDragOptions: disabled => ({ disabled }),
    keepItemOutOfItsAncestors: () => true,
    escapeHTML: value => String(value),
    setTimeout: callback => callback()
});
const compiled = compiler.compile(menuItemSource.template.content);

function copy (value) {
    return JSON.parse(JSON.stringify(value));
}

function item (id, overrides = {}) {
    return {
        id,
        label: 'Item ' + id,
        type: 'external',
        link: 'https://example.com/path',
        title: 'Title',
        target: '_blank',
        rel: 'nofollow',
        cssClass: 'custom',
        isHidden: false,
        items: [],
        ...overrides
    };
}

function flatten (items) {
    return items.flatMap(entry => [entry, ...flatten(entry.items || [])]);
}

function stateFor (items, menuID = 0) {
    return Vue.observable({
        currentSite: {
            menuStructure: [0, 1, 2].map(index => ({
                name: 'Menu ' + index,
                items: index === menuID ? items : [item(900 + index)]
            }))
        }
    });
}

function rowFor (state, selected, extraProps = {}) {
    return new Vue({
        ...options,
        beforeCreate () {
            this.$store = {
                state,
                commit (name, payload) {
                    mutations[name](state, payload);
                }
            };
            this.$bus = { $emit () {} };
            this.$t = key => key;
        },
        propsData: {
            itemData: selected,
            itemMenuID: 0,
            itemOrder: 0,
            selectedItem: null,
            ...extraProps
        },
        render: new Function(compiled.render),
        staticRenderFns: compiled.staticRenderFns.map(source => new Function(source))
    });
}

function nodes (node) {
    return [node, ...(node.children || []).flatMap(nodes)];
}

describe('Menu visibility', () => {
    for (const hasField of [true, false]) {
        it(`keeps a hidden row available and updates Hide/Show immediately (legacy=${!hasField})`, async () => {
            const selected = item(101);

            if (!hasField) {
                delete selected.isHidden;
            }

            const state = stateFor([selected]);
            const row = rowFor(state, selected);
            assert.equal(row.isHidden, false);
            row.itemActions.find(action => action.value === 'visibility').onClick();
            await Vue.nextTick();

            assert.equal(selected.isHidden, true);
            assert.equal(row.isHidden, true);
            assert.equal(row.cssClasses['is-menu-hidden'], true);
            assert.equal(row.cssClasses['is-hidden'], undefined);
            assert.equal(row.itemActions.find(action => action.value === 'visibility').label, 'ui.show');
            assert.equal(state.currentSite.menuStructure[0].items.length, 1);

            const rendered = nodes(row._render());
            const hiddenIcon = rendered.find(node => node.data && node.data.attrs && node.data.attrs.name === 'hidden-post');
            assert.ok(hiddenIcon);
            assert.ok(hiddenIcon.data.staticClass.includes('content-status-icon'));
            assert.equal(hiddenIcon.data.directives[0].value, 'menu.menuItemIsHidden');
            assert.ok(!rendered.some(node => node.data && node.data.staticClass === 'menu-item-badge'));
            assert.ok(!rendered.some(node => node.text && node.text.includes('menu.itemHidden')));
            const label = rendered.find(node => node.data && node.data.staticClass === 'menu-item-label');
            assert.equal(label.data.attrs['aria-label'], selected.label + ', menu.menuItemIsHidden');

            row.itemActions.find(action => action.value === 'visibility').onClick();
            await Vue.nextTick();
            assert.equal(selected.isHidden, false);
            assert.equal(row.isHidden, false);
            assert.equal(row.itemActions.find(action => action.value === 'visibility').label, 'ui.hide');
        });
    }

    it('preserves Hide when the user subsequently edits an old item', () => {
        const selected = item(101);
        delete selected.isHidden;
        const state = stateFor([selected]);
        const row = rowFor(state, selected);
        assert.equal(row.isHidden, false);
        row.hideMenuItem();
        let edited;
        row.$bus.$emit = (event, payload) => {
            if (event === 'show-menu-item-editor') {
                edited = payload;
            }
        };
        row.editMenuItem();
        assert.equal(edited.isHidden, true);
        mutations.editMenuItem(state, {
            menuID: 0,
            menuItem: { ...edited, id: edited.menuItemID, label: 'Renamed' }
        });
        assert.equal(selected.isHidden, true);
        assert.equal(selected.label, 'Renamed');
    });
});

describe('Menu duplication and ID isolation', () => {
    for (const menuID of [0, 1, 2]) {
        for (const position of [0, 1, 2]) {
            for (const depth of [0, 1, 3]) {
                for (const id of [101, '101', 0]) {
                    it(`duplicates only the selected subtree (menu=${menuID}, position=${position}, depth=${depth}, id=${JSON.stringify(id)})`, () => {
                        const selected = item(id, {
                            isHidden: true,
                            items: [item('201'), item(202, { items: [item('301')] })],
                            wpImport: { source: 'https://example.com', id: 77 }
                        });
                        const siblings = [item(401), item(402)];
                        siblings.splice(position, 0, selected);
                        let roots = siblings;

                        for (let level = 0; level < depth; level += 1) {
                            roots = [item(501 + level, { items: roots })];
                        }

                        const state = stateFor(roots, menuID);
                        const original = copy(selected);
                        const otherMenus = copy(state.currentSite.menuStructure.filter((menu, index) => index !== menuID));
                        mutations.duplicateMenuItem(state, { menuID, menuItemID: id });
                        const entries = flatten(state.currentSite.menuStructure[menuID].items);
                        assert.equal(new Set(entries.map(entry => String(entry.id))).size, entries.length);
                        assert.deepEqual(copy(selected), original);
                        assert.deepEqual(copy(state.currentSite.menuStructure.filter((menu, index) => index !== menuID)), otherMenus);
                        const clone = siblings.at(-1);
                        assert.notEqual(clone.id, selected.id);
                        assert.equal(clone.label, selected.label);
                        assert.equal(clone.link, selected.link);
                        assert.equal(clone.isHidden, true);
                        assert.deepEqual(copy(clone.wpImport), original.wpImport);
                        clone.items[0].label = 'Changed child';
                        assert.equal(selected.items[0].label, 'Item 201');
                    });
                }
            }
        }
    }

    it('allocates distinct IDs across rapid copies, new items and other menus', () => {
        const state = stateFor([item(101)]);
        state.currentSite.menuStructure[1].items = [item(String(fixedTime))];

        for (let index = 0; index < 10; index += 1) {
            mutations.duplicateMenuItem(state, { menuID: 0, menuItemID: 101 });
            mutations.addNewMenuItem(state, { menuID: 0, menuItem: item(fixedTime) });
        }

        const entries = state.currentSite.menuStructure.flatMap(menu => flatten(menu.items));
        assert.equal(new Set(entries.map(entry => String(entry.id))).size, entries.length);
    });

    it('copies more than 1000 nodes without unsafe or repeated IDs', () => {
        const state = stateFor([item(101, {
            items: Array.from({ length: 1200 }, (unused, index) => item(10000 + index))
        })]);
        mutations.duplicateMenuItem(state, { menuID: 0, menuItemID: 101 });
        const ids = flatten(state.currentSite.menuStructure[0].items).map(entry => entry.id);
        assert.ok(ids.every(Number.isSafeInteger));
        assert.equal(new Set(ids).size, ids.length);
    });

    for (const operation of ['hide', 'edit', 'delete', 'move']) {
        it(`${operation} on a copy leaves its legacy original intact`, () => {
            const original = item('101');
            const state = stateFor([original, item(500)]);
            mutations.duplicateMenuItem(state, { menuID: 0, menuItemID: '101' });
            const clone = state.currentSite.menuStructure[0].items.at(-1);
            const before = copy(original);

            if (operation === 'hide') {
                mutations.hideMenuItem(state, { menuID: 0, itemID: clone.id });
            } else if (operation === 'edit') {
                mutations.editMenuItem(state, { menuID: 0, menuItem: { ...clone, label: 'Renamed copy' } });
            } else if (operation === 'delete') {
                mutations.deleteMenuItem(state, { menuID: 0, menuItemID: clone.id });
                assert.equal(state.currentSite.menuStructure[0].items.length, 2);
            } else {
                mutations.moveMenuItem(state, { menuID: 0, targetID: clone.id, destinationID: 500, position: 'child' });
                assert.equal(flatten(state.currentSite.menuStructure[0].items).length, 3);
            }

            assert.ok(state.currentSite.menuStructure[0].items.includes(original));
            assert.deepEqual(copy(original), before);
        });
    }
});

describe('Legacy menu loading', () => {
    it('repairs collisions and missing fields without dropping items or changing valid IDs', () => {
        const original = [{
            name: 'Main',
            position: 'main',
            items: [
                { id: '101', label: 'First' },
                item(101, { label: 'Second', items: null }),
                item('101', { label: 'Third' }),
                item(0),
                item(String(fixedTime)),
                item(Number.MAX_SAFE_INTEGER + 1)
            ]
        }];
        const before = copy(original);
        const normalized = MenuStructure.normalizeMenuStructure(original);
        const entries = flatten(normalized[0].items);
        assert.equal(entries.length, 6);
        assert.equal(entries[0].id, '101');
        assert.equal(entries[3].id, 0);
        assert.equal(entries[4].id, String(fixedTime));
        assert.equal(new Set(entries.map(entry => String(entry.id))).size, entries.length);
        assert.ok(entries.every(entry => Array.isArray(entry.items)));
        assert.ok(entries.every(entry => typeof entry.isHidden === 'boolean'));
        assert.deepEqual(copy(original), before);
        assert.deepEqual(copy(MenuStructure.normalizeMenuStructure(normalized)), copy(normalized));

        const state = stateFor(normalized[0].items);
        mutations.deleteMenuItem(state, { menuID: 0, menuItemID: entries[1].id });
        assert.equal(state.currentSite.menuStructure[0].items.length, 5);
        assert.equal(state.currentSite.menuStructure[0].items[0].label, 'First');
    });

    it('normalizes incoming data when switching sites', () => {
        const state = {
            currentSite: { config: { synced: false } },
            components: { sidebar: {} },
            app: { config: {} },
            ordering: {}
        };
        const switchMutations = evaluate(read('store/helpers/mutations.js'), {
            MenuStructure,
            Utils: { deepMerge: (target, source) => Object.assign(target, source) }
        });
        switchMutations.switchSite(state, {
            menuStructure: [{ name: 'Main', items: [{ id: '101', label: 'Legacy' }] }]
        });
        assert.equal(state.currentSite.menuStructure[0].items[0].isHidden, false);
        assert.deepEqual(copy(state.currentSite.menuStructure[0].items[0].items), []);
    });

    it('allows visibility and removal when children are missing or null', () => {
        for (const items of [undefined, null]) {
            const selected = item(101, { items });
            const state = stateFor([selected]);
            mutations.hideMenuItem(state, { menuID: 0, itemID: 101 });
            assert.equal(selected.isHidden, true);
            mutations.deleteMenuItem(state, { menuID: 0, menuItemID: 101 });
            assert.equal(state.currentSite.menuStructure[0].items.length, 0);
        }
    });
});

describe('Menu movement and missing targets', () => {
    for (const position of ['before', 'after', 'child']) {
        for (const nestedSource of [false, true]) {
            for (const nestedDestination of [false, true]) {
                it(`preserves each item when moving ${position} (source=${nestedSource}, destination=${nestedDestination})`, () => {
                    const state = stateFor([
                        item(0, { items: [item('101')] }),
                        item(201, { items: [item('301')] })
                    ]);
                    const targetID = nestedSource ? '101' : 0;
                    const destinationID = nestedDestination ? '301' : 201;
                    mutations.moveMenuItem(state, { menuID: 0, targetID, destinationID, position });
                    const entries = flatten(state.currentSite.menuStructure[0].items);
                    assert.equal(entries.length, 4);
                    assert.equal(new Set(entries.map(entry => String(entry.id))).size, 4);

                    if (position === 'child') {
                        assert.equal(entries.find(entry => entry.id === destinationID).items.at(-1).id, targetID);
                    }
                });
            }
        }
    }

    it('does not detach a source for an invalid, identical or descendant destination', () => {
        for (const destinationID of [999, 101, 201]) {
            for (const position of ['before', 'after', 'child']) {
                const state = stateFor([item(101, { items: [item(201)] })]);
                const before = copy(state);
                mutations.moveMenuItem(state, { menuID: 0, targetID: 101, destinationID, position });
                assert.deepEqual(copy(state), before);
            }
        }
    });

    it('ignores stale targets and invalid menu indexes', () => {
        const state = stateFor([item(101)]);
        const before = copy(state);

        for (const menuID of [0, 99]) {
            const data = { menuID, menuItemID: 999, itemID: 999 };
            mutations.duplicateMenuItem(state, data);
            mutations.deleteMenuItem(state, data);
            mutations.hideMenuItem(state, data);
            mutations.showMenuItem(state, data);
            mutations.reorderMenuItems(state, { ...data, items: [] });
            mutations.editMenuItem(state, { menuID, menuItem: item(999) });
        }

        assert.deepEqual(copy(state), before);
    });

    it('finds numeric and string IDs exactly without confusing their types', () => {
        const state = stateFor([item('00101'), item(101)]);
        mutations.duplicateMenuItem(state, { menuID: 0, menuItemID: 101 });
        assert.equal(state.currentSite.menuStructure[0].items.at(-1).label, 'Item 101');
    });

    it('supports move mode and editing for ID zero', () => {
        assert.deepEqual(compiled.errors, []);
        const selected = item(0);
        const state = stateFor([selected]);
        const row = rowFor(state, selected, { selectedItem: 0, editedID: 0 });
        assert.equal(row.hasSelectedItem, true);
        assert.equal(row.isSelected, true);
        assert.equal(row.dragOptions.disabled, true);
        assert.equal(row.cssClasses['is-edited'], true);
        const editorOptions = evaluate(
            compiler.parseComponent(read('components/MenuItemEditor.vue')).script.content,
            { Tooltip: {}, SidebarScrollFade: {}, setTimeout () {}, console: { log () {} } }
        );
        let openEditor;
        const editor = {
            ...editorOptions.data(),
            reset: editorOptions.methods.reset,
            $bus: {
                $on (event, callback) {
                    openEditor = callback;
                }
            }
        };
        editorOptions.mounted.call(editor);
        openEditor({ menuID: 0, menuItemID: 0, parentID: 0 });
        assert.equal(editor.menuItemID, 0);
        assert.equal(editor.parentID, 0);
    });
});
