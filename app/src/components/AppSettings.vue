<template>
    <section class="settings site-settings-app">
        <div class="settings-wrapper">
            <p-header :title="$t('settings.appSettings')">
                <p-button
                    :onClick="goBack"
                    type="clean back"
                    slot="buttons">
                    {{ $t('ui.goBack') }}
                </p-button>

                <p-button
                    :onClick="checkBeforeSave"
                    slot="buttons"
                    :disabled="buttonsLocked">
                    {{ $t('settings.saveSettings') }}
                </p-button>
            </p-header>

            <fields-group :title="$t('settings.basicSettings')">
                <field
                    id="theme"
                    :label="$t('settings.colorTheme')">
                    <dropdown
                        slot="field"
                        id="start"
                        v-model="theme"
                        :items="availableColorSchemes"></dropdown>
                </field>

                <field
                    id="start"
                    :label="$t('settings.loadAtStart')">
                    <dropdown
                        slot="field"
                        id="start"
                        v-model="screensSelected"
                        :items="screens"></dropdown>
                </field>

                <field
                    id="time-format"
                    :label="$t('settings.timeFormat')">
                    <dropdown
                        slot="field"
                        id="time-format"
                        :items="timeFormats"
                        v-model="timeFormatsSelected"></dropdown>
                </field>

                <field
                    id="images-resize-engine"
                    :label="$t('settings.imagesResizeEngine')">
                    <dropdown
                        slot="field"
                        id="images-resize-engine"
                        :items="imageResizeEngines"
                        v-model="imageResizeEnginesSelected"></dropdown>
                    <p
                        v-if="showWebpWarning"
                        slot="note" 
                        class="msg msg-icon msg-alert">
                        <icon name="warning" customWidth="28" customHeight="28" />
                        <span>{{ $t('settings.imageResizeEngineWarning') }}</span>
                    </p>
                    <small
                        slot="note"
                        class="note">
                        {{ $t('settings.imageResizeEngineInfo') }}
                    </small>
                </field>  
                
                <field
                    id="app-ui-zoom-level"
                    :label="$t('settings.appUIZoomLevel')">
                    <range-slider
                        :min="0.75"
                        :max="2.5"
                        :step="0.05"
                        v-model="uiZoomLevel"
                        :contentModifier="(value) => parseInt(value * 100.0, 10) + '%'"
                        slot="field"></range-slider>
                    <span
                        slot="note"
                        class="note">
                        {{ $t('settings.appUIZoomLevelInfo') }}
                    </span>
                </field>

                <field
                    id="always-save-search-state"
                    :label="$t('settings.alwaysSaveSearchState')"
                    :labelSeparated="false">
                    <switcher
                        slot="field"
                        id="always-save-search-state"
                        v-model="alwaysSaveSearchState" />
                    <span
                        slot="note"
                        class="note">
                        {{ $t('settings.saveSearchStateInfo') }}
                    </span>
                </field>

                <field
                    id="show-modification-date"
                    :label="$t('settings.showModificationDate')"
                    :labelSeparated="false">
                    <switcher
                        slot="field"
                        id="show-modification-date"
                        v-model="showModificationDate" />
                </field>
                
                <field
                    v-if="showModificationDate"
                    id="show-modification-date-as-column"
                    :label="$t('settings.showModificationDateAsColumn')"
                    :labelSeparated="false">
                    <switcher
                        slot="field"
                        id="show-modification-date-as-column"
                        v-model="showModificationDateAsColumn" />
                </field>

                <field
                    id="show-post-slugs"
                    :label="$t('settings.showPostSlugsOnTheListing')"
                    :labelSeparated="false">
                    <switcher
                        slot="field"
                        id="show-post-slugs"
                        v-model="showPostSlugs" />
                </field>

                <field
                    id="show-post-tags"
                    :label="$t('settings.showPostTagsOnTheListing')"
                    :labelSeparated="false">
                    <switcher
                        slot="field"
                        id="show-post-tags"
                        v-model="showPostTags" />
                </field>

                <field
                    id="wide-scrollbars"
                    :label="$t('settings.useWideScrollbars')"
                    :labelSeparated="false">
                    <switcher
                        slot="field"
                        id="wide-scrollbars"
                        v-model="wideScrollbars" />
                </field>
            </fields-group>

            <fields-group :title="$t('settings.filesLocation')">
                <field
                    id="sites-location"
                    :label="$t('settings.sitesLocation')">
                    <dir-select
                        id="sites-location"
                        :placeholder="$t('settings.leaveBlankToUseDefaultSitesDir')"
                        v-model="locations.sites"
                        :readonly="syncInProgress"
                        slot="field" />
                    <switcher
                        v-if="originalSitesLocation !== locations.sites"
                        slot="field"
                        id="site-location-switcher"
                        v-model="changeSitesLocationWithoutCopying"
                        :label="$t('settings.changeSitesLocationWithoutCopyingFiles')" />
                    <small
                        v-if="syncInProgress"
                        slot="note"
                        class="note">
                        {{ $t('sync.duringSyncYouCantChangeFilesLocation') }}
                    </small>
                    <small
                        v-if="locations.sites !== '' && !checkSitesCatalog"
                        slot="note"
                        class="note is-invalid">
                        {{ $t('settings.selectedDirInvalid') }}
                    </small>
                </field>

                <field
                    id="backups-location"
                    :label="$t('settings.backupLocation')">
                    <dir-select
                        id="backups-location"
                        :placeholder="$t('settings.leaveBlankForDefaultBackupsDir')"
                        v-model="locations.backups"
                        :readonly="syncInProgress"
                        slot="field" />
                    <small
                        v-if="syncInProgress"
                        slot="note"
                        class="note">
                        {{ $t('sync.duringSyncYouCantChangeFilesLocation') }}
                    </small>
                    <small
                        v-if="locations.backups !== '' && !checkBackupsCatalog"
                        slot="note"
                        class="note is-invalid">
                        {{ $t('settings.selectedDirInvalid') }}
                    </small>
                </field>

                <field
                    id="preview-location"
                    :label="$t('settings.previewLocation')">
                    <dir-select
                        id="preview-location"
                        :placeholder="$t('settings.leaveBlankForDefaultPreviewDirectory')"
                        v-model="locations.preview"
                        :readonly="syncInProgress"
                        slot="field" />
                    <small
                        v-if="syncInProgress"
                        slot="note"
                        class="note">
                        {{ $t('sync.duringSyncYouCantChangeFilesLocation') }}
                    </small>
                    <small
                        v-if="locations.preview !== '' && !checkPreviewCatalog"
                        slot="note"
                        class="note is-invalid">
                        {{ $t('settings.selectedDirInvalid') }}
                    </small>
                </field>
            </fields-group>

            <fields-group :title="$t('settings.defaultOrderingOnLists')">
                <field
                    id="posts-ordering"
                    :label="$t('settings.defaultPostsOrdering')">
                    <dropdown
                        slot="field"
                        id="posts-ordering"
                        :items="orderingPostItems"
                        v-model="postsOrdering"></dropdown>
                </field>

                <field
                    id="pages-ordering"
                    :label="$t('settings.defaultPagesOrdering')">
                    <dropdown
                        slot="field"
                        id="pages-ordering"
                        :items="orderingPageItems"
                        v-model="pagesOrdering"></dropdown>
                </field>

                <field
                    id="tags-ordering"
                    :label="$t('settings.defaultTagsOrdering')">
                    <dropdown
                        slot="field"
                        id="tags-ordering"
                        :items="orderingTagItems"
                        v-model="tagsOrdering"></dropdown>
                </field>

                <field
                    id="authors-ordering"
                    :label="$t('settings.defaultAuthorsOrdering')">
                    <dropdown
                        slot="field"
                        id="authors-ordering"
                        :items="orderingAuthorItems"
                        v-model="authorsOrdering"></dropdown>
                </field>
            </fields-group>

            <fields-group :title="$t('settings.optionsForEditors')">
                <field
                    id="editor-font-size"
                    :label="$t('settings.editorFontSize')">
                    <range-slider
                        :min="18"
                        :max="22"
                        :step="1"
                        v-model="editorFontSize"
                        slot="field"></range-slider>
                </field>

                <field
                    id="editor-font-family"
                    :label="$t('settings.editorFontFamily')">
                    <dropdown
                        slot="field"
                        id="editor-font-family"
                        :items="editorFontFamilyItems"
                        v-model="editorFontFamily"></dropdown>
                </field>

                 <field
                    id="close-editor-on-save"
                    :label="$t('settings.closePostEditorOnSave')"
                    :labelSeparated="false">
                    <switcher
                        slot="field"
                        id="close-editor-on-save"
                        v-model="closeEditorOnSave" />
                </field>
            </fields-group>

            <fields-group :title="$t('settings.optionsForDevelopers')">
                <field
                    id="open-devtools-in-main"
                    :label="$t('settings.openDevtoolsInMainW')"
                    :labelSeparated="false">
                    <switcher
                        slot="field" 
                        id="open-devtools-in-main"
                        v-model="openDevToolsInMainWindow" />
                        <span
                        slot="note"
                        class="note">
                        {{ $t('settings.requiresRestartingApp') }}
                    </span>
                </field>

                <field
                    id="enable-advanced-preview"
                    :label="$t('settings.enableAdvancedPreview')"
                    :labelSeparated="false">
                    <switcher
                        slot="field"
                        id="enable-advanced-preview"
                        v-model="enableAdvancedPreview" />
                    <small
                        slot="note"
                        class="note">
                        {{ $t('settings.advancedPreviewDesc') }}
                    </small>
                </field>
            </fields-group>

            <fields-group :title="$t('settings.optionsForExperimentalFeatures')">
                 <div
                    class="msg msg-icon msg-info">
                    <icon
                        name="warning"
                        customWidth="28"
                        customHeight="28" />
                    <div v-pure-html="$t('settings.experimentalFeaturesWarning')"></div>
                </div>
                <field
                    id="experimental-feature-app-ui-languages"
                    :label="$t('settings.experimentalFeatureAppAutoBeautifySourceCode')"
                    :labelSeparated="false">
                    <switcher
                        slot="field"
                        id="experimental-feature-app-ui-languages"
                        v-model="experimentalFeatureAppAutoBeautifySourceCode" />
                    <small 
                        slot="note"
                        class="note">
                        {{ $t('settings.experimentalFeatureAppAutoBeautifySourceCodeDesc') }}
                    </small>
                </field>
                <field
                    id="experimental-feature-app-alt-ftp"
                    :label="$t('settings.experimentalFeatureAppFtpAlt')"
                    :labelSeparated="false">
                    <switcher
                        slot="field"
                        id="experimental-feature-app-alt-ftp"
                        v-model="experimentalFeatureAppFtpAlt" />
                    <small 
                        slot="note"
                        class="note">
                        {{ $t('settings.experimentalFeatureAppFtpAltDesc') }}
                    </small>
                </field>
            </fields-group>

            <p-footer>
                <p-button
                    :onClick="checkBeforeSave"
                    slot="buttons"
                    :disabled="buttonsLocked">
                    {{ $t('settings.saveSettings') }}
                </p-button>
            </p-footer>
        </div>
    </section>
