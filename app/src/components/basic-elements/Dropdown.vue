<template>
    <select
        :id="id"
        :multiple="multiple"
        :disabled="disabled"
        :readonly="readonly"
        :class="cssClasses"
        @change="onChangeEvent">
        <slot name="first-choice"></slot>
        <template v-if="Array.isArray(items)">
            <option
                v-for="(item, index) in items"
                :value="item.value"
                :key="id + '-dropdown-item-' + index"
                :disabled="(disabledValues.indexOf(item.value) > -1 && item.value !== selectedValue && item.value !== '') || item.disabled"
                :selected="item.value == selectedValue">
                {{item.label}}
            </option>
        </template>

        <template v-if="!Array.isArray(items) && !items.hasGroups">
            <option 
                v-for="(item, key) in items"
                :value="key"
                :key="key"
                :disabled="(disabledValues.indexOf(key) > -1 && key !== selectedValue && key !== '') || item.disabled"
                :selected="key == selectedValue">
                <template v-if="item.label">
                {{ item.label }}
                </template>
                <template v-else>
                {{ item }}
                </template>
            </option>
        </template>

        <template v-if="!Array.isArray(items) && items.hasGroups"> 
            <option 
                v-for="(item, key) in items.groups.ungrouped"
                :value="key"
                :key="'ungrouped-' + key"
                :disabled="(disabledValues.indexOf(key) > -1 && key !== selectedValue && key !== '') || item.disabled"
                :selected="key == selectedValue">
                {{item.label}}
            </option>

            <template v-for="(groupName, index) of Object.keys(items.groups)">
                <optgroup 
                    v-if="groupName !== 'ungrouped'"
                    :key="groupName + '-' + index"
                    :label="groupName">
                    <option 
                        v-for="(item, key) in items.groups[groupName]"
                        :value="key"
                        :key="key"
                        :disabled="(disabledValues.indexOf(key) > -1 && key !== selectedValue && key !== '') || item.disabled"
                        :selected="key == selectedValue">
                        {{item.label}}
                    </option>
                </optgroup>
            </template>
        </template>
    </select>
</template>

<script>
export default {
    name: 'dropdown',
    props: {
        id: {
            default: 'dropdown-default',
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
        },
        disabledValues: {
            default: () => [],
            type: Array
        },
        customCssClasses: {
            default: '',
            type: String
        }
    },
    computed: {
        cssClasses () {
            let cssClasses = { 
                'no-border': this.noBorder 
            };

            if (this.customCssClasses && this.customCssClasses.trim() !== '') {
                this.customCssClasses.split(' ').forEach(item => {
                    item = item.replace(/[^a-z0-9\-\_\s]/gmi, '');
                    cssClasses[item] = true;
                });
            }

            return cssClasses;
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
    max-width: 100%;
    min-width: 100px;
    min-height: 46px;
    position: relative;
    width: 100%;

    &.no-border {
        background-color: transparent!important;
        box-shadow: none; 
        padding: 0 12px 0 0;

        &:focus {
            box-shadow: none;
        }
    }

    &[disabled],
    &[readonly] {
        opacity: .5;
        cursor: not-allowed;

        &:focus {
            box-shadow: inset 0 0 0 1px var(--input-border-color);
        }
    }

    select[multiple] {
        padding: baseline(6);
        width: 100%;

        &:hover {
            border-color: var(--input-border-color);
        }

        &:focus {
            border-color: var(--input-border-color);
        }

        &[disabled] {
            background-color: var(--gray-1);
            cursor: not-allowed;
            &:hover {
                border-color: var(--input-border-color);
            }
        }
    }

    &:not([multiple]) {
        background: url('data:image/svg+xml;utf8,<svg fill="%238e929d" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 6"><polygon points="10 0 5 0 0 0 5 6 10 0"/></svg>') no-repeat calc(100% - 2rem) 50%;
        background-color: var(--input-bg);
        background-size: 10px;
        padding-right: 3rem;
    }

    &.invalid {
        border: 1px solid var(--warning);

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
