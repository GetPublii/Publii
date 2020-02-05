<template>
    <div class="topbar">
        <topbar-appbar />

        <div class="topbar-inner">           
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
import { ipcRenderer } from 'electron';
import TopBarAppBar from './TopBarAppBar';
import TopBarNotification from './TopBarNotification';
import TopBarDropDown from './TopBarDropDown';

export default {
    name: 'topbar',
    components: {
        'topbar-appbar': TopBarAppBar,
        'topbar-notification': TopBarNotification,
        'topbar-dropdown': TopBarDropDown
    },
    methods: {
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
    
    &-darkmode-switcher {
        margin: -1px 0 0 2.1rem;
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
