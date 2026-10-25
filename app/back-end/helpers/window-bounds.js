/*
 * Window geometry kept inside the work area of a display.
 *
 * The 1200x700 DIP minimum is bigger than the work area on small laptop screens and on
 * HiDPI screens (device scale factor 2), so the window overflowed the screen and could
 * not be resized (GetPublii/Publii#1226, #1318).
 */

const DEFAULT_SIZE = { width: 1400, height: 900 };
// The UI layout is designed for this size; below it the page is zoomed out instead of overflowing
const DESIGN_SIZE = { width: 1200, height: 700 };
const MIN_SIZE = { width: 600, height: 350 };

function clamp (value, min, max) {
    return Math.min(Math.max(value, min), max);
}

// Zoom factor (<= 1) that makes the designed layout fit the given content size
function fitZoom (contentSize) {
    return Math.min(1, contentSize.width / DESIGN_SIZE.width, contentSize.height / DESIGN_SIZE.height);
}

// Size, minimum size and (when given) position of a window, all inside the work area
function fitWindowToWorkArea (bounds, workArea) {
    let minWidth = Math.min(MIN_SIZE.width, workArea.width);
    let minHeight = Math.min(MIN_SIZE.height, workArea.height);
    let width = clamp(bounds.width || DEFAULT_SIZE.width, minWidth, workArea.width);
    let height = clamp(bounds.height || DEFAULT_SIZE.height, minHeight, workArea.height);
    let params = { width, height, minWidth, minHeight };

    if (Number.isFinite(bounds.x) && Number.isFinite(bounds.y)) {
        params.x = clamp(bounds.x, workArea.x, workArea.x + workArea.width - width);
        params.y = clamp(bounds.y, workArea.y, workArea.y + workArea.height - height);
    }

    return params;
}

// Once the window manager has placed the window, it keeps its position (the frame is already
// accounted for); only the size that still overflows the work area is trimmed
function shrinkIntoWorkArea (bounds, workArea) {
    let width = Math.max(1, Math.min(bounds.width, workArea.x + workArea.width - bounds.x));
    let height = Math.max(1, Math.min(bounds.height, workArea.y + workArea.height - bounds.y));

    return { width, height, minWidth: Math.min(MIN_SIZE.width, width), minHeight: Math.min(MIN_SIZE.height, height) };
}

// The smallest work area among the displays: a fresh window should fit on any of them
function smallestWorkArea (displays) {
    return displays.reduce((smallest, display) => ({
        width: Math.min(smallest.width, display.workAreaSize.width),
        height: Math.min(smallest.height, display.workAreaSize.height)
    }), { width: Infinity, height: Infinity });
}

module.exports = { fitWindowToWorkArea, shrinkIntoWorkArea, smallestWorkArea, fitZoom, DEFAULT_SIZE, DESIGN_SIZE, MIN_SIZE };
