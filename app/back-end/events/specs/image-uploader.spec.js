const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { EventEmitter } = require('node:events');

function createHarness() {
    const invokeHandlers = new Map();
    const eventHandlers = new Map();
    const workers = [];
    const context = {
        module: { exports: {} },
        __dirname: path.resolve(__dirname, '..'),
        require(name) {
            if (name === 'electron') {
                return {
                    ipcMain: {
                        handle: (channel, handler) => invokeHandlers.set(channel, handler),
                        on: (channel, handler) => eventHandlers.set(channel, handler)
                    }
                };
            }

            if (name === 'child_process') {
                return {
                    fork() {
                        const worker = new EventEmitter();
                        worker.messages = [];
                        worker.send = (message, callback) => {
                            worker.messages.push(message);
                            callback?.(null);
                        };
                        workers.push(worker);
                        return worker;
                    }
                };
            }

            if (name === '../image.js' || name === '../helpers/path-validator.js') {
                return {};
            }

            return require(name);
        }
    };
    const source = fs.readFileSync(path.resolve(__dirname, '../image-uploader.js'), 'utf8');
    vm.runInNewContext(source, context);
    new context.module.exports({ appConfig: {}, appDir: '/app', sitesDir: '/sites' });

    return { invokeHandlers, eventHandlers, workers };
}

describe('Image upload request isolation', function () {
    it('returns out-of-order results to the correct upload without broadcasting them', async function () {
        const { invokeHandlers, workers } = createHarness();
        const upload = invokeHandlers.get('app-image:upload');
        const first = upload({}, { path: '/source/first.png' });
        const second = upload({}, { path: '/source/second.png' });
        const firstResult = { baseImage: { newPath: '/target/first.png' } };
        const secondResult = { baseImage: { newPath: '/target/second.png' } };

        workers[1].emit('message', { type: 'image-copied' });
        assert.equal(workers[1].messages[1].type, 'start-regenerating');
        workers[1].emit('message', { type: 'finished', result: secondResult });
        assert.equal(await second, secondResult);
        workers[0].emit('message', { type: 'finished', result: firstResult });
        assert.equal(await first, firstResult);
        workers[0].emit('exit', 0);
        workers[1].emit('exit', 0);
    });

    it('keeps the legacy event result separate from a field upload', async function () {
        const { invokeHandlers, eventHandlers, workers } = createHarness();
        const replies = [];
        const event = {
            sender: {
                isDestroyed: () => false,
                send: (...args) => replies.push(args)
            }
        };
        const modern = invokeHandlers.get('app-image:upload')(event, { path: '/field.png' });
        const legacy = eventHandlers.get('app-image-upload')(event, { path: '/editor.png' });
        const modernResult = { baseImage: { newPath: '/target/field.png' } };
        const legacyResult = { baseImage: { newPath: '/target/editor.png' } };

        workers[0].emit('message', { type: 'finished', result: modernResult });
        assert.equal(await modern, modernResult);
        assert.equal(replies.length, 0);
        workers[1].emit('message', { type: 'finished', result: legacyResult });
        await legacy;
        assert.equal(replies.length, 1);
        assert.equal(replies[0][0], 'app-image-uploaded');
        assert.equal(replies[0][1], legacyResult);
    });

    for (const eventName of ['error', 'exit', 'disconnect']) {
        it('finishes with an error when the worker reports ' + eventName, async function () {
            const { invokeHandlers, workers } = createHarness();
            const promise = invokeHandlers.get('app-image:upload')({}, { path: '/source/photo.png' });
            workers[0].emit(eventName, new Error('worker failed'));
            const result = await promise;
            assert.equal(result.error, true);
            assert.equal(result.file, 'photo.png');
        });
    }

    it('passes validation errors through without replacing their translation', async function () {
        const { invokeHandlers, workers } = createHarness();
        const promise = invokeHandlers.get('app-image:upload')({}, { path: '/source/file.pdf' });
        const failure = {
            error: true,
            translation: 'core.images.invalidImageFile',
            file: 'file.pdf'
        };
        workers[0].emit('message', { type: 'finished', result: failure });
        assert.equal(await promise, failure);
    });
});
