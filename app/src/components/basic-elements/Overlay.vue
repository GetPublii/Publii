<template>
    <div :class="cssClasses">
        <slot />
    </div>
</template>

<script>
export default {
    name: 'overlay',
    props: {
        hasBorder: {
            default: false,
            type: Boolean
        }
    },
    computed: {
        cssClasses: function() {
            return {
                'overlay': true,
                'has-border': this.hasBorder
            };
        }
    }
}
</script>

<style lang="scss" scoped>
@import '../../scss/variables.scss';

/*
 * Overlay
 */
.overlay {
    align-items: center;
    background: rgba(255, 255, 255, .85);
    bottom: 0;
    color: $color-7;
    display: flex;
    font-size: 2.4rem;
    font-weight: bold;
    justify-content: center;
    left: 0;
    position: absolute;
    right: 0;
    top: 0;

    &-icon {
        font-size: 2rem;
        left: 50%;
        position: absolute;
        top: 50%;
        transform: translateX(-50%) translateY(-50%);
    }

    &.has-border {
        border: 3px dashed $color-9;
        border-radius: 10px;
    }
}
</style>
