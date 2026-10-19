/*
 * Thumbnail geometry for engines which only offer exact resizing.
 *
 * Reproduces the Sharp options used by sharp-worker.js: `fit: 'inside'`
 * for plain resizing, a centred cover crop for `crop: true` and never
 * enlarging the source (`withoutEnlargement`).
 */

function toDimension (value) {
    const number = parseInt(value, 10);

    return Number.isFinite(number) && number > 0 ? number : null;
}

/**
 * @param {object} options
 * @param {number} options.sourceWidth   - width of the source after EXIF orientation
 * @param {number} options.sourceHeight  - height of the source after EXIF orientation
 * @param {number|string|null} options.width  - requested width, null/"auto" when free
 * @param {number|string|null} options.height - requested height, null/"auto" when free
 * @param {boolean} options.crop         - cover crop when both dimensions are given
 * @returns {{ width: number, height: number, mode: 'none'|'exact'|'cover' }}
 *   `exact` resizes to the given size (aspect ratio already preserved),
 *   `cover` scales to cover the size and crops it centred, `none` keeps the source.
 */
function computeResizeGeometry ({ sourceWidth, sourceHeight, width, height, crop }) {
    if (!(sourceWidth > 0) || !(sourceHeight > 0)) {
        throw new Error('Unknown source image dimensions');
    }

    const targetWidth = toDimension(width);
    const targetHeight = toDimension(height);

    if (crop && targetWidth && targetHeight) {
        const coverWidth = Math.min(targetWidth, sourceWidth);
        const coverHeight = Math.min(targetHeight, sourceHeight);

        if (coverWidth === sourceWidth && coverHeight === sourceHeight) {
            return { width: sourceWidth, height: sourceHeight, mode: 'none' };
        }

        return { width: coverWidth, height: coverHeight, mode: 'cover' };
    }

    let scale = 1;

    if (targetWidth) {
        scale = Math.min(scale, targetWidth / sourceWidth);
    }

    if (targetHeight) {
        scale = Math.min(scale, targetHeight / sourceHeight);
    }

    if (scale >= 1) {
        return { width: sourceWidth, height: sourceHeight, mode: 'none' };
    }

    return {
        width: Math.max(1, Math.round(sourceWidth * scale)),
        height: Math.max(1, Math.round(sourceHeight * scale)),
        mode: 'exact'
    };
}

module.exports = { computeResizeGeometry };
