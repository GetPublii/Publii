<template>
    <div
        v-if="isVisible"
        @click="maximizePopup"
        :class="{
            'overlay': true,
            'as-page': true,
            'is-minimized': isMinimized
        }">
        <div class="popup sync">
            <div
                v-if="isInSync && noIssues && !isMinimized"
                class="sync-success">

                <h1>{{ $t('sync.yourWebsiteIsInSync') }}</h1>

                <p
                    v-if="isManual"
                    class="description"
                    v-pure-html="$t('sync.websiteFilesPreparedInfo')">
                </p>

                <p
                    v-if="isGithubPages"
                    class="description">
                    <strong>{{ $t('sync.note') }}</strong> 
                    {{ $t('sync.githubSyncedPart1') }}<br>
                    {{ $t('sync.githubSyncedPart2') }}
                </p>

                <p
                    v-if="isGitlabPages"
                    class="description">
                    <strong>{{ $t('sync.note') }}</strong> 
                    {{ $t('sync.gitlabSyncedPart1') }}<br>
                    {{ $t('sync.gitlabSyncedPart2') }}
                </p>

                <p 
                    v-if="!(isGithubPages || isGitlabPages || isManual)"
                    class="description">
                    {{ $t('sync.allFilesUploadedPart1') }}<br>
                    {{ $t('sync.allFilesUploadedPart2') }}
                </p>

                <div class="progress-bars-wrapper">
                    <progress-bar
                        :cssClasses="{ 'sync-progress-bar': true, 'is-synced': true }"
                        color="green"
                        :progress="100"
                        :stopped="false"
                        message="" />
                </div>

                <div class="buttons">
                    <p-button
                        v-if="isManual"
                        type="primary medium green quarter-width"
                        :onClick="showFolder">
                        {{ $t('sync.getWebsiteFiles') }}
                    </p-button>

                    <p-button
                        v-if="!isManual"
                        type="primary medium green quarter-width"
                        :onClick="openWebsite">
                        {{ $t('sync.visitYourWebsite') }}
                    </p-button>

                    <p-button
                        :onClick="close"
                        type="outline medium quarter-width">
                        {{ $t('ui.ok') }}
                    </p-button>
                </div>
            </div>

            <div
                v-if="isInSync && !noIssues && !isMinimized"
                class="sync-success">
                <h1>{{ $t('sync.filesNotSyncedErrorText') }}</h1>

                <p class="description">
                    {{ $t('sync.filesNotSyncedErrorMessage') }}
                </p>

                <div class="buttons">
                    <p-button
                        type="primary medium  green quarter-width"
                        :onClick="openWebsite">
                        {{ $t('sync.visitYourWebsite') }}
                    </p-button>

                    <p-button
                        :onClick="close"
                        type="outline medium quarter-width ">
                        {{ $t('ui.ok') }}
                    </p-button>
                </div>
            </div>

            <div
                v-if="properConfig && !isInSync && !isMinimized"
                class="sync-todo">
                <div class="heading">
                    <h1>{{ $t('sync.websiteSynchronization') }}</h1>

                    <p
                        class="description"
                        v-pure-html="$t('sync.websiteSynchronizationInfo')">
                    </p>
                </div>

                <div class="progress-bars-wrapper">
                    <progress-bar
                        :cssClasses="{ 'rendering-progress-bar': true }"
                        :color="renderingProgressColor"
                        :progress="renderingProgress"
                        :stopped="renderingProgressIsStopped"
                        :message="messageFromRenderer" />

                    <progress-bar
                        v-if="!isManual && !renderingInProgress && (uploadInProgress || syncInProgress || isInSync || uploadError)"
                        :cssClasses="{ 'sync-progress-bar': true, 'is-in-progress': (uploadInProgress || syncInProgress), 'is-synced': isInSync, 'is-error': uploadError }"
                        :color="uploadingProgressColor"
                        :progress="uploadingProgress"
                        :stopped="uploadingProgressIsStopped"
                        :message="messageFromUploader" />
                </div>

                <div class="buttons">
                    <p-button
                        :onClick="startSync"
                        :type="syncInProgress ? 'disabled medium quarter-width': 'medium quarter-width'"
                        :disabled="syncInProgress">
                        {{ $t('sync.syncYourWebsite') }}
                    </p-button>

                    <p-button
                        :onClick="cancelSync"
                        type="outline medium quarter-width">
                        {{ $t('ui.cancel') }}
                    </p-button>
                </div>
            </div>

            <div
                v-if="noDomainConfig"
                class="sync-issues-to-resolve">

                <h1>{{ $t('sync.domainNameNotSetErrorText') }}</h1>
                <p
                    class="description"
                    v-pure-html="$t('sync.domainNameNotSetErrorMessage')">
                </p>

                <div class="buttons">
                    <p-button
                        type="medium  quarter-width"
                        :onClick="goToServerSettings">
                        {{ $t('sync.goToSettings') }}
                    </p-button>

                    <p-button
                        :onClick="close"
                        type="outline medium  quarter-width">
                        {{ $t('ui.cancel') }}
                    </p-button>
                </div>
            </div>

            <div
                v-if="!noDomainConfig && noServerConfig"
                class="sync-issues-to-resolve">

                <h1>{{ $t('sync.destinationServerNotConfiguredErrorText') }}</h1>
                <p
                    class="description"
                    v-pure-html="$t('sync.destinationServerNotConfiguredErrorMessage')">
                </p>

                <div class="buttons">
                    <p-button
                        type="medium  quarter-width"
                        :onClick="goToServerSettings">
                        {{ $t('sync.goToSettings') }}
                    </p-button>

                    <p-button
                        type="outline medium  quarter-width"
                        :onClick="close">
                        {{ $t('ui.cancel') }}
                    </p-button>
                </div>
            </div>

            <!-- Minimized states -->
            <div
                v-if="properConfig && !isInSync && !isManual && isMinimized && !renderingInProgress"
                class="minimized-sync-in-progress">
                <progress-bar
                    v-if="(uploadInProgress || syncInProgress || isInSync || uploadError)"
                    :cssClasses="{ 'sync-progress-bar': true, 'is-in-progress': (uploadInProgress || syncInProgress), 'is-synced': isInSync, 'is-error': uploadError }"
                    :color="uploadingProgressColor"
                    :progress="uploadingProgress"
                    :stopped="uploadingProgressIsStopped"
                    :message="messageFromUploader" />
            </div>

            <!-- <div
                v-if="properConfig && !isInSync && !isManual && isMinimized && !renderingInProgress && uploadError"
                class="minimized-sync-error">
                Error during sync
            </div>

            <div
                v-if="isInSync && !noIssues && isMinimized"
                class="minimized-sync-issues">
                Issues during sync
            </div> -->
        </div>

        <a
            v-if="!isMinimized && uploadInProgress && !isManual"
            href="#"
            class="minimize-popup"
            @click.prevent.stop="minimizePopup">
            <icon
                size="s"
                name="minimize"/>
            <span>{{ $t('ui.minimize') }}</span>
        </a>
    </div>
