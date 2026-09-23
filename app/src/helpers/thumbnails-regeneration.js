/*
 * Thumbnail regeneration shared by the Tools page and the settings popup.
 *
 * The worker keeps running when the view which started it closes, so the
 * state lives in the store and this module is the only owner of the IPC
 * listeners. Views read the store and call start() or stop().
 */

const CHANNELS = {
    progress: 'app-site-regenerate-thumbnails-progress',
    success: 'app-site-regenerate-thumbnails-success',
    error: 'app-site-regenerate-thumbnails-error'
};

// The details list shows only the latest images, the problems are kept in full
const RECENT_IMAGES_LIMIT = 100;

/**
 * State before any regeneration: status is idle, running, done, error or stopped
 *
 * @returns {object}
 */
function createInitialState () {
    return {
        site: '',
        runId: '',
        status: 'idle',
        processed: 0,
        total: 0,
        progress: 0,
        thumbnails: 0,
        currentImage: '',
        recentImages: [],
        problems: [],
        error: '',
        startedAt: 0,
        finishedAt: 0
    };
}

function toPercent (value) {
    let number = parseInt(value, 10);

    if (isNaN(number)) {
        return 0;
    }

    return Math.min(100, Math.max(0, number));
}

function isCounter (value) {
    return typeof value === 'number' && isFinite(value) && value >= 0;
}

/**
 * Returns the next state for an action; unchanged state is returned as the same object
 *
 * @param {object} state
 * @param {object} action - start, progress, success, error, stop or reset
 * @returns {object}
 */
function reduce (state, action) {
    if (action.type === 'reset') {
        return createInitialState();
    }

    if (action.type === 'start') {
        return Object.assign(createInitialState(), {
            site: action.site,
            runId: action.runId,
            status: 'running',
            startedAt: action.time
        });
    }

    // Messages of a stopped or finished run are ignored
    if (state.status !== 'running') {
        return state;
    }

    if (['progress', 'success', 'error'].includes(action.type) &&
        (!action.data || action.data.runId !== state.runId)) {
        return state;
    }

    if (action.type === 'progress') {
        let data = action.data || {};
        let image = typeof data.image === 'string' ? data.image : '';
        let problems = state.problems;
        let recentImages = state.recentImages;

        if (image) {
            recentImages = [
                Object.freeze({
                    image: image,
                    thumbnails: data.thumbnails || 0,
                    broken: !!data.broken
                })
            ].concat(recentImages).slice(0, RECENT_IMAGES_LIMIT);
        }

        if (data.broken && image) {
            problems = problems.concat([
                Object.freeze({
                    image: image,
                    message: data.errorMessage || ''
                })
            ]);
        }

        return Object.assign({}, state, {
            processed: isCounter(data.processed) ? data.processed : state.processed,
            total: isCounter(data.total) ? data.total : state.total,
            progress: toPercent(data.value),
            thumbnails: state.thumbnails + (data.thumbnails || 0),
            currentImage: image || state.currentImage,
            recentImages: recentImages,
            problems: problems
        });
    }

    if (action.type === 'success') {
        let data = action.data || {};
        let total = isCounter(data.total) ? data.total : state.total;

        return Object.assign({}, state, {
            status: 'done',
            progress: 100,
            processed: isCounter(data.processed) ? data.processed : total || state.processed,
            total,
            currentImage: '',
            finishedAt: action.time
        });
    }

    if (action.type === 'error') {
        let message = action.data && action.data.message;

        return Object.assign({}, state, {
            status: 'error',
            currentImage: '',
            error: message || '',
            finishedAt: action.time
        });
    }

    if (action.type === 'stop') {
        return Object.assign({}, state, {
            status: 'stopped',
            currentImage: '',
            finishedAt: action.time
        });
    }

    return state;
}

/**
 * Connects the state in the store with the main process
 *
 * @param {object} options
 * @param {object} options.api - mainProcessAPI of the window
 * @param {object} options.store - Vuex store with the setThumbnailsRegeneration mutation
 * @param {function} options.now - current time in milliseconds
 * @returns {object}
 */
function createThumbnailsRegeneration ({ api, store, now = () => Date.now() }) {
    function getState () {
        return store.state.components.thumbnailsRegeneration;
    }

    function dispatch (action) {
        let current = getState();
        let next = reduce(current, action);

        if (next !== current) {
            store.commit('setThumbnailsRegeneration', next);
        }
    }

    // Keep listening after a stale terminal message: it must not consume the new run's listener.
    // Registered again before every run, so there is always exactly one listener per channel.
    function listen () {
        api.stopReceiveAll(CHANNELS.progress);
        api.stopReceiveAll(CHANNELS.success);
        api.stopReceiveAll(CHANNELS.error);

        api.receive(CHANNELS.progress, data => dispatch({
            type: 'progress',
            data: data
        }));

        api.receive(CHANNELS.success, data => dispatch({
            type: 'success',
            data: data,
            time: now()
        }));

        api.receive(CHANNELS.error, data => dispatch({
            type: 'error',
            data: data,
            time: now()
        }));
    }

    return {
        getState,
        /**
         * Starts a run for the website; a run in progress is restarted only with the restart option
         *
         * @param {string} siteName
         * @param {object} options
         * @returns {boolean} false when another run is still in progress
         */
        start (siteName, options = {}) {
            if (getState().status === 'running') {
                if (!options.restart) {
                    return false;
                }

                // The main process aborts the previous worker of this window before it starts the new one
                dispatch({
                    type: 'stop',
                    time: now()
                });
            }

            let runId = crypto.randomUUID();

            listen();

            dispatch({
                type: 'start',
                site: siteName,
                runId: runId,
                time: now()
            });

            api.send('app-site-regenerate-thumbnails', {
                name: siteName,
                runId: runId
            });

            return true;
        },
        stop () {
            if (getState().status !== 'running') {
                return;
            }

            api.send('app-site-abort-regenerate-thumbnails', true);

            dispatch({
                type: 'stop',
                time: now()
            });
        },
        reset () {
            if (getState().status === 'running') {
                return;
            }

            dispatch({
                type: 'reset'
            });
        },
        getSummary (siteName) {
            return Promise.resolve(api.invoke('app-site:thumbnails-summary', {
                name: siteName
            }));
        }
    };
}

let sharedInstance = null;

/**
 * One instance per window, created on first use
 *
 * @param {object} store
 * @returns {object}
 */
function getThumbnailsRegeneration (store) {
    if (!sharedInstance) {
        sharedInstance = createThumbnailsRegeneration({
            api: window.mainProcessAPI,
            store: store
        });
    }

    return sharedInstance;
}

module.exports = {
    CHANNELS,
    RECENT_IMAGES_LIMIT,
    createInitialState,
    reduce,
    createThumbnailsRegeneration,
    getThumbnailsRegeneration
};
