/*
 * Shared SortableJS options for the nested menu-item lists on the Menus screen.
 * Both the top-level list (Menus.vue) and every nested list (MenuItem.vue)
 * must use the same settings so items move between levels consistently.
 */
/*
 * SortableJS `move` guard: a row nested inside another row must never be
 * swapped with that ancestor. Without it, hovering the parent while the row
 * sits in its child list pops the row out above the parent.
 */
export function keepItemOutOfItsAncestors (event) {
    if (event.related && event.dragged && event.related.contains(event.dragged)) {
        return false;
    }

    return true;
}

export default function menuDragOptions (disabled = false) {
    return {
        animation: 150,
        forceFallback: true,
        // Keep the dragged clone outside the scrolling list so it is never clipped
        fallbackOnBody: true,
        // Ignore pointer jitter of a few pixels before a drag starts
        fallbackTolerance: 3,
        // Keep the default swap threshold: a smaller one creates dead bands at
        // the top and bottom of every row, which makes "after the last child"
        // of a nested list unreachable when approaching from below
        handle: '.menu-item-handle',
        disabled: disabled
    };
}
