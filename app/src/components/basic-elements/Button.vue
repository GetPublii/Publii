<template>
    <button
        :class="cssClasses"
        type="button"
        :disabled="disabled"
        :aria-disabled="disabledWithEvents ? 'true' : null"
        :aria-busy="loading ? 'true' : null"
        :title="title"
        @click="onClick">
        <icon
            v-if="icon"
            size="s"
            non-interactive
            :name="icon" />

        <slot v-if="!loading"></slot>

        <span
            v-if="loading"
            class="preloader"></span>
    </button>
</template>

<script>
export default {
    name: 'p-button',
    props: {
        active: {
            default: false,
            type: Boolean
        },
        appearance: {
            default: 'default',
            type: String,
            validator: value => [
                'default',
                'secondary',
                'outline',
                'popup-cancel',
                'clean',
                'clean-inverse',
                'light'
            ].includes(value)
        },
        back: {
            default: false,
            type: Boolean
        },
        disabled: {
            default: false,
            type: Boolean
        },
        disabledWithEvents: {
            default: false,
            type: Boolean
        },
        icon: {
            default: '',
            type: String
        },
        iconOnly: {
            default: false,
            type: Boolean
        },
        iconTone: {
            default: 'default',
            type: String,
            validator: value => ['default', 'primary'].includes(value)
        },
        intent: {
            default: 'default',
            type: String,
            validator: value => ['default', 'primary', 'danger', 'success'].includes(value)
        },
        layout: {
            default: 'inline',
            type: String,
            validator: value => ['inline', 'bottom'].includes(value)
        },
        loading: {
            default: false,
            type: Boolean
        },
        onClick: {
            default: () => false,
            type: Function
        },
        size: {
            default: 'default',
            type: String,
            validator: value => ['default', 'small', 'medium'].includes(value)
        },
        square: {
            default: false,
            type: Boolean
        },
        title: {
            default: '',
            type: String
        },
        width: {
            default: 'auto',
            type: String,
            validator: value => ['auto', 'quarter', 'half', 'full'].includes(value)
        }
    },
    computed: {
        cssClasses: function() {
            return {
                'button': true,
                'button-primary': this.intent === 'primary',
                'button-danger': this.intent === 'danger',
                'button-green': this.intent === 'success',
                'button-secondary': this.appearance === 'secondary',
                'button-outline': this.appearance === 'outline',
                'button-cancel-popup': this.appearance === 'popup-cancel',
                'button-light': this.appearance === 'light',
                'button-clean': ['clean', 'clean-inverse'].includes(this.appearance),
                'button-clean-invert': this.appearance === 'clean-inverse',
                'button-icon': Boolean(this.icon) && !this.loading,
                'button-only-icon': this.iconOnly && this.iconTone === 'default',
                'button-only-icon-color': this.iconOnly && this.iconTone === 'primary',
                'button-bottom': this.layout === 'bottom',
                'button-medium': this.size === 'medium',
                'button-small': this.size === 'small',
                'button-full-width': this.width === 'full',
                'button-half-width': this.width === 'half',
                'button-quarter-width': this.width === 'quarter',
                'button-no-border-radius': this.square,
                'button-disabled': this.disabled,
                'button-disabled-with-events': this.disabledWithEvents,
                'button-preloader': this.loading,
                'button-active': this.active,
                'button-back': this.back
            }
        }
    }
}
</script>

<style scoped>

/*
 * Basic button
 */

