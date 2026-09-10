<template>
    <section :class="{ 
        'content': true, 
        'notifications': true,
        'notifications-list-view': true 
    }">
        <div class="notifications-wrapper">
            <p-header :title="$t('notifications.notifications')">
                <p-button
                    :onClick="goBack"
                    appearance="clean"
                    back
                    slot="buttons">
                    {{ $t('ui.goBack') }}
                </p-button>

                <p-button
                    v-if="notificationsStatus === 'accepted'"
                    :onClick="checkUpdates"
                    slot="buttons"
                    intent="primary"
                    icon="refresh"
                    :disabled="receivingNotificationsInProgress">
                    {{ $t('notifications.checkUpdates') }}
                </p-button>
            </p-header>

            <template v-if="notificationsStatus === 'accepted'">
                <fields-group :title="$t('notifications.news')"
                    v-if="newsToDisplay.length > 0" 
                    class="notification">
                    <ul class="notification-list">
                        <li 
                            v-for="(news, index) in newsToDisplay" 
                            :key="index" 
                            class="notification-item is-news"
                            :data-type="news.type">
                            <div class="notification-item-content">
                                <div class="notification-icon-wrapper">
                                    <icon
                                        customWidth="44"
                                        customHeight="44"
                                        :name="icons[news.type]"
                                        class="notification-item-icon" />
                                </div>

                                <div class="notification-item-details">
                                    <span class="notification-title">
                                        {{ news.title }}
                                    </span>
                                    <span class="notification-description">
                                        {{ news.text }}
                                    </span>
                                </div>
                            </div>

                            <div class="notification-item-actions">
                                <p-button 
                                    appearance="secondary"
                                    v-if="news.link"
                                    :onClick="() => openLink(news.link)">
                                    {{ $t('notifications.readMore') }}
                                </p-button>
                            </div>
                        </li>
                    </ul>

                    <a
                        href="#"
                        class="notification-action"
                        @click.prevent="markAsRead('news')">
                        {{ $t('notifications.markAsRead') }}
                    </a>
                </fields-group>

                <fields-group :title="$t('notifications.publiiUpdateAvailable')"
                    v-if="hasPubliiUpdate"
                    class="notification">
                    <div :class="{ 
                        'notification-item':true,
                        'is-publii-notification': true,
                        'is-read': isRead('PUBLII-' + notifications.publii.version + '-' + notifications.publii.build)
                    }">
                        <div class="notification-item-content">
                            <img 
                                src="./../assets/svg/publii-app-icon-512.svg" 
                                alt="Publii Logo" 
                                class="notification-item-icon"
                                height="52"
                                width="52" />  
                                
                            <div class="notification-item-details">
                               <div class="notification-item-name" :data-new-badge="$t('notifications.badgeNew')">
                                  <span>Publii</span>
                                </div>
                                <div class="notification-item-versions">
                                    <span class="notification-item-version">
                                        {{ $t('notifications.latestVersion') }}: v.{{ notifications.publii.version }} (build: {{ notifications.publii.build }})
                                    </span>

                                    <span class="notification-item-current-version">
                                        {{ $t('notifications.currentVersion') }}: v.{{ $store.state.app.versionInfo.version }} (build: {{ $store.state.app.versionInfo.build }})
                                    </span>

                                    <p-button
                                        v-if="notifications.publii.links.releaseNotes"
                                        class="notification-item-version-details"
                                        appearance="clean"
                                        :onClick="() => openLink(notifications.publii.links.releaseNotes)">
                                        {{ $t('notifications.viewDetails') }}
                                    </p-button>
                                </div>
                                <div 
                                    v-if="notifications.publii.description"
                                    class="notification-item-desc">
                                    <p v-html="notifications.publii.description"></p>
                                </div>
                            </div>
                        </div>

                        <div class="notification-item-actions">
                            <p-button 
                                appearance="secondary"
                                :onClick="() => openLink(notifications.publii.links.download)" 
                                size="small"
                                icon="download">
                                {{ $t('notifications.downloadUpdate') }}
                            </p-button>
                        </div>
                    </div>

                    <a 
                        href="#"
                         class="notification-action"
                         :class="{ 'is-disabled': !unreadPubliiNotification }"
                        @click.prevent="markAsRead('publii')">
                        {{ $t('notifications.markAsRead') }}
                    </a>
                </fields-group>

                <fields-group
                    :title="$t('notifications.themeUpdatesAndNotices')"
                    v-if="themeNotifications.length > 0"
                    class="notification">
                    <ul class="notification-list">
                        <li
                            v-for="theme in themeNotifications"
                            :key="theme.directory"
                            :class="{
                                'notification-item': true,
                                'is-extension-notification': true,
                                'is-theme-update': theme.hasUpdate,
                                'is-read': !theme.isUnread
                            }">
                            <div class="notification-item-content">
                                <img
                                    :src="$store.state.themesPath + '/' + theme.directory + '/thumbnail.png'"
                                    alt=""
                                    class="notification-item-icon"
                                    height="52"
                                    width="52" />

                                <div class="notification-item-details">
                                    <div
                                        class="notification-item-name"
                                        :data-new-badge="$t('notifications.badgeNew')">
                                        <span>{{ theme.name }}</span>
                                        <span
                                            v-if="theme.isDiscontinued"
                                            class="notification-discontinued-badge">
                                            <span aria-hidden="true">!</span>
                                            {{ $t('notifications.badgeDiscontinued') }}
                                        </span>
                                    </div>
                                    <p
                                        v-if="theme.isDiscontinued"
                                        class="notification-discontinued-info">
                                        {{ theme.discontinuedText || $t('notifications.discontinuedThemeInfo') }}
                                    </p>
                                    <div
                                        v-if="theme.hasUpdate"
                                        class="notification-item-versions">
                                        <span class="notification-item-version">
                                            {{ $t('notifications.latestVersion') }}: v.{{ theme.version }}
                                        </span>

                                        <span class="notification-item-current-version">
                                            {{ $t('notifications.currentVersion') }}: v.{{ theme.currentVersion }}
                                        </span>

                                        <p-button
                                            v-if="theme.links.releaseNotes"
                                            class="notification-item-version-details"
                                            appearance="clean"
                                            :onClick="() => openLink(theme.links.releaseNotes)">
                                            {{ $t('notifications.viewDetails') }}
                                        </p-button>
                                    </div>
                                    <div
                                        v-if="theme.description"
                                        class="notification-item-desc">
                                        <p v-html="theme.description"></p>
                                    </div>
                                </div>
                            </div>

                            <div
                                v-if="theme.hasUpdate && theme.links.download"
                                class="notification-item-actions">
                                <p-button
                                    appearance="secondary"
                                    :onClick="() => openLink(theme.links.download)"
                                    size="small"
                                    icon="download">
                                    {{ $t('notifications.downloadUpdate') }}
                                </p-button>
                            </div>
                        </li>
                    </ul>

                    <button
                        type="button"
                        class="notification-action"
                        :disabled="!unreadThemeNotifications"
                        @click="markAsRead('themes')">
                        {{ $t('notifications.markAsRead') }}
                    </button>
                </fields-group>

                <fields-group
                    :title="$t('notifications.pluginUpdatesAndNotices')"
                    v-if="pluginNotifications.length > 0"
                    class="notification">
                    <ul class="notification-list">
                        <li
                            v-for="plugin in pluginNotifications"
                            :key="plugin.directory"
                            :class="{
                                'notification-item': true,
                                'is-extension-notification': true,
                                'is-plugin-update': plugin.hasUpdate,
                                'is-read': !plugin.isUnread
                            }">
                            <div class="notification-item-content">
                                <img
                                    :src="$store.state.pluginsPath + '/' + plugin.directory + '/thumbnail.svg'"
                                    alt=""
                                    class="notification-item-icon"
                                    height="52"
                                    width="52" />

                                <div class="notification-item-details">
                                    <div
                                        class="notification-item-name"
                                        :data-new-badge="$t('notifications.badgeNew')">
                                        <span>{{ plugin.name }}</span>
                                        <span
                                            v-if="plugin.isDiscontinued"
                                            class="notification-discontinued-badge">
                                            <span aria-hidden="true">!</span>
                                            {{ $t('notifications.badgeDiscontinued') }}
                                        </span>
                                    </div>
                                    <p
                                        v-if="plugin.isDiscontinued"
                                        class="notification-discontinued-info">
                                        {{ plugin.discontinuedText || $t('notifications.discontinuedPluginInfo') }}
                                    </p>
                                    <div
                                        v-if="plugin.hasUpdate"
                                        class="notification-item-versions">
                                        <span class="notification-item-version">
                                            {{ $t('notifications.latestVersion') }}: v.{{ plugin.version }}
                                        </span>

                                        <span class="notification-item-current-version">
                                            {{ $t('notifications.currentVersion') }}: v.{{ plugin.currentVersion }}
                                        </span>

                                        <p-button
                                            v-if="plugin.links.releaseNotes"
                                            class="notification-item-version-details"
                                            appearance="clean"
                                            :onClick="() => openLink(plugin.links.releaseNotes)">
                                            {{ $t('notifications.viewDetails') }}
                                        </p-button>
                                    </div>
                                    <div
                                        v-if="plugin.description"
                                        class="notification-item-desc">
                                        <p v-html="plugin.description"></p>
                                    </div>
                                </div>
                            </div>

                            <div
                                v-if="plugin.hasUpdate && plugin.links.download"
                                class="notification-item-actions">
                                <p-button
                                    appearance="secondary"
                                    :onClick="() => openLink(plugin.links.download)"
                                    size="small"
                                    icon="download">
                                    {{ $t('notifications.downloadUpdate') }}
                                </p-button>
                            </div>
                        </li>
                    </ul>

                    <button
                        type="button"
                        class="notification-action"
                        :disabled="!unreadPluginNotifications"
                        @click="markAsRead('plugins')">
                        {{ $t('notifications.markAsRead') }}
                    </button>
                </fields-group>
            </template>

            <empty-state
                v-if="notificationsStatus !== 'accepted'"
                illustrationName="notifications-center"
                illustrationWidth="344"
                illustrationHeight="286"
                :title="$t('notifications.consentStateTitle')"
                :description="$t('notifications.consentStateDescription')">
                <p-button
                    slot="button"
                    :onClick="giveConsent">
                    {{ $t('notifications.giveConsent') }}
                </p-button>

                <p-button
                    slot="button"
                    appearance="outline"
                    :onClick="rejectConsent">
                    {{ $t('notifications.rejectConsent') }}
                </p-button>
            </empty-state>

            <empty-state
                v-if="notificationsStatus === 'accepted' && newsToDisplay.length === 0 && pluginNotifications.length === 0 && themeNotifications.length === 0 && !hasPubliiUpdate"
                illustrationName="notifications-center"
                illustrationWidth="344"
                illustrationHeight="286"
                :title="$t('notifications.noUpdatesTitle')"
                :description="$t('notifications.noUpdatesDescription')">
            </empty-state>

            <div 
                v-if="notificationsStatus === 'accepted'"
                class="notifications-consent">
                <span>
                    {{ $t('notifications.consentInfo') }}
                    <a 
                        href="#"
                        @click.prevent="rejectConsentConfirm">
                        {{ $t('notifications.consentReject') }}
                    </a>
                </span>
            </div>
        </div>
    </section>
