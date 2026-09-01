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
                        non-interactive
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
            appearance="drop-zone">
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
        async uploadTheme (e) {
            this.themeIsOver = false;

            mainProcessAPI.send('app-theme-upload', {
                sourcePath: await mainProcessAPI.normalizePath(await mainProcessAPI.getPathForFile(e.dataTransfer.files[0]))
            });

            mainProcessAPI.receiveOnce('app-theme-uploaded', this.$parent.uploadedTheme);
        }
    }
}
</script>

<style scoped>

.themes {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--space-12);
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
