<template>
    <input
        type="checkbox"
        :id="id || value"
        :value="value"
        :checked="checked"
        :class="{ 'is-checked': checked }"
        @click.prevent.stop="onClick(value)" />
</template>

<script>
export default {
    name: 'checkbox',
    props: {
        id: {
            default: false,
            type: [String, Number, Boolean]
        },
        value: {
            default: '',
            type: [String, Number]
        },
        checked: {
            default: false,
            type: Boolean
        },
        onClick: {
            default: () => false,
            type: Function
        }
    },
    computed: {
        isChecked () {
            return this.checked;
        }
    }
}
</script>

<style lang="scss" scoped>
@import '../../scss/variables.scss';

input[type="checkbox"] {
    -webkit-appearance: none;
    background: var(--bg-primary);
    border: 1px solid var(--input-border-color);
    border-radius: 4px;
    height: 1.9rem;
    line-height: 1.6rem;
    margin: 0 .5rem 0 0;
    outline: none;
    position: relative;
    text-align: center;
    vertical-align: middle;
    width: 1.9rem;
    z-index: 1;

    &:hover {
        border: 1px solid var(--color-primary);
        cursor: pointer;
    }

    &.is-checked {
        background: var(--color-primary);
        border-color: var(--color-primary);

        &:before {
            color: var(--white);
            font-weight: bold;
            content: '\2713';
            -webkit-margin-start: 0;
            margin-left: 2px;
            font-size: 0.9em;
            left: -1px;
            position: relative;
            top: 0;
        }
    }
}
</style>
