const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../mini-editor-toolbar.js'), 'utf8');
const context = {
    module: { exports: {} },
    Utils: require('../utils')
};
const executable = source
    .replace(/^import .*;\s*$/gm, '')
    .replace('export function registerMiniEditorSelectionToolbar', 'module.exports = function registerMiniEditorSelectionToolbar');
vm.runInNewContext(executable, context);
const registerToolbar = context.module.exports;

function createEditor(ownerDocument, internalLinks = true) {
    const events = {};
    const dispatched = [];
    const container = { ownerDocument };
    const body = {};
    const state = {
        readOnly: false,
        collapsed: false,
        editable: true,
        excluded: false,
        dialogOpen: false,
        text: 'Selected text',
        anchor: null
    };
    const toolbars = {};
    const buttons = {};
    const opened = [];
    const editor = {
        ui: {
            registry: {
                addContextToolbar: (name, configuration) => {
                    toolbars[name] = configuration;
                },
                addButton: (name, configuration) => {
                    buttons[name] = configuration;
                }
            }
        },
        mode: { isReadOnly: () => state.readOnly },
        selection: {
            isCollapsed: () => state.collapsed,
            getNode: () => state.anchor || {},
            getContent: options => {
                assert.equal(options.format, 'text');
                return state.text;
            }
        },
        dom: {
            isEditable: () => state.editable,
            getParent: (node, selector, root) => {
                assert.equal(root, body);
                return selector === 'a[href]' ? state.anchor : (state.excluded ? {} : null);
            }
        },
        getBody: () => body,
        getContainer: () => container,
        on: (name, callback) => {
            events[name] = callback;
        },
        off: (name, callback) => {
            assert.equal(events[name], callback);
            delete events[name];
        },
        dispatch: name => dispatched.push(name)
    };

    registerToolbar(editor, {
        internalLinks,
        isLinkDialogOpen: () => state.dialogOpen,
        translate: key => key,
        openExternal: url => opened.push(url)
    });

    return {
        toolbar: toolbars['publii-mini-selection'],
        linkToolbar: toolbars['publii-mini-link'],
        buttons,
        opened,
        state,
        editor,
        events,
        container,
        dispatched
    };
}

describe('Mini editor selection toolbar', () => {
    it('provides native formatting controls and the shared link button for a text selection', () => {
        const { toolbar } = createEditor();

        assert.equal(toolbar.predicate({}), true);
        assert.equal(toolbar.scope, 'editor');
        assert.equal(toolbar.position, 'selection');
        assert.equal(toolbar.items, 'bold italic underline strikethrough publiilink unlink');
    });

    for (const [property, value] of [
        ['readOnly', true],
        ['collapsed', true],
        ['editable', false],
        ['excluded', true],
        ['dialogOpen', true],
        ['text', ' \n ']
    ]) {
        it(`does not show controls when ${property} is ${JSON.stringify(value)}`, () => {
            const { toolbar, state } = createEditor();
            state[property] = value;

            assert.equal(toolbar.predicate({}), false);
        });
    }

    it('keeps selection and popup state separate for multiple editors', () => {
        const first = createEditor();
        const second = createEditor();
        first.state.dialogOpen = true;

        assert.equal(first.toolbar.predicate({}), false);
        assert.equal(second.toolbar.predicate({}), true);
        first.state.dialogOpen = false;
        second.state.collapsed = true;

        assert.equal(first.toolbar.predicate({}), true);
        assert.equal(second.toolbar.predicate({}), false);
    });

    it('hides only the affected editor toolbar on ancestor scroll and removes its listener on teardown', () => {
        const listeners = new Set();
        const ownerDocument = {
            addEventListener: (name, listener, capture) => {
                assert.equal(name, 'scroll');
                assert.equal(capture, true);
                listeners.add(listener);
            },
            removeEventListener: (name, listener, capture) => {
                assert.equal(name, 'scroll');
                assert.equal(capture, true);
                listeners.delete(listener);
            }
        };
        const first = createEditor(ownerDocument);
        const second = createEditor(ownerDocument);
        first.events.init();
        second.events.init();

        const scrollEvent = { target: { contains: node => node === first.container } };
        listeners.forEach(listener => listener(scrollEvent));

        assert.deepEqual(first.dispatched, ['contexttoolbar-hide']);
        assert.deepEqual(second.dispatched, []);
        first.events.remove();
        assert.equal(listeners.size, 1);
        listeners.forEach(listener => listener(scrollEvent));
        assert.deepEqual(first.dispatched, ['contexttoolbar-hide']);
        second.events.remove();
        assert.equal(listeners.size, 0);
    });
});

