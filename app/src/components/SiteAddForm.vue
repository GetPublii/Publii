<template>
    <div class="site-create-wrapper">
        <div class="site-create">
            <tabs
                ref="site-create-tabs"
                :items="tabsItems"
                isHorizontal
                :onToggle="tabChanged">
                <div slot="tab-0">
                    <div class="site-create-form">
                        <logo-creator ref="logo-creator" />

                        <div class="site-create-field">
                            <label for="site-name">
                                {{ $t('site.websiteName') }}:
                                <span
                                    v-if="siteNameError"
                                    id="site-name-error"
                                    class="site-create-field-error"
                                    role="alert">
                                    {{ $t('site.websiteNameRequired') }}
                                </span>
                            </label>

                            <text-input
                                ref="site-name"
                                id="site-name"
                                :spellcheck="false"
                                :required="true"
                                :ariaInvalid="siteNameError"
                                :ariaDescribedby="siteNameError ? 'site-name-error' : ''"
                                changeEventName="add-website-name-changed"
                                :customCssClasses="siteNameCssClasses" />
                        </div>

                        <div class="site-create-field">
                            <label for="author-name">
                                {{ $t('author.authorName') }}:
                                <span
                                    v-if="authorNameError"
                                    id="author-name-error"
                                    class="site-create-field-error"
                                    role="alert">
                                    {{ $t('site.websiteAuthorRequired') }}
                                </span>
                            </label>

                            <text-input
                                ref="author-name"
                                id="author-name"
                                :spellcheck="false"
                                :required="true"
                                :ariaInvalid="authorNameError"
                                :ariaDescribedby="authorNameError ? 'author-name-error' : ''"
                                changeEventName="add-website-author-changed"
                                :customCssClasses="authorNameCssClasses" />
                        </div>
                    </div>
                </div>
                <div slot="tab-1">
                    <div
                        @drop.stop.prevent="uploadBackup"
                        @dragleave.stop.prevent="hideOverlay"
                        @dragenter.stop.prevent="showOverlay"
                        @dragover.stop.prevent="showOverlay"
                        @drag.stop.prevent="showOverlay"
                        @dragstart.stop.prevent
                        @dragend.stop.prevent
                        :class="{ 
                            'backup': true, 
                            'backup-is-over': backupIsOver,
                            'restore-in-progress': restoreInProgress
                        }">
                        <div class="backup-upload">
                            <icon
                                customWidth="60"
                                customHeight="60"
                                properties="not-clickable"
                                name="backup" />

                                <span>{{ $t('file.dragAndDropBackupFile') }}</span>

                                <input
                                    ref="input"
                                    type="file"
                                    class="backup-upload-input"
                                    spellcheck="false"
                                    @change="valueChanged">
                        </div>

                        <overlay
                            v-if="backupIsOver"
                            :hasBorder="true"
                            :isBlue="true">
                            <div>{{ $t('file.dropYourFileHere') }}</div>
                        </overlay>
                    </div>
                </div>
                <div slot="tab-2">
                    <div
                        v-if="!wordpressStats"
                        @drop.stop.prevent="uploadWordPressFile"
                        @dragleave.stop.prevent="hideWordPressOverlay"
                        @dragenter.stop.prevent="showWordPressOverlay"
                        @dragover.stop.prevent="showWordPressOverlay"
                        @drag.stop.prevent="showWordPressOverlay"
                        @dragstart.stop.prevent
                        @dragend.stop.prevent
                        :class="{
                            'backup': true,
                            'backup-is-over': wordpressFileIsOver,
                            'restore-in-progress': wordpressCheckInProgress
                        }"
                        :aria-busy="wordpressCheckInProgress ? 'true' : 'false'">
                        <div class="backup-upload">
                            <icon
                                customWidth="60"
                                customHeight="60"
                                properties="not-clickable"
                                name="importer"
                                aria-hidden="true" />

                            <span>{{ $t('tools.wpImport.dragAndDropWXRFile') }}</span>

                            <input
                                ref="wordpress-input"
                                type="file"
                                accept=".xml,text/xml,application/xml"
                                class="backup-upload-input"
                                spellcheck="false"
                                :disabled="wordpressCheckInProgress"
                                :aria-label="$t('tools.wpImport.selectWXRFileButton')"
                                @change="wordPressFileChanged">

                            <span
                                v-if="wordpressCheckInProgress"
                                role="status">
                                {{ $t('tools.wpImport.checkingWXRFile') }}&hellip;
                            </span>

                            <span
                                v-if="wordpressError"
                                class="site-create-field-error"
                                role="alert">
                                {{ wordpressError }}
                            </span>
                        </div>

                        <overlay
                            v-if="wordpressFileIsOver"
                            :hasBorder="true"
                            :isBlue="true">
                            <div>{{ $t('file.dropYourFileHere') }}</div>
                        </overlay>
                    </div>

                    <div
                        v-else
                        class="site-create-form site-create-form-wordpress">
                        <div class="backup-selected-file">
                            <span>
                                <strong>{{ $t('tools.wpImport.selectedWXRFile') }}</strong>
                                {{ wordpressFileName }}
                            </span>
                            <p-button
                                type="clean"
                                :onClick="resetWordPressFile">
                                {{ $t('ui.change') }}
                            </p-button>
                        </div>

                        <logo-creator ref="wordpress-logo-creator" />

                        <div class="site-create-field">
                            <label for="wordpress-site-name">
                                {{ $t('site.websiteName') }}:
                                <span
                                    v-if="wordpressSiteNameError"
                                    id="wordpress-site-name-error"
                                    class="site-create-field-error"
                                    role="alert">
                                    {{ $t('site.websiteNameRequired') }}
                                </span>
                            </label>

                            <text-input
                                id="wordpress-site-name"
                                v-model="wordpressSiteName"
                                :spellcheck="false"
                                :required="true"
                                :ariaInvalid="wordpressSiteNameError"
                                :ariaDescribedby="wordpressSiteNameError ? 'wordpress-site-name-error' : ''"
                                :customCssClasses="wordpressSiteNameCssClasses" />
                        </div>

                        <div class="site-create-field">
                            <label for="wordpress-author-name">
                                {{ $t('author.authorName') }}:
                                <span
                                    v-if="wordpressAuthorNameError"
                                    id="wordpress-author-name-error"
                                    class="site-create-field-error"
                                    role="alert">
                                    {{ $t('site.websiteAuthorRequired') }}
                                </span>
                            </label>

                            <text-input
                                id="wordpress-author-name"
                                v-model="wordpressAuthorName"
                                :spellcheck="false"
                                :required="true"
                                :ariaInvalid="wordpressAuthorNameError"
                                :ariaDescribedby="wordpressAuthorNameError ? 'wordpress-author-name-error' : ''"
                                :customCssClasses="wordpressAuthorNameCssClasses" />
                        </div>
                    </div>
                </div>
            </tabs>

            <div
                :data-mode="status"
                :class="{
                    'site-create-buttons': true,
                    'site-create-buttons-wordpress': tabsActiveIndex === 2 && wordpressStats
                }">
                <p-button
                    v-if="tabsActiveIndex === 0"
                    type="primary bottom"
                    :onClick="addWebsite">
                    {{ $t('site.createWebsite') }}
                </p-button>

                <p-button
                    v-if="tabsActiveIndex === 2 && wordpressStats"
                    type="primary bottom"
                    :onClick="createWordPressWebsite">
                    {{ $t('site.createWebsiteAndContinue') }}
                </p-button>

                <p-button
                    v-if="this.$store.getters.siteNames.length"
                    type="outline bottom"
                    :onClick="goBack">
                    {{ $t('ui.cancel') }}
                </p-button>
            </div>
        </div>

        <overlay v-if="overlayIsVisible">
            <div>
                <div class="loader"><span></span></div>
                {{ $t('site.creationInProgress') }}
            </div>
        </overlay>
    </div>
