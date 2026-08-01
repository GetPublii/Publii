const childProcess = require('child_process');
const path = require('path');

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
                    entry.reject(new Error(msg.error || 'sharp-job-failed'));
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

            let error = new Error('sharp-process-died:' + info);
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
            return Promise.reject(new Error('sharp-disabled'));
        }

        if (!this.child) {
            try {
                this.spawn();
            } catch (err) {
                return Promise.reject(err);
            }
        }

        let id = this.nextId++;

        return new Promise((resolve, reject) => {
            this.pending.set(id, { resolve, reject });

            try {
                this.child.send({ type: 'job', id, job });
            } catch (err) {
                this.pending.delete(id);
                reject(err);
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
