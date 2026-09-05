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

function loadComponent(name, globals = {}) {
    const source = fs.readFileSync(path.join(repo, 'app/src/components', name + '.vue'), 'utf8');
    const parsed = compiler.parseComponent(source);
    assert.deepEqual(compiler.compile(parsed.template.content).errors, []);
    const context = { module: { exports: {} }, ...globals };
    vm.runInNewContext(parsed.script.content.replace(/^import .*;\s*$/gm, '').replace('export default', 'module.exports ='), context);
    return context.module.exports;
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
        tinymce: { activeEditor: { selection: { setContent: html => inserted.push(html) } } }
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

describe('Mini editor selection ownership', () => {
    const context = { module: { exports: {} } };
    const source = fs.readFileSync(path.join(repo, 'app/src/helpers/mini-editor-link.js'), 'utf8');
    vm.runInNewContext(source.replace('export function createMiniEditorLinkSession', 'module.exports = function createMiniEditorLinkSession'), context);
    const createSession = context.module.exports;
    function editor() {
        const calls = [];
        const bookmark = { id: 'selection' };
        return { calls, dom: { getParent: () => null, encode: s => s.replace(/</g, '&lt;'), createHTML: (tag, attrs, html) => `<a href="${attrs.href}">${html}</a>` },
            selection: { getNode() {}, getBookmark: () => bookmark, getContent: options => options ? 'Bold' : '<strong>Bold</strong>', moveToBookmark: b => { assert.equal(b, bookmark); calls.push('restore'); } },
            undoManager: { transact: cb => { calls.push('undo'); cb(); } }, focus: () => calls.push('focus'),
            insertContent: html => calls.push(html), nodeChanged() {}, getContent: () => 'saved content'
        };
    }
    it('restores the originating selection and keeps formatting in one undo transaction', () => {
        const first = editor(), second = editor();
        const session = createSession(first);
        second.focus();
        session.finish({ text: 'Bold', url: '/page', attributes: { href: '/page' } });
        assert.deepEqual(first.calls, ['focus', 'restore', 'undo', '<a href="/page"><strong>Bold</strong></a>']);
        assert.deepEqual(second.calls, ['focus']);
        session.finish(false);
        assert.equal(first.calls.length, 4);
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
            it(`routes link commands only when enabled: internal=${internalLinks}, simplified=${simplifiedToolbar}`, async () => {
                let configuration;
                const definition = loadComponent('basic-elements/TextArea', {
                    Vue, LinkPopup: {}, Utils: { debouncedFunction: callback => callback },
                    tinymce: { init: config => { configuration = config; } }
                });
                const p = new Vue({ ...definition, propsData: { internalLinks, simplifiedToolbar } });
                p.$store = { state: { currentSite: { config: {} } } };
                p.$t = key => key;
                p.loadCustomFormatsFromTheme = () => [];
                p.getTinyMCECSSFiles = () => '';
                await p.initWysiwyg();
                const handlers = {}, buttons = {};
                const editor = {
                    ui: { registry: { addButton: (name, settings) => { buttons[name] = settings; } } },
                    on: (event, handler) => { handlers[event] = handler; },
                    getContent: () => '<a href="#INTERNAL_LINK#/post/12">Saved</a>'
                };
                await configuration.setup(editor);
                assert.equal(configuration.toolbar1.split(' ').includes('publiilink'), internalLinks);
                assert.equal(configuration.toolbar1.split(' ').includes('link'), !internalLinks);
                assert.ok(configuration.plugins.split(' ').includes('link')); // unlink and native shortcut remain available
                if (internalLinks) {
                    let opened = 0, prevented = 0;
                    p.openLinkPopup = target => { assert.equal(target, editor); opened++; };
                    buttons.publiilink.onAction();
                    handlers.BeforeExecCommand({ command: 'mceLink', preventDefault: () => prevented++ });
                    handlers.BeforeExecCommand({ command: 'Bold', preventDefault: () => prevented++ });
                    assert.equal(opened, 2);
                    assert.equal(prevented, 1);
                    handlers['change undo redo']();
                    assert.equal(p.content, editor.getContent());
                } else {
                    assert.equal(handlers.BeforeExecCommand, undefined);
                    assert.equal(buttons.publiilink, undefined);
                }
            });
        }
    }
});
