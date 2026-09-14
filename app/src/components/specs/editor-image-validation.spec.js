const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { accept: imageAccept } = require('../../../config/image-upload-formats');

function createHarness() {
    const requests = [];
    const replies = [];
    const alerts = [];
    const inserted = [];
    const timers = [];
    const progressViews = [];
    const events = new Map();
    const inputs = new Map();
    let openedPopups = 0;

    function getInput(id) {
        if (!inputs.has(id)) {
            inputs.set(id, {
                value: 'selected',
                files: [{ path: '/source/photo.png' }],
                listeners: new Map(),
                addEventListener(event, callback) {
                    this.listeners.set(event, callback);
                },
                click() {}
            });
        }

        return inputs.get(id);
    }

    const iframeDocument = {
        body: { addEventListener() {} },
        addEventListener() {},
        querySelector: () => ({ setAttribute() {} })
    };
    const iframeWindow = {
        document: iframeDocument,
        addEventListener() {}
    };
    iframeWindow.window = iframeWindow;

    const context = {
        module: { exports: {} },
        imageAccept,
        imageExtensions: ['jpg', 'png', 'svg'],
        Block: {},
        UploadProgress: {},
        PButton: {},
        Vue: class {
            constructor(options) {
                this.options = options;
                this.destroyed = false;
                this.removed = false;
                this.$el = { remove: () => { this.removed = true; } };
                progressViews.push(this);
            }
            $mount() {
                return this;
            }
            $destroy() {
                this.destroyed = true;
            }
        },
        Draggable: {},
        ConfigForm: {},
        ContentEditableImprovements: {},
        EditorIcon: {},
        HasPreview: {},
        LinkConfig: {},
        TopMenuUI: {},
        Utils: { debouncedFunction: callback => callback },
        applyAppAppearance() {},
        setTimeout(callback) {
            timers.push(callback);
        },
        window: {
            app: {
                getSiteName: () => 'test-site',
                translate: key => `${key}: {file}`,
                showAlert: alert => alerts.push(alert),
                showMessage() {
                    assert.fail('Image upload errors must use the confirmation dialog');
                },
                getCurrentAppTheme: () => 'light',
                getCurrentAppAppearance: () => 'publii',
                getCurrentWorkspaceAccent: () => 'indigo',
                overridedCssVariables: () => '',
                writersPanelRefresh() {}
            }
        },
        document: {
            getElementById(id) {
                if (id === 'post-editor_ifr') {
                    return { contentWindow: iframeWindow };
                }

                if (id === 'app') {
                    return { classList: { contains: () => false } };
                }

                return getInput(id);
            }
        },
        $(selector) {
            const element = {
                0: getInput(selector),
                append() {
                    return this;
                },
                addClass() {
                    return this;
                },
                removeClass() {
                    return this;
                },
                html() {
                    return this;
                },
                attr(name, value) {
                    this[0][name] = value;
                    return this;
                },
                trigger() {},
                on(event, callback) {
                    this[0].listeners.set(event, callback);
                }
            };

            return element;
        },
        mainProcessAPI: {
            getPathForFile: file => file.path,
            normalizePath: async value => value,
            send(channel, data) {
                assert.equal(channel, 'app-image-upload');
                requests.push(data);
            },
            async invoke(channel) {
                assert.equal(channel, 'app-main-process-select-files');
            },
            stopReceiveAll() {},
            receiveOnce(channel, callback) {
                if (channel === 'app-files-selected') {
                    events.set(channel, callback);
                    return;
                }

                assert.equal(channel, 'app-image-uploaded');
                replies.push(callback);
            }
        },
        tinymce: {
            activeEditor: {
                insertContent: value => inserted.push(value)
            }
        }
    };
    const parent = {
        $el: {
            clientHeight: 200,
            setAttribute() {},
            removeAttribute() {}
        },
        openPopup() {
            openedPopups++;
        }
    };

    function loadComponent(type) {
        const file = path.join(__dirname, '../block-editor/components/default-blocks', type, 'block.vue');
        const source = fs.readFileSync(file, 'utf8').match(/<script>([\s\S]*?)<\/script>/)[1]
            .replace(/^import .*;\s*$/gm, '')
            .replace('export default', 'module.exports =');
        vm.runInNewContext(source, context);
        const component = {
            editor: { config: { postID: 42 } },
            $parent: parent,
            content: { image: 'previous.png', images: [] },
            imagesQueue: [],
            uploadedImages: [],
            imageUploadInProgress: false,
            fileSelectionCallback: true,
            isHovered: false
        };

        for (const [name, method] of Object.entries(context.module.exports.methods)) {
            component[name] = method.bind(component);
        }

        return component;
    }

    function loadGalleryPopup() {
        const source = fs.readFileSync(path.join(__dirname, '../post-editor/GalleryPopup.vue'), 'utf8')
            .match(/<script>([\s\S]*?)<\/script>/)[1]
            .replace(/^import .*;\s*$/gm, '')
            .replace('export default', 'module.exports =');
        vm.runInNewContext(source, context);
        const options = context.module.exports;
        const popup = {
            ...options.data(),
            $store: { state: { currentSite: { config: { name: 'test-site' } } } },
            $t: key => key,
            $bus: { $emit: (event, alert) => alerts.push(alert) }
        };

        for (const [name, method] of Object.entries(options.methods)) {
            popup[name] = method.bind(popup);
        }

        return popup;
    }

    async function loadBridge() {
        const source = fs.readFileSync(path.join(__dirname, '../post-editor/EditorBridge.js'), 'utf8')
            .replace(/^import .*;\s*$/gm, '')
            .replace('export default EditorBridge;', 'module.exports = EditorBridge;');
        vm.runInNewContext(source, context);
        const bridge = Object.create(context.module.exports.prototype);
        bridge.itemID = 42;

        for (const method of [
            'addEditorButtons',
            'setupImageFigureClassTranslation',
            'setupIframeWrappers',
            'setupMediaDoubleClick',
            'initEditorDragNDropImages',
            'addInlineEditor',
            'addLinkEditor'
        ]) {
            bridge[method] = () => {};
        }

        bridge.setupEditor({}, {
            on: (event, callback) => events.set(event, callback),
            once() {},
            getBody: () => ({}),
            focus() {},
            selection: {
                getBookmark: () => ({}),
                moveToBookmark() {}
            },
            insertContent: html => inserted.push(html),
            getContentAreaContainer: () => ({}),
            getContainer: () => ({
                querySelector: () => ({ appendChild() {} })
            }),
            ui: { registry: { addButton() {} } }
        });
        await events.get('init')();
        return bridge;
    }

    return {
        requests,
        progressViews,
        removeEditor: () => events.get('remove')(),
        alerts,
        inserted,
        getInput,
        loadComponent,
        loadGalleryPopup,
        selectFiles: paths => events.get('app-files-selected')({ paths: { filePaths: paths } }),
        loadBridge,
        popups: () => openedPopups,
        reply: data => replies.shift()(data),
        async flushTimers() {
            while (timers.length) {
                await timers.shift()();
            }
        }
    };
}

