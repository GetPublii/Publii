<template>
    <div :class="cssClasses">
        <slot />
    </div>
</template>

<script>
export default {
    name: 'overlay',
    props: {
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
        border: 3px dashed var(--color-border-subtle);
        border-radius: 10px;
    }

    &.is-blue {
        border: 3px solid var(--color-primary);
        background: oklch(from var(--color-primary) l c h / 17%);
        
        & > div {
            box-shadow: 0 0 3px oklch(from var(--black) l c h / 20%);
            background: var(--color-primary);
            border-radius: 3px;
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
.overlay-icon {
    font-size: 2rem;
    left: 50%;
    position: absolute;
    top: 50%;
    transform: translateX(-50%) translateY(-50%);
}
</style>
