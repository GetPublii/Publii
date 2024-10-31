<template>
    <div :class="{
        'button': true,
        'is-green': isGreen,
        'has-icon': hasIcon,
        'has-icon-preview': previewIcon,
        'is-reversed': isReversed,
        'disabled': disabled
    }">
        <span
            class="button-trigger"
            :style="'min-width:' + minWidth + 'px;'"
            @click.stop="doCurrentAction()">
            <icon
                v-if="buttonIcon"
                size="s"
                properties="not-clickable"
                :name="buttonIcon" />

            {{ currentLabel }}
       

        <span
            v-if="previewIcon && currentIcon"
            class="button-trigger-icon">
            <icon
                size="s"
                properties="not-clickable"
                :name="currentIcon" />
        </span>

         </span>

        <span
            class="button-toggle"
            @click.stop="toggleDropdown()">
        </span>

        <div
            v-if="dropdownVisible"
            class="button-dropdown">
            <div
                v-for="(item, index) of filteredItems"
                :key="'button-dropdown-' + index"
                class="button-dropdown-item"
                @click="doAction(item.value)">
                {{ item.label }}

                <div
                    v-if="previewIcon"
                    class="button-dropdown-item-icon">
                    <icon
                        size="s"
                        properties="not-clickable"
                        :name="item.icon" />
                </div>
            </div>
        </div>
    </div>
</template>

<script>
export default {
    name: 'btn-dropdown',
    props: {
        'items': {
            default: '',
            type: Array
        },
        'defaultValue': {
            default: '',
            type: String
        },
        'buttonColor': {
            default: 'blue',
            type: String
        },
        'buttonIcon': {
            default: '',
            type: String
        },
        'minWidth': {
            default: 150,
            type: Number
        },
        'disabled': {
            default: false,
            type: Boolean
        },
        'previewIcon': {
            default: false,
            type: Boolean
        },
        'localStorageKey': {
            default: false,
            type: [String, Boolean]
        },
        'isReversed': {
            default: false,
            type: Boolean
        }
    },
    computed: {
        filteredItems () {
            return this.items.filter(item => item.isVisible());
        },
        currentLabel () {
            let foundedItem = this.items.filter(item => item.value === this.value);

            if (foundedItem.length) {
                if (foundedItem[0].activeLabel) {
                    return foundedItem[0].activeLabel;
                }

                return foundedItem[0].label;
            }

            return '';
        },
        currentIcon () {
            let foundedItem = this.items.filter(item => item.value === this.value);

            if (foundedItem.length && foundedItem[0].icon) {
                return foundedItem[0].icon;
            }

            return false;
        }
    },
    data () {
        return {
            value: '',
            hasIcon: false,
            isGreen: false,
            dropdownVisible: false
        };
    },
    mounted () {
        if (this.localStorageKey) {
            let retrievedValue = localStorage.getItem(this.localStorageKey);
            let values = this.filteredItems.map(item => item.value);

            if (retrievedValue && values.indexOf(retrievedValue) > -1) {
                this.setValue(retrievedValue);
            } else {
                this.setValue(this.defaultValue);
            }
        } else {
            this.setValue(this.defaultValue);
        }

        this.$bus.$on('document-body-clicked', this.hideDropdown);

        if (this.buttonColor === 'green') {
            this.isGreen = true;
        }

        if (this.buttonIcon) {
            this.hasIcon = true;
        }
    },
    methods: {
        doAction (actionName) {
            this.value = actionName;
            this.items.filter(item => item.value === this.value)[0].onClick();

            if (this.localStorageKey) {
                localStorage.setItem(this.localStorageKey, actionName);
            }

            this.hideDropdown();
        },
        doCurrentAction () {
            this.items.filter(item => item.value === this.value)[0].onClick();
        },
        toggleDropdown () {
            this.dropdownVisible = !this.dropdownVisible;
        },
        hideDropdown () {
            this.dropdownVisible = false;
        },
        setValue (newValue) {
            this.value = newValue;
        },
        getValue () {
            return this.value;
        }
    },
    beforeDestroy () {
        this.$bus.$off('document-body-clicked', this.hideDropdown);
    }
}
</script>

<style lang="scss" scoped>
@import '../../scss/variables.scss';