</template>

<script>
import Utils from './../helpers/utils.js';

export default {
    name: 'sync-popup',
    watch: {
        'isVisible': function (newValue) {
            if (newValue === false) {
                this.$store.commit('setSyncStatus', false);
            }
        }
    },
    data () {
        return {
            isVisible: false,
            isMinimized: false,
            renderingInProgress: false,
            uploadInProgress: false,
            messageFromRenderer: 'true',
            renderingProgress: 0,
            renderingProgressColor: 'blue',
            renderingProgressIsStopped: false,
            messageFromUploader: '',
            uploadingProgress: 0,
            uploadingProgressColor: 'blue',
            uploadingProgressIsStopped: false,
            syncInProgress: false,
            isInSync: false,
            manualFilePath: '',
            uploadError: false,
            noIssues: true
        };
    },
    computed: {
        isGithubPages: function() {
            let deploymentConfig = this.$store.state.currentSite.config.deployment;
            return deploymentConfig && deploymentConfig.protocol === 'github-pages';
        },
        isGitlabPages: function() {
            let deploymentConfig = this.$store.state.currentSite.config.deployment;
            return deploymentConfig && deploymentConfig.protocol === 'gitlab-pages';
        },
        isManual: function() {
            let deploymentConfig = this.$store.state.currentSite.config.deployment;
            return deploymentConfig && deploymentConfig.protocol === 'manual';
        },
        properConfig: function() {
            return !this.noServerConfig && !this.noDomainConfig;
        },
        noDomainConfig: function() {
            let domainConfig = this.$store.state.currentSite.config.domain;

            if(domainConfig == false || domainConfig === 'http://' || domainConfig === 'https://') {
                return true;
            }

            return false;
        },
        noServerConfig: function() {
            let deploymentConfig = this.$store.state.currentSite.config.deployment;

            if (deploymentConfig) {
                if (deploymentConfig.protocol === 's3' && this.checkS3Config(deploymentConfig)) {
                    return false;
                }

                if (deploymentConfig.protocol === 'git' && this.checkGitConfig(deploymentConfig)) {
                    return false;
                }

                if (deploymentConfig.protocol === 'github-pages' && this.checkGithubConfig(deploymentConfig)) {
                    return false;
                }

                if (deploymentConfig.protocol === 'gitlab-pages' && this.checkGitlabConfig(deploymentConfig)) {
                    return false;
                }

                if (deploymentConfig.protocol === 'netlify' && this.checkNetlify(deploymentConfig)) {
                    return false;
                }

                if (deploymentConfig.protocol === 'google-cloud' && this.checkGoogleCloud(deploymentConfig)) {
                    return false;
                }

                if (deploymentConfig.protocol === 'manual' && deploymentConfig.manual.output !== '') {
                    return false;
                }
            }

            if (
                !deploymentConfig ||
                deploymentConfig.server === '' ||
                deploymentConfig.username === '' ||
                deploymentConfig.protocol === '' ||
                deploymentConfig.port === ''
            ) {
                return true;
            }

            return false;
        }
    },
    mounted: function() {
        this.$bus.$on('sync-popup-display', (config) => {
            if (this.isVisible) {
                return;
            }

            this.isVisible = true;
            this.isMinimized = false;
            this.messageFromRenderer = '';
            this.renderingProgress = 0;
            this.renderingProgressColor = 'blue';
            this.renderingProgressIsStopped = false;
            this.messageFromUploader = '';
            this.uploadInProgress = false;
            this.uploadingProgress = 0;
            this.uploadingProgressColor = 'blue';
            this.uploadingProgressIsStopped = false;
            this.syncInProgress = false;
            this.isInSync = false;
            this.manualFilePath = '';
            this.uploadError = false;
            this.noIssues = true;
        });

        this.$bus.$on('sync-popup-maximize', this.maximizePopup);

        mainProcessAPI.receive('app-rendering-progress', this.renderingProgressUpdate);

        // Load the rendering error results (if exists)
        mainProcessAPI.receive('app-deploy-render-error', (data) => {
            this.$store.commit('setSidebarStatus', 'not-prepared');

            if (data.message[0].message.translation) {
                data.message[0].message = this.$t(data.message[0].message.translation);
            }

            if (data.message[0].desc.translation) {
                data.message[0].desc = this.$t(data.message[0].desc.translation);
            }

            let errorsHTML = Utils.generateErrorLog(data);
            let errorsText = Utils.generateErrorLog(data, true);

            this.renderingProgress = 100;
            this.renderingProgressColor = 'red';
            this.renderingProgressIsStopped = true;
            this.messageFromRenderer = this.$t('rendering.renderingErrorText');

            setTimeout(() => {
                this.close();
                this.$bus.$emit('error-popup-display', {
                    errors: errorsHTML,
                    text: errorsText
                });
            }, 500);
        });

        // Load the rendering results
        mainProcessAPI.receive('app-deploy-rendered', (data) => {
            if (data.status) {
                this.$store.commit('setSidebarStatus', 'prepared');
                this.startUpload();
            } else {
                this.$store.commit('setSidebarStatus', 'not-prepared');
            }
        });

        mainProcessAPI.receive('app-connection-in-progress', () => {
            this.messageFromUploader = this.$t('sync.connectingToServer');
        });

        mainProcessAPI.stopReceive('app-connection-error', this.showError);
        mainProcessAPI.receive('app-connection-error', this.showError);

        mainProcessAPI.receive('app-connection-success', () => {
            this.messageFromUploader = this.$t('sync.connectedToServer');
        });

        mainProcessAPI.receive('app-uploading-progress', this.uploadingProgressUpdate);
        mainProcessAPI.receive('no-remote-files', this.askForContinueSync);
        document.body.addEventListener('keydown', this.onDocumentKeyDown);
    },
    methods: {
        goToServerSettings: function() {
            let siteName = this.$store.state.currentSite.config.name;
            this.$router.push('/site/' + siteName + '/settings/server/');
            this.close();
        },
        openWebsite: function() {
            let urlToOpen = Utils.getValidUrl(this.$store.state.currentSite.config.domain);

            if (urlToOpen) {
                mainProcessAPI.shellOpenExternal(urlToOpen);
            } else {
                alert(this.$t('sync.websiteLinkInvalidMsg'));
            }

            this.close();
        },
        showFolder: function() {
            let folderPath = this.manualFilePath;
            mainProcessAPI.shellShowItemInFolder(folderPath);
            this.close();
        },
        close: function() {
            this.isVisible = false;
        },
        startSync () {
            if(!this.themeIsSelected) {
                this.$bus.$emit('confirm-display', {
                    message: this.$t('rendering.selectThemeBeforeCreatingPreviewMsg'),
                    okLabel: this.$t('sync.goToSettings'),
                    okClick: () => {
                        let siteName = this.$route.params.name;
                        this.$route.push('/site/' + siteName + '/settings/');
                    }
                });

                return;
            }

            this.syncInProgress = true;
            this.uploadInProgress = false;
            this.renderingInProgress = false;

            if (!this.uploadError) {
                this.messageFromRenderer = '';
                this.renderingProgress = 0;
                this.renderingProgressColor = 'blue';
                this.renderingProgressIsStopped = false;
                this.messageFromUploader = '';
                this.uploadingProgress = 0;
                this.uploadingProgressColor = 'blue';
                this.uploadingProgressIsStopped = false;
                this.startRendering();
            } else {
                this.uploadError = false;
                this.startUpload();
                this.messageFromUploader = '';
                this.uploadingProgress = 0;
                this.uploadingProgressColor = 'blue';
                this.uploadingProgressIsStopped = false;
            }
        },
        askForContinueSync () {
            this.$bus.$emit('confirm-display', {
                hasInput: false,
                message: this.$t('settings.continueSyncNoRemoteFiles'),
                okClick: this.continueSync,
                okLabel: this.$t('settings.continueSync'),
                cancelLabel: this.$t('ui.cancel'),
                cancelClick: this.cancelSync
            });
        },
        continueSync () {
            mainProcessAPI.send('app-deploy-continue');
        },
        cancelSync () {
            if (this.renderingInProgress) {
                mainProcessAPI.send('app-deploy-render-abort', {
                    'site': this.$store.state.currentSite.config.name
                });
            }

            if (this.syncInProgress) {
                mainProcessAPI.send('app-deploy-abort', {
                    'site': this.$store.state.currentSite.config.name
                });
            }

            if (this.syncInProgress || this.renderingInProgress) {
                mainProcessAPI.receiveOnce('app-deploy-aborted', () => {
                    this.$store.commit('setSidebarStatus', 'not-synced');
                    this.close();
                });
            } else {
                this.close();
            }
        },
        startRendering: function() {
            this.renderingInProgress = true;
            this.$store.commit('setSidebarStatus', 'preparing');
            this.messageFromRenderer = '';
            this.renderingProgress = 0;
            this.renderingProgressColor = 'blue';
            this.renderingProgressIsStopped = false;

            mainProcessAPI.send('app-deploy-render', {
                'site': this.$store.state.currentSite.config.name,
                'theme': this.$store.state.currentSite.config.theme
            });
        },
        renderingProgressUpdate: function(data) {
            if (this.renderingProgress > data.progress) {
                return;
            }

            if (data.message.translation) {
                data.message = this.$t(data.message.translation);
            }

            this.messageFromRenderer = data.message + ' - ' + data.progress + '%';
            this.renderingProgress = data.progress;

            if(this.renderingProgress === 100) {
                this.renderingProgressColor = 'green';
                this.renderingProgressIsStopped = true;

                if(this.isManual) {
                    this.messageFromRenderer = this.$t('file.preparingFilesInOutputDir');
                } else {
                    this.messageFromRenderer = '';
                }
            }
        },
        uploadingProgressUpdate: function(data) {
            if(this.uploadingProgress > data.progress) {
                return;
            }

            this.uploadingProgress = data.progress;
            this.messageFromUploader = this.$t('sync.uploadingWebsite');

            if(data.operations) {
                this.messageFromUploader = `${this.$t('sync.uploadingWebsite')} (${data.operations[0]} ${this.$t('ui.of')} ${data.operations[1]} ${this.$t('sync.operationsDone')})`;
            }

            if(data.message) {
                if (data.message.translation) {
                    data.message = this.$t(data.message.translation);
                }
                this.messageFromUploader = data.message;
            }
        },
        showError: function(data) {
            this.messageFromUploader = this.$t('sync.connectionToServerErrorText');
            this.uploadError = true;
            this.uploadingProgressColor = 'red';
            this.uploadingProgress = 100;
            this.uploadingProgressIsStopped = true;
            this.syncInProgress = false;
            this.$store.commit('setSidebarStatus', 'prepared');

            if(data && data.additionalMessage ) {
                if (data.additionalMessage.translation) {
                    if (data.additionalMessage.translationVars) {
                        data.additionalMessage = this.$t(data.additionalMessage.translation, data.message.translationVars);
                    } else {
                        data.additionalMessage = this.$t(data.additionalMessage.translation);
                    }
                }
                this.$bus.$emit('alert-display', {
                    message: this.$t('sync.connectionToServerErrorAdditionalMessage') + data.additionalMessage
                });
            } else {
                this.$bus.$emit('alert-display', {
                    message: this.$t('sync.connectionToServerErrorMessage')
                });
            }
        },
        startUpload: function() {
            this.renderingInProgress = false;
            this.uploadInProgress = true;
            this.$store.commit('setSyncStatus', true);
            this.$store.commit('setSidebarStatus', 'syncing');

            if(
                this.$store.state.currentSite.config.deployment.askforpassword &&
                ['ftp', 'sftp', 'ftp+tls'].indexOf(this.$store.state.currentSite.config.deployment.protocol) > -1
            ) {
                let serverName = this.$store.state.currentSite.config.deployment.server;

                this.$bus.$emit('confirm-display', {
                    message: this.$t('sync.provideFTPPasswordForServer') + serverName,
                    hasInput: true,
                    inputIsPassword: true,
                    okClick: (result) => {
                        if(!result || result.trim() === '') {
                            this.$bus.$emit('alert-display', {
                                message: this.$t('sync.syncFTPNoPasswordMsg')
                            });

                            this.uploadingProgress = 0;
                            this.messageFromUploader = '';
                            this.syncInProgress = false;
                            this.uploadError = true;
                            return;
                        }

                        this.handleUploadEvents(result);
                    },
                    cancelClick: () => {
                        this.$bus.$emit('alert-display', {
                            message: this.$t('sync.syncFTPNoPasswordMsg')
                        });

                        this.uploadingProgress = 0;
                        this.messageFromUploader = '';
                        this.syncInProgress = false;
                        this.uploadError = true;
                    }
                });
            } else {
                this.handleUploadEvents(false);
            }
        },
        handleUploadEvents(askedPassword) {
            // Send request for uploading the site
            mainProcessAPI.send('app-deploy-upload', {
                'site': this.$store.state.currentSite.config.name,
                'password': askedPassword
            });

            // Load the deployment results
            mainProcessAPI.receiveOnce('app-deploy-uploaded', (data) => {
                if(data.type && data.path && this.isManual) {
                    this.isInSync = true;
                    this.manualFilePath = data.path;
                }

                this.uploadingProgress = 100;
                this.uploadingProgressIsStopped = true;
                this.syncInProgress = false;
                this.uploadInProgress = false;

                if (typeof data.issues !== 'undefined' && data.issues) {
                    this.noIssues = false;
                    this.uploadingProgressColor = 'orange';
                    this.messageFromUploader = '';
                } else {
                    this.uploadingProgressColor = 'green';
                    this.messageFromUploader = this.$t('sync.yourWebsiteIsInSync');
                }

                if (data.status) {
                    mainProcessAPI.send('app-sync-is-done', {
                        'site': this.$store.state.currentSite.config.name
                    });

                    this.$store.commit('setSyncDate', Date.now());
                }
            });

            mainProcessAPI.receiveOnce('app-sync-is-done-saved', () => {
                this.$store.commit('setSidebarStatus', 'synced');
                this.isInSync = true;

                if (this.isInSync && this.noIssues && this.isMinimized) {
                    this.isVisible = false;
                }
            });
        },
        checkS3Config: function(deploymentConfig) {
            if (deploymentConfig.s3 && deploymentConfig.s3.customProvider) {
                return  deploymentConfig.s3.endpoint !== '' &&
                        deploymentConfig.s3.id !== '' &&
                        deploymentConfig.s3.key !== '' &&
                        deploymentConfig.s3.bucket !== '';
            } else if (deploymentConfig.s3) {
                return  deploymentConfig.s3.region !== '' &&
                        deploymentConfig.s3.id !== '' &&
                        deploymentConfig.s3.key !== '' &&
                        deploymentConfig.s3.bucket !== '';
            }

            return false;
        },
        checkGitConfig: function(deploymentConfig) {
            if (
                deploymentConfig.git &&
                deploymentConfig.git.url !== '' &&
                deploymentConfig.git.branch !== '' &&
                deploymentConfig.git.user !== '' &&
                deploymentConfig.git.password !== '' &&
                deploymentConfig.git.commitAuthor !== '' &&
                deploymentConfig.git.commitMessage !== ''
            ) {
                return true;
            }

            return false;
        },
        checkGithubConfig: function(deploymentConfig) {
            if(
                deploymentConfig.github &&
                deploymentConfig.github.user !== '' &&
                deploymentConfig.github.repo !== '' &&
                deploymentConfig.github.branch !== ''
            ) {
                return true;
            }

            return false;
        },
        checkGitlabConfig: function(deploymentConfig) {
            if(
                deploymentConfig.gitlab &&
                deploymentConfig.gitlab.server !== '' &&
                deploymentConfig.gitlab.repo !== '' &&
                deploymentConfig.gitlab.branch !== '' &&
                deploymentConfig.gitlab.token !== ''
            ) {
                return true;
            }

            return false;
        },
        checkNetlify: function(deploymentConfig) {
            if(
                deploymentConfig.netlify &&
                deploymentConfig.netlify.id !== '' &&
                deploymentConfig.netlify.token !== ''
            ) {
                return true;
            }

            return false;
        },
        checkGoogleCloud: function(deploymentConfig) {
            if(
                deploymentConfig.google &&
                deploymentConfig.google.projectId !== '' &&
                deploymentConfig.google.key !== '' &&
                deploymentConfig.google.bucket !== ''
            ) {
                return true;
            }

            return false;
        },
        themeIsSelected() {
            return !(!this.$store.state.currentSite.config.theme || this.$store.state.currentSite.config.theme === '');
        },
        onDocumentKeyDown (e) {
            if (e.code === 'Enter' && !event.isComposing && this.isVisible && !this.syncInProgress) {
                this.onEnterKey();
            }
        },
        onEnterKey () {
            if (this.isInSync && this.noIssues && this.isManual) {
                this.showFolder();
            } else if (this.properConfig && !this.isInSync) {
                this.startSync();
            } else if (this.noDomainConfig || (!this.noDomainConfig && this.noServerConfig)) {
                this.goToServerSettings();
            }
        },
        maximizePopup () {
            if (this.isMinimized) {
                this.isMinimized = false;
            }
        },
        minimizePopup () {
            if (!this.isMinimized) {
                this.isMinimized = true;
            }
        }
    },
    beforeDestroy: function() {
        this.$bus.$off('sync-popup-display');
        this.$bus.$off('sync-popup-maximize', this.maximizePopup);
        mainProcessAPI.stopReceiveAll('app-preview-render-error');
        mainProcessAPI.stopReceiveAll('app-rendering-progress');
        mainProcessAPI.stopReceiveAll('app-connection-error', this.showError);
        document.body.removeEventListener('keydown', this.onDocumentKeyDown);
    }
}
</script>