function imageResult() {
    return {
        baseImage: { url: 'file:///photo.png', size: [12, 8] },
        thumbnailPath: ['file:///thumbnail.png'],
        thumbnailDimensions: { width: 6, height: 4 }
    };
}

function dropEvent(files = [{ path: '/source/photo.png' }]) {
    return {
        dataTransfer: { files },
        stopPropagation() {},
        preventDefault() {}
    };
}

for (const editor of ['block', 'wysiwyg']) {
    for (const route of ['drop', 'picker']) {
        describe(`Image validation integration: ${editor} ${route}`, function () {
            async function upload(harness) {
                const instance = editor === 'block'
                    ? harness.loadComponent('publii-image')
                    : await harness.loadBridge();

                if (route === 'drop') {
                    if (editor === 'block') {
                        await instance.drop(dropEvent());
                    } else {
                        await instance.editorFileSelect({ originalEvent: dropEvent() });
                    }
                } else {
                    const id = `${editor === 'wysiwyg' ? '#' : ''}post-editor-fake-image-uploader`;

                    if (editor === 'block') {
                        instance.initFakeFilePicker();
                    } else {
                        instance.filePickerCallback(value => harness.inserted.push(value), '', { filetype: 'image' });
                    }

                    const input = harness.getInput(id);
                    assert.equal(input.accept, imageAccept);
                    input.listeners.get('change')();
                    await harness.flushTimers();
                }

                assert.equal(harness.requests.length, 1);
                assert.equal(harness.requests[0].imagesOnly, true);
                assert.equal(harness.requests[0].path, '/source/photo.png');
                return instance;
            }

            for (const translation of ['core.images.invalidImageFile', undefined]) {
                it(`preserves content and displays ${translation || 'the fallback error'} on rejection`, async function () {
                    const harness = createHarness();
                    const instance = await upload(harness);
                    harness.reply({ error: true, translation, file: 'photo.png' });

                    assert.equal(harness.alerts.length, 1);
                    assert.equal(harness.alerts[0].buttonStyle, 'danger');
                    assert.equal(harness.alerts[0].message, `${translation || 'core.images.imageUnprocessable'}: photo.png`);
                    assert.equal(harness.inserted.length, 0);
                    assert.equal(harness.popups(), 0);

                    if (editor === 'block') {
                        assert.equal(instance.content.image, 'previous.png');
                        assert.equal(instance.imageUploadInProgress, false);
                    } else if (route === 'drop') {
                        assert.equal(instance.contentImageUploading, false);
                    }
                });
            }

            it('inserts a successfully validated image', async function () {
                const harness = createHarness();
                const instance = await upload(harness);
                harness.reply(imageResult());
                assert.equal(harness.alerts.length, 0);

                if (editor === 'block') {
                    assert.equal(instance.content.image, 'file:///photo.png');
                    assert.equal(instance.imageUploadInProgress, false);
                    assert.equal(harness.popups(), 1);
                } else {
                    assert.equal(harness.inserted.length, 1);
                    assert.ok(harness.inserted[0].includes('photo.png'));
                }
            });
        });
    }
}

