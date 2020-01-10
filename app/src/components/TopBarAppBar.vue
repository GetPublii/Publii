<template>
    <div class="appbar">
        <span
            @click="appMinimize"
            ref="minimize"
            class="appbar-button appbar-minimize">
            <icon
                size="xxs"
                name="win-minimize" />
        </span>

        <span
            v-if="!$store.state.app.windowIsMaximized"
            @click="appMaximize"
            ref="maximize"
            class="appbar-button appbar-maximize">
            <icon
                size="xxs"
                name="win-maximize" />
        </span>

        <span
            v-if="$store.state.app.windowIsMaximized"
            @click="appUnmaximize"
            ref="unmaximize"
            class="appbar-button appbar-unmaximize">
            <icon
                size="xxs"
                name="win-expand" />
        </span>

        <span
            @click="appClose"
            ref="close"
            class="appbar-button appbar-close">
            <icon
                size="xxs"
                name="win-close" />
        </span>
    </div>
</template>

<script>
import { remote } from 'electron';

export default {
    name: 'topbar-appbar',
    methods: {
        appMinimize: function() {
            if(remote.BrowserWindow.getFocusedWindow()) {
                remote.BrowserWindow.getFocusedWindow().minimize();
            }
        },
        appMaximize: function() {
            if(remote.BrowserWindow.getFocusedWindow()) {
                remote.BrowserWindow.getFocusedWindow().maximize();
            }

            this.$store.commit('setWindowState', true);
        },
        appUnmaximize: function() {
            if(remote.BrowserWindow.getFocusedWindow()) {
                remote.BrowserWindow.getFocusedWindow().unmaximize();
            }

            this.$store.commit('setWindowState', false);
        },
        appClose: function() {
            let allWindows = remote.BrowserWindow.getAllWindows();

            for(let i = 0; i < allWindows.length; i++) {
                allWindows[i].close();
            }
        }
    }
}
</script>

<style lang="scss" scoped>
@import '../scss/variables.scss';

.appbar {
    -webkit-app-region: drag; // necessary for making window draggable
    -webkit-user-select: none; // remove conflict with the text selection
    background: var(--border-light-color);
    height: 2.2rem;
    padding: 0;
    position: relative;
    text-align: right;
    z-index: 999999;

    &-button {
        display: none;
    }
}

body[data-os="win"] {
    .appbar {
        height: 3.6rem;

        &-button {
            -webkit-app-region: no-drag; // Make the buttons clickable again
            display: inline-block;
            height: 3.6rem;
            padding: 1.2rem 0.75rem;
            vertical-align: top;
            width: 3.8rem;

            & > svg {
                display: block;
                fill: var(--icon-tertiary-color);
                margin: 0 auto;
            }

            &:hover {
                background: var(--input-border-color);                
            }
        }

        &-minimize {
            & > svg {
                position: relative;
                top: 4px;
            }
        }

        &-close {
            &:hover {
                background: var(--warning);

                & > svg {
                    fill: var(--white);
                }
            }
        }
    }
}

body[data-os="linux"] {
  .appbar {
    display: none;
  }
}
</style>
