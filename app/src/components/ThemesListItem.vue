<template>
    <figure class="theme">
        <img
            :src="thumbnail"
            class="theme-thumbnail"
            alt="">

        <figcaption class="theme-caption">
            <div class="theme-name extension-card-caption">
                <h3>
                    {{ name }}
                    <span class="theme-version extension-card-version">
                        {{ version }}
                    </span>
                </h3>
                <button
                    type="button"
                    class="theme-delete extension-card-delete"
                    v-tooltip="{ text: $t('theme.deleteTheme'), describe: false }"
                    :aria-label="$t('theme.deleteTheme')"
                    @click.stop.prevent="deleteTheme(name, directory)">
                    <icon
                        size="xs"
                        non-interactive
                        aria-hidden="true"
                        name="trash" />
                </button>
            </div>

            <div
                v-if="hasUpdateAvailable"
                class="theme-update">
                <div class="theme-update-heading">
                    <span class="theme-update-icon">
                        <icon
                            customWidth="18"
                            customHeight="18"
                            non-interactive
                            aria-hidden="true"
                            name="refresh" />
                    </span>
                    <div class="theme-update-details">
                        <strong class="theme-update-title">
                            {{ $t('theme.groupUpdateAvailable') }}
                        </strong>
                        <span class="theme-update-version">
                            {{ $t('notifications.latestVersion') }}: {{ updateVersion }}
                        </span>
                    </div>
                </div>

                <p-button
                    v-if="updateDownloadLink"
                    class="theme-update-download"
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
    name: 'themes-list-item',
    props: [
        'themeData'
    ],
    computed: {
        ...mapGetters([
            'notifications'
        ]),
        thumbnail () {
            return this.themeData.thumbnail;
        },
        name () {
            return this.themeData.name;
        },
        directory () {
            return this.themeData.directory;
        },
        version () {
            return this.themeData.version;
        },
        availableTheme () {
            if (!this.notifications || !this.notifications.themes) {
                return null;
            }

            return this.notifications.themes[this.directory] || null;
        },
        updateVersion () {
            return this.availableTheme ? this.availableTheme.version : '';
        },
        updateDownloadLink () {
            if (!this.availableTheme || !this.availableTheme.links || !this.availableTheme.links.download) {
                return '';
            }

            return this.availableTheme.links.download;
        },
        updateIsFree () {
            return !this.availableTheme || this.availableTheme.free !== false;
        },
        hasUpdateAvailable () {
            if (!this.availableTheme) {
                return false;
            }

            return VersionComparator(String(this.availableTheme.version), String(this.version)) === 1;
        }
    },
    methods: {
        downloadUpdate () {
            mainProcessAPI.shellOpenExternal(this.updateDownloadLink);
        },
        deleteTheme: function(themeName, themeDirectory) {
            let confirmConfig = {
                message: this.$t('theme.removeThemeMessage', {
                    themeName: escapeHTML(themeName)
                }),
                okLabel: this.$t('theme.deleteTheme'),
                isDanger: true,
                okClick: function() {
                    mainProcessAPI.send('app-theme-delete', {
                        name: themeName,
                        directory: themeDirectory
                    });

                    mainProcessAPI.receiveOnce('app-theme-deleted', (data) => {
                        this.$bus.$emit('message-display', {
                            message: this.$t('theme.removeThemeSuccessMessage'),
                            type: 'success',
                            lifeTime: 3
                        });

                        this.$store.commit('replaceAppThemes', data.themes);
                        this.$store.commit('updateSiteThemes');
                    });
                }
            };

            this.$bus.$emit('confirm-display', confirmConfig);
        }
    }
}
</script>

<style scoped>
@import "../css/extension-card.css";

.theme {
    align-self: start;
    background-color: var(--bg-secondary);
    border: 1px solid transparent;
    border-radius: calc(var(--radius-base) * 1.5);
    box-shadow: var(--shadow-sm);
    display: grid;
    margin: 0;
    overflow: hidden;
    padding: var(--space-4);
    position: relative;
    transition: var(--transition-default);
    text-align: center;
}

.theme-thumbnail {
    display: block;
    grid-area: 1 / 1;
    height: auto;
    /* Reserve the original name/version row; updates overlap the thumbnail. */
    margin-bottom: 6rem;
    max-width: 100%;
}

.theme-caption {
    align-self: end;
    background: var(--color-surface-subtle);
    border-radius: 0 0 var(--radius-base) var(--radius-base);
    grid-area: 1 / 1;
    position: relative;
    text-align: left;
}

.theme-name > h3 {
    font-size: var(--font-size-ui-md);
    font-weight: var(--font-weight-medium);
    line-height: 1.4;
    margin: 1.2rem 0;
}

.theme-version {
    color: var(--text-light-color);
    font-size: var(--font-size-ui-xs);
    font-weight: var(--font-weight-regular);
}

.theme-update {
    background: var(--button-secondary-bg);
    border-radius: var(--radius-base);
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
    margin: 0;
    padding: var(--space-6);
}

.theme-update-heading {
    align-items: center;
    display: flex;
    gap: var(--space-4);
}

.theme-update-icon {
    align-items: center;
    background: var(--button-secondary-bg-hover);
    border-radius: 50%;
    color: var(--button-secondary-color);
    display: flex;
    flex: 0 0 3.2rem;
    height: 3.2rem;
    justify-content: center;
}

.theme-update-details {
    min-width: 0;
    overflow-wrap: anywhere;
}

.theme-update-title {
    color: var(--headings-color);
    display: block;
    font-size: var(--font-size-ui-md);
    font-weight: var(--font-weight-medium);
}

.theme-update-version {
    color: var(--text-light-color);
    display: block;
    font-size: var(--font-size-ui-xs);
    font-weight: var(--font-weight-regular);
}

.theme-update-download {
    height: auto;
    min-height: var(--button-height-small);
    overflow-wrap: anywhere;
    padding: var(--space-2) var(--button-padding-inline-small);
    text-align: center;
    white-space: normal;
}
</style>
