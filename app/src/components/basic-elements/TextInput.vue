<template>
    <div
        :id="anchor"
        :class="cssClasses">
        <icon
            v-if="icon"
            size="s"
            :name="icon" />

        <input
            :type="fieldType"
            v-model="content"
            :id="id"
            :readonly="readonly"
            :disabled="disabled"
            :placeholder="placeholder"
            :min="min"
            :max="max"
            :step="step"
            :spellcheck="spellcheck"
            :required="required"
            :aria-invalid="invalid ? 'true' : 'false'"
            :aria-describedby="ariaDescribedby || null"
            ref="input"
            :pattern="pattern"
            @keyup="keyboardEvent"
            @keydown="keyboardEvent"
            @keypress="keyboardEvent" />

        <char-counter
            v-if="charCounter"
            v-model="content"
            :preferredCount="preferredCount" />
    </div>
</template>

<script>
export default {
    name: 'text-input',
    data: function() {
        return {
            content: '',
            fieldType: ''
        };
    },
    props: {
        'id': {
            default: '',
            type: String
        },
        'anchor': {
            default: '',
            type: String
        },
        'icon': {
            default: '',
            type: String
        },
        'placeholder': {
            default: '',
            type: String
        },
        'type': {
            default: 'text',
            type: String
        },
        'size': {
            default: 'default',
            type: String,
            validator: value => ['default', 'small'].includes(value)
        },
        'keyboardBlocked': {
            default: false,
            type: Boolean
        },
        'readonly': {
            default: false,
            type: Boolean
        },
        'disabled': {
            default: false,
            type: Boolean
        },
        'value': {
            default: '',
            type: [String, Number]
        },
        'min': {
            default: '',
            type: String
        },
        'max': {
            default: '',
            type: String
        },
        'step': {
            default: '',
            type: String
        },
        'pattern': {
            default: '',
            type: String
        },
        'changeEventName': {
            default: '',
            type: String
        },
        'customCssClasses': {
            default: '',
            type: String
        },
        'charCounter': {
            default: false,
            type: Boolean
        },
        'preferredCount': {
            default: 0,
            type: Number
        },
        'spellcheck': {
            default: true,
            type: Boolean
        },
        'required': {
            default: false,
            type: Boolean
        },
        'invalid': {
            default: false,
            type: Boolean
        },
        'ariaDescribedby': {
            default: '',
            type: String
        }
    },
    computed: {
        cssClasses: function() {
            let cssClasses = {};

            cssClasses = {
                'input-wrapper': true,
                'is-invalid': this.invalid,
                'is-small': this.size === 'small',
                'has-icon': !!this.icon,
                'is-number': this.type === 'number'
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
    watch: {
        value (newValue, oldValue) {
            this.content = newValue;
        },
        content: function(newValue) {
            if(this.changeEventName) {
                this.$bus.$emit(this.changeEventName, newValue);
            }

            this.$emit('input', this.content);
        }
    },
    mounted: function() {
        setTimeout(() => {
            this.content = this.value;
            this.fieldType = this.type;
        }, 0);
    },
    methods: {
        keyboardEvent: function (e) {
            if(this.keyboardBlocked) {
                e.preventDefault();
            }
        },
        getValue: function () {
            return this.content;
        },
        setValue: function (newValue) {
            this.content = newValue;
        }
    }
}
</script>

<style scoped>

/*
 * Text input field
 */

.input-wrapper {
    position: relative;

    &.is-number {
        display: inline-block;
        width: 12rem;
    }

    svg {
        fill: var(--icon-secondary-color);
        left: 2rem;
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
        z-index: 1;
    }

    input {
        background-color: var(--input-bg);
        border: none;
        box-shadow: inset 0 0 0 1px var(--input-border-color);
        color: var(--text-primary-color);
        display: inline-block;
        font: var(--font-weight-regular) var(--font-size-ui-md)/var(--line-height-base) var(--font-family-sans);
        outline: none;
        padding: 12px 18px;
        width: 100%;

        &:focus {
            box-shadow: var(--input-shadow-focus);
        }

        &[disabled],
        &[readonly] {
            opacity: .5;
            cursor: not-allowed;

            &:focus {
                box-shadow: inset 0 0 0 1px var(--input-border-color);
            }
        }
    }

    &.is-small {
        input {
            padding: 6px 9px;
        }
    }

    /* Invalid state: the shared ring, kept while focused */
    &.is-invalid input,
    input[aria-invalid="true"] {
        box-shadow: var(--input-shadow-invalid);
    }

    &.has-icon {
        input {
            padding-left: 5.5rem;
        }

        &.is-small {
            input {
                padding-left: var(--space-16);
            }
        }
    }
}
</style>
