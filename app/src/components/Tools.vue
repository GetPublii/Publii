<template>
    <section class="content tools">
        <div class="tools-container">
            <p-header :title="$t('ui.tools')" />

            <div class="tools-list">
                <div 
                    v-for="(item, key) in items"
                    :class="{
                        'is-core': item.type === 'core',
                        'is-plugin': item.type !== 'core',
                        'plugin-is-enabled': item.type !== 'core' && !!pluginsStatus[item.directory],
                        'plugin-is-disabled': item.type !== 'core' && !pluginsStatus[item.directory]
                    }"
                    class="tools-list-item"
                    :key="'item-' + key">
                    <template v-if="item.type === 'core'">
                        <router-link :to="getUrl(item.link, true)">
                            <icon
                                :name="item.icon"
                                iconset="svg-map-tools"
                                customWidth="48"
                                customHeight="48" />
                            {{ item.name }}
                        </router-link>
                    </template>
                    <template v-else>
                        <router-link 
                            :to="getUrl(item.link, pluginsStatus[item.directory])">
                            <img :src="item.icon" />
                            {{ item.name }}

                            <switcher class="tools-switcher"
                                @click.native.prevent.stop="togglePluginState(item.directory)"
                                v-model="pluginsStatus[item.directory]" />
                        </router-link>
                    </template>
                </div>
            </div>
        </div>
    </section>
</template>

<script>
import { mapGetters } from 'vuex';
import Vue from 'vue';

export default {
    name: 'tools',
    computed: {
        ...mapGetters([
            'sitePlugins'
        ]),
        siteName () {
            return this.$route.params.name;
        },
        items () {
            let coreItems = [{
                type: 'core',
                name: this.$t('file.backups'),
                link: 'tools/backups',
                icon: 'backup'
            }, {
                type: 'core',
                name: this.$t('tools.css.customCSS'),
                link: 'tools/custom-css',
                icon: 'css'
            }, {
                type: 'core',
                name: this.$t('tools.customHTML'),
                link: 'tools/custom-html',
                icon: 'code'
            }, {
                type: 'core',
                name: this.$t('file.fileManager'),
                link: 'tools/file-manager',
                icon: 'file-manager'
            }, {
                type: 'core',
                name: this.$t('tools.logViewer'),
                link: 'tools/log-viewer',
                icon: 'log'
            }, {
                type: 'core',
                name: this.$t('tools.thumbnails.regenerateThumbnails'),
                link: 'tools/regenerate-thumbnails',
                icon: 'regenerate-thumbnails'
            }, {
                type: 'core',
                name: this.$t('tools.wpImport.wpImporter'),
                link: 'tools/wp-importer',
                icon: 'importer'
            }];

            let pluginItems = this.sitePlugins.map(plugin => ({
                type: 'plugin',
                name: plugin.name,
                directory: plugin.directory,
                link: 'tools/plugins/' + plugin.directory,
                icon: plugin.thumbnail
            }));

            return coreItems.concat(pluginItems);
        }
    },
    data () {
        return {
            pluginsStatus: {}
        }
    },
    mounted () {
        this.getPluginsStatus();
    },
    methods: {
        getUrl (link, status) {
            if (!status) {
                return '';
            }

            return '/site/' + this.siteName + '/' + link;
        },
        getPluginsStatus () {
            mainProcessAPI.send('app-site-get-plugins-state', {
                siteName: this.siteName
            });

            mainProcessAPI.receiveOnce('app-site-plugins-state-loaded', status => {
                this.pluginsStatus = status;
            });
        },
        activatePlugin (pluginName) {
            mainProcessAPI.send('app-site-plugin-activate', {
                siteName: this.siteName,
                pluginName: pluginName
            });

            mainProcessAPI.receiveOnce('app-site-plugin-activated', status => {
                if (status) {
                    Vue.set(this.pluginsStatus, pluginName, true);
                } else {
                    this.$bus.$emit('alert-display', {
                        message: this.$t('tools.pluginActivationError'),
                        buttonStyle: 'danger'
                    });
                }
            });
        },
        deactivatePlugin (pluginName) {
            mainProcessAPI.send('app-site-plugin-deactivate', {
                siteName: this.siteName,
                pluginName: pluginName
            });

            mainProcessAPI.receiveOnce('app-site-plugin-deactivated', status => {
                if (status) {
                    Vue.set(this.pluginsStatus, pluginName, false);
                } else {
                    this.$bus.$emit('alert-display', {
                        message: this.$t('tools.pluginDeactivationError'),
                        buttonStyle: 'danger'
                    });
                }
            });
        },
        togglePluginState (pluginName) {
            Vue.nextTick(() => {
                if (this.pluginsStatus[pluginName]) {
                    this.activatePlugin(pluginName);
                } else {
                    this.deactivatePlugin(pluginName);
                }
            });
        }
    }
}
</script>

