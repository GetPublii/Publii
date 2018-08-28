<template>
    <div class="sidebar-sync">
        <a
            href="#"
            class="sidebar-preview-link"
            @click="renderPreview"
        >
            Preview your changes
        </a>

        <a
            href="#"
            :class="cssClasses"
            @click.prevent.stop="syncWebsite"
        >
            <span v-html="icon"></span>
            {{ status }}
        </a>

        <sub
            v-if="hasSyncDate"
            class="sidebar-sync-date">
            <template v-if="!hasManualDeploy">Last sync: <span>{{ syncDate }}</span></template>
            <template v-if="hasManualDeploy">Last rendered: <span>{{ syncDate }}</span></template>
        </sub>
    </div>
</template>

<script>
import fs from 'fs';
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
                    return 'Provide access data';
                }

                switch(status) {
                    case 'preparing':
                        this.redirectTo = 'sync';
                        this.icon = SidebarIcons.PREPARING;
                        return 'Preparing';
                    case 'prepared':
                        this.redirectTo = 'sync';
                        this.icon = SidebarIcons.PREPARED;
                        return 'Prepared to upload';
                    case 'not-prepared':
                        this.redirectTo = 'sync';
                        this.icon = SidebarIcons.NOT_PREPARED;
                        return 'Preparation error';
                    case 'syncing':
                        this.redirectTo = 'sync';
                        this.icon = SidebarIcons.SYNCING;
                        return 'Sync in progress';
                    case 'synced':
                    case 'not-synced':
                        this.redirectTo = 'sync';
                        this.icon = SidebarIcons.NOT_SYNCED;
                        return 'Sync your website';
                }
            } else if(!this.checkDeploymentConfig()) {
                this.redirectTo = 'site-settings';
                this.icon = SidebarIcons.PROVIDE_ACCESS;
                return 'Provide access data';
            } else {
                this.redirectTo = 'sync';
                this.icon = SidebarIcons.SYNC;
                return 'Sync your website';
            }

            this.redirectTo = 'sync';
            return 'Site is in sync';
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
                return this.$moment(syncDate).format('MMM DD, YYYY HH:mm:ss');
            } else {
                return this.$moment(syncDate).format('MMM DD, YYYY hh:mm:ss a');
            }
        },
        hasManualDeploy () {
            return this.$store.state.currentSite.config.deployment.protocol === 'manual';
        }
    },
    methods: {
        renderPreview: function() {
            if (!this.$store.state.currentSite.config.theme) {
                let siteName = this.$store.state.currentSite.config.name;

                this.$bus.$emit('confirm-display', {
                    message: 'You haven\'t selected any theme. Please go to the Settings and select the theme first.',
                    okLabel: 'Go to settings',
                    okClick: () => {
                        this.$router.push(`/site/${siteName}/settings/`);
                    }
                });
                return;
            }

            if (this.$store.state.app.config.previewLocation !== '' && !fs.existsSync(this.$store.state.app.config.previewLocation)) {
                this.$bus.$emit('confirm-display', {
                    message: 'The preview catalog does not exist. Please go to the Application Settings and select the correct preview directory first.',
                    okLabel: 'Go to application settings',
                    okClick: () => {
                        this.$router.push(`/app-settings/`);
                    }
                });
                return;
            }

            this.$bus.$emit('rendering-popup-display');
        },
        syncWebsite: function() {
            if(this.redirectTo === 'sync') {
                if (!this.$store.state.currentSite.config.theme) {
                    let siteName = this.$store.state.currentSite.config.name;

                    this.$bus.$emit('confirm-display', {
                        message: 'You haven\'t selected any theme. Please go to the Settings and select the theme first.',
                        okLabel: 'Go to settings',
                        okClick: () => {
                            this.$router.push(`/site/${siteName}/settings/`);
                        }
                    })
                    return;
                }

                this.$bus.$emit('sync-popup-display');
            } else if(this.redirectTo === 'site-settings') {
                let siteName = this.$store.state.currentSite.config.name;

                this.$router.push({
                    path: '/site/' + siteName + '/settings/server'
                });
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
        bottom: 5rem;
        left: 5rem;
        position: absolute;
        right: 5rem;

        &-icon {
            fill: $color-10;
            float: left;
            margin-top: .2rem;
            transform-origin: 59% 51%;
            width: 2rem;
        }

        & > sub {
            color: rgba(255, 255, 255, .75);
            display: block;
            font-size: 1.3rem;
            letter-spacing: .5px;
            margin: 0 -2.5rem;
            padding: 1.5rem 0 1rem 0;
            text-align: center;
            width: calc(100% + 5rem);
        }

        &-link {
            background: rgba($color-10, .18);
            border-radius: 3px;
            color: $color-10;
            display: block;
            font-size: 1.6rem;
            font-weight: 500;
            padding: 1.4rem 2.4rem 1.4rem 5rem;
            text-align: center;

            .sidebar-sync-icon {
                height: 2.2rem;
                margin-left: -2.5rem;
                width: 3rem;

                path {
                    fill: $color-10;
                    transition: all .25s ease-out;
                }

                polygon {
                    fill: $color-1;
                    transition: all .25s ease-out;
                }
            }

            &:active .sidebar-sync-icon,
            &:focus .sidebar-sync-icon,
            &:hover .sidebar-sync-icon {
                path {
                    fill: $color-1;
                }

                polygon {
                    fill: $color-10;
                    animation: pulse 1s infinite;
                }
            }

            .sidebar-sync-icon {
                &.is-animated {
                    polygon {
                        animation: pulse 1s infinite;
                    }
                }

                &.is-rotating {
                    animation: spin 2s linear infinite;
                    height: 1.6rem;
                    width: 1.9rem;
                }
            }

            &:active,
            &:focus,
            &:hover {
                background: $color-10;
                color: $color-4;

                .sidebar-sync-icon {
                    fill: $color-10;
                }
            }
        }

        &-synced {}
        &-not-synced {}
        &-preparing,
        &-prepared,
        &-syncing {}
        &-not-prepared,
        &-noftp {}
    }

    &-preview-link {
        border: 2px solid rgba(255, 255, 255, 0.38);
        border-radius: 3px;
        color: $color-10!important;
        display: block;
        margin-bottom: 1rem;
        padding: 1.2rem 2.4rem;
        text-align: center;

        & > span {
            display: inline-block;
            width: 3.2rem;
        }

        &:hover {
            border-color: $color-10;
            color: $color-10!important;
        }

        &.is-disabled {
            opacity: .75;
            pointer-events: none;
        }
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

/*
 * Responsive improvements
 */
@media (max-height: 736px), (min-height: 737px) and (max-height: 900px), (max-width: 1400px) {
    .sidebar {
        &-sync {
            bottom: 3rem;
            left: 4rem;
            right: 4rem;
        }
    }
}
</style>