</template>

<script>
import defaultSiteConfig from './../../config/AST.currentSite.config';
import Utils from './../helpers/utils.js';
import GoToLastOpenedWebsite from './mixins/GoToLastOpenedWebsite';
import { storePendingWordPressImport } from './../helpers/wp-import-onboarding';

export default {
    name: 'site-add-form',
    mixins: [
        GoToLastOpenedWebsite
    ],
    data () {
        return {
            siteName: '',
            authorName: '',
            siteNameError: false,
            authorNameError: false,
            overlayIsVisible: false,
            backupFile: null,
            backupIsOver: false,
            tabsActiveIndex: 0,
            restoreInProgress: false,
            wordpressFile: '',
            wordpressFileIsOver: false,
            wordpressCheckInProgress: false,
            wordpressError: '',
            wordpressStats: false,
            wordpressSiteName: '',
            wordpressAuthorName: '',
            wordpressSiteNameError: false,
            wordpressAuthorNameError: false
        }
    },
    computed: {
        status () {
            if(this.$store.getters.siteNames.length) {
                return 'new-website';
            }

            return 'first-website';
        },
        header () {
            if(this.status === 'new-website') {
                return this.$t('site.createNewWebsite');
            }

            return this.$t('site.createYourFirstWebsite');
        },
        siteNameCssClasses () {
            if(this.siteNameError) {
                return 'has-error';
            }
        },
        authorNameCssClasses () {
            if(this.authorNameError) {
                return 'has-error';
            }
        },
        wordpressSiteNameCssClasses () {
            if(this.wordpressSiteNameError) {
                return 'has-error';
            }
        },
        wordpressAuthorNameCssClasses () {
            if(this.wordpressAuthorNameError) {
                return 'has-error';
            }
        },
        wordpressFileName () {
            return this.wordpressFile.split(/[\\/]/).pop();
        },
        defaultSiteConfig () {
            return JSON.parse(JSON.stringify(defaultSiteConfig));
        },
        tabsItems () {
            return [
                this.header,
                this.$t('site.installFromBackup'),
                this.$t('tools.wpImport.migrateFromWordPress')
            ];
        }
    },
    watch: {
        wordpressSiteName () {
            this.wordpressSiteNameError = false;
        },
        wordpressAuthorName () {
            this.wordpressAuthorNameError = false;
        }
    },
    mounted () {
        this.$bus.$on('add-website-name-changed', (newValue) => {
            this.siteName = newValue;
            this.siteNameError = false;
        });

        this.$bus.$on('add-website-author-changed', (newValue) => {
            this.authorName = newValue;
            this.authorNameError = false;
        });

        this.$bus.$emit('add-website-form-displayed');
        document.body.addEventListener('keydown', this.onDocumentKeyDown);
    },
    methods: {
        checkWebsiteName () {
            if(this.siteName.trim() === '') {
                this.siteNameError = true;
            } else {
                this.siteNameError = false;
            }
        },
        checkAuthorName () {
            if(this.authorName.trim() === '' || this.authorName.trim() === '') {
                this.authorNameError = true;
            } else {
                this.authorNameError = false;
            }
        },
        formIsInvalid () {
            this.checkWebsiteName();
            this.checkAuthorName();

            if (this.siteNameError || this.authorNameError) {
                return true;
            }

            return false;
        },
        addWebsite () {
            if (this.formIsInvalid()) {
                return;
            }

            let authorName = this.authorName.trim();

            this.createWebsite(this.setBaseConfig(), authorName, 'standard', (data) => {
                this.finishWebsiteCreation(data, authorName);
                this.$router.push(`/site/${data.siteConfig.name}`);
            });
        },
        createWordPressWebsite () {
            this.wordpressSiteNameError = this.wordpressSiteName.trim() === '';
            this.wordpressAuthorNameError = this.wordpressAuthorName.trim() === '';

            if (!this.wordpressStats || this.wordpressSiteNameError || this.wordpressAuthorNameError) {
                return;
            }

            let authorName = this.wordpressAuthorName.trim();

            this.createWebsite(this.setWordPressBaseConfig(), authorName, 'wordpress', (data) => {
                this.finishWebsiteCreation(data, authorName);
                storePendingWordPressImport({
                    siteName: data.siteConfig.name,
                    filePath: this.wordpressFile,
                    stats: this.wordpressStats
                });
                this.$router.push(`/site/${data.siteConfig.name}/tools/wp-importer`);
            });
        },
        createWebsite (config, authorName, mode, onCreated) {
            if (this.overlayIsVisible) {
                return;
            }

            this.overlayIsVisible = true;

            setTimeout(() => {
                mainProcessAPI.receiveOnce('app-site-creation-error', (data) => {
                    this.overlayIsVisible = false;
                    this.setCreationErrors(mode, data);
                    this.stopSiteCreationListeners();
                });

                mainProcessAPI.receiveOnce('app-site-creation-duplicate', () => {
                    this.overlayIsVisible = false;
                    this.setCreationErrors(mode, { name: true });
                    this.$bus.$emit('alert-display', {
                        message: this.$t('site.siteWithThisNameExists'),
                        textCentered: true
                    });
                    this.stopSiteCreationListeners();
                });

                mainProcessAPI.receiveOnce('app-site-creation-db-error', () => {
                    this.overlayIsVisible = false;
                    this.setCreationErrors(mode, { name: true });
                    this.$bus.$emit('alert-display', {
                        message: this.$t('site.erroOcurredDuringSiteDatabaseCreationInfo'),
                        textCentered: true
                    });
                    this.stopSiteCreationListeners();
                });

                mainProcessAPI.receiveOnce('app-site-created', (data) => {
                    this.overlayIsVisible = false;
                    this.stopSiteCreationListeners();
                    onCreated(data);
                });

                mainProcessAPI.send('app-site-create', config, authorName);
            }, 250);
        },
        setCreationErrors (mode, data = {}) {
            if (mode === 'wordpress') {
                this.wordpressSiteNameError = !!data.name;
                this.wordpressAuthorNameError = !!data.author;
                return;
            }

            this.siteNameError = !!data.name;
            this.authorNameError = !!data.author;
        },
        stopSiteCreationListeners () {
            mainProcessAPI.stopReceiveAll('app-site-created');
            mainProcessAPI.stopReceiveAll('app-site-creation-error');
            mainProcessAPI.stopReceiveAll('app-site-creation-duplicate');
            mainProcessAPI.stopReceiveAll('app-site-creation-db-error');
        },
        finishWebsiteCreation (data, authorName) {
            data.authors = this.setAuthor(data.authorName, authorName);
            this.$store.commit('addNewSite', data);
            window.localStorage.setItem('publii-last-opened-website', data.siteConfig.name);
        },
        setBaseConfig () {
            let baseConfig = {
                name: this.siteName.trim(),
                displayName: this.siteName.trim(),
                synced: false,
                logo: {
                    color: this.$refs['logo-creator'].getActiveColor(),
                    icon: this.$refs['logo-creator'].getActiveIcon()
                }
            };

            return Utils.deepMerge(this.defaultSiteConfig, baseConfig);
        },
        setWordPressBaseConfig () {
            let siteDetails = this.wordpressStats.site || {};
            let baseConfig = {
                name: this.wordpressSiteName.trim(),
                displayName: this.wordpressSiteName.trim(),
                description: siteDetails.description || '',
                synced: false,
                logo: {
                    color: this.$refs['wordpress-logo-creator'].getActiveColor(),
                    icon: this.$refs['wordpress-logo-creator'].getActiveIcon()
                }
            };

            return Utils.deepMerge(this.defaultSiteConfig, baseConfig);
        },
        setAuthor (authorName, displayName) {
            return [{
                id: 1,
                name: displayName,
                username: authorName,
                config: "{}",
                additionalData: "{}",
                postCounter: 0
            }];
        },
        onDocumentKeyDown (e) {
            if (e.code !== 'Enter' || e.isComposing || this.overlayIsVisible) {
                return;
            }

            if (this.tabsActiveIndex === 0) {
                this.addWebsite();
            }

            if (this.tabsActiveIndex === 2 && this.wordpressStats) {
                this.createWordPressWebsite();
            }
        },
        onEnterKey () {
            this.onOk();
        },
        showOverlay (e) {
            this.backupIsOver = true;
        },
        hideOverlay (e) {
            this.backupIsOver = false;
        },
        async uploadBackup (e) {
            this.backupIsOver = false;

            if (typeof e === 'string') {
                this.backupFile = e;
            } else {
                this.backupFile = await mainProcessAPI.normalizePath(await mainProcessAPI.getPathForFile(e.dataTransfer.files[0]));
            }

            this.restoreInProgress = true;

            mainProcessAPI.send('app-site-check-website-to-restore', {
                backupPath: this.backupFile
            });

            mainProcessAPI.receiveOnce('app-site-backup-checked', (data) => {
                if (data.status === 'error') {
                    this.handleCreateFromBackupError(data.type);
                } else if (data.status === 'success') {
                    this.askForWebsiteName(data.data.displayName);
                }
            });
        },
        async valueChanged (e) {
            if (!e.target.files.length) {
                return;
            }

            let sourcePath = await mainProcessAPI.normalizePath(await mainProcessAPI.getPathForFile(e.target.files[0]));
            await this.uploadBackup(sourcePath);
        },
        removeBackupFile () {
            this.backupFile = null;
        },
        showWordPressOverlay () {
            if (!this.wordpressCheckInProgress) {
                this.wordpressFileIsOver = true;
            }
        },
        hideWordPressOverlay () {
            this.wordpressFileIsOver = false;
        },
        async uploadWordPressFile (event) {
            this.wordpressFileIsOver = false;

            if (this.wordpressCheckInProgress || !event.dataTransfer.files.length) {
                return;
            }

            let sourcePath = await mainProcessAPI.getPathForFile(event.dataTransfer.files[0]);
            sourcePath = await mainProcessAPI.normalizePath(sourcePath);
            this.analyzeWordPressFile(sourcePath);
        },
        async wordPressFileChanged (event) {
            if (this.wordpressCheckInProgress || !event.target.files.length) {
                return;
            }

            let sourcePath = await mainProcessAPI.getPathForFile(event.target.files[0]);
            sourcePath = await mainProcessAPI.normalizePath(sourcePath);
            this.analyzeWordPressFile(sourcePath);
        },
        analyzeWordPressFile (filePath) {
            this.wordpressFile = filePath;
            this.wordpressError = '';
            this.wordpressStats = false;
            this.wordpressCheckInProgress = true;

            mainProcessAPI.receiveOnce('app-wxr-checked', (data) => {
                this.wordpressCheckInProgress = false;

                if (!data || data.status !== 'success') {
                    let message = data && data.message;

                    if (message && message.translation) {
                        this.wordpressError = this.$t(message.translation, message.translationVars);
                    } else {
                        this.wordpressError = this.$t('tools.wpImport.invalidWXRFile');
                    }

                    this.$nextTick(() => {
                        if (this.$refs['wordpress-input']) {
                            this.$refs['wordpress-input'].value = '';
                        }
                    });
                    return;
                }

                let siteDetails = data.message.site || {};
                let fallbackName = this.wordpressFileName
                    .replace(/\.xml$/i, '')
                    .replace(/[_-]+/g, ' ')
                    .trim();

                this.wordpressStats = data.message;
                this.wordpressSiteName = siteDetails.title || fallbackName;
                this.wordpressAuthorName = siteDetails.author || 'WordPress';
            });

            mainProcessAPI.send('app-wxr-check', {
                filePath: this.wordpressFile
            });
        },
        resetWordPressFile () {
            this.wordpressFile = '';
            this.wordpressError = '';
            this.wordpressStats = false;
            this.wordpressSiteName = '';
            this.wordpressAuthorName = '';
            this.wordpressSiteNameError = false;
            this.wordpressAuthorNameError = false;

            this.$nextTick(() => {
                if (this.$refs['wordpress-input']) {
                    this.$refs['wordpress-input'].value = '';
                }
            });
        },
        tabChanged () {
            this.tabsActiveIndex = this.$refs['site-create-tabs'].activeIndex;
        },
        handleCreateFromBackupError (problemType) {
            if (problemType === 'unsupported-format') {
                this.$bus.$emit('alert-display', {
                    message: this.$t('site.restoreFromBackup.unsupportedFormat'),
                    buttonStyle: 'danger'
                });
            }

            if (problemType === 'unpack-error') {
                this.$bus.$emit('alert-display', {
                    message: this.$t('site.restoreFromBackup.unpackError'),
                    buttonStyle: 'danger'
                });
            }

            if (problemType === 'invalid-backup-content') {
                this.$bus.$emit('alert-display', {
                    message: this.$t('site.restoreFromBackup.invalidBackupContent'),
                    buttonStyle: 'danger'
                });
            }

            if (problemType === 'invalid-site-data') {
                this.$bus.$emit('alert-display', {
                    message: this.$t('site.restoreFromBackup.invalidSiteData'),
                    buttonStyle: 'danger'
                });
            }

            this.restoreInProgress = false;
        },
        askForWebsiteName (siteName) {
            this.$bus.$emit('confirm-display', {
                hasInput: true,
                message: this.$t('site.restoreFromBackup.selectSiteName'),
                okClick: this.checkCatalogAvailability,
                okLabel: this.$t('site.restoreFromBackup.createWebsite'),
                cancelLabel: this.$t('ui.cancel'),
                cancelClick: () => {
                    this.removeTemporaryBackupFiles();
                    this.restoreInProgress = false;
                },
                defaultText: siteName
            });
        },
        checkCatalogAvailability (siteName) {
            if (siteName.trim() === '') {
                this.$bus.$emit('alert-display', {
                    message: this.$t('site.restoreFromBackup.siteNameCannotBeEmpty'),
                    buttonStyle: 'danger',
                    okClick: () => {
                        this.askForWebsiteName (siteName);
                    }
                });
                return;
            }

            mainProcessAPI.send('app-site-check-website-catalog-availability', {
                siteName: siteName
            });

            mainProcessAPI.receiveOnce('app-site-website-catalog-availability-checked', (data) => {
                if (data.catalogExists === true) {
                    this.$bus.$emit('confirm-display', {
                        message: this.$t('site.restoreFromBackup.siteExistsWantOverride'),
                        okClick: () => {
                            this.restoreWebsiteFromBackup(siteName);
                        },
                        isDanger: true,
                        okLabel: this.$t('site.restoreFromBackup.yesPleaseOverride'),
                        cancelLabel: this.$t('site.restoreFromBackup.iWantChangeName'),
                        cancelClick: () => {
                            this.askForWebsiteName(siteName);
                        }
                    });
                } else if (data.catalogExists === false) {
                    this.restoreWebsiteFromBackup(siteName);
                }
            });
        },
        restoreWebsiteFromBackup (siteName) {
            mainProcessAPI.send('app-site-restore-from-backup', {
                siteName: siteName
            });

            mainProcessAPI.receiveOnce('app-site-restored-from-backup', (data) => {
                this.restoreInProgress = false;

                if (data.status === 'error') {
                    this.$bus.$emit('alert-display', {
                        message: this.$t('site.restoreFromBackup.restoreFailed'),
                        buttonStyle: 'danger'
                    });
                } else if (data.status === 'success') {
                    this.overlayIsVisible = false;
                    let siteCatalogName = data.data.siteCatalogName;

                    mainProcessAPI.stopReceiveAll('app-site-creation-error');
                    mainProcessAPI.stopReceiveAll('app-site-creation-duplicate');
                    mainProcessAPI.stopReceiveAll('app-site-creation-db-error'); 
                    
                    mainProcessAPI.send('app-site-reload', {
                        siteName: siteCatalogName
                    });

                    mainProcessAPI.receiveOnce('app-site-reloaded', (result) => {
                        this.$store.commit('setSiteConfig', result);
                        this.$store.commit('switchSite', result.data);
                        window.localStorage.setItem('publii-last-opened-website', siteCatalogName);
                        this.$router.push(`/site/${siteCatalogName}`);
                    });  
                }
            });
        },
        removeTemporaryBackupFiles () {
            mainProcessAPI.send('app-site-remove-temporary-backup-files');
        } 
    },
    beforeDestroy () {
        this.$bus.$off('add-website-name-changed');
        this.$bus.$off('add-website-author-changed');
        mainProcessAPI.stopReceiveAll('app-wxr-checked');
        document.body.removeEventListener('keydown', this.onDocumentKeyDown);
    }
}
</script>

