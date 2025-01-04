<template>
    <section class="content tools-custom-html">
        <p-header :title="$t('tools.customHTML')">
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

        <fields-group>
            <tabs
                id="custom-html-tabs"
                :items="tabs"
                :onToggle="refreshEditors">
                <supported-features-check
                    v-for="(htmlFieldName, index) in Object.keys(requiredFeatures)"
                    :key="'supported-features-check-' + index"
                    :slot="'tab-' + index"
                    :featuresToCheck="requiredFeatures[htmlFieldName]" />

                <codemirror-editor
                    v-for="(editor, index) in Object.keys(editors)"
                    :slot="'tab-' + index"
                    :id="editor"
                    :key="editor"
                    :ref="editor"
                    editorLoadedEventName="custom-html-editor-loaded"
                    mode="xml">
                </codemirror-editor>

                <small
                    v-for="(editor, index) in Object.keys(editors)"
                    class="editor-note"
                    :slot="'tab-' + index"
                    :key="'note-' + editor">
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
            </tabs>
        </fields-group>
    </section>
</template>

<script>
import Utils from '../helpers/utils.js';
import BackToTools from './mixins/BackToTools.js';
import SupportedFeaturesCheck from './basic-elements/SupportedFeaturesCheck.vue';

export default {
    name: 'custom-html',
    mixins: [
        BackToTools
    ],
    components: {
        'supported-features-check': SupportedFeaturesCheck
    },
    data: function() {
        return {
            buttonsLocked: false,
            tabs: [
                this.$t('customHTML.tabs.head'),
                this.$t('customHTML.tabs.body'),
                this.$t('customHTML.tabs.comments'),
                this.$t('customHTML.tabs.searchInput'),
                this.$t('customHTML.tabs.searchContent'),
                this.$t('customHTML.tabs.socialSharing'),
                this.$t('customHTML.tabs.footer'),
            ],
            requiredFeatures: {
                'custom-head-code': [],
                'custom-body-code': [],
                'custom-comments-code': ['customComments'],
                'custom-search-input': ['customSearch'],
                'custom-search-content': ['customSearch'],
                'custom-social-sharing': ['customSharing'],
                'custom-footer-code': []
            },
            editors: {},
            loadedEditors: 0
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
        this.getEditorsList();

        this.$bus.$on('custom-html-editor-loaded', () => {
            this.loadedEditors++;

            if(this.loadedEditors === Object.keys(this.editors).length) {
                this.initEditors();
            }
        });
    },
    methods: {
        getEditorsList: function() {
            let customHtml = {
                'custom-head-code': this.$store.state.currentSite.config.advanced.customHeadCode,
                'custom-body-code': this.$store.state.currentSite.config.advanced.customBodyCode,
                'custom-comments-code': this.$store.state.currentSite.config.advanced.customCommentsCode,
                'custom-search-input': this.$store.state.currentSite.config.advanced.customSearchInput,
                'custom-search-content': this.$store.state.currentSite.config.advanced.customSearchContent,
                'custom-social-sharing': this.$store.state.currentSite.config.advanced.customSocialSharing,
                'custom-footer-code': this.$store.state.currentSite.config.advanced.customFooterCode
            };

            if(
                this.siteHasTheme &&
                this.$store.state.currentSite.themeSettings &&
                this.$store.state.currentSite.themeSettings.renderer &&
                this.$store.state.currentSite.themeSettings.renderer.customHTML
            ) {
                let customHtmlCodes = Object.keys(this.$store.state.currentSite.themeSettings.renderer.customHTML);

                for(let i = 0; i < customHtmlCodes.length; i++) {
                    let id = customHtmlCodes[i];
                    customHtml[id] = this.getCustomHtmlCode(id);

                    if (this.$te('customHTML.tabs.' + id)) {
                        this.tabs.push(this.$t('customHTML.tabs.' + id));
                    } else {
                        this.tabs.push(this.$store.state.currentSite.themeSettings.renderer.customHTML[id]);
                    }
                }
            }

            this.editors = customHtml;
        },
        getCustomHtmlCode: function(id) {
            if(
                this.$store.state.currentSite.config.advanced.customHTML &&
                this.$store.state.currentSite.config.advanced.customHTML[id]
            ) {
                return this.$store.state.currentSite.config.advanced.customHTML[id];
            }

            return ;
        },
        initEditors: function() {
            let refIDs = Object.keys(this.$refs);

            for(let refID of refIDs) {
                if(this.editors[refID]) {
                    this.$refs[refID][0].editor.setValue(this.editors[refID]);
                }

                this.$refs[refID][0].editor.refresh();
            }
        },
        refreshEditors: function() {
            setTimeout(() => {
                let refIDs = Object.keys(this.$refs);

                for(let refID of refIDs) {
                    this.$refs[refID][0].editor.refresh();
                }
            }, 0);
        },
        save (showPreview = false, renderingType = false, renderFiles = false) {
            let customCodeEditors = document.querySelectorAll('.tools-custom-html textarea');

            for(let editor of Object.keys(this.editors)) {
                this.$refs[editor][0].editor.save();
            }

            let newSettings = {
                advanced: {
                    customHeadCode: document.getElementById('custom-head-code').value,
                    customBodyCode: document.getElementById('custom-body-code').value,
                    customFooterCode: document.getElementById('custom-footer-code').value,
                    customCommentsCode: document.getElementById('custom-comments-code').value,
                    customSearchInput: document.getElementById('custom-search-input').value,
                    customSearchContent: document.getElementById('custom-search-content').value,
                    customSocialSharing: document.getElementById('custom-social-sharing').value,
                    customHTML: {}
                }
            };

            for (let customCodeEditor of customCodeEditors) {
                let id = customCodeEditor.getAttribute('id');
                let excludedIDs = [
                    'custom-head-code',
                    'custom-body-code',
                    'custom-footer-code',
                    'custom-comments-code',
                    'custom-search-input',
                    'custom-search-content',
                    'custom-social-sharing'
                ];

                if(!id || excludedIDs.indexOf(id) > -1) {
                    continue;
                }

                newSettings.advanced.customHTML[id] = customCodeEditor.value;
            }

            // Merge new settings with existing settings
            let currentSiteConfigCopy = JSON.parse(JSON.stringify(this.$store.state.currentSite.config));
            newSettings = Utils.deepMerge(currentSiteConfigCopy, newSettings);

            // Send request to the back-end
            mainProcessAPI.send('app-site-config-save', {
                site: this.$store.state.currentSite.config.name,
                settings: newSettings,
                source: "custom-html"
            });

            // Settings saved
            mainProcessAPI.receiveOnce('app-site-config-saved', (data) => {
                if(data.status === true) {
                    this.saved (newSettings, showPreview, renderingType, renderFiles);

                    if(data.newThemeConfig) {
                        this.$store.commit('refreshSiteThemeConfig', data);
                    }
                }

                if(data.message === 'success-save') {
                    this.$bus.$emit('message-display', {
                        message: this.$t('site.siteSettingsSaveSuccessMsg'),
                        type: 'success',
                        lifeTime: 3
                    });
                }

                mainProcessAPI.send('app-site-reload', {
                    siteName: this.$store.state.currentSite.config.name
                });

                mainProcessAPI.receiveOnce('app-site-reloaded', (result) => {
                    this.$store.commit('setSiteConfig', result);
                    this.$store.commit('switchSite', result.data);
                });
            });
        },
        saveAndPreview (renderingType = false) {
            this.save(true, renderingType, false);
        },
        saveAndRender (renderingType = false) {
            this.save(true, renderingType, true);
        },
        async saved (newSettings, showPreview, renderingType = false, renderFiles = false) {
            let siteName = this.$store.state.currentSite.config.name;

            this.$store.commit('refreshSiteConfig', {
                newSettings: newSettings,
                siteName: siteName
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
        }
    },
    beforeDestroy () {
        this.$bus.$off('custom-html-editor-loaded');
    }
}
</script>

<style lang="scss" scoped>
@import '../scss/variables.scss';

.editor-note {
   color: var(--gray-4);

    span {
        display: inline-block;
        margin: .5rem 2rem 0 0;
    }
}
</style>
