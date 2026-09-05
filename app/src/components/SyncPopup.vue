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

                <progress-orb
                    class="sync-orb"
                    phase="success"
                    :progress="100" />

                <!-- Separate state headings so v-pure-html content cannot leak into another state. -->
                <div class="heading" key="success-heading">
                    <h1>{{ successMessage }}</h1>

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
                </div>

                <div class="buttons">
                    <p-button
                        v-if="isManual"
                        intent="success"
                        size="medium"
                        :onClick="showFolder">
                        {{ $t('sync.showInFolder') }}
                    </p-button>

                    <p-button
                        v-if="!isManual"
                        intent="success"
                        size="medium"
                        :onClick="openWebsite">
                        {{ $t('sync.visitYourWebsite') }}
                    </p-button>

                    <p-button
                        :onClick="close"
                        appearance="clean-muted">
                        {{ $t('ui.close') }}
                    </p-button>
                </div>
            </div>

            <div
                v-if="isInSync && !noIssues && !isMinimized"
                class="sync-success">
                <progress-orb
                    class="sync-orb"
                    phase="warning"
                    :progress="100" />

                <div class="heading" key="warning-heading">
                    <h1>{{ $t('sync.filesNotSyncedErrorText') }}</h1>

                    <p class="description">
                        {{ $t('sync.filesNotSyncedErrorMessage') }}
                    </p>
                </div>

                <div class="buttons">
                    <p-button
                        size="medium"
                        :onClick="viewLog">
                        {{ $t('sync.viewLog') }}
                    </p-button>

                    <p-button
                        :onClick="close"
                        appearance="clean-muted">
                        {{ $t('ui.close') }}
                    </p-button>
                </div>
            </div>

            <div
                v-if="properConfig && !isInSync && !isMinimized"
                class="sync-todo">
                <progress-orb
                    class="sync-orb"
                    :phase="orbPhase"
                    :progress="orbProgress"
                    :indeterminate="orbIndeterminate"
                    :message="orbMessage" />

                <div class="heading" key="preparation-heading">
                    <h1>{{ isManual ? $t('sync.websiteFilesPreparation') : $t('sync.websiteSynchronization') }}</h1>

                    <p
                        class="description"
                        v-pure-html="$t('sync.websiteSynchronizationInfo')">
                    </p>
                </div>

                <div class="buttons">
                    <p-button
                        :onClick="startSync"
                        size="medium"
                        :disabled="syncInProgress">
                        {{ syncButtonLabel }}
                    </p-button>

                    <p-button
                        :onClick="cancelSync"
                        appearance="clean-muted">
                        {{ $t('ui.cancel') }}
                    </p-button>
                </div>
            </div>

            <div
                v-if="noDomainConfig"
                class="sync-issues-to-resolve">

                <div class="heading" key="domain-heading">
                    <h1>{{ $t('sync.domainNameNotSetErrorText') }}</h1>
                    <p
                        class="description"
                        v-pure-html="$t('sync.domainNameNotSetErrorMessage')">
                    </p>
                </div>

                <div class="buttons">
                    <p-button
                        size="medium"
                        :onClick="goToServerSettings">
                        {{ $t('sync.goToSettings') }}
                    </p-button>

                    <p-button
                        :onClick="close"
                        appearance="clean-muted">
                        {{ $t('ui.cancel') }}
                    </p-button>
                </div>
            </div>

            <div
                v-if="!noDomainConfig && noServerConfig"
                class="sync-issues-to-resolve">

                <div class="heading" key="server-heading">
                    <h1>{{ $t('sync.destinationServerNotConfiguredErrorText') }}</h1>
                    <p
                        class="description"
                        v-pure-html="$t('sync.destinationServerNotConfiguredErrorMessage')">
                    </p>
                </div>

                <div class="buttons">
                    <p-button
                        size="medium"
                        :onClick="goToServerSettings">
                        {{ $t('sync.goToSettings') }}
                    </p-button>

                    <p-button
                        appearance="clean-muted"
                        :onClick="close">
                        {{ $t('ui.cancel') }}
                    </p-button>
                </div>
            </div>

            <!-- Minimized states -->
            <div
                v-if="properConfig && (!isInSync || !noIssues) && !isManual && isMinimized && !renderingInProgress"
                class="minimized-sync-in-progress">
                <progress-bar
                    v-if="(uploadInProgress || syncInProgress || isInSync || uploadError || !noIssues)"
                    :cssClasses="{ 'sync-progress-bar': noIssues, 'is-in-progress': (uploadInProgress || syncInProgress), 'is-synced': (isInSync && noIssues), 'is-error': uploadError }"
                    :intent="uploadingProgressIntent"
                    :progress="uploadingProgress"
                    :message="messageFromUploader" />
            </div>

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
            renderingProgressIntent: 'default',
            messageFromUploader: '',
            uploadingProgress: 0,
            uploadingProgressIntent: 'default',
            syncInProgress: false,
            isInSync: false,
            manualFilePath: '',
            uploadError: false,
            noIssues: true
        };
    },
    computed: {
        successMessage () {
            if (this.isManual) {
                return this.$t('sync.websiteFilesReady');
            }

            if (this.isGithubPages) {
                return this.$t('sync.githubChangesSent');
            }

            if (this.isGitlabPages) {
                return this.$t('sync.gitlabChangesSent');
            }

            return this.$t('sync.yourWebsiteIsInSync');
        },
        syncButtonLabel () {
            if (this.syncInProgress) {
                return this.$t(this.isManual ? 'sync.preparingWebsiteFiles' : 'sync.syncingWebsite');
            }

            if (this.uploadError) {
                return this.$t(this.isManual ? 'sync.retryPreparation' : 'sync.retryUpload');
            }

            return this.$t(this.isManual ? 'sync.prepareWebsiteFiles' : 'sync.syncYourWebsite');
        },
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
        showsUploadMessage: function() {
            return !this.isManual && !this.renderingInProgress && (this.uploadInProgress || this.syncInProgress || this.isInSync || this.uploadError);
        },
        orbPhase: function() {
            if (this.uploadError || this.renderingProgressIntent === 'danger' || this.uploadingProgressIntent === 'danger') {
                return 'error';
            }

            if (this.isInSync || this.uploadingProgressIntent === 'success' || this.uploadingProgressIntent === 'warning') {
                return (this.noIssues && this.uploadingProgressIntent !== 'warning') ? 'success' : 'warning';
            }

            if (this.uploadInProgress) {
                return (this.isManual || this.uploadingProgress > 0) ? 'uploading' : 'connecting';
            }

            if (this.renderingInProgress) {
                return 'rendering';
            }

            return 'idle';
        },
        orbProgress: function() {
            switch (this.orbPhase) {
                case 'rendering':
                    return this.renderingProgress;
                case 'uploading':
                    return this.uploadingProgress;
                case 'success':
                case 'warning':
                case 'error':
                    return 100;
                default:
                    return 0;
            }
        },
        orbIndeterminate: function() {
            return this.orbPhase === 'connecting' || (this.orbPhase === 'uploading' && this.isManual);
        },
        orbMessage: function() {
            if (this.uploadError) {
                return this.messageFromUploader;
            }

            return this.showsUploadMessage ? this.messageFromUploader : this.messageFromRenderer;
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
            this.renderingProgressIntent = 'default';
            this.messageFromUploader = '';
            this.uploadInProgress = false;
            this.uploadingProgress = 0;
            this.uploadingProgressIntent = 'default';
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
            this.renderingProgressIntent = 'danger';
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
        viewLog () {
            let siteName = this.$store.state.currentSite.config.name;
            let path = '/site/' + siteName + '/tools/log-viewer';
            let filename = 'deployment-process.log';

            if (this.$route.path !== path || this.$route.query.file !== filename) {
                this.$router.push({ path, query: { file: filename } });
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
                this.renderingProgressIntent = 'default';
                this.messageFromUploader = '';
                this.uploadingProgress = 0;
                this.uploadingProgressIntent = 'default';
                this.startRendering();
            } else {
                this.uploadError = false;
                this.startUpload();
                this.messageFromUploader = '';
                this.uploadingProgress = 0;
                this.uploadingProgressIntent = 'default';
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
            this.renderingProgressIntent = 'default';

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
                this.renderingProgressIntent = 'success';

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
            this.messageFromUploader = this.$t(this.isManual ? 'sync.websiteFilesPreparationErrorText' : 'sync.connectionToServerErrorText');
            this.uploadError = true;
            this.uploadingProgressIntent = 'danger';
            this.uploadingProgress = 100;
            this.syncInProgress = false;
            this.$store.commit('setSidebarStatus', 'prepared');

            if(data && data.additionalMessage ) {
                if (data.additionalMessage.translation) {
                    if (data.additionalMessage.translationVars) {
                        data.additionalMessage = this.$t(data.additionalMessage.translation, data.additionalMessage.translationVars);
                    } else {
                        data.additionalMessage = this.$t(data.additionalMessage.translation);
                    }
                }
                this.$bus.$emit('alert-display', {
                    message: this.$t(this.isManual ? 'sync.websiteFilesPreparationErrorAdditionalMessage' : 'sync.connectionToServerErrorAdditionalMessage') + data.additionalMessage,
                    buttonStyle: 'danger'
                });
            } else {
                this.$bus.$emit('alert-display', {
                    message: this.$t(this.isManual ? 'sync.websiteFilesPreparationErrorMessage' : 'sync.connectionToServerErrorMessage'),
                    buttonStyle: 'danger'
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
                    message: this.$t('sync.provideServerPassword') + serverName,
                    okLabel: this.$t('sync.connect'),
                    hasInput: true,
                    inputIsPassword: true,
                    okClick: (result) => {
                        if(!result || result.trim() === '') {
                            this.$bus.$emit('alert-display', {
                                message: this.$t('sync.syncFTPNoPasswordMsg'),
                                buttonStyle: 'danger'
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
                            message: this.$t('sync.syncFTPNoPasswordMsg'),
                            buttonStyle: 'danger'
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
                this.syncInProgress = false;
                this.uploadInProgress = false;

                if (typeof data.issues !== 'undefined' && data.issues) {
                    this.noIssues = false;
                    this.uploadingProgressIntent = 'warning';
                    this.messageFromUploader = this.$t('sync.filesNotSyncedShortMessage');
                } else {
                    this.uploadingProgressIntent = 'success';
                    this.messageFromUploader = this.successMessage;
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
            if (e.code !== 'Enter' || e.isComposing || e.defaultPrevented || !this.isVisible || this.syncInProgress || this.isMinimized) {
                return;
            }

            // Let focused controls and the overlaid password/error dialogs handle Enter.
            if (document.body.classList.contains('has-popup-visible') ||
                (e.target && e.target.closest('button, a, input, textarea, select, [contenteditable="true"]'))) {
                return;
            }

            this.onEnterKey();
        },
        onEnterKey () {
            if (this.isInSync && !this.noIssues) {
                this.viewLog();
            } else if (this.isInSync && this.noIssues && this.isManual) {
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

<style scoped>
@import '../css/popup-common.css';

.popup {
    background: none;
    max-width: var(--wrapper-width);
    overflow: visible;
    width: 100%;

    .description {
        color: var(--text-light-color);
        font-size: var(--font-size-ui-md);
        line-height: 1.4;
        min-height: 2lh;
        margin: auto;
        padding: 0 var(--space-4);
        text-align: center;

        &.alert {
            background: var(--color-highlight-surface);
            border-radius: .2em;
            color: var(--text-primary-color);
            font-size: var(--font-size-ui-md);
            margin-bottom: var(--space-12);
            padding: var(--space-4) var(--space-8);
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
    font-weight: var(--font-weight-regular);
    margin: 0;
    padding: var(--space-16);
    position: relative;
    text-align: left;

    &.text-centered {
        text-align: center;
    }
}

.buttons {
    align-items: center;
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    justify-content: center;
    margin-top: var(--space-12);
    position: relative;
    text-align: center;
    top: 1px;

    .button {
        min-width: 20%;
    }

    .button + .button {
        margin-left: 0;
    }
}

.sync-orb {
    margin: 0 auto var(--space-8);
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
      transition: var(--transition-default);
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
        box-shadow: 0 0 160px oklch(from var(--black) l c h / 20%);
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
