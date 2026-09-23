const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { EventEmitter } = require('node:events');
const ipcHelper = require('../../helpers/ipc.helper');

describe('Thumbnail regeneration IPC lifecycle', function () {
    let handlers;
    let events;
    let workers;
    let replies;
    let progress;
    let sender;
    let closeWindow;
    let startError;

    function start(runId) {
        return handlers.get('app-site-regenerate-thumbnails')({ sender }, {
            name: 'demo',
            runId
        });
    }

    function stop() {
        handlers.get('app-site-abort-regenerate-thumbnails')({ sender });
    }

    function finish(worker, code = 0) {
        worker.exitCode = code;
        worker.connected = false;
        worker.emit('exit', code, null);
        worker.emit('close', code, null);
    }

    beforeEach(function () {
        handlers = new Map();
        workers = [];
        replies = [];
        progress = [];
        startError = null;
        sender = {
            id: 7,
            isDestroyed: () => false,
            send(channel, data) {
                replies.push({ channel, data: JSON.parse(JSON.stringify(data)) });
            }
        };

        class Site {
            static removeTemporaryBackupFiles() {}

            regenerateThumbnails(target) {
                if (startError) {
                    target.send('app-site-regenerate-thumbnails-error', {
                        message: { translation: startError }
                    });
                    return;
                }

                const worker = new EventEmitter();
                worker.exitCode = null;
                worker.signalCode = null;
                worker.connected = true;
                worker.commands = [];
                worker.send = message => worker.commands.push(message.type);
                worker.kill = () => finish(worker, 1);
                worker.on('message', data => {
                    target.send(data.type === 'finished'
                        ? 'app-site-regenerate-thumbnails-success'
                        : 'app-site-regenerate-thumbnails-progress', data);
                });
                workers.push(worker);
                return worker;
            }
        }

        const context = {
            module: { exports: {} },
            console: { log() {} },
            require(name) {
                if (name === 'electron') {
                    return {
                        ipcMain: {
                            on: (channel, handler) => handlers.set(channel, handler),
                            handle() {}
                        },
                        BrowserWindow: {
                            fromWebContents: () => ({
                                isDestroyed: () => false,
                                setProgressBar: value => progress.push(value)
                            })
                        }
                    };
                }

                if (name === '../site.js') {
                    return Site;
                }

                if (name === '../helpers/ipc.helper.js') {
                    return ipcHelper;
                }

                return {};
            }
        };

        vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../site.js'), 'utf8'), context);
        events = new context.module.exports({
            windowManager: {
                onWindowDestroyed(callback) {
                    closeWindow = callback;
                }
            }
        });
        events.siteDirExists = () => true;
    });

    afterEach(function () {
        for (const worker of workers) {
            if (worker.exitCode === null) {
                finish(worker);
            }
        }
    });

    it('waits for the previous worker before starting and ignores its late replies', async function () {
        await start('first');
        workers[0].emit('message', { type: 'progress', processed: 1, total: 4 });
        assert.equal(replies[0].data.runId, 'first');

        const restarted = start('second');
        assert.equal(workers.length, 1);
        assert.deepEqual(workers[0].commands, ['abort']);

        workers[0].emit('message', { type: 'progress', processed: 4, total: 4 });
        workers[0].emit('message', { type: 'finished' });
        assert.equal(replies.length, 1);
        assert.deepEqual(progress, [0.25]);

        finish(workers[0]);
        await restarted;
        assert.equal(workers.length, 2);
        workers[1].emit('message', { type: 'finished' });
        assert.equal(replies[1].data.runId, 'second');
        assert.equal(replies[1].channel, 'app-site-regenerate-thumbnails-success');
    });

    it('also waits after Stop followed immediately by Start', async function () {
        await start('first');
        stop();
        const restarted = start('second');

        assert.equal(workers.length, 1);
        assert.equal(events.regenerateProcesses.get(sender.id), workers[0]);
        finish(workers[0]);
        await restarted;
        assert.equal(workers.length, 2);
    });

    it('starts only the latest request when several restarts are queued', async function () {
        await start('first');
        const second = start('second');
        const third = start('third');
        finish(workers[0]);
        await Promise.all([second, third]);

        assert.equal(workers.length, 2);
        workers[1].emit('message', { type: 'finished' });
        assert.equal(replies.length, 1);
        assert.equal(replies[0].data.runId, 'third');
    });

    it('cancels a queued restart when Stop is pressed', async function () {
        await start('first');
        const restarted = start('second');
        stop();
        finish(workers[0]);
        await restarted;

        assert.equal(workers.length, 1);
        assert.equal(replies.length, 0);
        assert.equal(events.regenerateRequests.size, 0);
        assert.equal(events.regenerateProcesses.size, 0);
    });

    it('cancels a queued restart when its window closes', async function () {
        await start('first');
        const restarted = start('second');
        sender.isDestroyed = () => true;
        closeWindow(sender.id);
        finish(workers[0]);
        await restarted;

        assert.equal(workers.length, 1);
        assert.equal(replies.length, 0);
        assert.equal(events.regenerateRequests.size, 0);
    });

    it('tags errors reported before a worker starts with the request ID', async function () {
        startError = 'core.site.noThemeSelected';
        await start('first');

        assert.equal(workers.length, 0);
        assert.equal(replies[0].data.runId, 'first');
        assert.equal(replies[0].data.message.translation, startError);
        assert.equal(events.regenerateRequests.size, 0);
    });

    it('reports an unexpected exit instead of leaving the UI running', async function () {
        await start('first');
        finish(workers[0], 1);

        assert.equal(replies.length, 1);
        assert.equal(replies[0].channel, 'app-site-regenerate-thumbnails-error');
        assert.equal(replies[0].data.runId, 'first');
        assert.equal(events.regenerateRequests.size, 0);
    });

    it('does not send a second error after a worker error and close', async function () {
        await start('first');
        workers[0].emit('error', new Error('Worker failed'));
        finish(workers[0], 1);

        assert.equal(replies.length, 1);
        assert.equal(replies[0].channel, 'app-site-regenerate-thumbnails-error');
    });
});
