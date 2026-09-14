<template>
    <div
        :class="{
            'button': true,
            'is-primary': intent === 'primary',
            'has-icon': Boolean(buttonIcon),
            'has-icon-preview': previewIcon,
            'is-reversed': isReversed,
            'disabled': disabled
        }"
        @focusout="handleFocusOut">
        <button
            ref="trigger"
            type="button"
            class="button-trigger"
            :style="'min-width:' + minWidth + 'px;'"
            :disabled="disabled"
            @click.stop="doCurrentAction()"
            @keydown="handleTriggerKeydown">
            <icon
                v-if="buttonIcon"
                size="s"
                non-interactive
                :name="buttonIcon" />

            {{ currentLabel }}

            <span
                v-if="previewIcon && currentIcon"
                class="button-trigger-icon">
                <icon
                    size="s"
                    non-interactive
                    :name="currentIcon" />
            </span>
        </button>

        <button
            ref="toggle"
            type="button"
            class="button-toggle"
            aria-haspopup="menu"
            :aria-expanded="dropdownVisible ? 'true' : 'false'"
            :aria-controls="dropdownVisible ? menuID : null"
            :aria-label="$t('ui.otherOptions')"
            :disabled="disabled"
            @click.stop="toggleDropdown($event)"
            @keydown="handleToggleKeydown">
        </button>

        <div
            v-if="dropdownVisible"
            :id="menuID"
            class="button-dropdown"
            role="menu"
            @keydown="handleMenuKeydown">
            <button
                v-for="(item, index) of filteredItems"
                :key="'button-dropdown-' + index"
                type="button"
                class="button-dropdown-item"
                role="menuitem"
                tabindex="-1"
                @click="doAction(item.value, $event)">
                {{ item.label }}

                <span
                    v-if="previewIcon"
                    class="button-dropdown-item-icon">
                    <icon
                        size="s"
                        non-interactive
                        :name="item.icon" />
                </span>
            </button>
        </div>
    </div>
</template>

