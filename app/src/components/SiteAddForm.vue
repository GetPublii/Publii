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
                                    class="site-create-field-error">
                                    {{ $t('site.websiteNameRequired') }}
                                </span>
                            </label>

                            <text-input
                                ref="site-name"
                                id="site-name"
                                :spellcheck="false"
                                changeEventName="add-website-name-changed"
                                :customCssClasses="siteNameCssClasses" />
                        </div>

                        <div class="site-create-field">
                            <label for="author-name">
                                {{ $t('author.authorName') }}:
                                <span
                                    v-if="authorNameError"
                                    class="site-create-field-error">
                                    {{ $t('site.websiteAuthorRequired') }}
                                </span>
                            </label>

                            <text-input
                                ref="author-name"
                                id="author-name"
                                :spellcheck="false"
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
            </tabs>

            <div :data-mode="status" class="site-create-buttons">
                <p-button
                    v-if="tabsActiveIndex === 0"
                    type="primary bottom"
                    :onClick="addWebsite">
                    {{ $t('site.createWebsite') }}
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
            restoreInProgress: false
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
        defaultSiteConfig () {
            return JSON.parse(JSON.stringify(defaultSiteConfig));
        },
        tabsItems () {
            return [
                this.header,
                this.$t('site.installFromBackup'),
            ];
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
        addWebsite (e) {
            let self = this;

            if (this.formIsInvalid()) {
                return;
            }

            this.overlayIsVisible = true;

            setTimeout(() => {
                mainProcessAPI.send('app-site-create', this.setBaseConfig(), this.authorName.trim());

                mainProcessAPI.receiveOnce('app-site-creation-error', (data) => {
                    this.overlayIsVisible = false;
                    if (data.name) {
                        this.siteNameError = true;
                    }

                    if (data.author) {
                        this.authorNameError = true;
                    }

                    mainProcessAPI.stopReceiveAll('app-site-created');
                    mainProcessAPI.stopReceiveAll('app-site-creation-duplicate');
                    mainProcessAPI.stopReceiveAll('app-site-creation-db-error');
                });

                mainProcessAPI.receiveOnce('app-site-creation-duplicate', (data) => {
                    this.overlayIsVisible = false;
                    this.siteNameError = true;

                    this.$bus.$emit('alert-display', {
                        message: this.$t('site.siteWithThisNameExists'),
                        textCentered: true
                    });

                    mainProcessAPI.stopReceiveAll('app-site-created');
                    mainProcessAPI.stopReceiveAll('app-site-creation-error');
                });

                mainProcessAPI.receiveOnce('app-site-creation-db-error', (data) => {
                    this.overlayIsVisible = false;
                    this.siteNameError = true;

                    this.$bus.$emit('alert-display', {
                        message: this.$t('site.erroOcurredDuringSiteDatabaseCreationInfo'),
                        textCentered: true
                    });

                    mainProcessAPI.stopReceiveAll('app-site-created');
                    mainProcessAPI.stopReceiveAll('app-site-creation-error');
                });

                mainProcessAPI.receiveOnce('app-site-created', (data) => {
                    this.overlayIsVisible = false;
                    data.authors = self.setAuthor(data.authorName);
                    this.$store.commit('addNewSite', data);
                    window.localStorage.setItem('publii-last-opened-website', data.siteConfig.name);
                    this.$router.push(`/site/${data.siteConfig.name}`);

                    mainProcessAPI.stopReceiveAll('app-site-creation-error');
                    mainProcessAPI.stopReceiveAll('app-site-creation-duplicate');
                    mainProcessAPI.stopReceiveAll('app-site-creation-db-error');
                });
            }, 250);
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
        setAuthor (authorName) {
            return [{
                id: 1,
                name: this.authorName.trim(),
                username: authorName,
                config: "{}",
                additionalData: "{}",
                postCounter: 0
            }];
        },
        onDocumentKeyDown (e) {
            if (e.code === 'Enter' && !event.isComposing) {
                this.addWebsite();
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
                this.backupFile = await mainProcessAPI.normalizePath(e.dataTransfer.files[0].path);
            }

            this.restoreInProgress = true;
            console.log('T', this.backupFile);

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

            let sourcePath = await mainProcessAPI.normalizePath(e.target.files[0].path);
            await this.uploadBackup(sourcePath);
        },
        removeBackupFile () {
            this.backupFile = null;
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
        document.body.removeEventListener('keydown', this.onDocumentKeyDown);
    }
}
</script>

<style lang="scss" scoped>
@import '../scss/variables.scss';

/*
 * Site create form
 */
.site-create {
    background: var(--popup-bg);
    border-radius: var(--border-radius);
    box-shadow: 0 0 60px rgba(0, 0, 0, 0.06);
    font-size: $app-font-base;
    margin: 0;
    left: 50%;
    padding: 4.8rem 4.8rem 5.6rem 4.8rem;
    position: absolute;
    text-align: center;
    top: 50%;
    transform: translateX(-50%) translateY(-50%);
    user-select: none;
    width: 770px;

    &-form {
        height: 344px;  
        overflow: hidden;
        ::v-deep .logo-creator-preview {
            min-width: 10rem !important;
        }
    }

    .title {
        color: var(--text-primary-color);
        font-size: 1.8rem;
        font-weight: 600;
        margin: 0 0 4rem 0!important;
        text-transform: none;
    }

    &-field {
        margin: 0 0 3rem 0;
        text-align: left;

        & > label {
            display: block;
            font-size: $app-font-base;
            font-weight: 400;
            line-height: 1.4;
            margin-bottom: 1rem;
        }

        &-error {
            color: var(--warning);
            font-size: 1.4rem;
        }

        &:last-child {
            margin-bottom: 0;
        }
    }

    &-buttons {
        display: flex;
        margin: 0 -4.8rem -5.6rem -4.8rem;
        overflow: hidden;
        padding: 5.6rem 0 0 0;
        position: relative;
        text-align: center;
        top: 1px;

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

    &-wrapper {
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

                @at-root {
                    @keyframes spin {
                       100% {
                          transform: rotate(360deg);
                       }
                    }
                }
          }
       }
    }

    .backup-selected {
        text-align: left;

        &-file {
            align-items: center;
            display: flex;
            justify-content: space-between;
            margin: 1rem 0;

            strong {
                margin-right: 1rem;
            }
        }
    }

    .backup {
        border: 2px dashed var(--input-border-color);
        border-radius: var(--border-radius);
        color: var(--gray-3);
        position: relative;

        &-upload {
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

            &-input {
                clear: both;
                color: transparent; // hack to remove the phrase "no file selected" from the file input
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
        }

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
                left: 50%;
                position: absolute;      
                top: 50%;      
                vertical-align: middle;
                width: 3rem;
                transform: translate(-50%, -50%);

                @at-root {
                    @keyframes spin {
                        100% {
                            transform: translate(-50%, -50%) rotate(360deg);
                        }
                    }
                }
            }
            .backup-upload {
                opacity: 0;
            }
        }
    }
}
</style>
