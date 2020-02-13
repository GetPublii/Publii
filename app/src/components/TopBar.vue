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
    font-size: 1.6rem;
    height: 2.2rem;
    position: absolute;
    top: 0;
    -webkit-app-region: no-drag;
    -webkit-user-select: none;
    width: 100%;

    & > .topbar-inner {
        align-items: center;
        display: flex;
        height: 5.6rem;        
        padding: 0;
        position: absolute;
        right: 0;
        top: 2.2rem;
        width: 100px;
        z-index: 102;
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

/*
 * Responsive improvements
 */

@media (max-height: 900px) {
    .topbar > .topbar-inner {
        padding: 0 calc(2rem - 3px) 0 4rem;
    }
}

@media (max-width: 1400px) {
    .topbar > .topbar-inner {
        padding: 0 calc(2rem - 3px) 0 4rem;
    }
}
</style>
