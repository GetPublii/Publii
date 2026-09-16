/*
 * Helpers for the IPC communication between the main process and renderer windows
 */

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
    trackWorkerProcess,
    abortWorkerProcess,
    abortWindowWorkerProcess
};
