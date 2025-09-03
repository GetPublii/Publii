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
                    type="clean back"
                    slot="buttons">
                    {{ $t('ui.goBack') }}
                </p-button>

                <p-button
                    v-if="notificationsStatus === 'accepted'"
                    :onClick="checkUpdates"
                    slot="buttons"
                    type="primary icon"
                    icon="refresh"
                    :disabled="receivingNotificationsInProgress">
                    {{ $t('notifications.checkUpdates') }}
                </p-button>
           </p-header>

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
                                    class="button-secondary"
                                    v-if="news.link"
                                    :onClick="() => openLink(news.link)">
                                    {{ $t('notifications.readMore') }}
                                </p-button>
                            <p-button  
                                class="button-clean notification-item-version-details"
                                :onClick="() => markAsRead(news.id)">
                                {{ $t('notifications.markAsRead') }}
                            </p-button>   
                        </div>
                    </li>
                </ul>
            </fields-group>

             <fields-group :title="$t('notifications.publiiUpdateAvailable')"
                v-if="hasPubliiUpdate"
                class="notification">
               

                <div class="notification-item is-publii-notification">
                    <div class="notification-item-content">
                        <img 
                            src="./../assets/svg/publii-app-icon-512.svg" 
                            alt="Publii Logo" 
                            class="notification-item-icon"
                            height="52"
                            width="52" />  
                            
                        <div class="notification-item-details">
                             <span class="notification-item-name">
                                Publii
                            </span>
                            <div class="notification-item-versions">
                                <span class="notification-item-version">
                                    {{ $t('notifications.latestVersion') }}: v.{{ notifications.publii.version }} (build: {{ notifications.publii.build[this.$store.state.app.versionInfo.os] }})
                                </span>

                                <span class="notification-item-current-version">
                                    {{ $t('notifications.currentVersion') }}: v.{{ $store.state.app.versionInfo.version }} (build: {{ $store.state.app.versionInfo.build }})
                                </span>

                                <p-button
                                    class="button-clean notification-item-version-details"
                                    :onClick="() => openLink(notifications.publii.links.releaseNotes)">
                                    {{ $t('notifications.viewDetails') }}
                                </p-button>
                            </div>
                        </div>
                    </div>

                    <div class="notification-item-actions">
                        <p-button 
                            class="button-secondary"
                            :onClick="() => openLink(notifications.publii.links.download)" 
                            type="icon"
                            icon="download">
                            {{ $t('notifications.downloadUpdate') }}
                        </p-button>
                    </div>
                </div>
            </fields-group>

             <fields-group :title="`${$t('notifications.themeUpdatesAvailable')} (${themeUpdates.length})`"
                v-if="themeUpdates.length > 0"
                class="notification">
               
                <ul class="notification-list">
                    <li 
                        v-for="(theme, index) in themeUpdates" 
                        :key="index" 
                        class="notification-item is-theme-update">
                        <div class="notification-item-content">
                            <img 
                                :src="$store.state.themesPath + '/' + theme.directory + '/thumbnail.png'" 
                                alt=""
                                class="notification-item-icon"
                                height="52"
                                width="52" />

                            <div class="notification-item-details">
                                <span class="notification-item-name">
                                    {{ theme.name }}
                                </span>
                                <div class="notification-item-versions">
                                    <span class="notification-item-version">
                                        {{ $t('notifications.latestVersion') }}: v.{{ theme.version }}
                                    </span>

                                    <span class="notification-item-current-version">
                                        {{ $t('notifications.currentVersion') }}: v.{{ theme.currentVersion }}
                                    </span>

                                    <p-button
                                        class="button-clean notification-item-version-details"
                                        :onClick="() => openLink(theme.links.releaseNotes)">
                                        {{ $t('notifications.viewDetails') }}
                                    </p-button>
                                </div>
                            </div>
                        </div>

                        <div class="notification-item-actions">
                            <p-button
                                class="button-secondary"
                                :onClick="() => openLink(theme.links.url)"
                                type="icon"
                                icon="download">
                                {{ $t('notifications.downloadUpdate') }}
                            </p-button>
                        </div>
                    </li>
                </ul>
            </fields-group>

            <fields-group :title="`${$t('notifications.pluginUpdatesAvailable')} (${pluginUpdates.length})`"
              v-if="pluginUpdates.length > 0" 
              class="notification">
              
                <ul class="notification-list">
                    <li 
                        v-for="(plugin, index) in pluginUpdates" 
                        :key="index" 
                        class="notification-item is-plugin-update">
                        <div class="notification-item-content">
                            <img 
                                :src="$store.state.pluginsPath + '/' + plugin.directory + '/thumbnail.svg'" 
                                alt=""
                                class="notification-item-icon"
                                height="52"
                                width="52" />

                            <div class="notification-item-details">
                                <span class="notification-item-name">
                                    {{ plugin.name }}
                                </span>
                                <div class="notification-item-versions">
                                    <span class="notification-item-version">
                                        {{ $t('notifications.latestVersion') }}: v.{{ plugin.version }}
                                    </span>

                                    <span class="notification-item-current-version">
                                        {{ $t('notifications.currentVersion') }}: v.{{ plugin.currentVersion }}
                                    </span>

                                    <p-button
                                        class="button-clean notification-item-version-details"
                                        :onClick="() => openLink(plugin.links.releaseNotes)">
                                        {{ $t('notifications.viewDetails') }}
                                    </p-button>
                                </div>
                            </div>
                        </div>

                        <div class="notification-item-actions">
                            <p-button
                                class="button-secondary"
                                :onClick="() =>openLink(plugin.links.url)"
                                type="icon"
                                icon="download">
                                {{ $t('notifications.downloadUpdate') }}
                            </p-button>
                        </div>
                    </li>
                </ul>
            </fields-group>

            <empty-state
                v-if="notificationsStatus !== 'accepted'"
                imageName="backups.svg"
                imageWidth="344"
                imageHeight="286"
                :title="$t('notifications.consentStateTitle')"
                :description="$t('notifications.consentStateDescription')">
                <p-button
                    slot="button"
                    :onClick="giveConsent">
                    {{ $t('notifications.giveConsent') }}
                </p-button>

                <p-button
                    slot="button"
                    :onClick="rejectConsent">
                    {{ $t('notifications.rejectConsent') }}
                </p-button>
            </empty-state>

            <empty-state
                v-if="notificationsStatus === 'accepted' && notificationsCount === 0"
                imageName="backups.svg"
                imageWidth="344"
                imageHeight="286"
                :title="$t('notifications.noUpdatesTitle')"
                :description="$t('notifications.noUpdatesDescription')">
            </empty-state>
        </div>
    </section>
