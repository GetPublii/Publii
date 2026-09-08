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
        place (anchor) {
            const margin = 8;
            const gap = 8;
            const viewportWidth = document.documentElement.clientWidth;
            const viewportHeight = document.documentElement.clientHeight;
            const target = anchor.getBoundingClientRect();
            const bounds = this.$el.getBoundingClientRect();
            const roomAbove = target.top - margin - gap;
            const roomBelow = viewportHeight - target.bottom - margin - gap;
            const above = roomAbove >= bounds.height || roomAbove >= roomBelow;
            const top = above ? target.top - gap - bounds.height : target.bottom + gap;
            const left = target.left + (target.width - bounds.width) / 2;

            this.placement = above ? 'top' : 'bottom';
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
    height: 8px;
    left: 0;
    position: absolute;
    right: 0;
}

.app-tooltip[data-placement="top"]::after {
    top: 100%;
}

.app-tooltip[data-placement="bottom"]::after {
    bottom: 100%;
}

@media (prefers-reduced-motion: reduce) {
    .app-tooltip.is-placed {
        transition: none;
    }
}
</style>
