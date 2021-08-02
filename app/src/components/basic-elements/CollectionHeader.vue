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
    background: var(--bg-primary);
    border-bottom: 1px solid var(--border-light-color);
    display: contents;
    overflow-y: scroll;
    position: relative;
    user-select: none;

    .tools {
        background: var(--bg-primary);
        margin-left: 3rem;
        min-width: 200px;
        padding: .9rem 0;
        position: fixed;
        z-index: 5;
    }

    .col {
        position: sticky;
        top: 0;
        background: var(--bg-primary);
        z-index: 2;
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
