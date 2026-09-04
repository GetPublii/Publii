<template>
    <div :class="cssClasses">
        <div
            class="progress-orb"
            aria-hidden="true">
            <span class="progress-orb-glow"></span>
            <span class="progress-orb-shadow"></span>

            <span class="progress-orb-disc">
                <span class="progress-orb-particles">
                    <i></i>
                    <i></i>
                    <i></i>
                    <i></i>
                    <i></i>
                    <i></i>
                </span>
            </span>

            <svg
                class="progress-orb-ring"
                viewBox="0 0 128 128"
                focusable="false">
                <circle
                    class="progress-orb-ring-track"
                    cx="64"
                    cy="64"
                    r="60" />
                <circle
                    class="progress-orb-ring-value"
                    cx="64"
                    cy="64"
                    r="60"
                    :style="ringStyle" />
            </svg>

            <svg
                class="progress-orb-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                focusable="false">
                <path
                    class="progress-orb-icon-cloud"
                    :d="cloudPath" />
                <path
                    class="progress-orb-icon-trace"
                    pathLength="100"
                    :d="cloudPath" />
                <g class="progress-orb-icon-arrow">
                    <path d="M12 13v8" />
                    <path d="m8 17 4-4 4 4" />
                </g>
                <path
                    class="progress-orb-icon-check"
                    pathLength="100"
                    d="m17 15-5.5 5.5L9 18" />
                <g class="progress-orb-icon-alert">
                    <path d="M12 13v5" />
                    <path d="M12 21h.01" />
                </g>
            </svg>
        </div>

        <p class="progress-orb-message">
            {{ message }}
        </p>
    </div>
</template>

<script>
// The same Lucide cloud used by the sidebar synchronization button.
const CLOUD_PATH = 'M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242';
// Circumference of the r="60" ring in the 128 x 128 view box.
const RING_LENGTH = 377;

export default {
    name: 'progress-orb',
    props: {
        phase: {
            default: 'idle',
            type: String,
            validator: value => [
                'idle',
                'rendering',
                'connecting',
                'uploading',
                'success',
                'warning',
                'error'
            ].includes(value)
        },
        progress: {
            default: 0,
            type: Number
        },
        indeterminate: {
            default: false,
            type: Boolean
        },
        message: {
            default: '',
            type: String
        },
        size: {
            default: 'default',
            type: String,
            validator: value => ['default', 'small'].includes(value)
        }
    },
    computed: {
        cssClasses () {
            return {
                'progress-orb-wrapper': true,
                'is-idle': this.phase === 'idle',
                'is-rendering': this.phase === 'rendering',
                'is-connecting': this.phase === 'connecting',
                'is-uploading': this.phase === 'uploading',
                'is-success': this.phase === 'success',
                'is-warning': this.phase === 'warning',
                'is-error': this.phase === 'error',
                'is-indeterminate': this.indeterminate,
                'is-small': this.size === 'small'
            };
        },
        cloudPath () {
            return CLOUD_PATH;
        },
        ringStyle () {
            if (this.indeterminate) {
                return null;
            }

            let clamped = Math.min(100, Math.max(0, this.progress));
            let offset = RING_LENGTH - (RING_LENGTH * clamped / 100);

            return {
                strokeDashoffset: offset.toFixed(2) + 'px'
            };
        }
    }
}
</script>

<style scoped>
/*
 * Phase-aware synchronization indicator drawn with the empty-state
 * illustration material: the disc shares the envelope surface roles, while
 * the glow, ring, icon and particles follow the brand and status roles, so
 * the indicator tracks the workspace accent and the color scheme on its own.
 * Motion uses only transform and opacity.
 */
.progress-orb-wrapper {
    --progress-orb-color: var(--color-primary);
    --progress-orb-energy: 1;
    /* 16rem in windows up to ~730px tall, growing with the window height
       up to 20rem; every inner part is sized in percentages of this value */
    --progress-orb-size: clamp(16rem, 22vh, 20rem);
    display: block;
    text-align: center;

    &.is-small {
        --progress-orb-size: 4rem;
    }

    &.is-connecting {
        --progress-orb-energy: 1.4;
    }

    &.is-uploading {
        --progress-orb-energy: 2.2;
    }

    &.is-success {
        --progress-orb-color: var(--color-success);
        --progress-orb-energy: .3;
    }

    &.is-warning {
        --progress-orb-color: var(--color-warning);
    }

    &.is-error {
        --progress-orb-color: var(--color-danger);
    }
}

.progress-orb {
    display: block;
    height: var(--progress-orb-size);
    margin: 0 auto;
    position: relative;
    width: var(--progress-orb-size);
}

.is-error .progress-orb {
    animation: progress-orb-shake .5s ease-out 1;
}

/* Wide ambient glow: a solid phase colour under a radial alpha mask, so the
   colour can transition between phases */