<script>
export default {
    name: 'btn-dropdown',
    props: {
        'items': {
            default: () => [],
            type: Array
        },
        'defaultValue': {
            default: '',
            type: String
        },
        'intent': {
            default: 'default',
            type: String,
            validator: value => ['default', 'primary'].includes(value)
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
    data () {
        return {
            value: '',
            dropdownVisible: false
        };
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
        },
        menuID () {
            return 'btn-dropdown-menu-' + this._uid;
        }
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

    },
    methods: {
        doAction (actionName, event = null) {
            this.value = actionName;
            this.items.filter(item => item.value === this.value)[0].onClick();

            if (this.localStorageKey) {
                localStorage.setItem(this.localStorageKey, actionName);
            }

            this.hideDropdown();

            if (this.isKeyboardClick(event)) {
                this.focusElement('trigger');
            }
        },
        doCurrentAction () {
            this.items.filter(item => item.value === this.value)[0].onClick();
        },
        toggleDropdown (event = null) {
            this.dropdownVisible = !this.dropdownVisible;

            if (this.dropdownVisible && this.isKeyboardClick(event)) {
                this.focusMenuItem(0);
            }
        },
        openDropdown (indexToFocus) {
            this.dropdownVisible = true;
            this.focusMenuItem(indexToFocus);
        },
        hideDropdown () {
            this.dropdownVisible = false;
        },
        closeDropdownFromKeyboard () {
            if (!this.dropdownVisible) {
                return;
            }

            this.hideDropdown();
            this.focusElement('toggle');
        },
        isKeyboardClick (event) {
            // Clicks synthesized from Enter or Space report detail === 0
            return !!event && event.detail === 0;
        },
        getMenuItems () {
            return Array.from(this.$el.querySelectorAll('.button-dropdown-item'));
        },
        focusElement (refName) {
            this.$nextTick(() => {
                if (this.$refs[refName]) {
                    this.$refs[refName].focus();
                }
            });
        },
        focusMenuItem (index) {
            this.$nextTick(() => {
                let menuItems = this.getMenuItems();

                if (!menuItems.length) {
                    return;
                }

                let normalizedIndex = ((index % menuItems.length) + menuItems.length) % menuItems.length;
                menuItems[normalizedIndex].focus();
            });
        },
        handleTriggerKeydown (event) {
            if (event.key === 'ArrowDown') {
                event.preventDefault();
                this.openDropdown(0);
            }
        },
        handleToggleKeydown (event) {
            if (event.key === 'ArrowDown') {
                event.preventDefault();
                this.openDropdown(0);
            } else if (event.key === 'ArrowUp') {
                event.preventDefault();
                this.openDropdown(-1);
            } else if (event.key === 'Escape') {
                this.closeDropdownFromKeyboard();
            }
        },
        handleMenuKeydown (event) {
            let currentIndex = this.getMenuItems().indexOf(document.activeElement);

            if (event.key === 'ArrowDown') {
                event.preventDefault();
                this.focusMenuItem(currentIndex + 1);
            } else if (event.key === 'ArrowUp') {
                event.preventDefault();
                this.focusMenuItem(currentIndex - 1);
            } else if (event.key === 'Home') {
                event.preventDefault();
                this.focusMenuItem(0);
            } else if (event.key === 'End') {
                event.preventDefault();
                this.focusMenuItem(-1);
            } else if (event.key === 'Escape') {
                event.preventDefault();
                this.closeDropdownFromKeyboard();
            } else if (event.key === 'Tab') {
                this.hideDropdown();
            }
        },
        handleFocusOut (event) {
            if (!this.dropdownVisible) {
                return;
            }

            if (event.relatedTarget && this.$el.contains(event.relatedTarget)) {
                return;
            }

            this.hideDropdown();
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

<style scoped>

.button {
    background: var(--button-primary-bg);
    border: none;
    border-radius: var(--radius-base);
    box-shadow: none;
    color: var(--white);
    cursor: pointer;
    display: inline-flex;
    font-size: var(--font-size-ui-sm);
    font-weight: var(--font-weight-medium);
    height: var(--button-height);
    line-height: var(--line-height-base);
    padding: 0;
    position: relative;
    text-align: left;
    transition: var(--transition-default);
    transition-property: background-color, border-color, box-shadow, color, fill, opacity;
    user-select: none;
    white-space: nowrap;
    width: auto;

    &.has-icon {
        .button-trigger {
            padding-left: calc(var(--button-padding-inline) + var(--button-icon-size) + var(--button-icon-gap));

            & > svg {
                display: inline-block;
                fill: var(--white);
                height: var(--button-icon-size);
                left: var(--button-padding-inline);
                width: var(--button-icon-size);
                position: absolute;
                top: 50%;
                transform: translateY(-50%);
            }
        }
    }

    &.is-primary {
        background-color: var(--button-primary-bg);

        .button-trigger {
            &:focus-visible,
            &:hover {
                background: var(--button-primary-bg-hover);
            }
        }

        .button-toggle {
            background: var(--button-primary-bg-hover);
            border-left: 1px solid var(--button-primary-bg);

            &:focus-visible,
            &:hover {
                background: var(--button-primary-bg-hover);

                &::before {
                    background: oklch(from var(--black) l c h / 10%);
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
            padding-right: calc(2 * var(--button-height));
        }

        .button-dropdown-item {
            padding-right: var(--button-height);
        }
    }

    &.is-reversed {
        .button-toggle::after {
            border-color: transparent transparent var(--white);
            transform: translateX(-50%) translateY(-8px);
        }

        .button-dropdown {
            border-radius: var(--radius-base);
            bottom: calc(100% + .9rem);
            box-shadow: 0 -1px 5px oklch(from var(--black) l c h / 12.5%);
            top: unset;
        }
    }
}

/* Native <button> parts: inherit like the former span and div parts and ignore
   global element rules such as vendor `.buttons button` margins. */
.button-trigger,
.button-toggle,
.button-dropdown-item {
    appearance: none;
    background: transparent;
    border: 0;
    color: inherit;
    cursor: inherit;
    font: inherit;
    letter-spacing: inherit;
    margin: 0;
    padding: 0;
    text-align: inherit;
    text-indent: inherit;
    text-shadow: inherit;
    text-transform: inherit;
    white-space: inherit;
    word-spacing: inherit;
}

.button-trigger:focus-visible,
.button-toggle:focus-visible {
    outline: 2px solid var(--input-border-focus);
    outline-offset: 2px;
}

.button-trigger {
    border-radius: var(--radius-base);
    display: block;
    height: var(--button-height);
    left: 0;
    padding-left: var(--button-padding-inline);
    padding-right: calc(var(--button-height) + var(--button-padding-inline));
    position: relative;
    text-align: left;
    top: 0;
    transition: var(--transition-default);
    transition-property: background-color, border-color, box-shadow, color, fill, opacity;

    &:focus-visible,
    &:hover {
        background: var(--button-primary-bg-hover);
    }
}

.button-trigger-icon {
    align-items: center;
    display: flex;
    height: inherit;
    justify-content: center;
    position: absolute;
    top: 0;
    right: var(--button-height);
    width: var(--button-height);

    .icon {
        color: var(--white)
    }
}

.button-toggle {
    background: var(--button-primary-bg-hover);
    border-left: 1px solid var(--button-primary-bg);
    border-radius: 0 var(--radius-base) var(--radius-base) 0;
    cursor: pointer;
    height: 100%;
    position: absolute;
    right: 0;
    top: 0;
    transition: var(--transition-default);
    transition-property: background-color, border-color, box-shadow, color, fill, opacity;
    width: var(--button-height);

    &::before {
        content: "";
        border-radius: 0 var(--radius-base) var(--radius-base) 0;
        pointer-events: none;
        height: 100%;
        left: 0;
        position: absolute;
        top: 0;
        transition: var(--transition-default);
        transition-property: background-color, border-color, box-shadow, color, fill, opacity;
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

    &:focus-visible,
    &:hover {
        background: var(--button-primary-bg-hover);

        &::before {
           background: oklch(from var(--black) l c h / 10%);
        }
    }
}

.button-dropdown {
    background: var(--bg-secondary);
    border-radius: var(--radius-base) var(--radius-base);
    box-shadow: var(--shadow-md);
    overflow: hidden;
    position: absolute;
    right: 0;
    text-align: left;
    top: calc(100% + .9rem);
    min-width: 100%;
    z-index: 10;
}

.button-dropdown-item {
    align-items: center;
    border-top: 1px solid var(--border-light-color);
    color: var(--text-primary-color);
    display: flex;
    min-height: var(--button-height);
    padding: .6rem var(--button-padding-inline-large);
    position: relative;
    text-align: left;
    transition: var(--transition-default);
    transition-property: background-color, border-color, box-shadow, color, fill, opacity;
    width: 100%;

    &:focus-visible,
    &:hover {
        background: var(--color-surface-subtle);

        .button-dropdown-item-icon .icon {
            color: var(--icon-tertiary-color);
        }
    }

    &:focus-visible {
        outline: 2px solid var(--input-border-focus);
        outline-offset: -2px;
    }

    &:first-child {
        border-top: none;
    }
}

.button-dropdown-item-icon {
    align-items: center;
    bottom: 0;
    display: flex;
    justify-content: center;
    position: absolute;
    right: 0;
    top: 0;
    width: var(--button-height);

    .icon {
        color: var(--icon-secondary-color);
        transition: var(--transition-default);
        transition-property: background-color, border-color, box-shadow, color, fill, opacity;
    }
}
</style>
