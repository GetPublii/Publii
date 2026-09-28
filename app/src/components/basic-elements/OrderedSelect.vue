<template>
    <v-select
        ref="dropdown"
        v-bind="$attrs"
        :value="value"
        :multiple="multiple"
        :custom-label="customLabel"
        :class="{ 'ordered-select': multiple, 'is-reordering': dragging }"
        v-on="$listeners">
        <template
            v-if="multiple"
            slot="tag"
            slot-scope="{ option, remove }">
            <span
                :key="option"
                :data-option-key="optionKey(option)"
                class="multiselect__tag ordered-select__tag">
                <action-menu
                    v-if="canReorder"
                    size="small"
                    align="left"
                    :label="$t('contentSelect.reorder', { name: label(option) })"
                    :items="moveActions(option)">
                    <template slot="trigger" slot-scope="menu">
                        <button
                            v-bind="menu.attrs"
                            type="button"
                            class="ordered-select__handle"
                            @click.stop="menu.toggle"
                            @keydown="handleKeydown(option, $event, menu.keydown)">
                            <icon name="more" size="xs" non-interactive aria-hidden="true" />
                        </button>
                    </template>
                </action-menu>

                <span class="ordered-select__label">
                    {{ label(option) }}
                </span>

                <button
                    type="button"
                    class="ordered-select__remove"
                    :aria-label="$t('contentSelect.remove', { name: label(option) })"
                    @click.stop.prevent="removeOption(option, remove)">
                    <icon name="close" size="xs" non-interactive aria-hidden="true" />
                </button>
            </span>
        </template>

        <span
            v-if="multiple"
            slot="clear"
            class="ordered-select__announcement"
            role="status"
            aria-live="polite"
            aria-atomic="true">
            {{ announcement }}
        </span>
    </v-select>
</template>

<script>
import ActionMenu from './ActionMenu.vue';
import Sortable from 'sortablejs';

export default {
    name: 'ordered-select',
    inheritAttrs: false,
    components: {
        ActionMenu
    },
    props: {
        value: {},
        multiple: {
            type: Boolean,
            default: false
        },
        customLabel: {
            type: Function,
            required: true
        }
    },
    data () {
        return {
            dragging: false,
            announcement: ''
        };
    },
    computed: {
        selectedOptions () {
            return Array.isArray(this.value) ? this.value : [];
        },
        canReorder () {
            return this.multiple && this.selectedOptions.length > 1;
        }
    },
    watch: {
        multiple () {
            this.$nextTick(this.setupSorting);
        },
        canReorder (enabled) {
            if (this._sortable) {
                this._sortable.option('disabled', !enabled);
            }
        }
    },
    mounted () {
        this._motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
        this._motionPreference.addEventListener('change', this.updateMotionPreference);
        this.setupSorting();
    },
    beforeDestroy () {
        if (this._motionPreference) {
            this._motionPreference.removeEventListener('change', this.updateMotionPreference);
        }

        this.destroySorting();
    },
    methods: {
        label (option) {
            return this.customLabel(option) || this.$t('contentSelect.unavailable', { id: option });
        },
        deactivate () {
            this.$refs.dropdown.deactivate();
        },
        moveActions (option) {
            const index = this.selectedOptions.indexOf(option);

            return [
                {
                    label: this.$t('contentSelect.moveEarlier'),
                    disabled: index <= 0,
                    onClick: () => this.moveOption(option, index - 1)
                },
                {
                    label: this.$t('contentSelect.moveLater'),
                    disabled: index === this.selectedOptions.length - 1,
                    onClick: () => this.moveOption(option, index + 1)
                }
            ];
        },
        moveOption (option, destination, restoreFocus = true) {
            const index = this.selectedOptions.indexOf(option);

            if (!this.canReorder || index < 0 || destination < 0 ||
                destination >= this.selectedOptions.length || index === destination) {
                return;
            }

            const reordered = this.selectedOptions.slice();
            reordered.splice(index, 1);
            reordered.splice(destination, 0, option);
            this.$emit('input', reordered);
            this.announcement = this.$t('contentSelect.position', {
                name: this.label(option),
                position: destination + 1,
                total: reordered.length
            });

            if (restoreFocus) {
                this.focusOption(destination);
            }
        },
        focusOption (index) {
            this.$nextTick(() => {
                const controls = this.$el.querySelectorAll(
                    this.canReorder ? '.ordered-select__handle' : '.ordered-select__remove'
                );
                const target = controls[Math.min(index, controls.length - 1)] || this.$refs.dropdown.$refs.search;

                if (target) {
                    target.focus({ preventScroll: true });
                }
            });
        },
        handleKeydown (option, event, menuKeydown) {
            const index = this.selectedOptions.indexOf(option);
            const destinations = {
                ArrowLeft: index - 1,
                ArrowRight: index + 1,
                Home: 0,
                End: this.selectedOptions.length - 1
            };

            if (!event.altKey && !event.ctrlKey && !event.metaKey &&
                Object.prototype.hasOwnProperty.call(destinations, event.key)) {
                event.preventDefault();
                event.stopPropagation();
                this.moveOption(option, destinations[event.key]);
                return;
            }

            menuKeydown(event);
        },
        removeOption (option, remove) {
            const index = this.selectedOptions.indexOf(option);
            remove(option);
            this.focusOption(index);
        },
        optionKey (option) {
            return typeof option + ':' + String(option);
        },
        setupSorting () {
            this.destroySorting();

            if (!this.multiple) {
                return;
            }

            const container = this.$el.querySelector('.multiselect__tags-wrap');
            this._sortable = Sortable.create(container, {
                group: {
                    name: 'ordered-select-' + this._uid,
                    pull: false,
                    put: false
                },
                draggable: '.ordered-select__tag',
                handle: '.ordered-select__handle',
                direction: 'horizontal',
                animation: this._motionPreference.matches ? 0 : 150,
                forceFallback: true,
                fallbackOnBody: true,
                fallbackTolerance: 3,
                chosenClass: 'ordered-select__chosen',
                ghostClass: 'ordered-select__ghost',
                dragClass: 'ordered-select__drag',
                fallbackClass: 'ordered-select__drag',
                disabled: !this.canReorder,
                onStart: this.startDrag,
                onEnd: this.finishDrag
            });
        },
        updateMotionPreference () {
            if (this._sortable) {
                this._sortable.option('animation', this._motionPreference.matches ? 0 : 150);
            }
        },
        destroySorting () {
            const sortable = this._sortable;
            this._sortable = null;
            this.dragging = false;
            this._dragSelection = null;

            if (sortable) {
                sortable.destroy();
            }
        },
        startDrag () {
            this.deactivate();
            this._dragSelection = this.selectedOptions.slice();
            this.dragging = true;
        },
        restoreSelectionOrder (container) {
            const elements = new Map(Array.from(container.children).map(element => [
                element.getAttribute('data-option-key'),
                element
            ]));

            for (const option of this.selectedOptions) {
                const element = elements.get(this.optionKey(option));

                if (element) {
                    container.appendChild(element);
                }
            }
        },
        finishDrag (event) {
            if (!this._sortable) {
                return;
            }

            const previous = this._dragSelection;
            this._dragSelection = null;
            this.dragging = false;

            // Sortable moves DOM nodes during the preview. Restore the order
            // Vue expects before updating the value, as vuedraggable does.
            this.restoreSelectionOrder(event.from);

            if (!previous || previous.length !== this.selectedOptions.length ||
                previous.some((option, index) => option !== this.selectedOptions[index]) ||
                event.from !== event.to || !Number.isInteger(event.oldDraggableIndex) ||
                !Number.isInteger(event.newDraggableIndex)) {
                return;
            }

            this.moveOption(previous[event.oldDraggableIndex], event.newDraggableIndex, false);
        }
    }
};
</script>

