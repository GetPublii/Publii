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

        <figcaption class="language-name">
            <h3>
                <span>{{ name }}</span>
                <span class="language-version">
                    {{ version }}
                </span>
                <span 
                    v-if="isOutdated"
                    class="language-is-outdated"
                    :title="$t('langs.isOutdatedTitle', { supportedVersion: languageData.publiiSupport, currentVersion: this.$store.state.app.versionInfo.version })">
                    {{ $t('langs.isOutdated') }}
                </span>
             </h3>
            <a
                v-if="type === 'installed' && !isActiveLanguage"
                href="#"
                class="language-delete"
                :title="$t('langs.deleteLanguage')"
                @click.stop.prevent="deleteLanguage(name, directory)">
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
                message: this.$t('langs.removeLanguageMessage', { languageName }),
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

<style lang="scss" scoped>
@import '../scss/variables.scss';

.language {
    background-color: var(--bg-secondary);
    border: 1px solid transparent;
    border-radius: var(--border-radius);
    box-shadow: var(--box-shadow-small); 
    cursor: default;  
    height: 100%;
    margin: 0;
    overflow: hidden;
    padding: 1rem;
    position: relative;
    transition: var(--transition);
    text-align: center;

    &:hover:not(.is-active) {
        background: var(--bg-primary);
        border-color: var(--color-primary);
        box-shadow: var(--box-shadow-medium);  
        cursor: pointer;

        a {
            color: var(--color-primary);
        }
    }

    &.is-active {
        background: var(--button-secondary-bg);
    }

    &-thumbnail {
        display: block;
        max-height: 90%;
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
        display: inline-flex;
        justify-content: center;
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

    &-version,
    &-is-outdated {
        color: var(--text-light-color);
        font-size: 1.2rem;
        font-weight: var(--font-weight-normnal);
        
    }

    &-is-outdated { 
        color: var(--warning);
        margin: 0 4rem 0 .5rem;
        text-transform: uppercase;
    }

    &.is-outdated {
       .language-version {
           text-decoration-color: var(--warning);
           text-decoration-line: line-through;
       }
    }
}
</style>
