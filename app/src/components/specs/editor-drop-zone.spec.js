const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../post-editor/EditorBridge.js'), 'utf8')
    .replace(/^import .*;\s*$/gm, '')
    .replace('export default EditorBridge;', 'module.exports = EditorBridge;');

function target() {
    const handlers = new Map();
    return {
        handlers,
        contains: () => false,
        addEventListener(event, callback, capture) {
            handlers.set(event, { callback, capture });
        },
        removeEventListener(event, callback, capture) {
            assert.deepEqual(handlers.get(event), { callback, capture });
            handlers.delete(event);
        },
        fire(type, values = {}) {
            const event = {
                currentTarget: this,
                dataTransfer: { types: ['Files'], files: [{}] },
                prevented: false,
                stopped: false,
                preventDefault() {
                    this.prevented = true;
                },
                stopPropagation() {
                    this.stopped = true;
                },
                ...values
            };
            handlers.get(type)?.callback(event);
            return event;
        }
    };
}

function harness() {
    const area = target();
    const content = target();
    const frame = target();
    const classes = new Set();
    const callbacks = new Map();
    const uploads = [];
    let popupVisible = false;
    let overlayParent;
    area.classList = {
        remove: name => classes.delete(name),
        toggle(name, value) {
            if (value) {
                classes.add(name);
            } else {
                classes.delete(name);
            }
        }
    };
    const context = {
        module: { exports: {} },
        setTimeout,
        clearTimeout,
        $(value) {
            if (value === '.popup.gallery-popup') {
                return { length: popupVisible ? 1 : 0 };
            }
            return {
                append() {
                    overlayParent = value;
                }
            };
        }
    };
    vm.runInNewContext(source, context);
    const bridge = Object.create(context.module.exports.prototype);
    const editor = {
        getContainer: () => area,
        getContentAreaContainer: () => content,
        getWin: () => frame,
        on: (event, callback) => callbacks.set(event, callback)
    };
    bridge.editorFileSelect = event => {
        uploads.push(event);
        bridge.contentImageUploading = true;
    };
    bridge.initEditorDragNDropImages(editor);
    return {
        area,
        content,
        frame,
        bridge,
        classes,
        uploads,
        overlayParent,
        showPopup: () => { popupVisible = true; },
        remove: () => callbacks.get('remove')()
    };
}

describe('WYSIWYG content-only image drop zone', function () {
    it('mounts the overlay in the content container and captures file events before TinyMCE', function () {
        const h = harness();
        assert.equal(h.overlayParent, h.content);
        assert.equal(h.frame.handlers.get('dragover').capture, true);
        assert.equal(h.frame.handlers.get('drop').capture, true);
        h.remove();
    });

    it('shows the overlay for files over the iframe and accepts a single upload', function () {
        const h = harness();
        const event = h.frame.fire('dragover');
        assert.equal(event.prevented, true);
        assert.equal(event.dataTransfer.dropEffect, 'copy');
        assert.equal(h.classes.has('is-hovered'), true);
        h.content.fire('drop');
        h.content.fire('drop');
        assert.equal(h.uploads.length, 1);
        assert.equal(h.classes.has('is-hovered'), false);
        h.remove();
    });

    it('rejects toolbar drops without uploading or leaving a hover state', function () {
        const h = harness();
        h.frame.fire('dragover');
        const event = h.area.fire('drop');
        assert.equal(event.prevented, true);
        assert.equal(event.dataTransfer.dropEffect, 'none');
        assert.equal(h.uploads.length, 0);
        assert.equal(h.classes.has('is-hovered'), false);
        h.remove();
    });

    it('preserves text and image drags originating inside the editor', function () {
        const h = harness();
        h.frame.fire('dragstart');
        const event = h.frame.fire('dragover');
        const drop = h.frame.fire('drop');
        assert.equal(event.prevented, false);
        assert.equal(drop.prevented, false);
        assert.equal(h.uploads.length, 0);
        h.frame.fire('dragend');
        assert.equal(h.bridge.postEditorInnerDragging, false);
        h.remove();
    });

    it('ignores non-file drags', function () {
        const h = harness();
        const event = h.frame.fire('dragover', { dataTransfer: { types: ['text/html'] } });
        assert.equal(event.prevented, false);
        assert.equal(h.classes.has('is-hovered'), false);
        h.remove();
    });

    it('does not accept uploads behind a gallery popup', function () {
        const h = harness();
        h.showPopup();
        const event = h.frame.fire('dragover');
        h.frame.fire('drop');
        assert.equal(event.dataTransfer.dropEffect, 'none');
        assert.equal(h.uploads.length, 0);
        assert.equal(h.classes.has('is-hovered'), false);
        h.remove();
    });

    it('does not flicker when crossing from the overlay into the iframe', async function () {
        const h = harness();
        h.content.fire('dragover');
        h.content.fire('dragleave');
        h.frame.fire('dragover');
        await new Promise(resolve => setTimeout(resolve, 100));
        assert.equal(h.classes.has('is-hovered'), true);
        h.remove();
    });

    it('clears the overlay after leaving the content', async function () {
        const h = harness();
        h.frame.fire('dragover');
        h.content.fire('dragleave');
        await new Promise(resolve => setTimeout(resolve, 100));
        assert.equal(h.classes.has('is-hovered'), false);
        h.remove();
    });

    it('removes every listener when the editor closes', function () {
        const h = harness();
        h.remove();
        assert.equal(h.area.handlers.size + h.content.handlers.size + h.frame.handlers.size, 0);
    });
});
