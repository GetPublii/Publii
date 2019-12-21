<template>
    <div class="topbar">
        <topbar-appbar />

        <div class="topbar-inner">           
            <icon                   
                customWidth="63"
                customHeight="26" 
                class="topbar-logo"
                name="logo" />
            
            <topbar-notification />
            <topbar-sites v-if="displayIcon" />
            <topbar-preview-link v-if="displayIcon" />
            <div 
                @click="toggleTheme()"
                class="topbar-darkmode-switcher">
                <span        
                    v-if="$store.state.app.theme === 'dark'"
                    class="topbar-darkmode-dark"
                    title="Switch to light mode">
                    <icon                   
                        customWidth="20"
                        customHeight="20"
                        name="sun" />
                </span>
                <span 
                    v-if="$store.state.app.theme === 'default'"
                    class="topbar-darkmode-default"
                    title="Switch to dark mode">
                    <icon                   
                        customWidth="20"
                        customHeight="20"
                        name="moon" />
                </span>
            </div>
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
    },
    methods: {
        toggleTheme () {
            let currentTheme = this.$store.state.app.theme;

            if (currentTheme === 'dark') {
                this.$store.commit('setAppTheme', 'default');
            } else {
                this.$store.commit('setAppTheme', 'dark');
            }

            document.querySelector('html').setAttribute('data-theme', this.$store.state.app.theme);
        }
    }
}
</script>

<style lang="scss" scoped>
@import '../scss/variables.scss';

.topbar {
    background: var(--gray-1);
    font-size: 1.6rem;
    height: 7.8rem;
    position: absolute;
    top: 0;
    -webkit-app-region: no-drag;
    -webkit-user-select: none;
    width: 100%;

    & > .topbar-inner {
        align-items: center;
        background: var(--bg-secondary);
        box-shadow: 0 0 1px rgba(0, 0, 0, .3);
        display: flex;
        height: 5.6rem;        
        padding: 0 calc(3rem - 3px) 0 5rem;
        position: absolute;
        top: 2.2rem;
        width: 100%;
        z-index: 102;
    }

    &-logo {
        fill: var(--icon-tertiary-color);
        display: block;    
        margin-right: auto;
    }
    
    &-darkmode-switcher {
        margin: -1px 0 0 2.3rem;
        order: 3;
        
        & > span {
            cursor: pointer;
            display: inline-block;           
            
            svg {
               fill: var(--icon-secondary-color);
               transition: var(--transition);
               vertical-align: text-top;
            }   
            
            &:hover {
                
                svg {
                    fill: var(--icon-tertiary-color); 
                }
            }
        }
    }
}
    
body[data-os="osx"] {
    
}

body[data-os="win"] {
    .topbar {
        height: 9.2rem;

        & > .topbar-inner {
            top: 3.6rem;
        }
    }
}

body[data-os="linux"] {
    .topbar {
        height: 5.6rem;

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
