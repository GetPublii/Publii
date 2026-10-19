// Loaded only by the @napi-rs/image fallback tests, including their nested native worker.
const path = require('node:path');

if (path.basename(process.argv[1] || '') === 'napi-image-worker.js') {
    if (process.env.PUBLII_TEST_NAPI_FAILURE === 'exit') {
        process.exit(1);
    }

    if (process.env.PUBLII_TEST_NAPI_FAILURE === 'load') {
        const Module = require('node:module');
        const originalLoad = Module._load;

        Module._load = function (request, parent, isMain) {
            if (request === '@napi-rs/image') {
                throw new Error('Test: native @napi-rs/image module could not be loaded');
            }

            return originalLoad.call(this, request, parent, isMain);
        };
    }
}
