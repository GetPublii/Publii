<template>
    <div :class="cssClasses">
        <div v-if="appearance === 'drop-zone'">
            <span
                v-if="loading"
                class="drop-zone-loader"
                aria-hidden="true"></span>
            <icon
                v-else
                class="drop-zone-upload-icon"
                name="upload-file"
                size="s"
                non-interactive
                aria-hidden="true"
                focusable="false" />
            <slot />
        </div>
        <slot v-else />
    </div>
</template>

<script>
export default {
    name: 'overlay',
    props: {
        loading: {
            default: false,
            type: Boolean
        },
        appearance: {
            default: 'default',
            type: String,
            validator: value => ['default', 'drop-zone'].includes(value)
        }
    },
    computed: {
        cssClasses: function() {
            return {
                'overlay': true,
                'has-border': this.appearance === 'drop-zone',
                'is-blue': this.appearance === 'drop-zone'
            };
        }
    }
}
</script>

<style scoped>

/*
 * Overlay
 */
.overlay {
    align-items: center;
    background: var(--overlay);
    bottom: 0;
    color: var(--color-text-muted);
    display: flex;   
    font-weight: var(--font-weight-bold);
    justify-content: center;
    left: 0;
    position: absolute;
    right: 0;
    top: 0;

    &.has-border {
        border: 1px dashed var(--input-border-focus);
        border-radius: var(--radius-base);
    }

    &.is-blue {
        background: oklch(from var(--color-primary) l c h / 5%);

        & > div {
            align-items: center;
            display: flex;
            gap: var(--space-4);
            box-shadow: 0 0 3px oklch(from var(--black) l c h / 20%);
            background: var(--color-primary);
            border-radius: var(--radius-base);
            color: var(--white);
            font-size: var(--font-size-ui-md);
            font-weight: var(--font-weight-medium);
            height: auto;
            left: 50%;
            line-height: var(--line-height-base);
            padding: 1.4rem var(--space-12) 1.4rem var(--space-12);
            position: absolute;
            top: 50%; 
            transform: translateX(-50%) translateY(-50%);
            width: auto;              
        }
    }
}
.drop-zone-upload-icon {
    fill: currentColor;
    flex-shrink: 0;
}

.drop-zone-loader {
    animation: drop-zone-spin .6s linear infinite;
    border: 2px solid oklch(from var(--white) l c h / 30%);
    border-top-color: currentColor;
    border-radius: 50%;
    box-sizing: border-box;
    flex-shrink: 0;
    height: 2rem;
    width: 2rem;
}

@keyframes drop-zone-spin {
    to {
        transform: rotate(360deg);
    }
}

@media (prefers-reduced-motion: reduce) {
    .drop-zone-loader {
        animation: none;
    }
}

.overlay-icon {
    font-size: 2rem;
    left: 50%;
    position: absolute;
    top: 50%;
    transform: translateX(-50%) translateY(-50%);
}
</style>
