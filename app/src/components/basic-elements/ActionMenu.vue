<template>
    <div
        :class="{
            'action-menu': true,
            'is-open': isOpen,
            'is-small': size === 'small'
        }"
        @focusout="handleFocusOut">
        <button
            ref="trigger"
            type="button"
            class="action-menu-trigger"
            aria-haspopup="menu"
            :aria-expanded="isOpen ? 'true' : 'false'"
            :aria-controls="isOpen ? menuID : null"
            :aria-label="triggerLabel"
            :title="triggerLabel"
            :disabled="disabled"
            @click.stop="toggle($event)"
            @keydown="handleTriggerKeydown">
            <icon
                :name="icon"
                size="xs"
                non-interactive />
        </button>

        <div
            v-if="isOpen"
            ref="list"
            :id="menuID"
            :class="{
                'action-menu-list': true,
                'is-left': align === 'left',
                'is-right': align === 'right',
                'opens-up': opensUp
            }"
            role="menu"
            @keydown="handleMenuKeydown">
            <template v-for="(item, index) in visibleItems">
                <div
                    v-if="item.separator"
                    :key="'action-menu-separator-' + index"
                    class="action-menu-separator"
                    role="separator"></div>

                <button
                    v-else
                    :key="'action-menu-item-' + index"
                    type="button"
                    :class="{
                        'action-menu-item': true,
                        'is-danger': item.intent === 'danger'
                    }"
                    role="menuitem"
                    tabindex="-1"
                    :disabled="item.disabled === true"
                    @click.stop="select(item, $event)">
                    <icon
                        v-if="item.icon"
                        :name="item.icon"
                        size="xs"
                        non-interactive />

                    <span class="action-menu-item-label">
                        {{ item.label }}
                    </span>
                </button>
            </template>
        </div>
    </div>
</template>