<style scoped>

/*
 * Site create form
 */
.site-create {
    background: var(--popup-bg);
    border-radius: var(--border-radius);
    box-shadow: 0 0 60px rgba(0, 0, 0, 0.06);
    font-size: var(--app-font-base);
    margin: 0;
    left: 50%;
    padding: 4.8rem 4.8rem 5.6rem 4.8rem;
    position: absolute;
    text-align: center;
    top: 50%;
    transform: translateX(-50%) translateY(-50%);
    user-select: none;
    width: 770px;

    .title {
        color: var(--text-primary-color);
        font-size: 1.8rem;
        font-weight: 600;
        margin: 0 0 4rem 0!important;
        text-transform: none;
    }

    .backup-selected {
        text-align: left
    }

    .backup {
        border: 2px dashed var(--input-border-color);
        border-radius: var(--border-radius);
        color: var(--gray-3);
        position: relative;

        .overlay.has-border {
            pointer-events: none;
            border-radius: 3px;
        }
        &.restore-in-progress {
            position: relative;
          
            &::after {
                border: 3px solid var(--color-primary);
                background: rgba(var(--color-primary-rgb), .17);
                content:"";
                height: 100%;
                left: 0;
                position: absolute;
                top: 0;
                width: 100%;
            }

            &::before {
                animation: spin .9s infinite linear;
                border-top: 2px solid rgba(var(--color-primary-rgb), 0.3);
                border-right: 2px solid rgba(var(--color-primary-rgb), 0.3);
                border-bottom: 2px solid rgba(var(--color-primary-rgb), 0.3);
                border-left: 2px solid var(--color-primary);
                border-radius: 50%;
                content:"";
                display: inline-block;
                height: 3rem;      
                left: calc(50% - 1.5rem);
                position: absolute;      
                top: calc(50% - 1.5rem);      
                vertical-align: middle;
                width: 3rem
            }
            .backup-upload {
                opacity: 0;
            }
        }
    }
}
@keyframes spin {
    100% {
        transform: rotate(360deg);
    }
}
.site-create-form {
    height: 344px;  
    overflow: hidden;
    ::v-deep .logo-creator-preview {
        min-width: 10rem !important;
    }
}
.site-create-field {
    margin: 0 0 3rem 0;
    text-align: left;

    & > label {
        display: block;
        font-size: var(--app-font-base);
        font-weight: 400;
        line-height: 1.4;
        margin-bottom: 1rem;
    }

    &:last-child {
        margin-bottom: 0;
    }
}
.site-create-field-error {
    color: var(--warning);
    font-size: 1.4rem;
}
.site-create-buttons {
    display: flex;
    margin: 0 -4.8rem -5.6rem -4.8rem;
    overflow: hidden;
    padding: 5.6rem 0 0 0;
    position: relative;
    text-align: center;
    top: 1px;

    &.site-create-buttons-wordpress {
        padding-top: 1rem;
    }

    .button {
        border-radius: 0 0 0 var(--border-radius);

        &:last-child:first-child {
            border-radius: 0 0 var(--border-radius) var(--border-radius);
        }
    }
    .button-outline {
        box-shadow: none!important;
        border-top: 1px solid var(--input-border-color);
        border-radius: 0 0 var(--border-radius) 0;
        color: var(--popup-btn-cancel-color);
        margin-left: 0;

        &:hover {
            background: var(--popup-btn-cancel-bg-hover);
            color: var(--popup-btn-cancel-hover-color);
        }
    }
}
.site-create-wrapper {
    .loader {
        display: block;
        height: 2.8rem;
        margin: -5.6rem auto 2rem;
        width: 2.8rem;

        & > span {
            animation: spin .9s infinite linear;
            border-top: 2px solid var(--border-light-color);
            border-right: 2px solid var(--border-light-color);
            border-bottom: 2px solid var(--border-light-color);
            border-left: 2px solid var(--gray-4);
            border-radius: 50%;
            display: block;
            height: 3.5rem;
            width: 3.5rem;

            &::after {
                border-radius: 50%;
                content: "";
                display: block;
            }
      }
   }
}
@keyframes spin {
   100% {
      transform: rotate(360deg);
   }
}
.site-create .backup-selected-file {
    align-items: center;
    background-color: rgba(var(--color-primary-rgb), .065);
    border-radius: var(--border-radius);
    color: var(--text-light-color);
    display: flex;
    font-size: 1.4rem;
    justify-content: space-between;
    line-height: 1.6;
    margin: 0 0 2em;
    padding: .7rem 2rem;

    strong {
        margin-right: 1rem;
    }
}
.site-create .site-create-form-wordpress {
    height: 450px;
}
.site-create .backup-upload {
    align-items: center;
    display: flex;
    flex-direction: column;
    height: 340px;
    justify-content: center;
    padding: 2rem;

    .icon {
        fill: var(--icon-primary-color);
        margin-bottom: 1.5rem;
    }
}
.site-create .backup-upload-input {
    clear: both;
    color: transparent; /* hack to remove the phrase "no file selected" from the file input */
    display: block;
    line-height: 1.6!important;
    margin: 3rem auto 0 auto!important;

    &::-webkit-file-upload-button {
        -webkit-appearance: none;
        background: var(--button-secondary-bg);
        border: 1px solid var(--button-secondary-bg);
        border-radius: var(--border-radius);
        color: var(--button-secondary-color);
        cursor: pointer;
        display: inline-block;
        font-size: 1.4rem;
        font-weight: var(--font-weight-semibold);
        left: 50%;
        padding: .75rem 1.5rem;
        position: relative;
        transform: translate(-50%, 0);
        outline: none;

        &:hover {
            background: var(--button-secondary-bg-hover);
            border-color: var(--button-secondary-bg-hover);
            color: var(--button-secondary-color-hover);
        }
    }
}
</style>