</template>

<script>
import Utils from './../helpers/utils.js';
import GoToLastOpenedWebsite from './mixins/GoToLastOpenedWebsite';
import Vue from 'vue';

export default {
    name: 'appsettings',
    mixins: [
        GoToLastOpenedWebsite
    ],
    data () {
        return {
            alwaysSaveSearchState: false,
            buttonsLocked: false,
            screensSelected: '',
            timeFormatsSelected: '12',
            imageResizeEnginesSelected: 'sharp',
            uiZoomLevel: 1.0,
            openDevToolsInMainWindow: false,
            wideScrollbars: false,
            closeEditorOnSave: true,
            showModificationDate: true,
            showModificationDateAsColumn: false,
            showPostSlugs: false,
            showPostTags: true,
            postsOrdering: 'id DESC',
            pagesOrdering: ' DESC',
            tagsOrdering: 'id DESC',
            authorsOrdering: 'id DESC',
            originalSitesLocation: '',
            theme: 'default',
            enableAdvancedPreview: false,
            locations: {
                sites: '',
                backups: '',
                preview: ''
            },
            unwatchLocationPreview: null,
            unwatchBackupsLocation: null,
            editorFontSize: 18,
            editorFontFamily: 'serif',
            experimentalFeatureAppAutoBeautifySourceCode: false,
            experimentalFeatureAppFtpAlt: false,
            changeSitesLocationWithoutCopying: false,
            sitesLocationExists: false,
            backupsLocationExists: false,
            previewLocationExists: false
        };
    },
    computed: {
        screens () {
            let websites = this.$store.getters.siteDisplayNames;

            return {
                '': this.$t('settings.openLastUsedWebsite'),
                ...websites
            };
        },
        availableColorSchemes () {
            return {
                'system': this.$t('settings.systemColors'),
                'default': this.$t('settings.lightMode'),
                'dark': this.$t('settings.darkMode')
            };
        },
        timeFormats () {
            return {
                '24': '24h',
                '12': '12h'
            };
        },
        imageResizeEngines () {
            return {
                'sharp': 'Sharp',
                'jimp': 'Jimp'
            };
        },
        orderingPostItems () {
            return {
                'id DESC': this.$t('settings.ordering.idDESC'),
                'id ASC': this.$t('settings.ordering.idASC'),
                'title DESC': this.$t('settings.ordering.titleDESC'),
                'title ASC': this.$t('settings.ordering.titleASC'),
                'created DESC': this.$t('settings.ordering.createdDESC'),
                'created ASC': this.$t('settings.ordering.createdASC'),
                'modified DESC': this.$t('settings.ordering.modifiedDESC'),
                'modified ASC': this.$t('settings.ordering.modifiedASC'),
                'author DESC': this.$t('settings.ordering.authorDESC'),
                'author ASC': this.$t('settings.ordering.authorASC')
            };
        },
        orderingPageItems () {
            return {
                ' DESC': this.$t('settings.ordering.hierarchical'),
                'id DESC': this.$t('settings.ordering.idDESC'),
                'id ASC': this.$t('settings.ordering.idASC'),
                'title DESC': this.$t('settings.ordering.titleDESC'),
                'title ASC': this.$t('settings.ordering.titleASC'),
                'created DESC': this.$t('settings.ordering.createdDESC'),
                'created ASC': this.$t('settings.ordering.createdASC'),
                'modified DESC': this.$t('settings.ordering.modifiedDESC'),
                'modified ASC': this.$t('settings.ordering.modifiedASC'),
                'author DESC': this.$t('settings.ordering.authorDESC'),
                'author ASC': this.$t('settings.ordering.authorASC')
            };
        },
        orderingTagItems () {
            return {
                'id DESC': this.$t('settings.ordering.idDESC'),
                'id ASC': this.$t('settings.ordering.idASC'),
                'name DESC': this.$t('settings.ordering.nameDESC'),
                'name ASC': this.$t('settings.ordering.nameASC'),
                'postsCounter DESC': this.$t('settings.ordering.postsCounterDESC'),
                'postsCounter ASC': this.$t('settings.ordering.postsCounterASC')
            };
        },
        orderingAuthorItems () {
            return {
                'id DESC': this.$t('settings.ordering.idDESC'),
                'id ASC': this.$t('settings.ordering.idASC'),
                'name DESC': this.$t('settings.ordering.nameDESC'),
                'name ASC': this.$t('settings.ordering.nameASC'),
                'postsCounter DESC': this.$t('settings.ordering.postsCounterDESC'),
                'postsCounter ASC': this.$t('settings.ordering.postsCounterASC')
            };
        },
        syncInProgress () {
            return this.$store.state.components.sidebar.syncInProgress;
        },
        editorFontFamilyItems () {
            return {
                'var(--font-base)': this.$t('settings.editorFontFamilySansSerif'),
                'var(--font-serif)': this.$t('settings.editorFontFamilySerif')
            };
        },
        showWebpWarning () {
            return this.imageResizeEnginesSelected === 'jimp';
        },
        isSitesLocationExists () {
            return this.sitesLocationExists;
        },
        isBackupsLocationExists () {
            return this.backupsLocationExists;
        },
        isPreviewLocationExists () {
            return this.previewLocationExists;
        }
    },
    watch: {
        'locations.sites': async function (newValue) {
            this.checkSitesCatalog();
        },
        'locations.backups': async function (newValue) {
            this.checkBackupsCatalog();
        },
        'locations.preview': async function (newValue) {
            this.checkPreviewCatalog();
        },
        'uiZoomLevel': async function (newValue) {
            await this.setUIZoomLevel();
        }
    },
    mounted () {
        this.locations.sites = this.$store.state.app.config.sitesLocation;
        this.originalSitesLocation = this.locations.sites;
        this.locations.backups = this.$store.state.app.config.backupsLocation;
        this.locations.preview = this.$store.state.app.config.previewLocation;
        this.alwaysSaveSearchState = this.$store.state.app.config.alwaysSaveSearchState;
        this.wideScrollbars = this.$store.state.app.config.wideScrollbars;
        this.openDevToolsInMainWindow = this.$store.state.app.config.openDevToolsInMain;
        this.imageResizeEnginesSelected = this.$store.state.app.config.resizeEngine;
        this.timeFormatsSelected = (this.$store.state.app.config.timeFormat).toString();
        this.screensSelected = this.$store.state.app.config.startScreen;
        this.closeEditorOnSave = this.$store.state.app.config.closeEditorOnSave;
        this.showModificationDate = this.$store.state.app.config.showModificationDate;
        this.showModificationDateAsColumn = this.$store.state.app.config.showModificationDateAsColumn;
        this.showPostSlugs = this.$store.state.app.config.showPostSlugs;
        this.showPostTags = this.$store.state.app.config.showPostTags;
        this.postsOrdering = this.$store.state.app.config.postsOrdering;
        this.pagesOrdering = this.$store.state.app.config.pagesOrdering;
        this.tagsOrdering = this.$store.state.app.config.tagsOrdering;
        this.authorsOrdering = this.$store.state.app.config.authorsOrdering;
        this.enableAdvancedPreview = this.$store.state.app.config.enableAdvancedPreview;
        this.editorFontSize = this.$store.state.app.config.editorFontSize;
        this.editorFontFamily = this.$store.state.app.config.editorFontFamily;
        this.experimentalFeatureAppAutoBeautifySourceCode = this.$store.state.app.config.experimentalFeatureAppAutoBeautifySourceCode;
        this.experimentalFeatureAppFtpAlt = this.$store.state.app.config.experimentalFeatureAppFtpAlt;
        this.uiZoomLevel = this.$store.state.app.config.uiZoomLevel;
        this.theme = this.getAppTheme();

        Vue.nextTick(() => {
            this.unwatchLocationPreview = this.$watch('locations.preview', this.detectPreviewLocationChange);
            this.unwatchBackupsLocation = this.$watch('locations.backups', this.detectBackupLocationChange);
        });
    },
    methods: {
        goBack () {
            let lastOpened = localStorage.getItem('publii-last-opened-website');
            let sites = Object.keys(this.$store.state.sites);

            if (sites.indexOf(lastOpened) > -1) {
                this.$router.push('/site/' + lastOpened + '/posts/');
            } else {
                if (sites.length > 0) {
                    this.$router.push('/site/' + sites[0] + '/posts/');
                } else {
                    this.$router.push('/site/!/posts/');
                }
            }
        },
        checkBeforeSave () {
            if (this.originalSitesLocation !== this.locations.sites) {
                if (!this.changeSitesLocationWithoutCopying) {
                    this.$bus.$emit('confirm-display', {
                        hasInput: false,
                        message: this.$t('settings.sitesLocationChangedConfirmMsg'),
                        okClick: this.save,
                        okLabel: this.$t('ui.ok'),
                        cancelLabel: this.$t('ui.cancel')
                    });

                    return;
                }
            }

            this.save();
        },
        save () {
            this.buttonsLocked = true;

            let newSettings = {
                licenseAccepted: true,
                startScreen: this.screensSelected,
                openDevToolsInMain: this.openDevToolsInMainWindow,
                timeFormat: this.timeFormatsSelected,
                resizeEngine: this.imageResizeEnginesSelected,
                uiZoomLevel: this.uiZoomLevel,
                sitesLocation: this.locations.sites.trim(),
                backupsLocation: this.locations.backups.trim(),
                previewLocation: this.locations.preview.trim(),
                wideScrollbars: this.wideScrollbars,
                closeEditorOnSave: this.closeEditorOnSave,
                showModificationDate: this.showModificationDate,
                showModificationDateAsColumn: this.showModificationDateAsColumn,
                showPostSlugs: this.showPostSlugs,
                showPostTags: this.showPostTags,
                alwaysSaveSearchState: this.alwaysSaveSearchState,
                postsOrdering: this.postsOrdering,
                pagesOrdering: this.pagesOrdering,
                tagsOrdering: this.tagsOrdering,
                authorsOrdering: this.authorsOrdering,
                enableAdvancedPreview: this.enableAdvancedPreview,
                editorFontFamily: this.editorFontFamily,
                editorFontSize: this.editorFontSize,
                experimentalFeatureAppAutoBeautifySourceCode: this.experimentalFeatureAppAutoBeautifySourceCode,
                experimentalFeatureAppFtpAlt: this.experimentalFeatureAppFtpAlt,
                changeSitesLocationWithoutCopying: this.changeSitesLocationWithoutCopying
            };

            let appConfigCopy = JSON.parse(JSON.stringify(this.$store.state.app.config));
            newSettings = Utils.deepMerge(appConfigCopy, newSettings);

            mainProcessAPI.send('app-config-save', newSettings);

            mainProcessAPI.receiveOnce('app-config-saved', (data) => {
                if (data.status === true && data.sites) {
                    this.$store.commit('setSites', data.sites);
                }

                this.saved(newSettings, data);
            });

            this.$bus.$emit('app-settings-saved', newSettings);
        },
        saved (newSettings, data) {
            this.$store.commit('setSiteDir', newSettings.sitesLocation);
            this.$store.commit('setAppConfig', newSettings);
            mainProcessAPI.send('app-backup-set-location', newSettings.backupsLocation);

            if (data.status === true) {
                this.$bus.$emit('message-display', {
                    message: this.$t('settings.appSettingsSavedMsg'),
                    type: 'success',
                    lifeTime: 3
                });
            } else {
                this.$bus.$emit('message-display', {
                    message: this.$t('settings.appSettingsSaveErrorMsg'),
                    type: 'warning',
                    lifeTime: 3
                });
            }

            this.$store.commit('setAppTheme', this.theme);
            this.$bus.$emit('app-theme-change');
            this.buttonsLocked = false;
        },
        getAppTheme () {
            let theme = localStorage.getItem('publii-theme');

            if (theme === 'system' || theme === 'dark' || theme === 'default') {
                return theme;
            }

            return 'system';
        },
        detectPreviewLocationChange (newValue, oldValue) {
            if (newValue !== oldValue) {
                this.$bus.$emit('alert-display', {
                    message: this.$t('settings.previewLocationChangedConfirmMsg'),
                    okLabel: this.$t('ui.iUnderstand'),
                });

                this.unwatchLocationPreview();
            }
        },
        detectBackupLocationChange (newValue, oldValue) {
            if (newValue !== oldValue) {
                this.$bus.$emit('alert-display', {
                    message: this.$t('settings.backupLocationChangedConfirmMsg'),
                    okLabel: this.$t('ui.iUnderstand'),
                });

                this.unwatchBackupsLocation();
            }
        },
        async checkSitesCatalog () {
            return await mainProcessAPI.existsSync(this.locations.sites);
        },
        async checkBackupsCatalog () {
            return await mainProcessAPI.existsSync(this.locations.backups);
        },
        async checkPreviewCatalog () {
            return await mainProcessAPI.existsSync(this.locations.preview);
        },
        async setUIZoomLevel () {
            this.$store.commit('setAppUIZoomLevel', this.uiZoomLevel);
            document.documentElement.style.setProperty('--ui-zoom-level', parseInt(this.uiZoomLevel * 100.0, 10) + '%');
            return await mainProcessAPI.send('app-set-ui-zoom-level', this.uiZoomLevel);
        }
    }
}
</script>

<style lang="scss" scoped>
@import '../scss/variables.scss';
@import '../scss/notifications.scss';

.settings {
    margin: 0 auto;
    padding: 3rem 0 4rem;
    user-select: none;
    width: 100%;

    &-wrapper {
        margin: 0 auto;
        max-width: $wrapper;
    }
}

.note.is-warning {
    color: var(--warning);
}

#site-location-switcher {
    margin: 1.5rem 0 1rem;
    display: block;
}
</style>
