<template>
    <div
        @click="toggleSubmenu"
        class="topbar-app-settings"
        :title="$t('ui.moreItems')">
        <span class="topbar-app-settings-icon">
            <template v-if="!this.submenuIsOpen">
                <span 
                    v-if="notificationsStatus === false"
                    class="topbar-app-settings-icon-no-decision"></span>
                <span 
                    v-if="notificationsStatus === 'accepted' && notificationsCount > 0"
                    class="topbar-app-settings-icon-updates-available"></span>
            </template>
        </span>

        <ul
            ref="submenu"
            :class="cssClasses">
            <topbar-dropdown-item
                :label="$t('settings.appSettings')"
                :title="$t('ui.appConfiguration')"
                path="/app-settings" />
            <topbar-dropdown-item
                :label="$t('theme.themes')"
                :title="$t('theme.goToThemesManager')"
                path="/app-themes" />
            <topbar-dropdown-item
                :label="$t('plugins.plugins')"
                :title="$t('plugins.goToPluginsManager')"
                path="/app-plugins" />
            <topbar-dropdown-item
                :label="$t('langs.languages')"
                :title="$t('langs.goToLanguagesManager')"
                path="/app-languages" />
            <topbar-dropdown-item
                :hasBadge="notificationsCount > 0 || notificationsStatus === 'rejected'"
                :badgeValue="notificationsStatus === 'rejected' ? '!' : notificationsCount"
                :label="$t('notifications.notifications')"
                :title="$t('notifications.goToNotificationsCenter')"
                path="/notifications-center" />
            <topbar-dropdown-item 
                class="topbar-app-submenu-separator"
                :label="$t('ui.help')"
                :title="$t('ui.checkDocumentation')"
                path="https://getpublii.com/docs/" />
            <topbar-dropdown-item
                :label="$t('ui.reportIssue')"
                :title="$t('ui.reportBugInSupportDesk')"
                path="https://github.com/GetPublii/Publii/discussions" />
            <topbar-dropdown-item
                :label="$t('ui.githubRepository')"
                :title="$t('ui.publiiOnGithub')"
                path="https://github.com/getpublii/publii" />
            <topbar-dropdown-item
                :label="$t('ui.donate')"
                :title="$t('ui.supportPublii')"
                path="https://getpublii.com/donate/" />
            <topbar-dropdown-item
                :label="$t('ui.aboutPublii')"
                :title="$t('ui.moreInformationOnPublii')"
                path="/about" />
        </ul>
    </div>
</template>

<script>
import { mapGetters } from 'vuex';
import TopBarDropDownItem from './TopBarDropDownItem';

export default {
    name: 'topbar-dropdown',
    components: {
        'topbar-dropdown-item': TopBarDropDownItem
    },
    data: function() {
        return {
            submenuIsOpen: false
        };
    },
    computed: {
        ...mapGetters([
            'notificationsStatus', 
            'notificationsCount'
        ]),
        cssClasses: function() {
            return {
                'is-hidden': !this.submenuIsOpen,
                'topbar-app-submenu': true
            };
        }
    },
    mounted: function(e) {
        this.$bus.$on('document-body-clicked', this.hideSubmenu);
    },
    methods: {
        hideSubmenu () {
            this.submenuIsOpen = false;
        },
        toggleSubmenu (e) {
            e.stopPropagation();
            this.submenuIsOpen = !this.submenuIsOpen;
            this.$bus.$off('document-body-clicked', this.hideSubmenu);
            this.$bus.$emit('document-body-clicked');
            this.$bus.$on('document-body-clicked', this.hideSubmenu);
        }
    },
    beforeDestroy () {
        this.$bus.$off('document-body-clicked', this.hideSubmenu);
    }
}
</script>

<style lang="scss" scoped>
@import '../scss/variables.scss';

.topbar {
    &-app-settings {
        color: var(--icon-secondary-color);
        cursor: pointer;
        display: block;
        height: 5rem;
        order: 3;
        padding: 0 0 0 1.5rem;
        width: 35px;

        &:hover {
            color: var(--icon-tertiary-color);
        }

        &-icon {
            background: currentColor;
            border-radius: 50%;
            display: block;
            height: 3px;
            margin-top: -2px;
            pointer-events: none;
            position: relative;
            right: -1px;
            top: 50%;
            width: 3px;
            transition: var(--transition);

            &:after,
            &:before {
                background: currentcolor;
                border-radius: 50%;
                content: "";
                display: block;
                height: 3px;
                position: absolute;
                top: -6px;
                width: 3px;
            }

            &:before {
                top: 6px;
            }

            &-updates-available {
                animation: pulseCore 1.8s ease-in-out infinite;
                background: rgba(var(--warning-rgb), 1);
                border-radius: 50%;
                display: block;
                height: 4px;
                width: 4px;
                left: 50%;
                top: 50%;
                position: absolute;
                transform: translate(-50%, -50%);
                z-index: 2;


                &::before,
                &::after {
                    border: 1px solid rgba(var(--warning-rgb), .4);
                    border-radius: 50%;
                    content: '';
                    height: 100%;
                    width: 100%;
                    left: 50%;
                    top: 50%;
                    position: absolute;
                    transform: translate(-50%, -50%) scale(0.6);
                    opacity: 0;
                    z-index: 1;
                    animation: ripple 2s ease-out infinite;
                }

                &::after {
                    animation-delay: 1s; 
                }
            }

            @keyframes pulseCore {
                0%, 100% {
                    transform: translate(-50%, -50%) scale(1);
                }
                50% {
                    transform: translate(-50%, -50%) scale(1.4);
                }
            }

            @keyframes ripple {
                0% {
                    opacity: 0.6;
                    transform: translate(-50%, -50%) scale(0.8);
                }
                60% {
                    opacity: 0.3;
                }
                100% {
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(5);
                }
            }
        }
    }

    &-app-settings {
        -webkit-app-region: no-drag; // Make the buttons clickable again
        font-weight: var(--font-weight-semibold);

        & > svg {
            height: 2.4rem;
            position: relative;
            top: .6rem;
            width: 2.4rem;
        }
    }

    &-app-submenu {
        background: var(--popup-bg);
        box-shadow: var(--box-shadow-medium);
        border-radius: var(--border-radius);
        cursor: default;
        font-size: 1.4rem;
        list-style-type: none;
        padding: 2rem 0;
        position: absolute;
        right: 3.2rem;
        top: 1.5rem;

        &-separator {
            border-bottom: 1px solid var(--border-light-color);
            margin-bottom: 2rem;
            padding-bottom: 1rem;
        }
    }
}

/*
 * Responsive improvements
 */

@media (max-height: 900px) {
    .topbar-app-submenu {
        right: 2.8rem;
    }
}

@media (max-width: 1400px) {
    .topbar-app-submenu {
        right: 2.8rem;
    }
}
</style>
