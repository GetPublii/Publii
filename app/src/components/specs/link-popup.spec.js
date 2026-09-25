/*
 * Regression tests for shared link dialogs and mini WYSIWYG integration.
 * Uses mocked editor/Electron APIs and in-memory renderer data; no site is modified.
 * Included in the full suite: npm test
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const repo = path.resolve(__dirname, '../../../..');
const appRequire = createRequire(path.join(repo, 'app/package.json'));
const Vue = appRequire('vue');
const compiler = appRequire('vue-template-compiler');
const escapeContext = { module: { exports: {} } };
const escapeSource = fs.readFileSync(path.join(repo, 'app/src/helpers/escape-html.js'), 'utf8');
vm.runInNewContext(escapeSource.replace('export default', 'module.exports ='), escapeContext);
const escapeHTML = escapeContext.module.exports;

function loadComponent(name, globals = {}) {
    const source = fs.readFileSync(path.join(repo, 'app/src/components', name + '.vue'), 'utf8');
    const parsed = compiler.parseComponent(source);
    const compiled = compiler.compile(parsed.template.content);
    assert.deepEqual(compiled.errors, []);
    const context = { module: { exports: {} }, escapeHTML, ...globals };
    vm.runInNewContext(parsed.script.content.replace(/^import .*;\s*$/gm, '').replace('export default', 'module.exports ='), context);
    return {
        ...context.module.exports,
        render: new Function(compiled.render),
        staticRenderFns: compiled.staticRenderFns.map(code => new Function(code))
    };
}
function popup(local = true, markdown = false) {
    const inserted = [], events = [], callbacks = {};
    const body = { appendChild() {} };
    const bus = new Vue();
    bus.$on('link-popup-updated', result => events.push(result));
    const definition = loadComponent('post-editor/LinkPopup', {
        mainProcessAPI: { send() {}, receiveOnce: (name, cb) => { callbacks[name] = cb; } },
        document: { body },
        $: () => ({ css: () => 'none' }),
        hugerte: { activeEditor: { selection: { setContent: html => inserted.push(html) } } }
    });
    const instance = new Vue({ ...definition, propsData: { local, markdown } });
    instance.$bus = bus;
    instance.$t = key => key;
    instance.$store = { state: { currentSite: {
        config: { name: 'demo' },
        posts: [{ id: 12, title: 'Published post', status: 'published' }, { id: 13, title: 'Draft', status: 'draft' }],
        pages: [{ id: 21, title: 'Published page', status: 'published' }],
        tags: [{ id: 7, name: 'Visible tag', additionalData: '{}' }, { id: 8, name: 'Hidden', additionalData: '{"isHidden":true}' }],
        authors: [{ username: 'anna-nowak', name: 'Anna Nowak' }]
    } } };
    instance.filesList = ['media/files/guide.pdf'];
    instance.$nextTick = () => {};
    definition.mounted.call(instance);
    return { instance, definition, bus, events, inserted, callbacks };
}

describe('Shared link popup', () => {
    it('focuses the dialog without opening its first select', () => {
        const { instance: p } = popup();
        let focused = false;
        p.$refs.dialog = { focus: () => { focused = true; } };
        p.$nextTick = callback => callback();
        p.open({ label: 'Selected text' });
        assert.equal(focused, true);
        // The dialog has no querySelector here: focusing its first control would fail.
    });

    it('keeps local dialogs out of the legacy event bus, including teardown', () => {
        const { instance: p, definition, bus, events } = popup();
        let result;
        p.$on('resolve', value => { result = value; });
        bus.$emit('init-link-popup', { selection: 'Legacy selection' });
        assert.equal(p.isVisible, false);
        p.open({ label: 'Mini selection' });
        p.external = 'https://example.test';
        p.setLink();
        assert.equal(result.text, 'Mini selection');
        assert.equal(events.length, 0);
        p.$el = { parentNode: null };
        definition.beforeDestroy.call(p);
        bus.$emit('link-popup-updated', false);
        assert.equal(events.length, 1);
    });
    it('retains WYSIWYG insertion and removes only its own listeners', () => {
        const { instance: p, definition, bus, inserted } = popup(false);
        let otherOpens = 0;
        bus.$on('init-link-popup', () => otherOpens++);
        bus.$emit('init-link-popup', { postID: 12, selection: 'Legacy selection' });
        p.external = 'https://example.test';
        p.setLink();
        assert.deepEqual(inserted, ['<a href="https://example.test">Legacy selection</a>']);
        definition.beforeDestroy.call(p);
        bus.$emit('init-link-popup', {});
        assert.equal(otherOpens, 2);
    });
    it('retains Markdown insertion', () => {
        const { instance: p, bus } = popup(false, true);
        let result;
        p.easymdeInstance = { codemirror: { replaceSelections: value => { result = value[0]; } } };
        bus.$emit('init-link-popup', { selection: '[Read more](https://example.test)' });
        p.setLink();
        assert.equal(result, '[Read more](https://example.test)');
    });
    for (const type of ['post', 'page', 'tag', 'tags', 'author', 'frontpage', 'blogpage', 'file']) {
        it(`creates and reopens a ${type} link`, () => {
            const { instance: p } = popup();
            const values = { post: 12, page: 21, tag: 7, author: 'anna-nowak', file: 'media/files/guide.pdf' };
            p.open({ label: 'Read more' });
            p.type = type;
            if (type in values) p[type] = values[type];
            let result;
            p.$on('resolve', value => { result = value; });
            p.setLink();
            assert.equal(result.url, '#INTERNAL_LINK#/' + type + '/' + (values[type] || 1));
            p.open({ label: result.text, attributes: result.attributes });
            assert.equal(p.type, type);
            if (type in values) assert.equal(p[type], values[type]);
        });
    }
    for (const type of ['post', 'page', 'tag', 'tags', 'author', 'frontpage', 'blogpage', 'file']) {
        it(`keeps external URLs containing /${type}/ external`, () => {
            const { instance: p } = popup(false);
            const url = `https://example.test/${type}/123`;
            p.parseUrlContent(['', url]);
            assert.equal(p.type, 'external');
            assert.equal(p.external, url);
        });
    }
    it('filters draft posts and hidden tags and does not accept missing targets', () => {
        const { instance: p } = popup();
        assert.equal(p.postPages.join(','), '12');
        assert.equal(p.tagPages.join(','), '7');
        let resolves = 0;
        p.$on('resolve', () => resolves++);
        for (const type of ['external', 'post', 'page', 'tag', 'author', 'file']) {
            p.type = type;
            assert.equal(p.canSubmit, false);
            p.setLink();
        }
        assert.equal(resolves, 0);
    });
    it('uses the chosen content title when linking without a selection', () => {
        const { instance: p } = popup();
        let result;
        p.$on('resolve', value => { result = value; });
        p.type = 'post'; p.post = 12; p.setLink();
        assert.equal(result.text, 'Published post');
    });
    it('escapes titles in the HTML response used by every WYSIWYG link toolbar', () => {
        const { instance: p, inserted, events } = popup(false);
        p.open({ selection: 'the' });
        p.external = 'aasd';
        p.title = '"guide" & <details>';
        p.setLink();

        assert.equal(events[0].title, ' title="&quot;guide&quot; &amp; &lt;details&gt;"');
        assert.deepEqual(inserted, [
            '<a href="aasd" title="&quot;guide&quot; &amp; &lt;details&gt;">the</a>'
        ]);
    });

    it('preserves literal entity text in a title', () => {
        const { instance: p, inserted } = popup(false);
        p.open({ selection: 'Example' });
        p.external = 'https://example.test';
        p.title = 'Use &quot; in HTML';
        p.setLink();

        assert.deepEqual(inserted, [
            '<a href="https://example.test" title="Use &amp;quot; in HTML">Example</a>'
        ]);
    });

    it('preserves raw attribute values and clears state after cancel', () => {
        const { instance: p, events } = popup();
        const title = 'A "quote" & more';
        p.open({ label: 'Example', attributes: { href: 'https://example.test', title, class: 'special', rel: 'ugc nofollow', target: '_blank', download: null } });
        let result;
        p.$on('resolve', value => { result = value; });
        p.setLink();
        assert.equal(result.attributes.title, title);
        assert.equal(result.attributes.rel, 'nofollow ugc noopener noreferrer');
        assert.equal(result.attributes.download, null);
        p.open({ label: 'New link' });
        assert.equal(p.title, '');
        assert.equal(p.target, '');
        assert.equal(p.rel.ugc, false);
        p.cancel();
        assert.equal(result, false);
        assert.equal(events.length, 0);
    });
});


function submitDisabled(instance) {
    function nodes(node) {
        return [node, ...(node.children || []).flatMap(nodes)];
    }
    const button = nodes(instance._render()).find(node =>
        node.data && node.data.attrs && Object.hasOwn(node.data.attrs, 'disabled')
    );
    assert.ok(button, 'Popup renders its submit button');
    return button.data.attrs.disabled;
}

describe('Link validation in mini editors, WYSIWYG and Markdown', () => {
    const targets = { external: 'https://example.test', post: 12, page: 21, tag: 7, author: 'anna-nowak', file: 'media/files/guide.pdf' };
    for (const [mode, local, markdown] of [['mini', true, false], ['WYSIWYG', false, false], ['Markdown', false, true]]) {
        function setup() {
            const state = popup(local, markdown);
            const p = state.instance;
            const results = [];
            p.$on('resolve', result => results.push(result));
            state.bus.$on('link-popup-updated', result => results.push(result));
            if (markdown) p.easymdeInstance = { codemirror: { replaceSelections: values => state.inserted.push(values[0]) } };
            p.open({ label: 'Read more', selection: 'Read more' });
            return { ...state, results };
        }
        for (const [type, target] of Object.entries(targets)) {
            it(`${mode}: requires a ${type} target and disables submit again after clearing it`, () => {
                const { instance: p, results, inserted } = setup();
                p.type = type;
                assert.equal(submitDisabled(p), true);
                p.setLink();
                assert.equal(p.isVisible, true);
                assert.equal(results.length, 0);
                assert.equal(inserted.length, 0);
                p[type] = target;
                assert.equal(submitDisabled(p), false);
                p[type] = type === 'external' ? '   ' : null;
                assert.equal(submitDisabled(p), true);
                p.setLink();
                assert.equal(results.length, 0);
                p[type] = target;
                p.setLink();
                assert.equal(p.isVisible, false);
                assert.equal(results.length, 1);
                const expected = type === 'external' ? target : '#INTERNAL_LINK#/' + type + '/' + target;
                assert.equal(results[0].url, expected);
                if (!local) assert.ok(inserted[0].includes(expected));
            });
        }
        for (const type of ['tags', 'frontpage', 'blogpage']) {
            it(`${mode}: allows ${type} without a secondary selection`, () => {
                const { instance: p, results } = setup();
                p.type = type;
                assert.equal(submitDisabled(p), false);
                p.setLink();
                assert.equal(results[0].url, '#INTERNAL_LINK#/' + type + '/1');
            });
        }
        it(`${mode}: blocks previously saved /null markers until a valid target is selected`, () => {
            const { instance: p, results } = setup();
            for (const type of ['post', 'page', 'tag', 'author', 'file']) {
                p.cleanPopup();
                p.parseUrlContent(['', '#INTERNAL_LINK#/' + type + '/null']);
                assert.equal(submitDisabled(p), true, type);
                p.setLink();
                assert.equal(results.length, 0, type);
                p[type] = targets[type];
                assert.equal(submitDisabled(p), false, type);
            }
        });
        it(`${mode}: blocks deleted/unavailable targets and empty option lists`, () => {
            const { instance: p, results } = setup();
            for (const type of ['post', 'page', 'tag', 'author', 'file']) {
                p.type = type;
                p[type] = typeof targets[type] === 'number' ? 99999 : 'missing-target';
                assert.equal(submitDisabled(p), true, type);
                p.setLink();
            }
            p.type = 'file'; p.file = targets.file; p.filesList = [];
            assert.equal(submitDisabled(p), true);
            assert.equal(results.length, 0);
        });
    }
});

describe('Mini editor selection ownership', () => {
    const context = { module: { exports: {} } };
    const source = fs.readFileSync(path.join(repo, 'app/src/helpers/mini-editor-link.js'), 'utf8');
    vm.runInNewContext(source.replace('export function createMiniEditorLinkSession', 'module.exports = function createMiniEditorLinkSession'), context);
    const createSession = context.module.exports;
    function editor() {
        const calls = [];
        const bookmark = { id: 'selection' };

        return {
            calls,
            dom: {
                getParent: () => null,
                encode: value => value.replace(/</g, '&lt;'),
                createHTML: (tag, attributes, html) => `<a href="${attributes.href}">${html}</a>`
            },
            selection: {
                getNode() {},
                getBookmark: () => bookmark,
                getContent: options => options ? 'Bold' : '<strong>Bold</strong>',
                isCollapsed: () => false,
                moveToBookmark: value => {
                    assert.equal(value, bookmark);
                    calls.push('restore');
                }
            },
            undoManager: {
                transact: callback => {
                    calls.push('undo');
                    callback();
                }
            },
            focus: () => calls.push('focus'),
            execCommand: (command, ui, attributes) => {
                assert.equal(command, 'mceInsertLink');
                assert.equal(ui, false);
                calls.push({ command, attributes: { ...attributes } });
            },
            insertContent: html => calls.push(html),
            nodeChanged() {},
            getContent: () => 'saved content'
        };
    }

    it('restores the originating selection and applies a native link in one undo transaction', () => {
        const first = editor();
        const second = editor();
        const session = createSession(first);
        second.focus();
        session.finish({ text: 'Bold', url: '/page', attributes: { href: '/page' } });

        assert.deepEqual(first.calls, [
            'focus',
            'restore',
            'undo',
            { command: 'mceInsertLink', attributes: { href: '/page' } }
        ]);
        assert.deepEqual(second.calls, ['focus']);
        session.finish(false);
        assert.equal(first.calls.length, 4);
    });

    it('keeps formatting outside the serialized selection instead of replacing that selection', () => {
        const target = editor();
        const formattedNode = {
            innerHTML: '<strong><em><span style="text-decoration: underline;"><s>Formatted</s></span></em></strong>'
        };
        target.selection.getNode = () => formattedNode;
        // A range inside the innermost text node contains none of its formatting wrappers.
        target.selection.getContent = () => 'Formatted';
        target.insertContent = () => assert.fail('Adding a link must not replace the formatted selection');
        const originalHTML = formattedNode.innerHTML;
        const attributes = {
            href: '#INTERNAL_LINK#/page/21',
            title: 'A formatted link',
            class: 'custom-link',
            target: '_blank',
            rel: 'nofollow noopener noreferrer',
            download: null
        };
        const session = createSession(target);
        session.finish({ text: 'Formatted', url: attributes.href, attributes });

        assert.equal(formattedNode.innerHTML, originalHTML);
        assert.deepEqual(target.calls, [
            'focus',
            'restore',
            'undo',
            { command: 'mceInsertLink', attributes }
        ]);
        assert.notEqual(target.calls[3].attributes, attributes);
    });

    it('inserts a label at a collapsed caret without applying a link to an empty range', () => {
        const target = editor();
        target.selection.getContent = () => '';
        target.selection.isCollapsed = () => true;
        createSession(target).finish({ text: 'New link', url: '/page', attributes: { href: '/page' } });

        assert.deepEqual(target.calls, ['focus', 'restore', 'undo', '<a href="/page">New link</a>']);
    });

    it('cancels without changing content or undo history', () => {
        const e = editor();
        createSession(e).finish(false);
        assert.deepEqual(e.calls, ['focus', 'restore']);
    });
    it('escapes a changed label instead of treating it as HTML', () => {
        const e = editor();
        createSession(e).finish({ text: '<img>', url: '/page', attributes: { href: '/page' } });
        assert.equal(e.calls[3], '<a href="/page">&lt;img></a>');
    });
    it('ignores a response after the originating editor was removed', () => {
        const e = editor(), session = createSession(e);
        e.removed = true;
        session.finish({});
        assert.deepEqual(e.calls, []);
    });

    it('edits only the original link and preserves its formatting after another editor gains focus', () => {
        const first = editor();
        const second = editor();
        const attributes = {
            href: '#INTERNAL_LINK#/page/21',
            title: 'Original title',
            class: 'original-class'
        };
        const link = {
            innerHTML: '<strong>Bold</strong>',
            outerHTML: '<a href="#INTERNAL_LINK#/page/21"><strong>Bold</strong></a>',
            textContent: 'Bold',
            getAttribute: name => attributes[name] || null
        };

        first.dom.getParent = () => link;
        first.dom.setAttribs = (target, updatedAttributes) => {
            assert.equal(target, link);
            Object.assign(attributes, updatedAttributes);
        };
        first.getBody = () => ({ contains: target => target === link });
        first.selection.select = target => assert.equal(target, link);
        first.selection.collapse = atStart => assert.equal(atStart, false);

        const session = createSession(first);
        const { instance: dialog } = popup();
        dialog.$on('resolve', response => session.finish(response));
        dialog.open(session.config);

        assert.equal(dialog.type, 'page');
        assert.equal(dialog.page, 21);
        assert.equal(dialog.label, 'Bold');
        second.focus();
        dialog.type = 'author';
        dialog.author = 'anna-nowak';
        dialog.title = 'Updated title';
        dialog.setLink();

        assert.equal(attributes.href, '#INTERNAL_LINK#/author/anna-nowak');
        assert.equal(attributes.title, 'Updated title');
        assert.equal(attributes.class, 'original-class');
        assert.equal(link.innerHTML, '<strong>Bold</strong>');
        assert.deepEqual(first.calls, ['focus', 'restore', 'undo']);
        assert.deepEqual(second.calls, ['focus']);
    });

    it('keeps inserted links and cancelled dialogs isolated across multiple WYSIWYG fields', () => {
        const definition = loadComponent('basic-elements/TextArea', {
            Vue,
            LinkPopup: {},
            createMiniEditorLinkSession: createSession
        });

        function createField(value) {
            const instance = new Vue({
                ...definition,
                propsData: {
                    value,
                    wysiwyg: true,
                    internalLinks: true,
                    selectionToolbar: true
                }
            });
            const targetEditor = editor();
            targetEditor.dispatch = event => targetEditor.calls.push(event);
            const { instance: dialog } = popup();
            const originalInsertContent = targetEditor.insertContent;
            const originalExecCommand = targetEditor.execCommand;
            let savedContent = value;

            targetEditor.getContent = () => savedContent;
            targetEditor.insertContent = html => {
                originalInsertContent(html);
                savedContent = html;
            };
            targetEditor.execCommand = (command, ui, attributes) => {
                originalExecCommand(command, ui, attributes);
                savedContent = `<a href="${attributes.href}"><strong>Bold</strong></a>`;
            };
            instance.$refs.linkPopup = dialog;
            dialog.$on('resolve', instance.resolveLinkPopup);

            return { instance, targetEditor, dialog };
        }

        const first = createField('<p>First field</p>');
        const second = createField('<p>Second field</p>');

        first.instance.openLinkPopup(first.targetEditor);
        assert.equal(first.dialog.isVisible, true);
        assert.equal(second.dialog.isVisible, false);
        assert.deepEqual(first.targetEditor.calls, ['contexttoolbar-hide']);
        assert.deepEqual(second.targetEditor.calls, []);
        second.targetEditor.focus();
        first.dialog.type = 'page';
        first.dialog.page = 21;
        first.dialog.setLink();

        const firstSavedContent = first.instance.content;
        assert.equal(firstSavedContent, '<a href="#INTERNAL_LINK#/page/21"><strong>Bold</strong></a>');
        assert.equal(second.instance.content, '<p>Second field</p>');
        assert.equal(second.targetEditor.getContent(), '<p>Second field</p>');
        assert.equal(first.instance._linkSession, null);

        second.instance.openLinkPopup(second.targetEditor);
        first.targetEditor.focus();
        second.dialog.type = 'author';
        second.dialog.author = 'anna-nowak';
        second.dialog.setLink();

        const secondSavedContent = second.instance.content;
        assert.equal(secondSavedContent, '<a href="#INTERNAL_LINK#/author/anna-nowak"><strong>Bold</strong></a>');
        assert.equal(first.instance.content, firstSavedContent);
        assert.equal(first.targetEditor.getContent(), firstSavedContent);
        assert.equal(second.instance._linkSession, null);

        first.instance.openLinkPopup(first.targetEditor);
        first.dialog.cancel();

        assert.equal(first.instance.content, firstSavedContent);
        assert.equal(second.instance.content, secondSavedContent);
        assert.equal(first.dialog.isVisible, false);
        assert.equal(second.dialog.isVisible, false);
        assert.equal(first.instance._linkSession, null);
        assert.equal(first.targetEditor.calls.filter(call => call === 'undo').length, 1);
        assert.equal(second.targetEditor.calls.filter(call => call === 'undo').length, 1);
    });
});

describe('Internal links in saved tag and author descriptions', () => {
    const RendererCache = require(path.join(repo, 'app/back-end/modules/render-html/renderer-cache'));
    for (const previewMode of [false, true]) {
        it(`resolves all internal link types with preview=${previewMode}`, () => {
            const markers = ['post/12', 'page/21', 'tag/7', 'tags/1', 'author/anna-nowak', 'frontpage/1', 'blogpage/1', 'file/media/files/guide.pdf'];
            const description = markers.map(marker => `<a href="#INTERNAL_LINK#/${marker}">Read</a>`).join('');
            const renderer = { previewMode, siteConfig: { domain: 'https://example.test', advanced: { urls: { tagsPrefix: 'tags' } } }, cachedItems: {
                posts: { 12: { url: 'https://example.test/post/' } }, pages: { 21: { url: 'https://example.test/page/' } },
                tags: { 7: { url: 'https://example.test/tag/', description } },
                authors: { 1: { username: 'anna-nowak', url: 'https://example.test/author/', description } }
            } };
            new RendererCache(renderer, {}).setInternalLinks([], []);
            for (const item of [renderer.cachedItems.tags[7], renderer.cachedItems.authors[1]]) {
                assert.ok(!item.description.includes('#INTERNAL_LINK#'));
                assert.equal((item.description.match(/href="https:\/\/example.test/g) || []).length, 8);
                assert.ok(item.description.includes('media/files/guide.pdf'));
            }
        });
    }
});


describe('Mini editor opt-in', () => {
    for (const internalLinks of [false, true]) {
        for (const simplifiedToolbar of [false, true]) {
            for (const selectionToolbar of [undefined, false, true]) {
                it(`routes link commands and selection menus only when enabled: internal=${internalLinks}, simplified=${simplifiedToolbar}, selection=${selectionToolbar}`, async () => {
                    let configuration;
                    let registeredToolbar;
                    const definition = loadComponent('basic-elements/TextArea', {
                        Vue,
                        LinkPopup: {},
                        Utils: { debouncedFunction: callback => callback },
                        hugerte: {
                            init: config => {
                                configuration = config;
                            }
                        },
                        registerMiniEditorSelectionToolbar: (editor, options) => {
                            registeredToolbar = { editor, options };
                        }
                    });
                    const instance = new Vue({
                        ...definition,
                        propsData: { internalLinks, simplifiedToolbar, selectionToolbar }
                    });
                    instance.$store = { state: { currentSite: { config: {} } } };
                    instance.$t = key => key;
                    instance.loadCustomFormatsFromTheme = () => [];
                    instance.getTinyMCECSSFiles = () => '';
                    await instance.initWysiwyg();

                    const handlers = {};
                    const buttons = {};
                    const editor = {
                        ui: {
                            registry: {
                                addButton: (name, settings) => {
                                    buttons[name] = settings;
                                }
                            }
                        },
                        on: (event, handler) => {
                            handlers[event] = handler;
                        },
                        getContent: () => '<a href="#INTERNAL_LINK#/post/12">Saved</a>'
                    };
                    await configuration.setup(editor);

                    assert.equal(configuration.toolbar1.split(' ').includes('publiilink'), internalLinks);
                    assert.equal(configuration.toolbar1.split(' ').includes('link'), !internalLinks);
                    assert.ok(configuration.plugins.split(' ').includes('link'));

                    if (selectionToolbar) {
                        assert.equal(registeredToolbar.editor, editor);
                        assert.equal(registeredToolbar.options.internalLinks, internalLinks);
                        assert.equal(registeredToolbar.options.isLinkDialogOpen(), false);
                        instance._linkSession = {};
                        assert.equal(registeredToolbar.options.isLinkDialogOpen(), true);
                        instance._linkSession = null;
                    } else {
                        assert.equal(registeredToolbar, undefined);
                    }

                    if (internalLinks) {
                        let opened = 0;
                        let prevented = 0;
                        instance.openLinkPopup = target => {
                            assert.equal(target, editor);
                            opened++;
                        };
                        const preventDefault = () => prevented++;
                        buttons.publiilink.onAction();
                        handlers.BeforeExecCommand({ command: 'mceLink', preventDefault });
                        handlers.BeforeExecCommand({ command: 'Bold', preventDefault });

                        assert.equal(opened, 2);
                        assert.equal(prevented, 1);
                        handlers['change undo redo']();
                        assert.equal(instance.content, editor.getContent());
                    } else {
                        assert.equal(handlers.BeforeExecCommand, undefined);
                        assert.equal(buttons.publiilink, undefined);
                    }
                });
            }
        }
    }
});

describe('Block editor link popup', () => {
    function blockPopup(url) {
        const definition = loadComponent('block-editor/components/BlockLinkPopup', { Switcher: {}, LinkHelpers: {}, vSelect: {} });
        const instance = new Vue({ ...definition });
        instance.show('block-1', { url, title: '', cssClass: '' });
        return instance;
    }

    it('restores the author username when editing an author link', () => {
        const p = blockPopup('#INTERNAL_LINK#/author/anna-nowak');
        assert.equal(p.linkType, 'author');
        assert.equal(p.linkSelectedAuthor, 'anna-nowak');
        assert.equal(p.prepareLink(), '#INTERNAL_LINK#/author/anna-nowak');
    });

    it('detects the link type by the full marker prefix', () => {
        const cases = {
            '#INTERNAL_LINK#/post/12': ['post', 'linkSelectedPost', 12],
            '#INTERNAL_LINK#/page/21': ['page', 'linkSelectedPage', 21],
            '#INTERNAL_LINK#/tag/7': ['tag', 'linkSelectedTag', 7],
            '#INTERNAL_LINK#/file/media/files/post-tag-page.pdf': ['file', 'linkSelectedFile', 'media/files/post-tag-page.pdf']
        };
        for (const [url, [type, field, value]] of Object.entries(cases)) {
            const p = blockPopup(url);
            assert.equal(p.linkType, type, url);
            assert.equal(p[field], value, url);
            assert.equal(p.prepareLink(), url);
        }
    });

    it('keeps markers without a dedicated field and external URLs unchanged', () => {
        for (const url of ['#INTERNAL_LINK#/frontpage/1', '#INTERNAL_LINK#/tags/1', 'https://example.test/post/12', '']) {
            const p = blockPopup(url);
            assert.equal(p.linkType, 'external', url);
            assert.equal(p.prepareLink(), url, url);
        }
    });
});
