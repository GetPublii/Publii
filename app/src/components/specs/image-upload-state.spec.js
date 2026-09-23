const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const Vue = require('../../../node_modules/vue');

function loadComponent(file, globals = {}) {
    const source = fs.readFileSync(path.resolve(__dirname, '..', file), 'utf8');
    const script = source.match(/<script>([\s\S]*?)<\/script>/)[1];
    const context = {
        module: { exports: {} },
        Vue,
        SidebarScrollFade: {},
        Tooltip: {},
        Utils: { debouncedFunction: callback => callback },
        PButton: {},
        UploadProgress: {},
        imageAccept: '',
        setTimeout,
        ...globals
    };
    vm.runInNewContext(
        script.replace(/^import .*;\s*$/gm, '').replace('export default', 'module.exports ='),
        context
    );
    return context.module.exports;
}

function createUploader(mediaPath = Promise.resolve('/media/'), options = {}) {
    const api = options.api || {
        normalizePath: async value => value,
        getPathForFile: file => file.path,
        invoke: async () => ({ baseImage: { newPath: '/media/new.png' } })
    };
    const definition = loadComponent('basic-elements/ImageUpload.vue', {
        mainProcessAPI: api,
        setTimeout: options.schedule || setTimeout
    });
    const instance = new Vue({
        ...definition,
        propsData: options.props || {},
        beforeCreate() {
            this.$store = {
                state: { currentSite: { siteDir: '/site', config: { name: 'test-site' } } }
            };
        },
        computed: options.realMediaPath ? definition.computed : {
            ...definition.computed,
            mediaPath: () => mediaPath
        }
    });
    instance.$refs.input = { value: '' };
    instance.$bus = new Vue();
    instance.$t = key => key;
    return instance;
}

function dropEvent(file = 'new.png') {
    return {
        preventDefault() {},
        stopPropagation() {},
        dataTransfer: { files: [{ path: '/source/' + file }], types: ['Files'] }
    };
}

function createForm(kind) {
    const definition = loadComponent(kind === 'tag' ? 'TagForm.vue' : 'AuthorForm.vue');
    const form = new Vue(definition);
    const dataKey = kind + 'Data';
    form.$bus = new Vue();
    form.$t = key => key;
    form.$refs.sidebarContent = { scrollTop: 0 };
    let upload;

    // Observe the same dependencies as the parent render, before child watchers.
    form.$watch(
        () => [form[dataKey].additionalData.featuredImage, form.hasFeaturedImage, form[dataKey].id],
        ([value, visible, id]) => {
            upload.value = value;
            upload.itemId = id;
        }
    );
    upload = createUploader(Promise.resolve('/media/'), {
        props: {
            imageType: kind + 'Images',
            onAdd: () => { form.hasFeaturedImage = true; },
            onRemove: () => { form.hasFeaturedImage = false; }
        }
    });
    upload.$on('input', value => {
        Vue.set(form[dataKey].additionalData, 'featuredImage', value);
    });
    definition.mounted.call(form);

    return {
        form,
        upload,
        data: () => form[dataKey],
        async open(image = 'old.png', id = 7) {
            form.$bus.$emit('show-' + kind + '-item-editor', {
                id,
                additionalData: JSON.stringify({
                    featuredImage: image,
                    featuredImageAlt: 'Existing alt',
                    featuredImageCaption: 'Existing caption'
                })
            });
            await flushUpdates();
        },
        destroy() {
            upload.$destroy();
            form.$destroy();
        }
    };
}

async function flushUpdates() {
    await Vue.nextTick();
    await Vue.nextTick();
}

