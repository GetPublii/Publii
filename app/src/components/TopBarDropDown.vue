<template>
    <div
        @click="toggleSubmenu"
        class="topbar-app-settings"
        title="More items">
        <span class="topbar-app-settings-icon"></span>

        <ul
            ref="submenu"
            :class="cssClasses">
            <topbar-dropdown-item
                label="Global settings"
                title="Application configuration"
                path="/app-settings" />
            <topbar-dropdown-item
                class="topbar-app-submenu-separator" 
                label="Themes"
                title="Go to the themes manager"
                path="/app-themes" />
            <topbar-dropdown-item
                label="Help"
                title="Check Publii documentation"
                path="https://getpublii.com/docs/" />
            <topbar-dropdown-item
                label="Report an issue"
                title="Report a bug in our supportdesk"
                path="https://publii.ticksy.com/" />
            <topbar-dropdown-item
                label="Github repository"
                title="View Publii on Github"
                path="https://github.com/getpublii/publii" />
            <topbar-dropdown-item
                label="Donate"
                title="Support Publii and donate today!"
                path="https://getpublii.com/donate/" />
            <topbar-dropdown-item
                label="About Publii"
                title="More informations about Publii"
                path="/about" />
        </ul>
    </div>
</template>

<script>
import TopBarDropDownItem from './TopBarDropDownItem';

export default {
    name: 'topbar-dropdown',
    components: {
        'topbar-dropdown-item': TopBarDropDownItem
    },
    data: function() {
        return {
            submenuIsOpen: false
        };
    },
    computed: {
        cssClasses: function() {
            return {
                'is-hidden': !this.submenuIsOpen,
                'topbar-app-submenu': true
            };
        }
    },
    mounted: function(e) {
        this.$bus.$on('topbar-close-submenu-dropdown', () => {
            this.submenuIsOpen = false;
        });
    },
    methods: {
        toggleSubmenu: function(e) {
            e.stopPropagation();
            this.$bus.$emit('topbar-close-submenu-sites');
            this.submenuIsOpen = !this.submenuIsOpen;
        }
    },
    beforeDestroy () {
        this.$bus.$off('topbar-close-submenu-dropdown');
    }
}
</script>

<style lang="scss" scoped>
@import '../scss/variables.scss';

.topbar {
    &-app-settings {
        color: $color-7;
        cursor: pointer;
        display: block;
        height: 4rem;
        margin-left: 1rem;
        order: 3;
        padding: 0 1rem;
        width: 3px; 


        &:hover {
            color: $color-4;
        }

        &-icon {
            background: currentColor;
            border-radius: 50%;
            display: block;
            height: 3px;
            margin-top: -2px;
            pointer-events: none;
            position: relative;
            right: -1px;
            top: 50%;
            width: 3px;
            transition: all .25s ease-out;

            &:after,
            &:before {
                background: currentcolor;
                 border-radius: 50%;
                content: "";
                display: block;
                height: 3px;
                position: absolute;
                top: -6px;
                width: 3px;
            }

            &:before {
                top: 6px;
            }
        }
    }

    &-app-settings {
        -webkit-app-region: no-drag; // Make the buttons clickable again
        font-weight: 500;

        & > svg {
            height: 2.4rem;
            position: relative;
            top: .6rem;
            width: 2.4rem;
        }
    }

    &-app-submenu {
        background: $color-10;
         box-shadow: 0 1px 0 1px rgba(100, 115, 135, 0.1),
                     0 8px 16px rgba(29, 39, 52, 0.07);
        font-size: 1.5rem;
        list-style-type: none;
        padding: 2rem 0;
        position: absolute;
        right: 5.5rem;
        top: 4rem;
        
        &-separator {
            border-bottom: 1px solid $color-helper-8;
            margin-bottom: 2rem;
            padding-bottom: 1rem;
        }
    }
}

/*
 * Responsive improvements
 */

@media (max-height: 900px) {
    .topbar-app-submenu {
        right: 4.5rem;
    }
}

@media (max-width: 1400px) {
    .topbar-app-submenu {
        right: 4.5rem;
    }
}
</style>
