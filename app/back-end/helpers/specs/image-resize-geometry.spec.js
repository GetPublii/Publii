/*
 * Unit tests for the thumbnail geometry used by the @napi-rs/image worker.
 * Pure arithmetic: no native modules, no files.
 *
 * Run with the full test suite from the repository root: npm test
 */

const assert = require('node:assert/strict');
const { computeResizeGeometry } = require('../image-resize-geometry');

describe('Thumbnail resize geometry', function () {
    function geometry(width, height, crop, sourceWidth = 120, sourceHeight = 80) {
        return computeResizeGeometry({ sourceWidth, sourceHeight, width, height, crop });
    }

    it('scales inside the requested bounds keeping the aspect ratio', function () {
        assert.deepEqual(geometry(60, null, false), { width: 60, height: 40, mode: 'exact' });
        assert.deepEqual(geometry(null, 20, false), { width: 30, height: 20, mode: 'exact' });
        assert.deepEqual(geometry(60, 60, false), { width: 60, height: 40, mode: 'exact' });
        assert.deepEqual(geometry(200, 20, false), { width: 30, height: 20, mode: 'exact' });
        assert.deepEqual(geometry(50, null, false), { width: 50, height: 33, mode: 'exact' });
    });

    it('never enlarges the source', function () {
        assert.deepEqual(geometry(240, null, false), { width: 120, height: 80, mode: 'none' });
        assert.deepEqual(geometry(120, 80, false), { width: 120, height: 80, mode: 'none' });
        assert.deepEqual(geometry(null, null, false), { width: 120, height: 80, mode: 'none' });
        assert.deepEqual(geometry(240, 240, true), { width: 120, height: 80, mode: 'none' });
        assert.deepEqual(geometry(120, 80, true), { width: 120, height: 80, mode: 'none' });
    });

    it('covers both dimensions of cropped thumbnails, clamped to the source', function () {
        assert.deepEqual(geometry(32, 32, true), { width: 32, height: 32, mode: 'cover' });
        assert.deepEqual(geometry(4, 4, true, 12, 8), { width: 4, height: 4, mode: 'cover' });
        assert.deepEqual(geometry(200, 20, true), { width: 120, height: 20, mode: 'cover' });
        assert.deepEqual(geometry(20, 200, true), { width: 20, height: 80, mode: 'cover' });
    });

    it('scales proportionally when a cropped size leaves one dimension free', function () {
        assert.deepEqual(geometry(60, null, true), { width: 60, height: 40, mode: 'exact' });
        assert.deepEqual(geometry(null, 40, true), { width: 60, height: 40, mode: 'exact' });
        assert.deepEqual(geometry(240, null, true), { width: 120, height: 80, mode: 'none' });
    });

    it('accepts numeric strings and "auto" and keeps at least one pixel', function () {
        assert.deepEqual(geometry('60', 'auto', false), { width: 60, height: 40, mode: 'exact' });
        assert.deepEqual(geometry(1, null, false, 1000, 10), { width: 1, height: 1, mode: 'exact' });
    });

    it('rejects unknown source dimensions', function () {
        assert.throws(() => geometry(60, null, false, 0, 80));
        assert.throws(() => geometry(60, null, false, 120, NaN));
        assert.throws(() => computeResizeGeometry({ width: 60, height: null, crop: false }));
    });
});
