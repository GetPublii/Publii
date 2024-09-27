<template>
    <figure
        :class="{
                'plugin': true,
                'is-incompatible': isIncompatible
            }">
        <span class="plugin-thumbnail-wrapper">
            <img
                :src="thumbnail"
                class="plugin-thumbnail"
                alt="">
        </span>

        <figcaption class="plugin-name">
            <h3>
                <span>{{ name }}</span>
                <span class="plugin-version">
                    {{ version }}
                </span>
                <span 
                    v-if="isIncompatible"
                    class="plugin-is-incompatible"
                    :title="$t('plugins.isIncompatibleTitle', { supportedVersion: pluginData.minimumPubliiVersion, currentVersion: this.$store.state.app.versionInfo.version })">
                    {{ $t('plugins.isIncompatible') }}
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
                message: this.$t('plugins.removePluginMessage', { pluginName }),
                isDanger: true,
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
    background-color: var(--bg-secondary);
    border: 1px solid transparent;
    border-radius: var(--border-radius);
    box-shadow: var(--box-shadow-small);      
    height: 100%;
    margin: 0;
    overflow: hidden;
    padding: 1rem;
    position: relative;
    transition: var(--transition);
    text-align: center;

    &-thumbnail {
        display: block;
        max-height: 50%;
        left: 50%;
        position: absolute;
        top: 50%;
        transform: translateX(-50%) translateY(-50%);
        max-width: 90%;

        &-wrapper {
            display: block;
            padding-bottom: 75%;
            position: relative;
            transition: var(--transition);
            width: 100%;
        }
    }

    &-delete {
        align-items: center;
        background: var(--bg-primary);
        border-radius: 50%;
        height: 3rem;
        justify-content: center;
        display: inline-flex;
        position: absolute;
        right: 1.4rem;
        text-align: center;
        width: 3rem;

        & > svg {
             fill: var(--icon-secondary-color);
             transform: scale(.9);
             transition: var(--transition);
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
             font-size: 1.4rem;
             font-weight: var(--font-weight-semibold);
             line-height: 1.4;
             margin: 1.2rem 0;

             span:first-of-type {
                 display: block;
             }
        }
    }

    &-version {
        color: var(--text-light-color);
        font-size: 1.2rem;
        font-weight: var(--font-weight-normal);
    }

    &-version,
    &-is-incompatible {
        color: var(--text-light-color);
        font-size: 1.2rem;
        font-weight: var(--font-weight-normnal);
    }

    &-is-incompatible {
        color: var(--warning);
        margin: 0 4rem 0 .5rem;
        text-transform: uppercase;
    }

    &.is-incompatible {
       .plugin-version {
           text-decoration-color: var(--warning);
           text-decoration-line: line-through;
       }
    }
}
</style>
