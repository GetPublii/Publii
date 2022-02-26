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
        },
        isBlue: {
            default: false,
            type: Boolean
        }
    },
    computed: {
        cssClasses: function() {
            return {
                'overlay': true,
                'has-border': this.hasBorder,
                'is-blue': this.isBlue
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
    background: var(--overlay);
    bottom: 0;
    color: var(--gray-4);
    display: flex;   
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
        border: 3px dashed var(--gray-1);
        border-radius: 10px;
    }

    &.is-blue {
        border: 3px solid var(--color-primary);
        background: rgba(var(--color-primary-rgb), .17);
        
        & > div {
            box-shadow: 0 0 3px rgba(black, .2);
            background: var(--color-primary);
            border-radius: 3px;
            color: var(--white);
            font-size: $app-font-base;
            font-weight: var(--font-weight-semibold);
            height: auto;
            left: 50%;
            line-height: 1.5;                
            padding: 1.4rem 3rem 1.4rem 3rem;
            position: absolute;
            top: 50%; 
            transform: translateX(-50%) translateY(-50%);
            width: auto;              
        }
    }
}
</style>
