<template>
    <div
        v-show="visible"
        class="app-tooltip"
        :class="{ 'is-placed': placed }"
        :style="position"
        :data-placement="placement"
        aria-hidden="true"
        @pointerenter="$emit('enter')"
        @pointerleave="$emit('leave')">
        <span
            v-if="title"
            class="app-tooltip-line"
            v-text="title"></span>
        <span
            class="app-tooltip-line"
            :class="{ 'is-secondary': !!title }"
            v-text="text"></span>
    </div>
</template>

<script>
export default {
    name: 'app-tooltip',
    data () {
        return {
            visible: false,
            placed: false,
            text: '',
            title: '',
            placement: 'top',
            position: null
        };
    },
    methods: {
        place (anchor, preferredPlacement = 'auto', offsetX = 0) {
            const margin = 8;
            const gap = 8;
            const viewportWidth = document.documentElement.clientWidth;
            const viewportHeight = document.documentElement.clientHeight;
            const target = anchor.getBoundingClientRect();
            const bounds = this.$el.getBoundingClientRect();
            const room = {
                top: target.top - margin - gap,
                bottom: viewportHeight - target.bottom - margin - gap,
                left: target.left - margin - gap,
                right: viewportWidth - target.left - target.width - margin - gap
            };
            let placement;

            if (preferredPlacement === 'auto') {
                placement = room.top >= bounds.height || room.top >= room.bottom ? 'top' : 'bottom';
            } else {
                const opposite = {
                    top: 'bottom',
                    bottom: 'top',
                    left: 'right',
                    right: 'left'
                };
                const horizontal = preferredPlacement === 'left' || preferredPlacement === 'right';
                const candidates = [
                    preferredPlacement,
                    opposite[preferredPlacement],
                    ...(horizontal ? ['top', 'bottom'] : ['right', 'left'])
                ];
                const overflow = side => {
                    const size = side === 'left' || side === 'right' ? bounds.width : bounds.height;
                    return size - room[side];
                };

                placement = candidates.find(side => overflow(side) <= 0);

                if (!placement) {
                    placement = candidates.reduce((best, side) => overflow(side) < overflow(best) ? side : best);
                }
            }

            let top = target.top + (target.height - bounds.height) / 2;
            let left = target.left + (target.width - bounds.width) / 2;

            if (placement === 'top') {
                top = target.top - gap - bounds.height;
            } else if (placement === 'bottom') {
                top = target.bottom + gap;
            } else if (placement === 'left') {
                left = target.left - gap - bounds.width;
            } else {
                left = target.left + target.width + gap;
            }

            if (placement === 'top' || placement === 'bottom') {
                const horizontalOffset = typeof offsetX === 'string'
                    ? bounds.width * parseFloat(offsetX) / 100
                    : offsetX;
                left += horizontalOffset;
            }

            this.placement = placement;
            this.position = {
                top: Math.max(margin, Math.min(top, viewportHeight - bounds.height - margin)) + 'px',
                left: Math.max(margin, Math.min(left, viewportWidth - bounds.width - margin)) + 'px'
            };
            this.placed = true;
        }
    }
};
</script>

<style scoped>
.app-tooltip {
    background: var(--tooltip-bg);
    border: 1px solid var(--border-light-color);
    border-radius: var(--radius-base);
    box-shadow: var(--shadow-sm);
    box-sizing: border-box;
    color: var(--tooltip-color);
    font-family: var(--font-family-sans);
    font-size: var(--font-size-ui-sm);
    font-weight: var(--font-weight-regular);
    line-height: 1.45;
    margin: 0;
    max-width: min(28rem, calc(100vw - 16px));
    opacity: 0;
    overflow-wrap: anywhere;
    padding: var(--space-2) var(--space-3);
    pointer-events: none;
    position: fixed;
    text-align: start;
    width: max-content;
    z-index: var(--layer-tooltip);
}

.app-tooltip-line {
    display: block;
    white-space: pre-line;

    &.is-secondary {
        opacity: .8;
    }
}

.app-tooltip.is-placed {
    opacity: 1;
    pointer-events: auto;
    transition: opacity 100ms ease-out;
}

/* A transparent bridge lets the pointer cross the gap without a time limit. */
.app-tooltip::after {
    content: '';
    position: absolute;
}

.app-tooltip[data-placement="top"]::after,
.app-tooltip[data-placement="bottom"]::after {
    height: 8px;
    left: 0;
    right: 0;
}

.app-tooltip[data-placement="left"]::after,
.app-tooltip[data-placement="right"]::after {
    bottom: 0;
    top: 0;
    width: 8px;
}

.app-tooltip[data-placement="top"]::after {
    top: 100%;
}

.app-tooltip[data-placement="bottom"]::after {
    bottom: 100%;
}

.app-tooltip[data-placement="left"]::after {
    left: 100%;
}

.app-tooltip[data-placement="right"]::after {
    right: 100%;
}

@media (prefers-reduced-motion: reduce) {
    .app-tooltip.is-placed {
        transition: none;
    }
}
</style>
