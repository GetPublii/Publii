const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const Vue = require('../../../node_modules/vue');
const compiler = require('../../../../node_modules/vue-template-compiler');
const sharp = require('../../../node_modules/sharp');
const validateImageUpload = require('../../../back-end/helpers/validate-image-upload');
const sharpQueue = require('../../../back-end/helpers/sharp-queue');
const { accept: imageAccept } = require('../../../config/image-upload-formats');

const components = path.resolve(__dirname, '..');
const uploaderSource = fs.readFileSync(path.join(components, 'basic-elements/ImageUpload.vue'), 'utf8');
const parsedUploader = compiler.parseComponent(uploaderSource);
const compiledUploader = compiler.compile(parsedUploader.template.content);
const workerSource = fs.readFileSync(path.resolve(components, '../../back-end/workers/thumbnails/post-images.js'), 'utf8');

function uploadFields(directory = components) {
    const fields = [];
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const filename = path.join(directory, entry.name);
        if (entry.isDirectory()) {
            fields.push(...uploadFields(filename));
            continue;
        }
        if (!entry.name.endsWith('.vue')) {
            continue;
        }
        const source = fs.readFileSync(filename, 'utf8');
        if (!source.includes('<image-upload')) {
            continue;
        }
        const parsed = compiler.parseComponent(source);
        const visited = new Set();
        function visit(node) {
            if (!node || visited.has(node)) {
                return;
            }
            visited.add(node);
            if (node.tag === 'image-upload') {
                fields.push({
                    filename: path.relative(components, filename),
                    attributes: node.attrsMap,
                    model: node.attrsMap['v-model']
                });
            }
            (node.children || []).forEach(visit);
            (node.ifConditions || []).forEach(condition => visit(condition.block));
        }
        visit(compiler.compile(parsed.template.content).ast);
    }
    return fields;
}

function createUploader(field, engine) {
    const calls = { saves: 0, alerts: [], requests: [] };
    const api = {
        normalizePath: async value => value,
        getPathForFile: file => file.path,
        async invoke(channel, payload) {
            assert.equal(channel, 'app-image:upload');
            calls.requests.push(payload);
            let handler;
            let reply;
            vm.runInNewContext(workerSource, {
                require(name) {
                    if (name === './../../image.js') {
                        return class {
                            save() {
                                calls.saves++;
                                return {};
                            }
                        };
                    }
                    if (name === '../../helpers/validate-image-upload.js') {
                        return validateImageUpload;
                    }
                    if (name === 'normalize-path') {
                        return value => value;
                    }
                    return require(name);
                },
                process: {
                    on(event, callback) { handler = callback; },
                    send(message) { reply = message.result; },
                    exit() {}
                },
                setTimeout() {},
                console
            });
            await handler({
                type: 'dependencies',
                appInstance: { appConfig: { resizeEngine: engine } },
                imageData: payload
            });
            return reply || { baseImage: { newPath: '/target/photo.png' } };
        }
    };
    const context = {
        module: { exports: {} },
        imageAccept,
        PButton: {},
        UploadProgress: {},
        mainProcessAPI: api,
        setTimeout
    };
    vm.runInNewContext(
        parsedUploader.script.content.replace(/^import .*;\s*$/gm, '').replace('export default', 'module.exports ='),
        context
    );
    const definition = context.module.exports;
    const props = { imageType: field.attributes.imageType || 'optionImages' };
    if ('images-only' in field.attributes) {
        props.imagesOnly = true;
    }
    if (':images-only' in field.attributes || ':imagesOnly' in field.attributes) {
        throw new Error('Dynamic image validation policy requires a dedicated test');
    }
    const uploader = new Vue({
        ...definition,
        propsData: props,
        computed: {
            ...definition.computed,
            mediaPath: () => Promise.resolve('/target/')
        },
        render: new Function(compiledUploader.render),
        staticRenderFns: compiledUploader.staticRenderFns.map(code => new Function(code))
    });
    uploader.$t = key => key;
    uploader.$store = { state: { currentSite: { config: { name: 'fixture' } } } };
    uploader.$refs.input = { value: '' };
    uploader.$bus = new Vue();
    uploader.$bus.$on('alert-display', alert => calls.alerts.push(alert));
    uploader.$on('input', value => { uploader.value = value; });
    return { uploader, calls };
}

function nodes(node) {
    return node ? [node, ...(node.children || []).flatMap(nodes)] : [];
}

