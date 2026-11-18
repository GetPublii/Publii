const assert = require('node:assert/strict');
const { fitWindowToWorkArea, shrinkIntoWorkArea, smallestWorkArea, fitZoom } = require('../window-bounds.js');

describe('Window bounds inside the work area', function () {
    const largeWorkArea = { x: 0, y: 0, width: 2560, height: 1392 };
    // 2560x1440 screen with a 48px panel at device scale factor 2
    const hidpiWorkArea = { x: 0, y: 0, width: 1280, height: 696 };

    it('keeps the default size and minimum on a large work area', function () {
        assert.deepEqual(fitWindowToWorkArea({}, largeWorkArea), {
            width: 1400, height: 900, minWidth: 600, minHeight: 350
        });
    });

    it('lowers the minimum size to the work area when the screen is tiny', function () {
        const params = fitWindowToWorkArea({}, { x: 0, y: 0, width: 500, height: 300 });
        assert.deepEqual(params, { width: 500, height: 300, minWidth: 500, minHeight: 300 });
    });

    it('shrinks saved bounds that no longer fit and pulls the window back on screen', function () {
        const params = fitWindowToWorkArea({ x: 413, y: 641, width: 2400, height: 1400 }, hidpiWorkArea);
        assert.deepEqual(params, { x: 0, y: 0, width: 1280, height: 696, minWidth: 600, minHeight: 350 });
    });

    it('zooms the designed layout out to fit a smaller content area, never in', function () {
        assert.equal(fitZoom({ width: 2400, height: 1400 }), 1);
        assert.equal(fitZoom({ width: 1280, height: 630 }), 0.9);
        assert.equal(fitZoom({ width: 600, height: 700 }), 0.5);
    });

    it('keeps a position that fits and clamps one that overflows', function () {
        const fits = fitWindowToWorkArea({ x: 100, y: 50, width: 1400, height: 900 }, largeWorkArea);
        assert.equal(fits.x, 100);
        assert.equal(fits.y, 50);
        const overflows = fitWindowToWorkArea({ x: 1500, y: 700, width: 1400, height: 900 }, largeWorkArea);
        assert.equal(overflows.x, 2560 - 1400);
        assert.equal(overflows.y, 1392 - 900);
    });

    it('leaves the position out when none is given, so the window is centered', function () {
        const params = fitWindowToWorkArea({ width: 1400, height: 900 }, largeWorkArea);
        assert.equal('x' in params, false);
        assert.equal('y' in params, false);
    });

    it('trims the height pushed under the panel by the window frame, without moving the window', function () {
        // Window manager put the 696px window at y=32 (its title bar), so 32px overflow the work area
        const params = shrinkIntoWorkArea({ x: 0, y: 32, width: 1280, height: 696 }, hidpiWorkArea);
        assert.deepEqual(params, { width: 1280, height: 664, minWidth: 600, minHeight: 350 });
    });

    it('leaves a window that already fits unchanged', function () {
        const params = shrinkIntoWorkArea({ x: 100, y: 50, width: 1400, height: 900 }, largeWorkArea);
        assert.deepEqual(params, { width: 1400, height: 900, minWidth: 600, minHeight: 350 });
    });

    it('picks the smallest work area across displays', function () {
        const displays = [
            { workAreaSize: { width: 2560, height: 1392 } },
            { workAreaSize: { width: 1366, height: 728 } }
        ];
        assert.deepEqual(smallestWorkArea(displays), { width: 1366, height: 728 });
    });
});
