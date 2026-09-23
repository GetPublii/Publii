<template>
    <fields-group class="thumbnails-regeneration">
        <div
            class="progress-status"
            :class="{ 'has-cancel': isRunning }">
            <progress-orb
                class="progress-status-orb"
                appearance="flat"
                :phase="orbPhase"
                :progress="orbProgress"
                :indeterminate="isPreparing"
                :role="isRunning ? 'progressbar' : null"
                :aria-hidden="isRunning ? null : 'true'"
                :aria-label="isRunning ? $t('tools.thumbnails.panelLabel') : null"
                :aria-valuemin="isRunning ? 0 : null"
                :aria-valuemax="isRunning ? 100 : null"
                :aria-valuenow="isRunning && !isPreparing ? job.progress : null"
                :aria-valuetext="isRunning ? summaryLine : null">
                <template #icon>
                    <icon
                        :name="orbIcon"
                        class="progress-status-icon"
                        :class="{ 'is-ready': state === 'ready' }"
                        non-interactive
                        aria-hidden="true" />
                </template>
            </progress-orb>

            <div class="progress-status-text">
                <h2 class="progress-status-title">
                    {{ title }}
                </h2>

                <span
                    v-if="isRunning && !isPreparing"
                    class="progress-status-percent"
                    aria-hidden="true">
                    {{ job.progress }}%
                </span>

                <p
                    v-if="summaryLine"
                    class="progress-status-message"
                    :title="summaryLine">
                    {{ summaryLine }}
                </p>

                <div
                    v-if="isRunning"
                    class="progress-status-action">
                    <slot name="cancel" />
                </div>
            </div>
        </div>

        <div
            v-if="notes.length"
            class="thumbnails-regeneration-notes">
            <template v-for="note in notes">
                <div
                    v-if="note.warning"
                    :key="note.key"
                    class="msg msg-small msg-icon msg-info">
                    <icon
                        name="info"
                        size="m"
                        non-interactive
                        aria-hidden="true" />
                    <p>{{ note.text }}</p>
                </div>
                <p
                    v-else
                    :key="note.key"
                    class="thumbnails-regeneration-note">
                    {{ note.text }}
                </p>
            </template>
        </div>

        <p
            class="thumbnails-regeneration-live"
            role="status">
            {{ liveMessage }}
        </p>

        <section
            v-if="showProblems"
            class="thumbnails-regeneration-section">
            <div class="thumbnails-regeneration-section-heading">
                <h3>
                    {{ $t('tools.thumbnails.problemsCount', { count: formatNumber(job.problems.length) }) }}
                </h3>

                <p-button
                    :onClick="openLogViewer"
                    appearance="clean">
                    {{ $t('tools.thumbnails.openLogViewer') }}
                </p-button>
            </div>

            <ul class="thumbnails-regeneration-list">
                <li
                    v-for="problem in job.problems"
                    :key="problem.image">
                    <span class="thumbnails-regeneration-path">
                        {{ problem.image }}
                    </span>
                    <span class="thumbnails-regeneration-reason is-error">
                        {{ problem.message || $t('tools.thumbnails.couldNotProcess') }}
                    </span>
                </li>
            </ul>
        </section>

        <section
            v-if="showRecentImages"
            class="thumbnails-regeneration-recent">
            <p-button
                :onClick="() => recentImagesExpanded = !recentImagesExpanded"
                appearance="clean-muted"
                size="small"
                :icon="recentImagesExpanded ? 'chevron-down' : 'chevron-right'"
                icon-size="xs"
                :aria-expanded="recentImagesExpanded ? 'true' : 'false'"
                aria-controls="thumbnails-regeneration-recent-images">
                {{ $t('tools.thumbnails.recentImages') }}
            </p-button>

            <ul
                v-if="recentImagesExpanded"
                id="thumbnails-regeneration-recent-images"
                class="thumbnails-regeneration-list">
                <li
                    v-for="item in job.recentImages"
                    :key="item.image">
                    <span class="thumbnails-regeneration-path">
                        {{ item.image }}
                    </span>
                    <span
                        :class="{
                            'thumbnails-regeneration-reason': true,
                            'is-error': item.broken
                        }">
                        <template v-if="item.broken">
                            {{ $t('tools.thumbnails.couldNotProcess') }}
                        </template>
                        <template v-else>
                            {{ $t('tools.thumbnails.thumbnailsCount', { count: formatNumber(item.thumbnails) }) }}
                        </template>
                    </span>
                </li>
            </ul>
        </section>
    </fields-group>