describe('Image uploader preview state', () => {
    let uploader;

    afterEach(() => {
        uploader.$destroy();
    });

    it('clears a newly added preview and emits an empty model on removal', async () => {
        uploader = createUploader();
        const values = [];
        uploader.$on('input', value => values.push(value));
        await uploader.setImage('/media/photo.png');
        await flushUpdates();
        assert.equal(uploader.isEmpty, false);

        uploader.remove({ preventDefault() {} });
        await flushUpdates();

        assert.equal(uploader.filePath, '');
        assert.equal(uploader.isEmpty, true);
        assert.equal(uploader.backgroundImage, false);
        assert.equal(values[values.length - 1], '');
    });

    it('does not restore a removed image when pending path resolution completes', async () => {
        let resolvePath;
        uploader = createUploader(new Promise(resolve => {
            resolvePath = resolve;
        }));
        uploader.filePath = '/media/photo.png';
        uploader.isEmpty = false;
        uploader.value = 'photo.png';
        await Vue.nextTick();

        uploader.remove({ preventDefault() {} });
        resolvePath('/media/');
        await flushUpdates();

        assert.equal(uploader.filePath, '');
        assert.equal(uploader.isEmpty, true);
        assert.equal(uploader.backgroundImage, false);
    });

    it('clears the preview when its parent form clears the image value', async () => {
        uploader = createUploader();
        uploader.value = 'photo.png';
        await flushUpdates();
        assert.equal(uploader.filePath, '/media/photo.png');

        uploader.value = '';
        await flushUpdates();

        assert.equal(uploader.filePath, '');
        assert.equal(uploader.isEmpty, true);
        assert.equal(uploader.backgroundImage, false);
    });

    it('keeps the newer remote image when an older local path resolves', async () => {
        let resolvePath;
        uploader = createUploader(new Promise(resolve => {
            resolvePath = resolve;
        }));
        uploader.value = 'old.png';
        await Vue.nextTick();
        uploader.value = 'https://example.test/new.png';
        await Vue.nextTick();
        resolvePath('/media/');
        await flushUpdates();

        assert.equal(uploader.filePath, 'https://example.test/new.png');
        assert.equal(uploader.isEmpty, false);
    });
});

for (const kind of ['tag', 'author']) {
    describe(`${kind} form image lifecycle`, () => {
        let harness;

        beforeEach(() => {
            harness = createForm(kind);
        });

        afterEach(() => {
            harness.destroy();
        });

        for (const entry of ['drop', 'picker']) {
            it(`replaces a saved image after removal using ${entry}, without saving the form`, async () => {
                await harness.open();
                assert.equal(harness.upload.filePath, '/media/old.png');
                harness.upload.remove({ preventDefault() {} });
                await flushUpdates();
                assert.equal(harness.upload.value, '');
                assert.equal(harness.form.hasFeaturedImage, false);

                if (entry === 'drop') {
                    await harness.upload.drop(dropEvent());
                } else {
                    await harness.upload.valueChanged({ target: { files: [{ path: '/source/new.png' }] } });
                }
                await flushUpdates();

                assert.equal(harness.upload.filePath, '/media/new.png');
                assert.equal(harness.upload.isEmpty, false);
                assert.equal(harness.data().additionalData.featuredImage, 'new.png');
                assert.equal(harness.upload.value, 'new.png');
                assert.equal(harness.form.hasFeaturedImage, true);
            });
        }

        it('supports repeated remove/add cycles, including the same filename', async () => {
            await harness.open('new.png');
            for (let cycle = 0; cycle < 3; cycle++) {
                harness.upload.remove({ preventDefault() {} });
                await flushUpdates();
                await harness.upload.drop(dropEvent());
                await flushUpdates();
                assert.equal(harness.upload.filePath, '/media/new.png');
                assert.equal(harness.upload.value, 'new.png');
                assert.equal(harness.form.hasFeaturedImage, true);
            }
        });

        it('adds an image to a new unsaved item', async () => {
            await harness.open('', 0);
            await harness.upload.drop(dropEvent());
            await flushUpdates();
            assert.equal(harness.upload.filePath, '/media/new.png');
            assert.equal(harness.upload.value, 'new.png');
            assert.equal(harness.form.hasFeaturedImage, true);
        });

        it('replaces an image directly without removing it first', async () => {
            await harness.open();
            await harness.upload.drop(dropEvent());
            await flushUpdates();
            assert.equal(harness.upload.filePath, '/media/new.png');
            assert.equal(harness.upload.value, 'new.png');
            assert.equal(harness.data().additionalData.featuredImageAlt, 'Existing alt');
            assert.equal(harness.data().additionalData.featuredImageCaption, 'Existing caption');
        });

        it('resets image fields when opening an item without a saved image', async () => {
            await harness.open();
            await harness.open('', 8);
            assert.equal(harness.form.hasFeaturedImage, false);
            assert.equal(harness.upload.filePath, '');
            assert.equal(harness.upload.isEmpty, true);
        });

        it('keeps image metadata reactive after opening the sidebar', async () => {
            await harness.open();
            let updated;
            harness.form.$watch(
                () => harness.data().additionalData.featuredImageAlt,
                value => { updated = value; }
            );
            harness.data().additionalData.featuredImageAlt = 'New alt';
            await flushUpdates();
            assert.equal(updated, 'New alt');
        });
    });
}

