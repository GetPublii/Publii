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
            :size="iconSize"
            non-interactive
            :name="icon" />

        <span
            v-if="loadingLayout === 'overlay'"
            :class="{ 'button-label-hidden': loading }">
            <slot></slot>
        </span>
        <slot v-else-if="!loading"></slot>

        <span
            v-if="loading"
            class="preloader"
            aria-hidden="true"></span>
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
                'clean-muted',
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
        iconSize: {
            default: 's',
            type: String,
            validator: value => ['xs', 's'].includes(value)
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
        loadingLayout: {
            default: 'replace',
            type: String,
            validator: value => ['replace', 'overlay'].includes(value)
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
                'button-clean': ['clean', 'clean-inverse', 'clean-muted'].includes(this.appearance),
                'button-clean-invert': this.appearance === 'clean-inverse',
                'button-clean-muted': this.appearance === 'clean-muted',
                'button-icon': Boolean(this.icon) && (!this.loading || this.loadingLayout === 'overlay'),
                'button-only-icon': this.iconOnly && this.iconTone === 'default',
                'button-only-icon-color': this.iconOnly && this.iconTone === 'primary',
                'button-bottom': this.layout === 'bottom',
                'button-medium': this.size === 'medium',
                'button-small': this.size === 'small',
                'button-full-width': this.width === 'full',
                'button-half-width': this.width === 'half',
                'button-quarter-width': this.width === 'quarter',
                'button-no-border-radius': this.square,
                'button-disabled': this.disabled && !(this.loading && this.loadingLayout === 'overlay'),
                'button-disabled-with-events': this.disabledWithEvents,
                'button-preloader': this.loading,
                'button-preloader-overlay': this.loading && this.loadingLayout === 'overlay',
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
    --button-control-height: var(--button-height);
    --button-control-padding: var(--button-padding-inline);
    --button-control-icon-size: var(--button-icon-size);

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
    height: var(--button-control-height);
    letter-spacing: inherit;
    line-height: var(--line-height-base);
    margin: 0;
    /* Native buttons centre the line box independently of the control height. */
    padding: 0 var(--button-control-padding);
    position: relative;
    text-align: inherit;
    text-indent: inherit;
    text-shadow: inherit;
    text-transform: inherit;
    transition: var(--transition-default);
    transition-property: background-color, border-color, box-shadow, color, fill, opacity;
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
        height: var(--button-control-icon-size);
        left: var(--button-control-padding);
        width: var(--button-control-icon-size);
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
    }

    &.button-disabled,
    &.button-disabled-with-events {
        background-color: var(--button-disabled-bg);
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

/* Low-emphasis text button for dismiss actions under a primary action,
   in the same roles as the dialog cancel button */
.button-clean-muted {
    color: var(--popup-btn-cancel-color);
    font-weight: var(--font-weight-regular);

    &:active,
    &:focus-visible,
    &:hover,
    &.button-active {
        color: var(--popup-btn-cancel-hover-color);
    }
}

.button-back {
    & + .button {
        margin-left: var(--space-8) !important;
    }
}

.button-bottom {
    --button-control-height: var(--button-height-large);
    --button-control-padding: var(--space-8);

    align-items: center;
    background: var(--button-primary-bg);
    border-radius: 0 0 3px 3px;
    display: inline-flex;
    font-size: var(--font-size-ui-sm);
    gap: var(--button-icon-gap);
    justify-content: center;
    padding: 0 var(--button-control-padding);
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
        flex-shrink: 0;
        left: auto !important;
        position: static;
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
    --button-control-height: var(--button-height-large);
    --button-control-padding: var(--space-8);

    font-size: var(--font-size-ui-sm);
    font-weight: var(--font-weight-medium);
}

.button-small {
    --button-control-height: var(--button-height-small);
    --button-control-padding: var(--button-padding-inline-small);
    --button-control-icon-size: var(--button-icon-size-small);

    font-size: var(--font-size-ui-sm);
    font-weight: var(--font-weight-regular);
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
    padding-left: calc(var(--button-control-padding) + var(--button-control-icon-size) + var(--button-icon-gap));
    padding-right: var(--button-control-padding);

    &.button-bottom {
        padding-left: var(--button-control-padding);
    }

    &.button-outline {
        & > svg {
            fill: var(--icon-primary-color);
            transition: var(--transition-default);
            transition-property: background-color, border-color, box-shadow, color, fill, opacity;
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

    &.button-only-icon > svg,
    &.button-only-icon-color > svg {
        left: 50%;
        transform: translate(-50%, -50%);
    }

    &.button-only-icon {
        padding: 0;
        width: var(--button-control-height);
    }

    &.button-only-icon-color {
        padding: 0;
        width: var(--button-control-height);

         & > svg {
            fill: var(--color-primary);
        }
    }

}

.button-preloader {
    min-width: var(--button-control-height);

    .preloader {
        animation: rotate .6s infinite linear;
        border: .2rem solid var(--input-border-color);
        border-top: .2rem solid var(--color-border-strong);
        border-radius: 50%;
        display: block;
        height: var(--button-control-icon-size);
        inset: 0;
        margin: auto;
        position: absolute;
        width: var(--button-control-icon-size);
    }

    & > svg {
        display: none;
    }
}

/* Keep the label's layout space while the loader replaces it visually.
   Opt-in buttons retain their action colors and native disabled state. */
.button-preloader.button-preloader-overlay {
    cursor: wait;
    pointer-events: none;

    .button-label-hidden {
        visibility: hidden;
    }

    .preloader {
        border-color: currentColor;
        border-right-color: transparent;
        inset: 0;
        margin: auto;
        position: absolute;
    }
}

@media (prefers-reduced-motion: reduce) {
    .button-preloader-overlay .preloader {
        animation: none;
    }
}

.button-light {
    background: var(--bg-primary);
    color: var(--text-light-color);
    font-weight: var(--font-weight-medium);

    & > svg {
        fill: var(--icon-secondary-color);
        transition: var(--transition-default);
        transition-property: background-color, border-color, box-shadow, color, fill, opacity;
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
