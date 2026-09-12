const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const Vue = require('vue');
const stripTags = require('../../helpers/vendor/locutus/strings/strip_tags').default;
const countTextStatistics = require('../../helpers/text-statistics');

// Node 22 requires an options object to remove a capture listener.
class BrowserDocument extends EventTarget {
    removeEventListener(type, listener, options) {
        super.removeEventListener(type, listener, options === true ? { capture: true } : options);
    }
}

function createPanel(bus = new Vue()) {
    const source = fs.readFileSync(path.join(__dirname, '../post-editor/WritersPanel.vue'), 'utf8');
    const script = source.match(/<script>([\s\S]*?)<\/script>/)[1];
    const outerDocument = new BrowserDocument();
    const editorDocument = new BrowserDocument();
    const outerWindow = new EventTarget();
    const editorWindow = { document: editorDocument };
    editorWindow.window = editorWindow;
    editorDocument.body = {
        innerHTML: '<p>One two.</p><p>Two three!</p>',
        innerText: 'One two.\n\nTwo three!'
    };
    outerDocument.getElementById = () => ({
        contentDocument: editorDocument,
        contentWindow: editorWindow
    });

    const context = {
        module: { exports: {} },
        strip_tags: stripTags,
        countTextStatistics,
        Tooltip: {},
        document: outerDocument,
        window: outerWindow,
        localStorage: {
            getItem: () => 'opened',
            setItem: () => assert.fail('A transient stats panel must not persist its open state')
        }
    };
    vm.runInNewContext(
        script.replace(/^import .+;$/gm, '').replace('export default', 'module.exports ='),
        context
    );

    const options = context.module.exports;
    const panel = new Vue(options);
    const focus = [];
    panel.$bus = bus;
    panel.$el = { contains: target => target === panel.$el };
    panel.$refs.popover = { focus: () => focus.push('popover') };
    panel.$refs.trigger = { $el: { focus: () => focus.push('trigger') } };
    options.mounted.call(panel);

    return { panel, focus, bus, outerDocument, editorDocument, outerWindow };
}

describe('Writer statistics popover', function () {
    let fixture;

    beforeEach(function () {
        fixture = createPanel();
    });

    afterEach(function () {
        fixture.panel.$destroy();
    });

    it('starts closed even with the old sidebar preference enabled', function () {
        assert.equal(fixture.panel.isOpen, false);
    });

    it('refreshes on every opening without changing editor content', async function () {
        const { panel, editorDocument, focus } = fixture;
        panel.toggle();
        await Vue.nextTick();
        assert.equal(panel.words, 4);
        assert.equal(panel.uniqueWords, 3);
        assert.equal(panel.characters, 18);
        assert.equal(panel.charactersWithoutSpaces, 16);
        assert.equal(panel.paragraphs, 2);
        assert.equal(panel.readingTime, '&lt; 1');
        assert.deepEqual(focus, ['popover']);
        assert.equal(editorDocument.body.innerHTML, '<p>One two.</p><p>Two three!</p>');

        panel.toggle();
        editorDocument.body.innerHTML = '<p>Changed text has five words.</p>';
        editorDocument.body.innerText = 'Changed text has five words.';
        panel.toggle();
        assert.equal(panel.words, 5);
        assert.equal(panel.paragraphs, 1);
        assert.equal(editorDocument.body.innerHTML, '<p>Changed text has five words.</p>');
    });

    for (const documentName of ['outerDocument', 'editorDocument']) {
        for (const eventType of ['pointerdown', 'focusin']) {
            it(`dismisses on ${eventType} in ${documentName} without stealing focus`, async function () {
                const { panel, focus } = fixture;
                panel.toggle();
                await Vue.nextTick();
                fixture[documentName].dispatchEvent(new Event(eventType));
                assert.equal(panel.isOpen, false);
                assert.deepEqual(focus, ['popover']);
            });
        }
    }

    it('keeps the popover open when interacting with its own content', function () {
        const { panel } = fixture;
        panel.toggle();
        panel.handleOutsideInteraction({ target: panel.$el });
        assert.equal(panel.isOpen, true);
    });

    it('consumes Escape and returns focus to the trigger', async function () {
        const { panel, focus, outerDocument } = fixture;
        panel.toggle();
        await Vue.nextTick();
        const event = new Event('keydown', { cancelable: true });
        event.key = 'Escape';
        outerDocument.dispatchEvent(event);
        assert.equal(panel.isOpen, false);
        assert.equal(event.defaultPrevented, true);
        assert.deepEqual(focus, ['popover', 'trigger']);
    });

    it('does not consume Escape used by input composition', function () {
        const { panel, editorDocument } = fixture;
        panel.toggle();
        const event = new Event('keydown', { cancelable: true });
        event.key = 'Escape';
        event.isComposing = true;
        editorDocument.dispatchEvent(event);
        assert.equal(panel.isOpen, true);
        assert.equal(event.defaultPrevented, false);
    });

    it('closes when the application loses focus', function () {
        fixture.panel.toggle();
        fixture.outerWindow.dispatchEvent(new Event('blur'));
        assert.equal(fixture.panel.isOpen, false);
    });

    it('releases editor listeners and only its own refresh subscription on leaving the editor', function () {
        const { panel, bus, editorDocument, outerDocument, outerWindow, focus } = fixture;
        let otherRefreshes = 0;
        bus.$on('writers-panel-refresh', () => {
            otherRefreshes += 1;
        });
        panel.toggle();
        panel.$destroy();
        editorDocument.body.innerHTML = '<p>Different content.</p>';
        editorDocument.body.innerText = 'Different content.';
        bus.$emit('writers-panel-refresh');
        assert.equal(panel.words, 4);
        assert.equal(otherRefreshes, 1);

        for (const target of [editorDocument, outerDocument]) {
            const event = new Event('keydown', { cancelable: true });
            event.key = 'Escape';
            target.dispatchEvent(event);
            assert.equal(event.defaultPrevented, false);
            target.dispatchEvent(new Event('pointerdown'));
        }

        outerWindow.dispatchEvent(new Event('blur'));
        assert.equal(panel.isOpen, false);
        assert.deepEqual(focus, []);
    });
});
