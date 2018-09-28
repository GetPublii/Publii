<template>
    <div
        id="app"
        :class="{ 'app-view': true, 'use-wide-scrollbars': useWideScrollbars }">
        <message />
        <topbar v-if="!splashScreenDisplayed && !postEditorDisplayed" />

        <section>
            <router-view />
        </section>

        <confirm />
        <alert />
        <rendering-popup />
        <regenerate-thumbnails-popup />
        <error-popup />
        <sync-popup />
    </div>
</template>

<script>
import { remote } from 'electron';
import { mapGetters } from 'vuex';
import TopBar from './TopBar';
import TopBarAppBar from './TopBarAppBar';
import Message from './Message';
import RenderingPopup from './RenderingPopup';
import RegenerateThumbnailsPopup from './RegenerateThumbnailsPopup';
import SyncPopup from './SyncPopup';
import ErrorPopup from './ErrorPopup';
const mainProcess = remote.require('./main');
const Menu = remote.Menu;

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
        postEditorDisplayed () {
            if(this.$route.path.indexOf('/posts/editor/') > -1) {
                return true;
            }

            return false;
        },
        useWideScrollbars () {
            return this.$store.state.app.config.wideScrollbars;
        }
    },
    mounted: function() {
        // Setup app
        this.disableDragNDrop();
        this.setEnvironmentInfo();
        this.setState();
        this.setupMenu();
        this.integrateTopBar();

        // Display initial screen after 2sec
        if(this.$store.state.app.config.licenseAccepted) {
            setTimeout(() => this.showInitialScreen(), 2000);
        }

        this.$bus.$on('license-accepted', this.showInitialScreen);
    },
    beforeDestroy: function() {
        this.$bus.$off('license-accepted');
        ipcRenderer.removeAllListeners('app-license-accepted');
    },
    methods: {
        // Block drag'n'drop redirects
        disableDragNDrop: function() {
            document.addEventListener('dragover', event => event.preventDefault());
            document.addEventListener('drop', event => event.preventDefault());
        },

        // Add to <body> additional informations
        setEnvironmentInfo: function() {
            document.body.setAttribute('data-node-version', process.versions.node);
            document.body.setAttribute('data-chrome-version', process.versions.chrome);
            document.body.setAttribute('data-electron-version', process.versions.electron);
            document.body.setAttribute('data-os', process.platform === 'darwin' ? 'osx' : process.platform === 'linux' ? 'linux' : 'win');
            document.body.setAttribute('data-env', process.env.NODE_ENV);
        },

        // Set initial application state tree
        setState: function() {
            this.$store.commit('init', this.initialData);
        },

        // Disable refresh shortcuts and Dev Tools shortcuts
        setupMenu: function() {
            if (process.env.NODE_ENV === 'development') {
                return;
            }

            if (process.platform === 'linux') {
                Menu.setApplicationMenu(null);
                return;
            }

            const template = [{
                label: "Publii",
                submenu: [{
                    label: "About Application",
                    selector: "orderFrontStandardAboutPanel:"
                }, {
                    type: "separator"
                }, {
                    label: "Quit",
                    accelerator: "Command+Q",
                    click: () => { mainProcess.quitApp() }
                }]
            }, {
                label: "Edit",
                submenu: [
                    {
                        label: "Undo",
                        accelerator: "CmdOrCtrl+Z",
                        selector: "undo:"
                    },
                    {
                        label: "Redo",
                        accelerator: "Shift+CmdOrCtrl+Z",
                        selector: "redo:"
                    },
                    {
                        type: "separator"
                    },
                    {
                        label: "Cut",
                        accelerator: "CmdOrCtrl+X",
                        selector: "cut:"
                    },
                    {
                        label: "Copy",
                        accelerator: "CmdOrCtrl+C",
                        selector: "copy:"
                    },
                    {
                        label: "Paste",
                        accelerator: "CmdOrCtrl+V",
                        selector: "paste:"
                    },
                    {
                        label: "Select All",
                        accelerator: "CmdOrCtrl+A",
                        selector: "selectAll:"
                    }
                ]
            }];

            const menu = Menu.buildFromTemplate(template);
            Menu.setApplicationMenu(menu);
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

            this.$router.push({ path: `/site/${siteToDisplay}` });
        },

        // Check for helper click events for TopBar
        integrateTopBar: function() {
            let self = this;

            document.body.addEventListener('click', function(e) {
                self.$bus.$emit('topbar-close-submenu-sites');
                self.$bus.$emit('topbar-close-submenu-dropdown');
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
@import '../scss/mixins.scss';
@import '../scss/global.scss';
@import '../scss/forms.scss';
@import '../scss/scope-fix.scss';
@import '../scss/codemirror.scss';

/*
 * Main container for the app
 */
.app {
    background: $color-10;

    &-view {
        background: $color-10;
        font-size: 1.6rem;
        height: 100%;
        left: 0;
        position: absolute;
        top: 0;
        width: 100%;
    }

    &-site-sidebar {
        bottom: 0;
        font-size: 1.6rem;
        left: 0;
        position: absolute;
        top: 8.4rem;
        width: 35rem;
        z-index: 1;
    }
}

#app {
    & > .topbar + section {
        height: calc(100vh - 8.4rem);
        overflow: auto;
        position: absolute;
        top: 8.4rem;
        width: 100%;
    }
}

body[data-os="win"] {
    #app {
        & > .topbar + section {
            height: calc(100vh - 9.8rem);
            top: 9.8rem;
        }
    }

    .app {
        &-view {
            border: 1px solid $grey-icon-color;
            overflow: hidden;
        }

        &-site-sidebar {
            top: 9.8rem;
        }
    }
}

body[data-os="linux"] {
    #app {
        & > .topbar + section {
            height: calc(100vh - 6.2rem);
            top: 6.2rem;
        }
    }

    .app {
        &-view {
            border: 1px solid $grey-icon-color;
            overflow: hidden;
        }

        &-site-sidebar {
            top: 6.2rem;
        }
    }
}
</style>
