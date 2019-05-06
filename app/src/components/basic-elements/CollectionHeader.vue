<template>
    <div class="header">
        <slot></slot>
    </div>
</template>

<script>
export default {
    name: 'collection-header'
}
</script>

<style lang="scss" scoped>
@import '../../scss/variables.scss';

.header {
    align-items: center;
    background: $color-10;
    border-bottom: 1px solid $color-helper-8;
    display: flex;
    overflow-y: scroll; 
    position: relative;
    user-select: none;

    .tools {
        left: 3rem;
        position: absolute;
    }
}

@media (max-width: 1350px) {
    .header {
        .tools {
            .button {
                &-small {
                    font-size: 1.3rem;
                    height: 3rem;
                    line-height: 3.1rem;
                    padding: 0 .75rem;

                    &.button-icon {
                        padding-left: 3.65rem;

                        & > svg {
                            display: none;
                        }
                    }
                }

                & + .button {
                    margin-left: .2rem;
                }
            }
        }
    }
}
</style>
