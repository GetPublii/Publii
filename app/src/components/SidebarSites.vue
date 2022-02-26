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
    computed: {
        syncInProgress () {
            return this.$store.state.components.sidebar.syncInProgress;
        }
    },
    data () {
        return {
            submenuIsOpen: false
        };
    },
    methods: {
        toggle (e) {
            if (this.syncInProgress) {
                this.$bus.$emit('sync-popup-maximize');
                return;
            }

            this.$bus.$emit('sites-popup-show');
        }
    }
}
</script>

<style lang="scss" scoped>
@import '../scss/variables.scss';

.site-switch {
    -webkit-app-region: no-drag; // Make the buttons clickable again         
    cursor: pointer;
    display: block;
    font-weight: var(--font-weight-semibold);  
    margin: 1rem -#{$app-sidebar-margin} .5rem;    
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
            color: var(--color-primary);

        }

        & > svg {
            fill: lighten($color-1, 10);
        }
    }
}
</style>
