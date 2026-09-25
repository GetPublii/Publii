<template>
    <div
        ref="content"
        class="site-logo">
        <span
            v-if="logoIcon"
            class="site-logo-bg">
            <icon
                :name="logoIcon"
                size="s"
                iconset="svg-map-site"/>
        </span>

        <span class="site-logo-name">
            <strong
                class="site-logo-link">
                {{ siteName }}
            </strong>
        </span>

        <icon
            class="site-logo-icon-open"
            name="chevrons-up-down"
            customWidth="18"
            customHeight="18"
            aria-hidden="true"
            focusable="false" />

    </div>
</template>

<script>
export default {
    name: 'site-logo',
    data: function() {
        return {
            siteIsLoaded: false
        };
    },
    computed: {
        logoIcon: function() {
            if(!this.siteIsLoaded) {
                return '';
            }

            return this.$store.state.currentSite.config.logo.icon;
        },
        siteName: function() {
            if(!this.siteIsLoaded) {
                return this.$t('ui.selectWebsite');
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
                return this.$t('sync.visitYourWebsite');
            } else {
                return this.$t('sync.afterInitialSyncSiteWillBeAvailableOnline');
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

<style scoped>

.site-logo {
    align-items: center;
    color: var(--sidebar-preview-btn-color);
    display: flex;
    padding: 2.5rem var(--space-12) 0 var(--space-16);
    margin-bottom: 2.5rem;
    width: 100%;
    transition: var(--transition-default);
    transition-property: color;

    &:active,
    &:focus,
    &:hover {

        .site-logo-icon-open {
            color: var(--sidebar-link-icon-hover);
            opacity: 1;
        }
    }

    & > a {
        display: block;
        height: 4rem;
        margin: var(--space-2) var(--space-4) 0 0.92rem;
        position: relative;
        width: 4rem;
        z-index: 1;
    }
}

.site-logo-bg {
    align-items: center;
    border-radius: 3px;
    color: var(--sidebar-icon);
    display: flex;
    flex-shrink: 0;
    height: 20px;
    justify-content: center;
    width: 20px;
}

.site-logo-name {
    flex: 1;
    margin: 0 0 0 var(--space-6);
    min-width: 0;
}

.site-logo-link {
    display: block;
    font-size: var(--font-size-ui-md);
    font-weight: var(--font-weight-medium);
    margin: 0;
    overflow: hidden;
    position: relative;
    text-overflow: ellipsis;
    transition: color .3s ease-out;
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

.site-logo-icon-open {
    color: var(--sidebar-link-icon);
    flex-shrink: 0;
    margin-left: var(--space-4);
    opacity: var(--sidebar-link-opacity);
    transition: var(--transition-default);
    transition-property: color, opacity;
}

@media (max-width: 1600px) {
    html[data-auto-adjust-sidebar-width="true"] .site-logo {
        padding: 2.5rem var(--space-12) 0;
    }
}
</style>
