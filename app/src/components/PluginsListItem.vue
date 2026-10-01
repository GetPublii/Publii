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

        <figcaption class="plugin-caption">
            <div class="plugin-name extension-card-caption">
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
            </div>

            <div
                v-if="hasUpdateAvailable"
                class="plugin-update">
                <div class="plugin-update-heading">
                    <span class="plugin-update-icon">
                        <icon
                            customWidth="18"
                            customHeight="18"
                            non-interactive
                            aria-hidden="true"
                            name="refresh" />
                    </span>
                    <div class="plugin-update-details">
                        <strong class="plugin-update-title">
                            {{ $t('theme.groupUpdateAvailable') }}
                        </strong>
                        <span class="plugin-update-version">
                            {{ $t('notifications.latestVersion') }}: {{ updateVersion }}
                        </span>
                    </div>
                </div>

                <p-button
                    v-if="updateDownloadLink"
                    class="plugin-update-download"
                    intent="primary"
                    size="small"
                    width="full"
                    :onClick="downloadUpdate">
                    {{ $t(updateIsFree ? 'notifications.downloadUpdate' : 'theme.openMyDownloads') }}
                </p-button>
            </div>
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
        availablePlugin () {
            if (!this.notifications || !this.notifications.plugins) {
                return null;
            }

            return this.notifications.plugins[this.directory] || null;
        },
        updateVersion () {
            return this.availablePlugin ? this.availablePlugin.version : '';
        },
        updateDownloadLink () {
            if (!this.availablePlugin || !this.availablePlugin.links || !this.availablePlugin.links.download) {
                return '';
            }

            return this.availablePlugin.links.download;
        },
        updateIsFree () {
            return !this.availablePlugin || this.availablePlugin.free !== false;
        },
        hasUpdateAvailable () {
            if (!this.availablePlugin) {
                return false;
            }

            return VersionComparator(String(this.availablePlugin.version), String(this.version)) === 1;
        }
    },
    methods: {
        downloadUpdate () {
            mainProcessAPI.shellOpenExternal(this.updateDownloadLink);
        },
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
    align-self: start;
    background-color: var(--bg-secondary);
    border: 1px solid transparent;
    border-radius: calc(var(--radius-base) * 1.5);
    box-shadow: var(--shadow-sm);
    display: grid;
    grid-template-rows: minmax(0, 1fr) auto;
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

.plugin::before {
    content: "";
    grid-area: 1 / 1 / 3 / 2;
    /* Keep the original card height while updates use the thumbnail space. */
    margin-bottom: 6rem;
    padding-bottom: 75%;
    pointer-events: none;
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
    grid-area: 1 / 1;
    min-height: 6rem;
    position: relative;
    transition: var(--transition-default);
    width: 100%;
}

.plugin-caption {
    align-self: end;
    background: var(--color-surface-subtle);
    border-radius: 0 0 var(--radius-base) var(--radius-base);
    grid-area: 2 / 1;
    position: relative;
    text-align: left;
}

.plugin-name {
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

.plugin-update {
    background: var(--button-secondary-bg);
    border-radius: var(--radius-base);
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
    margin: 0;
    padding: var(--space-6);
}

.plugin-update-heading {
    align-items: center;
    display: flex;
    gap: var(--space-4);
}

.plugin-update-icon {
    align-items: center;
    background: var(--button-secondary-bg-hover);
    border-radius: 50%;
    color: var(--button-secondary-color);
    display: flex;
    flex: 0 0 3.2rem;
    height: 3.2rem;
    justify-content: center;
}

.plugin-update-details {
    min-width: 0;
    overflow-wrap: anywhere;
}

.plugin-update-title {
    color: var(--headings-color);
    display: block;
    font-size: var(--font-size-ui-md);
    font-weight: var(--font-weight-medium);
}

.plugin-update-version {
    color: var(--text-light-color);
    display: block;
    font-size: var(--font-size-ui-xs);
    font-weight: var(--font-weight-regular);
}

.plugin-update-download {
    height: auto;
    min-height: var(--button-height-small);
    overflow-wrap: anywhere;
    padding: var(--space-2) var(--button-padding-inline-small);
    text-align: center;
    white-space: normal;
}

.plugin-is-incompatible:focus-visible {
    outline: 2px solid var(--input-border-focus);
    outline-offset: 2px;
}
</style>
