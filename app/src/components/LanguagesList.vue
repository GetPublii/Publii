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
            class="add-more-languages">
                <a href="https://languages.getpublii.com/" target="_blank" rel="noopener noreferrer">
                    <icon
                        customWidth="50"
                        customHeight="46"
                        properties="not-clickable"
                        name="add" />

                    <h3>{{ $t('langs.getMoreLanguages') }}</h3>
                </a>
        </div>

        <language-item
            v-for="(language, index) in languages"
            :languageData="language"
            :key="'language-item-' + index" />

        <overlay
            v-if="languageIsOver"
            :hasBorder="true"
            :isBlue="true">
            <div>{{ $t('file.dropYourFileHere') }}</div>
        </overlay>
    </div>
</template>

<script>
import LanguagesListItem from './LanguagesListItem';

export default {
    name: 'languages-list',
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
            this.languageIsOver = true;
        },
        hideOverlay (e) {
            if (e.target.classList.contains('languages')) {
                this.languageIsOver = false;
            }
        },
        uploadLanguage (e) {
            this.languageIsOver = false;

            mainProcessAPI.send('app-language-upload', {
                sourcePath: e.dataTransfer.files[0].path
            });

            mainProcessAPI.receiveOnce('app-language-uploaded', this.$parent.uploadedLanguage);
        }
    }
}
</script>

<style lang="scss" scoped>
@import '../scss/variables.scss';

.languages {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 3rem;
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
    border-radius: var(--border-radius);
    box-shadow: var(--box-shadow-small);      
    height: 100%;
    transition: var(--transition);
    text-align: center;

    &:hover {
         background: var(--bg-primary);
         border-color: var(--color-primary);
         box-shadow: 0 0 26px rgba(black, .07);

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
         font-size: $app-font-base;
         font-weight: var(--font-weight-semibold);
         margin-bottom: 0;
         transition: inherit;
    }

    svg {
         fill: var(--icon-primary-color);
         transition: inherit;
    }
}
</style>
