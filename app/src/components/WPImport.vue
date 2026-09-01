<template>
    <section class="content">
        <div class="wp-import">
            <p-header :title="$t('tools.wpImport.wpImporter')">
                <p-button
                    :onClick="goBack"
                    slot="buttons"
                    appearance="clean"
                    back>
                    {{ $t('ui.backToTools') }}
                </p-button>

                <p-button
                    v-if="lastImportReport"
                    :onClick="openLastImportReport"
                    slot="buttons"
                    appearance="secondary"
                    icon="view-report">
                    {{ $t('tools.wpImport.reportOpenLast') }}
                </p-button>

                <p-button
                    :onClick="selectWXRFile"
                    :disabled="uploadDisabled"
                    slot="buttons"
                    icon="upload-file">
                    {{ $t('tools.wpImport.selectWXRFileButton') }}
                </p-button>
            </p-header>

            <fields-group
                @drop.native.stop.prevent="uploadWXRFile"
                @dragleave.native.stop.prevent="hideDropOverlay"
                @dragenter.native.stop.prevent="showDropOverlay"
                @dragover.native.stop.prevent="showDropOverlay"
                @drag.native.stop.prevent="showDropOverlay"
                @dragstart.native.stop.prevent
                @dragend.native.stop.prevent
                :class="{
                    'wp-import-drop-zone': true,
                    'wxr-file-is-over': wxrFileIsOver
                }">
                <field
                    id="wxr-file"
                    :label="$t('tools.wpImport.selectWXRFileLabel')">
                    <file-select
                        id="wxr-file"
                        :placeholder="$t('tools.wpImport.selectWXRFilePlaceholder')"
                        :value="filePath"
                        ref="wxr-file"
                        :disabled="uploadDisabled"
                        :onChange="selectedFileChanged"
                        slot="field" />
                    <small
                        v-if="!stats"
                        slot="note"
                        class="note">
                        {{ $t('tools.wpImport.importNote') }}
                    </small>
                    <div
                        v-if="checkingFile"
                        slot="note"
                        class="note"
                        role="status"
                        aria-live="polite">
                        {{ $t('tools.wpImport.checkingWXRFile') }}&hellip;
                    </div>
                    <div
                        v-if="errorMessage"
                        slot="note"
                        class="note is-invalid"
                        role="alert">
                        {{ errorMessage }}
                    </div>
                </field>

                <field
                    v-if="stats"
                    class="import-analysis"
                    :label="$t('tools.wpImport.duringWXRAnalyzeWeHaveFound') + ':'">
                    <wp-import-stats
                        slot="field"
                        :stats="stats" />
                </field>

                <field v-if="configVisible">
                    <separator
                        slot="field"
                        type="thin"
                        :label="$t('tools.wpImport.contentToImport')" />
                </field>

                <div
                    v-if="configVisible"
                    :class="importConfigCssClasses">
                    <field :label="$t('tools.wpImport.importSelectedTypesOfPosts')">
                        <div slot="field">
                            <field
                                id="import-cpt-post"
                                :label="$t('post.posts')"
                                :labelSeparated="false"
                                :noLabelSpace="true"
                                spacing="small">
                                <switcher
                                    slot="field"
                                    id="import-cpt-post"
                                    v-model="selectedPostTypes.post" />
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
                                    v-model="selectedPostTypes.page" />
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
                                    v-model="selectedPostTypes[cpt]" />
                            </field>
                        </div>
                    </field>

                    <field :label="$t('tools.wpImport.additionalWordPressData')">
                        <div slot="field">
                            <field
                                id="import-menus"
                                :label="$t('tools.wpImport.importMenus')"
                                :labelSeparated="false"
                                :noLabelSpace="true"
                                spacing="small">
                                <switcher
                                    slot="field"
                                    id="import-menus"
                                    v-model="importMenus" />
                            </field>
                        </div>
                        <small
                            slot="note"
                            class="note">
                            {{ $t('tools.wpImport.importMenusInfo') }}
                        </small>
                    </field>

                    <field>
                        <separator
                            slot="field"
                            type="thin"
                            :label="$t('tools.wpImport.importRules')" />
                    </field>

                    <field :label="$t('tools.wpImport.slugStrategy')">
                        <radio-buttons
                            slot="field"
                            name="slugs"
                            :items="radioSlugItems"
                            v-model="slugStrategy" />
                        <small
                            slot="note"
                            class="note">
                            {{ $t('tools.wpImport.slugStrategyInfo') }}
                        </small>
                    </field>

                    <field :label="$t('tools.wpImport.usedTaxonomyForPosts')">
                        <radio-buttons
                            slot="field"
                            name="taxonomy"
                            :items="radioTaxonomyItems"
                            v-model="taxonomyStrategy" />
                        <small
                            slot="note"
                            class="note">
                            {{ $t('tools.wpImport.taxonomyStrategyInfo') }}
                        </small>
                    </field>

                    <field :label="$t('tools.wpImport.postAuthors')">
                        <radio-buttons
                            slot="field"
                            name="authors"
                            :items="radioAuthorItems"
                            v-model="authorStrategy" />
                        <small
                            slot="note"
                            class="note">
                            {{ $t('tools.wpImport.authorStrategyInfo') }}
                        </small>
                    </field>

                    <field>
                        <separator
                            slot="field"
                            type="thin"
                            :label="$t('tools.wpImport.metadataAndFormatting')" />
                    </field>

                    <field :label="$t('tools.wpImport.seoMetadata')">
                        <radio-buttons
                            slot="field"
                            name="seo-provider"
                            :items="radioSeoItems"
                            v-model="seoProviderSelection"
                            customCssClasses="wp-import-seo-options" />
                        <small
                            slot="note"
                            class="note">
                            {{ seoDetectionNote }}
                            {{ $t('tools.wpImport.seoImportInfo') }}
                        </small>
                    </field>

                    <field :label="$t('tools.wpImport.contentFormatting')">
                        <div slot="field">
                            <field
                                id="use-autop"
                                :label="$t('tools.wpImport.addTagsToContentAutomatically')"
                                :labelSeparated="false"
                                :noLabelSpace="true"
                                spacing="small">
                                <switcher
                                    slot="field"
                                    id="use-autop"
                                    v-model="autoFormatContent" />
                            </field>
                        </div>
                    </field>

                    <field>
                        <separator
                            slot="field"
                            type="thin small" />
                    </field>

                    <field>
                        <div
                            slot="field"
                            class="result-wrapper">
                            <p-button
                                :onClick="importFile"
                                :disabled="importInProgress"
                                :loading="importInProgress"
                                appearance="secondary"
                                icon="download">
                                {{ $t('tools.wpImport.importData') }}
                            </p-button>

                            <span
                                v-if="progressInfo"
                                class="result"
                                role="status"
                                aria-live="polite">
                                {{ progressInfo }}
                            </span>
                        </div>
                    </field>
                </div>

                <overlay
                    v-if="wxrFileIsOver"
                    appearance="drop-zone"
                    aria-hidden="true">
                    <div>{{ $t('file.dropYourFileHere') }}</div>
                </overlay>
            </fields-group>

        </div>

        <wp-import-report
            v-if="importReport"
            :summary="importReport"
            @close="closeImportReport" />
    </section>
