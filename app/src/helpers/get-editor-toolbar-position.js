export default function getEditorToolbarPosition (rect, toolbar) {
    const toolbarWidth = toolbar.outerWidth();
    const iframe = $('#post-editor_ifr');
    const sidebar = $('.post-editor-sidebar.is-visible');
    const iframeLeft = iframe.offset().left;
    const centeredLeft = iframeLeft + rect.left + rect.width / 2 - toolbarWidth / 2;
    const minLeft = Math.max(10, iframeLeft + 10);
    const sidebarLeft = sidebar.length ? sidebar.offset().left : window.innerWidth;
    const rightEdge = Math.min(window.innerWidth, iframeLeft + iframe.outerWidth(), sidebarLeft);
    const maxLeft = rightEdge - toolbarWidth - 10;

    // Preserve the text toolbar's gap, including space for its arrow.
    const gap = 14;

    return {
        left: Math.max(minLeft, Math.min(centeredLeft, maxLeft)),
        top: iframe.offset().top + rect.top - toolbar.outerHeight() - gap
    };
}
