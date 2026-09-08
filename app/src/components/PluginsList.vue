<template>
    <div
        @drop.stop.prevent="uploadPlugin"
        @dragleave.stop.prevent="hideOverlay"
        @dragenter.stop.prevent="showOverlay"
        @dragover.stop.prevent="showOverlay"
        @drag.stop.prevent="showOverlay"
        @dragstart.stop.prevent
        @dragend.stop.prevent
        :class="{ 'plugins': true, 'plugin-is-over': pluginIsOver }">
        <div
            :inert="installing ? '' : null"
            class="add-more-plugins">
                <a href="https://marketplace.getpublii.com/plugins/" target="_blank" rel="noopener noreferrer">
                    <icon
                        customWidth="50"
                        customHeight="46"
                        non-interactive
                        name="add" />
                    <h3>{{ $t('plugins.getMorePlugins') }}</h3>
                </a>
        </div>

        <plugin-item
            :inert="installing ? '' : null"
            v-for="(plugin, index) in plugins"
            :pluginData="plugin"
            :key="'plugin-item-' + index" />

        <overlay
            v-if="pluginIsOver || installing"
            appearance="drop-zone"
            :loading="installationLoading"
            :role="installing ? 'status' : null"
            :aria-live="installing ? 'polite' : null"
            :aria-atomic="installing ? 'true' : null">
            <div>{{ $t(installing ? 'plugins.installingPlugin' : 'file.dropYourFileHere') }}</div>
        </overlay>
    </div>
</template>

<script>
import PluginsListItem from './PluginsListItem';

export default {
    name: 'plugins-list',
    props: {
        installing: {
            type: Boolean,
            default: false
        },
        installationLoading: {
            type: Boolean,
            default: false
        }
    },
    data () {
        return {
            pluginIsOver: false
        };
    },
    components: {
        'plugin-item': PluginsListItem
    },
    computed: {
        plugins () {
            let pluginsList = JSON.parse(JSON.stringify(this.$store.getters.plugins));
            pluginsList = pluginsList.filter(plugin => !!plugin);
            return pluginsList;
        }
    },
    methods: {
        showOverlay (e) {
            if (!this.installing) {
                this.pluginIsOver = true;
            }
        },
        hideOverlay (e) {
            if (e.target.classList.contains('plugins')) {
                this.pluginIsOver = false;
            }
        },
        uploadPlugin (e) {
            this.pluginIsOver = false;

            if (!this.installing && e.dataTransfer.files.length) {
                this.$emit('install', e.dataTransfer.files[0]);
            }
        }
    }
}
</script>

<style scoped>

.plugins {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--space-12);
    position: relative;
    user-select: none;

    &.plugin-is-over {
        & > * {
            pointer-events: none;
        }
    }
}

.add-more-plugins {
    background-color: var(--bg-secondary);
    border: 1px solid transparent;
    border-radius: var(--radius-base);
    box-shadow: var(--shadow-sm);
    height: 100%;
    transition: var(--transition-default);
    text-align: center;

    &:hover {
         background: var(--bg-primary);
         border-color: var(--color-primary);
         box-shadow: var(--shadow-list-hover);

         svg {
             fill: var(--color-primary);
         }

         h3 {
             color: var(--color-primary);
         }
    }

    & > a {
         align-items: center;
         display: flex;
         flex-direction: column;
         height: 100%;
         justify-content: center;
         min-height: 29rem;
         width: 100%;
    }

    h3 {
         color: var(--text-primary-color);
         font-size: var(--font-size-ui-md);
         font-weight: var(--font-weight-medium);
         margin-bottom: 0;
         transition: inherit;
    }

    svg {
         fill: var(--icon-primary-color);
         transition: inherit;
    }
}
</style>
