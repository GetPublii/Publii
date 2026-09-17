const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
    createSafeSender,
    forkWorkerWithLogs,
    trackWorkerProcess,
    abortWorkerProcess,
    abortWindowWorkerProcess
} = require('../ipc.helper.js');

function createWebContents (id) {
    return {
        id,
        destroyed: false,
        sent: [],
        isDestroyed () {
            return this.destroyed;
        },
        send (channel, ...args) {
            this.sent.push({ channel, args });
        }
    };
}

function createWorkerProcess () {
    let listeners = {};

    return {
        connected: true,
        exitCode: null,
        signalCode: null,
        killed: false,
        messages: [],
        on (eventName, callback) {
            listeners[eventName] = callback;
        },
        emit (eventName) {
            if (listeners[eventName]) {
                listeners[eventName]();
            }
        },
        send (message) {
            this.messages.push(message);
        },
        kill () {
            this.killed = true;
            this.signalCode = 'SIGTERM';
        }
    };
}

describe('IPC helper', function () {
    it('should drop replies once the window is destroyed', function () {
        let webContents = createWebContents(7);
        let sender = createSafeSender(webContents);

        assert.equal(sender.id, 7);
        assert.equal(sender.send('app-event', { status: true }), true);

        webContents.destroyed = true;

        assert.equal(sender.send('app-event', { status: false }), false);
        assert.equal(sender.isDestroyed(), true);
        assert.deepEqual(webContents.sent, [{ channel: 'app-event', args: [{ status: true }] }]);
    });

    it('should forget a tracked worker once it exits', function () {
        let processes = new Map();
        let first = createWorkerProcess();
        let second = createWorkerProcess();

        trackWorkerProcess(processes, 1, first);
        trackWorkerProcess(processes, 1, second);
        first.emit('exit');

        assert.equal(processes.get(1), second);

        second.emit('exit');

        assert.equal(processes.has(1), false);
    });

    it('should ask the worker to abort and kill it when it keeps running', function (done) {
        let workerProcess = createWorkerProcess();

        abortWorkerProcess(workerProcess, 10);

        assert.deepEqual(workerProcess.messages, [{ type: 'abort' }]);
        assert.equal(workerProcess.killed, false);

        setTimeout(() => {
            assert.equal(workerProcess.killed, true);
            done();
        }, 40);
    });

    it('should not kill a worker which exited after the abort request', function (done) {
        let workerProcess = createWorkerProcess();

        abortWorkerProcess(workerProcess, 10);
        workerProcess.exitCode = 0;

        setTimeout(() => {
            assert.equal(workerProcess.killed, false);
            done();
        }, 40);
    });

    it('should not message a disconnected worker', function () {
        let workerProcess = createWorkerProcess();
        workerProcess.connected = false;
        workerProcess.exitCode = 0;

        abortWorkerProcess(workerProcess, 10);

        assert.deepEqual(workerProcess.messages, []);
    });

    describe('worker logs', function () {
        let directory;
        let workerPath;

        function readLog (name) {
            return fs.readFileSync(path.join(directory, name), 'utf8');
        }

        function runWorker (text, delay = 0) {
            let workerProcess = forkWorkerWithLogs(workerPath, directory, 'rendering');
            let finished = new Promise(resolve => workerProcess.once('exit', resolve));

            workerProcess.send({ text, delay });
            return finished;
        }

        beforeEach(function () {
            directory = fs.mkdtempSync(path.join(os.tmpdir(), 'publii-worker-logs-'));
            workerPath = path.join(directory, 'worker.js');
            fs.writeFileSync(workerPath, `
                process.on('message', message => {
                    console.log(message.text);
                    console.error('error: ' + message.text);
                    setTimeout(() => process.exit(0), message.delay);
                });
            `);
        });

        afterEach(function () {
            fs.rmSync(directory, { recursive: true, force: true });
        });

        it('should start the logs from scratch for a single worker', async function () {
            fs.writeFileSync(path.join(directory, 'rendering-process.log'), 'previous run\n');
            fs.writeFileSync(path.join(directory, 'rendering-errors.log'), 'previous error\n');

            await runWorker('first');

            assert.equal(readLog('rendering-process.log'), 'first\n');
            assert.equal(readLog('rendering-errors.log'), 'error: first\n');
        });

        it('should not write through a symbolic link placed instead of a log', async function () {
            let outsideFile = path.join(directory, 'important.txt');

            fs.writeFileSync(outsideFile, 'keep me');

            try {
                fs.symlinkSync(outsideFile, path.join(directory, 'rendering-process.log'));
            } catch (error) {
                // Creating symbolic links requires additional privileges on Windows
                this.skip();
            }

            await runWorker('first');

            assert.equal(fs.readFileSync(outsideFile, 'utf8'), 'keep me');
            assert.equal(fs.lstatSync(path.join(directory, 'rendering-process.log')).isSymbolicLink(), false);
            assert.equal(readLog('rendering-process.log'), 'first\n');
        });

        it('should keep the output of workers which run in parallel', async function () {
            await Promise.all([
                runWorker('window A', 150),
                runWorker('window B')
            ]);

            let processLog = readLog('rendering-process.log').trim().split('\n').sort();
            let errorsLog = readLog('rendering-errors.log').trim().split('\n').sort();

            assert.deepEqual(processLog, ['window A', 'window B']);
            assert.deepEqual(errorsLog, ['error: window A', 'error: window B']);

            // Once all of them are finished, the next run starts with empty logs again
            await runWorker('next run');

            assert.equal(readLog('rendering-process.log'), 'next run\n');
        });
    });

    it('should abort and forget the worker of a window', function () {
        let processes = new Map();
        let workerProcess = createWorkerProcess();

        trackWorkerProcess(processes, 3, workerProcess);
        abortWindowWorkerProcess(processes, 3);
        abortWindowWorkerProcess(processes, 4);

        assert.deepEqual(workerProcess.messages, [{ type: 'abort' }]);
        assert.equal(processes.has(3), false);
    });
});
