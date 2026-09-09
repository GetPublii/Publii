<template>
    <figure
        @click="activateLanguage(directory, type)"
        :class="{
            'language': true,
            'is-active': isActiveLanguage,
            'is-outdated': isOutdated
        }">
        <span class="language-thumbnail-wrapper">
            <img
                :src="thumbnail"
                class="language-thumbnail"
                alt="">
        </span>

        <figcaption class="language-name extension-card-caption">
            <h3>
                <span>{{ name }}</span>
                <span class="language-version extension-card-version">
                    {{ version }}
                </span>
                <span 
                    v-if="isOutdated"
                    class="language-is-outdated"
                    tabindex="0"
                    v-tooltip="$t('langs.isOutdatedTitle', { supportedVersion: languageData.publiiSupport, currentVersion: $store.state.app.versionInfo.version })">
                    {{ $t('langs.isOutdated') }}
                </span>
             </h3>
            <button
                v-if="type === 'installed' && !isActiveLanguage"
                type="button"
                class="language-delete extension-card-delete"
                v-tooltip="{ text: $t('langs.deleteLanguage'), describe: false }"
                :aria-label="$t('langs.deleteLanguage')"
                @click.stop.prevent="deleteLanguage(name, directory)">
                    <icon
                        size="xs"
                        non-interactive
                        aria-hidden="true"
                        name="trash" />
            </button>
        </figcaption>
    </figure>
</template>

<script>
import escapeHTML from '../helpers/escape-html.js';
import Tooltip from '../helpers/tooltip.js';
import Vue from 'vue';
import compare from 'node-version-compare';

export default {
    directives: {
        tooltip: Tooltip
    },
    name: 'languages-list-item',
    props: [
        'languageData'
    ],
    computed: {
        isActiveLanguage () {
            let language = this.$store.state.app.config.language;
            let languageType = this.$store.state.app.config.languageType;

            if (this.languageData.directory === language && this.languageData.type === languageType) {
                return true;
            }

            return false;
        },
        isOutdated () {
            /*
            let publiiSupport = this.languageData.publiiSupport.split('.').slice(0, 2).join('.');
            let currentMajorVersion = this.$store.state.app.versionInfo.version.split('.').slice(0, 2).join('.');
           
            if (compare(publiiSupport, currentMajorVersion) === -1) {
                return true;
            }
            */

            return false;
        },
        thumbnail () {
            return this.languageData.thumbnail;
        },
        name () {
            return this.languageData.name;
        },
        directory () {
            return this.languageData.directory;
        },
        version () {
            return this.languageData.version;
        },
        type () {
            return this.languageData.type;
        }
    },
    methods: {
        deleteLanguage (languageName, languageDirectory) {
            let confirmConfig = {
                message: this.$t('langs.removeLanguageMessage', {
                    languageName: escapeHTML(languageName)
                }),
                okLabel: this.$t('langs.deleteLanguage'),
                isDanger: true,
                okClick: function() {
                    mainProcessAPI.send('app-language-delete', {
                        name: languageName,
                        directory: languageDirectory
                    });

                    mainProcessAPI.receiveOnce('app-language-deleted', (data) => {
                        this.$bus.$emit('message-display', {
                            message: this.$t('langs.removeLanguageSuccessMessage'),
                            type: 'success',
                            lifeTime: 3
                        });

                        this.$store.commit('replaceAppLanguages', data.languages);
                    });
                }
            };

            this.$bus.$emit('confirm-display', confirmConfig);
        },
        async activateLanguage (name, type) {
            if (this.isActiveLanguage) {
                return;
            }

            let results = await mainProcessAPI.invoke('app-main-load-language', name, type);

            if (results.languageChanged) {
                this.$store.commit('setAppLanguage', results.lang);
                this.$store.commit('setAppLanguageType', results.type);
                this.$i18n.setLocaleMessage(results.lang, results.translations);
                this.$i18n.locale = results.lang;

                if (results.momentLocale) {
                    this.$moment.locale(results.momentLocale);
                }

                this.$store.commit('setWysiwygTranslation', results.wysiwygTranslation);

                this.$bus.$emit('message-display', {
                    message: this.$t('langs.languageChangedMsg'),
                    type: 'success',
                    lifeTime: 3
                });
            } else {
                this.$bus.$emit('alert-display', {
                    message: this.$t('langs.languageChangeError'),
                    buttonStyle: 'danger'
                });
            }
        }
    }
}
</script>

<style scoped>
@import "../css/extension-card.css";

.language {
    background-color: var(--bg-secondary);
    border: 1px solid transparent;
    border-radius: var(--radius-base);
    box-shadow: var(--shadow-sm);
    cursor: default;  
    height: 100%;
    margin: 0;
    overflow: hidden;
    padding: var(--space-4);
    position: relative;
    transition: var(--transition-default);
    text-align: center;

    &:hover:not(.is-active) {
        background: var(--bg-primary);
        border-color: var(--color-primary);
        box-shadow: var(--shadow-md);
        cursor: pointer;

        a {
            color: var(--color-primary);
        }
    }

    &.is-active {
        background: var(--button-secondary-bg);
    }

    &.is-outdated {
       .language-version {
           text-decoration-color: var(--color-danger);
           text-decoration-line: line-through;
       }
    }
}

.language-thumbnail {
    display: block;
    max-height: 90%;
    left: 50%;
    position: absolute;
    top: 50%;
    transform: translateX(-50%) translateY(-50%);
    max-width: 90%;
}

.language-thumbnail-wrapper {
    display: block;
    padding-bottom: 75%;
    position: relative;
    transition: var(--transition-default);
    width: 100%;
}

.language-name {
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

.language-version,
.language-is-outdated {
    color: var(--text-light-color);
    font-size: var(--font-size-ui-xs);
    font-weight: var(--font-weight-regular);
    
}

.language-is-outdated { 
    color: var(--color-danger);
    margin: 0 var(--space-16) 0 var(--space-2);
    text-transform: uppercase;
}

.language-is-outdated:focus-visible {
    outline: 2px solid var(--input-border-focus);
    outline-offset: 2px;
}
</style>
