<template>
    <div class="appbar">
        <span
            @click="appMinimize"
            ref="minimize"
            class="appbar-button appbar-minimize">
            <icon
                size="xxxs"
                name="win-minimize" />
        </span>

        <span
            v-if="!$store.state.app.windowIsMaximized"
            @click="appMaximize"
            ref="maximize"
            class="appbar-button appbar-maximize">
            <icon
                size="xxxs"
                name="win-maximize" />
        </span>

        <span
            v-if="$store.state.app.windowIsMaximized"
            @click="appUnmaximize"
            ref="unmaximize"
            class="appbar-button appbar-unmaximize">
            <icon
                size="xxxs"
                name="win-expand" />
        </span>

        <span
            @click="appClose"
            ref="close"
            class="appbar-button appbar-close">
            <icon
                size="xxxs"
                name="win-close" />
        </span>
    </div>
</template>

<script>
export default {
    name: 'topbar-appbar',
    methods: {
        appMinimize: function() {
            mainProcessAPI.invoke('app-window:minimize');
        },
        appMaximize: function() {
            mainProcessAPI.invoke('app-window:maximize');
            this.$store.commit('setWindowState', true);
        },
        appUnmaximize: function() {
            mainProcessAPI.invoke('app-window:unmaximize');
            this.$store.commit('setWindowState', false);
        },
        appClose: function() {
            mainProcessAPI.invoke('app-window:close');
        }
    }
}
</script>

<style lang="scss" scoped>
@import '../scss/variables.scss';

.appbar {
    -webkit-app-region: drag; // necessary for making window draggable
    -webkit-user-select: none; // remove conflict with the text selection
    background: var(--top-app-bar);
    height: var(--topbar-height);
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

        &-button {
            -webkit-app-region: no-drag; // Make the buttons clickable again
            display: inline-block;
            height: 2.2rem;
            padding: 6px 0.75rem;
            vertical-align: top;
            width: 2.4rem;

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
