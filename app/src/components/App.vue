<template>
    <div
        id="app"
        :class="{ 'app-view': true, 'use-wide-scrollbars': useWideScrollbars }"
        :style="$root.overridedCssVariables">
        <message />
        <topbar v-if="!splashScreenDisplayed && !itemEditorDisplayed" />
        <section :class="$route.path.replace(/^\//mi, '').replace(/\/$/mi, '').replace(/\//gmi, '-')">
            <router-view />
        </section>

        <confirm />
        <alert />
        <rendering-popup />
        <regenerate-thumbnails-popup />
        <error-popup />
        <sites-location-popup />
        <sites-popup />
        <sync-popup />
    </div>
</template>

<script>
import { mapGetters } from 'vuex';
import TopBar from './TopBar';
import TopBarAppBar from './TopBarAppBar';
import Message from './Message';
import RenderingPopup from './RenderingPopup';
import RegenerateThumbnailsPopup from './RegenerateThumbnailsPopup';
import SitesPopup from './SitesPopup';
import SyncPopup from './SyncPopup';
import ErrorPopup from './ErrorPopup';
import SitesLocationPopup from './SitesLocationPopup';
import { setTooltipsEnabled } from '../helpers/tooltip';
import escapeHTML from '../helpers/escape-html.js';

const GLOBAL_MENU_ROUTES = Object.freeze({
    'about': '/about/',
    'app-settings': '/app-settings/',
    'credits': '/about/credits/',
    'tools-languages': '/app-languages/',
    'tools-plugins': '/app-plugins/',
    'tools-themes': '/app-themes/'
});

const SITE_MENU_ROUTES = Object.freeze({
    'site-authors': 'authors',
    'site-menus': 'menus',
    'site-pages': 'pages',
    'site-posts': 'posts',
    'site-server-settings': 'settings/server',
    'site-settings': 'settings',
    'site-tags': 'tags',
    'site-theme-settings': 'settings/themes',
    'tools-backups': 'tools/backups',
    'tools-custom-css': 'tools/custom-css',
    'tools-custom-html': 'tools/custom-html',
    'tools-file-manager': 'tools/file-manager',
    'tools-log-viewer': 'tools/log-viewer',
    'tools-regenerate-thumbnails': 'tools/regenerate-thumbnails',
    'tools-wordpress-import': 'tools/wp-importer'
});

// Views which can be open in a single window only (route name -> view ID used by the main process)
const EXCLUSIVE_VIEWS = Object.freeze({
    'AppLanguages': 'app-languages',
    'AppPlugins': 'app-plugins',
    'AppSettings': 'app-settings',
    'AppThemes': 'app-themes'
});

const RECENT_SITES_STORAGE_KEY = 'publii-recent-websites';
const LAST_OPENED_SITE_STORAGE_KEY = 'publii-last-opened-website';
const MAX_RECENT_SITES = 5;

