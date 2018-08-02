<template>
    <div :class="cssClasses">
        <icon
            v-if="icon"
            size="s"
            primaryColor="color-8"
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
            :pattern="pattern"
            @keyup="keyboardEvent"
            @keydown="keyboardEvent"
            @keypress="keyboardEvent" />

        <span
            v-if="type === 'password' && fieldType === 'password'"
            class="password-show"
            @click="showPassword">
            Show password
        </span>

        <span
            v-if="type === 'password' && fieldType === 'text'"
            class="password-hide"
            @click="hidePassword">
            Hide password
        </span>

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
        'properties': {
            default: '',
            type: String
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
        }
    },
    computed: {
        cssClasses: function() {
            let properties = [];
            let cssClasses = {};

            if(this.properties) {
                properties = this.properties.split(' ');
            }

            cssClasses = {
                'input-wrapper': true,
                'is-small': properties.indexOf('is-small') > -1,
                'has-padding': properties.indexOf('has-padding') > -1,
                'has-icon': !!this.icon,
                'is-number': this.type === 'number'
            };

            if(this.customCssClasses && this.customCssClasses.trim() !== '') {
                this.customCssClasses.split(' ').forEach(item => {
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
            if(this.properties.indexOf('keyboard-blocked') > -1) {
                e.preventDefault();
            }
        },
        showPassword: function () {
            this.fieldType = 'text';
        },
        hidePassword: function () {
            this.fieldType = 'password';
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

<style lang="scss" scoped>
@import '../../scss/variables.scss';

/*
 * Text input field
 */

.input-wrapper {
    position: relative;

    &.is-number {
        display: inline-block;
        width: 8rem;
    }

    svg {
        left: 2rem;
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
        z-index: 1;
    }

    input {
        background-color: $color-10;
        border: none;
        border-radius: 3px;
        box-shadow: inset 0 0 0 1px $color-8;
        color: $color-5;
        display: inline-block;
        font: 400 1.6rem/1.5 $secondary-font;
        outline: none;
        padding: 12px 18px;
        width: 100%;

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
    }

    &.is-small {
        input {
            padding: 6px 9px;
        }
    }

    &.is-invalid,
    &.has-error {
        input {
            box-shadow: inset 0 0 0 1px $color-3;
        }
    }

    &.has-padding {
        padding: 1rem 2rem;

        &.has-icon {
            svg {
                left: 3rem;
            }
        }
    }

    &.has-icon {
        input {
            padding-left: 5.5rem;
        }

        &.is-small {
            input {
                padding-left: 4rem;
            }
        }
    }

    .password-show,
    .password-hide {
        color: $color-1;
        cursor: pointer;
        font-size: 1.4rem;
        position: absolute;
        right: 2rem;
        user-select: none;
        top: 1.4rem;
        z-index: 1;
    }
}
</style>
