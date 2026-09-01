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
                :intent="progressIntent"
                :progress="progress"
                :message="message" />

            <div class="buttons">
                <p-button
                    v-if="!regenerateIsDone"
                    @click.native="regenerate"
                    :disabled="regeneratingThumbnails"
                    size="medium"
                    width="half"
                    square>
                    {{ $t('tools.thumbnails.regenerateThumbnails') }}
                </p-button>

                <p-button
                    v-if="!regenerateIsDone && !regeneratingThumbnails"
                    @click.native="skip"
                    :disabled="regeneratingThumbnails"
                    appearance="popup-cancel"
                    size="medium"
                    width="half"
                    square>
                    {{ $t('tools.thumbnails.skipRegeneration') }}
                </p-button>

                <p-button
                    v-if="regeneratingThumbnails"
                    @click.native="abortRegenerate"
                    appearance="popup-cancel"
                    size="medium"
                    width="half"
                    square>
                    {{ $t('ui.cancel') }}
                </p-button>

                <p-button
                    v-if="regenerateIsDone"
                    @click.native="skip"
                    :disabled="regeneratingThumbnails"
                    size="medium"
                    width="full"
                    square>
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
            progressIntent: 'default',
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
            this.progressIntent = 'default';
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
            this.progressIntent = 'default';
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
            this.message = this.$t('tools.thumbnails.regeneratingThumbnails');

            setTimeout(() => {
                mainProcessAPI.send('app-site-regenerate-thumbnails', {
                    name: this.$store.state.currentSite.config.name
                });

                mainProcessAPI.receiveOnce('app-site-regenerate-thumbnails-error', (data) => {
                    this.progressIntent = 'danger';
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
                    this.regeneratingThumbnails = false;
                    this.regenerateIsDone = true;

                    let brokenCount = (data && data.brokenFilesCount) || 0;

                    if (brokenCount > 0) {
                        this.progressIntent = 'warning';
                        this.message = this.$t('tools.thumbnails.thumbnailsCreatedWithErrors', { count: brokenCount });
                    } else {
                        this.progressIntent = 'success';
                        this.message = this.$t('tools.thumbnails.thumbnailsCreated');
                    }

                    if (this.savedSettingsCallback && brokenCount === 0) {
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

<style scoped>
@import '../css/popup-common.css';

.overlay {
    z-index: var(--layer-alert);
}

.popup {
    padding: var(--space-16) var(--space-16) 6rem var(--space-16);
    width: 60rem;

    h1 {
        margin-top: var(--space-8);
    }

    svg {
        fill: var(--icon-quaternary-color);

    }
}

.popup-info {
    font-size: var(--font-size-ui-md);
    color: var(--text-light-color);
    margin: -1.5rem 0 var(--space-16);
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
    display: flex;
    margin: 0 -4rem -6rem -4rem;
    position: relative;
    text-align: center;
    top: 1px;
}
</style>
