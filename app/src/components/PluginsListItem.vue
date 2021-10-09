<template>
    <figure :class="{ 'plugin': true, }">
        <span class="plugin-thumbnail-wrapper">
            <img
                :src="thumbnail"
                class="plugin-thumbnail"
                alt="">
            <span 
                v-if="isIncompatible"
                class="plugin-is-incompatible"
                :title="$t('plugins.isIncompatibleTitle', { supportedVersion: pluginData.minimumPubliiVersion, currentVersion: this.$store.state.app.versionInfo.version })">
                {{ $t('plugins.isIncompatible') }}
            </span>
        </span>

        <figcaption class="plugin-name">
            <h3>
                {{ name }}
                <span class="plugin-version">
                    {{ version }}
                </span>
             </h3>
            <a
                href="#"
                class="plugin-delete"
                :title="$t('plugins.deletePlugin')"
                @click.stop.prevent="deletePlugin(name, directory)">
                    <icon
                        size="xs"
                        properties="not-clickable"
                        name="trash" />
            </a>
        </figcaption>
    </figure>
</template>

<script>
import Vue from 'vue';
import compare from 'node-version-compare';

export default {
    name: 'plugins-list-item',
    props: [
        'pluginData'
    ],
    computed: {
        isIncompatible () {
            if (compare(this.pluginData.minimumPubliiVersion, this.$store.state.app.versionInfo.version) === 1) {
                return true;
            }

            return false;
        },
        thumbnail () {
            return this.pluginData.thumbnail;
        },
        name () {
            return this.pluginData.name;
        },
        directory () {
            return this.pluginData.directory;
        },
        version () {
            return this.pluginData.version;
        }
    },
    methods: {
        deletePlugin (pluginName, pluginDirectory) {
            let confirmConfig = {
                message: this.$t('plugins.removePluginMessage', pluginName),
                okClick: function() {
                    mainProcessAPI.send('app-plugin-delete', {
                        name: pluginName,
                        directory: pluginDirectory
                    });

                    mainProcessAPI.receiveOnce('app-plugin-deleted', (data) => {
                        this.$bus.$emit('message-display', {
                            message: this.$t('plugins.removePluginSuccessMessage'),
                            type: 'success',
                            lifeTime: 3
                        });

                        this.$store.commit('replaceAppPlugins', data.plugins);
                    });
                }
            };

            this.$bus.$emit('confirm-display', confirmConfig);
        }
    }
}
</script>

<style lang="scss" scoped>
@import '../scss/variables.scss';

.plugin {
    margin: 0;
    position: relative;

    &-thumbnail {
        border-radius: 50%;
        display: block;
        height: 128px;
        left: 50%;
        position: absolute;
        top: 50%;
        transform: translateX(-50%) translateY(-50%);
        width: 128px;

        &-wrapper {
            background: var(--gray-1);
            border: 1px solid var(--gray-1);
            border-radius: 4px;
            display: block;
            padding-bottom: 75%;
            position: relative;
            transition: var(--transition);
            width: 100%;
        }
    }

    &-delete {
        background: var(--bg-primary);
        border-radius: 50%;
        height: 3rem;
        display: inline-block;
        position: absolute;
        right: 1.4rem;
        text-align: center;
        width: 3rem;

        & > svg {
             fill: var(--icon-secondary-color);
             transform: scale(.9);
             transition: var(--transition);
             vertical-align: middle;
        }

        &:hover {
             & > svg {
                fill: var(--warning);
                transform: scale(1);
             }
        }
    }

    &-name {
        align-items: center;
        background: var(--gray-1);
        border-radius: 0 0 4px 4px;
        display: flex;
        justify-content: space-between;
        padding: 0 2rem;
        position: relative;
        text-align: left;

        & > h3 {
             font-size: 1.5rem;
             font-weight: 500;
             line-height: 1.4;
             margin: 1.2rem 0;
        }
    }

    &-version {
        color: var(--text-light-color);
        display: block;
        font-size: 1.2rem;
        font-weight: 400;
        margin: 0 4rem 0 auto;
    }

    &-is-incompatible {
        background: var(--warning);
        border-radius: 5px;
        color: var(--white);
        cursor: help;
        font-size: 1.3rem;
        font-weight: bold;
        padding: .3rem .5rem;
        position: absolute;
        right: 1rem;
        top: 1rem;
    }
}
</style>