const fields = uploadFields();
describe('Image validation through actual uploader usages and the Sharp worker', function () {
    this.timeout(15000);
    let directory;

    before(async () => {
        directory = fs.mkdtempSync(path.join(os.tmpdir(), 'publii-upload-contract-'));
        await sharp({
            create: {
                width: 2,
                height: 2,
                channels: 3,
                background: { r: 51, g: 102, b: 153 }
            }
        }).png().toFile(path.join(directory, 'photo.png'));
        fs.writeFileSync(path.join(directory, 'renamed.png'), '%PDF-1.7\nnot an image');
        fs.writeFileSync(path.join(directory, 'broken.svg'), '<svg><path></svg>');
        fs.writeFileSync(path.join(directory, 'document.pdf'), '%PDF-1.7\nnot an image');
    });

    after(() => {
        sharpQueue.shutdown();
        fs.rmSync(directory, { recursive: true, force: true });
    });

    for (const [index, field] of fields.entries()) {
        it(`${field.filename}: ${field.model} [${index + 1}] validates picker and drop before saving`, async () => {
            const { uploader, calls } = createUploader(field, 'sharp');
            try {
                const input = nodes(uploader._render()).find(node => node.tag === 'input');
                assert.equal(input.data.attrs.accept, imageAccept);
                await uploader.setImage('/target/existing.png');
                for (const name of ['renamed.png', 'broken.svg', 'document.pdf']) {
                    const file = { path: path.join(directory, name) };
                    await uploader.valueChanged({ target: { files: [file] } });
                    await uploader.drop({
                        preventDefault() {},
                        stopPropagation() {},
                        dataTransfer: { files: [file], types: ['Files'] }
                    });
                }
                assert.equal(calls.saves, 0);
                assert.equal(calls.alerts.length, 6);
                assert.ok(calls.requests.every(request => request.imagesOnly === true));
                assert.ok(calls.alerts.every(alert => alert.message === 'core.images.invalidImageFile'));
                assert.equal(uploader.value, 'existing.png');
                assert.equal(uploader.filePath, '/target/existing.png');
                assert.equal(uploader.isUploading, false);

                await uploader.uploadImage(path.join(directory, 'photo.png'));
                assert.equal(calls.saves, 1);
                assert.equal(uploader.value, 'photo.png');
                assert.equal(uploader.filePath, '/target/photo.png');
            } finally {
                uploader.$destroy();
            }
        });
    }

    it('retains the explicit Jimp bypass with image-only uploaders', async () => {
        const { uploader, calls } = createUploader(fields[0], 'jimp');
        try {
            await uploader.uploadImage(path.join(directory, 'renamed.png'));
            assert.equal(calls.saves, 1);
            assert.equal(calls.alerts.length, 0);
        } finally {
            uploader.$destroy();
        }
    });
});

describe('Markdown image upload validation', () => {
    it('requests content validation and removes only the temporary text on rejection', async () => {
        const requests = [];
        const messages = [];
        let reply;
        let text = 'Existing content';
        const context = {
            document: {
                querySelector: () => ({ getAttribute: () => '7' })
            },
            window: {
                app: {
                    getSiteName: () => 'fixture',
                    translate: key => key + ': {file}',
                    showMessage: message => messages.push(message)
                }
            },
            mainProcessAPI: {
                normalizePath: async value => value,
                getPathForFile: file => file.path,
                send(channel, payload) {
                    requests.push({ channel, payload });
                },
                receiveOnce(channel, callback) {
                    reply = callback;
                }
            }
        };
        const source = fs.readFileSync(path.join(components, 'post-editor/CodeMirror/inline-attachment.js'), 'utf8');
        vm.runInNewContext(source, context);
        const attachment = new context.window.inlineAttachment({}, {
            getValue: () => text,
            setValue: value => { text = value; },
            insertValue: value => { text += value; }
        });
        const file = { path: '/fixture/broken.svg', type: 'image/svg+xml' };
        attachment.onFileInserted(file);
        assert.equal(text, 'Existing content![Uploading file...]()');
        await attachment.uploadFile(file);
        assert.equal(requests[0].payload.imagesOnly, true);
        assert.equal(requests[0].payload.imageType, 'contentImages');
        reply({
            error: true,
            translation: 'core.images.invalidImageFile',
            file: 'broken.svg'
        });
        assert.equal(text, 'Existing content');
        assert.equal(messages[0].text, 'core.images.invalidImageFile: broken.svg');
    });
});
