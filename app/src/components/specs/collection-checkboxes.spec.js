const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const compiler = require('vue-template-compiler');

const root = path.resolve(__dirname, '../../../..');
const appRequire = createRequire(path.join(root, 'app/package.json'));
const Vue = appRequire('vue');
const VueI18n = appRequire('vue-i18n');
Vue.use(VueI18n);
const read = name => fs.readFileSync(path.join(root, 'app/src', name), 'utf8');
const mixinContext = { module: { exports: {} } };
vm.runInNewContext(
    read('components/mixins/CollectionCheckboxes.js').replace('export default', 'module.exports ='),
    mixinContext
);
const CollectionCheckboxes = mixinContext.module.exports;
const filesContext = { module: { exports: {} }, URL, Intl };
vm.runInNewContext(
    read('helpers/file-manager.js').replace(/export function /g, 'function ') +
        '\nmodule.exports = { sortFiles, fileWebsiteURL };',
    filesContext
);

function firstCheckbox(node) {
    if (node.tag === 'checkbox') {
        return node;
    }

    for (const child of node.children || []) {
        const match = firstCheckbox(child);

        if (match) {
            return match;
        }
    }

    return null;
}

function loadComponent(name) {
    const parsed = compiler.parseComponent(read('components/' + name + '.vue'));
    const context = {
        module: { exports: {} },
        Vue,
        Map,
        Set,
        CollectionCheckboxes,
        CollectionOrdering: {},
        CollectionFilterButton: {},
        CollectionSortButton: {},
        EditorSelection: {},
        InlineNameEditor: {},
        Tooltip: {},
        BackToTools: {},
        Draggable: {},
        Sortable: {},
        MenuItem: {},
        MenuItemEditor: {},
        AuthorForm: {},
        TagForm: {},
        MenuPositionPopup: {},
        keepItemOutOfItsAncestors() {},
        ToolsPluginDetails: {},
        mapGetters: () => ({}),
        ...filesContext.module.exports
    };
    vm.runInNewContext(
        parsed.script.content.replace(/^import .*;\s*$/gm, '').replace('export default', 'module.exports ='),
        context
    );
    const templateSource = parsed.template.content.trim();
    const ast = compiler.compile(templateSource, { outputSourceRange: true }).ast;
    const checkbox = firstCheckbox(ast);
    assert.ok(checkbox, name + ' must render a collection checkbox');
    const template = compiler.compile(templateSource.slice(checkbox.start, checkbox.end));
    assert.deepEqual(template.errors, []);

    return {
        options: context.module.exports,
        render: new Function(template.render),
        staticRenderFns: template.staticRenderFns.map(code => new Function(code))
    };
}

function setup(name = null, overrides = {}) {
    const component = name ? loadComponent(name) : { options: {} };
    const options = component.options;
    const computed = {};
    const selectedComputed = [
        'collectionSelectionIds',
        'collectionSelectedIds',
        'allVisibleSelected',
        'someVisibleSelected',
        'renderedItems',
        'filteredFiles',
        'selectableFiles',
        'selectedFiles',
        'visiblePlugins',
        'selectedPlugins',
        'enableCandidates',
        'disableCandidates',
        'busy'
    ];

    for (const key of selectedComputed) {
        if (options.computed && options.computed[key]) {
            computed[key] = options.computed[key];
        }
    }

    const events = [];
    const instance = new Vue({
        mixins: [CollectionCheckboxes],
        components: {
            Checkbox: {
                props: ['checked', 'indeterminate', 'onClick', 'disabled', 'value'],
                render: createElement => createElement('input')
            }
        },
        data() {
            return {
                items: [{ id: 2 }, { id: 3 }, { id: 4 }],
                selectedItems: [],
                filterValue: '',
                query: '',
                statusFilter: 'any',
                noticeFilter: 'any',
                orderBy: 'name',
                order: 'ASC',
                renderLimit: 100,
                operation: '',
                confirmationOpen: false,
                isLoading: false,
                loadError: false,
                frozenIds: null,
                hierarchyMode: false,
                subpageSelected: false,
                subpageSelectedChildren: [],
                ...overrides
            };
        },
        computed,
        methods: options.methods || {},
        beforeCreate() {
            this.$t = key => key;
            this.$bus = { $emit: (...args) => events.push(args) };
            this.$store = {
                state: { currentSite: { config: { advanced: { urls: { cleanUrls: true } } } } }
            };
        },
        i18n: new VueI18n({ locale: 'en-gb', messages: {} }),
        render: component.render,
        staticRenderFns: component.staticRenderFns
    });

    return { instance, events };
}

