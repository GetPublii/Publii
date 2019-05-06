<template>
    <span
        :class="{ 'preview-link': true, 'is-online': isOnline }"
        @click="openPreview"
        :title="title">
        <icon
            size="s"
            :primaryColor="iconColor"
            :name="previewIconName" />
        Live Preview
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
        isOnline () {
            if(!this.$store.state.currentSite.config) {
                return false;
            }

            if(!this.$store.state.currentSite.config.domain) {
                return false;
            }

            return !!this.$store.state.currentSite.config.syncDate;
        },
        title () {
            if(this.isOnline) {
                return 'Visit your website';
            } else {
                return 'After the initial sync, your website will be available online';
            }
        },
        iconColor () {
            if(this.isOnline) {
                return 'color-helper-6';
            }

            return 'color-7';
        },
        previewIconName () {
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
    background: $color-9;
    border-radius: 4px;
    color: $color-7;
    cursor: not-allowed;
    display: flex;
    font-size: 1.4rem;
    justify-content: center;
    padding: 0.8rem 1.2rem;
    order: 2;
    transition: all .25s ease-out;
    
    & > svg {
        margin-right: 0.6rem; 
    }

    &.is-online {
        color: $color-5;
        cursor: pointer;
    }

    &:hover {
        background: $color-helper-10;
    }
}
</style>
