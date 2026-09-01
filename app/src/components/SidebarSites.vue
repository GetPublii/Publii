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

<style scoped>

.site-switch {
    -webkit-app-region: no-drag; /* Make the buttons clickable again */
    cursor: pointer;
    display: block;
    font-weight: var(--font-weight-medium);
    margin: var(--space-4) calc(-1 * var(--app-sidebar-margin)) var(--space-2);
    position: relative;
    order: 1;

    & > span {
        transition: var(--transition-default);
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
            fill: #5ab0f7;
        }
    }
}
</style>
