'use strict';

const MENU_COMMAND_CHANNEL = 'app-menu-command';
const MENU_STATE_CHANNEL = 'app-menu-state';

const DEFAULT_LABELS = Object.freeze({
    about: 'About Publii',
    appSettings: 'Settings…',
    authors: 'Authors',
    backups: 'Backups',
    blockEditor: 'Block Editor',
    bringAllToFront: 'Bring All to Front',
    checkForUpdates: 'Check for Updates…',
    closeWindow: 'Close Window',
    community: 'Community Support',
    copy: 'Copy',
    credits: 'Licenses and Credits',
    customCss: 'Custom CSS',
    customHtml: 'Custom HTML',
    cut: 'Cut',
    delete: 'Delete',
    developerTools: 'Developer Tools',
    documentation: 'Documentation',
    donate: 'Donate',
    edit: '&Edit',
    file: '&File',
    fileManager: 'File Manager',
    find: 'Find…',
    forceReload: 'Force Reload',
    fullScreen: 'Toggle Full Screen',
    generatePreviewFiles: 'Generate Preview Files',
    github: 'Publii on GitHub',
    help: '&Help',
    hide: 'Hide Publii',
    hideOthers: 'Hide Others',
    languages: 'Language Manager',
    logViewer: 'Log Viewer',
    markdownEditor: 'Markdown Editor',
    minimize: 'Minimize',
    newPage: 'New Page',
    newPost: 'New Post',
    newWindow: 'New Window',
    pages: 'Pages',
    paste: 'Paste',
    pasteAndMatchStyle: 'Paste and Match Style',
    plugins: 'Plugin Manager',
    posts: 'Posts',
    previewChanges: 'Preview Changes',
    quit: 'Quit Publii',
    redo: 'Redo',
    regenerateThumbnails: 'Regenerate Thumbnails',
    releaseNotes: 'Release Notes',
    reload: 'Reload',
    reportIssue: 'Report an Issue',
    resetZoom: 'Actual Size',
    selectAll: 'Select All',
    serverSettings: 'Server Settings',
    showAll: 'Show All',
    site: '&Site',
    menus: 'Menus',
    siteSettings: 'Site Settings',
    spellChecker: 'Check Spelling While Typing',
    syncWebsite: 'Sync Website',
    tags: 'Tags',
    themeSettings: 'Theme Settings',
    themes: 'Theme Manager',
    tools: '&Tools',
    undo: 'Undo',
    view: '&View',
    window: '&Window',
    wordpressImport: 'WordPress Import',
    wysiwygEditor: 'WYSIWYG Editor',
    zoom: 'Zoom',
    zoomIn: 'Zoom In',
    zoomOut: 'Zoom Out'
});

const EXTERNAL_LINKS = Object.freeze({
    community: 'https://github.com/GetPublii/Publii/discussions',
    documentation: 'https://getpublii.com/docs/',
    donate: 'https://getpublii.com/donate/',
    github: 'https://github.com/GetPublii/Publii',
    releaseNotes: 'https://github.com/GetPublii/Publii/releases',
    reportIssue: 'https://github.com/GetPublii/Publii/issues'
});

