<template>
    <select
        :id="id"
        :multiple="multiple"
        :disabled="disabled"
        :readonly="readonly"
        :class="{ 'no-border': noBorder }"
        @change="onChangeEvent">
        <slot name="first-choice"></slot>
        <option
            v-if="Array.isArray(items)"
            v-for="(item, index) in items"
            :value="item.value"
            :key="'author-' + index"
            :selected="item.value == selectedValue">
            {{item.label}}
        </option>
        <option
            v-if="!Array.isArray(items)"
            v-for="(item, key) in items"
            :value="key"
            :key="key"
            :selected="key == selectedValue">
            {{item}}
        </option>
    </select>
</template>

<script>
export default {
    name: 'dropdown',
    props: {
        id: {
            default: '',
            type: String
        },
        items: {
            required: true,
            type: [Object, Array]
        },
        value: {
            default: '',
            type: [String, Number]
        },
        selected: {
            default: '',
            type: String
        },
        onChange: {
            default: () => false,
            type: Function
        },
        multiple: {
            default: false,
            type: Boolean
        },
        readonly: {
            default: false,
            type: Boolean
        },
        disabled: {
            default: false,
            type: Boolean
        },
        noBorder: {
            default: false,
            type: Boolean
        }
    },
    data: function() {
        return {
            selectedValue: ''
        };
    },
    watch: {
        value (newValue, oldValue) {
            this.selectedValue = newValue;
        }
    },
    mounted: function() {
        setTimeout(() => {
            if (this.value) {
                this.selectedValue = this.value;
            } else {
                this.selectedValue = this.selected;
            }
        }, 0);
    },
    methods: {
        onChangeEvent (e) {
            this.selectedValue = e.target.value;
            this.$emit('input', this.selectedValue);
            this.onChange(this.selectedValue);
        },
        getValue () {
            return this.selectedValue;
        },
        setValue (newValue) {
            this.selectedValue = newValue;
        }
    }
}
</script>

<style lang="scss" scoped>
@import '../../scss/variables.scss';

select {
    -webkit-appearance: none;
    background-color: $color-10;
    border: none;
    border-radius: 3px;
    box-shadow: inset 0 0 0 1px $color-8;
    color: $color-5;
    font: 400 1.6rem/1.5 $secondary-font;
    max-width: 100%;
    min-width: 100px;
    min-height: 48px;
    outline: none;
    padding: 0 12px 0 18px;
    position: relative;
    width: 100%;

    &.no-border {
        box-shadow: none;
        padding: 0 12px 0 0;

        &:focus {
            box-shadow: none;
        }
    }

    &:focus {
        box-shadow: inset 0 0 2px 1px $color-1;
    }

    &[disabled],
    &[readonly] {
        opacity: .5;
        cursor: not-allowed;

        &:focus {
            box-shadow: inset 0 0 0 1px $color-8;
        }
    }

    select[multiple] {
        padding: baseline(6);
        width: 100%;

        &:hover {
            border-color: $color-8;
        }

        &:focus {
            border-color: $color-8;
        }

        &[disabled] {
            background-color: $color-9;
            cursor: not-allowed;
            &:hover {
                border-color: $color-8;
            }
        }
    }

    &:not([multiple]) {
        background: $color-10 url('data:image/svg+xml;utf8,<svg fill="%238e929d" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 6"><polygon points="10 0 5 0 0 0 5 6 10 0"/></svg>') no-repeat calc(100% - 2rem) 50%;
        background-size: 10px;
        padding-right: 3rem;
    }

    &.invalid {
        border: 1px solid $color-3;

        &:focus {
            border: none;
        }
    }
}

/*
 * Special rules for Windows
 */

body[data-os="win"] {
    select:not([multiple]) {
        height: 4.8rem;
    }
}
</style>
