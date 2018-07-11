<template>
    <div :class="cssClasses">
        <add-website v-if="isEmpty" />

        <sidebar v-if="!isEmpty" />

        <transition>
            <router-view v-if="!isEmpty" />
        </transition>
    </div>
</template>

<script>
import { ipcRenderer, remote } from 'electron';
import SiteAddForm from './SiteAddForm';
import Sidebar from './Sidebar';
const mainProcess = remote.require('./main.js');

export default {
    name: 'site',
    components: {
        'add-website': SiteAddForm,
        'sidebar': Sidebar
    },
    data: function() {
        return {
            currentSite: '',
            siteIsLoaded: false
        };
    },
    computed: {
        siteName: function() {
            return this.$route.params.name;
        },
        isEmpty: function() {
            if(this.currentSite !== this.siteName && this.siteName !== '!' && !this.$store.state.editorOpened) {
                this.switchSite(this.siteName);
            }

            if (this.$store.state.editorOpened) {
                this.$store.commit('setEditorOpenState', false);

                setTimeout(() => {
                    this.$bus.$emit('site-view-restored');
                }, 0);
            }

            return this.siteName === '!';
        },
        cssClasses: function() {
            return {
                'site': true,
                'is-empty': this.isEmpty
            };
        }
    },
    mounted () {
        this.$bus.$on('add-website-form-displayed', () => {
            this.currentSite = '';
        });

        this.$bus.$on('site-loaded', this.whenSiteLoaded);
    },
    methods: {
        switchSite: function(siteName) {
            let self = this;
            this.currentSite = siteName;
            this.siteIsLoaded = false;

            ipcRenderer.send('app-site-switch', {
                'site': siteName
            });

            ipcRenderer.once('app-site-switched', (event, data) => {
                if (data.status !== false) {
                    this.loadSite(siteName, data);
                    this.siteIsLoaded = true;
                    this.$bus.$emit('site-loaded', true);
                } else {
                    this.$bus.$emit('message-display', {
                        message: 'An error occured during loading the selected website. Please check the website files and try again.',
                        type: 'warning'
                    });
                }
            });
        },

        /**
         *
         * Function used to:
         * - switch a website to another one
         * - reload a website data (i.e. after backup restore) - with config
         *
         * @param siteName - name of the website to reload
         * @param data - (optional) loaded data of the website
         * @param config - (optional) config of the website to use during switching
         *
         */
        loadSite: function(siteName, data = false, config = false) {
            // Write a config of the current Site - if necessary
            if(siteName !== false && config === false) {
                this.$store.commit('copySiteConfig', siteName);
            }

            // Write a config of the current Site - if necessary
            if(siteName !== false && config !== false) {
                this.$store.commit('setSiteConfig', {
                    name: siteName,
                    config: config
                });
            }

            this.$store.commit('switchSite', data);
        },
        whenSiteLoaded () {
            this.currentSite = this.$store.state.currentSite.config.name;
        }
    },
    beforeDestroy () {
        this.$bus.$off('add-website-form-displayed');
        this.$bus.$off('site-loaded', this.whenSiteLoaded);
    }
}
</script>

<style lang="scss" scoped>
@import '../scss/variables.scss';

.site {
    padding: 2rem;

    &.is-empty {
        background: $color-9;
        height: 100%;
        position: absolute;
        width: 100%;
    }

    .sidebar,
    .content {
        position: absolute;
        top: 0;
    }

    .sidebar {
        bottom: 0;
        left: 0;
        width: 35rem;
    }

    .content {
        background: $color-10;
        bottom: 0;
        overflow: scroll;
        padding: 4.4rem 6rem;
        right: 0;
        width: calc(100% - 35rem);

        &.is-wide {
            width: 100%;
        }
    }

    .v-enter-to,
    .v-leave-to {
        opacity: 1;
        transition: opacity .25s ease-out;
    }

    .v-enter,
    .v-leave-to {
        opacity: 0;
        position: absolute;
    }
}

/*
 * Responsive improvements
 */
@media (max-height: 900px) {
    .site {
        .content {
            padding: 4rem;
        }
    }
}

@media (max-width: 1400px) {
    .site {
        .content {
            padding: 4rem;
        }
    }
}
</style>
