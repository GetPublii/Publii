<template>
    <section class="content wp-import">
        <p-header title="WP importer">
            <p-button
                :onClick="goBack"
                slot="buttons"
                type="outline">
                Back to tools
            </p-button>
        </p-header>

        <fields-group>
            <field
                id="wxr-file"
                label="Please select WXR file:"
                :labelFullWidth="true">
                <file-select
                    id="wxr-file"
                    placeholder="Select a WXR file to import"
                    value=""
                    ref="wxr-file"
                    :disabled="uploadDisabled"
                    :onChange="selectedFileChanged"
                    slot="field" />
            </field>

            <div
                v-if="checkingFile"
                class="import-check-results">
                Checking the selected WXR file&hellip;
            </div>

            <div
                v-if="errorMessage"
                class="import-check-results is-error">
                {{ errorMessage }}
            </div>

            <small 
                v-if="!stats"
                class="note">
                Posts will be imported as compatible with the WYSIWYG editor.
            </small>

            <wp-import-stats
                v-if="stats"
                :stats="stats" />

            <div
                v-if="configVisible"
                :class="importConfigCssClasses">
                <div class="import-config-section">
                    <strong>Import selected types of posts:</strong>

                    <field
                        id="import-cpt-post"
                        label="posts"
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
                        label="pages"
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
                        :key="index"
                        spacing="small">
                        <switcher
                            slot="field"
                            :id="'import-cpt-' + cpt"
                            :ref="'import-cpt-' + cpt"
                            :checked="true" />
                    </field>
                </div>

                <div class="import-config-section">
                    <strong>Used taxonomy for posts:</strong>

                    <radio-buttons
                        name="taxonomy"
                        :items="radioTaxonomyItems"
                        selected="tags"
                        ref="taxonomy" />
                </div>

                <div class="import-config-section">
                    <strong>Post authors:</strong>

                    <radio-buttons
                        name="authors"
                        :items="radioAuthorItems"
                        selected="publii-author"
                        ref="authors" />
                </div>

                <div class="import-config-section">
                    <strong>Content formatting:</strong>

                    <field
                        id="use-autop"
                        label="Add <p> and <br> tags to the post content automatically"
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
                <template v-if="!importInProgress">Import data</template>
                <template v-if="importInProgress">Importing data&hellip;</template>
            </p-button>

            <span
                v-if="configVisible && progressInfo"
                id="import-progress">
                {{ progressInfo }}
            </span>
        </fields-group>
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
                    label: "Use main Publii main author"
                },
                {
                    value: "wp-authors",
                    label: "Import authors"
                }
            ],
            radioTaxonomyItems: [
                {
                    value: "tags",
                    label: "Tags"
                },
                {
                    value: "categories",
                    label: "Categories"
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
                this.errorMessage = data.message;
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
        fileImportProgress(event, data) {
            this.progressInfo = data.message;
        },
        fileImported: function(event, data) {
            let siteName = this.$store.state.currentSite.config.name;
            this.importInProgress = false;

            this.$bus.$emit('confirm-display', {
                message: 'Your WordPress data has been imported. Thumbnails regeneration can be necessary if you have selected a theme before.',
                okLabel: 'Go to tools',
                cancelLabel: 'OK',
                okClick: () => {
                    let currentSite = this.$route.params.name;
                    this.$router.push(this.$route.path.replace('wp-importer', 'regenerate-thumbnails'));
                }
            });

            this.resetState();

            mainProcessAPI.send('app-site-reload', {
                siteName: siteName
            });

            mainProcessAPI.receiveOnce('app-site-reloaded', (event, result) => {
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
    p {
        margin-top: 0;
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
        padding: 2rem 0 0 0;

        &.is-error {
            color: var(--warning);
            text-align: center;
        }
    }

    .import-config {
        margin: 0 0 2rem 0;

        &-section {
            border-bottom: 2px solid var(--gray-1);
            font-weight: 500;
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
