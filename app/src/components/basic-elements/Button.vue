<template>
    <span
        :class="cssClasses"
        @click="onClick"
        :title="title">
        <icon
            v-if="icon"
            size="s"
            properties="not-clickable"
            :name="icon" />

        <slot v-if="!isPreloader"></slot>

        <span
            v-if="isPreloader"
            class="preloader"></span>
    </span>
</template>

<script>
export default {
    name: 'p-button',
    props: {
        'icon': {
            default: '',
            type: String
        },
        'type': {
            default: '',
            type: String
        },
        'disabled': {
            default: false,
            type: Boolean
        },
        'onClick': {
            default: () => false,
            type: Function
        },
        'title': {
            default: '',
            type: String
        }
    },
    computed: {
        isPreloader: function() {
            return this.type.split(' ').indexOf('preloader') > -1;
        },
        cssClasses: function() {
            let types = [];

            if(this.type) {
                types = this.type.split(' ');
            }

            return {
                'button': true,
                'button-primary': types.indexOf('primary') > -1,
                'button-secondary': types.indexOf('secondary') > -1,
                'button-success': types.indexOf('success') > -1,
                'button-danger': types.indexOf('danger') > -1,
                'button-error': types.indexOf('error') > -1,
                'button-green': types.indexOf('green') > -1,
                'button-outline': types.indexOf('outline') > -1,
                'button-muted': types.indexOf('muted') > -1,
                'button-cancel-popup': types.indexOf('cancel-popup') > -1,
                'button-icon': types.indexOf('icon') > -1,
                'button-only-icon': types.indexOf('only-icon') > -1,
                'button-only-icon-color': types.indexOf('only-icon-color') > -1,
                'button-icon-smaller': types.indexOf('icon-smaller') > -1,
                'button-bottom': types.indexOf('bottom') > -1,
                'button-medium': types.indexOf('medium') > -1,
                'button-small': types.indexOf('small') > -1,
                'button-full-width': types.indexOf('full-width') > -1,
                'button-half-width': types.indexOf('half-width') > -1,
                'button-quarter-width': types.indexOf('quarter-width') > -1,
                'button-no-border-radius': types.indexOf('no-border-radius') > -1,
                'button-disabled': types.indexOf('disabled') > -1 || this.disabled,
                'button-disabled-with-events': types.indexOf('disabled-with-events') > -1,
                'button-preloader': this.isPreloader,
                'button-light': types.indexOf('light') > -1,
                'button-active': types.indexOf('active') > -1,
                'button-delete': types.indexOf('delete') > -1,
                'button-clean': types.indexOf('clean') > -1,
                'button-clean-invert': types.indexOf('clean-invert') > -1,
                'button-back': types.indexOf('back') > -1,
            }
        }
    }
}
</script>

<style lang="scss" scoped>
@import '../../scss/variables.scss';

/*
 * Basic button
 */

