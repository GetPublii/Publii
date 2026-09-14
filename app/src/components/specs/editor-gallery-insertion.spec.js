const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const bridgeSource = fs.readFileSync(path.join(__dirname, '../post-editor/EditorBridge.js'), 'utf8')
    .replace(/^import .*;\s*$/gm, '')
    .replace('export default EditorBridge;', 'module.exports = EditorBridge;');

function createHarness() {
    const events = [];
    const bookmark = { start: [0, 6] };
    const draft = {
        setAttribute() {}
    };
    let responseCallback;
    let popupConfig;
    const context = {
        module: { exports: {} },
        window: {
            app: {
                translate: key => key,
                galleryPopupUpdated(callback) {
                    responseCallback = callback;
                },
                updateGalleryPopup(config) {
                    assert.equal(typeof responseCallback, 'function');
                    popupConfig = config;
                }
            }
        }
    };
    vm.runInNewContext(bridgeSource, context);
    const bridge = Object.create(context.module.exports.prototype);
    const body = {};
    const editor = {
        getBody: () => body,
        getDoc: () => ({ createElement: () => draft }),
        focus: () => events.push('focus'),
        selection: {
            getBookmark(type, normalized) {
                assert.equal(type, 2);
                assert.equal(normalized, true);
                return bookmark;
            },
            moveToBookmark(value) {
                assert.equal(value, bookmark);
                events.push('restore-selection');
            }
        },
        insertContent() {
            assert.fail('Opening a gallery must not modify editor content');
        }
    };
    bridge.itemID = 42;
    bridge.tinymceEditor = editor;
    bridge.galleryPopupUpdated = (response, newGallery) => {
        assert.equal(newGallery, draft);
        assert.equal(response.gallery, draft);
        events.push('insert-gallery');
    };
    bridge.openNewGalleryPopup(editor);

    return {
        bridge,
        editor,
        events,
        draft,
        popupConfig,
        respond: response => responseCallback(response)
    };
}

describe('TinyMCE gallery insertion lifecycle', function () {
    it('opens a draft without inserting content or opening the native file picker', function () {
        const harness = createHarness();
        assert.equal(harness.popupConfig.galleryElement, harness.draft);
        assert.equal(harness.popupConfig.postID, 42);
        assert.equal(harness.popupConfig.autoSelectFiles, false);
        assert.deepEqual(harness.events, []);
    });

    it('restores the original selection before inserting the confirmed draft', function () {
        const harness = createHarness();
        harness.respond({ gallery: harness.draft, html: '<figure>Photo</figure>' });
        assert.deepEqual(harness.events, ['focus', 'restore-selection', 'insert-gallery']);
    });

    it('restores focus and selection on cancel without inserting a gallery', function () {
        const harness = createHarness();
        harness.respond(false);
        assert.deepEqual(harness.events, ['focus', 'restore-selection']);
    });

    for (const html of ['&nbsp;', '', '   ']) {
        it(`does not insert an empty gallery (${JSON.stringify(html)})`, function () {
            const harness = createHarness();
            harness.respond({ gallery: harness.draft, html });
            assert.deepEqual(harness.events, ['focus', 'restore-selection']);
        });
    }

    it('ignores a response for another gallery', function () {
        const harness = createHarness();
        harness.respond({ gallery: {}, html: '<figure>Photo</figure>' });
        assert.deepEqual(harness.events, ['focus', 'restore-selection']);
    });

    it('does not restore selection or insert content after the editor is replaced', function () {
        const harness = createHarness();
        harness.bridge.tinymceEditor = {};
        harness.respond({ gallery: harness.draft, html: '<figure>Photo</figure>' });
        assert.deepEqual(harness.events, []);
    });

    it('ignores a response after the editor body is removed', function () {
        const harness = createHarness();
        harness.editor.getBody = () => null;
        harness.respond({ gallery: harness.draft, html: '<figure>Photo</figure>' });
        assert.deepEqual(harness.events, []);
    });
});

describe('Gallery popup opening', function () {
    const popupSource = fs.readFileSync(path.join(__dirname, '../post-editor/GalleryPopup.vue'), 'utf8')
        .match(/<script>([\s\S]*?)<\/script>/)[1]
        .replace(/^import .*;\s*$/gm, '')
        .replace('export default', 'module.exports =');

    for (const autoSelectFiles of [false, undefined]) {
        it(autoSelectFiles === false
            ? 'shows the new-gallery drop area without invoking a native picker'
            : 'preserves native picker behavior for existing empty placeholders', async function () {
            const context = {
                module: { exports: {} },
                UploadProgress: {},
                Draggable: {}
            };
            vm.runInNewContext(popupSource, context);
            const component = context.module.exports;
            let openPopup;
            let pickerCalls = 0;
            const popup = {
                ...component.data(),
                $bus: {
                    $on(event, callback) {
                        assert.equal(event, 'update-gallery-popup');
                        openPopup = callback;
                    }
                },
                parseInputElement() {},
                async addImages() {
                    pickerCalls++;
                }
            };
            component.mounted.call(popup);
            await openPopup({ galleryElement: {}, postID: 42, autoSelectFiles });
            assert.equal(popup.isVisible, true);
            assert.equal(pickerCalls, autoSelectFiles === false ? 0 : 1);
        });
    }
});
