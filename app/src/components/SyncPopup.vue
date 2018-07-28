<template>
    <div class="overlay" v-if="isVisible">
        <div class="popup sync">
            <div
                v-if="isInSync"
                class="sync-success">
                <icon
                    size="xl"
                    name="success"
                    primaryColor="color-2" />

                <h2>Your website is now in sync</h2>

                <p
                    v-if="isGithubPages"
                    class="description alert">
                    <strong>Remember!</strong> Changes on Github Pages can be visible in a few minutes from the deployment.
                </p>

                <p
                    v-if="isGitlabPages"
                    class="description alert">
                    <strong>Remember!</strong> Changes on Gitlab Pages can be visible in a few minutes from the deployment.
                </p>

                <p
                    v-if="isManual"
                    class="description alert">
                    Your website files has been prepared. Use the "Get website files" button below to get your files in order to manually deploy them.
                </p>

                <div class="buttons">
                    <p-button
                        v-if="!isManual"
                        type="primary medium no-border-radius half-width"
                        :onClick="openWebsite">
                        Visit your website
                    </p-button>

                    <p-button
                        v-if="isManual"
                        type="primary medium no-border-radius half-width"
                        :onClick="showFolder">
                        Get website files
                    </p-button>

                    <p-button
                        :onClick="close"
                        type="cancel-popup medium half-width no-border-radius">
                        OK
                    </p-button>
                </div>
            </div>

            <div
                v-if="properConfig && !isInSync"
                class="sync-todo">
                <div class="heading">
                    <h1>Website synchronization</h1>

                    <p class="description">
                        After clicking the "Sync your website" button, your website will be rendered and uploaded to the server specified in the "Server Settings" page.
                    </p>

                    <p class="description alert">
                        <strong>Remember!</strong> Any duplicate files or filenames already in the destination location that match the Publii-generated files will be overwritten.
                    </p>
                </div>

                <progress-bar
                    :color="renderingProgressColor"
                    :progress="renderingProgress"
                    :stopped="renderingProgressIsStopped"
                    :message="messageFromRenderer" />

                <progress-bar
                    v-if="!isManual"
                    :color="uploadingProgressColor"
                    :progress="uploadingProgress"
                    :stopped="uploadingProgressIsStopped"
                    :message="messageFromUploader" />

                <div class="buttons">
                    <p-button
                        :onClick="startSync"
                        :type="syncInProgress ? 'disabled medium no-border-radius half-width': 'medium no-border-radius half-width'">
                        Sync your website
                    </p-button>

                    <p-button
                        :onClick="cancelSync"
                        type="cancel-popup medium no-border-radius half-width">
                        Cancel
                    </p-button>
                </div>
            </div>

            <div
                v-if="noDomainConfig"
                class="sync-issues-to-resolve">
                <icon
                    name="settings"
                    size="xl"
                    primaryColor="color-8" />

                <h2>Make sure the domain name is set.</h2>

                <div class="buttons">
                    <p-button
                        type="medium no-border-radius half-width"
                        :onClick="goToServerSettings">
                        Go to Settings
                    </p-button>

                    <p-button
                        :onClick="close"
                        type="cancel-popup medium no-border-radius half-width">
                        Cancel
                    </p-button>
                </div>
            </div>

            <div
                v-if="!noDomainConfig && noServerConfig"
                class="sync-issues-to-resolve">
                <icon
                    name="server"
                    size="xl"
                    primaryColor="color-8" />

                <h2>Make sure the destination server is properly configured.</h2>

                <div class="buttons">
                    <p-button
                        type="medium no-border-radius half-width"
                        :onClick="goToServerSettings">
                        Go to Settings
                    </p-button>

                    <p-button
                        type="cancel-popup medium no-border-radius half-width"
                        :onClick="close">
                        Cancel
                    </p-button>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import { ipcRenderer, shell } from 'electron';
import Utils from './../helpers/utils.js';

export default {
    name: 'sync-popup',
    data: function() {
        return {
            isVisible: false,
            messageFromRenderer: '',
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
            uploadError: false
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
            this.isVisible = true;
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

        ipcRenderer.on('app-connection-error', (event, data) => {
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
        });

        ipcRenderer.on('app-connection-success', () => {
            this.messageFromUploader = 'Connected to the server';
        });

        ipcRenderer.on('app-uploading-progress', this.uploadingProgressUpdate);
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
            let url = this.$store.state.currentSite.config.domain;
            shell.openExternal(url);
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
        startSync: function() {
            if(!this.themeIsSelected) {
                this.$bus.$emit('confirm-display', {
                    message: 'You have to select a theme before trying to create a preview of your website. Please go to the website settings and select a theme.',
                    okLabel: 'Go to settings',
                    okClick: () => {
                        let siteName = this.$route.params.name;
                        this.$route.push('/site/' + siteName + '/settings/');
                    }
                });

                return;
            }

            this.syncInProgress = true;

            if(!this.uploadError) {
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
            ipcRenderer.send('app-deploy-abort', {
                'site': this.$store.state.currentSite.config.name
            });

            ipcRenderer.once('app-deploy-aborted', (event) => {
                this.close();
            });
        },
        startRendering: function() {
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
            if(this.renderingProgress > data.progress) {
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
        startUpload: function() {
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
                this.uploadingProgressColor = 'green';
                this.uploadingProgressIsStopped = true;
                this.messageFromUploader = 'Your website is now in sync';
                this.syncInProgress = false;

                if (data.status) {
                    ipcRenderer.send('app-sync-is-done', {
                        'site': this.$store.state.currentSite.config.name
                    });

                    this.$store.state.currentSite.config.syncDate = Date.now();
                }
            });

            ipcRenderer.once('app-sync-is-done-saved', () => {
                this.$store.commit('setSidebarStatus', 'synced');
                this.isInSync = true;
            });
        },
        checkS3Config: function(deploymentConfig) {
            if(
                deploymentConfig.s3 &&
                deploymentConfig.s3.id !== '' &&
                deploymentConfig.s3.key !== '' &&
                deploymentConfig.s3.bucket !== '' &&
                deploymentConfig.s3.region !== ''
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
        }
    },
    beforeDestroy: function() {
        this.$bus.$off('sync-popup-display');
        ipcRenderer.removeAllListeners('app-preview-render-error');
        ipcRenderer.removeAllListeners('app-rendering-progress');
    }
}
</script>

<style lang="scss" scoped>
@import '../scss/variables.scss';
@import '../scss/popup-common.scss';

.popup {
    background-color: $color-10;
    border: none;
    border-radius: .6rem;
    display: inline-block;
    font-size: 1.6rem;
    font-weight: 400;
    left: 50%;
    overflow: hidden;
    padding: 4rem 4rem 6rem 4rem;
    position: absolute;
    text-align: center;
    top: 50%;
    transform: translateX(-50%) translateY(-50%);
    width: 70rem;

    .description {
        padding: 0 1rem;
        text-align: left;
    }

    .description.alert {
        background: $color-helper-5;
        font-size: 1.5rem;
        margin-bottom: 3rem;
        padding: 1rem 2rem;
        text-align: left;
    }
}

.sync {
    svg {
        display: block;
        float: none;
        margin: 2.5rem auto;
    }
}

.message {
    color: $color-5;
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
    margin: 4rem -4rem -6rem -4rem;
    position: relative;
    text-align: center;
    top: 1px;
}
</style>
