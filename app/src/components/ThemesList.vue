<template>
    <div
        @drop.stop.prevent="uploadTheme"
        @dragleave.stop.prevent="hideOverlay"
        @dragenter.stop.prevent="showOverlay"
        @dragover.stop.prevent="showOverlay"
        @drag.stop.prevent="showOverlay"
        @dragstart.stop.prevent
        @dragend.stop.prevent
        :class="{ 'themes': true, 'theme-is-over': themeIsOver }">
        <div
            class="add-more-theme">
                <a href="https://marketplace.getpublii.com/" target="_blank" rel="noopener noreferrer">
                    <icon
                        customWidth="50"
                        customHeight="46"
                        properties="not-clickable"
                        name="add" />

                    <h3>{{ $t('theme.getMoreThemes') }}</h3>
                </a>
        </div>

        <theme-item
            v-for="(theme, index) in themes"
            :themeData="theme"
            :key="'theme-item-' + index" />

        <overlay
            v-if="themeIsOver"
            :hasBorder="true"
            :isBlue="true">
            <div>{{ $t('theme.dropYourThemeHere') }}</div>
        </overlay>
    </div>
</template>

<script>
import ThemesListItem from './ThemesListItem';

export default {
    name: 'themes-list',
    data: function() {
        return {
            themeIsOver: false
        };
    },
    components: {
        'theme-item': ThemesListItem
    },
    computed: {
        themes () {
            return this.$store.getters.themes;
        }
    },
    methods: {
        showOverlay (e) {
            this.themeIsOver = true;
        },
        hideOverlay (e) {
            if (e.target.classList.contains('themes')) {
                this.themeIsOver = false;
            }
        },
        uploadTheme (e) {
            this.themeIsOver = false;

            mainProcessAPI.send('app-theme-upload', {
                sourcePath: e.dataTransfer.files[0].path
            });

            mainProcessAPI.receiveOnce('app-theme-uploaded', this.$parent.uploadedTheme);
        }
    }
}
</script>

<style lang="scss" scoped>
@import '../scss/variables.scss';

.themes {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 3rem;
    position: relative;
    user-select: none;

    &.theme-is-over {
        & > * {
            pointer-events: none;
        }
    }
}

.add-more-theme {
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
