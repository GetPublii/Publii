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

        <figcaption class="plugin-name extension-card-caption">
            <h3>
                <span>{{ name }}</span>
                <span class="plugin-version extension-card-version">
                    {{ version }}
                </span>
                <span 
                    v-if="isIncompatible"
                    class="plugin-is-incompatible"
                    tabindex="0"
                    v-tooltip="$t('plugins.isIncompatibleTitle', { supportedVersion: pluginData.minimumPubliiVersion, currentVersion: $store.state.app.versionInfo.version })">
                    {{ $t('plugins.isIncompatible') }}
                </span>
             </h3>
            <button
                type="button"
                class="plugin-delete extension-card-delete"
                v-tooltip="{ text: $t('plugins.deletePlugin'), describe: false }"
                :aria-label="$t('plugins.deletePlugin')"
                :aria-busy="isCheckingUsage ? 'true' : null"
                @click.stop.prevent="deletePlugin(name, directory)">
                    <icon
                        size="xs"
                        non-interactive
                        aria-hidden="true"
                        name="trash" />
            </button>

            <span 
                v-if="hasUpdateAvailable"
                class="plugin-new-version-available">
                {{ $t('plugins.newVersionAvailable') }}: <strong>{{ updateVersion }}</strong>   
            </span>
        </figcaption>
    </figure>
</template>

<script>
import escapeHTML from '../helpers/escape-html.js';
import Tooltip from '../helpers/tooltip.js';
import { mapGetters } from 'vuex';
import VersionComparator from '../../shared/version-comparator';

