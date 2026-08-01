/*
 * Isolated sharp subprocess.
 */

const fs = require('fs');
const os = require('os');

let sharp = null;

try {
    sharp = require('sharp');

    if (os.platform() === 'linux') {
        sharp.concurrency(1);
    }
} catch (err) {
    process.send({ type: 'sharp-unavailable', error: err && err.message });
    setTimeout(() => process.exit(1), 100);
}

function writeBuffer(destinationPath, buffer) {
    return new Promise((resolve, reject) => {
        let wstream = fs.createWriteStream(destinationPath);
        wstream.on('error', reject);
        wstream.on('finish', resolve);
        wstream.write(buffer);
        wstream.end();
    });
}

function runJob(job) {
    const {
        originalPath,
        destinationPath,
        format,
        width,
        height,
        crop,
        forceWebp,
        imagesQuality,
        alphaQuality,
        webpLossless
    } = job;

    let resizeOptions = {
        fit: 'inside', 
        withoutEnlargement: true, 
        fastShrinkOnLoad: false 
    };

    if (crop) {
        resizeOptions = { 
            withoutEnlargement: true, 
            fastShrinkOnLoad: false
        };
    }

    let pipeline = sharp(originalPath);

    if (format === 'webp' || forceWebp) {
        pipeline = pipeline.autoOrient();
    }

    pipeline = pipeline.withMetadata().resize(width, height, resizeOptions);

    if (format === 'webp' || forceWebp) {
        let webpConfig = webpLossless
            ? { lossless: true }
            : { quality: imagesQuality, alphaQuality: alphaQuality };
        pipeline = pipeline.webp(webpConfig);
    } else if (format === 'jpeg') {
        pipeline = pipeline.jpeg({ quality: imagesQuality });
    }

    return pipeline.toBuffer().then(buffer => writeBuffer(destinationPath, buffer));
}

process.on('message', function (msg) {
    if (!msg || msg.type !== 'job') {
        return;
    }

    if (!sharp) {
        process.send({ type: 'job-result', id: msg.id, success: false, error: 'sharp-unavailable' });
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
