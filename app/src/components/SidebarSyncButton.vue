<template>
    <div
        :class="{
            'sidebar-sync': true,
            'sidebar-sync-in-progress': syncInProgress
        }">

        <a
            href="#"
            class="sidebar-preview-link"
            @click="renderPreview">
            {{ $t('sync.previewChanges') }}
        </a>

        <a
            v-if="$store.state.app.config.enableAdvancedPreview"
            href="#"
            class="sidebar-preview-link"
            @click="renderFiles">
            {{ $t('sync.generatePreviewFiles') }}
        </a>

        <a
            href="#"
            :class="cssClasses"
            @click.prevent.stop="syncWebsite"
        >
            <span v-pure-html="icon" class="sidebar-sync-link-icon"></span>
            <span>{{ status }}</span>
        </a>
        <a
            v-if="hasSyncDate && websiteUrl"
            :href="websiteUrl"
            target="_blank"
            class="sidebar-sync-date">

                <template v-if="!hasManualDeploy">
                    {{ $t('sync.lastSync') }}: <span>{{ syncDate }}</span>
                    <icon
                        size="xs"
                        name="external-link"/>
                </template>
                <template v-if="hasManualDeploy">
                    {{ $t('sync.lastRendered') }}: <span>{{ syncDate }}</span>
                    <icon
                        size="xs"
                        name="external-link"/>
                </template>

        </a>
    </div>
</template>

<script>
import SidebarIcons from './configs/sidebar-icons.js';