export default {
    directives: {
        tooltip: Tooltip
    },
    name: 'plugins-list-item',
    props: [
        'pluginData'
    ],
    data () {
        return {
            isCheckingUsage: false,
            usageCheckDisposed: false
        };
    },
    computed: {
        ...mapGetters([
            'notifications'
        ]),
        isIncompatible () {
            if (VersionComparator(this.pluginData.minimumPubliiVersion, this.$store.state.app.versionInfo.version) === 1) {
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
        },
        updateVersion () {
            let availablePlugin = this.notifications.plugins[this.directory];

            if (!availablePlugin) {
                return '';
            }

            return availablePlugin.version;
        },
        hasUpdateAvailable () {
            if (!this.notifications || !this.notifications.plugins) {
                return false;
            }

            let availablePlugin = this.notifications.plugins[this.directory];

            if (!availablePlugin) {
                return false;
            }

            return VersionComparator(availablePlugin.version, this.version) === 1;
        }
    },
    methods: {
        async deletePlugin (pluginName, pluginDirectory) {
            if (this.isCheckingUsage || this.usageCheckDisposed) {
                return;
            }

            this.isCheckingUsage = true;
            let usage;

            try {
                usage = await mainProcessAPI.invoke('app-plugin:get-usage', {
                    pluginName: pluginDirectory
                });
            } catch (error) {
                usage = null;
            } finally {
                this.isCheckingUsage = false;
            }

            if (this.usageCheckDisposed) {
                return;
            }

            if (usage && usage.code === 'settings-open') {
                const sites = usage.sites || [];
                const messageKey = sites.length === 1
                    ? 'plugins.settingsOpen'
                    : 'plugins.settingsOpenMultiple';

                this.$bus.$emit('alert-display', {
                    message: this.$t(messageKey, {
                        sites: sites.map(site => '<strong>' + escapeHTML(site) + '</strong>').join(', ')
                    })
                });
                return;
            }

            let message = this.$t('plugins.removePluginMessage', {
                pluginName: escapeHTML(pluginName)
            });
            const usageKnown = usage && usage.status === true && Array.isArray(usage.sites);
            const sites = usageKnown ? usage.sites.slice().sort((a, b) => a.localeCompare(b)) : [];

            if (!usageKnown) {
                message += '<br><br>' + this.$t('plugins.usageCheckError');
            } else if (!sites.length) {
                message += '<br><br>' + this.$t('plugins.notEnabledOnAnyWebsite');
            }

            const confirmConfig = {
                dialogLabel: this.$t('plugins.deletePlugin'),
                message,
                detailsLabel: sites.length ? this.$t('plugins.enabledWebsites', { count: sites.length }) : '',
                details: sites,
                okLabel: this.$t('plugins.deletePlugin'),
                isDanger: true,
                okClick: () => {
                    mainProcessAPI.receiveOnce('app-plugin-deleted', (data) => {
                        if (!data || data.status !== true) {
                            const settingsOpen = data && data.code === 'settings-open';
                            const sites = (data && data.sites) || [];
                            const messageKey = sites.length === 1
                                ? 'plugins.settingsOpen'
                                : 'plugins.settingsOpenMultiple';

                            this.$bus.$emit('alert-display', {
                                message: settingsOpen ? this.$t(messageKey, {
                                    sites: sites.map(site => '<strong>' + escapeHTML(site) + '</strong>').join(', ')
                                }) : this.$t('plugins.removePluginErrorMessage'),
                                buttonStyle: settingsOpen ? 'normal' : 'danger'
                            });
                            return;
                        }

                        this.$bus.$emit('message-display', {
                            message: this.$t('plugins.removePluginSuccessMessage'),
                            type: 'success',
                            lifeTime: 3
                        });

                        this.$store.commit('replaceAppPlugins', data.plugins);
                    });

                    mainProcessAPI.send('app-plugin-delete', {
                        name: pluginName,
                        directory: pluginDirectory
                    });
                }
            };

            this.$bus.$emit('confirm-display', confirmConfig);
        }
    },
    beforeDestroy () {
        this.usageCheckDisposed = true;
    }
}
</script>

<style scoped>
@import "../css/extension-card.css";

.plugin {
    background-color: var(--bg-secondary);
    border: 1px solid transparent;
    border-radius: calc(var(--radius-base) * 1.5);
    box-shadow: var(--shadow-sm);
    height: 100%;
    margin: 0;
    overflow: hidden;
    padding: var(--space-4);
    position: relative;
    transition: var(--transition-default);
    text-align: center;

    &.is-incompatible {
       .plugin-version {
           text-decoration-color: var(--color-danger);
           text-decoration-line: line-through;
       }
    }
}

.plugin-thumbnail {
    display: block;
    max-height: 50%;
    left: 50%;
    position: absolute;
    top: 50%;
    transform: translateX(-50%) translateY(-50%);
    max-width: 90%;
}

.plugin-thumbnail-wrapper {
    display: block;
    padding-bottom: 75%;
    position: relative;
    transition: var(--transition-default);
    width: 100%;
}

.plugin-name {
    background: var(--color-surface-subtle);
    border-radius: 0 0 4px 4px;
    text-align: left;

    & > h3 {
         font-size: var(--font-size-ui-md);
         font-weight: var(--font-weight-medium);
         line-height: 1.4;
         margin: 1.2rem 0;

         span:first-of-type {
             display: block;
         }
    }
}

.plugin-version {
    color: var(--text-light-color);
    font-size: var(--font-size-ui-xs);
    font-weight: var(--font-weight-regular);
}

.plugin-version,
.plugin-is-incompatible {
    color: var(--text-light-color);
    font-size: var(--font-size-ui-xs);
    font-weight: var(--font-weight-regular);
}

.plugin-is-incompatible {
    color: var(--color-danger);
    margin: 0 var(--space-16) 0 var(--space-2);
    text-transform: uppercase;
}

.plugin-new-version-available {
    background: var(--color-highlight-surface);
    left: 1rem;
    padding: var(--space-8);
    position: absolute;
    right: 0;
    top: 1rem;
    width: calc(100% - 2rem);

    strong {
        color: var(--headings-color);
    }
}

.plugin-is-incompatible:focus-visible {
    outline: 2px solid var(--input-border-focus);
    outline-offset: 2px;
}
</style>
