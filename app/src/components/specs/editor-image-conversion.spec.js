const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const webpack = require('webpack');
const sharp = require('sharp');

const repository = path.resolve(__dirname, '../../../..');
const backendPath = path.join(repository, 'app/back-end/events/image-uploader.js');
const requireFromBackend = createRequire(backendPath);
const backendSource = fs.readFileSync(backendPath, 'utf8');
const preloadSource = fs.readFileSync(path.join(repository, 'app/back-end/app-preload.js'), 'utf8');

function createHarness(bundle, advanced = {}, siteDir = '/sites/test-site') {
    const handlers = new Map();
    const calls = [];
    let bridge;
    const backend = {
        module: { exports: {} },
        require(name) {
            if (name === 'electron') {
                return {
                    ipcMain: {
                        handle: (channel, handler) => handlers.set(channel, handler),
                        on() {}
                    }
                };
            }

            if (name === '../image.js') {
                return {};
            }

            return requireFromBackend(name);
        }
    };
    vm.runInNewContext(backendSource, backend);
    new backend.module.exports({
        sites: {
            'test-site': { advanced }
        }
    });
    vm.runInNewContext(preloadSource, {
        require(name) {
            assert.equal(name, 'electron');

            return {
                contextBridge: {
                    exposeInMainWorld(name, api) {
                        assert.equal(name, 'mainProcessAPI');
                        bridge = api;
                    }
                },
                ipcRenderer: {
                    async invoke(channel, data) {
                        calls.push({ channel, data });
                        assert.ok(handlers.has(channel), 'The IPC command must have a backend handler');

                        return handlers.get(channel)({}, data);
                    }
                }
            };
        }
    });
    const renderer = { mainProcessAPI: bridge };
    vm.runInNewContext(bundle, renderer);

    return {
        helper: renderer.EditorHelper.default,
        bridge,
        calls,
        store: {
            state: {
                currentSite: {
                    siteDir,
                    config: { name: 'test-site' }
                },
                app: {
                    config: { timeFormat: 24 }
                }
            }
        }
    };
}

function gallery(original, thumbnail) {
    return `<figure class="gallery__item"><a href="${original}"><img src="${thumbnail}"></a></figure>`;
}

function itemData(text, itemType) {
    return {
        [itemType + 's']: [{
            id: 7,
            title: 'Gallery post',
            text,
            slug: 'gallery-post',
            status: 'published',
            created_at: 1,
            modified_at: 2,
            template: ''
        }],
        author: [{ id: 1 }],
        tags: [],
        additionalData: {},
        [itemType + 'ViewSettings']: {}
    };
}

