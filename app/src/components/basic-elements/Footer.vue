<template>
    <div class="footer">
        <div
            v-if="hasButtonsSlot"
            class="buttons">
            <slot name="buttons"></slot>
        </div>
    </div>
</template>

<script>
export default {
    name: 'p-footer',
    computed: {
        hasButtonsSlot () {
            return !!this.$slots['buttons']
        }
    }
}
</script>

<style lang="scss" scoped>
@import '../../scss/variables.scss';
@import '../../scss/mixins.scss';

.footer {
    @include clearfix;

    .buttons {
        float: right;

        button {
            position: relative;
            top: -0.75rem;
        }

        .button {
            float: right;

            & + .button {
              margin-right: 1rem;
            }

            & > span.progress {
                display: inline-block;
                width: 3.2rem;
            }
        }
    }
}
</style>