describe('Image uploader asynchronous operations', () => {
    let uploader;
    let requests;
    let result;
    let alerts;

    beforeEach(() => {
        requests = [];
        result = { baseImage: { newPath: '/media/new.png' } };
        alerts = [];
        uploader = createUploader(Promise.resolve('/media/'), {
            api: {
                normalizePath: async value => value,
                getPathForFile: file => file.path,
                invoke: async (channel, payload) => {
                    requests.push({ channel, payload });
                    return await result;
                }
            }
        });
        uploader.$bus.$on('alert-display', alert => alerts.push(alert));
        uploader.$on('input', value => { uploader.value = value; });
    });

    afterEach(() => {
        uploader.$destroy();
    });

    for (const initial of ['', 'old.png']) {
        for (const response of [null, { error: true }, { baseImage: {} }]) {
            it(`preserves ${initial || 'an empty preview'} after failed upload ${JSON.stringify(response)}`, async () => {
                uploader.value = initial;
                await flushUpdates();
                result = response;
                await uploader.drop(dropEvent());
                await flushUpdates();
                assert.equal(uploader.filePath, initial ? '/media/' + initial : '');
                assert.equal(uploader.isEmpty, !initial);
                assert.equal(uploader.isUploading, false);
                assert.equal(uploader.$refs.input.value, '');
                assert.equal(alerts.length, 1);
            });
        }
    }

    it('retries successfully after an invalid file was dropped following removal', async () => {
        uploader.value = 'old.png';
        await flushUpdates();
        uploader.remove({ preventDefault() {} });
        await flushUpdates();
        result = { error: true };
        await uploader.drop(dropEvent('invalid.svg'));
        result = { baseImage: { newPath: '/media/new.png' } };
        await uploader.drop(dropEvent());
        await flushUpdates();
        assert.equal(uploader.value, 'new.png');
        assert.equal(uploader.filePath, '/media/new.png');
        assert.equal(alerts.length, 1);
    });

    it('ignores duplicate drops and removal while an upload is pending', async () => {
        let resolveUpload;
        result = new Promise(resolve => { resolveUpload = resolve; });
        const pending = uploader.drop(dropEvent());
        await flushUpdates();
        await uploader.drop(dropEvent('second.png'));
        uploader.remove({ preventDefault() {} });
        assert.equal(uploader.isUploading, true);
        assert.equal(requests.length, 1);
        resolveUpload({ baseImage: { newPath: '/media/new.png' } });
        await pending;
        await flushUpdates();
        assert.equal(uploader.filePath, '/media/new.png');
    });

    it('ignores cancelled file selection and empty drops', async () => {
        await uploader.valueChanged({ target: { files: [] } });
        const event = dropEvent();
        event.dataTransfer.files = [];
        await uploader.drop(event);
        assert.equal(requests.length, 0);
        assert.equal(uploader.isUploading, false);
    });

    it('discards a successful upload response after the component is destroyed', async () => {
        let resolveUpload;
        result = new Promise(resolve => { resolveUpload = resolve; });
        const pending = uploader.drop(dropEvent());
        await flushUpdates();
        uploader.$destroy();
        resolveUpload({ baseImage: { newPath: '/media/new.png' } });
        await pending;
        assert.equal(uploader.filePath, '');
        assert.equal(alerts.length, 0);
    });

    it('does not resurrect an image after the parent clears its value during a pending upload', async () => {
        uploader.value = 'old.png';
        await flushUpdates();
        let resolveUpload;
        result = new Promise(resolve => { resolveUpload = resolve; });
        const pending = uploader.drop(dropEvent());
        await flushUpdates();
        uploader.value = '';
        await flushUpdates();
        resolveUpload({ baseImage: { newPath: '/media/new.png' } });
        await pending;
        await flushUpdates();
        assert.equal(uploader.filePath, '');
        assert.equal(uploader.value, '');
    });
});