function header(instance) {
    return instance._render().componentOptions.propsData;
}

function file(name, isFile = true) {
    return { name, isFile, size: 1, fullPath: '/fixture/' + name };
}

describe('Collection checkbox selection model', function () {
    it('moves from none through partial and all, then clears with one master activation', function () {
        const { instance: list } = setup();
        assert.equal(list.allVisibleSelected, false);
        assert.equal(list.someVisibleSelected, false);
        list.toggleSelection(2);
        assert.equal(list.allVisibleSelected, false);
        assert.equal(list.someVisibleSelected, true);
        list.toggleAllCheckboxes();
        assert.deepEqual(Array.from(list.selectedItems), [2, 3, 4]);
        assert.equal(list.allVisibleSelected, true);
        assert.equal(list.someVisibleSelected, false);
        list.toggleAllCheckboxes();
        assert.deepEqual(Array.from(list.selectedItems), []);
    });

    it('ignores stale and filtered-out IDs even when their count matches the visible collection', function () {
        const { instance: list } = setup(null, { selectedItems: [2, 90, 91] });
        assert.equal(list.allVisibleSelected, false);
        assert.equal(list.someVisibleSelected, true);
        assert.deepEqual(Array.from(list.getSelectedItems()), [2]);
        list.toggleAllCheckboxes();
        assert.deepEqual(Array.from(list.selectedItems), [2, 3, 4]);
        list.selectedItems = [90, 91, 92];
        assert.equal(list.allVisibleSelected, false);
        assert.equal(list.someVisibleSelected, false);
        assert.deepEqual(Array.from(list.getSelectedItems()), []);
    });

    it('does not confuse duplicate selection entries with multiple visible selections', function () {
        const { instance: list } = setup(null, { selectedItems: [2, 2, 2] });
        assert.equal(list.allVisibleSelected, false);
        assert.equal(list.someVisibleSelected, true);
        list.toggleAllCheckboxes();
        assert.deepEqual(Array.from(list.selectedItems), [2, 3, 4]);
    });

    it('keeps an empty filtered collection unchecked regardless of old selections', function () {
        const { instance: list } = setup(null, { items: [], selectedItems: [2] });
        assert.equal(list.allVisibleSelected, false);
        assert.equal(list.someVisibleSelected, false);
        list.toggleAllCheckboxes();
        assert.deepEqual(Array.from(list.selectedItems), []);
    });

    it('preserves the existing unfiltered bulk-action contract when explicitly requested', function () {
        const { instance: list } = setup(null, { selectedItems: [2, 90] });
        assert.deepEqual(Array.from(list.getSelectedItems()), [2]);
        assert.deepEqual(Array.from(list.getSelectedItems(false)), [2, 90]);
    });
});

const listings = [
    ['Posts', [{ id: 2 }, { id: 3 }], [2, 3]],
    ['Pages', [{ id: 2 }, { id: 3 }], [2, 3]],
    ['Tags', [{ id: 2 }, { id: 3 }], [2, 3]],
    ['Authors', [{ id: 1 }, { id: 2 }, { id: 3 }], [2, 3]],
    ['Menus', [{ name: 'Header' }, { name: 'Footer' }], [0, 1]],
    ['Backups', [{ id: 'first.zip' }, { id: 'second.zip' }], ['first.zip', 'second.zip']],
    ['FileManager', [file('a.pdf'), file('b.pdf'), file('folder', false)], ['a.pdf', 'b.pdf']]
];

