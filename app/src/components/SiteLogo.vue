<template>
    <div
        ref="content"
        class="site-logo">
        <span
            v-if="logoColor"
            class="site-logo-bg">
            <icon 
                :data-color="logoColor"
                :name="logoIcon"               
                size="s" />
        </span>

        <span class="site-logo-name">
            <strong
                class="site-logo-link">
                {{ siteName }}
            </strong>
        </span>
        
        <span
            class="site-logo-icon-open"
            name="sidebar-arrow">                        
        </span>
        
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
@import '../scss/mixins.scss';

.site-logo {
    align-items: center;   
    display: flex;    
    width: 30rem;

    &:active,
    &:focus,
    &:hover {

        .site-logo-link {
            color: var(--text-primary-color);
            
        }
        .site-logo-icon-open {
            border-top-color: var(--icon-tertiary-color);
            
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
        
         svg {
            @include logoSVGColors();
        }        
    }

    &-name {
        margin: 0 0 0 .8rem;
        width: calc(100% - 7.6rem);
    }

    &-link {
        color: var(--text-primary-color);
        display: block;
        font-size: 1.5rem;
        font-weight: 500;
        margin: 0;
        overflow: hidden;
        padding: 1rem 0;
        position: relative;
        text-overflow: ellipsis;
        transition: all .3s ease-out;
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
        border-color: var(--icon-secondary-color) transparent transparent;
        border-style: solid;
        border-width: 5px;
        opacity: 1;                     
        cursor: pointer;                   
        height: 5px;
        left: auto;
        line-height: 1.1; 
        padding: 0;
        position: absolute;
        right: calc(1rem + 5px);
        width: 5px;
        text-align: center;       
        transition: all .3s ease-out;         
        top: calc(50% - 2px);
    }
}
</style>
