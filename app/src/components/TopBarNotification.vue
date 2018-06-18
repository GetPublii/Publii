<template>
    <span
        class="topbar-notification"
        v-if="notification.visible"
        :data-timestamp="notification.timestamp" >
        <span
            ref="text"
            v-html="notification.text">
        </span>

        <span
            class="topbar-notification-close"
            title="Hide this notification"
            @click="closeNotification">
            <icon
                primaryColor="color-10"
                properties="not-clickable"
                size="xxxs"
                name="win-close" />
        </span>
    </span>
</template>

<script>
import { ipcRenderer, shell } from 'electron';

export default {
    name: 'topbar-notification',
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

        setTimeout(() => {
            if(!this.$refs.text) {
                return;
            }

            this.$refs.text.addEventListener('click', function(e) {
                if(e.target.tagName === 'A') {
                    e.preventDefault();
                    shell.openExternal(e.target.getAttribute('href'));
                    self.closeNotification();
                }
            });
        }, 0);
    },
    methods: {
        getNotifications() {
            if(this.$store.state.app.notification) {
                return;
            }

            let self = this;

            ipcRenderer.send('app-notifications-retrieve', this.shouldRetrieveNotifications);

            ipcRenderer.once('app-notifications-retrieved', function(event, data) {
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
                this.$store.commit('setNotification', {
                    timestamp: data.notification.timestamp,
                    text: data.notification.text,
                    visible: true
                });
            } else {
                this.$store.commit('setNotification', {
                    timestamp: data.notification.timestamp,
                    text: data.notification.text,
                    visible: false
                });
            }
        },
        closeNotification(event) {
            localStorage.setItem('publii-notification-close-timestamp', this.notification.timestamp);
            this.$store.commit('setNotification', false);
        }
    }
}
</script>

<style lang="scss" scoped>
@import '../scss/variables.scss';

.topbar {
    &-notification {
        -webkit-app-region: no-drag; // Make the links clickable again
        background: $color-helper-5;
        float: right;
        font-size: 1.4rem;
        font-weight: 400;
        margin: 0 7.5rem 0 0;
        order: 1;
        padding: .2rem .75rem;
        position: relative;

        a {
            border-bottom: 1px solid currentColor;
        }

        &-close {
            -webkit-app-region: no-drag; // Make the button clickable again
            background: $color-8;
            border-radius: 50%;
            cursor: pointer;
            height: 16px;
            position: absolute;
            right: -24px;
            top: 6px;
            transition: all .2s ease-out;
            width: 16px;

            & > svg {
                display: block;
                margin: 4px;
            }

            &:active,
            &:focus,
            &:hover {
                background: $color-3;
            }
        }
    }
}
</style>
