<template>
    <span 
        :id="anchor"
        :class="{ 'has-label': label }">
        <span
            :class="cssClasses"
            @click="toggle"></span>
        {{ label }}
    </span>
</template>

<script>
export default {
    name: 'switcher',
    props: {
        value: {
            type: [Boolean, Number]
        },
        label: {
            default: '',
            type: String
        },
        checked: {
            default: false,
            type: Boolean
        },
        onToggle: {
            default: () => false,
            type: Function
        },
        lowerZindex: {
            default: false,
            type: Boolean
        },
        anchor: {
            default: '',
            type: String
        },
        disabled: {
            default: false,
            type: Boolean
        }
    },
    data: function() {
        return {
            isChecked: this.checked
        };
    },
    computed: {
        cssClasses: function() {
            return {
                'switcher': true,
                'is-checked': this.isChecked,
                'lower-zindex': this.lowerZindex,
                'has-label': this.label,
                'is-disabled': this.disabled
            };
        }
    },
    watch: {
        value: function (newValue, oldValue) {
            this.isChecked = !!newValue;
        }
    },
    mounted () {
        if (this.value) {
            this.isChecked = !!this.value;
        }
    },
    methods: {
        toggle: function() {
            this.isChecked = !this.isChecked;
            this.$emit('input', this.isChecked);
            this.onToggle(this.isChecked);
        },
        getValue: function() {
            return !!this.isChecked;
        }
    }
}
</script>

<style lang="scss" scoped>
@import '../../scss/variables.scss';

.has-label {
    font-size: $app-font-base;
    margin-right: 10px;
}

.switcher {
    background: rgba(142, 146, 157, 0.45);
    border-radius: 20px;
    cursor: pointer;
    display: inline-block;
    height: 16px;
    margin-right: .5rem;
    position: relative;
    top: 2px;
    transition: all .28s ease;
    width: 32px;
    z-index: 1;

    &.lower-zindex {
        z-index: 0;
    }

    &:after {
        position: absolute;
        left: 0;
        top: -2px;
        display: block;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: #8e929d;
        content: '';
        transition: all .28s ease;
    }

    &:active:after {
        transform: scale(0.8);
    }

    &.is-checked {
        background: var(--input-border-checked);

        &:after {
            left: 14px;
            background: var(--input-border-focus);
        }
    }

    &.is-disabled {
        opacity: .5;
        pointer-events: none;
    }
}
</style>
