<template>
    <div class="overlay" v-if="isVisible">
        <div class="popup progress-status">
            <progress-orb
                class="progress-status-orb"
                appearance="flat"
                :phase="progressIntent === 'success' ? 'success' : 'rendering'"
                :progress="progress"
                :indeterminate="isPartialPreview && progressIntent !== 'success'"
                role="progressbar"
                :aria-label="$t('rendering.preparingPreview')"
                aria-valuemin="0"
                aria-valuemax="100"
                :aria-valuenow="isPartialPreview && progressIntent !== 'success' ? null : progress"
                :aria-valuetext="previewMessage">
                <template #icon>
                    <icon
                        name="preview-layout"
                        class="progress-status-icon"
                        non-interactive
                        aria-hidden="true" />
                </template>
            </progress-orb>

            <div class="progress-status-text">
                <div class="progress-status-heading">
                    <h1 class="progress-status-title">
                        {{ $t('rendering.preparingPreview') }}
                    </h1>
                    <span
                        v-if="!isPartialPreview"
                        class="progress-status-percent"
                        aria-hidden="true">
                        {{ progress }}%
                    </span>
                </div>
                <p
                    class="progress-status-message"
                    :title="previewMessage">
                    {{ previewMessage }}
                </p>
            </div>
        </div>
    </div>
</template>

<script>
import Utils from './../helpers/utils.js';

export default {
    name: 'rendering-popup',
    data: function() {
        return {
            isVisible: false,
            isPostPreview: false,
            isHomepagePreview: false,
            isTagPreview: false,
            isAuthorPreview: false,
            messageFromRenderer: '',
            previewTitle: '',
            progress: 0,
            progressIntent: 'default'
        };
    },
    computed: {
        isPartialPreview () {
            return this.isPostPreview || this.isHomepagePreview || this.isTagPreview || this.isAuthorPreview;
        },
        previewMessage () {
            if (this.progressIntent === 'success') {
                return this.$t('rendering.previewReady');
            }

            if (this.isPartialPreview && this.previewTitle) {
                return this.previewTitle;
            }

            return this.messageFromRenderer || this.$t('rendering.startingPreview');
        }
    },
    mounted: function() {
        this.$bus.$on('rendering-popup-display', (config) => {
            this.isVisible = true;
            this.messageFromRenderer = '';
            this.previewTitle = config && config.postData && typeof config.postData.title === 'string' ? config.postData.title : '';
            this.progress = 0;
            this.progressIntent = 'default';
            this.isPostPreview = false;
            this.isHomepagePreview = false;
            this.isTagPreview = false;
            this.isAuthorPreview = false;
            this.showPreview = true;

            if (config && typeof config.showPreview !== 'undefined') {
                this.showPreview = config.showPreview;
            }

            if (config && config.homepageOnly) {
                this.isHomepagePreview = true;
                this.runRenderingPreview(false, 'home');
            } else if (config && config.tagOnly) {
                this.isTagPreview = true;
                this.runRenderingPreview(config, 'tag');
            } else if (config && config.authorOnly) {
                this.isAuthorPreview = true;
                this.runRenderingPreview(config, 'author');
            } else if (config && config.postOnly) {
                this.isPostPreview = true;
                this.runRenderingPreview(config, config.itemType);
            } else {
                this.runRenderingPreview();
            }
        });

        mainProcessAPI.receive('app-rendering-progress', this.renderingProgress);
    },
    methods: {
        runRenderingPreview (itemConfig = false, mode = false) {
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

            let renderConfig = {
                "site": this.$store.state.currentSite.config.name,
                "theme": this.$store.state.currentSite.config.theme,
                "showPreview": this.showPreview
            };

            if (mode === 'post' && itemConfig) {
                renderConfig.mode = 'post';
                renderConfig.itemID = itemConfig.itemID;
                renderConfig.postData = itemConfig.postData;
                renderConfig.source = 'post-editor';
            } else if (mode === 'page' && itemConfig) {
                renderConfig.mode = 'page';
                renderConfig.itemID = itemConfig.itemID;
                renderConfig.postData = itemConfig.postData;
                renderConfig.source = 'post-editor';
            } else if (mode === 'home') {
                renderConfig.mode = 'home';
            } else if (mode === 'tag') {
                renderConfig.mode = 'tag';
                renderConfig.itemID = itemConfig.itemID;
            } else if (mode === 'author') {
                renderConfig.mode = 'author';
                renderConfig.itemID = itemConfig.itemID;
            }

            mainProcessAPI.send('app-preview-render', renderConfig);

            console.log('SEND');

            mainProcessAPI.receiveOnce('app-preview-rendered', (data) => {
                console.log('RECEIVE', data);
                if (data.status === true) {
                    if (mode === 'post' || mode === 'page' || mode === 'home' || mode === 'tag' || mode === 'author') {
                        this.progress = 100;
                        this.progressIntent = 'success';
                        setTimeout(() => {
                            this.isVisible = false;
                        }, 500);
                    }
                } else {
                    this.isVisible = false;
                    this.$bus.$emit('alert-display', {
                        message: this.$t('rendering.errorDuringPreviewCreatingMsg')
                    });
                }
            });

            console.log('STOP RECEIVEING');
            mainProcessAPI.stopReceiveAll('app-preview-render-error');
            mainProcessAPI.receiveOnce('app-preview-render-error', this.renderError);
        },
        renderingProgress: function(data) {
            this.messageFromRenderer = data.message;
            this.progress = data.progress;

            if(this.progress === 100) {
                this.progressIntent = 'success';
                this.messageFromRenderer = '';

                setTimeout(() => {
                    this.isVisible = false;
                }, 500);
            }
        },
        renderError(data) {
            if (data.message[0].message.translation) {
                data.message[0].message = this.$t(data.message[0].message.translation);
            }

            if (data.message[0].desc.translation) {
                data.message[0].desc = this.$t(data.message[0].desc.translation);
            }

            let errorsHTML = Utils.generateErrorLog(data.message);
            let errorsText = Utils.generateErrorLog(data.message, true);

            this.$bus.$emit('error-popup-display', {
                errors: errorsHTML,
                text: errorsText
            });

            this.isVisible = false;
        },
        themeIsSelected() {
            return !(!this.$store.state.currentSite.config.theme || this.$store.state.currentSite.config.theme === '');
        }
    },
    beforeDestroy: function() {
        this.$bus.$off('rendering-popup-display');
        mainProcessAPI.stopReceiveAll('app-preview-render-error');
        mainProcessAPI.stopReceiveAll('app-rendering-progress');
    }
}
</script>

<style scoped>
@import '../css/popup-common.css';
@import '../css/progress-status.css';

.popup {
    max-height: calc(100% - var(--space-8));
    max-width: calc(100% - var(--space-8));
    overflow-y: auto;
    padding: 2.8rem var(--space-12);
    width: 48rem;
}

@media (max-width: 480px) {
    .popup {
        padding: 2.4rem var(--space-8);
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
</style>
