/*
 * Queue of image jobs executed by an isolated native subprocess.
 *
 * Native engines (Sharp, @napi-rs/image) never run inside the calling
 * process: a crash in native code only takes the worker down, pending jobs
 * are rejected with an "engine unavailable" error and callers fall back to
 * Jimp. Once the worker reports that its module cannot be loaded, or dies
 * five times in a row, the engine stays disabled for the rest of the process.
 */

const childProcess = require('child_process');

const UNAVAILABLE_CODES = ['SHARP_UNAVAILABLE', 'NAPI_UNAVAILABLE'];

class NativeImageQueue {
    /**
     * @param {object} options
     * @param {string} options.name            - engine name used in error messages
     * @param {string} options.workerPath      - script forked for the jobs
     * @param {string} options.unavailableCode - `error.code` reported when the engine cannot be used
     */
    constructor ({ name, workerPath, unavailableCode }) {
        this.name = name;
        this.workerPath = workerPath;
        this.unavailableCode = unavailableCode;
        this.child = null;
        this.pending = new Map();
        this.nextId = 1;
        this.consecutiveFailures = 0;
        this.permanentlyDisabled = false;
    }

    /*
     * True for errors meaning "the engine could not run", as opposed to
     * an engine rejecting a specific image.
     */
    static isEngineUnavailable (error) {
        return !!error && (error.engineUnavailable === true || UNAVAILABLE_CODES.includes(error.code));
    }

    createUnavailableError (message, cause) {
        const error = new Error(message);
        error.code = this.unavailableCode;
        error.engineUnavailable = true;

        if (cause) {
            error.cause = cause;
        }

        return error;
    }

    isAvailable () {
        return !this.permanentlyDisabled;
    }

    spawn () {
        let child = childProcess.fork(this.workerPath, [], { silent: false });

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
                    const error = msg.code === 'ENGINE_UNAVAILABLE'
                        ? this.createUnavailableError(msg.error || this.name + '-unavailable')
                        : new Error(msg.error || this.name + '-job-failed');
                    entry.reject(error);
                }
            } else if (msg.type === 'engine-unavailable') {
                this.permanentlyDisabled = true;
            }
        });

        let onEnd = (info) => {
            if (this.child !== child) {
                return;
            }

            this.child = null;
            this.consecutiveFailures++;

            let error = this.createUnavailableError(this.name + '-process-died:' + info);
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

    process (job) {
        if (this.permanentlyDisabled) {
            return Promise.reject(this.createUnavailableError(this.name + '-disabled'));
        }

        if (!this.child) {
            try {
                this.spawn();
            } catch (err) {
                return Promise.reject(this.createUnavailableError(err.message || this.name + '-spawn-failed', err));
            }
        }

        let id = this.nextId++;

        return new Promise((resolve, reject) => {
            this.pending.set(id, { resolve, reject });

            try {
                this.child.send({ type: 'job', id, job });
            } catch (err) {
                this.pending.delete(id);
                reject(this.createUnavailableError(err.message || this.name + '-send-failed', err));
            }
        });
    }

    shutdown () {
        if (this.child) {
            try {
                this.child.kill();
            } catch (_) {}
            this.child = null;
        }
    }
}

module.exports = NativeImageQueue;
