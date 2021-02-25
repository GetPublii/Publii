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
                v-if="isInSync && noIssues && isManual"
                class="sync-success">                

                <h1>Your website is now in sync</h1>

                <p
                    v-if="isManual"
                    class="description">
                    Your website files has been prepared. Use the "Get website files" button below <br>to get your files in order to manually deploy them.
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
                        type="primary medium quarter-width"
                        :onClick="showFolder">
                        Get website files
                    </p-button>

                    <p-button
                        :onClick="close"
                        type="outline medium quarter-width">
                        OK
                    </p-button>
                </div>
            </div>

            <div
                v-if="isInSync && !noIssues && !isMinimized"
                class="sync-success">
                <h1>Some files were not synced properly.</h1>

                <p class="description">
                    Please check hard-upload-errors-log.txt files using the Tools -&gt; Log Viewer tool.
                </p>

                <div class="buttons">
                    <p-button
                        type="primary medium  quarter-width"
                        :onClick="openWebsite">
                        Visit your website
                    </p-button>

                    <p-button
                        :onClick="close"
                        type="outline medium quarter-width ">
                        OK
                    </p-button>
                </div>
            </div>

            <div
                v-if="properConfig && !isInSync && !isMinimized"
                class="sync-todo">
                <div class="heading">
                    <h1>Website synchronization</h1>                    

                    <p class="description">
                        Any duplicate files or filenames already in the destination location <br>that match the Publii-generated files will be overwritten.
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
                        Sync your website
                    </p-button>

                    <p-button
                        :onClick="cancelSync"
                        type="outline medium quarter-width">
                        Cancel
                    </p-button>
                </div>
            </div>

            <div
                v-if="noDomainConfig"
                class="sync-issues-to-resolve">                

                <h1>Make sure the domain name is set.</h1>
                <p class="description">                   
                    Your website cannot currently be synced as the settings appear to lack a domain name. <br>Check your server settings to ensure a domain name has been entered.
                </p>

                <div class="buttons">
                    <p-button
                        type="medium  quarter-width"
                        :onClick="goToServerSettings">
                        Go to Settings
                    </p-button>

                    <p-button
                        :onClick="close"
                        type="outline medium  quarter-width">
                        Cancel
                    </p-button>
                </div>
            </div>

            <div
                v-if="!noDomainConfig && noServerConfig"
                class="sync-issues-to-resolve">                

                <h1>Make sure the destination server is properly configured.</h1>
                <p class="description">
                    Your website cannot currently be synced as the destination server has not been configured correctly. <br>Check your server settings to ensure that the correct information has been entered.
                </p>

                <div class="buttons">
                    <p-button
                        type="medium  quarter-width"
                        :onClick="goToServerSettings">
                        Go to Settings
                    </p-button>

                    <p-button
                        type="outline medium  quarter-width"
                        :onClick="close">
                        Cancel
                    </p-button>
                </div>
            </div>

            <!-- Minimized states -->
            <div
                v-if="properConfig && !isInSync && !isManual && isMinimized && !renderingInProgress && !uploadError"
                class="minimized-sync-in-progress">
                <progress-bar
                    v-if="(uploadInProgress || syncInProgress || isInSync || uploadError)"
                    :cssClasses="{ 'sync-progress-bar': true, 'is-in-progress': (uploadInProgress || syncInProgress), 'is-synced': isInSync, 'is-error': uploadError }"
                    :color="uploadingProgressColor"
                    :progress="uploadingProgress"
                    :stopped="uploadingProgressIsStopped"
                    :message="messageFromUploader" />
            </div>

            <div
                v-if="properConfig && !isInSync && !isManual && isMinimized && !renderingInProgress && uploadError"
                class="minimized-sync-error">
                Error during sync
            </div>

            <div
                v-if="isInSync && !noIssues && isMinimized"
                class="minimized-sync-issues">
                Issues during sync
            </div>
        </div>

        <a 
            v-if="!isMinimized && uploadInProgress && !isManual"
            href="#"
            @click.prevent="minimizePopup">
            Minimize
        </a>
    </div>
</template>

<script>
import { ipcRenderer, shell } from 'electron';
import Utils from './../helpers/utils.js';