function buildApplicationMenuTemplate (options = {}) {
    const platform = options.platform || process.platform;
    const isMac = platform === 'darwin';
    const appName = options.appName || 'Publii';
    const translate = options.translate || (key => DEFAULT_LABELS[key] || key);
    const dispatch = options.dispatch || (() => {});
    const openExternal = options.openExternal || (() => {});
    const openNewWindow = options.openNewWindow || (() => {});
    const isDevelopment = options.isDevelopment === true;

    const label = key => translate(key) || DEFAULT_LABELS[key] || key;
    const topLevelLabel = key => isMac ? label(key).replace(/&/g, '') : label(key);
    const command = (id, labelKey, extra = {}) => Object.assign({
        id: id,
        label: label(labelKey),
        click: (menuItem, browserWindow) => dispatch(id, browserWindow)
    }, extra);
    const external = (labelKey, url, extra = {}) => Object.assign({
        label: label(labelKey),
        click: () => openExternal(url)
    }, extra);
    const separator = () => ({ type: 'separator' });
    const editorSubmenu = type => [
        command(
            'new-' + type + '-blockeditor',
            'blockEditor',
            type === 'post' ? { accelerator: 'CmdOrCtrl+Shift+N' } : {}
        ),
        command('new-' + type + '-tinymce', 'wysiwygEditor'),
        command('new-' + type + '-markdown', 'markdownEditor')
    ];

    const fileSubmenu = [
        {
            id: 'new-window',
            label: label('newWindow'),
            accelerator: 'CmdOrCtrl+N',
            click: () => openNewWindow()
        },
        separator(),
        { role: 'close', label: label('closeWindow') }
    ];

    if (!isMac) {
        fileSubmenu.push(
            separator(),
            command('app-settings', 'appSettings', { accelerator: 'Ctrl+,' }),
            separator(),
            { role: 'quit', label: label('quit'), accelerator: platform === 'win32' ? 'Alt+F4' : 'Ctrl+Q' }
        );
    }

    const editSubmenu = [
        { role: 'undo', label: label('undo'), accelerator: 'CmdOrCtrl+Z' },
        { role: 'redo', label: label('redo'), accelerator: isMac ? 'Shift+Cmd+Z' : 'Ctrl+Y' },
        separator(),
        { role: 'cut', label: label('cut'), accelerator: 'CmdOrCtrl+X' },
        { role: 'copy', label: label('copy'), accelerator: 'CmdOrCtrl+C' },
        { role: 'paste', label: label('paste'), accelerator: 'CmdOrCtrl+V' },
        {
            role: 'pasteAndMatchStyle',
            label: label('pasteAndMatchStyle'),
            accelerator: isMac ? 'Shift+Alt+Cmd+V' : 'CmdOrCtrl+Shift+V'
        },
        { role: 'delete', label: label('delete') },
        { role: 'selectAll', label: label('selectAll'), accelerator: 'CmdOrCtrl+A' },
        separator(),
        command('edit-find', 'find', { accelerator: 'CmdOrCtrl+F' }),
        { role: 'toggleSpellChecker', label: label('spellChecker') }
    ];

    const viewSubmenu = [
        command('view-reset-zoom', 'resetZoom', { accelerator: 'CmdOrCtrl+0' }),
        command('view-zoom-in', 'zoomIn', { accelerator: 'CmdOrCtrl+=' }),
        command('view-zoom-out', 'zoomOut', { accelerator: 'CmdOrCtrl+-' }),
        separator(),
        { role: 'togglefullscreen', label: label('fullScreen'), accelerator: isMac ? 'Ctrl+Cmd+F' : 'F11' }
    ];

    if (isDevelopment) {
        viewSubmenu.push(
            separator(),
            { role: 'reload', label: label('reload'), accelerator: 'CmdOrCtrl+R' },
            { role: 'forceReload', label: label('forceReload'), accelerator: 'CmdOrCtrl+Shift+R' }
        );
    }

    viewSubmenu.push(
        separator(),
        { role: 'toggleDevTools', label: label('developerTools'), accelerator: isMac ? 'Alt+Cmd+I' : 'Ctrl+Shift+I' }
    );

    const siteSubmenu = [
        {
            id: 'site-new-post',
            label: label('newPost'),
            submenu: editorSubmenu('post')
        },
        {
            id: 'site-new-page',
            label: label('newPage'),
            submenu: editorSubmenu('page')
        },
        separator(),
        command('site-posts', 'posts'),
        command('site-pages', 'pages'),
        command('site-menus', 'menus'),
        command('site-tags', 'tags'),
        command('site-authors', 'authors'),
        separator(),
        command('site-preview', 'previewChanges', { accelerator: 'CmdOrCtrl+Shift+P' }),
        command('site-generate-preview', 'generatePreviewFiles'),
        command('site-sync', 'syncWebsite', { accelerator: 'CmdOrCtrl+Shift+S' }),
        separator(),
        command('site-theme-settings', 'themeSettings'),
        command('site-settings', 'siteSettings'),
        command('site-server-settings', 'serverSettings')
    ];

    const toolsSubmenu = [
        command('tools-themes', 'themes'),
        command('tools-plugins', 'plugins'),
        command('tools-languages', 'languages'),
        separator(),
        command('tools-file-manager', 'fileManager'),
        command('tools-backups', 'backups'),
        command('tools-wordpress-import', 'wordpressImport'),
        command('tools-regenerate-thumbnails', 'regenerateThumbnails'),
        separator(),
        command('tools-custom-css', 'customCss'),
        command('tools-custom-html', 'customHtml'),
        command('tools-log-viewer', 'logViewer')
    ];

    const windowSubmenu = [
        { role: 'minimize', label: label('minimize') }
    ];

    if (isMac) {
        windowSubmenu.push(
            { role: 'zoom', label: label('zoom') },
            separator(),
            { role: 'front', label: label('bringAllToFront') }
        );
    } else {
        windowSubmenu.push({ role: 'close', label: label('closeWindow') });
    }

    const helpSubmenu = [
        external('documentation', EXTERNAL_LINKS.documentation, { accelerator: 'F1' }),
        external('community', EXTERNAL_LINKS.community),
        external('reportIssue', EXTERNAL_LINKS.reportIssue),
        separator(),
        external('github', EXTERNAL_LINKS.github),
        external('releaseNotes', EXTERNAL_LINKS.releaseNotes),
        external('donate', EXTERNAL_LINKS.donate),
        separator(),
        command('credits', 'credits')
    ];

    if (!isMac) {
        helpSubmenu.push(
            separator(),
            command('check-updates', 'checkForUpdates'),
            command('about', 'about')
        );
    }

    const template = [];

    if (isMac) {
        template.push({
            label: appName,
            submenu: [
                { role: 'about', label: label('about') },
                command('check-updates', 'checkForUpdates'),
                separator(),
                command('app-settings', 'appSettings', { accelerator: 'Cmd+,' }),
                separator(),
                { role: 'services' },
                separator(),
                { role: 'hide', label: label('hide') },
                { role: 'hideOthers', label: label('hideOthers') },
                { role: 'unhide', label: label('showAll') },
                separator(),
                { role: 'quit', label: label('quit'), accelerator: 'Cmd+Q' }
            ]
        });
    }

    template.push(
        { label: topLevelLabel('file'), submenu: fileSubmenu },
        { label: topLevelLabel('edit'), submenu: editSubmenu },
        { label: topLevelLabel('view'), submenu: viewSubmenu },
        { label: topLevelLabel('site'), submenu: siteSubmenu },
        { label: topLevelLabel('tools'), submenu: toolsSubmenu },
        Object.assign(
            { label: topLevelLabel('window'), submenu: windowSubmenu },
            isMac ? { role: 'window' } : {}
        ),
        { label: topLevelLabel('help'), role: 'help', submenu: helpSubmenu }
    );

    return template;
}

