<template>
    <section class="content tools-custom-css">
        <p-header :title="$t('tools.css.customCSS')">
            <p-button
                @click.native="goBack"
                slot="buttons"
                type="clean back"
                :disabled="buttonsLocked">
                {{ $t('ui.backToTools') }}
            </p-button>

            <p-button
                @click.native="save(false, false)"
                slot="buttons"
                type="secondary"
                :disabled="buttonsLocked">
                {{ $t('ui.saveChanges') }}
            </p-button>

            <btn-dropdown
                slot="buttons"
                buttonColor="green"
                :items="dropdownItems"
                :disabled="!siteHasTheme || buttonsLocked"
                :previewIcon="true"
                localStorageKey="publii-preview-mode"
                defaultValue="full-site-preview" />
        </p-header>

        <div :class="{ 'editor-wrapper': true, 'is-active': true }">
            <codemirror-editor
                id="custom-css-editor-normal"
                ref="codemirrorNormal"
                mode="css"
                editorLoadedEventName="custom-css-editor-loaded">
            </codemirror-editor>
        </div>

        <small class="editor-note">
            <span>
                {{ $t('tools.find') }}
                <template v-if="!isMac">{{ $t('tools.findShortcut') }}</template>
                <template v-if="isMac">{{ $t('tools.findShortcutMac') }}</template>
            </span>
            <span>
                {{ $t('tools.findAndReplace') }}
                <template v-if="!isMac">{{ $t('tools.findAndReplaceShortcut') }}</template>
                <template v-if="isMac">{{ $t('tools.findAndReplaceShortcutMac') }}</template>
            </span>
        </small>
    </section>
</template>

<script>
import BackToTools from './mixins/BackToTools.js';

export default {
    name: 'custom-css',
    mixins: [
        BackToTools
    ],
    watch: {
        filterValue (newValue) {
            setTimeout(() => {
                if (newValue === 'normal') {
                    this.$refs.codemirrorNormal.editor.refresh();
                }
            }, 0);
        }
    },
    data: function() {
        return {
            buttonsLocked: false,
            filterValue: 'normal',
            editorValueNormal: `/*
 * ${this.$t('tools.css.putCustomCSSComment')}
 */`
        };
    },
    computed: {
        siteHasTheme: function() {
            return !!this.$store.state.currentSite.config.theme;
        },
        isMac: function () {
            return mainProcessAPI.getEnv().platformName === 'darwin';
        },
        dropdownItems () {
            return [
                {
                    label: this.$t('ui.previewFullWebsite'),
                    activeLabel: this.$t('ui.saveAndPreview'),
                    value: 'full-site-preview',
                    isVisible: () => true,
                    icon: 'full-preview-monitor',
                    onClick: this.saveAndPreview.bind(this, 'full-site')
                },
                {
                    label: this.$t('ui.renderFullWebsite'),
                    activeLabel: this.$t('ui.saveAndRender'),
                    value: 'full-site-render',
                    isVisible: () => !!this.$store.state.app.config.enableAdvancedPreview,
                    icon: 'full-render-monitor',
                    onClick: this.saveAndRender.bind(this, 'full-site')
                },
                {
                    label: this.$t('ui.previewFrontPageOnly'),
                    activeLabel: this.$t('ui.saveAndPreview'),
                    value: 'homepage-preview',
                    icon: 'quick-preview',
                    isVisible: () => true,
                    onClick: this.saveAndPreview.bind(this, 'homepage')
                },
                {
                    label: this.$t('ui.renderFrontPageOnly'),
                    activeLabel: this.$t('ui.saveAndRender'),
                    value: 'homepage-render',
                    icon: 'quick-render',
                    isVisible: () => !!this.$store.state.app.config.enableAdvancedPreview,
                    onClick: this.saveAndRender.bind(this, 'homepage')
                }
            ];
        }
    },
    mounted: function() {
        this.$bus.$on('custom-css-editor-loaded', () => {
            this.initEditor();
        });
    },
    methods: {
        initEditor: function() {
            mainProcessAPI.send('app-site-css-load', {
                site: this.$store.state.currentSite.config.name
            });

            mainProcessAPI.receiveOnce('app-site-css-loaded', (data) => {
                if (data.normal !== false) {
                    this.editorValueNormal = data.normal;
                }

                this.$refs.codemirrorNormal.editor.setValue(this.editorValueNormal);
                this.$refs.codemirrorNormal.editor.refresh();
            });
        },
        save (showPreview = false, renderingType = false, renderFiles = false) {
            this.$refs.codemirrorNormal.editor.save();
            
            mainProcessAPI.send('app-site-css-save', {
                site: this.$store.state.currentSite.config.name,
                code: {
                    normal: document.getElementById('custom-css-editor-normal').value
                }
            });

            mainProcessAPI.receiveOnce('app-site-css-saved', (data) => {
                this.saved(showPreview, renderingType, renderFiles);
            });
        },
        saveAndPreview (renderingType = false) {
            this.$bus.$emit('theme-settings-before-save');

            setTimeout(() => {
                this.save(true, renderingType, false);
            }, 500);
        },
        saveAndRender (renderingType = false) {
            this.$bus.$emit('theme-settings-before-save');

            setTimeout(() => {
                this.save(true, renderingType, true);
            }, 500);
        },
        async saved (showPreview, renderingType = false, renderFiles = false) {
            this.$bus.$emit('message-display', {
                message: this.$t('tools.css.customCSSSaveSuccessMsg'),
                type: 'success',
                lifeTime: 3
            });

            if (showPreview) {
                let previewLocationExists = await mainProcessAPI.existsSync(this.$store.state.app.config.previewLocation);

                if (this.$store.state.app.config.previewLocation !== '' && !previewLocationExists) {
                    this.$bus.$emit('confirm-display', {
                        message: this.$t('sync.previewCatalogDoesNotExistInfo'),
                        okLabel: this.$t('sync.goToAppSettings'),
                        okClick: () => {
                            this.$router.push(`/app-settings/`);
                        }
                    });
                    return;
                }

                if (renderingType === 'homepage') {
                    this.$bus.$emit('rendering-popup-display', {
                        homepageOnly: true,
                        showPreview: !renderFiles
                    });
                } else {
                    this.$bus.$emit('rendering-popup-display', {
                        showPreview: !renderFiles
                    });
                }
            }
        },
        filterCssClasses (type) {
            return {
                'filter-value': true,
                'filter-active': this.filterValue === type
            };
        },
        setFilter (newValue) {
            this.filterValue = newValue;
        }
    },
    beforeDestroy () {
        this.$bus.$off('custom-css-editor-loaded');
    }
}
</script>

<style lang="scss" scoped>
@import '../scss/variables.scss';

.editor-note {
    color: var(--gray-4);
    display: block;
    margin-top: 2rem;

    span {
        display: inline-block;
        margin: .5rem 2rem 0 0;
    }
}

.editor-wrapper {
    display: none;

    &.is-active {
        display: block;
    }
}

.filters {
    font-size: 1.35rem;
    list-style-type: none;
    margin: -2.2rem 0 0 0;
    padding: 0;
    position: relative;
    user-select: none;
    z-index: 1;

    .label {
        color: var(--gray-4);
        float: left;
        margin-right: 1rem;
    }

    .filter-value {
        color: var(--gray-4);
        cursor: pointer;
        display: inline-block;
        margin-right: 1rem;

        &.filter-active {
            color: var(--link-primary-color);
            cursor: default;
        }

        &:hover {
            color: var(--link-primary-color);
        }

        &:last-child {
            border-right: none;
        }
    }
}
</style>