function linkNode(href) {
    return {
        nodeName: 'A',
        hasAttribute: name => name === 'href' && href !== null,
        getAttribute: name => name === 'href' ? href : null
    };
}

describe('Mini editor link toolbar', () => {
    for (const internalLinks of [false, true]) {
        it(`shows link actions at the caret without mixing selection controls: internal=${internalLinks}`, () => {
            const { toolbar, linkToolbar, state } = createEditor(undefined, internalLinks);
            const anchor = linkNode('https://getpublii.com/');
            state.collapsed = true;

            assert.equal(linkToolbar.scope, 'node');
            assert.equal(linkToolbar.position, 'node');
            assert.equal(linkToolbar.items, (internalLinks ? 'publiilink' : 'link') + ' unlink publiiminipreview');
            assert.equal(linkToolbar.predicate(anchor), true);
            assert.equal(toolbar.predicate(anchor), false);

            state.collapsed = false;
            assert.equal(linkToolbar.predicate(anchor), false);
            assert.equal(toolbar.predicate(anchor), true);
        });
    }

    it('does not show link actions for plain text, named anchors, read-only content or an open dialog', () => {
        const { linkToolbar, state } = createEditor();
        const anchor = linkNode('https://getpublii.com/');
        state.collapsed = true;

        assert.equal(linkToolbar.predicate({ nodeName: 'P' }), false);
        assert.equal(linkToolbar.predicate(linkNode(null)), false);

        for (const property of ['readOnly', 'dialogOpen']) {
            state[property] = true;
            assert.equal(linkToolbar.predicate(anchor), false);
            state[property] = false;
        }

        state.editable = false;
        assert.equal(linkToolbar.predicate(anchor), false);
    });

    it('previews the current link from its own editor and removes its state listener', () => {
        const first = createEditor();
        const second = createEditor();
        first.state.anchor = linkNode('https://getpublii.com/docs/');
        second.state.anchor = linkNode('https://example.com/');
        const preview = first.buttons.publiiminipreview;
        let enabled;
        const teardown = preview.onSetup({
            setEnabled: value => {
                enabled = value;
            }
        });

        assert.equal(preview.icon, 'preview');
        assert.equal(preview.tooltip, 'link.previewLinkInBrowser');
        assert.equal(enabled, true);
        preview.onAction();
        assert.deepEqual(first.opened, ['https://getpublii.com/docs/']);
        assert.deepEqual(second.opened, []);
        assert.deepEqual(first.dispatched, ['contexttoolbar-hide']);
        assert.deepEqual(second.dispatched, []);

        first.state.anchor = null;
        first.events.NodeChange();
        assert.equal(enabled, false);
        preview.onAction();
        assert.equal(first.opened.length, 1);
        teardown();
        assert.equal(first.events.NodeChange, undefined);
    });

    for (const href of [
        '#INTERNAL_LINK#/post/12',
        '#INTERNAL_LINK#/page/21',
        '#INTERNAL_LINK#/tag/7',
        '#INTERNAL_LINK#/author/anna',
        '#INTERNAL_LINK#/file/media/files/guide.pdf',
        '#section',
        '/relative/path/',
        '',
        'javascript:alert(1)',
        'data:text/html,test',
        'not a url'
    ]) {
        it(`disables preview and does not open ${JSON.stringify(href)}`, () => {
            const { state, buttons, opened } = createEditor();
            state.anchor = linkNode(href);
            let enabled;
            buttons.publiiminipreview.onSetup({
                setEnabled: value => {
                    enabled = value;
                }
            });

            assert.equal(enabled, false);
            buttons.publiiminipreview.onAction();
            assert.deepEqual(opened, []);
        });
    }
});