<script>
export default {
    name: 'action-menu',
    props: {
        items: {
            required: true,
            type: Array
        },
        label: {
            default: '',
            type: String
        },
        icon: {
            default: 'more',
            type: String
        },
        size: {
            default: 'default',
            type: String,
            validator: value => ['default', 'small'].includes(value)
        },
        align: {
            default: 'right',
            type: String,
            validator: value => ['left', 'right'].includes(value)
        },
        disabled: {
            default: false,
            type: Boolean
        }
    },
    data () {
        return {
            isOpen: false,
            opensUp: false
        };
    },
    computed: {
        menuID () {
            return 'action-menu-' + this._uid;
        },
        triggerLabel () {
            return this.label || this.$t('ui.otherOptions');
        },
        visibleItems () {
            return this.items.filter(item => {
                if (typeof item.visible === 'function') {
                    return item.visible();
                }

                return item.visible !== false;
            });
        }
    },
    mounted () {
        this.$bus.$on('document-body-clicked', this.close);
    },
    methods: {
        toggle (event = null) {
            if (this.isOpen) {
                this.close();
                return;
            }

            this.open(this.isKeyboardClick(event) ? 0 : null);
        },
        open (indexToFocus = null) {
            // Close every other open menu before showing this one
            this.$bus.$off('document-body-clicked', this.close);
            this.$bus.$emit('document-body-clicked');
            this.$bus.$on('document-body-clicked', this.close);

            this.opensUp = false;
            this.isOpen = true;

            this.$nextTick(() => {
                this.updatePlacement();

                if (indexToFocus !== null) {
                    this.focusMenuItem(indexToFocus);
                }
            });
        },
        close () {
            this.isOpen = false;
        },
        closeFromKeyboard () {
            if (!this.isOpen) {
                return;
            }

            this.close();
            this.focusTrigger();
        },
        select (item, event = null) {
            if (item.disabled === true) {
                return;
            }

            if (typeof item.onClick === 'function') {
                item.onClick();
            }

            this.$emit('select', item.value);
            this.close();

            if (this.isKeyboardClick(event)) {
                this.focusTrigger();
            }
        },
        updatePlacement () {
            let list = this.$refs.list;

            if (!list) {
                return;
            }

            let rect = list.getBoundingClientRect();
            let viewportHeight = window.innerHeight || document.documentElement.clientHeight;
            this.opensUp = rect.bottom > viewportHeight && rect.height < rect.top;
        },
        isKeyboardClick (event) {
            // Clicks synthesized from Enter or Space report detail === 0
            return !!event && event.detail === 0;
        },
        getMenuItems () {
            return Array.from(this.$el.querySelectorAll('.action-menu-item:not(:disabled)'));
        },
        focusTrigger () {
            this.$nextTick(() => {
                if (this.$refs.trigger) {
                    this.$refs.trigger.focus();
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
                this.open(0);
            } else if (event.key === 'ArrowUp') {
                event.preventDefault();
                this.open(-1);
            } else if (event.key === 'Escape') {
                this.closeFromKeyboard();
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
                event.stopPropagation();
                this.closeFromKeyboard();
            } else if (event.key === 'Tab') {
                this.close();
            }
        },
        handleFocusOut (event) {
            if (!this.isOpen) {
                return;
            }

            if (event.relatedTarget && this.$el.contains(event.relatedTarget)) {
                return;
            }

            this.close();
        }
    },
    beforeDestroy () {
        this.$bus.$off('document-body-clicked', this.close);
    }
};
</script>

<style scoped>
.action-menu {
    display: inline-block;
    position: relative;

    /* Lift the open menu above sibling rows and their invisible drop zones
       (MenuItem.vue keeps its empty-list drop zones at z-index 10). */
    &.is-open {
        z-index: 20;
    }
}

/* Round icon button, same recipe as the row actions on the sites list:
   white disc, muted icon that darkens and grows on hover */
.action-menu-trigger {
    align-items: center;
    appearance: none;
    background: var(--bg-primary);
    border: none;
    border-radius: 50%;
    cursor: pointer;
    display: inline-flex;
    height: 3rem;
    justify-content: center;
    margin: 0;
    padding: 0;
    width: 3rem;

    & > svg {
        fill: var(--icon-secondary-color);
        height: 16px;
        pointer-events: none;
        transform: scale(.9);
        transition: var(--transition-default);
        width: 16px;
    }

    &:hover > svg,
    &:focus-visible > svg {
        fill: var(--icon-tertiary-color);
        transform: scale(1);
    }

    &:focus-visible {
        outline: 2px solid var(--input-border-focus);
        outline-offset: 2px;
    }

    &:disabled {
        cursor: not-allowed;
        opacity: .5;
    }
}

.action-menu.is-open .action-menu-trigger > svg {
    fill: var(--icon-tertiary-color);
    transform: scale(1);
}

.action-menu.is-small .action-menu-trigger {
    height: 2.8rem;
    width: 2.8rem;
}

.action-menu-list {
    /* Same rounding and elevation as the application menu in the top bar */
    background: var(--popup-bg);
    border-radius: var(--radius-base);
    box-shadow: var(--shadow-md);
    min-width: 16rem;
    padding: var(--space-3) 0;
    position: absolute;
    top: calc(100% + var(--space-1));

    &.is-right {
        right: 0;
    }

    &.is-left {
        left: 0;
    }

    &.opens-up {
        bottom: calc(100% + var(--space-1));
        top: auto;
    }
}

/* Item colours follow the bulk-actions dropdown on the Posts and Pages lists */
.action-menu-item {
    align-items: center;
    appearance: none;
    background: transparent;
    border: none;
    color: var(--text-light-color);
    cursor: pointer;
    display: flex;
    font-family: var(--font-family-sans);
    font-size: var(--font-size-ui-sm);
    font-weight: var(--font-weight-regular);
    gap: var(--space-3);
    line-height: var(--line-height-base);
    margin: 0;
    padding: var(--space-2) var(--space-6);
    text-align: left;
    white-space: nowrap;
    width: 100%;

    & > svg {
        color: currentColor;
        fill: currentColor;
        flex-shrink: 0;
        height: 16px;
        pointer-events: none;
        width: 16px;
    }

    &:hover,
    &:focus-visible {
        background: var(--color-surface-subtle);
        color: var(--text-primary-color);
        outline: none;
    }

    &.is-danger {
        color: var(--color-danger);

        &:hover,
        &:focus-visible {
            color: var(--color-danger);
        }
    }

    &:disabled {
        cursor: not-allowed;
        opacity: .5;
    }
}

.action-menu-separator {
    border-top: 1px solid var(--border-light-color);
    margin: var(--space-2) 0;
}

</style>