.button {
    background: var(--button-bg);
    border: none;
    border-radius: var(--border-radius);
    box-shadow: none;
    color: var(--white);
    cursor: pointer;
    display: inline-flex;
    font-size: 1.3rem;
    font-weight: var(--font-weight-semibold);
    height: 4.4rem;
    line-height: 4.3rem;
    padding: 0;
    position: relative;
    text-align: left;
    transition: var(--transition);
    user-select: none;
    white-space: nowrap;
    width: auto;

    &-trigger {
        border-radius: var(--border-radius);
        display: block;
        height: 4.4rem;
        left: 0;
        padding-left: 1.3rem;
        padding-right: 6rem;
        position: relative;
        text-align: left;
        top: 0;
        transition: var(--transition);

        &:hover {
            background: var(--button-bg-hover);
        }

        &-icon {
            align-items: center;
            display: flex;
            height: inherit;
            justify-content: center;
            position: absolute;
            top: 0;
            right: 4.4rem;
            width: 4.2rem;

            .icon {
                color: var(--white)
            }
        }
    }

    &-toggle {
        background: var(--button-bg-hover);
        border-left: 1px solid var(--button-bg);
        border-radius: 0 var(--border-radius) var(--border-radius) 0;
        cursor: pointer;
        height: 100%;
        position: absolute;
        right: 0;
        top: 0;
        transition: var(--transition);
        width: 4.4rem;

        &::before {
            content: "";
            border-radius: 0 var(--border-radius) var(--border-radius) 0;
            pointer-events: none;
            height: 100%;
            left: 0;
            position: absolute;
            transition: var(--transition);
            width: 100%;
        }

        &::after {
            border-color: var(--white) transparent transparent;
            border-style: solid;
            border-width: 5px;
            content: "";
            pointer-events: none;
            left: 50%;
            position: absolute;
            top: 50%;
            transform: translateX(-50%) translateY(-2.5px);
        }

        &:hover {
            background: var(--button-bg-hover);

            &::before {
               background: rgba(black, .1);
            }
        }
    }

    &-dropdown {
        background: var(--bg-secondary);
        border-radius: var(--border-radius) var(--border-radius);
        box-shadow: var(--box-shadow-medium);
        overflow: hidden;
        position: absolute;
        right: 0;
        text-align: left;
        top: 5.3rem;
        min-width: 100%;
        z-index: 10;

        &-item {
            border-top: 1px solid var(--border-light-color);
            color: var(--text-primary-color);
            padding: .2rem 2rem;
            position: relative;
            text-align: left;
            transition: var(--transition);

            &:hover {
                background: var(--gray-1);

                .button-dropdown-item-icon .icon {
                    color: var(--icon-tertiary-color);
                }
            }

            &:first-child {
                border-top: none;
            }

            &-icon {
                align-items: center;
                bottom: 0;
                display: flex;
                justify-content: center;
                position: absolute;
                right: 0;
                top: 0;
                width: 4.4rem;

                .icon {
                    color: var(--icon-secondary-color);
                    transition: var(--transition);
                }
            }
        }
    }

    &.has-icon {
        .button-trigger {
            padding-left: 4.3rem;

            & > svg {
                display: inline-block;
                fill: var(--white);
                left: 1.4rem;
                position: absolute;
                top: 50%;
                transform: translateY(-50%);
            }
        }
    }

    &.is-green {
        background-color: var(--button-tertiary-bg);

        .button-trigger {
            &:hover {
                background: var(--button-tertiary-bg-hover);
            }
        }

        .button-toggle {
            background: var(--button-tertiary-bg-hover);
            border-left: 1px solid var(--button-tertiary-bg);

            &:hover {
                background: var(--button-tertiary-bg-hover);

                &::before {
                    background: rgba(black, .1);
                }
            }
        }

        &.disabled {
            background-color: var(--popup-btn-cancel-bg-hover);
            color: var(--popup-btn-cancel-color);
            cursor: not-allowed;
            pointer-events: none;

            &:hover {
                background-color: var(--popup-btn-cancel-bg-hover);
                color: var(--popup-btn-cancel-color);
            }

            .button-toggle {
                background: var(--popup-btn-cancel-bg-hover);
                border-left: 1px solid var(--popup-btn-cancel-bg-hover);

                &:hover {
                    background-color: var(--popup-btn-cancel-bg-hover);
                    color: var(--popup-btn-cancel-color);
                }
            }

            .button-trigger-icon {
                background: var(--popup-btn-cancel-bg-hover);
            }
        }
    }

    &.has-icon-preview {
        .button-trigger {
            padding-right: 8.4rem;
        }

        .button-dropdown-item {
            padding: .2rem 4rem .2rem 2rem;
        }
    }

    &.is-reversed {
        .button-toggle::after {
            border-color: transparent transparent var(--white);
            transform: translateX(-50%) translateY(-8px);
        }

        .button-dropdown {
            border-radius: var(--border-radius);
            bottom: 5.3rem;
            box-shadow: 0 -1px 5px rgba(0, 0, 0, 0.125);
            top: unset;
        }
    }
}
</style>