</template>

<script>
import { getThumbnailsRegeneration } from '../helpers/thumbnails-regeneration';

// Summary states of the main process mapped to the states of this panel
const SUMMARY_STATES = {
    'ready': 'ready',
    'no-images': 'no-images',
    'no-theme': 'no-theme',
    'no-responsive-images-config': 'no-sizes'
};

export default {
    name: 'thumbnails-regeneration-panel',
    data () {
        return {
            summary: null,
            summaryLoading: true,
            recentImagesExpanded: false
        };
    },
    computed: {
        regeneration () {
            return getThumbnailsRegeneration(this.$store);
        },
        siteName () {
            return this.$store.state.currentSite.config.name;
        },
        job () {
            return this.$store.state.components.thumbnailsRegeneration;
        },
        hasOwnJob () {
            return this.job.status !== 'idle' && this.job.site === this.siteName;
        },
        otherSiteIsRunning () {
            return this.job.status === 'running' && this.job.site !== this.siteName;
        },
        state () {
            if (this.hasOwnJob) {
                return this.job.status;
            }

            if (this.summaryLoading) {
                return 'loading';
            }

            if (!this.summary) {
                return 'ready';
            }

            return SUMMARY_STATES[this.summary.status] || 'ready';
        },
        isRunning () {
            return this.state === 'running';
        },
        isPreparing () {
            return this.isRunning && this.job.processed === 0;
        },
        hasProblems () {
            return this.hasOwnJob && this.job.problems.length > 0;
        },
        orbPhase () {
            if (this.state === 'running') {
                return 'rendering';
            }

            if (this.state === 'done') {
                return this.hasProblems ? 'warning' : 'success';
            }

            if (this.state === 'error') {
                return 'error';
            }

            return 'idle';
        },
        orbProgress () {
            if (this.state === 'done') {
                return 100;
            }

            if (this.state === 'running' || this.state === 'stopped') {
                return this.job.progress;
            }

            return 0;
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
            let titles = {
                'loading': 'tools.thumbnails.checkingImages',
                'ready': 'tools.thumbnails.readyTitle',
                'no-images': 'tools.thumbnails.noImagesTitle',
                'no-theme': 'tools.thumbnails.noThemeTitle',
                'no-sizes': 'tools.thumbnails.noSizesTitle',
                'running': 'tools.thumbnails.regeneratingThumbnails',
                'stopped': 'tools.thumbnails.stoppedTitle',
                'error': 'tools.thumbnails.errorTitle'
            };

            if (this.state === 'done') {
                return this.$t(this.hasProblems ? 'tools.thumbnails.problemsTitle' : 'tools.thumbnails.doneTitle');
            }

            return this.$t(titles[this.state]);
        },
        summaryLine () {
            if (this.state === 'ready' && this.summary) {
                return this.joinParts([
                    this.$t('tools.thumbnails.summaryImages', { count: this.formatNumber(this.summary.images) }),
                    this.$t('tools.thumbnails.summaryTheme', { theme: this.summary.theme }),
                    this.$t('tools.thumbnails.summaryFormat', { format: this.formatLabel })
                ]);
            }

            if (this.state === 'no-images') {
                return this.$t('tools.thumbnails.noImagesText');
            }

            if (this.state === 'no-theme') {
                return this.$t('tools.thumbnails.noThemeText');
            }

            if (this.state === 'no-sizes') {
                return this.$t('tools.thumbnails.noSizesText', { theme: this.summary.theme });
            }

            if (this.state === 'running') {
                if (this.isPreparing) {
                    return this.$t('tools.thumbnails.preparingImages');
                }

                return this.joinParts([
                    this.imagesOfTotal,
                    this.timeLeft
                ]);
            }

            if (this.state === 'done') {
                return this.joinParts([
                    this.hasProblems ? this.$t('tools.thumbnails.summaryNotProcessed', { count: this.formatNumber(this.job.problems.length) }) : '',
                    this.$t('tools.thumbnails.summaryImages', { count: this.formatNumber(this.job.total) }),
                    this.$t('tools.thumbnails.summaryThumbnails', { count: this.formatNumber(this.job.thumbnails) }),
                    this.$t('tools.thumbnails.summaryTime', { time: this.formatDuration(this.job.finishedAt - this.job.startedAt) })
                ]);
            }

            if (this.state === 'stopped') {
                return this.imagesOfTotal;
            }

            if (this.state === 'error') {
                let error = this.job.error;

                return error && error.translation ? this.$t(error.translation) : error;
            }

            return '';
        },
        imagesOfTotal () {
            return this.$t('tools.thumbnails.summaryImagesOf', {
                processed: this.formatNumber(this.job.processed),
                total: this.formatNumber(this.job.total)
            });
        },
        timeLeft () {
            let elapsed = Date.now() - this.job.startedAt;
            let remainingImages = this.job.total - this.job.processed;

            // The first images and the first seconds give no reliable pace yet
            if (this.job.processed < 3 || elapsed < 3000 || remainingImages <= 0) {
                return '';
            }

            let remaining = elapsed / this.job.processed * remainingImages;

            if (remaining < 60000) {
                return this.$t('tools.thumbnails.timeLeftUnderMinute');
            }

            return this.$t('tools.thumbnails.timeLeftMinutes', {
                minutes: this.formatNumber(Math.ceil(remaining / 60000))
            });
        },
        formatLabel () {
            let format = this.summary ? this.summary.format : '';

            if (format === 'webp') {
                return 'WebP';
            }

            if (format === 'avif') {
                return 'AVIF';
            }

            return this.$t('tools.thumbnails.formatOriginal');
        },
        notes () {
            let notes = [];

            if (this.otherSiteIsRunning && !this.hasOwnJob) {
                notes.push({
                    key: 'other-site',
                    text: this.$t('tools.thumbnails.otherSiteRunning', { site: this.getSiteDisplayName(this.job.site) }),
                    warning: true
                });

                return notes;
            }

            if (this.state === 'ready') {
                notes.push({
                    key: 'ready',
                    text: this.$t('tools.thumbnails.readyNote'),
                    warning: false
                });

                if (this.summary && this.summary.responsiveImages === false) {
                    notes.push({
                        key: 'responsive-images-off',
                        text: this.$t('tools.thumbnails.responsiveImagesOff'),
                        warning: false
                    });
                }
            }

            if (this.state === 'stopped') {
                notes.push({
                    key: 'stopped',
                    text: this.$t('tools.thumbnails.stoppedNote'),
                    warning: true
                });
            }

            return notes;
        },
        canStart () {
            return !this.otherSiteIsRunning && ['ready', 'done', 'stopped', 'error'].indexOf(this.state) > -1;
        },
        // Keep the host's controls in sync with the status shown in this panel.
        actions () {
            return {
                canStart: this.canStart,
                isRunning: this.isRunning,
                isCancelled: this.state === 'stopped'
            };
        },
        liveMessage () {
            return this.state === 'loading' ? '' : this.title;
        },
        showProblems () {
            return this.hasProblems && this.state !== 'running';
        },
        showRecentImages () {
            return this.hasOwnJob && this.job.recentImages.length > 0;
        }
    },
    watch: {
        siteName () {
            this.loadSummary();
        },
        actions: {
            handler (actions) {
                this.$emit('actions-change', actions);
            },
            immediate: true
        },
        'job.startedAt' () {
            this.recentImagesExpanded = false;
        }
    },
    mounted () {
        this.loadSummary();
    },
    methods: {
        loadSummary () {
            let siteName = this.siteName;

            // A successful result describes the previous run, not changes made since leaving this view.
            // Keep ongoing work and problems available when the user comes back.
            if (this.job.status === 'done' && this.job.problems.length === 0) {
                this.regeneration.reset();
            }

            this.summaryLoading = true;

            this.regeneration.getSummary(siteName).then(summary => {
                if (siteName !== this.siteName) {
                    return;
                }

                this.summary = summary && summary.status !== 'error' ? summary : null;
                this.summaryLoading = false;
            }).catch(() => {
                if (siteName !== this.siteName) {
                    return;
                }

                this.summary = null;
                this.summaryLoading = false;
            });
        },
        openLogViewer () {
            this.$router.push({
                path: '/site/' + this.siteName + '/tools/log-viewer',
                query: {
                    file: 'regenerate-process.log'
                }
            });
        },
        getSiteDisplayName (siteName) {
            let site = this.$store.state.sites[siteName];

            return site && site.displayName ? site.displayName : siteName;
        },
        joinParts (parts) {
            return parts.filter(part => !!part).join(' · ');
        },
        formatNumber (value) {
            let number = Number(value) || 0;

            try {
                return new Intl.NumberFormat(this.$i18n.locale).format(number);
            } catch (error) {
                return String(number);
            }
        },
        formatDuration (milliseconds) {
            let seconds = Math.max(0, Math.round((milliseconds || 0) / 1000));

            if (seconds < 60) {
                return this.$t('tools.thumbnails.durationSeconds', { seconds: seconds });
            }

            return this.$t('tools.thumbnails.durationMinutes', {
                minutes: Math.floor(seconds / 60),
                seconds: seconds % 60
            });
        }
    }
}
</script>

