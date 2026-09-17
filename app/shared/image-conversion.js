const fs = require('fs');
const path = require('path');
const { fileURLToPath } = require('url');

function getFormat(advanced = {}) {
    if (advanced.forceAvif) {
        return 'avif';
    }

    return advanced.forceWebp ? 'webp' : 'none';
}

function createContext(advanced, inputDirectory, domain) {
    return {
        format: getFormat(advanced),
        inputDirectory,
        domain
    };
}

function getSourcePath(source, context) {
    if (!source) {
        return null;
    }

    if (source.startsWith('file:')) {
        try {
            return fileURLToPath(source.replace(/&amp;/g, '&'));
        } catch (error) {
            return null;
        }
    }

    if (context.inputDirectory && context.domain && source.startsWith(context.domain)) {
        const relativePath = source.slice(context.domain.length).replace(/^\/+/, '');

        if (relativePath.startsWith('media/')) {
            try {
                const inputDirectory = path.resolve(context.inputDirectory);
                const sourcePath = path.resolve(inputDirectory, decodeURIComponent(relativePath));

                return sourcePath.startsWith(inputDirectory + path.sep) ? sourcePath : null;
            } catch (error) {
                return null;
            }
        }
    }

    return path.isAbsolute(source) ? source : null;
}

function isAnimatedWebp(sourcePath) {
    if (!sourcePath) {
        return false;
    }

    let descriptor;

    try {
        descriptor = fs.openSync(sourcePath, 'r');
        const header = Buffer.alloc(21);
        const bytesRead = fs.readSync(descriptor, header, 0, header.length, 0);

        return bytesRead === header.length &&
            header.toString('ascii', 0, 4) === 'RIFF' &&
            header.toString('ascii', 8, 16) === 'WEBPVP8X' &&
            (header[20] & 0x02) !== 0;
    } catch (error) {
        return false;
    } finally {
        if (descriptor !== undefined) {
            fs.closeSync(descriptor);
        }
    }
}

function getOutputExtension(extension, conversion = false, source) {
    const format = typeof conversion === 'object' && conversion !== null
        ? conversion.format
        : conversion === true ? 'webp' : conversion;
    const lowerExtension = extension.toLowerCase();
    const isJpegOrPng = ['.jpg', '.jpeg', '.png'].includes(lowerExtension);

    if (format === 'avif' && (isJpegOrPng || lowerExtension === '.webp')) {
        if (lowerExtension === '.webp' && isAnimatedWebp(getSourcePath(source, conversion))) {
            return extension;
        }

        return '.avif';
    }

    if (format === 'webp' && isJpegOrPng) {
        return '.webp';
    }

    return extension;
}

function convertGalleryThumbnails(text, conversion) {
    return text.replace(/<figure class="gallery__item">[\s\S]*?<a[\s\S]*?href="(.*?)"[^>]*>[\s\S]*?<img[\s\S]*?src="(.*?)"/gmi, (match, originalUrl, thumbnailUrl) => {
        const originalExtension = path.extname(originalUrl);
        const thumbnailExtension = path.extname(thumbnailUrl);

        if (!['.jpg', '.jpeg', '.png', '.webp', '.avif'].includes(originalExtension.toLowerCase())) {
            return match;
        }

        const outputExtension = getOutputExtension(originalExtension, conversion, originalUrl);
        const outputUrl = thumbnailUrl.slice(0, -thumbnailExtension.length) + outputExtension;

        return match.replace('src="' + thumbnailUrl, 'src="' + outputUrl);
    });
}

module.exports = {
    getFormat,
    createContext,
    getOutputExtension,
    convertGalleryThumbnails,
    isAnimatedWebp
};
