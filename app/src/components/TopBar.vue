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
