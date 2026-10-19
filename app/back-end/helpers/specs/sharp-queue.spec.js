const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { EventEmitter } = require('node:events');

const helpersDirectory = path.resolve(__dirname, '..');
const queues = [
    { file: 'sharp-queue.js', name: 'sharp', code: 'SHARP_UNAVAILABLE' },
    { file: 'napi-image-queue.js', name: 'napi', code: 'NAPI_UNAVAILABLE' }
];

function createQueue(file, forkError) {
    const child = new EventEmitter();
    child.send = () => {};
    const stubs = {
        child_process: {
            fork() {
                if (forkError) {
                    throw forkError;
                }

                return child;
            }
        }
    };

    function load(name) {
        const context = {
            module: { exports: {} },
            __dirname: helpersDirectory,
            require(request) {
                return stubs[request] || require(request);
            }
        };
        vm.runInNewContext(fs.readFileSync(path.join(helpersDirectory, name), 'utf8'), context);
        return context.module.exports;
    }

    // The queue class has to see the stubbed child_process, so it is loaded the same way.
    const NativeImageQueue = load('native-image-queue.js');
    stubs['./native-image-queue.js'] = NativeImageQueue;

    return { queue: load(file), child, NativeImageQueue };
}

for (const { file, name, code } of queues) {
    describe(`${name} infrastructure error classification`, function () {
        for (const event of ['exit', 'error']) {
            it(`marks a worker ${event} as unavailable and settles all pending jobs`, async function () {
                const { queue, child, NativeImageQueue } = createQueue(file);
                const pending = Promise.allSettled([queue.process({}), queue.process({})]);

                if (event === 'exit') {
                    child.emit('exit', null, 'SIGSEGV');
                } else {
                    child.emit('error', new Error('Worker could not start'));
                }

                for (const result of await pending) {
                    assert.equal(result.status, 'rejected');
                    assert.equal(result.reason.code, code);
                    assert.equal(NativeImageQueue.isEngineUnavailable(result.reason), true);
                    assert.match(result.reason.message, new RegExp('^' + name + '-process-died:'));
                }

                assert.equal(queue.pending.size, 0);
            });
        }

        it('classifies fork and IPC send failures as infrastructure errors', async function () {
            const forkFailure = createQueue(file, new Error('Spawn failed'));
            await assert.rejects(forkFailure.queue.process({}), { code });
            const { queue, child } = createQueue(file);
            child.send = () => {
                throw new Error('IPC channel closed');
            };
            await assert.rejects(queue.process({}), { code });
            assert.equal(queue.pending.size, 0);
        });

        it('preserves the distinction between an unavailable engine and a rejected image', async function () {
            const { queue, child, NativeImageQueue } = createQueue(file);
            const invalid = queue.process({ operation: 'validate-image' });
            child.emit('message', {
                type: 'job-result',
                id: 1,
                success: false,
                error: 'Invalid image contents'
            });
            await assert.rejects(invalid, error => {
                assert.equal(error.message, 'Invalid image contents');
                assert.notEqual(error.code, code);
                assert.equal(NativeImageQueue.isEngineUnavailable(error), false);
                return true;
            });

            const unavailable = queue.process({ operation: 'validate-image' });
            child.emit('message', { type: 'engine-unavailable', error: 'Native library missing' });
            child.emit('message', {
                type: 'job-result',
                id: 2,
                success: false,
                error: name + '-unavailable',
                code: 'ENGINE_UNAVAILABLE'
            });
            await assert.rejects(unavailable, { code });
            await assert.rejects(queue.process({}), { code });
            assert.equal(queue.isAvailable(), false);
        });
    });
}

describe('Native engine error classification helper', function () {
    it('recognises unavailable errors by flag or legacy code only', function () {
        const { NativeImageQueue } = createQueue('sharp-queue.js');

        assert.equal(NativeImageQueue.isEngineUnavailable({ engineUnavailable: true }), true);
        assert.equal(NativeImageQueue.isEngineUnavailable({ code: 'SHARP_UNAVAILABLE' }), true);
        assert.equal(NativeImageQueue.isEngineUnavailable({ code: 'NAPI_UNAVAILABLE' }), true);
        assert.equal(NativeImageQueue.isEngineUnavailable(new Error('Invalid image contents')), false);
        assert.equal(NativeImageQueue.isEngineUnavailable(null), false);
    });
});
