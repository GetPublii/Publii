<template>
    <div class="overlay" v-if="isVisible">
        <div class="popup">
            <h1>{{ $t('rendering.rendering') }}</h1>
            <p class="popup-info">
                {{ $t('rendering.renderingPleaseWait') }}
            </p>

            <progress-bar
                v-if="!isPostPreview && !isHomepagePreview"
                :color="progressColor"
                :progress="progress"
                :stopped="progressIsStopped"
                :message="messageFromRenderer" />
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
            progress: 0,
            progressColor: 'blue',
            progressIsStopped: false
        };
    },
    mounted: function() {
        this.$bus.$on('rendering-popup-display', (config) => {
            this.isVisible = true;
            this.messageFromRenderer = '';
            this.progress = 0;
            this.progressColor = 'blue';
            this.progressIsStopped = false;
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
                        setTimeout(() => {
                            this.isVisible = false;
                        }, 500);
                    }
                } else {
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
            this.messageFromRenderer = data.message + ' - ' + data.progress + '%';
            this.progress = data.progress;

            if(this.progress === 100) {
                this.progressColor = 'green';
                this.progressIsStopped = true;
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

<style lang="scss" scoped>
@import '../scss/variables.scss';
@import '../scss/popup-common.scss';

.popup {
    padding: 4rem 4rem 1rem 4rem;
    width: 60rem;

    &-info {
        margin: -1.5rem 0 4rem;
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
</style>
