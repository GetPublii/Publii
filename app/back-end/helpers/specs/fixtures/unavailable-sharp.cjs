// Loaded only by the fallback integration tests, including their nested Sharp worker.
const path = require('node:path');

if (path.basename(process.argv[1] || '') === 'sharp-worker.js') {
    if (process.env.PUBLII_TEST_SHARP_FAILURE === 'exit') {
        process.exit(1);
    }

    if (process.env.PUBLII_TEST_SHARP_FAILURE === 'load') {
        const Module = require('node:module');
        const originalLoad = Module._load;

        Module._load = function (request, parent, isMain) {
            if (request === 'sharp') {
                throw new Error('Test: native Sharp module could not be loaded');
            }

            return originalLoad.call(this, request, parent, isMain);
        };
    }
}