class ApplicationMenuController {
    constructor (options) {
        this.app = options.app;
        this.Menu = options.Menu;
        this.BrowserWindow = options.BrowserWindow;
        this.shell = options.shell;
        this.ipcMain = options.ipcMain;
        this.appInstance = options.appInstance;
        this.platform = options.platform || process.platform;
        this.isDevelopment = options.isDevelopment === true;
        this.menu = null;
        this.windowStates = new Map();
        this.trackedWindows = new Set();

        this.handleMenuState = this.handleMenuState.bind(this);
        this.handleWindowFocus = this.handleWindowFocus.bind(this);
    }

    install () {
        this.ipcMain.on(MENU_STATE_CHANNEL, this.handleMenuState);
        this.app.on('browser-window-focus', this.handleWindowFocus);
        this.rebuild();
    }

    translate (key) {
        const current = this.appInstance.currentLanguageTranslations || {};
        const fallback = this.appInstance.defaultLanguageTranslations || {};
        const currentLabels = current.applicationMenu || {};
        const fallbackLabels = fallback.applicationMenu || {};

        return currentLabels[key] || fallbackLabels[key] || DEFAULT_LABELS[key] || key;
    }

    rebuild () {
        const template = buildApplicationMenuTemplate({
            appName: typeof this.app.getName === 'function' ? this.app.getName() : (this.app.name || 'Publii'),
            platform: this.platform,
            isDevelopment: this.isDevelopment,
            translate: key => this.translate(key),
            dispatch: (command, browserWindow) => this.dispatch(command, browserWindow),
            openExternal: url => this.shell.openExternal(url),
            openNewWindow: () => this.appInstance.openNewWindow()
        });

        this.menu = this.Menu.buildFromTemplate(template);
        this.Menu.setApplicationMenu(this.menu);

        if (this.platform === 'darwin' && this.app.dock) {
            this.app.dock.setMenu(this.Menu.buildFromTemplate([{
                label: this.translate('newWindow'),
                click: () => this.appInstance.openNewWindow()
            }]));
        }

        this.applyFocusedWindowState();
    }

