<template>
    <input
        type="checkbox"
        :id="id || value"
        :value="value"
        :checked="checked"
        :indeterminate.prop="indeterminate"
        :class="{ 'is-checked': checked }"
        @click.stop="handleClick" />
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
        indeterminate: {
            default: false,
            type: Boolean
        },
        onClick: {
            default: () => false,
            type: Function
        }
    },
    methods: {
        handleClick (event) {
            const input = event.target;

            if (input.disabled) {
                return;
            }

            this.onClick(this.value);
            this.$nextTick(() => {
                input.checked = this.checked;
                input.indeterminate = this.indeterminate;
            });
        }
    }
}
</script>

<style scoped>

input[type="checkbox"] {
    -webkit-appearance: none;
    background: var(--bg-primary);
    border: 1px solid var(--input-border-color);
    border-radius: 4px;
    height: 1.9rem;
    line-height: 1.6rem;
    margin: 0 var(--space-2) 0 0;
    outline: none;
    position: relative;
    text-align: center;
    vertical-align: middle;
    width: 1.9rem;
    z-index: 1;

    &:focus-visible {
        outline: 2px solid var(--input-border-focus);
        outline-offset: 2px;
    }

    &:hover {
        border: 1px solid var(--color-primary);
        cursor: pointer;
    }

    &.is-checked,
    &:indeterminate {
        background: var(--color-primary);
        border-color: var(--color-primary);

        &:before {
            color: var(--white);
            font-weight: var(--font-weight-bold);
            content: '\2713';
            -webkit-margin-start: 0;
            margin-left: 2px;
            font-size: 0.9em;
            left: -1px;
            position: relative;
            top: 0;
        }
    }

    &:indeterminate::before {
        content: '\2212';
    }
}
</style>