</template>

<script>
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
            let currentOS = this.$store.state.app.versionInfo.os;
            let currentBuild = this.$store.state.app.versionInfo.build;
            
            if (this.notifications.publii && parseInt(this.notifications.publii.build[currentOS], 10) > parseInt(currentBuild, 10)) {
                return true;
            }

            return false;
        },
        newsToDisplay () {
            let newsToDisplay = [];
            let currentDate = new Date().getTime();
            let notificationsReadStatus = this.$store.state.app.notificationsReadStatus;
            notificationsReadStatus = notificationsReadStatus.split(';');

            for (let notification of this.notifications.news || []) {
                if (
                    notification.id && 
                    notificationsReadStatus.indexOf(notification.id) === -1 &&
                    currentDate >= new Date(notification.validFrom).getTime() &&
                    currentDate <= new Date(notification.validTo).getTime()
                ) {
                    newsToDisplay.push(notification);
                }
            }

            return newsToDisplay;
        },
        themeUpdates () {
            let themeUpdates = [];
            let installedThemes = this.$store.state.themes;
            let availableThemes = this.notifications.themes || {};

            for (let theme of installedThemes) {
                if (availableThemes[theme.directory]) {
                    let result = this.compareVersions(availableThemes[theme.directory].version, theme.version);
                    
                    if (result === 1) {
                        let themeData = {
                            ...availableThemes[theme.directory],
                            currentVersion: theme.version,
                            directory: theme.directory
                        };

                        themeUpdates.push(themeData);
                    }
                }
            }

            return themeUpdates
        },
        pluginUpdates () {
            let pluginUpdates = [];
            let installedPlugins = this.$store.state.plugins;
            let availablePlugins = this.notifications.plugins || {};

            for (let plugin of installedPlugins) {    
                if (availablePlugins[plugin.directory]) {
                    let result = this.compareVersions(availablePlugins[plugin.directory].version, plugin.version);
                    
                    if (result === 1) {
                        let pluginData = {
                            ...availablePlugins[plugin.directory],
                            currentVersion: plugin.version,
                            directory: plugin.directory
                        };

                        pluginUpdates.push(pluginData);
                    }
                }
            }

            return pluginUpdates;
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
            return await mainProcessAPI.send('app-set-notifications-center-state', 'accepted');
        },
        async rejectConsent () {
            this.$store.commit('setAppNotificationsStatus', 'rejected');
            return await mainProcessAPI.send('app-set-notifications-center-state', 'rejected');
        },
        receivingNotifications () {
            this.receivingNotificationsInProgress = true;
        },
        async receivedNotifications () {
            this.receivingNotificationsInProgress = false;
        },
        compareVersions(v1, v2) {
            let parts1 = v1.split('.').map(n => parseInt(n, 10));
            let parts2 = v2.split('.').map(n => parseInt(n, 10));
            let partsToCheck = Math.max(parts1.length, parts2.length);

            for (let i = 0; i < partsToCheck; i++) {
                let num1 = parts1[i] || 0;
                let num2 = parts2[i] || 0;

                if (num1 > num2) {
                    return 1;
                }
                
                if (num1 < num2) {
                    return -1;
                }
            }

            return 0;
        },
        openLink (url) {
            mainProcessAPI.shellOpenExternalLink(url);
        },
        markAsRead (notificationId) {
            let notificationsReadStatus = this.$store.state.app.notificationsReadStatus;
            notificationsReadStatus = notificationsReadStatus.split(';');

            if (notificationsReadStatus.indexOf(notificationId) === -1) {
                notificationsReadStatus.push(notificationId);
                notificationsReadStatus = notificationsReadStatus.join(';').replace(/[^a-z0-9\-_;]/gmi, '');
                this.$store.commit('setNotificationsReadStatus', notificationsReadStatus);
                localStorage.setItem('publii-notifications-readed', notificationsReadStatus);
                this.$bus.$emit('app-update-notifications-counters');
            }
        }
    },
    beforeDestroy () {
        this.$bus.$off('app-receiving-notifications', this.receivingNotifications);
        this.$bus.$off('app-received-notifications', this.receivedNotifications);
    }
}
</script>

