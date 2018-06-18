<template>
    <input
        type="checkbox"
        :id="id || value"
        :value="value"
        :checked="checked"
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
    }
}
</script>

<style lang="scss" scoped>
@import '../../scss/variables.scss';

input[type="checkbox"] {
    -webkit-appearance: none;
    background: $color-10;
    border: 1px solid $color-8;
    border-radius:2px;
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
        border: 1px solid $color-1;
        cursor: pointer;
    }

    &:checked {
        background: $color-1;
        border-color: $color-1;

        &:before {
            color: $color-10;
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
