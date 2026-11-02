/*
 * @napi-rs/image jobs executed by app/back-end/workers/napi-image-worker.js
 */

const path = require('path');
const NativeImageQueue = require('./native-image-queue.js');

module.exports = new NativeImageQueue({
    name: 'napi',
    workerPath: path.join(__dirname, '..', 'workers', 'napi-image-worker.js'),
    unavailableCode: 'NAPI_UNAVAILABLE'
});