<style lang="scss" scoped>
@import '../scss/variables.scss';
@import '../scss/mixins.scss';

.notifications {
    padding: 3rem 0 4rem;
    width: 100%;

    &-wrapper {
        margin: 0 auto;
        max-width: $wrapper;
    }

    &-version {
        margin: -2.5rem 0 4rem 0;
    }

    .notification {
        .notification-title {
            font-size: 1.5rem;
            font-weight: bold;
            margin-bottom: 0.25rem;
            width: 100%;
        }

        .notification-item {
            display: flex;
            gap: 2rem;

            & + .notification-item {
                border-top: 1px solid var(--border-light-color);
                margin-top: 1.6rem;
                padding-top: 1.6rem;
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
            gap: 2rem;
            width: calc(100% - 220px);
        }

        .notification-item-details {
            display: flex;
            flex-direction: column;
            width: 100%;
        }

        .notification-item-name {
            font-size: 1.5rem;
            font-weight: bold;
            margin-bottom: 0.25rem;
            width: 100%;
        }
        .notification-item-versions {
            display: flex;
            align-items: center;
            gap: 1rem;

            & > * + *::before {
                color: var(--input-border-color);
                content: "|";
                display: inline-block;
                margin-right: 0.5rem;
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
            background: var(--warning);
        }

        .notification-item-actions {
            display: flex;
            flex-direction: column;
            justify-content: center;
            max-width: 200px;

            .button {
                text-align: center;

                & + .button {
                    margin-top: 0.75rem;
                    margin-left: 0;
                }
            }
        }

    }
}
</style>