describe('Block gallery validation integration', function () {
    it('skips an invalid file and finishes uploading the remaining valid image', async function () {
        const harness = createHarness();
        const gallery = harness.loadComponent('publii-gallery');
        gallery.initFakeFilePicker();
        await gallery.drop(dropEvent([{ path: '/source/invalid.jpg' }, { path: '/source/photo.png' }]));
        assert.equal(harness.requests[0].imageType, 'galleryImages');
        harness.reply({ error: true, translation: 'core.images.invalidImageFile', file: 'invalid.jpg' });
        assert.equal(harness.requests[1].imageType, 'galleryImages');
        assert.equal(harness.requests[1].path, '/source/photo.png');
        harness.reply(imageResult());

        assert.equal(gallery.content.images.length, 1);
        assert.equal(gallery.content.images[0].src, 'file:///photo.png');
        assert.equal(gallery.imageUploadInProgress, false);
        assert.equal(harness.alerts[0].message, 'core.images.invalidImageFile: invalid.jpg');
        assert.equal(harness.alerts[0].buttonStyle, 'danger');
    });
});

describe('WYSIWYG upload progress lifecycle', function () {
    it('removes the progress view after an upload error', async function () {
        const harness = createHarness();
        const bridge = await harness.loadBridge();
        await bridge.editorFileSelect({ originalEvent: dropEvent() });
        assert.equal(harness.progressViews.length, 1);
        harness.reply({ error: true });
        assert.equal(harness.progressViews[0].destroyed, true);
        assert.equal(harness.progressViews[0].removed, true);
        assert.equal(bridge.imageUploadProgressView, null);
    });

    it('removes the progress view after success and when the editor closes', async function () {
        const harness = createHarness();
        const bridge = await harness.loadBridge();
        await bridge.editorFileSelect({ originalEvent: dropEvent() });
        harness.reply(imageResult());
        assert.equal(harness.progressViews[0].destroyed, true);
        assert.equal(harness.progressViews[0].removed, true);
        bridge.showImageUploadProgress();
        harness.removeEditor();
        assert.equal(harness.progressViews[1].destroyed, true);
        assert.equal(harness.progressViews[1].removed, true);
        assert.equal(bridge.imageUploadProgressView, null);
    });
});

describe('Gallery popup file drop', function () {
    it('uploads multiple files through gallery validation and continues after a rejection', function () {
        const harness = createHarness();
        const popup = harness.loadGalleryPopup();
        popup.dropImages(dropEvent([{ path: '/source/bad.svg' }, { path: '/source/photo.png' }]));
        assert.equal(popup.isUploading, true);
        assert.equal(popup.imagesToUpload, 2);
        assert.equal(harness.requests[0].imageType, 'galleryImages');
        assert.equal(harness.requests[0].path, '/source/bad.svg');
        popup.dropImages(dropEvent());
        assert.equal(harness.requests.length, 1, 'Busy upload must not start a second queue');
        harness.reply({ error: true, translation: 'core.images.invalidImageFile', file: 'bad.svg' });
        assert.equal(harness.alerts.length, 1);
        assert.equal(harness.requests[1].path, '/source/photo.png');
        harness.reply(imageResult());
        assert.equal(popup.images.length, 1);
        assert.equal(popup.uploadProgress, 2);
        assert.equal(popup.isUploading, false);
    });

    it('uses the same queue when files are selected with the button', async function () {
        const harness = createHarness();
        const popup = harness.loadGalleryPopup();
        const paths = ['/source/photo.png'];
        await popup.addImages();
        harness.selectFiles(paths);
        assert.equal(popup.isUploading, true);
        assert.equal(harness.requests[0].imageType, 'galleryImages');
        assert.deepEqual(paths, ['/source/photo.png'], 'The source file list must stay intact');
        harness.reply(imageResult());
        assert.equal(popup.isUploading, false);
    });

    it('does not intercept internal image reordering or other non-file drags', function () {
        const popup = createHarness().loadGalleryPopup();
        const event = {
            dataTransfer: { types: ['text/html'], files: [] },
            preventDefault: () => assert.fail('Internal drag was intercepted'),
            stopPropagation: () => assert.fail('Internal drag was intercepted')
        };
        popup.dragOverImages(event);
        popup.dropImages(event);
        assert.equal(popup.isHovered, false);
    });

    it('highlights only file drops and rejects another drop while uploading', function () {
        const popup = createHarness().loadGalleryPopup();
        const event = dropEvent();
        event.dataTransfer.types = ['Files'];
        popup.dragOverImages(event);
        assert.equal(popup.isHovered, true);
        assert.equal(event.dataTransfer.dropEffect, 'copy');
        popup.isUploading = true;
        popup.dragOverImages(event);
        assert.equal(popup.isHovered, false);
        assert.equal(event.dataTransfer.dropEffect, 'none');
    });
});
