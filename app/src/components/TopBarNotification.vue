<template>
    <div
        class="topbar-notifications"
        v-if="notification.visible"
        :data-timestamp="notification.timestamp" >
        <div class="topbar-notification">
            <div class="topbar-notification-content">
                <icon
                    size="l"
                    primaryColor="color-helper-1"
                    name="info" />
        <p
            ref="content"
            v-pure-html="notification.text">
        </p>

        <span
            class="topbar-notification-close"
            :title="$t('ui.hideThisNotification')"
            @click="closeNotification">
            &times;
        </span>
        </div></div>
    </div>
</template>

<script>
import appBuildData from './../../back-end/builddata.json';

export default {
    name: 'topbar-notification',
    data () {
        return {
            contentEventsAdded: false
        }
    },
    computed: {
        notification: function() {
            return this.$store.state.app.notification;
        }
    },
    created: function() {
        this.getNotifications();
    },
    mounted: function() {
        let self = this;
    },
    methods: {
        getNotifications() {
            if(this.$store.state.app.notification) {
                return;
            }

            let self = this;

            mainProcessAPI.send('app-notifications-retrieve', this.shouldRetrieveNotifications());

            mainProcessAPI.receiveOnce('app-notifications-retrieved', function(data) {
                if(data.status === true) {
                    self.setNotification(data);
                }

                localStorage.setItem('publii-notification-retrieve-timestamp', new Date().getTime());
            });
        },
        shouldRetrieveNotifications() {
            let currentTime = new Date().getTime();
            let lastRetrieveTime = localStorage.getItem('publii-notification-retrieve-timestamp');

            if(lastRetrieveTime !== null) {
                if(currentTime > parseInt(lastRetrieveTime, 10) + (2 * 60 * 60 * 1000)) {
                    return true;
                }
            } else {
                return true;
            }

            return false;
        },
        setNotification(data) {
            let closeTimestamp = localStorage.getItem('publii-notification-close-timestamp');

            if(closeTimestamp === null || data.notification.timestamp > parseInt(closeTimestamp, 10)) {
                if (!data.notification.publiiMaxVersion || this.appIsOlderThan(data.notification.publiiMaxVersion)) {
                    this.$store.commit('setNotification', {
                        timestamp: data.notification.timestamp,
                        text: data.notification.content,
                        visible: true
                    });
                } else {
                    this.$store.commit('setNotification', {
                        timestamp: data.notification.timestamp,
                        text: data.notification.content,
                        visible: false
                    });
                }
            } else {
                this.$store.commit('setNotification', {
                    timestamp: data.notification.timestamp,
                    text: data.notification.content,
                    visible: false
                });
            }

            setTimeout(() => {
                if(!this.$refs.content) {
                    return;
                }

                if (this.contentEventsAdded) {
                    return;
                }

                this.contentEventsAdded = true;
            }, 500);
        },
        closeNotification(event) {
            localStorage.setItem('publii-notification-close-timestamp', this.notification.timestamp);
            this.$store.commit('setNotification', false);
        },
        appIsOlderThan (versionToCheck) {
            if (this.compareVersions(appBuildData.version, versionToCheck) === 1) {
                return false;
            }

            return true;
        },
        compareVersions (versionOfApp, versionToCheck) {
            if (versionOfApp === versionToCheck) {
                return 0;
            }

            versionOfApp = versionOfApp.split('.');
            versionToCheck = versionToCheck.split('.');

            let howManyParts = Math.min(versionOfApp.length, versionToCheck.length);

            for (let i = 0; i < howManyParts; i++) {
                if (parseInt(versionOfApp[i], 10) > parseInt(versionToCheck[i], 10)) {
                    return 1;
                } else if (parseInt(versionOfApp[i], 10) < parseInt(versionToCheck[i], 10)) {
                    return -1;
                }
            }

            if (versionOfApp.length > versionToCheck.length) {
                return 1;
            } else if (versionOfApp.length < versionToCheck.length) {
                return -1;
            }

            return 0;
        }
    }
}
</script>

<style lang="scss" scoped>
@import '../scss/variables.scss';

.topbar-notifications {
     background: transparent;
     bottom: 0;
     pointer-events: none;
     position: fixed;
     left: 50%;
     top: 4.2rem;
     transform: translate(-50%, 0);
     user-select: none;
     width: 100%;
     z-index: 100003;

     .topbar-notification {
         animation: messages-animation .24s cubic-bezier(.17,.67,.6,1.34) forwards;
         display: flex;
         justify-content: center;
         margin: 0;
         opacity: 1;
         padding: 0;
         position: relative;
         white-space: nowrap;
         width: 100%;

         @at-root {
                  @keyframes messages-animation {
                     from {
                          opacity: 0;
                          transform: scale(0.6);
                     }
                     to {
                          opacity: 1;
                          transform: scale(1);
                     }
                 }
            }

         &-content {
             align-items: center;
             background: var(--popup-bg);
             box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
             border-radius: 6px;
             color: var(--text-primary-color);
             font-size: 1.4rem;
             display: flex;
             justify-content: center;
             line-height: 1.4;
             margin: 0;
             padding: 2rem;
             pointer-events: all;
             position: absolute;

             a {
                 color: var(--white);
                 cursor: pointer;
                 text-decoration: underline;

                 &:active,
                 &:focus,
                 &:hover {
                     opacity: .75;
                 }
             }

             p {
                 margin: 0 0 0 2rem;
             }

             .icon {
                 flex-shrink: 0;
             }
         }

         &-icon {
             display: block;
             margin: 0;
         }

         &-close {
            -webkit-app-region: no-drag; // Make the button clickable again
            background: var(--input-bg-light);
            border-radius: 50%;
            color: var(--icon-secondary-color);
            cursor: pointer;
            font-size: 2.1rem;
            font-weight: 300;
            height: 2.4rem;
            left: auto;
            line-height: 1;
            margin-left: 2rem;
            text-align: center;
            transition: all .3s ease-out;
            width: 2.4rem;

            &:active,
            &:focus,
            &:hover {
                 color: var(--icon-tertiary-color);
            }

            &:hover {
               background: var(--input-border-color);
            }
        }
     }
}

body[data-os="linux"] {
    .topbar {
        &-notification {
            top: 0;
        }
    }
}
</style>