describe('Editor image conversion across the isolated renderer boundary', function () {
    let directory;
    let bundle;

    before(async function () {
        this.timeout(15000);
        directory = fs.mkdtempSync(path.join(os.tmpdir(), 'publii-editor-conversion-'));
        const config = require(path.join(repository, 'webpack.config.js'));
        const compiler = webpack({
            ...config,
            mode: 'development',
            devtool: false,
            entry: path.join(repository, 'app/src/components/post-editor/ItemHelper.js'),
            output: {
                path: directory,
                filename: 'editor.js',
                library: {
                    name: 'EditorHelper',
                    type: 'var'
                }
            }
        });

        try {
            const stats = await new Promise((resolve, reject) => {
                compiler.run((error, result) => error ? reject(error) : resolve(result));
            });
            assert.equal(stats.hasErrors(), false, stats.toString({ all: false, errors: true }));
            bundle = fs.readFileSync(path.join(directory, 'editor.js'), 'utf8');
        } finally {
            await new Promise((resolve, reject) => {
                compiler.close(error => error ? reject(error) : resolve());
            });
        }
    });

    after(function () {
        if (directory) {
            fs.rmSync(directory, { recursive: true, force: true });
        }
    });

    it('loads the compiled editor helper without require or other Node globals', function () {
        const renderer = {};
        vm.runInNewContext(bundle, renderer);
        assert.equal(typeof renderer.EditorHelper.default.loadItemData, 'function');
    });

    for (const itemType of ['post', 'page']) {
        for (const format of ['none', 'webp', 'avif']) {
            it(`loads ${itemType} galleries using ${format} settings from the backend`, async function () {
                const harness = createHarness(bundle, {
                    forceWebp: format === 'webp',
                    forceAvif: format === 'avif'
                });
                const text = gallery('#DOMAIN_NAME#photo.jpg', '#DOMAIN_NAME#photo-thumbnail.avif');
                const data = itemData(text, itemType);
                const result = await harness.helper.loadItemData(
                    data,
                    harness.store,
                    () => ({ format: () => 'Date' }),
                    itemType
                );
                const extension = format === 'none' ? 'jpg' : format;
                assert.ok(result.text.includes(`photo-thumbnail.${extension}"`));
                assert.ok(result.text.includes('href="file:////sites/test-site/input/media/posts/7/photo.jpg"'));
                assert.equal(result.title, 'Gallery post');
                assert.equal(data[itemType + 's'][0].text, text);
                assert.equal(harness.calls.length, 1);
                assert.equal(harness.calls[0].channel, 'app-image:convert-gallery-thumbnails');
            });
        }
    }

    it('does not send gallery conversion requests for text without galleries', async function () {
        const harness = createHarness(bundle, { forceAvif: true });
        const text = '<p>Text with an inline image.</p><img src="file:///photo.jpg">';
        assert.equal(await harness.helper.setWebpCompatibility(harness.store, text), text);
        assert.equal(harness.calls.length, 0);
    });

    it('preserves animated WebP galleries while converting static WebP to AVIF', async function () {
        const siteDir = path.join(directory, 'site & images');
        const mediaDir = path.join(siteDir, 'input/media/posts/7');
        fs.mkdirSync(mediaDir, { recursive: true });
        const frames = [];

        const backgrounds = [
            { r: 255, g: 0, b: 0 },
            { r: 0, g: 0, b: 255 }
        ];

        for (const background of backgrounds) {
            frames.push(await sharp({
                create: {
                    width: 16,
                    height: 16,
                    channels: 3,
                    background
                }
            }).png().toBuffer());
        }

        await sharp(frames, { join: { animated: true } }).webp().toFile(path.join(mediaDir, 'animated photo.webp'));
        await sharp(frames[0]).webp().toFile(path.join(mediaDir, 'static.webp'));
        const harness = createHarness(bundle, { forceAvif: true }, siteDir);
        const text = gallery('#DOMAIN_NAME#animated%20photo.webp', '#DOMAIN_NAME#animated%20photo-thumbnail.webp') +
            gallery('#DOMAIN_NAME#static.webp', '#DOMAIN_NAME#static-thumbnail.webp');
        const result = await harness.helper.loadItemData(
            itemData(text, 'post'),
            harness.store,
            () => ({ format: () => 'Date' })
        );
        assert.ok(result.text.includes('animated%20photo-thumbnail.webp"'));
        assert.ok(result.text.includes('static-thumbnail.avif"'));
    });

    it('rejects requests without valid text and an existing site', async function () {
        const harness = createHarness(bundle);

        for (const data of [
            null,
            { site: 'test-site', text: null },
            { site: '../test-site', text: '' },
            { site: 'missing-site', text: '' },
            { site: 'toString', text: '' }
        ]) {
            await assert.rejects(
                harness.bridge.invoke('app-image:convert-gallery-thumbnails', data),
                /Invalid gallery conversion request/
            );
        }
    });
});

describe('Editor initialization after asynchronous image preparation', function () {
    for (const editor of ['TinyMCE', 'Markdown', 'BlockEditor']) {
        for (const itemType of ['post', 'page']) {
            it(`waits for prepared ${itemType} content in ${editor}`, async function () {
                const source = fs.readFileSync(path.join(__dirname, `../PostEditor${editor}.vue`), 'utf8');
                const method = source.match(/        loadPostData \(\) \{([\s\S]*?)\n        \},/)[1];
                let respond;
                let finishPreparation;
                let initialized = false;
                let watcherScheduled = false;
                const prepared = new Promise(resolve => {
                    finishPreparation = resolve;
                });
                const loadedData = { title: 'Ready', text: '<p>Prepared text</p>' };
                const context = {
                    mainProcessAPI: {
                        send() {},
                        receiveOnce(channel, callback) {
                            assert.equal(channel, `app-${itemType}-loaded`);
                            respond = callback;
                        }
                    },
                    ItemHelper: {
                        loadItemData: () => prepared
                    },
                    Utils: {
                        deepMerge(current, loaded) {
                            assert.equal(loaded, loadedData);
                            initialized = true;

                            return loaded;
                        }
                    },
                    $: () => ({ val() {} }),
                    setTimeout() {
                        watcherScheduled = true;
                    }
                };
                const loadPostData = vm.runInNewContext('(function () {' + method + '\n})', context);
                const component = {
                    itemType,
                    postID: 7,
                    postData: {},
                    $store: {
                        state: {
                            currentSite: {
                                config: { name: 'test-site' }
                            }
                        }
                    },
                    $refs: {
                        'post-title': {},
                        tinymceEditor: { init() {} }
                    },
                    $bus: { $emit() {} }
                };
                loadPostData.call(component);
                const response = respond({});
                assert.equal(initialized, false);
                assert.equal(watcherScheduled, false);
                finishPreparation(loadedData);
                await response;
                assert.equal(initialized, true);
                assert.equal(watcherScheduled, true);
                assert.equal(component.postData.text, loadedData.text);
            });
        }
    }
});
