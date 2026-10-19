/*
 * Sharp jobs executed by app/back-end/workers/sharp-worker.js
 */

const path = require('path');
const NativeImageQueue = require('./native-image-queue.js');

module.exports = new NativeImageQueue({
    name: 'sharp',
    workerPath: path.join(__dirname, '..', 'workers', 'sharp-worker.js'),
    unavailableCode: 'SHARP_UNAVAILABLE'
});
