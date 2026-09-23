/*
 * Regression tests for the shared thumbnail regeneration state.
 * Covers the state transitions, the single set of IPC listeners and a run
 * which keeps going after the view that started it has closed.
 * Uses a mocked store and main process API; no worker is started.
 *
 * Run with the full test suite from the repository root: npm test
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
    CHANNELS,
    RECENT_IMAGES_LIMIT,
    createInitialState,
    reduce,
    createThumbnailsRegeneration
} = require('../thumbnails-regeneration');

const preloadSource = fs.readFileSync(path.resolve(__dirname, '../../../back-end/app-preload.js'), 'utf8');

// Channels which the preload script accepts for the given mainProcessAPI method
function preloadChannels(method) {
    const start = preloadSource.indexOf('    ' + method + ': (');
    const end = preloadSource.indexOf('];', start);

    assert.ok(start > -1, method);

    return [...preloadSource.slice(start, end).matchAll(/'([^']+)'/g)].map(match => match[1]);
}

const allowed = {
    send: preloadChannels('send'),
    invoke: preloadChannels('invoke'),
    receive: preloadChannels('receive'),
    receiveOnce: preloadChannels('receiveOnce'),
    stopReceiveAll: preloadChannels('stopReceiveAll')
};

function setup() {
    const listeners = {};
    const sends = [];
    const invokes = [];
    const commits = [];
    let time = 1000;
    const check = (method, channel) => assert.ok(allowed[method].includes(channel), channel + ' is not accepted by ' + method + ' in the preload script');
    const api = {
        send: (...args) => {
            check('send', args[0]);
            sends.push(args);
        },
        invoke: (...args) => {
            check('invoke', args[0]);
            invokes.push(args);
            return Promise.resolve({ status: 'ready', images: 3 });
        },
        receive: (channel, callback) => {
            check('receive', channel);
            listeners[channel] = (listeners[channel] || []).concat([callback]);
        },
        receiveOnce: (channel, callback) => {
            check('receiveOnce', channel);
            const once = data => {
                listeners[channel] = listeners[channel].filter(item => item !== once);
                callback(data);
            };
            listeners[channel] = (listeners[channel] || []).concat([once]);
        },
        stopReceiveAll: (channel) => {
            check('stopReceiveAll', channel);
            listeners[channel] = [];
        }
    };
    const store = {
        state: {
            components: {
                thumbnailsRegeneration: createInitialState()
            }
        },
        commit: (name, value) => {
            commits.push(name);
            store.state.components.thumbnailsRegeneration = value;
        }
    };
    const controller = createThumbnailsRegeneration({ api, store, now: () => time });

    return {
        api,
        store,
        controller,
        sends,
        invokes,
        commits,
        listeners,
        state: () => store.state.components.thumbnailsRegeneration,
        emit: (channel, data) => {
            const message = Object.assign({ runId: store.state.components.thumbnailsRegeneration.runId }, data);

            (listeners[channel] || []).forEach(callback => callback(message));
        },
        tick: (ms) => {
            time += ms;
        }
    };
}

describe('Thumbnail regeneration state', function () {
    it('starts a run for the website and asks the main process once', function () {
        const test = setup();

        assert.equal(test.controller.start('demo'), true);
        assert.equal(test.state().status, 'running');
        assert.equal(test.state().site, 'demo');
        assert.equal(test.state().startedAt, 1000);
        assert.deepEqual(test.sends, [[
            'app-site-regenerate-thumbnails',
            { name: 'demo', runId: test.state().runId }
        ]]);
        assert.equal(typeof test.state().runId, 'string');
        assert.ok(test.state().runId.length > 0);
    });

    it('does not start a second run while one is in progress', function () {
        const test = setup();

        test.controller.start('demo');

        assert.equal(test.controller.start('demo'), false);
        assert.equal(test.sends.length, 1);
    });

    it('restarts a run on request, for example after the settings have changed', function () {
        const test = setup();

        test.controller.start('demo');
        test.emit(CHANNELS.progress, { value: 50, processed: 1, total: 2, image: 'posts/1/a.jpg', thumbnails: 3 });

        assert.equal(test.controller.start('demo', { restart: true }), true);
        assert.equal(test.state().status, 'running');
        assert.equal(test.state().processed, 0);
        assert.equal(test.sends.length, 2);
    });

    it('keeps exactly one listener per channel over many runs', function () {
        const test = setup();

        for (let run = 0; run < 3; run++) {
            test.controller.start('demo');
            test.emit(CHANNELS.progress, { value: 100, processed: 1, total: 1, image: 'posts/1/a.jpg', thumbnails: 1 });
            test.emit(CHANNELS.error, { message: 'failed' });
            test.emit(CHANNELS.success, {});
        }

        test.controller.start('demo');

        for (const channel of Object.values(CHANNELS)) {
            assert.equal(test.listeners[channel].length, 1, channel);
        }
    });

    it('ignores stale progress, success and errors without losing the new run listeners', function () {
        const test = setup();

        test.controller.start('demo');
        const previousRunId = test.state().runId;
        test.controller.start('demo', { restart: true });
        assert.notEqual(test.state().runId, previousRunId);

        test.emit(CHANNELS.progress, {
            runId: previousRunId,
            value: 100,
            processed: 10,
            total: 10,
            image: 'posts/1/old.jpg',
            thumbnails: 2
        });
        test.emit(CHANNELS.success, { runId: previousRunId });
        test.emit(CHANNELS.error, { runId: previousRunId, message: 'Old error' });

        assert.equal(test.state().status, 'running');
        assert.equal(test.state().processed, 0);
        assert.equal(test.state().thumbnails, 0);
        assert.deepEqual(test.state().recentImages, []);

        test.emit(CHANNELS.progress, {
            value: 100,
            processed: 1,
            total: 1,
            image: 'posts/1/new.jpg',
            thumbnails: 3
        });
        test.emit(CHANNELS.success, {});

        assert.equal(test.state().status, 'done');
        assert.equal(test.state().processed, 1);
        assert.equal(test.state().thumbnails, 3);
    });

    it('listens only through the methods which the preload script accepts for each channel', function () {
        // A listener refused by the preload is dropped silently and the run would never finish
        const test = setup();

        test.controller.start('demo');
        test.emit(CHANNELS.progress, { value: 100, processed: 130, total: 130, image: 'posts/1/a.jpg', thumbnails: 1 });
        test.emit(CHANNELS.success, { brokenFilesCount: 0 });

        assert.equal(test.state().status, 'done');
    });

    it('counts images, thumbnails and problems from the progress messages', function () {
        const test = setup();

        test.controller.start('demo');
        test.emit(CHANNELS.progress, { value: 33, processed: 1, total: 3, image: 'posts/1/a.jpg', thumbnails: 3, broken: false });
        test.emit(CHANNELS.progress, { value: 66, processed: 2, total: 3, image: 'posts/1/b.jpg', thumbnails: 0, broken: true, errorMessage: 'Input file is corrupt' });

        const state = test.state();

        assert.equal(state.processed, 2);
        assert.equal(state.total, 3);
        assert.equal(state.progress, 66);
        assert.equal(state.thumbnails, 3);
        assert.equal(state.currentImage, 'posts/1/b.jpg');
        assert.deepEqual(state.recentImages.map(item => item.image), ['posts/1/b.jpg', 'posts/1/a.jpg']);
        assert.deepEqual(state.problems, [{ image: 'posts/1/b.jpg', message: 'Input file is corrupt' }]);
    });

    it('limits the list of recent images and keeps every problem', function () {
        let state = reduce(createInitialState(), { type: 'start', site: 'demo', time: 0 });

        for (let index = 0; index < RECENT_IMAGES_LIMIT + 20; index++) {
            state = reduce(state, {
                type: 'progress',
                data: { image: 'posts/1/' + index + '.jpg', broken: index % 2 === 0, thumbnails: 1 }
            });
        }

        assert.equal(state.recentImages.length, RECENT_IMAGES_LIMIT);
        assert.equal(state.recentImages[0].image, 'posts/1/' + (RECENT_IMAGES_LIMIT + 19) + '.jpg');
        assert.equal(state.problems.length, (RECENT_IMAGES_LIMIT + 20) / 2);
    });

    it('finishes with the time of the run', function () {
        const test = setup();

        test.controller.start('demo');
        test.emit(CHANNELS.progress, { value: 99, processed: 2, total: 2, image: 'posts/1/a.jpg', thumbnails: 2 });
        test.tick(5000);
        test.emit(CHANNELS.success, { brokenFilesCount: 0 });

        assert.equal(test.state().status, 'done');
        assert.equal(test.state().progress, 100);
        assert.equal(test.state().finishedAt - test.state().startedAt, 5000);
    });

    for (const total of [0, 1, 4]) {
        it(`uses the final count of ${total} images when the initial estimate changed`, function () {
            const test = setup();
            test.controller.start('demo');
            test.emit(CHANNELS.progress, { value: 50, processed: 1, total: 2, thumbnails: 1 });
            test.emit(CHANNELS.success, { processed: total, total, brokenFilesCount: 0 });

            assert.equal(test.state().status, 'done');
            assert.equal(test.state().progress, 100);
            assert.equal(test.state().processed, total);
            assert.equal(test.state().total, total);
        });
    }

    it('keeps the translation of an error from the main process', function () {
        const test = setup();

        test.controller.start('demo');
        test.emit(CHANNELS.error, { message: { translation: 'core.site.noImagesToRegenerate' } });

        assert.equal(test.state().status, 'error');
        assert.deepEqual(test.state().error, { translation: 'core.site.noImagesToRegenerate' });
    });

    it('stops the worker and ignores messages which arrive before it exits', function () {
        const test = setup();

        test.controller.start('demo');
        test.emit(CHANNELS.progress, { value: 25, processed: 1, total: 4, image: 'posts/1/a.jpg', thumbnails: 2 });
        test.controller.stop();
        test.emit(CHANNELS.progress, { value: 50, processed: 2, total: 4, image: 'posts/1/b.jpg', thumbnails: 2 });
        test.emit(CHANNELS.success, {});

        assert.deepEqual(test.sends[1], ['app-site-abort-regenerate-thumbnails', true]);
        assert.equal(test.state().status, 'stopped');
        assert.equal(test.state().processed, 1);
    });

    it('keeps the progress in the store when the view which started the run closes', function () {
        const test = setup();

        test.controller.start('demo');
        // The view is gone; the main process keeps reporting and the store follows
        test.emit(CHANNELS.progress, { value: 50, processed: 5, total: 10, image: 'posts/1/e.jpg', thumbnails: 1 });

        assert.equal(test.state().status, 'running');
        assert.equal(test.state().processed, 5);
    });

    it('does not reset a run in progress', function () {
        const test = setup();

        test.controller.start('demo');
        test.controller.reset();
        assert.equal(test.state().status, 'running');

        test.controller.stop();
        test.controller.reset();
        assert.equal(test.state().status, 'idle');
    });

    it('asks the main process for the summary of a website', async function () {
        const test = setup();
        const summary = await test.controller.getSummary('demo');

        assert.deepEqual(test.invokes, [['app-site:thumbnails-summary', { name: 'demo' }]]);
        assert.equal(summary.images, 3);
    });
});
