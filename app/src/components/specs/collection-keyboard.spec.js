const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const Vue = require('../../../node_modules/vue');
const compiler = require('vue-template-compiler');

const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

function definition(source) {
    const context = { module: { exports: {} } };
    vm.runInNewContext(source.replace('export default', 'module.exports ='), context);
    return context.module.exports;
}

function rendering(template) {
    const compiled = compiler.compile(template);
    assert.deepEqual(compiled.errors, []);
    return {
        render: new Function(compiled.render),
        staticRenderFns: compiled.staticRenderFns.map(code => new Function(code))
    };
}

function findNodes(node, predicate) {
    const result = predicate(node) ? [node] : [];

    for (const child of node.children || []) {
        result.push(...findNodes(child, predicate));
    }

    return result;
}

const sortSource = compiler.parseComponent(read('basic-elements/CollectionSortButton.vue'));
const SortButton = {
    ...definition(sortSource.script.content),
    ...rendering(sortSource.template.content)
};
const ordering = definition(read('mixins/CollectionOrdering.js'));

describe('Shared collection keyboard controls', () => {
    for (const name of ['Posts', 'Pages', 'Authors', 'Tags']) {
        it(name + ': uses native sorting controls without changing ordering or bulk selection', async () => {
            const source = compiler.parseComponent(read(name + '.vue')).template.content.trim();
            const ast = compiler.compile(source, { outputSourceRange: true }).ast;
            const buttons = findNodes(ast, node => node.tag === 'collection-sort-button');
            assert.equal(buttons.length, name === 'Posts' || name === 'Pages' ? 5 : 3);

            for (const node of buttons) {
                const saved = [];
                const list = new Vue({
                    ...rendering(source.slice(node.start, node.end)),
                    mixins: [ordering],
                    components: { CollectionSortButton: SortButton },
                    data: () => ({
                        orderBy: 'initial',
                        order: 'ASC',
                        anyCheckboxIsSelected: false
                    }),
                    beforeCreate() {
                        this.$t = key => key;
                    },
                    methods: {
                        saveOrdering: (field, order) => saved.push([field, order])
                    }
                });
                const field = node.attrsMap['@click'].match(/ordering\('([^']+)'\)/)[1];
                const first = list._render().componentOptions;
                first.listeners.click();
                await Vue.nextTick();
                assert.equal(list.orderBy, field);
                assert.equal(list.order, 'DESC');
                const next = list._render().componentOptions;
                assert.equal(next.propsData.active, true);
                next.listeners.click();
                assert.equal(list.order, 'ASC');
                assert.deepEqual(saved, [[field, 'DESC'], [field, 'ASC']]);
                list.anyCheckboxIsSelected = true;
                assert.equal(list._render().componentOptions.propsData.disabled, true);
            }
        });
    }

    it('announces the next sort direction and preserves native button semantics', () => {
        const button = new Vue({
            ...SortButton,
            propsData: { label: 'Title' },
            beforeCreate() {
                this.$t = (key, values) => values ? values.column + ' ' + values.direction : key;
            }
        });
        assert.equal(button._render().tag, 'button');
        assert.equal(button._render().data.attrs.type, 'button');
        assert.equal(button.actionLabel, 'Title file.manager.descending');
        button.active = true;
        assert.equal(button.actionLabel, 'Title file.manager.ascending');
        button.order = 'ASC';
        assert.equal(button.actionLabel, 'Title file.manager.descending');
        button.disabled = true;
        assert.equal(button._render().data.attrs.disabled, true);
    });

    it('Pages: keeps hierarchy navigation available without opening the page editor', () => {
        const source = compiler.parseComponent(read('Pages.vue')).template.content.trim();
        const ast = compiler.compile(source, { outputSourceRange: true }).ast;
        const node = findNodes(ast, item => item.attrsMap &&
            (item.attrsMap['@click.prevent.stop'] || '').includes('editPage('))[0];
        const opening = source.slice(node.start, source.indexOf('>', node.start) + 1);
        let opened = 0;
        const page = new Vue({
            ...rendering(opening + 'Title</a>'),
            data: () => ({
                hierarchyMode: true,
                item: { id: 5, editor: 'tinymce' }
            }),
            beforeCreate() {
                this.$t = key => key;
            },
            methods: {
                editPage: () => opened++
            }
        });
        const event = {
            preventDefault() {},
            stopPropagation() {}
        };
        const disabled = page._render();
        assert.equal(disabled.data.attrs['aria-disabled'], 'true');
        assert.equal(disabled.data.attrs.tabindex, -1);
        disabled.data.on.click(event);
        assert.equal(opened, 0);
        page.hierarchyMode = false;
        const enabled = page._render();
        assert.equal(enabled.data.attrs.tabindex, null);
        enabled.data.on.click(event);
        assert.equal(opened, 1);
    });

    for (const name of ['AuthorForm', 'TagForm']) {
        it(name + ': exposes accordion state and makes collapsed content inert without unmounting it', () => {
            const source = compiler.parseComponent(read(name + '.vue')).template.content.trim();
            const ast = compiler.compile(source, { outputSourceRange: true }).ast;
            assert.deepEqual(compiler.compile(source).errors, []);
            const headers = findNodes(ast, node => node.attrsMap && node.attrsMap[':aria-controls']);
            assert.equal(headers.length, 4);
            const wrappers = findNodes(ast, node => node.attrsMap && node.attrsMap[':inert']);
            assert.equal(wrappers.length, 4);

            for (const node of headers) {
                assert.equal(node.tag, 'button');
                assert.equal(node.attrsMap.type, 'button');
            }

            for (const node of wrappers) {
                const opening = source.slice(node.start, source.indexOf('>', node.start) + 1);
                const panel = new Vue({
                    ...rendering(opening + '</div>'),
                    data: () => ({ openedItem: 'basic' })
                });
                const expected = node.attrsMap.ref === 'basic-content-wrapper' ? null : '';
                assert.equal(panel._render().data.attrs.inert, expected);
                assert.ok(!node.attrsMap['v-if']);
            }
        });
    }
});
