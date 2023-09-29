<template>
    <div :class="cssClasses">
        <!-- Fields with separated label (most cases) -->
        <label
            v-if="!labelHidden && labelSeparated && label"
            :for="id">
            {{ label }}
        </label>

        <div v-if="labelSeparated">
            <slot name="field"></slot>
            <slot name="second-label"></slot>
            <slot name="note"></slot>
        </div>

        <!-- Fields with label around the field (mainly switchers) -->
        <label
            :class="labelCssClasses"
            v-if="!labelHidden && !labelSeparated"
            :for="id">
            <slot name="field"></slot>
            {{ label }}
            <slot name="note"></slot>
        </label>
    </div>
</template>

<script>
export default {
    name: 'field',
    props: {
        id: {
            default: '',
            type: String
        },
        label: {
            default: '',
            type: String
        },
        labelHidden: {
            default: false,
            type: Boolean
        },
        labelSeparated: {
            default: true,
            type: Boolean
        },
        labelFullWidth: {
            default: false,
            type: Boolean
        },
        noLabelSpace: {
            default: false,
            type: Boolean
        },
        spacing: {
            default: 'normal',
            type: String
        },
        withCharCounter: {
            default: false,
            type: Boolean
        }
    },
    computed: {
        cssClasses: function() {
            let containsSwitcher = false;

            if (this.$slots && this.$slots['field']) {
                this.$slots['field'].forEach(item => {
                    if (item && item.tag && item.tag.substr(-9) === '-switcher') {
                        containsSwitcher = true;
                        return;
                    }
                });
            }

            return {
                'field': true,
                'field-label-full-width': this.labelFullWidth,
                'field-small-spacing': this.spacing === 'small',
                'field-with-char-counter': this.withCharCounter,
                'field-with-switcher': containsSwitcher
            };
        },
        labelCssClasses: function() {
            return {
                'is-not-separated': true,
                'has-no-label-space': this.noLabelSpace,
                'no-spaces': this.spacing === 'small'
            };
        }
    }
}
</script>

<style lang="scss" scoped>
@import '../../scss/variables.scss';

label {
    color: var(--label-color);
    cursor: pointer;
    font-weight: 400;
}

.field {
    display: table;
    margin: 2rem 0;
    table-layout: fixed;
    width: 100%;

    &.field-small-spacing {
        margin: 1rem 0;
    }

    &:first-child {
        margin-top: 0;

        .separator {
            padding-top: 0;
        }
    }

    & > label {
        &:first-child {
            cursor: default;
            display: table-cell;
            line-height: 1.4;
            padding: 1.5rem 1rem 0 0;
            vertical-align: top;
            width: 23rem;

            sup {
                color: var(--warning);
                font-size: 1.8rem;
                font-weight: 400;
                position: relative;
                top: 1px;
            }
        }

        &.is-not-separated {
            padding-left: 23rem;

            &.has-no-label-space {
                padding-left: 0;
            }
        }

        &.no-spaces {
            padding-top: 0;
        }
    }

    &.fields-2 {
        label ~ label {
            display: table-cell;
            padding: 0 2rem;
            text-align: right;
        }
    }

    &.no-label {
        padding-left: 23rem;
        grid-template-columns: auto;
    }

    &.is-hidden {
        display: none;
    }

    &:last-child {
        margin-bottom: 0;
    }

    & > div {
        display: table-cell;
        padding: 0;
        vertical-align: bottom;
        width: 100%;

        & > strong {
            display: inline-block;
            width: 50%;

            & + select {
                width: 50%;
            }
        }

        .switcher {
            margin-top: 1.5rem;
        }
    }

    & > div > select,
    & > div > textarea,
    & > div > input[type="text"],
    & > div > input[type="number"],
    & > div > input[type="colorpicker"],
    & > div > input[type="password"] {
        width: 100%;
    }

    .note {
        clear: both;
        color: var(--text-light-color);
        display: block;
        font-size: 1.35rem;
        font-style: italic;
        line-height: 1.4;        
        padding: .5rem 0 1rem 0;
        user-select: text;

        svg {
            display: inline-block;
            height: 1.4rem;
            margin-right: .5rem;
            width: 1.4rem;
        }

        &.is-invalid {
            color: var(--warning);
        }
        
        a {
            color: var(--link-primary-color);
            
            &:active,
            &:focus,
            &:hover {
                color: var(--link-primary-color-hover);
            }
        }
    }

    label + .note {
        padding-top: 1.5rem;
    }

    .checkbox ~ .note {
        margin-bottom: 1.5rem;
    }

    .range-wrapper {
        position: relative;
        z-index: 1;

        & + .note {
            padding-top: 1.5rem;
        }
    }

    .separator {
        clear: both;
        display: block;
        position: relative;
        width: 100%;

        &.line > .separator-wrapper::before {
            border: 1px solid var(--gray-1);
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
                background: var(--bg-primary);
                color: var(--color-primary);
                font-size: 1.4rem;
                font-weight: var(--font-weight-semibold);
                padding-right: .5rem;
                position: absolute;
                text-transform: uppercase;
                top: 50%;
                transform: translateY(-50%);
                width: auto;
            }
        }

        & > .note {
            padding: 0;
        }

        &.line > .note {
            padding: 2.5rem 0 0 0;
        }
    }

    &.field-label-full-width {
        display: block;
        margin: 0;

        & > label,
        & > div {
            display: block;
            width: 100%;
        }

        & > label {
            padding: 0;
        }

        & > div {
            padding: .85rem 0;

            textarea {
                margin: 0;
            }
        }
    }

    &.field-with-char-counter {
        .note {
            margin-top: -3rem;
            width: 70%;
        }
    }

    &.field-with-switcher {
        & > label {
            &:first-child {
                padding-top: 0;
            }
        }   
    }
}
</style>
