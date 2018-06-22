<template>
    <div
        ref="content"
        class="site-logo">
        <span
            v-if="logoColor"
            class="site-logo-bg"
            :data-color="logoColor">
            <icon
                :name="logoIcon"
                primaryColor="color-10"
                size="xs" />
        </span>

        <span class="site-logo-name">
            <strong
                class="site-logo-link">
                {{ siteName }}
            </strong>
        </span>

        <icon
            class="site-logo-icon-open"
            size="s"
            name="sidebar-arrow" />
    </div>
</template>

<script>
import ExternalLinks from './mixins/ExternalLinks.js';

export default {
    name: 'site-logo',
    mixins: [
        ExternalLinks
    ],
    data: function() {
        return {
            siteIsLoaded: false
        };
    },
    computed: {
        logoColor: function() {
            if(!this.siteIsLoaded) {
                return '';
            }

            return this.$store.state.currentSite.config.logo.color;
        },
        logoIcon: function() {
            if(!this.siteIsLoaded) {
                return '';
            }

            return this.$store.state.currentSite.config.logo.icon;
        },
        siteName: function() {
            if(!this.siteIsLoaded) {
                return 'Select a website';
            }

            return this.$store.state.currentSite.config.displayName;
        },
        isOnline: function() {
            if(!this.siteIsLoaded) {
                return false;
            }

            if(!this.$store.state.currentSite.config.domain || this.$store.state.currentSite.config.deployment.protocol === 'manual') {
                return false;
            }

            return !!this.$store.state.currentSite.config.syncDate;
        },
        linkTitle: function() {
            if(this.isOnline) {
                return 'Visit your website';
            } else {
                return 'After the initial sync, your website will be available online';
            }
        },
        siteLink: function() {
            if(!this.siteIsLoaded) {
                return '';
            }

            return this.$store.state.currentSite.config.domain;
        },
        settingsLink: function() {
            return '/site/' + this.$route.params.name + '/settings/';
        },
        previewIconName: function() {
            if(this.isOnline) {
                return 'on-live-preview';
            }

            return 'off-live-preview';
        }
    },
    mounted: function() {
        this.$bus.$on('site-loaded', this.whenSiteLoaded);

        this.$bus.$on('site-view-restored', () => {
            this.siteIsLoaded = true;
        });

        this.$bus.$on('sites-list-reset', () => {
            this.siteIsLoaded = false;
        })
    },
    methods: {
        whenSiteLoaded () {
            this.siteIsLoaded = true;
        }
    },
    beforeDestroy () {
        this.$bus.$off('site-loaded', this.whenSiteLoaded);
        this.$bus.$off('site-view-restored');
        this.$bus.$off('sites-list-reset');
    }
}
</script>

<style lang="scss" scoped>
@import '../scss/variables.scss';

.site-logo {
    align-items: center;
    background: $color-9;
    border-radius: 3px;
    display: flex;
    padding-left: 0.8rem;
    width: 32rem;

    &:active,
    &:focus,
    &:hover {

        .site-logo-link {
            color: $color-6;
            transition: all .25s ease-out;
        }
        .site-logo-icon-open {
            fill: $color-5;
            transition: all .25s ease-out;
        }
    }

    & > a {
        display: block;
        height: 4rem;
        margin: .5rem 1rem 0 0.92rem;
        position: relative;
        width: 4rem;
        z-index: 1;
    }

    &-bg {
        align-items: center;
        border-radius: 3px;
        display: flex;
        height: 3rem;
        justify-content: center;
        width: 3rem;

        @for $i from 1 through 16 {
            &[data-color="#{$i}"] {
                background: #{map-get($logo-colors, #{'bg' + $i})};
                color: #{map-get($logo-colors, #{'color' + $i})};
            }
        }
    }

    &-name {
        margin: 0 0 0 1.6rem;
        width: calc(100% - 7.2rem);
    }

    &-link {
        color: $color-5;
        display: block;
        font-weight: 600;
        margin: 0;
        overflow: hidden;
        padding: 1rem 0;
        position: relative;
        text-overflow: ellipsis;
        white-space: nowrap;

        & > span {
            display: inline-block;
            overflow: hidden;
            pointer-events: none;
            text-overflow: ellipsis;
            white-space: nowrap;
            width: 160px;
        }
    }

    &-icon-open {
        fill: $color-7;
        position: absolute;
        right: 1.4rem;
        top: 50%;
        transform: translateY(-50%);
    }
}
</style>
