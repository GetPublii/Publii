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
import { getThumbnailsRegeneration } from '../helpers/thumbnails-regeneration';

export default {
    name: 'regenerate-thumbnails-popup',
    data () {
        return {
            isVisible: false,
            // The popup shows only the run it has started itself
            runStarted: false,
            savedSettingsCallback: false
        };
    },
    computed: {
        regeneration () {
            return getThumbnailsRegeneration(this.$store);
        },
        job () {
            return this.$store.state.components.thumbnailsRegeneration;
        },
        regeneratingThumbnails () {
            return this.runStarted && this.job.status === 'running';
        },
        regenerateIsDone () {
            return this.runStarted && (this.job.status === 'done' || this.job.status === 'error');
        },
        brokenCount () {
            return this.job.problems.length;
        },
        progress () {
            return this.runStarted ? this.job.progress : 0;
        },
        progressIntent () {
            if (!this.regenerateIsDone) {
                return 'default';
            }

            if (this.job.status === 'error') {
                return 'danger';
            }

            return this.brokenCount > 0 ? 'warning' : 'success';
        },
        message () {
            if (!this.runStarted) {
                return '';
            }

            if (this.job.status === 'error') {
                return this.job.error && this.job.error.translation ? this.$t(this.job.error.translation) : this.job.error;
            }

            if (this.job.status === 'done') {
                if (this.brokenCount > 0) {
                    return this.$t('tools.thumbnails.thumbnailsCreatedWithErrors', { count: this.brokenCount });
                }

                return this.$t('tools.thumbnails.thumbnailsCreated');
            }

            if (this.job.processed === 0) {
                return this.$t('tools.thumbnails.regeneratingThumbnails');
            }

            return this.$t('tools.thumbnails.progress') + this.job.progress + '%';
        }
    },
    watch: {
        'job.status' (status) {
            if (this.isVisible && this.runStarted && status === 'done' && this.savedSettingsCallback && this.brokenCount === 0) {
                this.skip();
            }
        }
    },
    mounted () {
        this.$bus.$on('regenerate-thumbnails-display', (config) => {
            this.isVisible = true;
            this.runStarted = false;
            this.savedSettingsCallback = config.savedSettingsCallback || false;
        });

        document.body.addEventListener('keydown', this.onDocumentKeyDown);
    },
    methods: {
        skip () {
            this.isVisible = false;
            this.runStarted = false;

            if (this.savedSettingsCallback) {
                this.$bus.$emit('regenerate-thumbnails-close', this.savedSettingsCallback);
            }
        },
        regenerate () {
            if (this.regeneratingThumbnails) {
                return;
            }

            this.runStarted = true;

            // New settings need a fresh run, even when one started earlier is still in progress
            this.regeneration.start(this.$store.state.currentSite.config.name, {
                restart: true
            });
        },
        onDocumentKeyDown (e) {
            if (e.code === 'Enter' && !e.isComposing && this.isVisible && !this.regeneratingThumbnails) {
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
            this.regeneration.stop();
            this.skip();
        }
    },
    beforeDestroy: function() {
        this.$bus.$off('regenerate-thumbnails-display');
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
