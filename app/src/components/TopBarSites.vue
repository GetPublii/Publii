<template>
    <div
        @click="toggle"
        class="site-switch">
        <site-logo />

        <div
            :class="submenuClasses">
            <sites-search />

            <sites-list />

            <p-button
                icon="add-site-mono"
                type="bottom"
                :onClick="addNewWebsite">
                Add new website
            </p-button>
        </div>
    </div>
</template>

<script>
import SiteLogo from './SiteLogo';
import TopBarSitesSearch from './TopBarSitesSearch';
import TopBarSitesList from './TopBarSitesList';

export default {
    name: 'sites',
    components: {
        'site-logo': SiteLogo,
        'sites-search': TopBarSitesSearch,
        'sites-list': TopBarSitesList
    },
    data: function() {
        return {
            submenuIsOpen: false
        };
    },
    computed: {
        submenuClasses: function() {
            return {
                'sites-switcher': true,
                'is-hidden': !this.submenuIsOpen
            };
        }
    },
    mounted: function(e) {
        let self = this;
        this.$bus.$on('topbar-close-submenu-sites', function() {
            self.submenuIsOpen = false;
        });
    },
    methods: {
        toggle: function(e) {
            e.stopPropagation();

            if(this.isExcludedFromToggle(e.target)) {
                return;
            }

            this.submenuIsOpen = !this.submenuIsOpen;
            this.$bus.$emit('topbar-close-submenu-dropdown');
        },
        isExcludedFromToggle: function(el) {
            return el.tagName === 'INPUT' || (el.tagName === 'SPAN' && el.classList.contains('button'));
        },
        addNewWebsite: function(e) {
            this.submenuIsOpen = false;
            this.$router.push('/site/!');
        }
    },
    beforeDestroy () {
        this.$bus.$off('topbar-close-submenu-sites');
    }
}
</script>

<style lang="scss" scoped>
@import '../scss/variables.scss';

.site-switch {
    -webkit-app-region: no-drag; // Make the buttons clickable again   
    color: $color-5;
    cursor: pointer;
    display: block;
    font-weight: 500;  
    position: relative;
    order: 1;

    & > span {
        transition: all .25s ease-out;
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
            color: $color-1;

        }

        & > svg {
            fill: lighten($color-1, 10);
        }
    }
}

.sites-switcher {
    background: $color-10;
    box-shadow: 0 1px 0 1px rgba(100, 115, 135, 0.1),
                0 8px 16px rgba(29, 39, 52, 0.07);
    left: 0;
    max-height: 48rem;
    position: absolute;
    top: 4.8rem;
    width: 30rem;
    
    .button {
        font-size: 1.5rem;
        height: 5.2rem;
        line-height: 5.2rem;
    }
}
</style>
