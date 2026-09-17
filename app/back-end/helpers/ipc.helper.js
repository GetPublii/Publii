/*
 * Helpers for the IPC communication between the main process, renderer windows and worker processes
 */

const childProcess = require('child_process');
const fs = require('fs');
const path = require('path');

// '<logsDir>/<logName>' -> number of running workers which write to these '-process.log' and '-errors.log' files
const runningLoggedWorkers = new Map();

/**
 * Wraps a renderer's webContents so replies are dropped silently once its window is closed
 *
 * @param {Electron.WebContents} webContents
 * @returns {{ id: number, isDestroyed: function, send: function }}
 */
function createSafeSender (webContents) {
    return {
        id: webContents.id,
        isDestroyed: () => webContents.isDestroyed(),
        send (channel, ...args) {
            if (webContents.isDestroyed()) {
                return false;
            }

            webContents.send(channel, ...args);
            return true;
        }
    };
}

/**
 * Forks a worker with its output redirected to the '<logName>-process.log' and '<logName>-errors.log' files
 *
 * Logs of a website have their own directory, but workers of the same kind can still overlap: general logs
 * are shared by all windows and a window can start an operation before the previous one has exited.
 * Every worker appends to the logs, so parallel workers never overwrite each other's output. The logs start
 * from scratch only when no other worker writes to them.
 *
 * @param {string} workerPath
 * @param {string} logsDir - see helpers/site-logs.js
 * @param {string} logName
 * @returns {ChildProcess}
 */
function forkWorkerWithLogs (workerPath, logsDir, logName) {
    let logKey = path.join(logsDir, logName);
    let isOnlyWriter = !runningLoggedWorkers.get(logKey);
    let descriptors = [];
    let workerProcess;

    try {
        fs.mkdirSync(logsDir, { recursive: true });

        for (let suffix of ['-process.log', '-errors.log']) {
            let logPath = path.join(logsDir, logName + suffix);

            if (isOnlyWriter) {
                fs.writeFileSync(logPath, '');
            }

            descriptors.push(fs.openSync(logPath, 'a'));
        }

        workerProcess = childProcess.fork(workerPath, {
            stdio: [null, descriptors[0], descriptors[1], 'ipc']
        });
    } finally {
        // The worker has got its own copies of the descriptors
        for (let descriptor of descriptors) {
            fs.closeSync(descriptor);
        }
    }

    let isCounted = true;
    let forgetWorker = () => {
        if (isCounted) {
            isCounted = false;
            let stillRunning = (runningLoggedWorkers.get(logKey) || 1) - 1;

            if (stillRunning > 0) {
                runningLoggedWorkers.set(logKey, stillRunning);
            } else {
                runningLoggedWorkers.delete(logKey);
            }
        }
    };

    runningLoggedWorkers.set(logKey, (runningLoggedWorkers.get(logKey) || 0) + 1);
    workerProcess.once('exit', forgetWorker);
    workerProcess.once('error', forgetWorker);

    return workerProcess;
}

/**
 * Remembers the worker started by a window and forgets it once the worker exits
 *
 * @param {Map} processes - webContentsId -> ChildProcess
 * @param {number} webContentsId
 * @param {ChildProcess} workerProcess
 */
function trackWorkerProcess (processes, webContentsId, workerProcess) {
    if (!workerProcess) {
        return;
    }

    processes.set(webContentsId, workerProcess);

    workerProcess.on('exit', () => {
        if (processes.get(webContentsId) === workerProcess) {
            processes.delete(webContentsId);
        }
    });
}

/**
 * Asks a worker to abort and kills it when it does not exit on its own
 *
 * @param {ChildProcess} workerProcess
 * @param {number} killTimeout - milliseconds to wait before the worker is killed
 */
function abortWorkerProcess (workerProcess, killTimeout = 5000) {
    if (!workerProcess) {
        return;
    }

    try {
        if (workerProcess.connected) {
            workerProcess.send({ type: 'abort' });
        }
    } catch (error) {
        console.log('[IPC] Unable to abort the worker process:', error);
    }

    let killTimer = setTimeout(() => {
        if (workerProcess.exitCode === null && workerProcess.signalCode === null) {
            workerProcess.kill();
        }
    }, killTimeout);

    if (typeof killTimer.unref === 'function') {
        killTimer.unref();
    }
}

/**
 * Aborts and forgets the worker started by the given window
 *
 * @param {Map} processes - webContentsId -> ChildProcess
 * @param {number} webContentsId
 */
function abortWindowWorkerProcess (processes, webContentsId) {
    let workerProcess = processes.get(webContentsId);

    if (workerProcess) {
        abortWorkerProcess(workerProcess);
        processes.delete(webContentsId);
    }
}

module.exports = {
    createSafeSender,
    forkWorkerWithLogs,
    trackWorkerProcess,
    abortWorkerProcess,
    abortWindowWorkerProcess
};
