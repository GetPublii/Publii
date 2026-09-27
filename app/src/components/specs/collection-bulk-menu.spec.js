const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const compiler = require('vue-template-compiler');

function setup(name, items) {
    const source = fs.readFileSync(path.join(__dirname, '..', name + '.vue'), 'utf8');
    const parsed = compiler.parseComponent(source);
    const context = {
        module: { exports: {} },
        CollectionFilterButton: {},
        EditorSelection: {},
        CollectionOrdering: {},
        CollectionCheckboxes: {},
        Tooltip: {}
    };
    vm.runInNewContext(
        parsed.script.content.replace(/^import .*;\s*$/gm, '').replace('export default', 'module.exports ='),
        context
    );
    const options = context.module.exports;
    const calls = [];
    const list = {
        items,
        selectedItems: items.map(item => item.id),
        $t: key => key
    };

    for (const [method, implementation] of Object.entries(options.methods)) {
        list[method] = method.startsWith('bulk')
            ? () => calls.push(method)
            : implementation.bind(list);
    }

    return {
        source,
        parsed,
        calls,
        list,
        actions: () => options.computed.bulkActions.call(list).filter(item => item.visible !== false)
    };
}

for (const name of ['Posts', 'Pages']) {
    describe(name + ' shared bulk menu', () => {
        it('compiles the shared menu and removes the legacy dropdown implementation', () => {
            const { source, parsed } = setup(name, []);
            assert.deepEqual(compiler.compile(parsed.template.content).errors, []);
            assert.ok(!/bulkDropdownVisible|toggleBulkDropdown|closeBulkDropdown|dropdown-wrapper/.test(source));
        });

        it('keeps action visibility and calls the existing handlers for mixed selections', () => {
            const { actions, calls } = setup(name, [
                { id: 1, status: ['published', 'featured', 'excluded_homepage', 'hidden'] },
                { id: 2, status: ['draft'] }
            ]);
            const visible = actions();
            const expected = name === 'Posts'
                ? ['publish', 'draft', 'featured', 'unfeatured', 'exclude', 'include', 'hide', 'unhide', 'convert']
                : ['publish', 'draft', 'convert'];
            assert.deepEqual(Array.from(visible, item => item.value), expected);

            visible.forEach(item => item.onClick());

            assert.deepEqual(calls, name === 'Posts'
                ? ['bulkPublish', 'bulkUnpublish', 'bulkFeatured', 'bulkUnfeatured', 'bulkExclude', 'bulkInclude', 'bulkHide', 'bulkUnhide', 'bulkConvertToPage']
                : ['bulkPublish', 'bulkUnpublish', 'bulkConvertToPost']);
        });

        it('uses the selected items only and updates actions when selection changes', () => {
            const { actions, list } = setup(name, [
                { id: 1, status: ['published'] },
                { id: 2, status: ['draft'] }
            ]);
            list.selectedItems = [1];
            assert.ok(!actions().some(item => item.value === 'publish'));
            assert.ok(actions().some(item => item.value === 'draft'));

            list.selectedItems = [2];
            assert.ok(actions().some(item => item.value === 'publish'));
            assert.ok(!actions().some(item => item.value === 'draft'));
        });
    });
}