<style lang="scss" scoped>
@import '../scss/variables.scss';
@import '../scss/popup-common.scss';

.popup {
    background: none;
    max-width: $wrapper;
    overflow: visible;
    width: 100%;

    .description {
        color: var(--text-light-color);
        font-size: 1.4rem;
        line-height: 1.4;
        margin: auto;
        padding: 0 1rem;
        text-align: center;

        &.alert {
            background: var(--highlighted);
            border-radius: .2em;
            color: var(--text-primary-color);
            font-size: 1.4rem;
            margin-bottom: 3rem;
            padding: 1rem 2rem;
            text-align: left;
        }

        strong {
            color: var(--text-primary-color);
        }
    }
}

.sync {
    svg {
        display: block;
        float: none;
        margin: 2.6rem auto;
    }
}

.message {
    color: var(--text-primary-color);
    font-weight: 400;
    margin: 0;
    padding: 4rem;
    position: relative;
    text-align: left;

    &.text-centered {
        text-align: center;
    }
}

.buttons {
    display: flex;
    justify-content: center;
    margin-top: 4rem;
    position: relative;
    text-align: center;
    top: 1px;
}

.progress-bars-wrapper {
    margin-top: 7rem;
    margin-bottom: -4rem;
    position: relative;

    .progress-wrapper + .progress-wrapper {
        left: 0;
        position: absolute;
        top: 0;
        width: 100%;
        z-index: 10;
    }
}