export default {
    name: 'sidebar-sync-button',
    data: function() {
        return {
            icon: SidebarIcons.DEFAULT,
            redirectTo: 'sync'
        };
    },
    computed: {
        cssClasses: function() {
            return {
                'sidebar-sync-link': true
            };
        },
        status: function() {
            let status = this.$store.state.components.sidebar.status;

            if(status !== false) {
                if(!this.checkDeploymentConfig()) {
                    this.redirectTo = 'site-settings';
                    this.icon = SidebarIcons.NO_CONFIG;
                    return this.$t('sync.provideAccessData');
                }

                switch(status) {
                    case 'preparing':
                        this.redirectTo = 'sync';
                        this.icon = SidebarIcons.PREPARING;
                        return this.$t('sync.preparingFiles');
                    case 'prepared':
                        this.redirectTo = 'sync';
                        this.icon = SidebarIcons.PREPARED;
                        return this.$t('sync.preparedToUpload');
                    case 'not-prepared':
                        this.redirectTo = 'sync';
                        this.icon = SidebarIcons.NOT_PREPARED;
                        return this.$t('sync.preparationError');
                    case 'syncing':
                        this.redirectTo = 'sync';
                        this.icon = SidebarIcons.SYNCING;
                        return this.$t('sync.syncInProgress');
                    case 'synced':
                    case 'not-synced':
                        this.redirectTo = 'sync';
                        this.icon = SidebarIcons.NOT_SYNCED;
                        return this.$t('sync.syncYourWebsite');
                }
            } else if(!this.checkDeploymentConfig()) {
                this.redirectTo = 'site-settings';
                this.icon = SidebarIcons.PROVIDE_ACCESS;
                return this.$t('sync.configureServer');
            } else {
                this.redirectTo = 'sync';
                this.icon = SidebarIcons.SYNC;
                return this.$t('sync.syncYourWebsite');
            }

            this.redirectTo = 'sync';
            return this.$t('sync.siteIsInSync');
        },
        hasSyncDate: function() {
            if(!this.$store.state.currentSite.config) {
                return false;
            }

            return !!(this.$store.state.currentSite.config.syncDate);
        },
        syncDate: function() {
            let syncDate = this.$store.state.currentSite.config.syncDate;

            if(this.$store.state.app.config.timeFormat && this.$store.state.app.config.timeFormat == 24) {
                return this.$moment(syncDate).format('MMM DD, YYYY HH:mm');
            } else {
                return this.$moment(syncDate).format('MMM DD, YYYY hh:mm A');
            }
        },
        hasManualDeploy () {
            return this.$store.state.currentSite.config.deployment.protocol === 'manual';
        },
        websiteUrl () {
            return this.$store.state.currentSite.config.domain;
        },
        syncInProgress () {
            return this.$store.state.components.sidebar.syncInProgress;
        }
    },
    methods: {
        renderPreview: async function() {
            if (!this.$store.state.currentSite.config.theme) {
                let siteName = this.$store.state.currentSite.config.name;

                this.$bus.$emit('confirm-display', {
                    message: this.$t('sync.youHaventSelectedAnyThemeInfo'),
                    okLabel: this.$t('sync.goToSettings'),
                    okClick: () => {
                        this.$router.push(`/site/${siteName}/settings/`);
                    }
                });
                return;
            }

            let previewLocationExists = await mainProcessAPI.existsSync(this.$store.state.app.config.previewLocation);

            if (this.$store.state.app.config.previewLocation !== '' && !previewLocationExists) {
                this.$bus.$emit('confirm-display', {
                    message: this.$t('sync.previewCatalogDoesNotExistInfo'),
                    okLabel: this.$t('sync.goToAppSettings'),
                    okClick: () => {
                        this.$router.push(`/app-settings/`);
                    }
                });
                return;
            }

            this.$bus.$emit('rendering-popup-display');
        },
        renderFiles: async function() {
            if (!this.$store.state.currentSite.config.theme) {
                let siteName = this.$store.state.currentSite.config.name;

                this.$bus.$emit('confirm-display', {
                    message: this.$t('sync.youHaventSelectedAnyThemeInfo'),
                    okLabel: this.$t('sync.goToSettings'),
                    okClick: () => {
                        this.$router.push(`/site/${siteName}/settings/`);
                    }
                });
                return;
            }

            let previewLocationExists = await mainProcessAPI.existsSync(this.$store.state.app.config.previewLocation);

            if (this.$store.state.app.config.previewLocation !== '' && !previewLocationExists) {
                this.$bus.$emit('confirm-display', {
                    message: this.$t('sync.previewCatalogDoesNotExistInfo'),
                    okLabel: this.$t('sync.goToAppSettings'),
                    okClick: () => {
                        this.$router.push(`/app-settings/`);
                    }
                });
                return;
            }

            this.$bus.$emit('rendering-popup-display', {
                showPreview: false
            });
        },
        syncWebsite: function(e) {
            if (e.screenX === 0 && e.screenY === 0) {
                return;
            }

            if (this.redirectTo === 'sync') {
                if (!this.$store.state.currentSite.config.theme) {
                    let siteName = this.$store.state.currentSite.config.name;

                    this.$bus.$emit('confirm-display', {
                        message: this.$t('sync.youHaventSelectedAnyThemeInfo'),
                        okLabel: this.$t('sync.goToSettings'),
                        okClick: () => {
                            this.$router.push(`/site/${siteName}/settings/`);
                        }
                    })
                    return;
                }

                this.$bus.$emit('sync-popup-display');
            } else if (this.redirectTo === 'site-settings') {
                let siteName = this.$store.state.currentSite.config.name;

                this.$router.push('/site/' + siteName + '/settings/server');
            }
        },
        checkDeploymentConfig() {
            let config = this.$store.state.currentSite.config;

            if(!config || !config.deployment) {
                return false;
            }

            if(config.deployment.protocol === '' || config.deployment.domain === '') {
                return false;
            }

            return true;
        }
    }
}
</script>

<style lang="scss">
@import '../scss/variables.scss';

