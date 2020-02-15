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
                label="App settings"
                title="Application configuration"
                path="/app-settings" />
            <topbar-dropdown-item
                label="Themes"
                title="Go to the themes manager"
                path="/app-themes" />
            <topbar-dropdown-item
                class="topbar-app-submenu-separator" 
                :onClick="toggleTheme"
                :label="$store.state.app.theme === 'dark' ? 'Switch to Light mode' : 'Switch to Dark mode'" />
            <topbar-dropdown-item
                label="Help"
                title="Check Publii documentation"
                path="https://getpublii.com/docs/" />
            <topbar-dropdown-item
                label="Report an issue"
                title="Report a bug in our supportdesk"
                path="https://getpublii.com/forum/" />
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
import { ipcRenderer } from 'electron';
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
        this.$bus.$on('document-body-clicked', this.hideSubmenu);
    },
    methods: {
        hideSubmenu () {
            this.submenuIsOpen = false;
        },
        toggleSubmenu (e) {
            e.stopPropagation();
            this.submenuIsOpen = !this.submenuIsOpen;
            this.$bus.$off('document-body-clicked', this.hideSubmenu);
            this.$bus.$emit('document-body-clicked');
            this.$bus.$on('document-body-clicked', this.hideSubmenu);
        },
        toggleTheme () {
            let currentTheme = this.$store.state.app.theme;
            let iframes = document.querySelectorAll('iframe[id$="_ifr"]');
            let theme;

            if (currentTheme === 'dark') {
                theme = 'default';
            } else {
                theme = 'dark';
            }

            this.$store.commit('setAppTheme', theme);
            localStorage.setItem('publii-theme', theme);
            ipcRenderer.send('app-save-color-theme', theme);

            for (let i = 0; i < iframes.length; i++) {
                iframes[i].contentWindow.window.document.querySelector('html').setAttribute('data-theme', theme);
            }

            document.querySelector('html').setAttribute('data-theme', theme);
        }
    },
    beforeDestroy () {
        this.$bus.$off('document-body-clicked', this.hideSubmenu);
    }
}
</script>

<style lang="scss" scoped>
@import '../scss/variables.scss';

.topbar {
    &-app-settings {
        color: var(--icon-secondary-color);
        cursor: pointer;
        display: block;
        height: 5rem;       
        order: 3;
        padding: 0 1rem;
        width: 35px; 


        &:hover {
            color: var(--icon-tertiary-color);
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
            transition: var(--transition);

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
        background: var(--bg-secondary);
        box-shadow: 0 1px 0 1px rgba(100, 115, 135, 0.1),
                     0 2px 16px rgba(29, 39, 52, 0.07);
        font-size: 1.5rem;
        list-style-type: none;
        padding: 2rem 0;
        position: absolute;
        right: 3rem;
        top: 2.5rem;        
        
        &-separator {
            border-bottom: 1px solid var(--border-light-color);
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
        right: 2.5rem;
    }
}

@media (max-width: 1400px) {
    .topbar-app-submenu {
        right: 2.5rem;
    }
}
</style>