const uploadContexts = [
    {
        name: 'website logo',
        props: {
            imageType: 'optionImages',
            addMediaFolderPath: true
        },
        folder: 'website',
        id: 'website',
        type: 'optionImages'
    },
    {
        name: 'theme image',
        props: {
            imageType: 'optionImages'
        },
        folder: 'website',
        id: 'website',
        type: 'optionImages'
    },
    {
        name: 'plugin image',
        props: {
            imageType: 'pluginImages',
            pluginDir: 'demo'
        },
        folder: 'plugins/demo',
        id: 'website',
        type: 'pluginImages'
    },
    {
        name: 'saved post featured image',
        props: {
            imageType: 'featuredImages',
            itemId: 7
        },
        folder: 'posts/7',
        id: 7,
        type: 'featuredImages'
    },
    {
        name: 'new post featured image',
        props: {
            imageType: 'featuredImages',
            itemId: 0
        },
        folder: 'posts/temp',
        id: 0,
        type: 'featuredImages'
    },
    {
        name: 'saved post content image',
        props: {
            imageType: 'contentImages',
            itemId: 7
        },
        folder: 'posts/7',
        id: 7,
        type: 'contentImages'
    },
    {
        name: 'new post content image',
        props: {
            imageType: 'contentImages',
            itemId: 0
        },
        folder: 'posts/temp',
        id: 0,
        type: 'contentImages'
    },
    {
        name: 'default post/page image',
        props: {
            imageType: 'contentImages',
            itemId: 'defaults'
        },
        folder: 'posts/defaults',
        id: 'defaults',
        type: 'contentImages'
    },
    {
        name: 'saved tag image',
        props: {
            imageType: 'tagImages',
            itemId: 7
        },
        folder: 'tags/7',
        id: 7,
        type: 'tagImages'
    },
    {
        name: 'new tag image',
        props: {
            imageType: 'tagImages',
            itemId: 0
        },
        folder: 'tags/temp',
        id: 0,
        type: 'tagImages'
    },
    {
        name: 'default tag image',
        props: {
            imageType: 'tagImages',
            itemId: 'defaults'
        },
        folder: 'tags/defaults',
        id: 'defaults',
        type: 'tagImages'
    },
    {
        name: 'saved author image',
        props: {
            imageType: 'authorImages',
            itemId: 7
        },
        folder: 'authors/7',
        id: 7,
        type: 'authorImages'
    },
    {
        name: 'new author image',
        props: {
            imageType: 'authorImages',
            itemId: 0
        },
        folder: 'authors/temp',
        id: 0,
        type: 'authorImages'
    },
    {
        name: 'default author image',
        props: {
            imageType: 'authorImages',
            itemId: 'defaults'
        },
        folder: 'authors/defaults',
        id: 'defaults',
        type: 'authorImages'
    },
    {
        name: 'author avatar',
        props: {
            imageType: 'authorImages'
        },
        folder: 'website',
        id: 'website',
        type: 'optionImages'
    }
];