.button {
    /* Native <button> reset: keep the inheritance of the former inline span and
       ignore global element rules such as vendor `.buttons button` margins. */
    appearance: none;
    background: var(--button-primary-bg);
    border: none;
    border-radius: var(--radius-base);
    box-shadow: none;
    color: var(--white);
    cursor: pointer;
    display: inline-block;
    font: inherit;
    font-size: var(--font-size-ui-sm);
    font-family: var(--font-family-sans);
    font-weight: var(--font-weight-medium);
    height: 4.4rem;
    letter-spacing: inherit;
    line-height: 4.3rem;
    margin: 0;
    /* Chromium centres <button> content vertically; the bottom padding equals
       height minus line-height, so the line box stays pinned to the top exactly
       like the former inline span. */
    padding: 0 1.3rem .1rem;
    position: relative;
    text-align: inherit;
    text-indent: inherit;
    text-shadow: inherit;
    text-transform: inherit;
    transition: var(--transition-default);
    user-select: none;
    white-space: nowrap;
    word-spacing: inherit;

    &:focus-visible {
        outline: 2px solid var(--input-border-focus);
        outline-offset: 2px;
    }

    &:active,
    &:focus-visible,
    &:hover,
    &.button-active {
        background: var(--button-primary-bg-hover);
        color: var(--white);
    }

    & > svg {
        display: inline-block;
        fill: var(--white);
        left: 1.8rem;
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
    }

    &.button-disabled,
    &.button-disabled-with-events {
        background-color: var(--popup-btn-cancel-bg-hover);
        border-color: var(--input-border-color);
        color: var(--popup-btn-cancel-color);
        cursor: not-allowed;
        pointer-events: none;
    }

    &.button-disabled-with-events {
        pointer-events: auto;
    }

    & + .button,
    & + button {
        margin-left: calc(2.5 * var(--space-unit));
    }
}

.button-primary {
    background: var(--button-primary-bg);
    color: var(--white);

    &:active,
    &:focus-visible,
    &:hover,
    &.button-active {
        background: var(--button-primary-bg-hover);
        color: var(--white);
    }
}

.button-secondary {
    background: var(--button-secondary-bg);
    color: var(--button-secondary-color);

    & > svg {
       fill: var(--button-secondary-color);
    }

    &:active,
    &:focus-visible,
    &:hover,
    &.button-active {
        background: var(--button-secondary-bg-hover);
        color: var(--button-secondary-color-hover);

        & > svg {
            fill: var(--button-secondary-color-hover);
        }
    }
}

.button-cancel-popup {
    background: var(--popup-btn-cancel-bg);
    border: none;
    border-top: 1px solid var(--input-border-color);
    color: var(--popup-btn-cancel-color);

    &:active,
    &:focus-visible,
    &:hover,
    &.button-active {
        background: var(--popup-btn-cancel-bg-hover);
        color: var(--popup-btn-cancel-hover-color);
    }
}

.button-danger {
    background: var(--button-danger-bg);

    &:active,
    &:focus-visible,
    &:hover,
    &.button-active {
        background: var(--button-danger-bg-hover);
        color: var(--white);
    }
}

.button-green {
    background: var(--color-success);

    &:active,
    &:focus-visible,
    &:hover,
    &.button-active {
         background: var(--color-success);
    }
}

.button-outline {
    background: transparent;
    box-shadow: inset 0 0 0 2px var(--input-border-color);
    color: var(--text-primary-color);

    &:active,
    &:focus-visible,
    &:hover,
    &.button-active {
        background: transparent;
        box-shadow: inset 0 0 0 2px var(--color-control-border-hover);
        color: var(--text-primary-color);

        &:disabled {
            box-shadow: inset 0 0 0 2px var(--input-border-color);
        }
    }
}

.button-clean {
    background: transparent;
    box-shadow: none;
    color: var(--link-primary-color);
    font-size: var(--font-size-ui-sm);
    font-weight: var(--font-weight-regular);

    &:active,
    &:focus-visible,
    &:hover,
    &.button-active {
        background: transparent;
        box-shadow: none;
        color: var(--link-primary-color-hover);
    }
}

.button-clean-invert {
    background: transparent;
    box-shadow: none;
    color: var(--link-primary-color-hover);
    font-size: var(--font-size-ui-sm);
    font-weight: var(--font-weight-regular);

    &:active,
    &:focus-visible,
    &:hover,
    &.button-active {
        background: transparent;
        box-shadow: none;
        color: var(--link-primary-color);
    }
}

