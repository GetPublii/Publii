const assert = require('node:assert/strict');
const {
    createSafeSender,
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
