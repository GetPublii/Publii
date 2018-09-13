<template>
    <span
        :class="{ 'preview-link': true, 'is-online': isOnline }"
        @click="openPreview"
        :title="title">
        <icon
            size="s"
            :primaryColor="iconColor"
            :name="previewIconName" />
    </span>
</template>

<script>
import { shell } from 'electron';

export default {
    name: 'topbar-preview-link',
    data () {
        return {
            siteIsLoaded: false
        };
    },
    computed: {
        isOnline: function() {
            if(!this.$store.state.currentSite.config) {
                return false;
            }

            if(!this.$store.state.currentSite.config.domain) {
                return false;
            }

            return !!this.$store.state.currentSite.config.syncDate;
        },
        title: function() {
            if(this.isOnline) {
                return 'Visit your website';
            } else {
                return 'After the initial sync, your website will be available online';
            }
        },
        iconColor: function() {
            if(this.isOnline) {
                return 'color-2';
            }

            return 'color-7';
        },
        previewIconName: function() {
            if(this.isOnline) {
                return 'on-live-preview';
            }

            return 'off-live-preview';
        }
    },
    methods: {
        openPreview () {
            if(!this.isOnline) {
                return false;
            }

            shell.openExternal(this.$store.state.currentSite.config.domain);
        }
    }
};
</script>

<style lang="scss" scoped>
@import '../scss/variables.scss';

.preview-link {
    align-items: center;
    cursor: not-allowed;
    display: flex;
    justify-content: center;
    order: 2;
    transition: all .25s ease-out;
    width: 4.8rem;

    &.is-online {
        cursor: pointer;
    }

    &:hover {
        transform: scale(1.25);
    }
}
</style>
