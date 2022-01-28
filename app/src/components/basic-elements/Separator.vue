<template>
    <div :class="cssClasses" :id="anchor">
        <div class="separator-wrapper">
            <label v-if="label">{{ label }}</label>
        </div>

        <small
            v-if="note"
            class="note"
            v-pure-html="note">        
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
        'anchor': {
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
        padding-bottom: 2rem;
    }

    &.small {
        padding-top: 2rem;
    }

    &.medium {
        padding-top: 3rem;

        & > .separator-wrapper {

            & > label {
               margin-bottom: -2rem;
            }
        }
    }

    &.big {
        padding-top: 4rem;

        & > .separator-wrapper {

            & > label {
               margin-bottom: -2rem;
            }
        }
    }

    &.line > .separator-wrapper:before {
        border-top: 4px solid var(--bg-site);
        content: "";
        left: 0;
        position: absolute;
        top: 0;
        width: 100%;
    }

    & > .separator-wrapper {
        position: relative;

        & > label {
            color: var(--headings-color);
            display: block;
            font-size: 1.8rem;
            font-weight: 600;
            padding: 3.5rem 0 0;

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

.field {
    &:first-child {

        .separator-wrapper {
            
            & > label {
                padding-top: .5rem;
            }

            &::before {
                display: none;
            }
        }
    }
}
</style>
