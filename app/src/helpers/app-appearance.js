const DEFAULT_APP_APPEARANCE = 'publii';
const DEFAULT_WORKSPACE_ACCENT = 'default';
const APP_APPEARANCES = Object.freeze({
    publii: Object.freeze({
        workspaceAccents: Object.freeze([
            DEFAULT_WORKSPACE_ACCENT,
            'indigo',
            'violet',
            'magenta',
            'crimson',
            'rose',
            'orange',
            'emerald',
            'petrol',
            'navy',
            'graphite',
            'midnight'
        ])
    })
});

function normalizeAppAppearance (appAppearance) {
    if (Object.prototype.hasOwnProperty.call(APP_APPEARANCES, appAppearance)) {
        return appAppearance;
    }

    return DEFAULT_APP_APPEARANCE;
}

function getSupportedWorkspaceAccents (appAppearance = DEFAULT_APP_APPEARANCE) {
    let normalizedAppAppearance = normalizeAppAppearance(appAppearance);

    return APP_APPEARANCES[normalizedAppAppearance].workspaceAccents.slice();
}

function normalizeWorkspaceAccent (workspaceAccent, appAppearance = DEFAULT_APP_APPEARANCE) {
    let normalizedAppAppearance = normalizeAppAppearance(appAppearance);
    let supportedAccents = getSupportedWorkspaceAccents(normalizedAppAppearance);

    if (supportedAccents.includes(workspaceAccent)) {
        return workspaceAccent;
    }

    return DEFAULT_WORKSPACE_ACCENT;
}

function applyAppAppearance (
    targetDocument,
    legacyTheme,
    appAppearance = DEFAULT_APP_APPEARANCE,
    workspaceAccent = DEFAULT_WORKSPACE_ACCENT
) {
    if (!targetDocument || !targetDocument.documentElement) {
        return;
    }

    let colorScheme = legacyTheme === 'dark' ? 'dark' : 'light';
    let normalizedAppAppearance = normalizeAppAppearance(appAppearance);
    let normalizedWorkspaceAccent = normalizeWorkspaceAccent(workspaceAccent, normalizedAppAppearance);
    let root = targetDocument.documentElement;

    root.setAttribute('data-theme', colorScheme === 'dark' ? 'dark' : 'default');
    root.setAttribute('data-app-appearance', normalizedAppAppearance);
    root.setAttribute('data-color-scheme', colorScheme);
    root.setAttribute('data-workspace-accent', normalizedWorkspaceAccent);
}

export {
    APP_APPEARANCES,
    DEFAULT_APP_APPEARANCE,
    DEFAULT_WORKSPACE_ACCENT,
    getSupportedWorkspaceAccents,
    normalizeAppAppearance,
    normalizeWorkspaceAccent,
    applyAppAppearance
};
