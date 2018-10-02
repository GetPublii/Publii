<template>
    <div :class="cssClasses">
        <div class="separator-wrapper">
            <label v-if="label">{{ label }}</label>
        </div>

        <small
            v-if="note"
            class="note"
            v-html="note">        
        </small>
    </div>
</template>

<script>
export default {
    name: 'separator',
    props: {
        'label': {
            default: '',
            type: String
        },
        'type': {
            default: '',
            type: String
        },
        'is-line': {
            default: true,
            type: Boolean
        },
        'note': {
            default: '',
            type: String
        }
    },
    computed: {
        cssClasses () {
            return {
                'separator': true,
                'line': this.isLine,
                'small': this.type.indexOf('small') > -1,
                'medium': this.type.indexOf('medium') > -1,
                'big': this.type.indexOf('big') > -1
            };
        }
    }
}
</script>

<style lang="scss" scoped>
@import '../../scss/variables.scss';

.separator {
    clear: both;
    display: block;
    position: relative;
    width: 100%;

    &.small,
    &.medium,
    &.big {
        padding-bottom: 1rem;
    }

    &.small {
        padding-top: 1rem;
    }

    &.medium {
        padding-top: 2rem;
    }

    &.big {
        padding-top: 4rem;
    }

    &.line > .separator-wrapper:before {
        border-top: 1px dashed $color-8;
        content: "";
        left: 0;
        position: absolute;
        top: 50%;
        width: 100%;
    }

    & > .separator-wrapper {
        height: 2rem;
        position: relative;

        & > label {
            background: $color-10;
            color: $color-helper-7;
            font-size: 1.6rem;
            font-weight: 600;
            padding-right: .5rem;
            position: absolute;
            top: 50%;
            transform: translateY(-50%);
            width: auto;
        }
    }

    & > .note {
        padding: 0;
        clear: both;
        display: block;
        font-size: 1.4rem;
        font-style: italic;
        line-height: 1.4;
        opacity: .75;
        // padding: .5rem 0 1rem 0;
    }

    &.line > .note {
        padding: 2.5rem 0 0 0;
    }
}
</style>
