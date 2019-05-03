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
    background: rgba($color-1, .17);    
    border: 2px solid $color-1;
    bottom: -2rem;
    height: calc(100% + 4rem);         
    left: -2rem;
    opacity: 1;
    position: absolute;
    right: -2rem;
    text-align: center;
    top: -2rem;
    width: calc(100% + 4rem);
    z-index: 10000;
            
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
        padding: 1.8rem 6rem 1.8rem 4rem;
        position: absolute;
        top: 50%; 
        transform: translateX(-50%) translateY(-50%);
        width: auto;              
    }
            
    .upload-icon {
        display: inline-block; 
        fill: $color-10;                
        margin-right: 2rem;                
        vertical-align: bottom;
    }
}
    
</style>