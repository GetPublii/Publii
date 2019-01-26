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

        <slot v-if="!isPreloader">
            Button
        </slot>

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
                'button-success': types.indexOf('success') > -1,
                'button-danger': types.indexOf('danger') > -1,
                'button-error': types.indexOf('error') > -1,
                'button-outline': types.indexOf('outline') > -1,
                'button-muted': types.indexOf('muted') > -1,
                'button-cancel-popup': types.indexOf('cancel-popup') > -1,
                'button-icon': types.indexOf('icon') > -1,
                'button-bottom': types.indexOf('bottom') > -1,
                'button-medium': types.indexOf('medium') > -1,
                'button-small': types.indexOf('small') > -1,
                'button-full-width': types.indexOf('full-width') > -1,
                'button-half-width': types.indexOf('half-width') > -1,
                'button-no-border-radius': types.indexOf('no-border-radius') > -1,
                'button-disabled': types.indexOf('disabled') > -1 || this.disabled,
                'button-disabled-with-events': types.indexOf('disabled-with-events') > -1,
                'button-preloader': this.isPreloader
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
    background: $color-1;
    border: none;
    border-radius: 3px;
    box-shadow: none;
    color: $color-10;
    cursor: pointer;
    display: inline-block;
    font: {
        size: 1.5rem;
        family: $secondary-font;
        weight: 500;
    }
    height: 4.2rem;
    line-height: 4.1rem;
    padding: 0 1.3rem;
    position: relative;
    transition: all .25s ease-out;
    user-select: none;
    white-space: nowrap;

    &:focus {
        outline: none;
    }

    &:active,
    &:focus,
    &:hover {
        background: lighten($color-1, 10%);
        color: $color-10;
    }

    &-link {
        background: $color-10;
        color: $color-1;

        &:active,
        &:focus,
        &:hover {
            background: $color-9;
            color: $color-1;
        }
    }

    &-primary,
    &-success {
        background: $color-2;

        &:active,
        &:focus,
        &:hover {
            background: lighten($color-2, 10%);
            color: $color-10;
        }
    }

    &-cancel-popup {
        background: $color-10;
        border: none;
        border-top: 1px solid $color-8;
        color: $color-6;

        &:active,
        &:focus,
        &:hover {
            background: $color-9;
            color: $color-6;
        }
    }

    &-danger,
    &-error {
        background: $color-3;

        &:active,
        &:focus,
        &:hover {
            background: lighten($color-3, 10%);
            color: $color-10;
        }
    }

    &-muted {
        background: $color-7;

        &:active,
        &:focus,
        &:hover {
            background: $color-1;
            color: $color-10;
        }
    }

    &-outline {
        background: transparent;
        box-shadow: inset 0 0 0 2px $color-8;
        color: $color-5;

        &:active,
        &:focus,
        &:hover {
            background: transparent;
            box-shadow: inset 0 0 0 2px darken($color-8, 20%);
            color: $color-5;

            &:disabled {
                box-shadow: inset 0 0 0 2px $color-8;
            }
        }
    }

    & > svg {
        display: inline-block;
        fill: $color-10;
        left: 1.8rem;
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
    }

    &-bottom {
        background: $color-2;
        border-radius: 0 0 3px 3px;
        display: block;
        height: 5.6rem;
        line-height: 5.6rem;
        padding: 0 2rem;
        text-align: center;
        width: 100%;

        &:active,
        &:focus,
        &:hover {
            background: $color-5;
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
            box-shadow: inset 0 0 0 2px $color-8;
            color: $color-5;

            &:active,
            &:focus,
            &:hover {
                background: transparent;
                box-shadow: inset 0 0 0 2px darken($color-8, 20%);
                color: $color-5;

                &:disabled {
                    box-shadow: inset 0 0 0 2px $color-8;
                }
            }
        }
    }

    &-medium {
        font-weight: 500;
        height: 5.6rem;
        line-height: 5.5rem;
        padding: 0 2rem;
    }

    &-small {
        font-size: 1.4rem;
        font-weight: 400;
        height: 3.8rem;
        line-height: 3.9rem;
        padding: 0 1.4rem;
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
            left: 1.4rem;
        }

        &.button-small {
            padding-left: 4.2rem;

            & > svg {
                height: 16px;
                width: 16px;
            }
        }

        &.button-outline {
            & > svg {
                fill: $color-7;
            }
        }
    }

    &-preloader {
        .preloader {
            animation: rotate .6s infinite linear;
            border: .2rem solid $color-8;
            border-top: .2rem solid $color-7;
            border-radius: 50%;
            clear: both;
            display: block;
            height: 2rem;
            margin: 1.4rem auto;
            width: 2rem;

            &-white {
                border-color: rgba(255, 255, 255, .5);
                border-top-color: rgba(255, 255, 255, 1);
            }
        }

        &.button-small {
            .preloader {
                margin-top: 1rem;
            }
        }
    }

    &.button-disabled,
    &.button-disabled-with-events {
        background-color: $color-9;
        border-color: $color-8;
        color: $color-7;
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