<style>
.ordered-select .multiselect__tags {
    padding-bottom: var(--space-2);
}

.multiselect__tag.ordered-select__tag {
    align-items: center;
    display: inline-flex;
    font-style: normal;
    gap: var(--space-1);
    max-width: 100%;
    overflow: visible;
    padding: var(--space-1);
    position: relative;

    &.ordered-select__chosen {
        opacity: .75;
    }

    &.ordered-select__drag {
        box-shadow: var(--shadow-md);
    }

    &.ordered-select__ghost {
        background: oklch(from var(--color-primary) l c h / 5%);
        opacity: 1;

        &::before {
            border: 1px dashed var(--input-border-focus);
            border-radius: var(--radius-base);
            content: '';
            inset: 0;
            pointer-events: none;
            position: absolute;
        }

        > * {
            visibility: hidden;
        }
    }

    > .ordered-select__label {
        height: auto;
        line-height: var(--line-height-base);
        min-width: 0;
        overflow: hidden;
        padding-left: var(--space-1);
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    > .action-menu {
        display: flex;
        flex-shrink: 0;
    }
}

.ordered-select__tag .ordered-select__handle,
.ordered-select__tag .ordered-select__remove {
    align-items: center;
    background: transparent;
    border: 0;
    border-radius: calc(var(--radius-base) / 2);
    color: var(--text-light-color);
    cursor: pointer;
    display: inline-flex;
    flex-shrink: 0;
    height: 28px;
    justify-content: center;
    margin: 0;
    padding: 0;
    transition: var(--transition-default);
    transition-property: background-color, color;
    width: 28px;

    .icon {
        color: currentColor;
        fill: currentColor;
    }

    &:hover,
    &:focus-visible,
    &[aria-expanded="true"] {
        background: var(--input-bg-light);
        color: var(--text-primary-color);
    }

    &:focus-visible {
        outline: 2px solid var(--input-border-focus);
        outline-offset: 1px;
    }
}

.ordered-select__tag .ordered-select__remove {
    &:hover,
    &:focus-visible {
        color: var(--color-danger);
    }
}

.ordered-select__tag .ordered-select__handle {
    cursor: grab;

    &:active {
        cursor: grabbing;
    }
}

.ordered-select.is-reordering .ordered-select__handle,
.ordered-select.is-reordering .ordered-select__remove {
    visibility: hidden;
}

.ordered-select__announcement {
    clip-path: inset(50%);
    height: 1px;
    overflow: hidden;
    position: absolute;
    white-space: nowrap;
    width: 1px;
}

@media (prefers-reduced-motion: reduce) {
    .ordered-select__tag .ordered-select__handle,
    .ordered-select__tag .ordered-select__remove {
        transition: none;
    }
}
</style>