export default {
    name: 'app',
    props: [
        'initialData'
    ],
    components: {
        'message': Message,
        'topbar': TopBar,
        'topbar-appbar': TopBarAppBar,
        'rendering-popup': RenderingPopup,
        'regenerate-thumbnails-popup': RegenerateThumbnailsPopup,
        'error-popup': ErrorPopup,
        'sites-location-popup': SitesLocationPopup,
        'sites-popup': SitesPopup,
        'sync-popup': SyncPopup
    },
    computed: {
        ...mapGetters([
            'siteNames'
        ]),
        splashScreenDisplayed () {
            if(this.$route.path === '/') {
                return true;
            }

            return false;
        },
        itemEditorDisplayed () {
            if (this.$route.path.indexOf('/posts/editor/') > -1 || this.$route.path.indexOf('/pages/editor/') > -1) {
                return true;
            }

            return false;
        },
        useWideScrollbars () {
            return this.$store.state.app.config.wideScrollbars;
        }
    },
    watch: {
        '$store.state.app.config.autoAdjustSidebarWidth': {
            immediate: true,
            handler (value) {
                document.documentElement.setAttribute('data-auto-adjust-sidebar-width', String(value !== false));
            }
        },
        '$store.state.app.config.showTooltips': {
            immediate: true,
            handler (value) {
                setTooltipsEnabled(value);
            }
        }
    },
    created () {
        // Initialize the store before the first render, so child views see the real config from the start
        this.setState();

        let notificationsReadStatus = localStorage.getItem('publii-notifications-readed') || '';
        notificationsReadStatus = notificationsReadStatus.replace(/[^a-z0-9\-_;\.]/gmi, '');
        this.$store.commit('setNotificationsReadStatus', notificationsReadStatus);
    },
    async mounted () {
        // Setup app
        this.disableDragNDrop();
        await this.setEnvironmentInfo();
        this.integrateTopBar();
        this.setupApplicationMenu();
        this.setupExclusiveViews();
        this.setupSitesSync();

        if (this.initialData.isNewWindow && this.$store.state.app.sitesLocationMissing) {
            this.$router.push('/site/!/posts');
            this.$nextTick(() => this.$bus.$emit('sites-location-popup-show'));
        } else if (this.initialData.isNewWindow) {
            // Secondary window: skip splash screen
            if (this.initialData.initialSite && this.siteNames.indexOf(this.initialData.initialSite) > -1) {
                this.$router.push(`/site/${this.initialData.initialSite}/posts`);
            } else {
                this.$router.push('/site/!/posts');

                // If there are existing sites, show the sites picker immediately
                if (this.siteNames.length > 0) {
                    this.$nextTick(() => this.$bus.$emit('sites-popup-show'));
                }
            }
        } else if (this.$store.state.app.config.licenseAccepted) {
            if (this.initialData.skipSplashScreen) {
                // Reopened primary window: the app is already running, go straight to the initial screen
                this.startApplication();
            } else {
                // Primary window: normal 2-second splash screen
                setTimeout(() => this.startApplication(), 2000);
            }
        }

        this.$bus.$on('license-accepted', this.startApplication);
        this.$bus.$on('sites-location-restored', this.showInitialScreen);
    },
    methods: {
        // Block drag'n'drop redirects
        disableDragNDrop () {
            document.addEventListener('dragover', event => event.preventDefault());
            document.addEventListener('drop', event => event.preventDefault());
        },

        // Add to <body> additional informations
        async setEnvironmentInfo () {
            document.body.setAttribute('data-node-version', mainProcessAPI.getEnv().nodeVersion);
            document.body.setAttribute('data-chrome-version', mainProcessAPI.getEnv().chromeVersion);
            document.body.setAttribute('data-electron-version', mainProcessAPI.getEnv().electronVersion);
            document.body.setAttribute('data-os', mainProcessAPI.getEnv().platformName === 'darwin' ? 'osx' : mainProcessAPI.getEnv().platformName === 'linux' ? 'linux' : 'win');
            document.documentElement.setAttribute('data-is-osx-11-or-higher', await mainProcessAPI.invoke('app-main-process-is-osx11-or-higher'));
            document.body.setAttribute('data-env', mainProcessAPI.getEnv().name);
        },

        // Set initial application state tree
        setState () {
            this.$store.commit('init', this.initialData);
            document.documentElement.style.setProperty('--ui-zoom-level', parseInt(this.$store.state.app.config.uiZoomLevel * 100.0, 10) + '%');
        },

        // Leave the splash screen, unless the sites folder has to be resolved first
        startApplication () {
            if (this.$store.state.app.sitesLocationMissing) {
                this.$bus.$emit('sites-location-popup-show');
                return;
            }

            this.showInitialScreen();
        },

        // Show site screen when there is only one website
        // or user wants to load directly specific website
        showInitialScreen: function() {
            let startScreen = this.$store.state.app.config.startScreen;
            let siteNames = this.siteNames;
            let siteToDisplay = '!';
            let lastOpenedWebsite = window.localStorage.getItem('publii-last-opened-website');

            if (siteNames.length > 0) {
                if (startScreen && siteNames.indexOf(startScreen) > -1) {
                    siteToDisplay = startScreen;
                } else if (lastOpenedWebsite !== null && siteNames.indexOf(lastOpenedWebsite) > -1) {
                    siteToDisplay = lastOpenedWebsite;
                } else {
                    siteToDisplay = '!';
                }
            }

            this.showWebsite(siteToDisplay);
            this.showRemovedPreviewLocationNotice();
        },

        // Inform once that the custom preview location configured in an older version is no longer used
        showRemovedPreviewLocationNotice () {
            let removedLocation = this.initialData.removedPreviewLocation;

            if (!removedLocation || this.removedPreviewLocationNoticeShown) {
                return;
            }

            this.removedPreviewLocationNoticeShown = true;
            this.$bus.$emit('alert-display', {
                // The alert renders HTML, so the path must be escaped
                message: this.$t('settings.previewLocationRemovedMsg', {
                    location: escapeHTML(removedLocation)
                }),
                okLabel: this.$t('ui.iUnderstand')
            });
        },

        // Show specific website
        showWebsite: function(siteToDisplay) {
            if(siteToDisplay !== '' && siteToDisplay !== '!') {
                window.localStorage.setItem('publii-last-opened-website', siteToDisplay);
            }

            this.$router.push(`/site/${siteToDisplay}`);
        },

        // Check for helper click events for TopBar
        integrateTopBar: function() {
            document.body.addEventListener('click', e => {
                this.$bus.$emit('document-body-clicked');
            });
        },
        setupApplicationMenu () {
            mainProcessAPI.receive('app-menu-command', this.handleApplicationMenuCommand);
            this.applicationMenuStateUnwatch = this.$watch(
                () => {
                    let currentSite = this.$store.state.currentSite || {};

                    return [
                        this.$route.path,
                        this.$store.state.app.editorOpened,
                        this.$store.state.app.config.enableAdvancedPreview,
                        this.$store.state.components.sidebar.syncInProgress,
                        currentSite.config && currentSite.config.name,
                        currentSite.themeSettings &&
                            currentSite.themeSettings.supportedFeatures &&
                            currentSite.themeSettings.supportedFeatures.pages
                    ];
                },
                this.syncApplicationMenuState,
                { immediate: true }
            );
        },
        // Keep the sites list and the app config in sync with changes made in other windows
        setupSitesSync () {
            mainProcessAPI.receive('app-sites-updated', sites => {
                this.$store.commit('setSites', sites);
            });

            mainProcessAPI.receive('app-config-updated', config => {
                this.$store.commit('setAppConfig', config);
                // The zoom factor of this window is applied by the main process - only the CSS part is left
                document.documentElement.style.setProperty('--ui-zoom-level', parseInt(this.getApplicationZoom() * 100.0, 10) + '%');
                // Lists react to this event by applying the new default ordering
                this.$bus.$emit('app-settings-saved', this.$store.state.app.config);
            });

            // Themes, languages or plugins were installed or removed in another window
            mainProcessAPI.receive('app-extensions-updated', data => {
                this.$store.commit('replaceAppThemes', data.themes);
                this.$store.commit('updateSiteThemes');
                this.$store.commit('replaceAppLanguages', data.languages);
                this.$store.commit('replaceAppPlugins', data.plugins);
            });

            // The app language was changed in another window - the same steps as while activating a language
            mainProcessAPI.receive('app-language-updated', data => {
                if (!data || !data.lang || !data.translations) {
                    return;
                }

                this.$store.commit('setAppLanguage', data.lang);
                this.$store.commit('setAppLanguageType', data.type);
                this.$i18n.setLocaleMessage(data.lang, data.translations);
                this.$i18n.locale = data.lang;

                if (data.momentLocale) {
                    this.$moment.locale(data.momentLocale);
                }

                this.$store.commit('setWysiwygTranslation', data.wysiwygTranslation);
            });
        },
        setupExclusiveViews () {
            this.exclusiveViewsUnregister = [
                this.$router.beforeResolve(this.acquireExclusiveView),
                this.$router.afterEach(this.releaseExclusiveView)
            ];
        },
        // Reserve the target view in the main process before entering it - or point the user to the window which has it
        async acquireExclusiveView (to, from, next) {
            let viewId = EXCLUSIVE_VIEWS[to.name];

            if (!viewId || viewId === EXCLUSIVE_VIEWS[from.name]) {
                next();
                return;
            }

            let result = null;

            try {
                result = await mainProcessAPI.invoke('app-view-lock', viewId);
            } catch (error) {
                // The lock is a convenience only - never block the navigation when the main process is unreachable
            }

            if (result && result.status === false && result.error === 'view-already-open') {
                next(false);
                this.$bus.$emit('confirm-display', {
                    message: this.$t('ui.screenAlreadyOpenInAnotherWindow'),
                    okLabel: this.$t('ui.goToThatWindow'),
                    cancelLabel: this.$t('ui.cancel'),
                    okClick: () => mainProcessAPI.send('app-focus-window-with-view', viewId)
                });
                return;
            }

            next();
        },
        releaseExclusiveView (to, from) {
            let viewId = EXCLUSIVE_VIEWS[from.name];

            if (viewId && viewId !== EXCLUSIVE_VIEWS[to.name]) {
                mainProcessAPI.send('app-view-unlock', viewId);
            }
        },
        getRecentSiteNames (activeSiteName = '') {
            let storedSiteNames = [];
            let lastOpenedSite = '';
            let rawStoredValue = '';
            let availableSiteNames = Array.isArray(this.siteNames) ? this.siteNames : [];

            try {
                rawStoredValue = window.localStorage.getItem(RECENT_SITES_STORAGE_KEY) || '';
            } catch (error) {}

            try {
                let parsedSiteNames = JSON.parse(rawStoredValue || '[]');

                if (Array.isArray(parsedSiteNames)) {
                    storedSiteNames = parsedSiteNames.slice(0, MAX_RECENT_SITES);
                }
            } catch (error) {
                storedSiteNames = [];
            }

            try {
                lastOpenedSite = window.localStorage.getItem(LAST_OPENED_SITE_STORAGE_KEY) || '';
            } catch (error) {}

            let recentSiteNames = [activeSiteName, lastOpenedSite]
                .concat(storedSiteNames)
                .filter((siteName, index, allSiteNames) => (
                    typeof siteName === 'string' &&
                    siteName.length <= 200 &&
                    availableSiteNames.indexOf(siteName) > -1 &&
                    allSiteNames.indexOf(siteName) === index
                ))
                .slice(0, MAX_RECENT_SITES);
            let serializedSiteNames = JSON.stringify(recentSiteNames);

            if (serializedSiteNames !== rawStoredValue) {
                try {
                    window.localStorage.setItem(RECENT_SITES_STORAGE_KEY, serializedSiteNames);
                } catch (error) {}
            }

            return recentSiteNames;
        },
        syncApplicationMenuState () {
            let currentSite = this.$store.state.currentSite || {};
            let siteConfig = currentSite.config || {};
            let siteName = siteConfig.name || '';
            let routeSiteName = (this.$route.params && this.$route.params.name) || '';
            let supportedFeatures = currentSite.themeSettings && currentSite.themeSettings.supportedFeatures;
            let siteIsReady = siteName !== '' &&
                siteName !== '!' &&
                (!routeSiteName || routeSiteName === siteName);

            mainProcessAPI.send('app-menu-state', {
                advancedPreview: this.$store.state.app.config.enableAdvancedPreview === true,
                editorOpen: this.itemEditorDisplayed || this.$store.state.app.editorOpened === true,
                hasSite: siteIsReady,
                pagesSupported: !supportedFeatures || supportedFeatures.pages !== false,
                ready: !this.splashScreenDisplayed,
                recentSiteNames: this.getRecentSiteNames(siteIsReady ? siteName : ''),
                siteName: siteName,
                syncInProgress: this.$store.state.components.sidebar.syncInProgress === true
            });
        },
        handleApplicationMenuCommand (command) {
            let newContent = /^new-(post|page)-(blockeditor|tinymce|markdown)$/.exec(command);

            if (newContent) {
                this.openNewContent(newContent[1], newContent[2]);
                return;
            }

            if (GLOBAL_MENU_ROUTES[command]) {
                this.navigateFromApplicationMenu(GLOBAL_MENU_ROUTES[command]);
                return;
            }

            if (SITE_MENU_ROUTES[command]) {
                let siteName = this.$store.state.currentSite.config.name;

                if (siteName && siteName !== '!') {
                    this.navigateFromApplicationMenu('/site/' + siteName + '/' + SITE_MENU_ROUTES[command]);
                }
                return;
            }

            if (command === 'check-updates') {
                this.navigateFromApplicationMenu('/notifications-center/');
                this.$nextTick(() => this.$bus.$emit('app-get-forced-notifications'));
            } else if (command === 'edit-find') {
                this.$bus.$emit('app-show-search-form');
            } else if (command === 'site-preview') {
                this.$bus.$emit('app-menu-preview');
            } else if (command === 'site-generate-preview') {
                this.$bus.$emit('app-menu-generate-preview');
            } else if (command === 'site-sync') {
                this.$bus.$emit('app-menu-sync');
            } else if (command === 'view-reset-zoom') {
                this.setApplicationZoom(1);
            } else if (command === 'view-zoom-in') {
                this.setApplicationZoom(this.getApplicationZoom() + 0.05);
            } else if (command === 'view-zoom-out') {
                this.setApplicationZoom(this.getApplicationZoom() - 0.05);
            }
        },
        navigateFromApplicationMenu (path) {
            if (this.itemEditorDisplayed || this.$store.state.app.editorOpened) {
                return;
            }

            if (document.activeElement && typeof document.activeElement.blur === 'function') {
                document.activeElement.blur();
            }

            this.$router.push(path);
        },
        openNewContent (type, editorType) {
            let siteName = this.$store.state.currentSite.config.name;

            if (!siteName || siteName === '!' || this.itemEditorDisplayed || this.$store.state.app.editorOpened) {
                return;
            }

            if (
                editorType === 'blockeditor' &&
                this.$store.state.currentSite.themeSettings &&
                this.$store.state.currentSite.themeSettings.supportedFeatures &&
                !this.$store.state.currentSite.themeSettings.supportedFeatures.blockEditor
            ) {
                let translationGroup = type === 'post' ? 'post' : 'page';
                let itemName = type === 'post' ? 'Post' : 'Page';

                this.$bus.$emit('confirm-display', {
                    message: this.$t(translationGroup + '.editorBlockNotSupportedNew' + itemName + 'Info'),
                    okLabel: this.$t(translationGroup + '.openEditorAnyway'),
                    isDanger: true,
                    okClick: () => this.openContentEditor(type, editorType, siteName)
                });
                return;
            }

            this.openContentEditor(type, editorType, siteName);
        },
        openContentEditor (type, editorType, siteName) {
            this.$store.commit('setEditorOpenState', true);
            this.$router.push('/site/' + siteName + '/' + type + 's/editor/' + editorType + '/');
        },
        getApplicationZoom () {
            let zoom = parseFloat(this.$store.state.app.config.uiZoomLevel);
            return Number.isFinite(zoom) ? zoom : 1;
        },
        setApplicationZoom (zoom) {
            let normalizedZoom = Math.min(2.5, Math.max(0.75, Math.round(zoom * 20) / 20));

            this.$store.commit('setAppUIZoomLevel', normalizedZoom);
            document.documentElement.style.setProperty('--ui-zoom-level', parseInt(normalizedZoom * 100.0, 10) + '%');
            mainProcessAPI.send('app-set-ui-zoom-level', normalizedZoom);
        }
    },
    beforeDestroy () {
        this.$bus.$off('license-accepted');
        this.$bus.$off('sites-location-restored');
        mainProcessAPI.stopReceiveAll('app-license-accepted');
        mainProcessAPI.stopReceiveAll('app-menu-command');
        mainProcessAPI.stopReceiveAll('app-sites-updated');
        mainProcessAPI.stopReceiveAll('app-config-updated');
        mainProcessAPI.stopReceiveAll('app-extensions-updated');
        mainProcessAPI.stopReceiveAll('app-language-updated');

        if (this.applicationMenuStateUnwatch) {
            this.applicationMenuStateUnwatch();
        }

        if (this.exclusiveViewsUnregister) {
            this.exclusiveViewsUnregister.forEach(unregister => unregister());
        }
    }
}
</script>

