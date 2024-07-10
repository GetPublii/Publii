<template>
    <div
        id="app"
        :class="{ 'app-view': true, 'use-wide-scrollbars': useWideScrollbars }"
        :style="$root.overridedCssVariables">
        <message />
        <topbar-notification v-if="!splashScreenDisplayed && !itemEditorDisplayed && $route.path !== '/site/!/posts'" />
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
import TopBarNotification from './TopBarNotification';
import Message from './Message';
import RenderingPopup from './RenderingPopup';
import RegenerateThumbnailsPopup from './RegenerateThumbnailsPopup';
import SitesPopup from './SitesPopup';
import SyncPopup from './SyncPopup';
import ErrorPopup from './ErrorPopup';

export default {
    name: 'app',
    props: [
        'initialData'
    ],
    components: {
        'message': Message,
        'topbar': TopBar,
        'topbar-appbar': TopBarAppBar,
        'topbar-notification': TopBarNotification,
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
    async mounted () {
        // Setup app
        this.disableDragNDrop();
        await this.setEnvironmentInfo();
        this.setState();
        this.integrateTopBar();

        // Display initial screen after 2sec
        if(this.$store.state.app.config.licenseAccepted) {
            setTimeout(() => this.showInitialScreen(), 2000);
        }

        this.$bus.$on('license-accepted', this.showInitialScreen);
    },
    beforeDestroy () {
        this.$bus.$off('license-accepted');
        mainProcessAPI.stopReceiveAll('app-license-accepted');
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
        }
    },
    beforeDestroy () {
        this.$bus.$off('license-accepted');
    }
}
</script>

<style lang="scss">
@import '../scss/vendor/normalize.css';
@import '../scss/vendor/vue-multiselect.scss';
@import '../scss/variables.scss';
@import '../scss/css-variables.scss';
@import '../scss/mixins.scss';
@import '../scss/global.scss';
@import '../scss/forms.scss';
@import '../scss/scope-fix.scss';
@import '../scss/codemirror.scss';

/*
 * Main container for the app
 */
.app {
    background: var(--bg-primary);

    &-view {
        background: var(--bg-primary);
        font-size: $app-font-base;
        height: 100%;
        left: 0;
        position: absolute;
        top: 0;
        width: 100%;
    }

    &-site-sidebar {
        bottom: 0;
        font-size: $app-font-base;
        left: 0;
        position: absolute;
        top: var(--topbar-height);
        width: 35rem;
        z-index: 1;
    }
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
        &-view {
            border: 1px solid var(--icon-secondary-color);
            overflow: hidden;
        }
    }
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
        &-view {
            border: 1px solid var(--icon-secondary-color);
            overflow: hidden;
        }

        &-site-sidebar {
            top: 0;
        }
    }
}
    
/*
 * Responsive improvements
 */

@media (max-width: 1400px) {
    .app {
        &-site-sidebar {        
            width: $app-sidebar;
        }
    }
}
</style>
