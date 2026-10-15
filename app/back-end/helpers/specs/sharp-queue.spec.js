const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { EventEmitter } = require('node:events');

function createQueue(forkError) {
    const child = new EventEmitter();
    child.send = () => {};
    const context = {
        module: { exports: {} },
        __dirname: path.resolve(__dirname, '..'),
        require(name) {
            if (name === 'child_process') {
                return {
                    fork() {
                        if (forkError) {
                            throw forkError;
                        }

                        return child;
                    }
                };
            }

            return require(name);
        }
    };
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../sharp-queue.js'), 'utf8'), context);
    return { queue: context.module.exports, child };
}

describe('Sharp infrastructure error classification', function () {
    for (const event of ['exit', 'error']) {
        it(`marks a worker ${event} as unavailable and settles all pending jobs`, async function () {
            const { queue, child } = createQueue();
            const pending = Promise.allSettled([queue.process({}), queue.process({})]);

            if (event === 'exit') {
                child.emit('exit', null, 'SIGSEGV');
            } else {
                child.emit('error', new Error('Worker could not start'));
            }

            for (const result of await pending) {
                assert.equal(result.status, 'rejected');
                assert.equal(result.reason.code, 'SHARP_UNAVAILABLE');
                assert.match(result.reason.message, /^sharp-process-died:/);
            }

            assert.equal(queue.pending.size, 0);
        });
    }

    it('classifies fork and IPC send failures as infrastructure errors', async function () {
        const forkFailure = createQueue(new Error('Spawn failed'));
        await assert.rejects(forkFailure.queue.process({}), { code: 'SHARP_UNAVAILABLE' });
        const { queue, child } = createQueue();
        child.send = () => {
            throw new Error('IPC channel closed');
        };
        await assert.rejects(queue.process({}), { code: 'SHARP_UNAVAILABLE' });
        assert.equal(queue.pending.size, 0);
    });

    it('preserves the distinction between unavailable Sharp and a rejected image', async function () {
        const { queue, child } = createQueue();
        const invalid = queue.process({ operation: 'validate-image' });
        child.emit('message', {
            type: 'job-result',
            id: 1,
            success: false,
            error: 'Invalid image contents'
        });
        await assert.rejects(invalid, error => {
            assert.equal(error.message, 'Invalid image contents');
            assert.notEqual(error.code, 'SHARP_UNAVAILABLE');
            return true;
        });

        const unavailable = queue.process({ operation: 'validate-image' });
        child.emit('message', { type: 'sharp-unavailable', error: 'Native library missing' });
        child.emit('message', {
            type: 'job-result',
            id: 2,
            success: false,
            error: 'sharp-unavailable',
            code: 'SHARP_UNAVAILABLE'
        });
        await assert.rejects(unavailable, { code: 'SHARP_UNAVAILABLE' });
        await assert.rejects(queue.process({}), { code: 'SHARP_UNAVAILABLE' });
        assert.equal(queue.isAvailable(), false);
    });
});
