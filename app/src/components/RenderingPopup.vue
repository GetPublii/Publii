<template>
    <div class="overlay" v-if="isVisible">
        <div class="popup">
            <progress-orb
                class="preview-orb"
                :phase="progressIntent === 'success' ? 'success' : 'rendering'"
                :progress="progress"
                :indeterminate="isPartialPreview && progressIntent !== 'success'"
                role="progressbar"
                :aria-label="$t('rendering.preparingPreview')"
                aria-valuemin="0"
                aria-valuemax="100"
                :aria-valuenow="isPartialPreview && progressIntent !== 'success' ? null : progress">
                <template #icon>
                    <icon
                        name="preview-layout"
                        class="preview-orb-icon"
                        focusable="false" />
                </template>
            </progress-orb>

            <div class="heading">
                <div class="preview-heading">
                    <h1>{{ $t('rendering.preparingPreview') }}</h1>
                    <span
                        v-if="!isPartialPreview"
                        class="preview-progress-percent">
                        {{ progress }}%
                    </span>
                </div>
                <p
                    class="preview-progress-message"
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

.popup {
    align-items: center;
    display: flex;
    gap: 2.6rem;
    max-height: calc(100% - var(--space-8));
    max-width: calc(100% - var(--space-8));
    overflow-y: auto;
    padding: 2.8rem var(--space-12);
    width: 48rem;
}

.heading {
    flex: 1;
    min-width: 0;
}

.preview-heading {
    align-items: baseline;
    display: flex;
    gap: 1.6rem;
    justify-content: space-between;

    h1 {
        font-weight: var(--font-weight-semibold);
        line-height: 1.4;
        margin: 0;
        overflow-wrap: anywhere;
        text-align: left;
    }
}

.preview-progress-percent {
    flex-shrink: 0;
    font-size: var(--font-size-ui-sm);
    font-variant-numeric: tabular-nums;
    font-weight: var(--font-weight-medium);
    min-width: 4ch;
    text-align: right;
}

.preview-progress-message {
    color: var(--text-light-color);
    font-size: var(--font-size-ui-sm);
    line-height: var(--line-height-base);
    margin: .6rem 0 0;
    min-height: 2rem;
    overflow: hidden;
    text-align: left;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.popup .preview-orb {
    --progress-orb-size: 6.4rem;
    --progress-orb-energy: .8;
    flex-shrink: 0;
    margin: 0;

    &::v-deep .progress-orb-glow,
    &::v-deep .progress-orb-shadow,
    &::v-deep .progress-orb-disc,
    &::v-deep .progress-orb-message {
        display: none;
    }

    &::v-deep .progress-orb-ring-track,
    &::v-deep .progress-orb-ring-value {
        stroke-width: 4;
    }

    &::v-deep .progress-orb-ring-track {
        stroke: var(--color-border-muted);
    }

    &.is-indeterminate::v-deep .progress-orb-ring {
        animation-duration: 3s;
    }
}

@media (max-width: 480px) {
    .popup {
        gap: 1.8rem;
        padding: 2.4rem var(--space-8);
    }

    .preview-heading {
        gap: var(--space-4);
    }
}

.preview-orb-icon {
    color: var(--progress-orb-color);
    height: 36%;
    left: 50%;
    position: absolute;
    top: 50%;
    transform: translate(-50%, -50%);
    transition: color .5s ease;
    width: 36%;
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
