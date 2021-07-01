<template>
    <figure 
        @click="activateLanguage(directory, type)"
        class="language">
        <span class="language-thumbnail-wrapper">
            <img
                :src="thumbnail"
                class="language-thumbnail"
                alt="">
        </span>

        <figcaption class="language-name">
            <h3>
                {{ name }}
                <span class="language-version">
                    {{ version }}
                </span>
             </h3>
            <a
                v-if="type === 'installed'"
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

export default {
    name: 'languages-list-item',
    props: [
        'languageData'
    ],
    computed: {
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
                message: this.$t('langs.removeLanguageMessagePT1') + languageName + this.$t('langs.removeLanguageMessagePT2'),
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
            let results = await mainProcessAPI.invoke('app-main-load-language', name, type);
            
            if (results.languageChanged) {
                this.$store.commit('setAppLanguage', results.lang);
                this.$i18n.setLocaleMessage(results.lang, results.translations);
                this.$i18n.locale = results.lang;

                if (results.momentLocale) {
                    this.$moment.locale(results.momentLocale);
                }
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
}
</style>
