const fs = require('fs');
const path = require('path');
const sharpQueue = require('./sharp-queue.js');
const { extensions } = require('../../config/image-upload-formats.js');

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

    await sharpQueue.process({
        operation: 'validate-image',
        originalPath: filePath,
        expectedFormat
    });
}

module.exports = validateImageUpload;
