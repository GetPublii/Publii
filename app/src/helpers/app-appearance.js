const DEFAULT_APP_APPEARANCE = 'publii';

function applyAppAppearance (targetDocument, legacyTheme, appAppearance = DEFAULT_APP_APPEARANCE) {
    if (!targetDocument || !targetDocument.documentElement) {
        return;
    }

    let colorScheme = legacyTheme === 'dark' ? 'dark' : 'light';
    let root = targetDocument.documentElement;

    root.setAttribute('data-theme', legacyTheme);
    root.setAttribute('data-app-appearance', appAppearance);
    root.setAttribute('data-color-scheme', colorScheme);
}

export {
    DEFAULT_APP_APPEARANCE,
    applyAppAppearance
};
