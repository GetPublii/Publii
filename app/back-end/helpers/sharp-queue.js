const childProcess = require('child_process');
const path = require('path');

function createUnavailableError(message, cause) {
    const error = new Error(message);
    error.code = 'SHARP_UNAVAILABLE';

    if (cause) {
        error.cause = cause;
    }

    return error;
}

class SharpQueue {
    constructor() {
        this.child = null;
        this.pending = new Map();
        this.nextId = 1;
        this.consecutiveFailures = 0;
        this.permanentlyDisabled = false;
    }

    isAvailable() {
        return !this.permanentlyDisabled;
    }

    spawn() {
        let workerPath = path.join(__dirname, '..', 'workers', 'sharp-worker.js');
        let child = childProcess.fork(workerPath, [], { silent: false });

        child.on('message', (msg) => {
            if (!msg) {
                return;
            }

            if (msg.type === 'job-result') {
                let entry = this.pending.get(msg.id);

                if (!entry) {
                    return;
                }

                this.pending.delete(msg.id);

                if (msg.success) {
                    this.consecutiveFailures = 0;
                    entry.resolve(msg.destinationPath);
                } else {
                    const error = msg.code === 'SHARP_UNAVAILABLE'
                        ? createUnavailableError(msg.error || 'sharp-unavailable')
                        : new Error(msg.error || 'sharp-job-failed');
                    entry.reject(error);
                }
            } else if (msg.type === 'sharp-unavailable') {
                this.permanentlyDisabled = true;
            }
        });

        let onEnd = (info) => {
            if (this.child !== child) {
                return;
            }

            this.child = null;
            this.consecutiveFailures++;

            let error = createUnavailableError('sharp-process-died:' + info);
            let stillPending = Array.from(this.pending.values());
            this.pending.clear();

            for (let entry of stillPending) {
                entry.reject(error);
            }

            if (this.consecutiveFailures >= 5) {
                this.permanentlyDisabled = true;
            }
        };

        child.on('exit', (code, signal) => onEnd('exit:' + code + ':' + signal));
        child.on('error', (err) => onEnd('error:' + (err && err.message)));

        this.child = child;
    }

    process(job) {
        if (this.permanentlyDisabled) {
            return Promise.reject(createUnavailableError('sharp-disabled'));
        }

        if (!this.child) {
            try {
                this.spawn();
            } catch (err) {
                return Promise.reject(createUnavailableError(err.message || 'sharp-spawn-failed', err));
            }
        }

        let id = this.nextId++;

        return new Promise((resolve, reject) => {
            this.pending.set(id, { resolve, reject });

            try {
                this.child.send({ type: 'job', id, job });
            } catch (err) {
                this.pending.delete(id);
                reject(createUnavailableError(err.message || 'sharp-send-failed', err));
            }
        });
    }

    shutdown() {
        if (this.child) {
            try {
                this.child.kill();
            } catch (_) {}
            this.child = null;
        }
    }
}

module.exports = new SharpQueue();