.progress-orb-glow {
    animation: progress-orb-glow-breathe calc(4.2s / var(--progress-orb-energy)) ease-in-out infinite;
    background: var(--progress-orb-color);
    border-radius: 50%;
    display: block;
    inset: -34%;
    mask-image: radial-gradient(circle, oklch(from var(--black) l c h / 28%) 0%, oklch(from var(--black) l c h / 11%) 45%, oklch(from var(--black) l c h / 0%) 68%);
    opacity: .8;
    pointer-events: none;
    position: absolute;
    transition: background-color .5s ease;
}

.is-idle .progress-orb-glow,
.is-warning .progress-orb-glow,
.is-error .progress-orb-glow {
    animation: none;
}

/* Soft brand-coloured shadow under the disc, like the envelope shadow */
.progress-orb-shadow {
    background: var(--color-primary);
    bottom: -4%;
    display: block;
    height: 14%;
    left: 6%;
    mask-image: radial-gradient(ellipse at center, oklch(from var(--black) l c h / 26%) 20%, oklch(from var(--black) l c h / 0%) 70%);
    pointer-events: none;
    position: absolute;
    right: 6%;
}

/* Glass disc in the envelope surface roles */
.progress-orb-disc {
    animation: progress-orb-breathe calc(4.2s / var(--progress-orb-energy)) ease-in-out infinite;
    background: radial-gradient(120% 95% at 28% 18%, var(--bg-secondary) 0%, var(--color-surface-subtle) 58%, color-mix(in srgb, var(--progress-orb-color) 12%, var(--bg-secondary)) 100%);
    border-radius: 50%;
    box-shadow: inset 0 0 0 1.25px color-mix(in srgb, var(--progress-orb-color) 28%, var(--bg-secondary)), inset 0 1.5px 0 oklch(from var(--white) l c h / 80%), 0 10px 24px oklch(from var(--progress-orb-color) l c h / 14%);
    display: block;
    inset: 9.5%;
    overflow: hidden;
    position: absolute;
    transition: box-shadow .5s ease;
}

.is-idle .progress-orb-disc,
.is-warning .progress-orb-disc,
.is-error .progress-orb-disc {
    animation: none;
}

/* Files in flight, upload phase only */
.progress-orb-particles {
    display: none;
    inset: 0;
    position: absolute;

    & > i {
        animation: progress-orb-rise calc(2.6s / var(--progress-orb-energy)) linear infinite;
        background: oklch(from var(--progress-orb-color) l c h / 65%);
        border-radius: 50%;
        bottom: -6%;
        display: block;
        height: 4%;
        opacity: 0;
        position: absolute;
        width: 4%;
    }

    & > i:nth-child(1) {
        left: 22%;
    }

    & > i:nth-child(2) {
        animation-delay: calc(-.9s / var(--progress-orb-energy));
        height: 3%;
        left: 38%;
        width: 3%;
    }

    & > i:nth-child(3) {
        animation-delay: calc(-1.7s / var(--progress-orb-energy));
        left: 52%;
    }

    & > i:nth-child(4) {
        animation-delay: calc(-.4s / var(--progress-orb-energy));
        height: 5%;
        left: 66%;
        width: 5%;
    }

    & > i:nth-child(5) {
        animation-delay: calc(-2.2s / var(--progress-orb-energy));
        height: 3%;
        left: 78%;
        width: 3%;
    }

    & > i:nth-child(6) {
        animation-delay: calc(-1.3s / var(--progress-orb-energy));
        height: 3%;
        left: 30%;
        width: 3%;
    }
}

.is-uploading .progress-orb-particles {
    display: block;
}

/* Progress ring */
.progress-orb-ring {
    height: 100%;
    inset: 0;
    position: absolute;
    transform: rotate(-90deg);
    width: 100%;
}

/* Pastel of the phase colour on the page surface, so the track follows the
   workspace accent the way the illustration's message card does */
.progress-orb-ring-track {
    fill: none;
    stroke: color-mix(in srgb, var(--progress-orb-color) 18%, var(--bg-secondary));
    stroke-width: 3;
    transition: stroke .5s ease;
}

.progress-orb-ring-value {
    fill: none;
    stroke: var(--progress-orb-color);
    stroke-dasharray: 377;
    stroke-dashoffset: 377;
    stroke-linecap: round;
    stroke-width: 3;
    transition: stroke-dashoffset .35s ease-out, stroke .5s ease;
}

.is-indeterminate .progress-orb-ring {
    animation: progress-orb-ring-spin calc(1.3s / var(--progress-orb-energy)) linear infinite;
}

.is-indeterminate .progress-orb-ring-value {
    stroke-dasharray: 96 281;
    stroke-dashoffset: 0;
}

/* Cloud icon and its phase glyphs */
.progress-orb-icon {
    color: var(--progress-orb-color);
    height: 36%;
    left: 50%;
    position: absolute;
    top: 50%;
    transform: translate(-50%, -50%);
    transition: color .5s ease;
    width: 36%;
}

