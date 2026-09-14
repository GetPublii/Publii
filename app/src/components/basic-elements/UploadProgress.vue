<template>
    <div
        :class="{ 'upload-progress': true, 'is-overlay': overlay }"
        role="status"
        aria-live="polite"
        aria-atomic="true">
        <progress-orb
            class="upload-progress-orb"
            size="small"
            phase="uploading"
            :indeterminate="progress === null"
            :progress="progress === null ? 0 : progress"
            :message="message || $t('ui.uploadInProgress')">
            <template #icon>
                <icon
                    class="upload-progress-icon"
                    name="upload-file"
                    size="s"
                    non-interactive
                    aria-hidden="true"
                    focusable="false" />
            </template>
        </progress-orb>
    </div>
</template>

<script>
import Icon from './Icon.vue';
import ProgressOrb from './ProgressOrb.vue';

export default {
    name: 'upload-progress',
    components: {
        Icon,
        ProgressOrb
    },
    props: {
        overlay: {
            type: Boolean,
            default: false
        },
        progress: {
            type: Number,
            default: null
        },
        message: {
            type: String,
            default: ''
        }
    }
};
</script>

<style scoped>
.upload-progress {
    align-items: center;
    display: flex;
    justify-content: center;
    padding: var(--space-6);

    &.is-overlay {
        background: var(--bg-primary);
        border-radius: var(--radius-base);
        inset: 0;
        position: absolute;
    }
}

.upload-progress .upload-progress-orb {
    --progress-orb-energy: 1;
    --progress-orb-size: var(--upload-progress-size, 5rem);
    max-width: 100%;

    &::v-deep .progress-orb {
        margin: 0 auto;
    }

    &::v-deep .progress-orb-glow,
    &::v-deep .progress-orb-shadow,
    &::v-deep .progress-orb-particles {
        display: none;
    }

    &::v-deep .progress-orb-disc {
        background: var(--bg-secondary);
        box-shadow: none;
    }

    &::v-deep .progress-orb-message {
        animation: none;
        background: none;
        color: var(--text-light-color);
        margin-top: var(--upload-progress-message-gap, var(--space-6));
    }
}

.upload-progress-icon {
    color: var(--icon-secondary-color);
    fill: currentColor;
    left: 50%;
    position: absolute;
    top: 50%;
    transform: translate(-50%, -50%);
}
</style>
