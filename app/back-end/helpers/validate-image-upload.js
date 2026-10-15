const fs = require('fs');
const path = require('path');
const sharpQueue = require('./sharp-queue.js');
const getJimp = require('./jimp-webp.js');
const { extensions } = require('../../config/image-upload-formats.js');

const fallbackMimeTypes = {
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    avif: 'image/avif'
};

async function validateImageUpload(filePath) {
    const extension = path.extname(filePath).slice(1).toLowerCase();

    if (!extensions.includes(extension)) {
        throw new Error('Unsupported image extension');
    }

    const stat = await fs.promises.stat(filePath);

    if (!stat.isFile()) {
        throw new Error('Expected an image file');
    }

    let expectedFormat = extension;

    if (extension === 'jpg') {
        expectedFormat = 'jpeg';
    } else if (extension === 'tif') {
        expectedFormat = 'tiff';
    }

    try {
        await sharpQueue.process({
            operation: 'validate-image',
            originalPath: filePath,
            expectedFormat
        });
    } catch (error) {
        // A decoder rejecting the contents is different from a missing/crashed native worker.
        // Keep Sharp's validation policy and only use formats our Jimp build can fully decode.
        if (error.code !== 'SHARP_UNAVAILABLE' || !fallbackMimeTypes[expectedFormat]) {
            throw error;
        }

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
}

module.exports = validateImageUpload;
