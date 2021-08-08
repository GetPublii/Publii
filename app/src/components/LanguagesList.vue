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
            :key="index" />

        <overlay
            v-if="languageIsOver"
            :hasBorder="true"
            :isBlue="true">
            <div>{{ $t('langs.dropYourLanguageHere') }}</div>
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
    grid-gap: 5rem 3rem;
    overflow: hidden;
    position: relative;
    user-select: none;

    &.language-is-over {
        & > * {
            pointer-events: none;
        }
    }
}

.add-more-languages {
    background: var(--gray-1);
    border: 1px solid transparent;
    border-radius: 4px;
    margin: 0;
    transition: var(--transition);

    &:hover {
         background: var(--bg-primary);
         border-color: var(--secondary-color);
         box-shadow: 0 0 26px rgba(black, .07);

         svg {
             fill: var(--primary-color);
         }

         h3 {
             color: var(--primary-color);
         }
    }

    & > a {
         align-items: center;
         display: flex;
         flex-direction: column;
         height: 100%;
         justify-content: center;
         width: 100%;
    }

    h3 {
         color: var(--text-primary-color);
         font-size: 1.6rem;
         font-weight: 500;
         margin-bottom: 0;
         transition: inherit;
    }

    svg {
         fill: var(--gray-5);
         transition: inherit;
    }
}
</style>
