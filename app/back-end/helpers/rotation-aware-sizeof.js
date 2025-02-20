/*
 * Rotation-aware sizeOf().
 *
 * Images can contain an embedded orientation field, which indicates that they
 * should be rotated before display. sizeOf() from image-size provides the original
 * width and height, and the EXIF orientation value.
 * 
 * For example, a 3000x4000 portrait image shot on an iPhone and exported from Apple
 * Photos will appear to have width=4000, height=3000, orientation=6.
 * 
 * We often need the rotated dimension ([3000, 4000] for the above example image),
 * most notably when initializing a Photoswipe gallery, so this module provides a
 * sizeOf() that returns [width, height] after rotation,
 * i.e. [3000, 4000] for the above example image.
 */

const originalSizeOf = require('image-size');

function sizeOf(image) {
    const info = originalSizeOf(image);
    if (info.orientation == 6 || info.orientation == 8) {
        return {
            width: info.height,
            height: info.width
        };
    }
    return info;
}

module.exports = sizeOf;
