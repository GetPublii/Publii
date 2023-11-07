<template>
    <div 
        :id="anchor"
        :class="'input-range-wrapper ' + cssClass.replace(/[^a-z0-9\-\_\s]/gmi, '')">
        <input
            type="range"
            v-model="content"
            :readonly="readonly"
            :disabled="disabled"
            :min="min"
            :max="max"
            :step="step" />
        <span>
            <template v-if="contentModifier">
                {{ contentModifier(content) }}
            </template>
            <template v-else>
                {{ content }}
            </template>
        </span>
    </div>
</template>

<script>
export default {
    name: 'text-input',
    data: function() {
        return {
            content: ''
        };
    },
    props: {
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
            type: [String, Number]
        },
        'max': {
            default: '',
            type: [String, Number]
        },
        'step': {
            default: '',
            type: [String, Number]
        },
        'anchor': {
            default: '',
            type: String
        },
        'cssClass': {
            default: '',
            type: String
        },
        'contentModifier': {
            default: false,
            type: [Boolean, Function]
        }
    },
    watch: {
        value (newValue) { 
            this.content = newValue;
        },
        content (newValue) {
            if (this.changeEventName) {
                this.$bus.$emit(this.changeEventName, newValue);
            }

            this.$emit('input', this.content);
        }
    },
    mounted: function() {
        setTimeout(() => {
            this.content = this.value;
        }, 0);
    },
    methods: {
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

.input-range-wrapper {
    margin-bottom: 3.6rem;

    input[type="range"] {
        -webkit-appearance: none;
        background: transparent;
        float: left;
        margin: 1rem 0;
        position: relative;
        top: 1.6rem;
        width: 80%!important;

        & + span {
            float: right;
            position: relative;
            text-align: center;
            top: 1.6rem;
            width: 20%!important;
        }

        &::-webkit-slider-thumb {
            -webkit-appearance: none;
            background: var(--color-primary);
            border: none;
            border-radius: 50%;
            box-shadow: 1px 1px 1px rgba(0, 0, 0, .15);
            cursor: pointer;
            height: 2rem;
            margin-top: -1rem;
            outline: none;
            width: 2rem;
        }

        &::-webkit-slider-runnable-track {
            background: var(--input-border-color);
            border: none;
            cursor: pointer;
            height: 2px;
            outline: none;
            width: 80%;
        }

        &:focus::-webkit-slider-runnable-track {
            background: rgba(var(--color-primary-rgb), .5);
            outline: none;
        }
    }
}
</style>