.minimize-popup {
   align-items: center;
   color: var(--icon-secondary-color);
   display: flex;
   position: absolute;
   right: 3.2rem;
   will-change: transform;

   &:active,
   &:focus,
   &:hover {
      color: var(--icon-tertiary-color);

      svg {
           transform: scale(.9);
      }
   }

   & > svg {
      transition: var(--transition);
   }

   & > span {
      margin-left: .6rem;
   }
}

.overlay {
    transition: 0.5s cubic-bezier(.17,.67,.13,1.05) all;

    &.is-minimized {
        animation: minimized-popup .25s linear .25s forwards;
        border-radius: 10px;
        box-shadow: 0 0 160px rgba(0, 0, 0, .2);
        cursor: pointer;
        bottom: 56px;
        left: 0;
        opacity: 0;
        overflow: visible;
        padding: 0;
        top: auto!important;
        transform: translateY(10%) scale(.8);
        z-index: 1;

        & .progress-message, .minimized-sync-error {
            color: white !important;
        }

        .popup {
            animation: minimized-content .25s cubic-bezier(.17,.67,.13,1.05) .25s forwards;
            margin-top: 2.6rem;
            position: initial;
            transform: none;
            visibility: hidden;

            .minimized-sync-in-progress {
                max-width: 20rem;
            }
        }

        @keyframes minimized-popup {

            50% {opacity: 0;
                transform: translateY(10%);
            }
            99% {
                transform: translateY(10%);
            }

            100% {
                box-shadow: none;
                border-radius: 3px;
                background: none;
                height: 50px;
                width: 240px;
                opacity: 1;
                transform: translate(40px, 0);
            }
        }

        @keyframes minimized-content {
            99% {visibility: hidden;}
            100% {visibility: visible;}
        }
    }
}

</style>
