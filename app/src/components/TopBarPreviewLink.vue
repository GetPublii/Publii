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
import Utils from './../helpers/utils.js';

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

            let urlToOpen = Utils.getValidUrl(this.$store.state.currentSite.config.domain);

            if (urlToOpen) {
                shell.openExternal(urlToOpen);
            } else {
                alert('Sorry! The website link seems to be invalid.');
            }
        }
    }
};
</script>

<style lang="scss" scoped>
@import '../scss/variables.scss';

.preview-link {
    align-items: center;
    background: var(--gray-1);
    border-radius: 3px;
    color: var(--gray-4);
    cursor: not-allowed;
    display: flex;
    font-size: 1.4rem;
    justify-content: center;
    padding: 0.8rem 1.2rem;
    order: 2;
    transition: var(--transition);
    white-space: nowrap;
    
    & > svg {
        margin-right: 0.6rem; 
    }

    &.is-online {
        color: var(--text-primary-color);
        cursor: pointer; 
        
        &:hover {
           background: var(--primary-color);
           color: var(--white);
       }
    }    
}
</style>