.sidebar {
    &-sync {
        bottom: 3rem;
        left: $app-sidebar-margin;
        position: absolute;
        right: $app-sidebar-margin;

        &-icon {
            stroke: var(--white);
        }

        &-date {
            color: var(--sidebar-link-color);
            display: block;
            font-size: 1.2rem;
            height: 16px; // svg icon height
            letter-spacing: -.025em;
            margin-top: 1.2rem;
            opacity: var(--sidebar-link-opacity);
            text-align: center;
            white-space: nowrap;

            &:hover {
                color: var(--sidebar-link-color-hover);
                opacity: 1;
            }

            &:focus {
                color: var(--sidebar-link-color);
            }

            & > svg {
                left: 3px;
                position: relative;
                top: 2px;
            }
        }

        &-link {
            align-items: center;
            background: var(--sidebar-sync-btn-bg);
            border-radius: var(--border-radius);
            color: var(--sidebar-sync-btn-color);
            display: flex;
            gap: .6rem;
            font-size: $app-font-base;
            font-weight: var(--font-weight-semibold);
            justify-content: center;
            padding: 1.4rem 1rem;
            position: relative;

            // sync cloud icon
            .sidebar-sync-icon {
                height: 2.2rem;
                display: inherit;
                width: 3rem;

                path {
                    stroke: var(--white);
                    transition: var(--transition);
                }

                polygon {
                    stroke: var(--color-primary);
                    transition: var(--transition);
                }
            }

            &:active .sidebar-sync-icon,
            &:focus .sidebar-sync-icon,
            &:hover .sidebar-sync-icon {
                path {
                    stroke: var(--white);
                }

                polygon {
                    stroke: $color-helper-6;
                }
            }

            // .sidebar-sync-icon {
            //     &.is-animated {
            //         polygon {
            //             animation: pulse 1s infinite;
            //         }
            //     }
            // }

            // interjection mark icon
            .sidebar-interjection-icon {
                display: block;
                height: 2.3rem;
                width: 2.4rem;

                path {
                    stroke: var(--white);
                }
            }

            &:active,
            &:focus,
            &:hover {
                background: $color-helper-6;
                color: var(--white);

                .sidebar-sync-icon {
                    stroke: $color-helper-6;
                }
            }

            &-icon {
                display: block;
                height: 100%;
                width: auto;
            }
        }

        &-synced {}
        &-not-synced {}
        &-preparing,
        &-prepared,
        &-syncing {}
        &-not-prepared,
        &-noftp {}

        &-preparing {
            display: block;
            height: 2.1rem;
            width: 2.1rem;

            & > span {
                animation: spin .9s infinite linear;
                border-top: 2px solid rgba(255,255,255, .2);
                border-right: 2px solid rgba(255,255,255, .2);
                border-bottom: 2px solid rgba(255,255,255, .2);
                border-left: 2px solid var(--white);
                border-radius: 50%;
                display: inline-block;
                height: 2.1rem;
                width: 2.1rem;

                &::after {
                    border-radius: 50%;
                    content: "";
                    display: block;
                }
            }
        }

        &-in-progress {
            .sidebar-sync-link, .sidebar-sync-date, .sidebar-preview-website {
               opacity: 0;
               transition: .35s cubic-bezier(.17,.67,.13,1.05) .35s all;
               visibility: hidden;
            }
        }
    }

    &-preview-link {
        border: 2px solid var(--sidebar-preview-btn-border-color);
        border-radius: var(--border-radius);
        color: var(--sidebar-preview-btn-color) !important;
        display: block;
        font-size: $app-font-base;
        font-weight: var(--font-weight-semibold);
        margin-bottom: 1rem;
        padding: 1.2rem 1rem;
        text-align: center;

        & > span {
            display: inline-block;
            width: 3.2rem;
        }

        &:hover {
            border-color: var(--sidebar-preview-btn-border-color-hover) !important;
            color: var(--sidebar-preview-btn-color-hover) !important;
        }

        &.is-disabled {
            opacity: .75;
            pointer-events: none;
        }
    }
}

.minimized-sync {
    &-in-progress {
        .progress-message {
            color: white;
            position: initial;
        }

        .progress-wrapper {
            min-height: 50px;
            padding: 0;
        }

        .progress {
            background-color: var(--sidebar-preview-btn-border-color);
            height: 4px;

            &-bar {
                height: 4px;
            }
        }
    }

    &-error {
         font-size: 1.3rem;
    }


}

@keyframes pulse {
    from {
        transform: translateY(50%);
        opacity: 1;
    }
    to {
        transform: translateY(-200%);
        opacity: 0.5;
    }
}

@keyframes spin {
    100% {
        transform: rotate(360deg);
    }
}
</style>