<style lang="scss" scoped>
@import '../scss/variables.scss';

.tools {
    &-container {
        margin: 0 auto;
        max-width: $wrapper;
        user-select: none;
        z-index: 1;
    }

    &-list {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        grid-auto-rows: minmax(calc(8rem + 8vh), auto);
        gap: 2rem;

       &-item {
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
               box-shadow: var(--box-shadow-medium);  
               cursor: pointer;

               svg {
                  fill: var(--color-primary);
               }

               a {
                  color: var(--color-primary);
               }
            }

            a {
               color: var(--text-primary-color);
               display: flex;
               flex-direction: column;
               justify-content: center;
               font-weight: var(--font-weight-semibold);
               height: 100%;
               padding: 4rem 1rem;
               position: relative;
               width: 100%;
            }

            svg {
               display: block;
               fill: var(--icon-primary-color);
               margin: 0 auto 1rem;
               transition: inherit;
            }

            img {
               display: block;
               height: 48px;
               margin: 0 auto 1.4rem;
               width: auto;
               max-width: 60%;
            }

            &.plugin-is-disabled {

                a {
                    color: var(--text-light-color);
                    cursor: default;
                }

                &:hover {
                   border-color: var(--border-light-color);
                   box-shadow: var(--box-shadow-small);  
                   
                   .tools-switcher {
                         animation: tools-switcher-animation 3s linear infinite;

                   }
                }
            }
        }      
    }

    &-switcher {
       position: absolute;
       left: 1.5rem;
       bottom: 1rem;

       &:hover {
             animation: none !important;
       }
    }

    &-description {
        background: var(--option-sidebar-bg);
        float: right;
        padding: 2.4rem 3.6rem;
        width: 45%;
    }

    &-tab {
        h2 {
            font-size: $app-font-base;
            font-weight: 400;
            margin: 1rem 0 0;
            text-transform: none;
        }

        div {
            font-size: 1.4rem;
            font-style: italic;
        }
    }
}

@keyframes tools-switcher-animation {
  0% {transform:scale(1)}
  16% {transform:scale(.8)}
  33% {transform:scale(1)}
  50% {transform:scale(.8)}
  67% {transform:scale(1)}
  84% {transform:scale(.8)}
}

/*
 * Responsive improvements
 */

 @media (max-height: 900px) {
    .tools {
        &-list {
            &-item {
                svg,
                img {
                    transform: scale(0.9);
                }
            }
        }
    }
}

@media (max-width: 1400px) {
    .tools {
        &-list {
            li {
                flex-basis: calc(50% - 2rem);
            }
            &-item {
                a {
                    padding: 3rem 1rem 3.5rem;
                }
                svg, 
                img {
                    transform: scale(0.9);
                }
            }
        }
    }
}


@media (min-width: 1920px) {
    .tools {
        &-list li {
            flex-basis: calc(25% - 2rem);
        }
    }
}

@media (min-width: 2560px) {
    .tools {
        &-list li {
            flex-basis: calc(20% - 2rem);
        }
    }
}

</style>