export default {
    name: 'sync-popup',
    watch: {
        'isVisible': function (newValue) {
            if (newValue === false) {
                this.$bus.$emit('website-sync-in-progress', false);
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

            if(deploymentConfig) {
                if(deploymentConfig.protocol === 's3' && this.checkS3Config(deploymentConfig)) {
                    return false;
                }

                if(deploymentConfig.protocol === 'github-pages' && this.checkGithubConfig(deploymentConfig)) {
                    return false;
                }

                if(deploymentConfig.protocol === 'gitlab-pages' && this.checkGitlabConfig(deploymentConfig)) {
                    return false;
                }

                if(deploymentConfig.protocol === 'netlify' && this.checkNetlify(deploymentConfig)) {
                    return false;
                }

                if(deploymentConfig.protocol === 'google-cloud' && this.checkGoogleCloud(deploymentConfig)) {
                    return false;
                }

                if(deploymentConfig.protocol === 'manual' && deploymentConfig.manual.output !== '') {
                    return false;
                }
            }

            if(
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
            this.uploadingProgress = 0;
            this.uploadingProgressColor = 'blue';
            this.uploadingProgressIsStopped = false;
            this.syncInProgress = false;
            this.isInSync = false;
            this.manualFilePath = '';
            this.uploadError = false;
            this.noIssues = true;
        });

        ipcRenderer.on('app-rendering-progress', this.renderingProgressUpdate);

        // Load the rendering error results (if exists)
        ipcRenderer.on('app-deploy-render-error', (event, data) => {
            this.$store.commit('setSidebarStatus', 'not-prepared');

            let errorsHTML = Utils.generateErrorLog(data);
            let errorsText = Utils.generateErrorLog(data, true);

            this.renderingProgress = 100;
            this.renderingProgressColor = 'red';
            this.renderingProgressIsStopped = true;
            this.messageFromRenderer = 'An error occurred during rendering of your website.';

            setTimeout(() => {
                this.close();
                this.$bus.$emit('error-popup-display', {
                    errors: errorsHTML,
                    text: errorsText
                });
            }, 500);
        });

        // Load the rendering results
        ipcRenderer.on('app-deploy-rendered', (event, data) => {
            if (data.status) {
                this.$store.commit('setSidebarStatus', 'prepared');
                this.startUpload();
            } else {
                this.$store.commit('setSidebarStatus', 'not-prepared');
            }
        });

        ipcRenderer.on('app-connection-in-progress', () => {
            this.messageFromUploader = 'Connecting to the server...';
        });

        ipcRenderer.off('app-connection-error', this.showError);
        ipcRenderer.on('app-connection-error', this.showError);

        ipcRenderer.on('app-connection-success', () => {
            this.messageFromUploader = 'Connected to the server';
        });

        ipcRenderer.on('app-uploading-progress', this.uploadingProgressUpdate);
        document.body.addEventListener('keydown', this.onDocumentKeyDown);
    },
    methods: {
        goToServerSettings: function() {
            let siteName = this.$store.state.currentSite.config.name;

            this.$router.push({
                path: '/site/' + siteName + '/settings/server/'
            });

            this.close();
        },
        openWebsite: function() {
            let urlToOpen = Utils.getValidUrl(this.$store.state.currentSite.config.domain);

            if (urlToOpen) {
                shell.openExternal(urlToOpen);
            } else {
                alert('Sorry! The website link seems to be invalid.');
            }

            this.close();
        },
        showFolder: function() {
            let folderPath = this.manualFilePath;
            shell.showItemInFolder(folderPath);
            this.close();
        },
        close: function() {
            this.isVisible = false;
        },
        startSync () {
            if(!this.themeIsSelected) {
                this.$bus.$emit('confirm-display', {
                    message: 'You must select a theme before trying to preview your site. Go to page settings and select a theme.',
                    okLabel: 'Go to settings',
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
        cancelSync: function() {
            if (this.renderingInProgress) {
                ipcRenderer.send('app-deploy-render-abort', {
                    'site': this.$store.state.currentSite.config.name
                });
            } 
            
            if (this.syncInProgress) {
                ipcRenderer.send('app-deploy-abort', {
                    'site': this.$store.state.currentSite.config.name
                });
            }

            if (this.syncInProgress || this.renderingInProgress) {
                ipcRenderer.once('app-deploy-aborted', (event) => {
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

            ipcRenderer.send('app-deploy-render', {
                'site': this.$store.state.currentSite.config.name,
                'theme': this.$store.state.currentSite.config.theme
            });
        },
        renderingProgressUpdate: function(event, data) {
            if (this.renderingProgress > data.progress) {
                return;
            }

            this.messageFromRenderer = data.message + ' - ' + data.progress + '%';
            this.renderingProgress = data.progress;

            if(this.renderingProgress === 100) {
                this.renderingProgressColor = 'green';
                this.renderingProgressIsStopped = true;

                if(this.isManual) {
                    this.messageFromRenderer = 'Preparing files in the output directory';
                } else {
                    this.messageFromRenderer = '';
                }
            }
        },
        uploadingProgressUpdate: function(event, data) {
            if(this.uploadingProgress > data.progress) {
                return;
            }

            this.uploadingProgress = data.progress;
            this.messageFromUploader = 'Uploading website';

            if(data.operations) {
                this.messageFromUploader = 'Uploading website (' + data.operations[0] + ' of ' + data.operations[1] + ' operations done)';
            }

            if(data.message) {
                this.messageFromUploader = data.message;
            }
        },
        showError: function(event, data) {
            this.messageFromUploader = 'An error occurred during connecting to server...';
            this.uploadError = true;
            this.uploadingProgressColor = 'red';
            this.uploadingProgress = 100;
            this.uploadingProgressIsStopped = true;
            this.syncInProgress = false;
            this.$store.commit('setSidebarStatus', 'prepared');

            if(data && data.additionalMessage) {
                this.$bus.$emit('alert-display', {
                    message: 'An error occurred during connecting to the server: ' + data.additionalMessage
                });
            } else {
                this.$bus.$emit('alert-display', {
                    message: 'An error occurred during connecting to the server. Please check your server settings or try again.'
                });
            }
        }, 
        startUpload: function() {
            this.renderingInProgress = false;

            if (!this.isManual) {
                this.isMinimized = true;
            }

            this.uploadInProgress = true;
            this.$bus.$emit('website-sync-in-progress', true);
            this.$store.commit('setSidebarStatus', 'syncing');

            if(
                this.$store.state.currentSite.config.deployment.askforpassword &&
                ['ftp', 'sftp', 'ftp+tls'].indexOf(this.$store.state.currentSite.config.deployment.protocol) > -1
            ) {
                let serverName = this.$store.state.currentSite.config.deployment.server;

                this.$bus.$emit('confirm-display', {
                    message: 'Please provide your FTP password for the following server: ' + serverName,
                    hasInput: true,
                    inputIsPassword: true,
                    okClick: (result) => {
                        if(!result || result.trim() === '') {
                            this.$bus.$emit('alert-display', {
                                message: 'Without password you cannot sync your website. Please try again'
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
                            message: 'Without password you cannot sync your website. Please try again'
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
            ipcRenderer.send('app-deploy-upload', {
                'site': this.$store.state.currentSite.config.name,
                'password': askedPassword
            });

            // Load the deployment results
            ipcRenderer.once('app-deploy-uploaded', (event, data) => {
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
                    this.messageFromUploader = 'Your website is now in sync';
                }

                if (data.status) {
                    ipcRenderer.send('app-sync-is-done', {
                        'site': this.$store.state.currentSite.config.name
                    });

                    this.$store.commit('setSyncDate', Date.now());
                }
            });

            ipcRenderer.once('app-sync-is-done-saved', () => {
                this.$store.commit('setSidebarStatus', 'synced');
                this.isInSync = true;

                if (this.isInSync && this.noIssues && !this.isManual) {
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
        ipcRenderer.off('app-preview-render-error');
        ipcRenderer.off('app-rendering-progress');
        ipcRenderer.off('app-connection-error', this.showError);
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
            font-size: 1.5rem;
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

.overlay {
    transition: 0.7s cubic-bezier(.17,.67,.13,1.05) all;

    &.is-minimized {
        animation: minimized-popup .35s cubic-bezier(.17,.67,.13,1.05) .35s forwards;
        box-shadow: 0 0 160px rgba(0, 0, 0, .2);
        bottom: 56px;
        height: 50px;
        left: 0;
        overflow: visible;
        padding: 0;
        top: auto;
        width: 240px;border-radius: 10px; 
        transform: translate(calc(50vw - 120px), 0);  
        z-index: 1;    
  
        & .progress-message, .minimized-sync-error {
            color: white !important;
        }
    
        .popup {
            animation: minimized-content .35s cubic-bezier(.17,.67,.13,1.05) .35s forwards;
            margin-top: 1.6rem;
            position: initial;
            transform: none;
            visibility: hidden;
        }

        @keyframes minimized-popup {
            100% {transform: translate(40px, 0); height: 50px;width: 240px; box-shadow: none; border-radius: 3px; background: none;}
        }

        @keyframes minimized-content {
            99% {visibility: hidden;}
            100% {visibility: visible;}
        }
    }
}

</style>
