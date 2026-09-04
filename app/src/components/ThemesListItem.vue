<template>
    <figure class="theme">
        <img
            :src="thumbnail"
            class="theme-thumbnail"
            alt="">

        <figcaption class="theme-name">
            <h3>
                {{ name }}
                <span class="theme-version">
                    {{ version }}
                </span>
             </h3>
            <a
                href="#"
                class="theme-delete"
                :title="$t('theme.deleteTheme')"
                @click.stop.prevent="deleteTheme(name, directory)">
                    <icon
                        size="xs"
                        non-interactive
                        name="trash" />
            </a>

            <span
                v-if="hasUpdateAvailable"
                class="theme-new-version-available">
                {{ $t('theme.newVersionAvailable') }}: <strong>{{ updateVersion }}</strong>
                <a
                    v-if="updateDownloadLink"
                    href="#"
                    @click.prevent="downloadUpdate">
                    {{ $t(updateIsFree ? 'notifications.downloadUpdate' : 'theme.openMyDownloads') }}
                </a>
            </span>
        </figcaption>
    </figure>
</template>

<script>
import { mapGetters } from 'vuex';
import VersionComparator from '../helpers/version-comparator';

export default {
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
                message: this.$t('theme.removeThemeMessage', { themeName }),
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

.theme {
    background-color: var(--bg-secondary);
    border: 1px solid transparent;
    border-radius: var(--radius-base);
    box-shadow: var(--shadow-sm);
    height: 100%;
    margin: 0;
    overflow: hidden;
    padding: var(--space-4);
    position: relative;
    transition: var(--transition-default);
    text-align: center
}

.theme-thumbnail {
    display: block;
    height: auto;
    max-width: 100%;
}

.theme-delete {
    align-items: center;
    background: var(--bg-primary);
    border-radius: 50%;
    height: 3rem;
    justify-content: center;
    display: inline-flex;
    position: absolute;
    right: 2rem;
    text-align: center;
    width: 3rem;

    & > svg {
         fill: var(--icon-secondary-color);
         transform: scale(.9);
         transition: var(--transition-default);
    }

    &:hover {
         & > svg {
            fill: var(--color-danger);
            transform: scale(1);
         }
    }
}

.theme-name {
    align-items: center;
    background: var(--color-surface-subtle);
    border-radius: 0 0 4px 4px;
    display: flex;
    justify-content: space-between;
    padding: 0 var(--space-8);
    text-align: left;

    & > h3 {
         font-size: var(--font-size-ui-md);
         font-weight: var(--font-weight-medium);
         line-height: 1.4;
         margin: 1.2rem 0;
    }
}

.theme-version {
    color: var(--text-light-color);
    display: block;
    font-size: var(--font-size-ui-xs);
    font-weight: var(--font-weight-regular);
    margin: 0 var(--space-16) 0 auto;
}

.theme-new-version-available {
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

    a {
        color: var(--link-primary-color);
        font-weight: var(--font-weight-medium);
        margin-left: var(--space-2);

        &:hover {
            color: var(--link-primary-color-hover);
        }
    }
}
</style>
