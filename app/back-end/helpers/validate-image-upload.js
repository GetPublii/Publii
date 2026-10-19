const fs = require('fs');
const path = require('path');
const sizeOf = require('image-size');
const sharpQueue = require('./sharp-queue.js');
const napiImageQueue = require('./napi-image-queue.js');
const NativeImageQueue = require('./native-image-queue.js');
const getJimp = require('./jimp-webp.js');
const { extensions } = require('../../config/image-upload-formats.js');

const fallbackMimeTypes = {
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    avif: 'image/avif'
};

// The @napi-rs/image worker decodes these formats (SVG is rendered). It does
// not read GIF and only some TIFF variants (JPEG- or deflate-compressed ones
// fail), so with this engine those two are checked by their headers only.
const napiDecodedFormats = ['jpeg', 'png', 'webp', 'avif', 'svg'];
const napiHeaderFormats = ['gif', 'tiff'];

function validateHeader(filePath, expectedFormat) {
    const dimensions = sizeOf(filePath);

    if (
        dimensions.type !== expectedFormat ||
        !(dimensions.width > 0) ||
        !(dimensions.height > 0)
    ) {
        throw new Error('Invalid image contents');
    }
}

async function validateWithJimp(filePath, expectedFormat) {
    const buffer = await fs.promises.readFile(filePath);
    const Jimp = await getJimp();
    const image = await Jimp.fromBuffer(buffer, {
        'image/jpeg': { tolerantDecoding: false }
    });

    if (
        image.mime !== fallbackMimeTypes[expectedFormat] ||
        !(image.bitmap.width > 0) ||
        !(image.bitmap.height > 0)
    ) {
        throw new Error('Invalid image contents');
    }
}

/**
 * Rejects uploads whose contents do not match a supported image format.
 *
 * @param {string} filePath
 * @param {string} engine - resize engine selected in the app settings ('sharp' or 'napi');
 *                          the Jimp engine does not validate uploads
 */
async function validateImageUpload(filePath, engine = 'sharp') {
    const extension = path.extname(filePath).slice(1).toLowerCase();

    if (!extensions.includes(extension)) {
        throw new Error('Unsupported image extension');
    }

    const stat = await fs.promises.stat(filePath);

    if (!stat.isFile()) {
        throw new Error('Expected an image file');
    }

    if (stat.size === 0) {
        throw new Error('Empty image file');
    }

    let expectedFormat = extension;

    if (extension === 'jpg') {
        expectedFormat = 'jpeg';
    } else if (extension === 'tif') {
        expectedFormat = 'tiff';
    }

    const usesNapi = engine === 'napi';

    if (usesNapi && napiHeaderFormats.includes(expectedFormat)) {
        validateHeader(filePath, expectedFormat);
        return;
    }

    if (usesNapi && !napiDecodedFormats.includes(expectedFormat)) {
        throw new Error('Unsupported image format for this engine');
    }

    const queue = usesNapi ? napiImageQueue : sharpQueue;

    try {
        await queue.process({
            operation: 'validate-image',
            originalPath: filePath,
            expectedFormat
        });
    } catch (error) {
        // A decoder rejecting the contents is different from a missing/crashed native worker.
        // Keep the native validation policy and only use formats our Jimp build can fully decode.
        if (!NativeImageQueue.isEngineUnavailable(error) || !fallbackMimeTypes[expectedFormat]) {
            throw error;
        }

        await validateWithJimp(filePath, expectedFormat);
    }
}

validateImageUpload.isEngineUnavailable = NativeImageQueue.isEngineUnavailable;

module.exports = validateImageUpload;
