<template>
    <div
        class="sync-progress"
        :class="['is-' + phase, { 'is-indeterminate': indeterminate }]">
        <div class="sync-progress-heading">
            <span role="status">{{ phaseLabel }}</span>
            <span
                v-if="showsPercentage"
                class="sync-progress-counter"
                aria-hidden="true">
                <span class="sync-progress-value">{{ hasOperations ? formattedCompleted : clampedProgress }}</span>
                <span class="sync-progress-total">{{ hasOperations ? '/ ' + formattedTotal : '%' }}</span>
                <span v-if="hasOperations" class="sync-progress-unit">{{ $t('sync.operationsDone') }}</span>
            </span>
        </div>

        <div
            class="sync-progress-track"
            role="progressbar"
            :aria-label="phaseLabel"
            aria-valuemin="0"
            aria-valuemax="100"
            :aria-valuenow="indeterminate || phase === 'error' ? null : clampedProgress"
            :aria-valuetext="progressText">
            <span
                class="sync-progress-fill"
                :style="{ width: clampedProgress + '%' }">
            </span>
        </div>

        <div class="sync-progress-meta">
            <p class="sync-progress-detail">{{ detail }}</p>

            <ol
                class="sync-progress-stages"
                :aria-label="$t(isManual ? 'sync.websiteFilesPreparation' : 'sync.websiteSynchronization')">
                <li
                    v-for="(stage, index) in stages"
                    :key="stage.id"
                    :class="{
                        'is-complete': index < activeStage,
                        'is-active': index === activeStage,
                        'needs-attention': index === activeStage && (phase === 'error' || phase === 'warning')
                    }"
                    :aria-current="index === activeStage ? 'step' : null">
                    <span class="sync-stage-marker" aria-hidden="true">
                        <svg
                            v-if="index < activeStage"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round">
                            <path d="m5 12 4 4L19 6" />
                        </svg>
                        <span v-else-if="index === activeStage && (phase === 'error' || phase === 'warning')">!</span>
                        <i v-else></i>
                    </span>
                    <span>{{ $t(stage.label) }}</span>
                </li>
            </ol>
        </div>
    </div>
</template>

<script>
export default {
    name: 'sync-progress',
    props: {
        phase: {
            type: String,
            default: 'idle'
        },
        progress: {
            type: Number,
            default: 0
        },
        operations: {
            type: Array,
            default: null
        },
        indeterminate: {
            type: Boolean,
            default: false
        },
        message: {
            type: String,
            default: ''
        },
        isManual: {
            type: Boolean,
            default: false
        },
        errorStage: {
            type: String,
            default: 'connecting'
        }
    },
    computed: {
        hasOperations () {
            return this.phase === 'uploading' && !this.isManual && !this.indeterminate &&
                Array.isArray(this.operations) && this.operations.length === 2 &&
                this.operations.every(Number.isInteger) &&
                this.operations[0] >= 0 && this.operations[1] > 0 &&
                this.operations[0] <= this.operations[1];
        },
        numberFormatter () {
            return new Intl.NumberFormat(this.$i18n.locale);
        },
        formattedCompleted () {
            return this.hasOperations ? this.numberFormatter.format(this.operations[0]) : '';
        },
        formattedTotal () {
            return this.hasOperations ? this.numberFormatter.format(this.operations[1]) : '';
        },
        clampedProgress () {
            if (this.hasOperations) {
                return this.operations[0] / this.operations[1] * 100;
            }

            return Number.isFinite(this.progress) ? Math.round(Math.min(100, Math.max(0, this.progress))) : 0;
        },
        progressText () {
            if (this.hasOperations) {
                return `${this.formattedCompleted} ${this.$t('ui.of')} ${this.formattedTotal} ${this.$t('sync.operationsDone')}`;
            }

            return this.showsPercentage ? `${this.phaseLabel}: ${this.clampedProgress}%` : this.phaseLabel;
        },
        showsPercentage () {
            return !this.indeterminate && !['idle', 'error'].includes(this.phase);
        },
        phaseLabel () {
            switch (this.phase) {
                case 'rendering':
                    return this.$t('sync.preparingFiles');
                case 'connecting':
                    return this.$t('sync.connectingToServer');
                case 'uploading':
                    return this.$t(this.isManual ? 'file.preparingFilesInOutputDir' : 'sync.uploadingWebsite');
                case 'success':
                    return this.$t(this.isManual ? 'sync.websiteFilesReady' : 'sync.siteIsInSync');
                case 'warning':
                    return this.$t('sync.filesNotSyncedShortMessage');
                case 'error':
                    return this.message || this.$t(this.isManual ? 'sync.websiteFilesPreparationErrorText' : 'sync.connectionToServerErrorText');
                default:
                    return this.$t(this.isManual ? 'sync.prepareWebsiteFiles' : 'sync.preparedToUpload');
            }
        },
        detail () {
            if (this.message === this.phaseLabel || this.message === 'true') {
                return '';
            }

            if (this.phase === 'rendering') {
                return this.message.replace(/ - \d+(?:\.\d+)?%$/, '');
            }

            const uploadPrefix = this.$t('sync.uploadingWebsite') + ' (';

            if (this.phase === 'uploading' && this.message.startsWith(uploadPrefix) && this.message.endsWith(')')) {
                return this.hasOperations ? '' : this.message.slice(uploadPrefix.length, -1);
            }

            return this.message;
        },
        stages () {
            const stages = [
                { id: 'rendering', label: 'sync.stagePrepare' }
            ];

            if (this.isManual) {
                stages.push({ id: 'uploading', label: 'sync.stageOutput' });
            } else {
                stages.push(
                    { id: 'connecting', label: 'sync.stageConnect' },
                    { id: 'uploading', label: 'sync.stageUpload' }
                );
            }

            return stages;
        },
        activeStage () {
            if (this.phase === 'success') {
                return this.stages.length;
            }

            if (this.phase === 'warning') {
                return this.stages.length - 1;
            }

            if (this.phase === 'error') {
                return this.errorStage === 'rendering' ? 0 : 1;
            }

            return this.stages.findIndex(stage => stage.id === this.phase);
        }
    }
};
</script>