</template>

<script>
import BackToTools from './mixins/BackToTools.js';
import WPImportStats from './WPImportStats';
import WPImportReport from './WPImportReport';
import { consumePendingWordPressImport } from './../helpers/wp-import-onboarding';

let lastImportReportCache = null;

export default {
    name: 'wp-import',
    mixins: [
        BackToTools
    ],
    components: {
        'wp-import-stats': WPImportStats,
        'wp-import-report': WPImportReport
    },
    data: function() {
        let currentSite = this.$store.state.currentSite || {};
        let currentSiteConfig = currentSite.config || {};
        let cachedReport = lastImportReportCache &&
            lastImportReportCache.siteName === currentSiteConfig.name &&
            (!currentSiteConfig.uuid || lastImportReportCache.siteUUID === currentSiteConfig.uuid) ?
            lastImportReportCache.summary : null;

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
            wxrFileIsOver: false,
            importReport: null,
            lastImportReport: cachedReport,
            pendingImportSummary: null,
            selectedPostTypes: {
                post: true,
                page: true
            },
            importMenus: true,
            autoFormatContent: false,
            slugStrategy: 'wordpress',
            taxonomyStrategy: 'both',
            authorStrategy: 'publii-author',
            seoProviderSelection: 'none',
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
                    label: this.$t('tools.wpImport.wordpressTags')
                },
                {
                    value: "categories",
                    label: this.$t('tools.wpImport.wordpressCategories')
                },
                {
                    value: "both",
                    label: this.$t('tools.wpImport.tagsAndCategories')
                }
            ],
            radioSlugItems: [
                {
                    value: "wordpress",
                    label: this.$t('tools.wpImport.preserveWordPressSlugs')
                },
                {
                    value: "title",
                    label: this.$t('tools.wpImport.generateSlugsFromTitles')
                }
            ]
        };
    },
    mounted: function() {
        this.loadStoredImportReport();
        this.loadOnboardingImport();
    },
    computed: {
        importConfigCssClasses: function() {
            return {
                'import-config': true,
                'is-inactive': this.importInProgress
            };
        },
        seoDefaultProvider: function() {
            let detected = this.stats && this.stats.seo && Array.isArray(this.stats.seo.detected) ?
                this.stats.seo.detected : [];

            return detected.length === 1 ? 'auto' : 'none';
        },
        radioSeoItems: function() {
            let detected = this.stats && this.stats.seo && Array.isArray(this.stats.seo.detected) ?
                this.stats.seo.detected : [];

            return [
                {
                    value: 'auto',
                    label: this.$t('tools.wpImport.seoAutoDetect'),
                    disabled: detected.length !== 1
                },
                {
                    value: 'yoast',
                    label: 'Yoast SEO',
                    disabled: !detected.includes('yoast')
                },
                {
                    value: 'rank-math',
                    label: 'Rank Math',
                    disabled: !detected.includes('rank-math')
                },
                {
                    value: 'aioseo',
                    label: 'All in One SEO (AIOSEO — ' + this.$t('tools.wpImport.seoPartial') + ')',
                    disabled: !detected.includes('aioseo')
                },
                {
                    value: 'none',
                    label: this.$t('tools.wpImport.seoDoNotImport')
                }
            ];
        },
        seoDetectionNote: function() {
            let detected = this.stats && this.stats.seo && Array.isArray(this.stats.seo.detected) ?
                this.stats.seo.detected : [];
            let labels = detected.map(this.getSeoProviderLabel);

            if (!labels.length) {
                return this.$t('tools.wpImport.seoDetectedNone') + ' ';
            }

            if (labels.length === 1) {
                return this.$t('tools.wpImport.seoDetectedOne', { provider: labels[0] }) + ' ';
            }

            return this.$t('tools.wpImport.seoDetectedMultiple', { providers: labels.join(', ') }) + ' ';
        }
    },
    methods: {
        loadOnboardingImport: function() {
            let siteName = this.$store.state.currentSite.config.name;
            let pendingImport = consumePendingWordPressImport(siteName);

            if (!pendingImport) {
                return;
            }

            this.filePath = pendingImport.filePath;
            this.applyFileStats(pendingImport.stats);
        },
        getSeoProviderLabel: function(provider) {
            return {
                yoast: 'Yoast SEO',
                'rank-math': 'Rank Math',
                aioseo: 'All in One SEO (AIOSEO)'
            }[provider] || provider;
        },
        loadStoredImportReport: async function() {
            let currentSiteConfig = this.$store.state.currentSite.config || {};
            let payload;

            try {
                payload = await mainProcessAPI.invoke('app-wxr-report-load', currentSiteConfig.name);
            } catch (e) {
                return false;
            }

            if (!payload ||
                !payload.summary ||
                !payload.summary.report ||
                this.$store.state.currentSite.config.name !== payload.siteName) {
                if (lastImportReportCache && lastImportReportCache.siteName === currentSiteConfig.name) {
                    lastImportReportCache = null;
                }

                this.lastImportReport = null;
                return false;
            }

            lastImportReportCache = payload;
            this.lastImportReport = payload.summary;
            return true;
        },
        selectWXRFile: function() {
            if (this.uploadDisabled) {
                return;
            }

            this.$refs['wxr-file'].selectFile();
        },
        showDropOverlay: function() {
            if (!this.uploadDisabled) {
                this.wxrFileIsOver = true;
            }
        },
        hideDropOverlay: function(event) {
            if (event.target.classList.contains('wp-import-drop-zone')) {
                this.wxrFileIsOver = false;
            }
        },
        uploadWXRFile: async function(event) {
            this.wxrFileIsOver = false;

            if (this.uploadDisabled || !event.dataTransfer.files.length) {
                return;
            }

            let filePath = await mainProcessAPI.getPathForFile(event.dataTransfer.files[0]);
            filePath = await mainProcessAPI.normalizePath(filePath);
            this.selectedFileChanged(filePath);
        },
        selectedFileChanged: function(filePath) {
            if (filePath === '') {
                this.resetState();
                return;
            }

            this.filePath = filePath;
            this.fileSelected();
        },
        fileSelected: function() {
            this.errorMessage = '';
            this.customPostTypes = [];
            this.stats = false;
            mainProcessAPI.receiveOnce('app-wxr-checked', (data) => {
                this.checkFile(data);
            });

            mainProcessAPI.send('app-wxr-check', {
                siteName: this.$store.state.currentSite.config.name,
                filePath: this.filePath
            });

            this.uploadDisabled = true;
            this.checkingFile = true;
        },
        checkFile: function(data) {
            this.uploadDisabled = false;
            this.checkingFile = false;

            if(!data || data.status === 'error') {
                let message = data && data.message ? data.message : 'Unable to check the selected WXR file.';

                if (message && message.translation) {
                    this.errorMessage = this.$t(message.translation, message.translationVars);
                } else {
                    this.errorMessage = message;
                }

                return;
            }

            if(data.status === 'success') {
                this.applyFileStats(data.message);
            }
        },
        applyFileStats: function(stats) {
            if (!stats || !stats.types || typeof stats.types !== 'object') {
                this.errorMessage = this.$t('tools.wpImport.invalidWXRFile');
                return;
            }

            this.configVisible = true;
            this.customPostTypes = [];

            for(let postType of Object.keys(stats.types)) {
                if(['post', 'page', 'image'].indexOf(postType) !== -1) {
                    continue;
                }

                this.customPostTypes.push(postType);

                if (typeof this.selectedPostTypes[postType] === 'undefined') {
                    this.$set(this.selectedPostTypes, postType, true);
                }
            }

            this.stats = stats;
            this.seoProviderSelection = this.seoDefaultProvider;
        },
        importFile: function() {
            this.progressInfo = '';
            this.errorMessage = '';
            this.importInProgress = true;
            this.uploadDisabled = true;
            let availablePostTypes = ['post', 'page'].concat(this.customPostTypes);
            let selectedPostTypes = availablePostTypes.filter(postType => this.selectedPostTypes[postType]);

            this.bindedFileImported = this.fileImported.bind(this);
            mainProcessAPI.receiveOnce('app-wxr-imported', this.bindedFileImported);

            this.bindedFileImportProgress = this.fileImportProgress.bind(this);
            mainProcessAPI.receive('app-wxr-import-progress', this.bindedFileImportProgress);

            mainProcessAPI.send('app-wxr-import', {
                siteName: this.$store.state.currentSite.config.name,
                filePath: this.filePath,
                importAuthors: this.authorStrategy,
                usedTaxonomy: this.taxonomyStrategy,
                slugStrategy: this.slugStrategy,
                seoProvider: this.seoProviderSelection,
                autop: this.autoFormatContent,
                importMenus: this.importMenus,
                postTypes: selectedPostTypes
            });
        },
        fileImportProgress(data) {
            if (data && data.message && data.message.translation) {
                let translationVars = data.message.translationVars || {};

                this.progressInfo = this.$t(data.message.translation, translationVars);
            }
        },
        fileImported: function(data) {
            if(this.bindedFileImportProgress) {
                mainProcessAPI.stopReceive('app-wxr-import-progress', this.bindedFileImportProgress);
                this.bindedFileImportProgress = null;
            }

            let siteName = this.$store.state.currentSite.config.name;
            let siteUUID = this.$store.state.currentSite.config.uuid || '';
            this.importInProgress = false;
            this.uploadDisabled = false;

            if (!data || data.status !== 'success') {
                this.errorMessage = data && data.message ? data.message : 'WordPress import failed.';
                return;
            }

            let importSummary = data.summary || {};

            this.resetState();

            mainProcessAPI.send('app-site-reload', {
                siteName: siteName
            });

            mainProcessAPI.receiveOnce('app-site-reloaded', (result) => {
                this.$store.commit('setSiteConfig', result);
                this.$store.commit('switchSite', result.data);

                if (importSummary.report) {
                    this.pendingImportSummary = importSummary;
                    this.lastImportReport = importSummary;
                    lastImportReportCache = {
                        siteName,
                        siteUUID,
                        summary: importSummary
                    };
                    this.importReport = importSummary;
                    return;
                }

                this.showImportCompletion(importSummary);
            });
        },
        closeImportReport() {
            let summary = this.pendingImportSummary;
            this.importReport = null;
            this.pendingImportSummary = null;

            if (summary) {
                this.showImportCompletion(summary);
            }
        },
        async openLastImportReport() {
            let reportAvailable = await this.loadStoredImportReport();

            if (reportAvailable && this.lastImportReport) {
                this.importReport = this.lastImportReport;
            }
        },
        showImportCompletion(summary) {
            let siteConfig = this.$store.state.currentSite.config || {};
            let responsiveImagesEnabled = siteConfig.advanced && siteConfig.advanced.responsiveImages;

            if (!Number(summary.images) || !responsiveImagesEnabled) {
                this.$bus.$emit('alert-display', {
                    message: this.$t('tools.wpImport.wpImportSuccessMsg')
                });
                return;
            }

            mainProcessAPI.send('app-site-regenerate-thumbnails-required', {
                name: this.$store.state.currentSite.config.name
            });

            mainProcessAPI.receiveOnce('app-site-regenerate-thumbnails-required-status', (data) => {
                if (data && data.message) {
                    this.$bus.$emit('regenerate-thumbnails-display', {});
                    return;
                }

                this.$bus.$emit('alert-display', {
                    message: this.$t('tools.wpImport.wpImportSuccessMsg')
                });
            });
        },
        resetState() {
            this.filePath = '';
            this.configVisible = false;
            this.uploadDisabled = false;
            this.checkingFile = false;
            this.customPostTypes = [];
            this.selectedPostTypes = {
                post: true,
                page: true
            };
            this.importMenus = true;
            this.autoFormatContent = false;
            this.slugStrategy = 'wordpress';
            this.taxonomyStrategy = 'both';
            this.authorStrategy = 'publii-author';
            this.seoProviderSelection = 'none';
            this.errorMessage = '';
            this.stats = false;
            this.progressInfo = '';
            this.importInProgress = false;
            this.wxrFileIsOver = false;
            this.importReport = null;
            this.pendingImportSummary = null;
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

<style scoped>

.wp-import {
    margin: 0 auto;
    max-width: var(--wrapper-width);
    user-select: none;

    .wp-import-drop-zone.wxr-file-is-over {
        & > * {
            pointer-events: none;
        }
    }

    .import-config {
        &.is-inactive {
            opacity: .5;
            pointer-events: none;
        }
    }

    .import-analysis {
        margin-top: var(--space-12);
    }

    .result {
        padding-left: var(--space-8);
    }

    .result-wrapper {
        align-items: center;
        display: flex;
    }

    ::v-deep .wp-import-seo-options {
        display: flex;
        flex-direction: column;

        & > label.radio {
            display: block;
            margin: 0 0 var(--space-4);

            &:last-child {
                margin-bottom: 0;
            }
        }
    }

}
</style>
