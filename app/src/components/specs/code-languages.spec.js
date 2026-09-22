const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const compiler = require('vue-template-compiler');
const codeLanguages = require('../../../shared/code-languages');
const renderCode = require('../block-editor/components/default-blocks/publii-code/render');

function loadComponent(relativePath, context) {
    const source = fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
    const parsed = compiler.parseComponent(source);
    const scope = { module: { exports: {} }, ...context };
    vm.runInNewContext(parsed.script.content
        .replace(/^import .*?;\s*$/gm, '')
        .replace('export default', 'module.exports ='), scope);
    return { options: scope.module.exports, template: parsed.template.content };
}

const stored = new Map();
const block = loadComponent('block-editor/components/default-blocks/publii-code/block.vue', {
    AvailableConversions: [],
    Block: {},
    ConfigForm: [],
    ContentEditableImprovements: {},
    TopMenuUI: {},
    codeLanguages,
    localStorage: {
        getItem: key => stored.has(key) ? stored.get(key) : null,
        setItem: (key, value) => stored.set(key, String(value))
    }
});
const menu = loadComponent('block-editor/components/helpers/TopMenuUI.vue', {
    EditorIcon: {},
    vSelect: {}
});

function createCodeBlock() {
    const context = {
        id: 'test-code',
        getAdvancedConfigDefaultValue: () => '',
        $t: key => key === 'editor.blocks.code.plainText' ? 'Zwykły tekst' : key
    };

    for (const [name, method] of Object.entries(block.options.methods)) {
        context[name] = method.bind(context);
    }

    Object.assign(context, block.options.data.call(context));
    context.availableLanguages = block.options.computed.availableLanguages.call(context);
    return context;
}

describe('Plain text code in both editors', function() {
    beforeEach(function() {
        stored.clear();
    });

    it('offers the same languages in WYSIWYG and the block editor, including plain text', function() {
        const source = fs.readFileSync(path.join(__dirname, '../configs/postEditor.config.js'), 'utf8');
        const scope = { module: { exports: {} }, codeLanguages };
        vm.runInNewContext(source.replace(/^import .*?;\s*$/gm, '')
            .replace('export default', 'module.exports ='), scope);
        const wysiwyg = scope.module.exports.codesample_languages;
        const blockLanguages = block.options.computed.availableLanguages();

        assert.equal(wysiwyg, codeLanguages);
        assert.deepEqual(codeLanguages[0], { text: 'Plain text', value: 'none' });
        assert.equal(new Set(codeLanguages.map(language => language.value)).size, 65);
        assert.deepEqual(Array.from(blockLanguages), codeLanguages.map(language => {
            return language.value === 'markup' ? 'xml' : language.value;
        }));
    });

    it('defaults new code to plain text and remembers the selected language', function() {
        assert.equal(block.options.methods.getLastSelectedLanguage(), 'none');

        for (const language of ['none', 'javascript', 'xml']) {
            block.options.watch['config.language'].call({}, language);
            assert.equal(block.options.methods.getLastSelectedLanguage(), language);
        }

        const context = { config: { language: null } };
        block.options.watch['config.language'].call(context, null);
        assert.equal(context.config.language, 'none');

        for (const legacyValue of ['', 'null', 'undefined']) {
            stored.set('block-editor-last-selected-language', legacyValue);
            assert.equal(block.options.methods.getLastSelectedLanguage(), 'none');
        }
    });

    it('shows a translated plain text label without changing the stored value', function() {
        const data = createCodeBlock();
        const select = data.topMenuConfig[0];

        assert.equal(select.allowEmpty, false);
        assert.equal(select.customLabel('none'), 'Zwykły tekst');
        assert.equal(select.customLabel('javascript'), 'JavaScript');
        assert.equal(data.config.language, 'none');
    });

    it('uses the WYSIWYG display names while retaining block language identifiers', function() {
        const data = createCodeBlock();

        for (const language of codeLanguages) {
            const value = language.value === 'markup' ? 'xml' : language.value;
            const label = language.value === 'none' ? 'Zwykły tekst' : language.text;

            assert.equal(data.getLanguageLabel(value), label);
        }

        assert.equal(data.getLanguageLabel('future-language'), 'future-language');
        assert.equal(data.getLanguageLabel(null), '');
    });

    for (const [query, expected] of [
        ['cpp', 'cpp'],
        ['C++', 'cpp'],
        ['  c++  ', 'cpp'],
        ['csharp', 'csharp'],
        ['C#', 'csharp'],
        ['Apache Configuration', 'apacheconf'],
        ['apacheconf', 'apacheconf'],
        ['ASP.NET', 'aspnet'],
        ['aspnet', 'aspnet'],
        ['xml', 'xml'],
        ['markup', 'xml'],
        ['none', 'none'],
        ['Plain text', 'none'],
        ['Zwykły tekst', 'none']
    ]) {
        it('finds the language by its display name or identifier: ' + query, function() {
            const data = createCodeBlock();
            const select = data.topMenuConfig[0];

            menu.options.methods.handleSelectSearch(select, query);

            assert.deepEqual(Array.from(select.options), [expected]);
            assert.equal(data.config.language, 'none');
        });
    }

    it('restores all languages after clearing the search, with plain text first', function() {
        const data = createCodeBlock();

        data.filterLanguages('no-matching-language');
        assert.equal(data.topMenuConfig[0].options.length, 0);
        data.filterLanguages('');
        assert.deepEqual(Array.from(data.topMenuConfig[0].options), Array.from(data.availableLanguages));
        assert.equal(data.topMenuConfig[0].options[0], 'none');
    });

    it('does not filter or relabel the gallery selector', function() {
        const selector = {
            type: 'select',
            options: [1, 2, 3, 4],
            searchable: false
        };

        menu.options.methods.handleSelectSearch(selector, '2');
        assert.deepEqual(selector.options, [1, 2, 3, 4]);
        assert.equal(selector.customLabel, undefined);
        assert.equal(selector.internalSearch, undefined);
        assert.equal(selector.showSelectedIcon, undefined);
    });

    it('compiles the code block and the shared menu with optional language labels', function() {
        for (const component of [block, menu]) {
            assert.deepEqual(compiler.compile(component.template).errors, []);
        }
    });

    for (const language of ['none', 'javascript', 'xml', null]) {
        it('renders literal code and entities without changing the text: ' + language, function() {
            const html = renderCode({
                config: { language, advanced: { id: 'sample', cssClasses: '' } },
                content: '\t<tag>&lt; &amp; a > b\n  end'
            });
            const expectedLanguage = language === 'xml' ? 'markup' : language || 'none';

            assert.ok(html.includes('language-' + expectedLanguage));
            assert.ok(html.includes('<code>\t&lt;tag&gt;&amp;lt; &amp;amp; a &gt; b\n  end</code>'));
            assert.ok(html.includes('id="sample"'));
        });
    }

    it('provides matching translations for both editors', function() {
        for (const language of ['en-gb', 'pl', 'de']) {
            const base = path.join(__dirname, '../../../default-files/default-languages', language);
            const translations = JSON.parse(fs.readFileSync(path.join(base, 'translations.json'), 'utf8'));
            const wysiwyg = JSON.parse(fs.readFileSync(path.join(base, 'wysiwyg.json'), 'utf8'));

            assert.ok(translations.editor.blocks.code.plainText);
            assert.equal(wysiwyg['Plain text'], translations.editor.blocks.code.plainText);
        }
    });
});
