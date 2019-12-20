<template>
    <div :class="cssClasses">
        {{ stringLength }} / {{ preferredCount }} chars
    </div>
</template>

<script>
export default {
    name: 'char-counter',
    props: {
        value: {
            type: String,
            required: true
        },
        preferredCount: {
            type: Number,
            required: true
        }
    },
    data: function () {
        return {
            stringLength: 0
        };
    },
    computed: {
        cssClasses () {
            let classes = {
                'char-counter': true
            };

            if (this.stringLength > this.preferredCount) {
                classes['is-too-long'] = true;
            }

            return classes;
        }
    },
    watch: {
        value: function (newValue) {
            this.stringLength = newValue.length;
        }
    }
}
</script>

<style lang="scss" scoped>
@import '../../scss/variables.scss';

.char-counter {
    color: var(--text-light-color);
    display: block;
    font-size: 1.2rem;
    line-height: 1.6;
    margin: .5rem 0;
    text-align: right;
    width: 100%;

    &.is-too-long {
        color: var(--warning);
    }
}
</style>