.button-back {
    & + .button {
        margin-left: var(--space-8) !important;
    }
}

.button-bottom {
    background: var(--button-primary-bg);
    border-radius: 0 0 3px 3px;
    display: block;
    font-size: var(--font-size-ui-sm);
    height: 5.6rem;
    line-height: 5.6rem;
    padding: 0 var(--space-8);
    text-align: center;
    width: 100%;

    &:focus-visible {
        outline-offset: -2px;
    }

    &:active,
    &:focus-visible,
    &:hover,
    &.button-active {
        background: var(--button-primary-bg-hover);
    }

    & > svg {
        left: -1rem!important;
        margin-top: -.5rem;
        position: relative;
        top: 4px;
        transform: none;
    }

    &.button-outline {
        background: transparent;
        box-shadow: inset 0 0 0 2px var(--input-border-color);
        color: var(--text-primary-color);

        &:active,
        &:focus-visible,
        &:hover,
        &.button-active {
            background: transparent;
            box-shadow: inset 0 0 0 2px var(--color-control-border-hover);
            color: var(--text-primary-color);

            &:disabled {
                box-shadow: inset 0 0 0 2px var(--input-border-color);
            }
        }
    }
}

.button-medium {
    font-size: var(--font-size-ui-sm);
    font-weight: var(--font-weight-medium);
    height: 5.6rem;
    line-height: 5.5rem;
    padding: 0 var(--space-8) .1rem;
}

.button-small {
    font-size: var(--font-size-ui-sm);
    font-weight: var(--font-weight-regular);
    height: 3.8rem;
    line-height: 3.8rem;
    padding: 0 1.4rem;
}

.button-quarter-width {
    width: 25%;
}

.button-half-width {
    margin: 0!important;
    width: 50%;
}

.button-full-width {
    margin: 0!important;
    width: 100%;
}

.button-no-border-radius {
    border-radius: 0;
}

.button-icon {
    padding-left: 4.3rem;
    padding-right: 1.3rem;

    & > svg {
        left: 1.2rem;
    }

    &.button-small {
        padding-left: 3.8rem;

        & > svg {
            height: 16px;
            width: 16px;
        }
    }

    &.button-outline {
        & > svg {
            fill: var(--icon-primary-color);
            transition: var(--transition-default);
        }

        &:active,
        &:focus-visible,
        &:hover {

           & > svg {
            fill: var(--icon-tertiary-color);
           }
        }
    }

    &.button-clean,
    &.button-clean-invert {
        & > svg {
            fill: currentColor;
        }
    }

    &.button-only-icon {
        padding: 0;
        width: 48px;
    }

    &.button-only-icon-color {
        padding: 0;
        width: 48px;

         & > svg {
            fill: var(--color-primary);
        }
    }

}

.button-preloader {
    .preloader {
        animation: rotate .6s infinite linear;
        border: .2rem solid var(--input-border-color);
        border-top: .2rem solid var(--color-border-strong);
        border-radius: 50%;
        clear: both;
        display: block;
        height: 2rem;
        margin: 1.3rem auto;
        width: 2rem
    }

    & > svg {
        display: none;
    }

    &.button-small {
        .preloader {
            margin-top: var(--space-4);
        }
    }
}

.button-light {
    background: var(--bg-primary);
    color: var(--text-light-color);
    font-weight: var(--font-weight-medium);
    padding-left: 3.8rem;

    & > svg {
        fill: var(--icon-secondary-color);
        transition: var(--transition-default);
    }

    &:active,
    &:focus-visible,
    &:hover,
    &.button-active {
        background: var(--color-surface-subtle);
        color: var(--text-primary-color);

        & > svg {
            fill: var(--icon-tertiary-color);
        }
    }
}

@keyframes rotate {
    from {
        transform: rotate(0deg);
    }

    to {
        transform: rotate(359deg);
    }
}
</style>