describe('Shared uploader contexts', () => {
    let uploader;

    afterEach(() => {
        uploader.$destroy();
    });

    for (const context of uploadContexts) {
        it(`removes and re-adds ${context.name} using its actual media path and model format`, async () => {
            const folder = '/site/input/media/' + context.folder + '/';
            const expectedModel = context.props.addMediaFolderPath ? 'media/website/new.png' : 'new.png';
            const requests = [];
            const callbacks = [];
            uploader = createUploader(undefined, {
                realMediaPath: true,
                props: {
                    ...context.props,
                    imagesOnly: true,
                    onBeforeRemove: value => callbacks.push(['beforeRemove', value]),
                    onRemove: () => callbacks.push(['remove', uploader.value]),
                    onAdd: () => callbacks.push(['add', uploader.value])
                },
                api: {
                    normalizePath: async value => value,
                    getPathForFile: file => file.path,
                    invoke: async (channel, payload) => {
                        requests.push(payload);
                        return { baseImage: { newPath: folder + 'new.png' } };
                    }
                }
            });
            uploader.$on('input', value => { uploader.value = value; });
            uploader.value = context.props.addMediaFolderPath ? 'media/website/old.png' : 'old.png';
            await flushUpdates();
            assert.equal(uploader.filePath, folder + 'old.png');

            uploader.remove({ preventDefault() {} });
            // Deliberately start the next drop before Vue flushes parent updates.
            await uploader.drop(dropEvent());
            await flushUpdates();

            assert.equal(uploader.filePath, folder + 'new.png');
            assert.equal(uploader.value, expectedModel);
            assert.equal(uploader.isEmpty, false);
            assert.equal(requests[0].id, context.id);
            assert.equal(requests[0].imageType, context.type);
            assert.equal(requests[0].imagesOnly, true);
            assert.deepEqual(callbacks, [
                ['beforeRemove', folder + 'old.png'],
                ['remove', ''],
                ['add', expectedModel]
            ]);
        });
    }

    it('changes the media folder when the item changes but the filename stays the same', async () => {
        uploader = createUploader(undefined, {
            realMediaPath: true,
            props: { imageType: 'tagImages', itemId: 7 }
        });
        uploader.value = 'photo.png';
        await flushUpdates();
        assert.equal(uploader.filePath, '/site/input/media/tags/7/photo.png');
        uploader.itemId = 8;
        await flushUpdates();
        assert.equal(uploader.filePath, '/site/input/media/tags/8/photo.png');
    });

    it('discards an upload that completes after switching to another item', async () => {
        let resolveUpload;
        uploader = createUploader(undefined, {
            realMediaPath: true,
            props: { imageType: 'tagImages', itemId: 7 },
            api: {
                normalizePath: async value => value,
                getPathForFile: file => file.path,
                invoke: () => new Promise(resolve => { resolveUpload = resolve; })
            }
        });
        uploader.value = 'old.png';
        await flushUpdates();
        const pending = uploader.drop(dropEvent());
        await flushUpdates();
        uploader.itemId = 8;
        uploader.value = 'other.png';
        await flushUpdates();
        resolveUpload({ baseImage: { newPath: '/site/input/media/tags/7/new.png' } });
        await pending;
        assert.equal(uploader.filePath, '/site/input/media/tags/8/other.png');
        assert.equal(uploader.value, 'other.png');
    });

    it('keeps the newest programmatic image when older path resolution finishes', async () => {
        let resolvePath;
        uploader = createUploader(new Promise(resolve => { resolvePath = resolve; }));
        const pending = uploader.setImage('old.png', true);
        await uploader.setImage('https://example.test/new.png');
        resolvePath('/media/');
        await pending;
        assert.equal(uploader.filePath, 'https://example.test/new.png');
    });

    it('does not turn an empty programmatic image into a directory path', async () => {
        uploader = createUploader();
        await uploader.setImage('', true);
        assert.equal(uploader.filePath, '');
        assert.equal(uploader.isEmpty, true);
    });

    it('clears a remote preview without converting the URL into a local filename', async () => {
        uploader = createUploader();
        const values = [];
        uploader.$on('input', value => values.push(value));
        await uploader.setImage('https://example.test/photo.png');
        assert.equal(values[0], 'https://example.test/photo.png');
        uploader.remove({ preventDefault() {} });
        assert.equal(values[1], '');
        assert.equal(uploader.backgroundImage, false);
    });

    it('does not let delayed mount initialization cancel a newly started upload', async () => {
        const timers = [];
        let resolveUpload;
        uploader = createUploader(undefined, {
            schedule: callback => timers.push(callback),
            props: { value: 'saved.png' },
            api: {
                normalizePath: async value => value,
                getPathForFile: file => file.path,
                invoke: () => new Promise(resolve => { resolveUpload = resolve; })
            }
        });
        uploader.$on('input', value => { uploader.value = value; });
        uploader.$options.mounted[0].call(uploader);
        const pending = uploader.drop(dropEvent());
        await flushUpdates();
        timers.forEach(callback => callback());
        await flushUpdates();
        resolveUpload({ baseImage: { newPath: '/media/new.png' } });
        await pending;
        await flushUpdates();
        assert.equal(uploader.filePath, '/media/new.png');
        assert.equal(uploader.value, 'new.png');
    });

});

