<template>
    <div :class="cssClasses">
        <div
            v-if="appearance === 'drop-zone'"
            :style="messageStyle">
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
        centerInViewport: {
            default: false,
            type: Boolean
        },
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
    data () {
        return {
            messageStyle: null
        };
    },
    mounted () {
        this.startPositionTracking();
    },
    beforeDestroy () {
        this.stopPositionTracking();
    },
    watch: {
        centerInViewport () {
            this.stopPositionTracking();
            this.startPositionTracking();
        }
    },
    methods: {
        startPositionTracking () {
            if (!this.centerInViewport) {
                return;
            }

            this._clippingParents = [];
            this._positionObserver = new ResizeObserver(this.schedulePositionUpdate);
            this._positionObserver.observe(this.$el);

            for (let parent = this.$el.parentElement; parent; parent = parent.parentElement) {
                if (/auto|scroll|hidden|clip/.test(getComputedStyle(parent).overflowY)) {
                    this._clippingParents.push(parent);
                }

                this._positionObserver.observe(parent);
            }

            window.addEventListener('scroll', this.schedulePositionUpdate, true);
            window.addEventListener('resize', this.schedulePositionUpdate);
            this.updateMessagePosition();
        },
        stopPositionTracking () {
            window.removeEventListener('scroll', this.schedulePositionUpdate, true);
            window.removeEventListener('resize', this.schedulePositionUpdate);
            cancelAnimationFrame(this._positionFrame);

            if (this._positionObserver) {
                this._positionObserver.disconnect();
                this._positionObserver = null;
            }

            this._positionFrame = null;
            this.messageStyle = null;
        },
        schedulePositionUpdate () {
            if (!this._positionFrame) {
                this._positionFrame = requestAnimationFrame(() => {
                    this._positionFrame = null;
                    this.updateMessagePosition();
                });
            }
        },
        updateMessagePosition () {
            const rect = this.$el.getBoundingClientRect();
            const contentTop = rect.top + this.$el.clientTop;
            let visibleTop = Math.max(contentTop, 0);
            let visibleBottom = Math.min(contentTop + this.$el.clientHeight, window.innerHeight);

            for (const parent of this._clippingParents) {
                const parentTop = parent.getBoundingClientRect().top + parent.clientTop;
                visibleTop = Math.max(visibleTop, parentTop);
                visibleBottom = Math.min(visibleBottom, parentTop + parent.clientHeight);
            }

            // Keep the label inside the visible intersection, while the scrim covers the full list.
            this.messageStyle = visibleBottom > visibleTop ? {
                top: ((visibleTop + visibleBottom) / 2 - contentTop) + 'px'
            } : null;
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
            box-sizing: border-box;
            border-radius: var(--radius-base);
            color: var(--white);
            font-size: var(--font-size-ui-md);
            font-weight: var(--font-weight-medium);
            height: auto;
            left: 50%;
            line-height: var(--line-height-base);
            max-width: calc(100% - 2 * var(--space-4));
            padding: 1.4rem var(--space-12);
            position: absolute;
            text-align: center;
            top: 50%;
            transform: translateX(-50%) translateY(-50%);
            width: max-content;
            overflow-wrap: anywhere;
        }
    }
}
.drop-zone-upload-icon {
    fill: currentColor;
    flex-shrink: 0;
    height: 2rem;
    width: 2rem;
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