<style>
@import '../css/vendor/normalize.css';
@import '../css/vendor/vue-multiselect.css';
@import '../css/css-variables.css';
@import '../css/appearances/publii.css';
@import '../css/global.css';
@import '../css/forms.css';
@import '../css/options-sidebar.css';
@import '../css/scope-fix.css';
@import '../css/codemirror.css';

/*
 * Main container for the app
 */
.app {
    background: var(--bg-primary)
}
.app-view {
    background: var(--bg-primary);
    font-size: var(--font-size-ui-md);
    height: 100%;
    left: 0;
    position: absolute;
    top: 0;
    width: 100%;
}
.app-site-sidebar {
    bottom: 0;
    font-size: var(--font-size-ui-md);
    left: 0;
    position: absolute;
    top: var(--topbar-height);
    width: 35rem;
    z-index: 1;
}

#app {
    & > .topbar + section {
        background: var(--bg-site);
        height: calc(100vh - var(--topbar-height));
        margin-top: var(--topbar-height);
        width: 100%;

        & > * {
            height: calc(100vh - var(--topbar-height));
            overflow: auto;
            position: absolute;
            width: 100%;
        }
    }

    a {
        -webkit-user-select: none;
        -webkit-user-drag: none;
        -webkit-app-region: no-drag;
    }
}

#app > .app-settings ~ .overlay.is-minimized {
    display: none;
}

body[data-os="win"] {    
    .app {
    }
}

body[data-os="win"] .app-view {
    border: 1px solid var(--icon-secondary-color);
    overflow: hidden;
}

body[data-os="linux"] {
    #app {
        & > .topbar + section {
            height: 100vh;
            margin-top: 0;
            top: 0;

            & > * {
                height: 100vh;
            }
        }
    }

    .app {
    }
}

body[data-os="linux"] .app-view {
    border: 1px solid var(--icon-secondary-color);
    overflow: hidden;
}

body[data-os="linux"] .app-site-sidebar {
    top: 0;
}
    
/*
 * Responsive improvements
 */

@media (max-width: 1400px) {
    .app {
    }

    .app-site-sidebar {        
        width: var(--app-sidebar-width);
    }
}
</style>
