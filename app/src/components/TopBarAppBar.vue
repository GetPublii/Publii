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
            @click="appMaximize"
            ref="maximize"
            class="appbar-button appbar-maximize">
            <icon
                size="xxs"
                name="win-maximize" />
        </span>

        <span
            @click="appUnmaximize"
            ref="unmaximize"
            class="appbar-button appbar-unmaximize is-hidden">
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

            this.$refs.maximize.classList.add('is-hidden');
            this.$refs.unmaximize.classList.remove('is-hidden');
        },
        appUnmaximize: function() {
            if(remote.BrowserWindow.getFocusedWindow()) {
                remote.BrowserWindow.getFocusedWindow().unmaximize();
            }

            this.$refs.unmaximize.classList.add('is-hidden');
            this.$refs.maximize.classList.remove('is-hidden');
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
    background: $color-helper-8;
    height: 2.2rem;
    padding: 0;
    position: relative;
    text-align: right;
    z-index: 103;

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
                margin: 0 auto;
            }

            &:hover {
                background: $color-8;
            }

            &.is-hidden {
                display: none;
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
                background: $color-3;

                & > svg {
                    fill: $color-10;
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