.button {
    background: var(--button-bg);
    border: none;
    border-radius: var(--border-radius);
    box-shadow: none;
    color: var(--white);
    cursor: pointer;
    display: inline-block;
    font-size: 1.3rem;
    font-family: var(--font-base);
    font-weight: var(--font-weight-semibold);  
    height: 4.4rem;
    line-height: 4.3rem;
    padding: 0 1.3rem;
    position: relative;
    transition: var(--transition);
    user-select: none;
    white-space: nowrap;

    &:focus {
        outline: none;
    }

    &:active,
    &:focus,
    &:hover,
    &.button-active {
        background: var(--button-bg-hover);
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

    &-link {
       background: var(--bg-primary);
        color: var(--color-primary);

        &:active,
        &:focus,
        &:hover,
        &.button-active {
            background: var(--gray-1);
            color: var(--color-primary);
        }
    }

    &-primary,
    &-success {
        background: var(--button-tertiary-bg);
        color: var(--white);

        &:active,
        &:focus,
        &:hover,
        &.button-active {
            background: var(--button-tertiary-bg-hover);
            color: var(--white);
        }
    }

    &-secondary {
        background: var(--button-secondary-bg);
        color: var(--button-secondary-color);

        & > svg {
           fill: var(--button-secondary-color);
        }

        &:active,
        &:focus,
        &:hover,
        &.button-active {
            background: var(--button-secondary-bg-hover);
            color: var(--button-secondary-color-hover);

            & > svg {
                fill: var(--button-secondary-color-hover);
            }
        }  
    }

    &-cancel-popup {
        background: var(--popup-btn-cancel-bg);
        border: none;
        border-top: 1px solid var(--input-border-color);
        color: var(--popup-btn-cancel-color);

        &:active,
        &:focus,
        &:hover,
        &.button-active {
            background: var(--popup-btn-cancel-bg-hover);
            color: var(--popup-btn-cancel-hover-color);
        }
    }

    &-danger,
    &-error {
        background: var(--button-red-bg);

        &:active,
        &:focus,
        &:hover,
        &.button-active {
            background: var(--button-red-bg-hover);
            color: var(--white);
        }
    }

    &-green {
        background: var(--success); 

        &:active,
        &:focus,
        &:hover,
        &.button-active {
             background: var(--success); 
        }
    }

    &-muted {
        background: var(--gray-4);

        &:active,
        &:focus,
        &:hover,
        &.button-active {
            background: var(--color-primary);
            color: var(--white);
        }
    }

    &-outline {
        background: transparent;
        box-shadow: inset 0 0 0 2px var(--input-border-color);
        color: var(--text-primary-color);

        &:active,
        &:focus,
        &:hover,
        &.button-active {
            background: transparent;
            box-shadow: inset 0 0 0 2px var(--gray-3);
            color: var(--text-primary-color);

            &:disabled {
                box-shadow: inset 0 0 0 2px var(--input-border-color);
            }
        }
    }

    &-clean {
        background: transparent;
        box-shadow: none;
        color: var(--link-primary-color);
        font: {
           size: 1.3rem;
           weight: 400;
        }

        &:active,
        &:focus,
        &:hover,
        &.button-active {
            background: transparent;
            box-shadow: none;
            color: var(--link-primary-color-hover);
        }
    }

    &-clean-invert {
        background: transparent;
        box-shadow: none;
        color: var(--link-primary-color-hover);
        font: {
            size: 1.3rem;
            weight: 400;
        }

        &:active,
        &:focus,
        &:hover,
        &.button-active {
            background: transparent;
            box-shadow: none;
            color: var(--link-primary-color);
        }
    }

    &-back {
        & + .button {
            margin-left: 2rem !important;
        }
    }

    &-bottom {
        background: var(--button-tertiary-bg);
        border-radius: 0 0 3px 3px;
        display: block;
        font-size: 1.3rem;
        height: 5.6rem;
        line-height: 5.6rem;
        padding: 0 2rem;
        text-align: center;
        width: 100%;

        &:active,
        &:focus,
        &:hover,
        &.button-active {
            background: var(--button-tertiary-bg-hover);
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
            &:focus,
            &:hover,
            &.button-active {
                background: transparent;
                box-shadow: inset 0 0 0 2px var(--gray-3);
                color: var(--text-primary-color);

                &:disabled {
                    box-shadow: inset 0 0 0 2px var(--input-border-color);
                }
            }
        }
    }

    &-medium {
        font-size: 1.3rem;
        font-weight: var(--font-weight-semibold);
        height: 5.6rem;
        line-height: 5.5rem;
        padding: 0 2rem;
    }

    &-small {
        font-size: 1.3rem;
        font-weight: var(--font-weight-normal);
        height: 3.8rem;
        line-height: 3.8rem;
        padding: 0 1.4rem;
    }

    &-quarter-width {
        width: 25%;
    }

    &-half-width {
        margin: 0!important;
        width: 50%;
    }

    &-full-width {
        margin: 0!important;
        width: 100%;
    }

    &-no-border-radius {
        border-radius: 0;
    }

    &-icon {
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
                transition: var(--transition);
            }

            &:active,
            &:focus,
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

        &.button-icon-smaller {
            & > svg {
                transform: translateY(-50%) scale(0.8);
            }
        }
    }

    &-preloader {
        .preloader {
            animation: rotate .6s infinite linear;
            border: .2rem solid var(--input-border-color);
            border-top: .2rem solid var(--gray-4);
            border-radius: 50%;
            clear: both;
            display: block;
            height: 2rem;
            margin: 1.3rem auto;
            width: 2rem;

            &-white {
                border-color: rgba(255, 255, 255, .5);
                border-top-color: rgba(255, 255, 255, 1);
            }
        }

        & > svg {
            display: none;
        }

        &.button-small {
            .preloader {
                margin-top: 1rem;
            }
        }
    }

    &-light {
        background: var(--bg-primary);
        color: var(--text-light-color);
        font-weight: var(--font-weight-semibold);
        padding-left: 3.8rem;

        & > svg {
            fill: var(--icon-secondary-color);
            transition: var(--transition);
        }

        &:active,
        &:focus,
        &:hover,
        &.button-active {
            background: var(--gray-1);
            color: var(--text-primary-color);

            & > svg {
                fill: var(--icon-tertiary-color);
            }
        }
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
        margin-left: 2.5 * $spacing;
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
