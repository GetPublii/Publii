<template>
    <div class="topbar">
        <topbar-appbar />

        <div class="topbar-inner">
            <topbar-dropdown />
        </div>
    </div>
</template>

<script>
import TopBarAppBar from './TopBarAppBar';
import TopBarDropDown from './TopBarDropDown';

export default {
    name: 'topbar',
    components: {
        'topbar-appbar': TopBarAppBar,
        'topbar-dropdown': TopBarDropDown
    },
    created: function() {
        this.getNotifications();
        this.scheduleNotificationsCheck();
    },
    mounted () {
        this.$bus.$on('app-get-notifications', this.getNotifications);
        this.$bus.$on('app-get-forced-notifications', this.forceGetNotifications);
        this.$bus.$on('app-update-notifications-counters', this.updateNotificationsCounters);
    },
    methods: {
        forceGetNotifications () {
            this.getNotifications(true);
        },
        getNotifications(forced = false) {
            if (this.$store.state.app.config.notificationsStatus !== 'accepted') {
                return;
            }

            this.$bus.$emit('app-receiving-notifications');
            let shouldGetNotifications = this.shouldRetrieveNotifications() || forced;
            let lastRetrieveTime = localStorage.getItem('publii-notification-retrieve-timestamp');

            if (forced && lastRetrieveTime && new Date().getTime() > parseInt(lastRetrieveTime, 10) + (60 * 1000)) {
                shouldGetNotifications = false;
            }

            mainProcessAPI.send('app-notifications-retrieve', shouldGetNotifications);

            mainProcessAPI.receiveOnce('app-notifications-retrieved', data => {
                if (data.status === true) {
                    this.setNotificationsData (data);
                }

                this.$bus.$emit('app-received-notifications');
                localStorage.setItem('publii-notification-retrieve-timestamp', new Date().getTime());
                this.updateNotificationsCounters();
            });
        },
        shouldRetrieveNotifications() {
            let currentTime = new Date().getTime();
            let lastRetrieveTime = localStorage.getItem('publii-notification-retrieve-timestamp');

            if (lastRetrieveTime !== null) {
                if (currentTime > parseInt(lastRetrieveTime, 10) + (8 * 60 * 60 * 1000)) {
                    return true;
                }
            } else {
                return true;
            }

            return false;
        },
        setNotificationsData (data) {
            this.$store.commit('setNotifications', data.notifications);
        },
        scheduleNotificationsCheck () {
            setTimeout(() => {
                this.getNotifications();
                this.scheduleNotificationsCheck();
            }, (8 * 60 * 60 * 1000) + 10000); // 8 hours + 10 seconds
        },
        updateNotificationsCounters () {
            let updatesCount = 0;
            let notificationsData = this.$store.state.app.notifications;

            // Check if Publii version is newest one (check build number for specific OS)
            let currentOS = this.$store.state.app.versionInfo.os;
            let currentBuild = this.$store.state.app.versionInfo.build;
            
            if (notificationsData.publii && parseInt(notificationsData.publii.build[currentOS], 10) > parseInt(currentBuild, 10)) {
                updatesCount++;
            }

            // Check if there are any news which are not read yet
            let currentDate = new Date().getTime();
            let notificationsReadStatus = this.$store.state.app.notificationsReadStatus;
            notificationsReadStatus = notificationsReadStatus.split(';');

            for (let notification of notificationsData.news || []) {
                if (
                    notification.id && 
                    notificationsReadStatus.indexOf(notification.id) === -1 &&
                    currentDate >= new Date(notification.validFrom).getTime() &&
                    currentDate <= new Date(notification.validTo).getTime()
                ) {
                    updatesCount++;
                }
            }

            // Check if there are any updates for themes
            let installedThemes = this.$store.state.themes;
            let availableThemes = notificationsData.themes || {};

            for (let theme of installedThemes) {
                if (availableThemes[theme.directory]) {
                    let result = this.compareVersions(availableThemes[theme.directory].version, theme.version);
                    
                    if (result === 1) {
                        updatesCount++;
                    }
                }
            }

            // Check if there are any updates for plugins
            let installedPlugins = this.$store.state.plugins;
            let availablePlugins = notificationsData.plugins || {};

            for (let plugin of installedPlugins) {    
                if (availablePlugins[plugin.directory]) {
                    let result = this.compareVersions(availablePlugins[plugin.directory].version, plugin.version);
                    
                    if (result === 1) {
                        updatesCount++;
                    }
                }
            }

            this.$store.commit('setNotificationsCount', updatesCount);
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
        }
    },
    beforeDestroy () {
        this.$bus.$off('app-get-notifciations', this.getNotifications);
        this.$bus.$off('app-get-forced-notifications', this.forceGetNotifications);
        this.$bus.$off('app-update-notifications-counters', this.updateNotificationsCounters);
    }
}
</script>

<style lang="scss" scoped>
@import '../scss/variables.scss';

.topbar {
    background: var(--gray-1);
    font-size: $app-font-base;
    height: var(--topbar-height);
    position: absolute;
    top: 0;
    -webkit-app-region: no-drag;
    -webkit-user-select: none;
    width: 100%;

    & > .topbar-inner {
        align-items: center;
        display: flex;             
        padding: 0;
        position: absolute;
        right: 0;
        top: var(--topbar-height);
        width: 40px;
        z-index: 102;
    }
}
    
/*
 * Responsive improvements
 */

@media (max-height: 900px) {
    .topbar > .topbar-inner {
        width: 35px;
    }
}

@media (max-width: 1400px) {
    .topbar > .topbar-inner {
        width: 35px;
    }
}

body[data-os="linux"] {
    .topbar {
        height: 0;

        & > .topbar-inner {
            top: 0;
        }
    }
}
</style>
