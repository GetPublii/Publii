/*
 * Isolated @napi-rs/image subprocess.
 *
 * Handles the same jobs as sharp-worker.js: thumbnail generation and upload
 * validation. The engine does not carry EXIF or colour profiles over to the
 * output, so the EXIF orientation is baked into the pixels before resizing.
 */

const fs = require('fs');
const { computeResizeGeometry } = require('../helpers/image-resize-geometry.js');

let engine = null;

try {
    engine = require('@napi-rs/image');
} catch (err) {
    process.send({ type: 'engine-unavailable', error: err && err.message });
    setTimeout(() => process.exit(1), 100);
}

// EXIF orientations which swap the image width and height.
const TRANSPOSED_ORIENTATIONS = [5, 6, 7, 8];
const FORMAT_ALIASES = {
    jpg: 'jpeg',
    tif: 'tiff'
};

function writeBuffer(destinationPath, buffer) {
    return new Promise((resolve, reject) => {
        let wstream = fs.createWriteStream(destinationPath);
        wstream.on('error', reject);
        wstream.on('finish', resolve);
        wstream.write(buffer);
        wstream.end();
    });
}

function normalizeFormat(format) {
    const value = String(format || '').toLowerCase();

    return FORMAT_ALIASES[value] || value;
}

async function createTransformer(originalPath, svg = false) {
    const buffer = await fs.promises.readFile(originalPath);

    return svg ? engine.Transformer.fromSvg(buffer) : new engine.Transformer(buffer);
}

async function validateImage(job) {
    const svg = job.expectedFormat === 'svg';
    const transformer = await createTransformer(job.originalPath, svg);
    const metadata = await transformer.metadata(false);

    if (
        (!svg && normalizeFormat(metadata.format) !== job.expectedFormat) ||
        !(metadata.width > 0) ||
        !(metadata.height > 0)
    ) {
        throw new Error('Invalid image contents');
    }

    // Damaged or truncated data is only detected while the pixels are decoded.
    await transformer.rawPixels();
}

function encode(transformer, job) {
    const {
        format,
        imagesQuality,
        alphaQuality,
        webpLossless,
        avifEffort
    } = job;

    if (format === 'webp') {
        // libwebp's simple API: there is no separate alpha quality setting.
        return webpLossless ? transformer.webpLossless() : transformer.webp(imagesQuality);
    }

    if (format === 'avif') {
        // ravif has no lossless mode, so `avifLossless` is ignored here and the
        // site settings present the option as unavailable for this engine.
        const options = {
            quality: imagesQuality,
            chromaSubsampling: engine.ChromaSubsampling.Yuv444,
            // rav1e speed runs in the opposite direction to Sharp's effort.
            speed: Math.min(10, Math.max(1, 10 - (avifEffort || 4)))
        };

        if (typeof alphaQuality === 'number') {
            options.alphaQuality = alphaQuality;
        }

        return transformer.avif(options);
    }

    if (format === 'png') {
        return transformer.png({
            compressionType: engine.CompressionType.Default,
            filterType: engine.FilterType.Adaptive
        });
    }

    return transformer.jpeg(imagesQuality);
}

async function resizeImage(job) {
    const transformer = await createTransformer(job.originalPath);
    const metadata = await transformer.metadata(false);
    const transposed = TRANSPOSED_ORIENTATIONS.includes(metadata.orientation);
    const geometry = computeResizeGeometry({
        sourceWidth: transposed ? metadata.height : metadata.width,
        sourceHeight: transposed ? metadata.width : metadata.height,
        width: job.width,
        height: job.height,
        crop: job.crop
    });

    transformer.rotate();

    if (geometry.mode !== 'none') {
        transformer.resize(
            geometry.width,
            geometry.height,
            engine.ResizeFilterType.Lanczos3,
            geometry.mode === 'cover' ? engine.ResizeFit.Cover : engine.ResizeFit.Fill
        );
    }

    const buffer = await encode(transformer, job);
    await writeBuffer(job.destinationPath, buffer);
}

function runJob(job) {
    if (job.operation === 'validate-image') {
        return validateImage(job);
    }

    return resizeImage(job);
}

process.on('message', function (msg) {
    if (!msg || msg.type !== 'job') {
        return;
    }

    if (!engine) {
        process.send({
            type: 'job-result',
            id: msg.id,
            success: false,
            error: 'napi-image-unavailable',
            code: 'ENGINE_UNAVAILABLE'
        });
        return;
    }

    runJob(msg.job)
        .then(() => {
            process.send({ type: 'job-result', id: msg.id, success: true, destinationPath: msg.job.destinationPath });
        })
        .catch(err => {
            process.send({ type: 'job-result', id: msg.id, success: false, error: err && err.message });
        });
});

process.on('uncaughtException', function (err) {
    try {
        process.send({ type: 'fatal', error: err && err.message });
    } catch (_) {}
    setTimeout(() => process.exit(1), 50);
});

process.on('disconnect', () => process.exit(0));
