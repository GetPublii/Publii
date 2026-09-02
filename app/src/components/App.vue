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
    created () {
        let notificationsReadStatus = localStorage.getItem('publii-notifications-readed') || '';
        notificationsReadStatus = notificationsReadStatus.replace(/[^a-z0-9\-_;\.]/gmi, '');
        this.$store.commit('setNotificationsReadStatus', notificationsReadStatus);
    },
    async mounted () {
        // Setup app
        this.disableDragNDrop();
        await this.setEnvironmentInfo();
        this.setState();
        this.integrateTopBar();
        this.setupApplicationMenu();

        if (this.initialData.isNewWindow) {
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
            // Primary window: normal 2-second splash screen
            setTimeout(() => this.showInitialScreen(), 2000);
        }

        this.$bus.$on('license-accepted', this.showInitialScreen);
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
                () => [
                    this.$route.path,
                    this.$store.state.app.editorOpened,
                    this.$store.state.app.config.enableAdvancedPreview,
                    this.$store.state.components.sidebar.syncInProgress,
                    this.$store.state.currentSite.config.name,
                    this.$store.state.currentSite.themeSettings &&
                        this.$store.state.currentSite.themeSettings.supportedFeatures &&
                        this.$store.state.currentSite.themeSettings.supportedFeatures.pages
                ],
                this.syncApplicationMenuState,
                { immediate: true }
            );
        },
        syncApplicationMenuState () {
            let siteName = this.$store.state.currentSite.config.name || '';
            let supportedFeatures = this.$store.state.currentSite.themeSettings && this.$store.state.currentSite.themeSettings.supportedFeatures;

            mainProcessAPI.send('app-menu-state', {
                advancedPreview: this.$store.state.app.config.enableAdvancedPreview === true,
                editorOpen: this.itemEditorDisplayed || this.$store.state.app.editorOpened === true,
                hasSite: siteName !== '' && siteName !== '!',
                pagesSupported: !supportedFeatures || supportedFeatures.pages !== false,
                ready: !this.splashScreenDisplayed,
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
        mainProcessAPI.stopReceiveAll('app-license-accepted');
        mainProcessAPI.stopReceiveAll('app-menu-command');

        if (this.applicationMenuStateUnwatch) {
            this.applicationMenuStateUnwatch();
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