</template>

<script>
import getExtensionNotifications from '../helpers/extension-notifications';
import { mapGetters } from 'vuex';
import GoToLastOpenedWebsite from './mixins/GoToLastOpenedWebsite';

export default {
    name: 'notifications-center',
    mixins: [
        GoToLastOpenedWebsite
    ],
    data () {
        return {
            icons: {
                ok: 'success',
                danger: 'warning',
                warning: 'warning',
                info: 'info'
            },
            receivingNotificationsInProgress: false
        };
    },
    computed: {
        ...mapGetters([
            'notificationsCount',
            'notifications',
            'notificationsStatus'
        ]),
        hasPubliiUpdate () {
            let currentBuild = this.$store.state.app.versionInfo.build;
            
            if (this.notifications.publii && parseInt(this.notifications.publii.build, 10) > parseInt(currentBuild, 10)) {
                return true;
            }

            return false;
        },
        newsToDisplay () {
            let newsToDisplay = [];
            let currentDate = new Date().getTime();

            for (let notification of this.notifications.news || []) {
                if (
                    notification.id && 
                    this.readedNotifications.indexOf(notification.id) === -1 &&
                    currentDate >= new Date(notification.validFrom).getTime() &&
                    currentDate <= new Date(notification.validTo).getTime()
                ) {
                    newsToDisplay.push(notification);
                }
            }

            return newsToDisplay;
        },
        themeNotifications () {
            return getExtensionNotifications({
                type: 'THEME',
                installed: this.$store.state.themes,
                available: this.notifications.themes,
                discontinued: this.notifications.discontinued && this.notifications.discontinued.themes,
                readNotificationIDs: this.readedNotifications
            });
        },
        unreadThemeNotifications () {
            return this.themeNotifications.some(notification => notification.isUnread);
        },
        pluginNotifications () {
            return getExtensionNotifications({
                type: 'PLUGIN',
                installed: this.$store.state.plugins,
                available: this.notifications.plugins,
                discontinued: this.notifications.discontinued && this.notifications.discontinued.plugins,
                readNotificationIDs: this.readedNotifications
            });
        },
        unreadPluginNotifications () {
            return this.pluginNotifications.some(notification => notification.isUnread);
        },
        unreadPubliiNotification () {
            return this.readedNotifications.indexOf('PUBLII-' + this.notifications.publii.version + '-' + this.notifications.publii.build) === -1;
        },
        readedNotifications () {
            return this.$store.state.app.notificationsReadStatus.split(';');
        }
    },
    mounted () {
        this.$bus.$on('app-receiving-notifications', this.receivingNotifications);
        this.$bus.$on('app-received-notifications', this.receivedNotifications);
    },
    methods: {
        checkUpdates () {
            this.$bus.$emit('app-get-forced-notifications');
        },
        async giveConsent () {
            this.$store.commit('setAppNotificationsStatus', 'accepted');
            await mainProcessAPI.send('app-set-notifications-center-state', 'accepted');
            this.$bus.$emit('app-get-forced-notifications');
        },
        rejectConsentConfirm () {
            this.$bus.$emit('confirm-display', {
                hasInput: false,
                message: this.$t('notifications.rejectConsentConfirm'),
                okClick: this.rejectConsent,
                okLabel: this.$t('ui.iUnderstand'),
                cancelLabel: this.$t('ui.cancel')
            });
        },
        async rejectConsent () {
            this.$store.commit('setAppNotificationsStatus', 'rejected');
            await mainProcessAPI.send('app-set-notifications-center-state', 'rejected');
            this.goBack();
        },
        receivingNotifications () {
            this.receivingNotificationsInProgress = true;
        },
        async receivedNotifications () {
            this.receivingNotificationsInProgress = false;
        },
        openLink (url) {
            mainProcessAPI.shellOpenExternal(url);
        },
        markAsRead (typeToMark) {
            let notificationsReadStatus = this.$store.state.app.notificationsReadStatus;
            notificationsReadStatus = notificationsReadStatus.split(';');

            if (typeToMark === 'publii') {
                let id = 'PUBLII-' + this.notifications.publii.version + '-' + this.notifications.publii.build;

                if (notificationsReadStatus.indexOf(id) === -1) {
                    notificationsReadStatus.push(id);
                }
            } else if (typeToMark === 'news') {
                for (let news of this.newsToDisplay) {
                    if (notificationsReadStatus.indexOf(news.id) === -1) {
                        notificationsReadStatus.push(news.id);
                    }
                }
            } else if (typeToMark === 'plugins' || typeToMark === 'themes') {
                const notifications = typeToMark === 'plugins'
                    ? this.pluginNotifications
                    : this.themeNotifications;

                for (const notification of notifications) {
                    for (const id of notification.notificationIDs) {
                        if (notificationsReadStatus.indexOf(id) === -1) {
                            notificationsReadStatus.push(id);
                        }
                    }
                }
            }

            notificationsReadStatus = notificationsReadStatus.join(';').replace(/[^a-z0-9\-_;\.]/gmi, '');
            this.$store.commit('setNotificationsReadStatus', notificationsReadStatus);
            localStorage.setItem('publii-notifications-readed', notificationsReadStatus);
            this.$bus.$emit('app-update-notifications-counters');
        },
        isRead (notificationID) {
            return this.readedNotifications.indexOf(notificationID) > -1;
        }
    },
    beforeDestroy () {
        this.$bus.$off('app-receiving-notifications', this.receivingNotifications);
        this.$bus.$off('app-received-notifications', this.receivedNotifications);
    }
}
</script>