for (const [name, items, ids] of listings) {
    describe(name + ' collection header', function () {
        it('renders the shared three-state model and selects the correct row identities', function () {
            const { instance: list } = setup(name, { items });
            assert.equal(header(list).checked, false);
            assert.equal(header(list).indeterminate, false);
            list.toggleSelection(ids[0]);
            assert.equal(header(list).checked, false);
            assert.equal(header(list).indeterminate, true);
            header(list).onClick();
            assert.deepEqual(Array.from(list.selectedItems), ids);
            assert.equal(header(list).checked, true);
            assert.equal(header(list).indeterminate, false);
            header(list).onClick();
            assert.deepEqual(Array.from(list.selectedItems), []);
            assert.equal(header(list).checked, false);
            assert.equal(header(list).indeterminate, false);
        });
    });
}

for (const name of ['Posts', 'Pages', 'Tags']) {
    it(name + ' selects every filtered result beyond the 100 rendered rows', function () {
        const items = Array.from({ length: 125 }, (_, index) => ({ id: index + 1 }));
        const { instance: list } = setup(name, { items });
        assert.equal(list.renderedItems.length, 100);
        header(list).onClick();
        assert.equal(list.selectedItems.length, 125);
        assert.equal(list.isChecked(125), true);
        assert.equal(header(list).checked, true);
        list.items = items.filter(item => item.id >= 120);
        assert.deepEqual(Array.from(list.getSelectedItems()), [120, 121, 122, 123, 124, 125]);
        assert.equal(header(list).checked, true);
        assert.equal(header(list).indeterminate, false);
    });
}

describe('Collection-specific selection constraints', function () {
    it('never adds the website owner to Authors selection, including an owner-only filter', function () {
        const { instance: list } = setup('Authors', { items: [{ id: 1 }, { id: 9 }] });
        header(list).onClick();
        assert.deepEqual(Array.from(list.selectedItems), [9]);
        assert.equal(header(list).checked, true);
        list.items = [{ id: 1 }];
        assert.equal(header(list).checked, false);
        assert.equal(header(list).indeterminate, false);
        header(list).onClick();
        assert.deepEqual(Array.from(list.selectedItems), []);
    });

    it('uses menu indexes for the existing bulk handlers instead of nonexistent IDs', function () {
        const { instance: list } = setup('Menus', {
            items: [{ name: 'Header' }, { name: 'Footer' }, { name: 'Secondary' }]
        });
        list.toggleSelection(1);
        header(list).onClick();
        assert.deepEqual(Array.from(list.getSelectedItems(false)), [0, 1, 2]);
    });

    it('limits File Manager selection to searchable files and respects active operations', function () {
        const { instance: list } = setup('FileManager', {
            items: [file('a.pdf'), file('b.pdf'), file('folder', false)],
            filterValue: 'b.pdf',
            selectedItems: ['a.pdf', 'folder']
        });
        assert.equal(header(list).checked, false);
        assert.equal(header(list).indeterminate, false);
        header(list).onClick();
        assert.deepEqual(Array.from(list.selectedItems), ['b.pdf']);
        assert.deepEqual(Array.from(list.selectedFiles, item => item.name), ['b.pdf']);
        list.operation = 'delete';
        header(list).onClick();
        assert.deepEqual(Array.from(list.selectedItems), ['b.pdf']);
        list.operation = '';
        list.isLoading = true;
        header(list).onClick();
        assert.deepEqual(Array.from(list.selectedItems), ['b.pdf']);
    });

    it('keeps the existing Pages hierarchy transition and clears bulk selection on entry', function () {
        const { instance: list } = setup('Pages', {
            filterValue: 'is:published',
            selectedItems: [2],
            subpageSelected: true,
            subpageSelectedChildren: [3]
        });
        const filters = [];
        const orderings = [];
        list.setFilter = value => filters.push(value);
        list.saveOrdering = (...args) => orderings.push(args);
        list.toggleHierarchyMode();
        assert.equal(list.hierarchyMode, true);
        assert.equal(header(list).disabled, true);
        assert.equal(list.subpageSelected, false);
        assert.deepEqual(Array.from(list.subpageSelectedChildren), []);
        assert.deepEqual(Array.from(list.selectedItems), []);
        assert.equal(header(list).checked, false);
        assert.equal(header(list).indeterminate, false);
        assert.deepEqual(filters, ['']);
        assert.deepEqual(orderings, [['', 'DESC']]);
    });
});
