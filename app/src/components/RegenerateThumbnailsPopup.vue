<template>
    <div
        v-if="isVisible"
        class="overlay">
        <div
            ref="dialog"
            class="popup"
            role="dialog"
            aria-modal="true"
            :aria-labelledby="titleId"
            :aria-describedby="messageId"
            tabindex="-1"
            @keydown.stop="onDialogKeyDown">
            <div class="progress-status">
                <progress-orb
                    class="progress-status-orb"
                    appearance="flat"
                    :phase="orbPhase"
                    :progress="progress"
                    :indeterminate="isPreparing"
                    :role="regeneratingThumbnails ? 'progressbar' : null"
                    :aria-hidden="regeneratingThumbnails ? null : 'true'"
                    :aria-label="regeneratingThumbnails ? $t('tools.thumbnails.panelLabel') : null"
                    :aria-valuemin="regeneratingThumbnails ? 0 : null"
                    :aria-valuemax="regeneratingThumbnails ? 100 : null"
                    :aria-valuenow="regeneratingThumbnails && !isPreparing ? progress : null"
                    :aria-valuetext="regeneratingThumbnails ? message : null">
                    <template #icon>
                        <icon
                            :name="orbIcon"
                            class="progress-status-icon"
                            :class="{ 'is-ready': !runStarted }"
                            non-interactive
                            aria-hidden="true" />
                    </template>
                </progress-orb>

                <div class="progress-status-text">
                    <div class="progress-status-heading">
                        <h1
                            :id="titleId"
                            class="progress-status-title"
                            aria-live="polite"
                            aria-atomic="true">
                            {{ title }}
                        </h1>
                        <span
                            v-if="regeneratingThumbnails && !isPreparing"
                            class="progress-status-percent"
                            aria-hidden="true">
                            {{ progress }}%
                        </span>
                    </div>

                    <p
                        :id="messageId"
                        class="progress-status-message">
                        {{ message }}
                    </p>
                </div>
            </div>

            <div class="buttons">
                <template v-if="!regenerateIsDone && !regeneratingThumbnails">
                    <p-button
                        key="regenerate"
                        ref="primaryAction"
                        :onClick="regenerate"
                        size="medium"
                        width="half"
                        square>
                        {{ $t('tools.thumbnails.regenerate') }}
                    </p-button>
                    <p-button
                        key="skip"
                        :onClick="skip"
                        appearance="popup-cancel"
                        size="medium"
                        width="half"
                        square>
                        {{ $t('tools.thumbnails.skipRegeneration') }}
                    </p-button>
                </template>

                <p-button
                    v-if="regeneratingThumbnails"
                    key="cancel"
                    ref="primaryAction"
                    :onClick="abortRegenerate"
                    appearance="popup-cancel"
                    size="medium"
                    width="full"
                    square>
                    {{ $t('ui.cancel') }}
                </p-button>

                <p-button
                    v-if="regenerateIsDone"
                    key="done"
                    ref="primaryAction"
                    :onClick="skip"
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
            reason: 'settings',
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
        titleId () {
            return 'regenerate-thumbnails-title-' + this._uid;
        },
        messageId () {
            return 'regenerate-thumbnails-message-' + this._uid;
        },
        regeneratingThumbnails () {
            return this.runStarted && this.job.status === 'running';
        },
        regenerateIsDone () {
            return this.runStarted && (this.job.status === 'done' || this.job.status === 'error');
        },
        isPreparing () {
            return this.regeneratingThumbnails && this.job.processed === 0;
        },
        brokenCount () {
            return this.job.problems.length;
        },
        progress () {
            return this.runStarted ? this.job.progress : 0;
        },
        orbPhase () {
            if (this.regeneratingThumbnails) {
                return 'rendering';
            }

            if (!this.regenerateIsDone) {
                return 'idle';
            }

            if (this.job.status === 'error') {
                return 'error';
            }

            return this.brokenCount > 0 ? 'warning' : 'success';
        },
        orbIcon () {
            if (this.orbPhase === 'success') {
                return 'check';
            }

            if (this.orbPhase === 'warning' || this.orbPhase === 'error') {
                return 'triangle-alert';
            }

            return 'image';
        },
        title () {
            if (!this.runStarted) {
                return this.$t('tools.thumbnails.popupTitle');
            }

            if (this.job.status === 'error') {
                return this.$t('tools.thumbnails.errorTitle');
            }

            if (this.job.status === 'done') {
                return this.$t(this.brokenCount > 0 ? 'tools.thumbnails.problemsTitle' : 'tools.thumbnails.doneTitle');
            }

            return this.$t('tools.thumbnails.regeneratingThumbnails');
        },
        message () {
            if (!this.runStarted) {
                const reasons = {
                    settings: 'tools.thumbnails.popupSettingsInfo',
                    theme: 'tools.thumbnails.popupThemeInfo',
                    import: 'tools.thumbnails.popupImportInfo'
                };

                return this.$t(reasons[this.reason] || reasons.settings);
            }

            if (this.job.status === 'error') {
                const error = this.job.error;

                return error && error.translation ? this.$t(error.translation) : error;
            }

            if (this.job.status === 'done') {
                if (this.brokenCount > 0) {
                    return this.$t('tools.thumbnails.thumbnailsCreatedWithErrors', {
                        count: this.formatNumber(this.brokenCount)
                    });
                }

                return [
                    this.$t('tools.thumbnails.summaryImages', { count: this.formatNumber(this.job.total) }),
                    this.$t('tools.thumbnails.summaryThumbnails', { count: this.formatNumber(this.job.thumbnails) })
                ].join(' · ');
            }

            if (this.isPreparing) {
                return this.$t('tools.thumbnails.preparingImages');
            }

            return [
                this.$t('tools.thumbnails.summaryImagesOf', {
                    processed: this.formatNumber(this.job.processed),
                    total: this.formatNumber(this.job.total)
                }),
                this.timeLeft
            ].filter(Boolean).join(' · ');
        },
        timeLeft () {
            const elapsed = Date.now() - this.job.startedAt;
            const remainingImages = this.job.total - this.job.processed;

            // Match the panel: wait for a useful sample before estimating the time
            if (this.job.processed < 3 || elapsed < 3000 || remainingImages <= 0) {
                return '';
            }

            const remaining = elapsed / this.job.processed * remainingImages;

            if (remaining < 60000) {
                return this.$t('tools.thumbnails.timeLeftUnderMinute');
            }

            return this.$t('tools.thumbnails.timeLeftMinutes', {
                minutes: this.formatNumber(Math.ceil(remaining / 60000))
            });
        }
    },
    watch: {
        'job.status' (status) {
            if (!this.isVisible || !this.runStarted) {
                return;
            }

            if (status === 'done' && this.savedSettingsCallback && this.brokenCount === 0) {
                this.skip();
            } else {
                this.focusAction();
            }
        }
    },
    mounted () {
        this.$bus.$on('regenerate-thumbnails-display', this.show);
    },
    methods: {
        show (config = {}) {
            if (!this.isVisible) {
                this.returnFocus = document.activeElement;
            }

            this.runStarted = false;
            this.reason = config.reason || 'settings';
            this.savedSettingsCallback = config.savedSettingsCallback || false;
            this.isVisible = true;
            this.focusAction();
        },
        focusAction () {
            this.$nextTick(() => {
                if (this.isVisible && this.$refs.primaryAction) {
                    this.$refs.primaryAction.$el.focus({ preventScroll: true });
                }
            });
        },
        skip () {
            const callback = this.savedSettingsCallback;
            this.isVisible = false;
            this.runStarted = false;
            this.savedSettingsCallback = false;

            const returnFocus = this.returnFocus;
            const dialog = this.$refs.dialog;
            this.returnFocus = null;

            // Wait until controls are enabled again, without taking focus from a new popup
            this.$nextTick(() => {
                const activeElement = document.activeElement;
                const canRestore = activeElement === document.body || (dialog && dialog.contains(activeElement));

                if (!this.isVisible && canRestore && returnFocus && returnFocus.isConnected) {
                    returnFocus.focus({ preventScroll: true });
                }
            });

            if (callback) {
                this.$bus.$emit('regenerate-thumbnails-close', callback);
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
            this.focusAction();
        },
        onDialogKeyDown (event) {
            if (event.isComposing || event.defaultPrevented) {
                return;
            }

            if (event.key === 'Escape') {
                event.preventDefault();

                if (this.regeneratingThumbnails) {
                    this.abortRegenerate();
                } else {
                    this.skip();
                }

                return;
            }

            if (event.key !== 'Tab') {
                return;
            }

            const buttons = this.$refs.dialog.querySelectorAll('button:not([disabled])');
            const first = buttons[0];
            const last = buttons[buttons.length - 1];

            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        },
        abortRegenerate () {
            this.regeneration.stop();
            this.skip();
        },
        formatNumber (value) {
            try {
                return new Intl.NumberFormat(this.$i18n.locale).format(value);
            } catch (error) {
                return String(value);
            }
        }
    },
    beforeDestroy () {
        this.$bus.$off('regenerate-thumbnails-display', this.show);
    }
};
</script>

<style scoped>
@import '../css/popup-common.css';
@import '../css/progress-status.css';

.overlay {
    z-index: var(--layer-alert);
}

.popup {
    display: flex;
    flex-direction: column;
    max-height: calc(100% - var(--space-16));
    max-width: calc(100% - var(--space-16));
    width: 60rem;
}

.progress-status {
    min-height: 18rem;
    overflow-y: auto;
    padding: var(--space-16);
}

.progress-status-icon.is-ready {
    color: var(--color-primary);
}

.progress-status-message {
    font-size: var(--font-size-ui-md);
    line-height: 1.35;
    margin-top: var(--space-2);
    overflow: visible;
    overflow-wrap: anywhere;
    white-space: normal;
}

.buttons {
    display: flex;
    flex-shrink: 0;
}

.buttons .button {
    height: auto;
    min-height: var(--button-height-large);
    min-width: 0;
    overflow-wrap: anywhere;
    padding: var(--space-2) var(--space-8);
    white-space: normal;

    &:focus-visible {
        outline-offset: -2px;
    }
}

@media (max-width: 480px) {
    .progress-status {
        padding: var(--space-8);
    }
}
</style>