<style scoped>
@import '../css/notifications.css';
@import '../css/progress-status.css';

.thumbnails-regeneration {
    user-select: none;
}

.thumbnails-regeneration .progress-status {
    border: 1px solid var(--border-light-color);
    border-radius: calc(var(--radius-base) * 2);
    min-width: 0;
    padding: var(--space-8);
}

.progress-status-icon.is-ready {
    color: var(--color-primary);
}

.thumbnails-regeneration-notes {
    margin-top: var(--space-8);
}

.thumbnails-regeneration-note {
    color: var(--text-light-color);
    line-height: var(--line-height-base);
    margin: 0;
    text-align: left;

    & + & {
        margin-top: var(--space-2);
    }
}

.thumbnails-regeneration .progress-status-text {
    align-items: center;
    column-gap: var(--space-6);
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
}

.thumbnails-regeneration .progress-status-title {
    grid-column: 1;
    grid-row: 1;
}

.thumbnails-regeneration .progress-status-percent {
    grid-column: 2;
    grid-row: 1;
}

.thumbnails-regeneration .progress-status-message {
    grid-column: 1 / -1;
    grid-row: 2;
    overflow-wrap: anywhere;
    white-space: normal;
}

.thumbnails-regeneration .has-cancel .progress-status-message {
    grid-column: 1;
}

