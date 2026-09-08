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
            :inert="installing ? '' : null"
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
            :inert="installing ? '' : null"
            v-for="(theme, index) in themes"
            :themeData="theme"
            :key="'theme-item-' + index" />

        <overlay
            v-if="themeIsOver || installing"
            appearance="drop-zone"
            :loading="installationLoading"
            :role="installing ? 'status' : null"
            :aria-live="installing ? 'polite' : null"
            :aria-atomic="installing ? 'true' : null">
            <div>{{ $t(installing ? 'theme.installingTheme' : 'theme.dropYourThemeHere') }}</div>
        </overlay>
    </div>
</template>

<script>
import ThemesListItem from './ThemesListItem';

export default {
    name: 'themes-list',
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
            if (!this.installing) {
                this.themeIsOver = true;
            }
        },
        hideOverlay (e) {
            if (e.target.classList.contains('themes')) {
                this.themeIsOver = false;
            }
        },
        uploadTheme (e) {
            this.themeIsOver = false;

            if (!this.installing && e.dataTransfer.files.length) {
                this.$emit('install', e.dataTransfer.files[0]);
            }
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
