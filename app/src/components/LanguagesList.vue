<template>
    <div
        @drop.stop.prevent="uploadLanguage"
        @dragleave.stop.prevent="hideOverlay"
        @dragenter.stop.prevent="showOverlay"
        @dragover.stop.prevent="showOverlay"
        @drag.stop.prevent="showOverlay"
        @dragstart.stop.prevent
        @dragend.stop.prevent
        :class="{ 'languages': true, 'language-is-over': languageIsOver }">
        <div
            :inert="installing ? '' : null"
            class="add-more-languages">
                <a href="https://languages.getpublii.com/" target="_blank" rel="noopener noreferrer">
                    <icon
                        customWidth="50"
                        customHeight="46"
                        non-interactive
                        name="add" />

                    <h3>{{ $t('langs.getMoreLanguages') }}</h3>
                </a>
        </div>

        <language-item
            :inert="installing ? '' : null"
            v-for="(language, index) in languages"
            :languageData="language"
            :key="'language-item-' + index" />

        <overlay
            v-if="languageIsOver || installing"
            appearance="drop-zone"
            :loading="installationLoading"
            :role="installing ? 'status' : null"
            :aria-live="installing ? 'polite' : null"
            :aria-atomic="installing ? 'true' : null">
            <div>{{ $t(installing ? 'langs.installingLanguage' : 'file.dropYourFileHere') }}</div>
        </overlay>
    </div>
</template>

<script>
import LanguagesListItem from './LanguagesListItem';

export default {
    name: 'languages-list',
    props: {
        installing: {
            type: Boolean,
            default: false
        },
        installationLoading: {
            type: Boolean,
            default: false
        }
    },
    data () {
        return {
            languageIsOver: false
        };
    },
    components: {
        'language-item': LanguagesListItem
    },
    computed: {
        languages () {
            let languagesList = JSON.parse(JSON.stringify(this.$store.getters.languages));
            let activeLanguageIndex = languagesList.findIndex(language => language.directory + '-' + language.type === this.activeLanguage);
            let activeLanguage = languagesList[activeLanguageIndex];
            languagesList.splice(activeLanguageIndex, 1);
            languagesList.splice(0, 0, activeLanguage);
            languagesList = languagesList.filter(language => !!language);

            return languagesList;
        },
        activeLanguage () {
            let language = this.$store.state.app.config.language;
            let languageType = this.$store.state.app.config.languageType;

            return [language, languageType].join('-');
        }
    },
    methods: {
        showOverlay (e) {
            if (!this.installing) {
                this.languageIsOver = true;
            }
        },
        hideOverlay (e) {
            if (e.target.classList.contains('languages')) {
                this.languageIsOver = false;
            }
        },
        uploadLanguage (e) {
            this.languageIsOver = false;

            if (!this.installing && e.dataTransfer.files.length) {
                this.$emit('install', e.dataTransfer.files[0]);
            }
        }
    }
}
</script>

<style scoped>

.languages {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--space-12);
    position: relative;
    user-select: none;

    &.language-is-over {
        & > * {
            pointer-events: none;
        }
    }
}

.add-more-languages {
    background-color: var(--bg-secondary);
    border: 1px solid transparent;
    border-radius: var(--radius-base);
    box-shadow: var(--shadow-sm);
    height: 100%;
    transition: var(--transition-default);
    text-align: center;

    &:hover {
         background: var(--bg-primary);
         border-color: var(--color-primary);
         box-shadow: var(--shadow-list-hover);

         svg {
             fill: var(--color-primary);
         }

         h3 {
             color: var(--color-primary);
         }
    }

    & > a {
         align-items: center;
         display: flex;
         flex-direction: column;
         height: 100%;
         justify-content: center;
         min-height: 29rem;
         width: 100%;
    }

    h3 {
         color: var(--text-primary-color);
         font-size: var(--font-size-ui-md);
         font-weight: var(--font-weight-medium);
         margin-bottom: 0;
         transition: inherit;
    }

    svg {
         fill: var(--icon-primary-color);
         transition: inherit;
    }
}
</style>
