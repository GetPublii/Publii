'use strict';

const assert = require('assert');
const {
    ApplicationMenuController,
    buildApplicationMenuTemplate,
    buildDockMenuTemplate,
    normalizeRecentSiteNames
} = require('../application-menu.js');

function findTopLevel (template, label) {
    return template.find(item => item.label && item.label.replace(/&/g, '') === label);
}

function findById (items, id) {
    for (const item of items) {
        if (item.id === id) {
            return item;
        }

        if (Array.isArray(item.submenu)) {
            const nestedItem = findById(item.submenu, id);

            if (nestedItem) {
                return nestedItem;
            }
        }
    }

    return null;
}

function findByRole (items, role) {
    for (const item of items) {
        if (item.role === role) {
            return item;
        }

        if (Array.isArray(item.submenu)) {
            const nestedItem = findByRole(item.submenu, role);

            if (nestedItem) {
                return nestedItem;
            }
        }
    }

    return null;
}

describe('application menu template', function () {
    it('uses the native macOS application-menu layout', function () {
        const template = buildApplicationMenuTemplate({ platform: 'darwin', appName: 'Publii' });
        const appMenu = template[0];
        const fileMenu = findTopLevel(template, 'File');
        const helpMenu = findTopLevel(template, 'Help');

        assert.strictEqual(appMenu.label, 'Publii');
        assert.ok(findByRole(appMenu.submenu, 'about'));
        assert.ok(findByRole(appMenu.submenu, 'services'));
        assert.ok(findByRole(appMenu.submenu, 'quit'));
        assert.strictEqual(findById(appMenu.submenu, 'app-settings').accelerator, 'Cmd+,');
        assert.strictEqual(findById(fileMenu.submenu, 'app-settings'), null);
        assert.strictEqual(findById(helpMenu.submenu, 'check-updates'), null);
    });

    ['win32', 'linux'].forEach(platform => {
        it('uses the Windows/Linux placement rules on ' + platform, function () {
            const template = buildApplicationMenuTemplate({ platform: platform });
            const fileMenu = findTopLevel(template, 'File');
            const helpMenu = findTopLevel(template, 'Help');

            assert.strictEqual(template[0].label, '&File');
            assert.ok(findById(fileMenu.submenu, 'app-settings'));
            assert.ok(findByRole(fileMenu.submenu, 'quit'));
            assert.ok(findById(helpMenu.submenu, 'check-updates'));
            assert.ok(findById(helpMenu.submenu, 'about'));
        });
    });

    it('uses Electron roles for native editing and window behavior', function () {
        const template = buildApplicationMenuTemplate({ platform: 'win32' });

        ['undo', 'redo', 'cut', 'copy', 'paste', 'delete', 'selectAll', 'togglefullscreen', 'toggleDevTools', 'minimize', 'close']
            .forEach(role => assert.ok(findByRole(template, role), 'Missing role: ' + role));
    });

    it('includes Publii CMS commands and editor choices', function () {
        const dispatched = [];
        const template = buildApplicationMenuTemplate({
            platform: 'linux',
            dispatch: command => dispatched.push(command)
        });
        const newPost = findById(template, 'site-new-post');

        assert.ok(findById(template, 'site-preview'));
        assert.ok(findById(template, 'site-generate-preview'));
        assert.ok(findById(template, 'site-sync'));
        assert.ok(findById(template, 'tools-wordpress-import'));
        assert.strictEqual(newPost.submenu.length, 3);

        findById(template, 'new-post-blockeditor').click();
        assert.deepStrictEqual(dispatched, ['new-post-blockeditor']);
    });

    it('keeps the Site content order consistent with the Publii sidebar', function () {
        const template = buildApplicationMenuTemplate({ platform: 'win32' });
        const siteMenu = findTopLevel(template, 'Site').submenu;
        const contentIds = siteMenu
            .filter(item => ['site-posts', 'site-pages', 'site-menus', 'site-tags', 'site-authors'].includes(item.id))
            .map(item => item.id);

        assert.deepStrictEqual(contentIds, [
            'site-posts',
            'site-pages',
            'site-menus',
            'site-tags',
            'site-authors'
        ]);
        assert.strictEqual(findById(siteMenu, 'site-menus').label, 'Menus');
    });

    it('places Theme Settings before Site and Server Settings', function () {
        const template = buildApplicationMenuTemplate({ platform: 'win32' });
        const siteMenu = findTopLevel(template, 'Site').submenu;
        const settingsIds = siteMenu
            .filter(item => ['site-theme-settings', 'site-settings', 'site-server-settings'].includes(item.id))
            .map(item => item.id);

        assert.deepStrictEqual(settingsIds, [
            'site-theme-settings',
            'site-settings',
            'site-server-settings'
        ]);
    });

    it('shows reload commands only in development and developer tools in all builds', function () {
        const production = buildApplicationMenuTemplate({ platform: 'win32' });
        const development = buildApplicationMenuTemplate({ platform: 'win32', isDevelopment: true });

        assert.strictEqual(findByRole(production, 'reload'), null);
        assert.ok(findByRole(production, 'toggleDevTools'));
        assert.ok(findByRole(development, 'reload'));
        assert.ok(findByRole(development, 'forceReload'));
    });
});

