<template>
    <section class="content">
        <div class="wp-import">
            <p-header :title="$t('tools.wpImport.wpImporter')">
                <p-button
                    :onClick="goBack"
                    slot="buttons"
                    type="clean back">
                    {{ $t('ui.backToTools') }}
                </p-button>
            </p-header>

            <fields-group>
                <field
                    id="wxr-file"
                    :label="$t('tools.wpImport.selectWXRFileLabel')"
                    :labelFullWidth="true">
                    <file-select
                        id="wxr-file"
                        :placeholder="$t('tools.wpImport.selectWXRFilePlaceholder')"
                        value=""
                        ref="wxr-file"
                        :disabled="uploadDisabled"
                        :onChange="selectedFileChanged"
                        slot="field" />
                </field>

                <small
                    v-if="!stats"
                    class="note">
                    {{ $t('tools.wpImport.importNote') }}
                </small>

                <div
                    v-if="checkingFile"
                    class="import-check-results">
                    {{ $t('tools.wpImport.checkingWXRFile') }}&hellip;
                </div>

                <div
                    v-if="errorMessage"
                    class="import-check-results is-error">
                    {{ errorMessage }}
                </div>

                <wp-import-stats
                    v-if="stats"
                    :stats="stats" />

                <div
                    v-if="configVisible"
                    :class="importConfigCssClasses">
                    <div class="import-config-section">
                        <strong>{{ $t('tools.wpImport.importSelectedTypesOfPosts') }}</strong>

                        <field
                            id="import-cpt-post"
                            :label="$t('post.posts')"
                            :labelSeparated="false"
                            :noLabelSpace="true"
                            spacing="small">
                            <switcher
                                slot="field"
                                id="import-cpt-post"
                                ref="import-cpt-post"
                                :checked="true" />
                        </field>

                        <field
                            id="import-cpt-page"
                            :label="$t('tools.wpImport.pages')"
                            :labelSeparated="false"
                            :noLabelSpace="true"
                            spacing="small">
                            <switcher
                                slot="field"
                                id="import-cpt-page"
                                ref="import-cpt-page"
                                :checked="true" />
                        </field>

                        <field
                            v-for="(cpt, index) in customPostTypes"
                            :id="'import-cpt-' + cpt"
                            :label="cpt"
                            :labelSeparated="false"
                            :noLabelSpace="true"
                            :key="'custom-post-type-item-' + index"
                            spacing="small">
                            <switcher
                                slot="field"
                                :id="'import-cpt-' + cpt"
                                :ref="'import-cpt-' + cpt"
                                :checked="true" />
                        </field>
                    </div>

                    <div class="import-config-section">
                        <strong>{{ $t('tools.wpImport.usedTaxonomyForPosts') }}</strong>

                        <radio-buttons
                            name="taxonomy"
                            :items="radioTaxonomyItems"
                            selected="tags"
                            ref="taxonomy" />
                    </div>

                    <div class="import-config-section">
                        <strong>{{ $t('tools.wpImport.postAuthors') }}</strong>

                        <radio-buttons
                            name="authors"
                            :items="radioAuthorItems"
                            selected="publii-author"
                            ref="authors" />
                    </div>

                    <div class="import-config-section">
                        <strong>{{ $t('tools.wpImport.contentFormatting') }}</strong>

                        <field
                            id="use-autop"
                            :label="$t('tools.wpImport.addTagsToContentAutomatically')"
                            :labelSeparated="false"
                            :noLabelSpace="true"
                            spacing="small">
                            <switcher
                                slot="field"
                                id="use-autop"
                                ref="use-autop"
                                :checked="true" />
                        </field>
                    </div>
                </div>

                <p-button
                    v-if="configVisible"
                    :onClick="importFile"
                    :disabled="importInProgress"
                    type="primary">
                    <template v-if="!importInProgress">{{ $t('tools.wpImport.importData') }}</template>
                    <template v-if="importInProgress">{{ $t('tools.wpImport.importingData') }}&hellip;</template>
                </p-button>

                <span
                    v-if="configVisible && progressInfo"
                    id="import-progress">
                    {{ progressInfo }}
                </span>
            </fields-group>
        </div>
    </section>
</template>

<script>
import BackToTools from './mixins/BackToTools.js';
import WPImportStats from './WPImportStats';