<style scoped>
.sync-progress {
    --sync-progress-color: var(--color-primary);
    margin-top: var(--space-16);
    text-align: left;
}

.sync-progress-heading {
    align-items: flex-end;
    color: var(--text-primary-color);
    display: flex;
    flex-wrap: wrap;
    font-size: var(--font-size-ui-md);
    gap: var(--space-3) var(--space-6);
    justify-content: space-between;
    line-height: var(--line-height-base);
    margin-bottom: var(--space-4);
    min-height: 2.9rem;
}

.sync-progress-counter {
    align-items: baseline;
    display: inline-flex;
    flex-wrap: wrap;
    font-variant-numeric: tabular-nums;
    gap: var(--space-1);
}

.sync-progress-value {
    font-size: var(--font-size-ui-xl);
    font-weight: var(--font-weight-semibold);
    letter-spacing: -.025em;
    line-height: 1.2;
}

.sync-progress-total {
    color: var(--text-light-color);
    font-size: var(--font-size-ui-md);
}

.sync-progress-unit {
    color: var(--text-light-color);
    font-size: var(--font-size-ui-sm);
    margin-left: var(--space-1);
}

.sync-progress-track {
    background: repeating-linear-gradient(
        to right,
        var(--color-border-muted) 0 3px,
        transparent 3px 11px
    );
    border-radius: 2px;
    height: 8px;
    overflow: hidden;
}

.sync-progress-fill {
    background: linear-gradient(
        90deg,
        var(--sync-progress-color),
        color-mix(in srgb, var(--sync-progress-color) 76%, var(--bg-primary))
    );
    border-radius: inherit;
    display: block;
    height: 100%;
    transition: width .2s ease-out;
}

.sync-progress-meta {
    align-items: baseline;
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3) var(--space-8);
    justify-content: space-between;
    margin-top: var(--space-4);
    min-height: 1.5em;
}

.sync-progress-detail {
    color: var(--text-light-color);
    flex: 1 1 20rem;
    font-size: var(--font-size-ui-sm);
    line-height: var(--line-height-base);
    margin: 0;
    overflow-wrap: anywhere;
}

.sync-progress-stages {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3) var(--space-6);
    list-style: none;
    margin: 0 0 0 auto;
    padding: 0;

    li {
        align-items: baseline;
        color: var(--text-light-color);
        display: flex;
        font-size: var(--font-size-ui-sm);
        gap: var(--space-2);
        line-height: var(--line-height-base);
        min-width: 0;
        overflow-wrap: anywhere;
    }

    .is-active {
        color: var(--text-primary-color);
        font-weight: var(--font-weight-medium);

        .sync-stage-marker {
            color: var(--sync-progress-color);
        }
    }
}

.sync-stage-marker {
    align-self: center;
    align-items: center;
    display: flex;
    flex-shrink: 0;
    height: 1.6rem;
    justify-content: center;
    width: 1.6rem;

    svg {
        height: 1.6rem;
        width: 1.6rem;
    }

    i {
        background: currentColor;
        border-radius: 1px;
        height: 4px;
        opacity: .45;
        width: 4px;
    }
}

.is-active .sync-stage-marker i {
    opacity: 1;
}

.is-complete .sync-stage-marker svg {
    color: var(--color-success);
}

.is-success {
    --sync-progress-color: var(--color-success);
}

.is-warning {
    --sync-progress-color: var(--color-warning);
}

.is-error {
    --sync-progress-color: var(--color-danger);
}

.is-indeterminate .sync-progress-fill {
    animation: sync-bar-indeterminate 2.2s ease-in-out infinite;
    transition: none;
    width: 24% !important;
}

@keyframes sync-bar-indeterminate {
    from {
        transform: translateX(-100%);
    }

    to {
        transform: translateX(420%);
    }
}

@media (prefers-reduced-motion: reduce) {
    .sync-progress-fill {
        transition: none;
    }

    .is-indeterminate .sync-progress-fill {
        animation: none;
        transform: translateX(158%);
    }
}
</style>