describe('Plugin image removal before saving', function () {
    it('clears each upload control without requesting deletion of the saved file', async function () {
        const compiler = require('../../../../node_modules/vue-template-compiler');
        const source = fs.readFileSync(path.resolve(__dirname, '../ToolsPlugin.vue'), 'utf8');
        const template = compiler.parseComponent(source).template.content;
        const fields = [];
        const visited = new Set();

        function visit(node) {
            if (!node || visited.has(node)) {
                return;
            }

            visited.add(node);

            if (node.tag === 'image-upload' || node.tag === 'small-image-upload') {
                fields.push(node);
            }

            (node.children || []).forEach(visit);
            (node.ifConditions || []).forEach(condition => visit(condition.block));
        }

        visit(compiler.compile(template).ast);
        assert.equal(fields.length, 4);

        for (const field of fields) {
            const requests = [];
            const plugin = loadComponent('ToolsPlugin.vue', {
                BackToTools: {},
                Repeater: {},
                SupportedFeaturesCheck: {},
                mainProcessAPI: { send: (...args) => requests.push(args) }
            });
            const callbackName = field.attrsMap[':onBeforeRemove'];
            const onBeforeRemove = callbackName
                ? plugin.methods[callbackName].bind({ $route: { params: { name: 'test-site' } } })
                : undefined;
            const uploader = field.tag === 'image-upload'
                ? createUploader(Promise.resolve('/media/'), { props: { onBeforeRemove } })
                : new Vue({
                    ...loadComponent('basic-elements/SmallImageUpload.vue'),
                    propsData: { onBeforeRemove }
                });
            let modelValue = 'saved.jpg';
            uploader.filePath = '/media/saved.jpg';
            uploader.fileName = 'saved.jpg';
            uploader.isEmpty = false;
            await Vue.nextTick();
            uploader.$on('input', value => { modelValue = value; });

            uploader.remove({ preventDefault() {} });
            await Vue.nextTick();

            assert.equal(modelValue, '', field.tag);
            assert.equal(uploader.isEmpty, true, field.tag);
            assert.equal(requests.length, 0, field.tag + ' must wait for settings to be saved before deleting files');
            uploader.$destroy();
        }
    });
});