export default {
    name: 'wp-import',
    mixins: [
        BackToTools
    ],
    components: {
        'wp-import-stats': WPImportStats
    },
    data: function() {
        return {
            filePath: '',
            uploadDisabled: false,
            configVisible: false,
            checkingFile: false,
            customPostTypes: [],
            errorMessage: '',
            stats: false,
            progressInfo: '',
            importInProgress: false,
            radioAuthorItems: [
                {
                    value: "publii-author",
                    label: this.$t('tools.wpImport.useMainAuthor')
                },
                {
                    value: "wp-authors",
                    label: this.$t('tools.wpImport.importAuthors')
                }
            ],
            radioTaxonomyItems: [
                {
                    value: "tags",
                    label: this.$t('ui.tags')
                },
                {
                    value: "categories",
                    label: this.$t('tools.wpImport.categories')
                }
            ]
        };
    },
    computed: {
        importConfigCssClasses: function() {
            return {
                'import-config': true,
                'is-inactive': this.importInProgress
            };
        }
    },
    methods: {
        selectedFileChanged: function(filePath) {
            if (filePath === '') {
                this.resetState();
                return;
            }

            this.filePath = filePath;
            this.fileSelected();
        },
        fileSelected: function() {
            mainProcessAPI.send('app-wxr-check', {
                siteName: this.$store.state.currentSite.config.name,
                filePath: this.filePath
            });

            this.uploadDisabled = true;
            this.checkingFile = true;
            mainProcessAPI.receiveOnce('app-wxr-checked', (data) => {
                this.checkFile(data);
            });
        },
        checkFile: function(data) {
            this.uploadDisabled = false;
            this.checkingFile = false;

            if(data.status === 'error') {
                if (data.message.translation) {
                    this.errorMessage = this.$t(data.message.translation, data.message.translationVars);
                } else {
                    this.errorMessage = data.message;
                }
            }

            if(data.status === 'success') {
                this.configVisible = true;

                for(let postType of Object.keys(data.message.types)) {
                    if(['post', 'page', 'image'].indexOf(postType) !== -1) {
                        continue;
                    }

                    this.customPostTypes.push(postType);
                }

                this.stats = data.message;
            }
        },
        importFile: function() {
            this.progressInfo = '';
            this.importInProgress = true;
            this.uploadDisabled = true;
            let selectedPostTypes = [];
            let allRefs = Object.keys(this.$refs);

            for(let i = 0; i < allRefs.length; i++) {
                if(allRefs[i].indexOf('import-cpt-') === 0 && this.$refs[allRefs[i]].isChecked) {
                    selectedPostTypes.push(allRefs[i].replace('import-cpt-', ''));
                }
            }

            mainProcessAPI.send('app-wxr-import', {
                siteName: this.$store.state.currentSite.config.name,
                filePath: this.filePath,
                importAuthors: this.$refs['authors'].content,
                usedTaxonomy: this.$refs['taxonomy'].content,
                autop: this.$refs['use-autop'].isChecked,
                postTypes: selectedPostTypes
            });

            this.bindedFileImported = this.fileImported.bind(this);
            mainProcessAPI.receiveOnce('app-wxr-imported', this.bindedFileImported);

            this.bindedFileImportProgress = this.fileImportProgress.bind(this);
            mainProcessAPI.receive('app-wxr-import-progress', this.bindedFileImportProgress);
        },
        fileImportProgress(data) {
            this.progressInfo = this.$t(data.message.translation, data.message.translationVars);
        },
        fileImported: function(data) {
            let siteName = this.$store.state.currentSite.config.name;
            this.importInProgress = false;

            this.$bus.$emit('confirm-display', {
                message: this.$t('tools.wpImport.wpImportGoToRegenerateMsg'),
                okLabel: this.$t('tools.goToTools'),
                cancelLabel: this.$t('ui.ok'),
                okClick: () => {
                    let currentSite = this.$route.params.name;
                    this.$router.push(this.$route.path.replace('wp-importer', 'regenerate-thumbnails'));
                }
            });

            this.resetState();

            mainProcessAPI.send('app-site-reload', {
                siteName: siteName
            });

            mainProcessAPI.receiveOnce('app-site-reloaded', (result) => {
                this.$store.commit('setSiteConfig', result);
                this.$store.commit('switchSite', result.data);
            });
        },
        resetState() {
            this.filePath = '';
            this.configVisible = false;
            this.uploadDisabled = false;
            this.checkingFile = false;
            this.customPostTypes = [];
            this.errorMessage = '';
            this.stats = false;
            this.progressInfo = '';
            this.importInProgress = false;
        }
    },
    beforeDestroy: function() {
        if(this.bindedFileImported) {
            mainProcessAPI.stopReceive('app-wxr-imported', this.bindedFileImported);
        }

        if(this.bindedFileImportProgress) {
            mainProcessAPI.stopReceive('app-wxr-import-progress', this.bindedFileImportProgress);
        }
    }
}
</script>

<style lang="scss" scoped>
@import '../scss/variables.scss';

.wp-import {
    margin: 0 auto;
    max-width: $wrapper;
    user-select: none;

    p {
        margin-top: 0;
    }

    .note {
        clear: both;
        color: var(--text-light-color);
        display: block;
        font-size: 1.35rem;
        font-style: italic;
        line-height: 1.4;
        padding: .5rem 0 1rem 0;
        user-select: text;
    }

    #import-data {
        margin-top: 2rem;
        width: auto;
    }

    #import-progress {
        color: var(--gray-4);
        display: inline-block;
        font-style: italic;
        margin: 2rem;
    }

    .import-check-results {
        clear: both;
        padding: 1rem 0 0 0;

        &.is-error {
            color: var(--warning);
        }
    }

    .import-config {
        margin: 0 0 2rem 0;

        &-section {
            border-bottom: 2px solid var(--gray-1);
            font-weight: var(--font-weight-semibold);
            margin: 0;
            padding: 3rem 0;
        }

        & > p {
            margin: 0;
        }

        label {
            display: inline-block;
            font-weight: 400;
            margin: 1rem 2rem 0 0;
        }

        &.is-inactive {
            opacity: .5;
            pointer-events: none;
        }
    }

    .import-config-section {
        strong {
            display: block;
            padding-bottom: 1rem;
        }
    }
}
</style>
