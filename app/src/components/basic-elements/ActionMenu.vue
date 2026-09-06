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
                customWidth="18"
                customHeight="18"
                non-interactive />
        </button>

        <div
            v-if="isOpen"
            ref="list"
            :id="menuID"
            :class="{
                'action-menu-list': true,
                'is-placed': isPlaced
            }"
            :style="listStyle"
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
            isPlaced: false,
            listStyle: null
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

            this.isPlaced = false;
            this.listStyle = null;
            this.isOpen = true;

            // The list is positioned against the viewport, so any scrolling or
            // resizing underneath it would leave it detached from its trigger
            window.addEventListener('resize', this.close);
            document.addEventListener('scroll', this.close, true);

            this.$nextTick(() => {
                this.updatePlacement();

                if (indexToFocus !== null) {
                    this.focusMenuItem(indexToFocus);
                }
            });
        },
        close () {
            window.removeEventListener('resize', this.close);
            document.removeEventListener('scroll', this.close, true);
            this.isOpen = false;
            this.isPlaced = false;
            this.listStyle = null;
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
            let trigger = this.$refs.trigger;
            let list = this.$refs.list;

            if (!trigger || !list) {
                return;
            }

            let gap = 4;
            let margin = 8;
            let triggerRect = trigger.getBoundingClientRect();
            let listRect = list.getBoundingClientRect();
            let viewportWidth = window.innerWidth || document.documentElement.clientWidth;
            let viewportHeight = window.innerHeight || document.documentElement.clientHeight;
            let top = triggerRect.bottom + gap;

            // Flip above the trigger when there is not enough room below it
            if (top + listRect.height > viewportHeight - margin && triggerRect.top - gap - listRect.height >= margin) {
                top = triggerRect.top - gap - listRect.height;
            }

            let left = this.align === 'right'
                ? triggerRect.right - listRect.width
                : triggerRect.left;

            left = Math.max(margin, Math.min(left, viewportWidth - listRect.width - margin));

            this.listStyle = {
                top: Math.round(top) + 'px',
                left: Math.round(left) + 'px'
            };
            this.isPlaced = true;
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
        window.removeEventListener('resize', this.close);
        document.removeEventListener('scroll', this.close, true);
        this.$bus.$off('document-body-clicked', this.close);
    }
};
</script>

<style scoped>
.action-menu {
    display: inline-block;
    position: relative;

    &.is-open {
        z-index: 20;
    }
}


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
        pointer-events: none;
        transform: scale(.9);
        transition: var(--transition-default);
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
    background: var(--popup-bg);
    border: 1px solid var(--border-light-color);
    border-radius: calc(var(--radius-base) * 1.5);
    box-shadow: var(--shadow-md);
    min-width: 16rem;
    padding: var(--space-4) 0 var(--space-3);
    position: fixed;
    visibility: hidden;

    &.is-placed {
        visibility: visible;
    }
}

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
    padding: var(--space-3) var(--space-8);
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
    margin: var(--space-3) 0 var(--space-2) 0;
}

</style>
