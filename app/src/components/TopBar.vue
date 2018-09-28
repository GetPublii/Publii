<template>
    <div class="topbar">
        <topbar-appbar />

        <div class="topbar-inner">
            <img src="../assets/images/logo.png" class="topbar-logo" alt="Logo">
            <topbar-notification />
            <topbar-sites v-if="displayIcon" />
            <topbar-preview-link v-if="displayIcon" />
            <topbar-dropdown />
        </div>
    </div>
</template>

<script>
import TopBarAppBar from './TopBarAppBar';
import TopBarSites from './TopBarSites';
import TopBarNotification from './TopBarNotification';
import TopBarDropDown from './TopBarDropDown';
import TopBarPreviewLink from './TopBarPreviewLink';

export default {
    name: 'topbar',
    components: {
        'topbar-appbar': TopBarAppBar,
        'topbar-sites': TopBarSites,
        'topbar-notification': TopBarNotification,
        'topbar-dropdown': TopBarDropDown,
        'topbar-preview-link': TopBarPreviewLink
    },
    computed: {
        displayIcon: function() {
            let excludedPaths = [
                '/site/!/posts'
            ];

            if (excludedPaths.indexOf(this.$route.path) > -1) {
                return false;
            }

            return true;
        }
    }
}
</script>

<style lang="scss" scoped>
@import '../scss/variables.scss';

.topbar {
    background: $color-9;
    font-size: 1.6rem;
    height: 8.4rem;
    position: absolute;
    top: 0;
    -webkit-app-region: no-drag;
    -webkit-user-select: none;
    width: 100%;

    & > .topbar-inner {
        background: $color-10;
        box-shadow: 0 1px 2px rgba(0, 0, 0, .1);
        display: flex;
        align-items: center;
        padding: 0 5rem;
        position: absolute;
        top: 2.2rem;
        width: 100%;
        z-index: 102;
    }

    &-logo {
        display: block;
        height: 6.2rem;
        margin-right: auto;
        width: 11.7rem;
    }
}

body[data-os="win"] {
    .topbar {
        height: 9.8rem;

        & > .topbar-inner {
            top: 3.6rem;
        }
    }
}

body[data-os="linux"] {
    .topbar {
        height: 6.2rem;

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
        padding: 0 3rem;
    }
}

@media (max-width: 1400px) {
    .topbar > .topbar-inner {
        padding: 0 3rem;
    }
}
</style>
