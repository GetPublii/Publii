<template>
    <div
        class="overlay"
        v-if="isVisible">
        <div class="popup">
            <icon
                name="blank-image"
                customWidth="75"
                customHeight="62" />

            <h1>
                {{ $t('tools.thumbnails.themeOrThumbnailsSettingsChanged') }}
            </h1>

            <p class="popup-info">
                {{ $t('tools.thumbnails.processingRegenerateThumbnailsInfo') }}
            </p>

            <progress-bar
                :color="progressColor"
                :progress="progress"
                :stopped="progressIsStopped"
                :message="message" />

            <div class="buttons">
                <p-button
                    v-if="!regenerateIsDone"
                    @click.native="regenerate"
                    :disabled="regeneratingThumbnails"
                    type="medium no-border-radius half-width">
                    {{ $t('tools.thumbnails.regenerateThumbnails') }}
                </p-button>

                <p-button
                    v-if="!regenerateIsDone && !regeneratingThumbnails"
                    @click.native="skip"
                    :disabled="regeneratingThumbnails"
                    type="medium no-border-radius half-width cancel-popup">
                    {{ $t('tools.thumbnails.skipRegeneration') }}
                </p-button>

                <p-button
                    v-if="regeneratingThumbnails"
                    @click.native="abortRegenerate"
                    type="medium no-border-radius half-width cancel-popup">
                    {{ $t('ui.cancel') }}
                </p-button>

                <p-button
                    v-if="regenerateIsDone"
                    @click.native="skip"
                    :disabled="regeneratingThumbnails"
                    type="medium no-border-radius full-width">
                    {{ $t('ui.ok') }}
                </p-button>
            </div>
        </div>
    </div>
</template>

<script>
export default {
    name: 'regenerate-thumbnails-popup',
    data () {
        return {
            isVisible: false,
            message: '',
            progress: 0,
            progressColor: 'blue',
            progressIsStopped: false,
            regeneratingThumbnails: false,
            regenerateIsDone: false,
            savedSettingsCallback: false
        };
    },
    mounted () {
        this.$bus.$on('regenerate-thumbnails-display', (config) => {
            this.isVisible = true;
            this.message = '';
            this.progress = 0;
            this.progressColor = 'blue';
            this.progressIsStopped = false;
            this.regeneratingThumbnails = false;
            this.regenerateIsDone = false;
            this.savedSettingsCallback = config.savedSettingsCallback || false;
        });

        document.body.addEventListener('keydown', this.onDocumentKeyDown);
    },
    methods: {
        skip () {
            this.isVisible = false;
            this.message = '';
            this.progress = 0;
            this.progressColor = 'blue';
            this.progressIsStopped = false;
            this.regeneratingThumbnails = false;
            this.regenerateIsDone = false;

            if (this.savedSettingsCallback) {
                this.$bus.$emit('regenerate-thumbnails-close', this.savedSettingsCallback);
            }
        },
        regenerate () {
            if (this.regeneratingThumbnails) {
                return;
            }

            this.regeneratingThumbnails = true;
            this.progressIsStopped = false;
            this.message = this.$t('tools.thumbnails.regeneratingThumbnails');

            setTimeout(() => {
                mainProcessAPI.send('app-site-regenerate-thumbnails', {
                    name: this.$store.state.currentSite.config.name
                });

                mainProcessAPI.receiveOnce('app-site-regenerate-thumbnails-error', (data) => {
                    this.progressColor = 'red';
                    this.progressIsStopped = true;
                    this.message = data.message.translation ? this.$t(data.message.translation) : data.message;
                    this.regeneratingThumbnails = false;
                    this.regenerateIsDone = true;
                });

                mainProcessAPI.receive('app-site-regenerate-thumbnails-progress', (data) => {
                    this.progress = data.value;
                    this.message = this.$t('tools.thumbnails.progress') + data.value + '%';
                });

                mainProcessAPI.receiveOnce('app-site-regenerate-thumbnails-success', (data) => {
                    this.progress = 100;
                    this.progressColor = 'green';
                    this.progressIsStopped = true;
                    this.message = this.$t('tools.thumbnails.thumbnailsCreated');
                    this.regeneratingThumbnails = false;
                    this.regenerateIsDone = true;

                    if (this.savedSettingsCallback) {
                        this.skip();
                    }
                });
            }, 350);
        },
        onDocumentKeyDown (e) {
            if (e.code === 'Enter' && !event.isComposing && this.isVisible && !this.regeneratingThumbnails) {
                this.onEnterKey();
            }
        },
        onEnterKey () {
            if (this.regenerateIsDone) {
                this.skip();
            } else {
                this.regenerate();
            }
        },
        abortRegenerate () {
            mainProcessAPI.stopReceiveAll('app-site-regenerate-thumbnails-progress');
            mainProcessAPI.stopReceiveAll('app-site-regenerate-thumbnails-error');
            mainProcessAPI.stopReceiveAll('app-site-regenerate-thumbnails-success');
            mainProcessAPI.send('app-site-abort-regenerate-thumbnails', true);
            this.skip();
        }
    },
    beforeDestroy: function() {
        this.$bus.$off('regenerate-thumbnails-display');
        mainProcessAPI.stopReceiveAll('app-site-regenerate-thumbnails-error');
        mainProcessAPI.stopReceiveAll('app-site-regenerate-thumbnails-progress');
        mainProcessAPI.stopReceiveAll('app-site-regenerate-thumbnails-success');
        document.body.removeEventListener('keydown', this.onDocumentKeyDown);
    }
}
</script>

<style lang="scss" scoped>
@import '../scss/variables.scss';
@import '../scss/popup-common.scss';

.overlay {
    z-index: 100006;
}

.popup {
    padding: 4rem 4rem 6rem 4rem;
    width: 60rem;

    h1 {
        margin-top: 2rem;
    }

    svg {
        fill: var(--icon-quaternary-color);

    }

    &-info {
        font-size: 1.4rem;
        color: var(--text-light-color);
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
.buttons {
    display: flex;
    margin: 0 -4rem -6rem -4rem;
    position: relative;
    text-align: center;
    top: 1px;
}
</style>
