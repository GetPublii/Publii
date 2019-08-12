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
    background: rgba(255, 255, 255, .85);
    bottom: 0;
    color: $color-7;
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
        border: 3px dashed $color-9;
        border-radius: 10px;
    }

    &.is-blue {
        border: 2px solid $color-1;
        background: rgba($color-1, .17);
        
        & > div {
            box-shadow: 0 0 3px rgba(black, .2);
            background: $color-1;
            border-radius: 3px;
            color: $color-10;
            font-size: 1.6rem;
            font-weight: 500;
            height: auto;
            left: 50%;
            line-height: 1.5;                
            padding: 1.8rem 4rem 1.8rem 4rem;
            position: absolute;
            top: 50%; 
            transform: translateX(-50%) translateY(-50%);
            width: auto;              
        }
    }
}
</style>