    dispatch (command, browserWindow) {
        const target = browserWindow || this.BrowserWindow.getFocusedWindow();

        if (!target || target.isDestroyed() || target.webContents.isDestroyed()) {
            return;
        }

        target.webContents.send(MENU_COMMAND_CHANNEL, command);
    }

    handleMenuState (event, state = {}) {
        const normalizedState = {
            advancedPreview: state.advancedPreview === true,
            editorOpen: state.editorOpen === true,
            hasSite: state.hasSite === true,
            pagesSupported: state.pagesSupported !== false,
            ready: state.ready === true,
            siteName: typeof state.siteName === 'string' ? state.siteName.slice(0, 200) : '',
            syncInProgress: state.syncInProgress === true
        };

        const senderId = event.sender.id;
        this.windowStates.set(senderId, normalizedState);

        const browserWindow = this.BrowserWindow.fromWebContents(event.sender);

        if (browserWindow && !this.trackedWindows.has(browserWindow.id)) {
            this.trackedWindows.add(browserWindow.id);
            browserWindow.once('closed', () => {
                this.windowStates.delete(senderId);
                this.trackedWindows.delete(browserWindow.id);
            });
        }

        if (browserWindow && browserWindow.isFocused()) {
            this.applyState(normalizedState);
        }
    }

    handleWindowFocus (event, browserWindow) {
        const state = this.windowStates.get(browserWindow.webContents.id);
        this.applyState(state);
    }

    applyFocusedWindowState () {
        const browserWindow = this.BrowserWindow.getFocusedWindow();
        const state = browserWindow ? this.windowStates.get(browserWindow.webContents.id) : null;
        this.applyState(state);
    }

    setEnabled (id, enabled) {
        const item = this.menu && this.menu.getMenuItemById(id);

        if (item) {
            item.enabled = enabled;
        }
    }

    applyState (state = {}) {
        state = state || {};
        const ready = state.ready === true;
        const navigationEnabled = ready && state.editorOpen !== true && state.syncInProgress !== true;
        const siteEnabled = navigationEnabled && state.hasSite === true;
        const globalNavigationItems = [
            'app-settings',
            'about',
            'check-updates',
            'credits',
            'tools-themes',
            'tools-plugins',
            'tools-languages'
        ];
        const siteItems = [
            'site-new-post',
            'site-posts',
            'site-pages',
            'site-tags',
            'site-authors',
            'site-menus',
            'site-preview',
            'site-sync',
            'site-settings',
            'site-server-settings',
            'site-theme-settings',
            'tools-file-manager',
            'tools-backups',
            'tools-wordpress-import',
            'tools-regenerate-thumbnails',
            'tools-custom-css',
            'tools-custom-html',
            'tools-log-viewer'
        ];

        globalNavigationItems.forEach(id => this.setEnabled(id, navigationEnabled));
        siteItems.forEach(id => this.setEnabled(id, siteEnabled));
        this.setEnabled('site-new-page', siteEnabled && state.pagesSupported !== false);
        this.setEnabled('site-generate-preview', siteEnabled && state.advancedPreview === true);
        this.setEnabled('edit-find', ready && state.editorOpen === true);
    }
}

module.exports = {
    ApplicationMenuController,
    DEFAULT_LABELS,
    EXTERNAL_LINKS,
    MENU_COMMAND_CHANNEL,
    MENU_STATE_CHANNEL,
    buildApplicationMenuTemplate
};