.is-warning .progress-orb-icon {
    color: var(--text-primary-color);
}

.progress-orb-icon path,
.progress-orb-icon g {
    transition: opacity .3s ease;
}

.progress-orb-icon-trace {
    opacity: 0;
    stroke-dasharray: 26 74;
}

.progress-orb-icon-arrow {
    transform-box: fill-box;
    transform-origin: center;
}

.progress-orb-icon-check {
    opacity: 0;
    stroke-dasharray: 100;
    stroke-dashoffset: 100;
    transition: opacity .2s ease, stroke-dashoffset .55s ease-out .2s;
}

.progress-orb-icon-alert {
    opacity: 0;
}

.is-rendering .progress-orb-icon-cloud,
.is-rendering .progress-orb-icon-arrow {
    opacity: .42;
}

.is-rendering .progress-orb-icon-trace {
    animation: progress-orb-trace calc(2.4s / var(--progress-orb-energy)) linear infinite;
    opacity: 1;
}

.is-connecting .progress-orb-icon-arrow {
    opacity: .45;
}

.is-uploading .progress-orb-icon-arrow {
    animation: progress-orb-lift calc(1.3s / var(--progress-orb-energy)) ease-in-out infinite;
}

.is-success .progress-orb-icon-arrow,
.is-warning .progress-orb-icon-arrow,
.is-error .progress-orb-icon-arrow {
    opacity: 0;
}

.is-success .progress-orb-icon-check {
    opacity: 1;
    stroke-dashoffset: 0;
}

.is-warning .progress-orb-icon-alert,
.is-error .progress-orb-icon-alert {
    opacity: 1;
}

/* Stage message, the same role as the progress-bar message */
.progress-orb-message {
    color: var(--text-light-color);
    font-size: var(--font-size-ui-sm);
    font-variant-numeric: tabular-nums;
    margin: var(--space-12) 0 0;
    min-height: 2rem;
    text-align: center;
}

.is-error .progress-orb-message {
    color: var(--color-danger);
}

.is-indeterminate .progress-orb-message {
    animation: progress-orb-shimmer 2.2s linear infinite;
    background: linear-gradient(90deg, var(--text-light-color) 0 38%, var(--headings-color) 50%, var(--text-light-color) 62% 100%);
    background-clip: text;
    -webkit-background-clip: text;
    background-size: 250% 100%;
    color: transparent;
}

/* Reduced motion keeps every state and drops continuous motion */
@media (prefers-reduced-motion: reduce) {
    .is-error .progress-orb,
    .progress-orb-glow,
    .progress-orb-disc,
    .is-indeterminate .progress-orb-ring,
    .is-rendering .progress-orb-icon-trace,
    .is-uploading .progress-orb-icon-arrow {
        animation: none;
    }

    .is-uploading .progress-orb-particles {
        display: none;
    }

    .is-indeterminate .progress-orb-ring-value {
        opacity: .35;
        stroke-dasharray: 377;
        stroke-dashoffset: 0;
    }

    .is-rendering .progress-orb-icon-trace {
        opacity: 0;
    }

    .is-rendering .progress-orb-icon-cloud,
    .is-rendering .progress-orb-icon-arrow {
        opacity: 1;
    }

    .is-indeterminate .progress-orb-message {
        animation: none;
        background: none;
        color: var(--text-light-color);
    }
}

@keyframes progress-orb-glow-breathe {
    0%, 100% {
        opacity: .55;
        transform: scale(.94);
    }

    50% {
        opacity: 1;
        transform: scale(1.06);
    }
}

@keyframes progress-orb-breathe {
    0%, 100% {
        transform: scale(1);
    }

    50% {
        transform: scale(1.03);
    }
}

@keyframes progress-orb-rise {
    0% {
        opacity: 0;
        transform: translateY(0) scale(.6);
    }

    15% {
        opacity: .9;
    }

    100% {
        opacity: 0;
        transform: translateY(calc(var(--progress-orb-size) * -.9)) scale(1);
    }
}

@keyframes progress-orb-ring-spin {
    to {
        transform: rotate(270deg);
    }
}

@keyframes progress-orb-trace {
    from {
        stroke-dashoffset: 0;
    }

    to {
        stroke-dashoffset: -100;
    }
}

@keyframes progress-orb-lift {
    0%, 100% {
        opacity: 1;
        transform: translateY(0);
    }

    50% {
        opacity: .5;
        transform: translateY(-1.8px);
    }
}

@keyframes progress-orb-shake {
    0%, 100% {
        transform: translateX(0);
    }

    20% {
        transform: translateX(-5px);
    }

    45% {
        transform: translateX(4px);
    }

    70% {
        transform: translateX(-2px);
    }
}

@keyframes progress-orb-shimmer {
    from {
        background-position: 120% 0;
    }

    to {
        background-position: -130% 0;
    }
}
</style>