describe('macOS Dock menu template', function () {
    const sites = {
        'company-site': {
            displayName: 'Company Website',
            domain: 'https://example.com/company'
        },
        'my-blog': {
            displayName: 'My Blog',
            domain: 'https://example.com'
        }
    };

    it('keeps only New Window when there is no site context', function () {
        let newWindowOpened = false;
        const template = buildDockMenuTemplate({
            openNewWindow: () => {
                newWindowOpened = true;
            }
        });

        assert.deepStrictEqual(template.map(item => item.id), ['dock-new-window']);
        template[0].click();
        assert.strictEqual(newWindowOpened, true);
    });

    it('builds recent-site quick actions', function () {
        const actions = [];
        const template = buildDockMenuTemplate({
            canOpenSites: true,
            openSite: siteName => actions.push(['open-site', siteName]),
            recentSiteNames: ['missing-site', 'company-site', 'my-blog'],
            sites
        });
        const recentSites = findById(template, 'dock-recent-sites');

        assert.deepStrictEqual(recentSites.submenu.map(item => item.label), ['Company Website', 'My Blog']);
        assert.strictEqual(recentSites.enabled, true);

        recentSites.submenu[0].click();

        assert.deepStrictEqual(actions, [['open-site', 'company-site']]);
    });

    it('limits and validates recent sites', function () {
        const manySites = {};
        const siteNames = [];

        for (let index = 0; index < 7; index++) {
            const siteName = 'site-' + index;
            manySites[siteName] = { displayName: 'Site ' + index };
            siteNames.push(siteName);
        }

        assert.deepStrictEqual(
            normalizeRecentSiteNames(siteNames.concat(['site-0', 'missing']), manySites),
            siteNames.slice(0, 5)
        );
    });

    it('disambiguates duplicate display names and sanitizes menu labels', function () {
        const template = buildDockMenuTemplate({
            canOpenSites: true,
            recentSiteNames: ['first', 'second'],
            sites: {
                first: { displayName: 'Shared\nName' },
                second: { displayName: 'Shared Name' }
            }
        });
        const labels = findById(template, 'dock-recent-sites').submenu.map(item => item.label);

        assert.deepStrictEqual(labels, ['Shared Name — first', 'Shared Name — second']);
    });
});

describe('application menu state', function () {
    it('disables site commands without a selected site and restores them contextually', function () {
        const menuItems = new Map();
        const fakeMenu = {
            buildFromTemplate: template => {
                const collect = items => items.forEach(item => {
                    if (item.id) {
                        item.enabled = true;
                        menuItems.set(item.id, item);
                    }

                    if (Array.isArray(item.submenu)) {
                        collect(item.submenu);
                    }
                });
                collect(template);
                return { getMenuItemById: id => menuItems.get(id) };
            },
            setApplicationMenu: () => {}
        };
        const controller = new ApplicationMenuController({
            app: { name: 'Publii', on: () => {} },
            Menu: fakeMenu,
            BrowserWindow: { getFocusedWindow: () => null },
            shell: { openExternal: () => {} },
            ipcMain: { on: () => {} },
            appInstance: {
                currentLanguageTranslations: {},
                defaultLanguageTranslations: {},
                openNewWindow: () => {}
            }
        });

        controller.install();
        assert.strictEqual(menuItems.get('site-new-post').enabled, false);

        controller.applyState({ ready: true, hasSite: true, pagesSupported: false, advancedPreview: false });
        assert.strictEqual(menuItems.get('site-new-post').enabled, true);
        assert.strictEqual(menuItems.get('site-new-page').enabled, false);
        assert.strictEqual(menuItems.get('site-generate-preview').enabled, false);

        controller.applyState({ ready: true, hasSite: true, pagesSupported: true, advancedPreview: true });
        assert.strictEqual(menuItems.get('site-new-page').enabled, true);
        assert.strictEqual(menuItems.get('site-generate-preview').enabled, true);
    });

    it('loads persisted recent sites before a site window is focused', function () {
        const controller = new ApplicationMenuController({
            app: { name: 'Publii', on: () => {} },
            Menu: {
                buildFromTemplate: () => ({ getMenuItemById: () => null }),
                setApplicationMenu: () => {}
            },
            BrowserWindow: {
                fromWebContents: () => null,
                getFocusedWindow: () => null
            },
            shell: { openExternal: () => {} },
            ipcMain: { on: () => {} },
            appInstance: {
                currentLanguageTranslations: {},
                defaultLanguageTranslations: {},
                openNewWindow: () => {},
                sites: {
                    'last-site': { displayName: 'Last Site' }
                }
            },
            platform: 'linux'
        });

        controller.updateRecentSites(['last-site']);

        assert.deepStrictEqual(controller.recentSiteNames, ['last-site']);
    });

    it('restores the primary window when New Window is used with no windows open', function () {
        let primaryWindowRestored = false;
        let secondaryWindowOpened = false;
        const controller = new ApplicationMenuController({
            app: { name: 'Publii', on: () => {} },
            Menu: {
                buildFromTemplate: () => ({ getMenuItemById: () => null }),
                setApplicationMenu: () => {}
            },
            BrowserWindow: { getFocusedWindow: () => null },
            shell: { openExternal: () => {} },
            ipcMain: { on: () => {} },
            appInstance: {
                currentLanguageTranslations: {},
                defaultLanguageTranslations: {},
                openNewWindow: () => {
                    secondaryWindowOpened = true;
                },
                reopenMainWindow: () => {
                    primaryWindowRestored = true;
                },
                windowManager: {
                    getAllWindows: () => []
                }
            },
            platform: 'linux'
        });

        controller.openNewWindow();

        assert.strictEqual(primaryWindowRestored, true);
        assert.strictEqual(secondaryWindowOpened, false);
    });
});
