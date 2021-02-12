<template>
    <div
        @click="toggle"
        class="site-switch">
        <site-logo />
    </div>
</template>

<script>
import SiteLogo from './SiteLogo';

export default {
    name: 'sites',
    components: {
        'site-logo': SiteLogo
    },
    data () {
        return {
            syncInProgress: false,
            submenuIsOpen: false
        };
    },
    mounted () {
        this.$bus.$on('website-sync-in-progress', this.setSyncState);
    },
    methods: {
        toggle (e) {
            if (this.syncInProgress) {
                this.$bus.$emit('alert-display', {
                    message: 'Please finish the sync process before switching a website.'
                });
                return;
            }

            this.$bus.$emit('sites-popup-show');
        },
        setSyncState (state) {
            this.syncInProgress = state;
        }
    },
    beforeDestroy () {
        this.$bus.$off('website-sync-in-progress', this.setSyncState);
    }
}
</script>

<style lang="scss" scoped>
@import '../scss/variables.scss';

.site-switch {
    -webkit-app-region: no-drag; // Make the buttons clickable again         
    cursor: pointer;
    display: block;
    font-weight: 500;  
    margin: 1rem -4rem;    
    position: relative;
    order: 1;

    & > span {
        transition: var(--transition);
    }

    & > svg {
        height: 2.4rem;
        position: relative;
        top: .6rem;
        width: 2.4rem;
    }

    &:active,
    &:focus,
    &:hover {
        & > span {
            color: var(--primary-color);

        }

        & > svg {
            fill: lighten($color-1, 10);
        }
    }
}
</style>