<style scoped>

.notifications {
    padding: var(--space-12) 0 var(--space-16);
    width: 100%;

    .notification {
        .notification-title {
            font-size: 1.5rem;
            font-weight: var(--font-weight-bold);
            margin-bottom: var(--space-1);
            width: 100%;
        }

        .notification-action {
            color: var(--text-light-color);
            font-size: 1.1rem;
            position: absolute;
            right: 3rem;
            top: 3.2rem;
            text-transform: uppercase;

            &:hover {
                color: var(--link-primary-color-hover);
            }

            &.is-disabled,
            &:disabled {
                pointer-events: none;
                opacity: 0.5;
            }
        }

        button.notification-action {
            background: none;
            border: none;
            cursor: pointer;
            font-family: inherit;
            padding: 0;

            &:focus-visible {
                outline: 2px solid var(--color-primary);
                outline-offset: var(--space-1);
            }

            &:disabled {
                cursor: default;
            }
        }

        .notification-item {
            display: flex;
            gap: var(--space-8);

            & + .notification-item {
                border-top: 1px solid var(--border-light-color);
                margin-top: 1.6rem;
                padding-top: 1.6rem;
            }

            &:not(.is-read) {
                .notification-item-name {
                    &::after {
                        content: attr(data-new-badge);
                        background: var(--color-success);
                    }
                }
            }
        }

        .notification-list {
            list-style-type: none;
            padding: 0;
        }

        .notification-item-content {
            align-items: center;
            display: flex;
            flex: 1;
            gap: var(--space-8);
            width: calc(100% - 220px);
        }

        .notification-item-details {
            display: flex;
            flex-direction: column;
            width: 100%;
        }

        .notification-item-name {
            align-items: center;
            display: flex;
            flex-wrap: wrap;
            font-size: 1.5rem;
            font-weight: var(--font-weight-bold);
            gap: var(--space-3);
            margin-bottom: var(--space-1);
            overflow-wrap: anywhere;
            width: 100%;
        }
        .notification-item-versions {
            display: flex;
            align-items: center;
            gap: var(--space-4);

            & > * + *::before {
                color: var(--input-border-color);
                content: "|";
                display: inline-block;
                margin-right: var(--space-2);
            }
        }

        .notification-item-current-version {
            color: var(--text-light-color);
        }

        .notification-item-version-details {
             height: auto;
            line-height: inherit;
            padding: 0;
        }

        .notification-description {
            margin: 0;
        }

        .notification-item-desc {

            p {
                color: var(--text-lightest-color);
                margin: 0;
            }
        }

        .notification-item-icon {
            border-radius: 10px;
        }

        .notification-icon-wrapper {
            align-items: center;
            border-radius: 10px;
            display: flex;
            flex-shrink: 0;
            height: 52px;
            justify-content: center;
            padding: 1.2rem;
            width: 52px;

            svg {
                fill: var(--white);
            }
        }

        [data-type="info"] .notification-icon-wrapper {
            background: var(--color-primary);
        }

        [data-type="warning"] .notification-icon-wrapper {
            background: var(--color-danger);
        }

        .notification-item-actions {
            display: flex;
            flex-direction: column;
            justify-content: center;
            max-width: 200px;

            .button {
                text-align: center;

                & + .button {
                    margin-top: var(--space-3);
                    margin-left: 0;
                }
            }
        }

        .is-extension-notification {
            .notification-item-content,
            .notification-item-details {
                min-width: 0;
            }

            .notification-item-icon {
                flex-shrink: 0;
            }

            .notification-item-versions {
                flex-wrap: wrap;
                row-gap: var(--space-1);
            }
        }

        .notification-item-name::after,
        .notification-discontinued-badge {
            align-items: center;
            border-radius: var(--radius-base);
            color: var(--white);
            display: inline-flex;
            flex-shrink: 0;
            font-size: var(--font-size-ui-xs);
            font-weight: var(--font-weight-semibold);
            gap: var(--space-1);
            padding: 0 var(--space-2);
        }

        .notification-discontinued-badge {
            background: var(--color-danger);
        }

        .notification-discontinued-info {
            color: var(--text-light-color);
            margin: 0 0 var(--space-1);
        }
    }
}

.notifications-wrapper {
    margin: 0 auto;
    max-width: var(--wrapper-width);
    min-height: calc(100vh - 8rem - var(--topbar-height));
    position: relative;
}

.notifications-version {
    margin: -2.5rem 0 var(--space-16);
}

.notifications-consent {
    color: var(--text-lightest-color);
    font-size: 13px;
    margin: var(--space-16) auto;
    max-width: 50%;
    position: sticky;
    text-align: center;
    top: 100%;
}
</style>
