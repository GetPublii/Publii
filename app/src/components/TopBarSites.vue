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
    data: function() {
        return {
            submenuIsOpen: false
        };
    },
    methods: {
        toggle (e) {
            this.$bus.$emit('sites-popup-show');
        }
    }
}
</script>

<style lang="scss" scoped>
@import '../scss/variables.scss';

.site-switch {
    -webkit-app-region: no-drag; // Make the buttons clickable again   
    color: var(--text-primary-color);
    cursor: pointer;
    display: block;
    font-weight: 500;  
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
