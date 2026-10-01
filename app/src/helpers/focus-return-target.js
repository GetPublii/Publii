function focusReturnTarget(element) {
    if (!element) {
        return null;
    }

    const menu = element.closest('.action-menu');
    return menu ? menu.querySelector('[data-action-menu-trigger]') : element;
}

module.exports = focusReturnTarget;