.progress-status-action {
    grid-column: 2;
    grid-row: 2;
    justify-self: end;
    margin-right: calc(var(--button-padding-inline-small) * -1);
}


/* Status for assistive technologies, visually hidden */
.thumbnails-regeneration-live {
    clip-path: inset(50%);
    height: 1px;
    margin: -1px;
    overflow: hidden;
    position: absolute;
    white-space: nowrap;
    width: 1px;
}

.thumbnails-regeneration-section {
    border-top: 1px solid var(--border-light-color);
    margin-top: var(--space-8);
    padding-top: var(--space-6);
}

.thumbnails-regeneration-section-heading {
    align-items: center;
    display: flex;
    gap: var(--space-4);
    justify-content: space-between;

    h3 {
        color: var(--headings-color);
        font-size: var(--font-size-ui-sm);
        font-weight: var(--font-weight-semibold);
        margin: 0;
    }
}

.thumbnails-regeneration-recent {
    margin-top: var(--space-8);
}

.thumbnails-regeneration-list {
    list-style: none;
    margin: var(--space-3) 0 0 var(--space-16);
    max-height: 32rem;
    overflow-y: auto;
    padding: 0 var(--space-4) 0 0;
    user-select: text;

    li {
        align-items: baseline;
        border-top: 1px solid var(--border-light-color);
        display: flex;
        font-size: var(--font-size-ui-sm);
        gap: var(--space-4);
        justify-content: space-between;
        padding: var(--space-2) 0;

        &:first-child {
            border-top: none;
        }
    }
}

.thumbnails-regeneration-path {
    color: var(--text-primary-color);
    font-family: var(--font-family-mono);
    font-size: var(--font-size-ui-xs);
    min-width: 0;
    overflow-wrap: anywhere;
}

.thumbnails-regeneration-reason {
    color: var(--text-light-color);
    flex-shrink: 0;
    font-variant-numeric: tabular-nums;
    max-width: 50%;
    text-align: right;

    &.is-error {
        color: var(--color-danger);
    }
}
</style>
