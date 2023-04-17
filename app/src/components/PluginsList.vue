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
            class="add-more-plugins">
                <a href="https://marketplace.getpublii.com/plugins/" target="_blank" rel="noopener noreferrer">
                    <icon
                        customWidth="50"
                        customHeight="46"
                        properties="not-clickable"
                        name="add" />
                    <h3>{{ $t('plugins.getMorePlugins') }}</h3>
                </a>
        </div>

        <plugin-item
            v-for="(plugin, index) in plugins"
            :pluginData="plugin"
            :key="'plugin-item-' + index" />

        <overlay
            v-if="pluginIsOver"
            :hasBorder="true"
            :isBlue="true">
            <div>{{ $t('file.dropYourFileHere') }}</div>
        </overlay>
    </div>
</template>

<script>
import PluginsListItem from './PluginsListItem';

export default {
    name: 'plugins-list',
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
            this.pluginIsOver = true;
        },
        hideOverlay (e) {
            if (e.target.classList.contains('plugins')) {
                this.pluginIsOver = false;
            }
        },
        uploadPlugin (e) {
            this.pluginIsOver = false;

            mainProcessAPI.send('app-plugin-upload', {
                sourcePath: e.dataTransfer.files[0].path
            });

            mainProcessAPI.receiveOnce('app-plugin-uploaded', this.$parent.uploadedPlugin);
        }
    }
}
</script>

<style lang="scss" scoped>
@import '../scss/variables.scss';

.plugins {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 3rem;
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
    border-radius: var(--border-radius);
    box-shadow: var(--box-shadow-small);      
    height: 100%;
    transition: var(--transition);
    text-align: center;

    &:hover {
         background: var(--bg-primary);
         border-color: var(--color-primary);
         box-shadow: 0 0 26px rgba(black, .07);

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
         font-size: $app-font-base;
         font-weight: var(--font-weight-semibold);
         margin-bottom: 0;
         transition: inherit;
    }

    svg {
         fill: var(--icon-primary-color);
         transition: inherit;
    }
}
</style>
