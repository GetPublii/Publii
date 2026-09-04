<template>
    <li
        :class="cssClasses"
        :data-id="id">
        <div
            :class="{
                'menu-item-row': true,
                'is-dnd-disabled': !!selectedItem
            }">
            <span
                class="menu-item-handle"
                :title="$t('menu.dragToReorder')"
                aria-hidden="true">
                <icon
                    name="menu-dots"
                    iconset="svg-map-block-editor"
                    size="xs"
                    non-interactive />
            </span>

            <button
                type="button"
                class="menu-item-label"
                :title="itemTooltip"
                :disabled="!!selectedItem"
                @click="editMenuItem">
                {{ label }}
            </button>

            <span
                v-if="isHidden || isDraft || isInvalid"
                class="menu-item-badges">
                <span
                    v-if="isHidden"
                    class="menu-item-badge"
                    :title="$t('menu.menuItemIsHidden')">
                    {{ $t('menu.itemHidden') }}
                </span>

                <span
                    v-if="isDraft"
                    class="menu-item-badge"
                    :title="$t('menu.likedItemIsADraft')">
                    {{ $t('menu.itemDraft') }}
                </span>

                <span
                    v-if="isInvalid"
                    class="menu-item-badge is-invalid"
                    :title="$t('menu.likedItemError')">
                    {{ $t('menu.itemUnavailable') }}
                </span>
            </span>

            <div
                v-if="!selectedItem"
                class="menu-item-actions">
                <button
                    type="button"
                    class="menu-item-action"
                    :title="$t('menu.addSubmenuItem')"
                    @click="addSubmenuItem">
                    {{ $t('menu.addSubmenu') }}
                </button>

                <button
                    type="button"
                    class="menu-item-action"
                    :title="$t('menu.moveItem')"
                    @click="selectItem">
                    {{ $t('menu.moveItem') }}
                </button>
            </div>

            <action-menu
                v-if="!selectedItem"
                class="menu-item-more"
                size="small"
                :items="itemActions"
                :label="$t('ui.otherOptions') + ': ' + label" />

            <div
                v-if="selectedItem && isSelected"
                class="menu-item-actions is-move-mode">
                <button
                    type="button"
                    class="menu-item-action is-danger"
                    :title="$t('menu.unselectItem')"
                    @click="unselectItem">
                    <icon
                        name="close"
                        size="xs"
                        non-interactive
                        class="menu-item-action-icon is-stroke" />
                    {{ $t('menu.unselectItem') }}
                </button>
            </div>

            <div
                v-if="selectedItem && !isSelected && !parentIsSelected"
                class="menu-item-actions is-move-mode">
                <span class="menu-item-insert-actions">
                    {{ $t('menu.insertActions') }}
                </span>

                <button
                    type="button"
                    class="menu-item-action"
                    :title="$t('menu.insertBefore')"
                    @click="insertSelectedItem('before')">
                    <icon
                        name="move-up"
                        size="xs"
                        non-interactive
                        class="menu-item-action-icon" />
                    {{ $t('menu.insertBefore') }}
                </button>

                <button
                    type="button"
                    class="menu-item-action"
                    :title="$t('menu.insertAfter')"
                    @click="insertSelectedItem('after')">
                    <icon
                        name="move-down"
                        size="xs"
                        non-interactive
                        class="menu-item-action-icon" />
                    {{ $t('menu.insertAfter') }}
                </button>

                <button
                    type="button"
                    class="menu-item-action"
                    :title="$t('menu.insertAsChild')"
                    @click="insertSelectedItem('child')">
                    {{ $t('menu.insertAsChild') }}
                </button>
            </div>
        </div>

        <draggable
            tag="ol"
            group="menu-items"
            chosenClass="is-chosen"
            ghostClass="is-ghost"
            dragClass="is-dragging"
            class="menu-item-list"
            v-model="itemsList"
            v-bind="dragOptions"
            :move="keepItemOutOfItsAncestors"
            :key="'draggable-menu-items-' + id"
            @start="setDragState(true)"
            @end="setDragState(false)"
            @update="listItemUpdated"
            @add="listItemAdded">
            <menu-item
                v-for="(item, index) in items"
                :key="'menu-item-' + item.id"
                :itemData="item"
                :itemMenuID="menuID"
                :itemOrder="index"
                :editedID="editedID"
                :dragging="dragging"
                :selectedItem="selectedItem"
                :parentIsSelected="isSelected || parentIsSelected" />
        </draggable>
    </li>
</template>

<script>
import Draggable from 'vuedraggable';
import menuDragOptions, { keepItemOutOfItsAncestors } from './configs/menuDragOptions.js';

export default {
    name: 'menu-item',
    props: {
        editedID: {
            type: [Boolean, Number],
            required: false
        },
        itemData: {
            type: Object,
            required: true
        },
        itemMenuID: {
            type: Number,
            required: true
        },
        itemOrder: {
            type: Number,
            required: true
        },
        selectedItem: {
            required: true
        },
        parentIsSelected: {
            required: false
        },
        dragging: {
            default: false,
            type: Boolean
        }
    },
    components: {
        'draggable': Draggable
    },
    computed: {
        menuID () {
            return this.itemMenuID;
        },
        id () {
            return this.itemData.id;
        },
        label () {
            return this.itemData.label;
        },
        type () {
            return this.itemData.type;
        },
        link () {
            return this.itemData.link;
        },
        linkTitle () {
            return this.itemData.title;
        },
        target () {
            return this.itemData.target || '_self';
        },
        rel () {
            return this.itemData.rel;
        },
        cssClass () {
            return this.itemData.cssClass;
        },
        isHidden () {
            return !!this.itemData.isHidden;
        },
        items () {
            return this.itemData.items || [];
        },
        cssClasses () {
            return {
                'menu-item': true,
                'is-edited': this.editedID === this.id,
                'is-invalid': this.isInvalid,
                'is-draft': this.isDraft,
                'is-hidden': this.isHidden,
                'is-selected': this.isSelected,
                'is-drag-active': this.dragging
            };
        },
        dragOptions () {
            return menuDragOptions(!!this.selectedItem);
        },
        isInvalid () {
            return !this.elementExists();
        },
        isDraft () {
            return this.elementIsDraft();
        },
        itemTooltip () {
            if (this.isInvalid) {
                return this.$t('menu.likedItemError');
            }

            if (this.isDraft) {
                return this.$t('menu.likedItemIsADraft');
            }

            return this.$t('menu.editThisMenuItem');
        },
        itemsList: {
            get () {
                return this.findItem(this.$store.state.currentSite.menuStructure[this.itemMenuID].items);
            },
            set (newValue) {
                this.$store.commit('reorderMenuItems', {
                    menuID: this.menuID,
                    itemID: this.id,
                    items: newValue
                });

                this.$bus.$emit('save-new-menu-structure');
            }
        },
        isSelected () {
            return this.id === this.selectedItem;
        },
        itemActions () {
            return [
                {
                    label: this.$t('ui.edit'),
                    value: 'edit',
                    icon: 'edit',
                    onClick: () => this.editMenuItem()
                },
                {
                    label: this.isHidden ? this.$t('ui.show') : this.$t('ui.hide'),
                    value: 'visibility',
                    icon: this.isHidden ? 'unhidden-post' : 'hidden-post',
                    onClick: () => this.isHidden ? this.showMenuItem() : this.hideMenuItem()
                },
                {
                    label: this.$t('menu.duplicateItem'),
                    value: 'duplicate',
                    icon: 'duplicate',
                    onClick: () => this.duplicateMenuItem()
                },
                {
                    separator: true
                },
                {
                    label: this.$t('ui.delete'),
                    value: 'delete',
                    icon: 'trash',
                    intent: 'danger',
                    onClick: () => this.removeMenuItem()
                }
            ];
        }
    },
    methods: {
        elementExists () {
            if(this.type !== 'post' && this.type !== 'page' && this.type !== 'tag' && this.type !== 'author') {
                return true;
            }

            let validItems = [];

            if (this.type === 'post') {
                validItems = this.$store.state.currentSite.posts.filter(
                    post => post.id == this.link && post.status.indexOf('trashed') === -1
                );
            }

            if (this.type === 'page') {
                validItems = this.$store.state.currentSite.pages.filter(
                    page => page.id == this.link && page.status.indexOf('trashed') === -1
                );
            }

            if (this.type === 'tag') {
                validItems = this.$store.state.currentSite.tags.filter(
                    tag => tag.id == this.link && tag.additionalData.indexOf('"isHidden":true') === -1
                );

                if(!this.$store.state.currentSite.config.advanced.displayEmptyTags) {
                    let assignedPosts = this.$store.state.currentSite.postsTags.filter(
                        postTag => postTag.tagID == this.link
                    );

                    if(assignedPosts.length === 0) {
                        return false;
                    }
                }
            }

            if (this.type === 'author') {
                validItems = this.$store.state.currentSite.authors.filter(
                    author => author.username === this.link
                );

                let authorID = validItems[0] ? validItems[0].id : null;

                if(authorID && !this.$store.state.currentSite.config.advanced.displayEmptyAuthors) {
                    let assignedPosts = this.$store.state.currentSite.postsAuthors.filter(
                        postAuthor => postAuthor.authorID == authorID
                    );

                    if (assignedPosts.length === 0) {
                        return false;
                    }
                }
            }

            return validItems.length > 0;
        },
        elementIsDraft () {
            if (this.type !== 'post' && this.type !== 'page') {
                return false;
            }

            let draftItems = [];

            if (this.type === 'post') {
                draftItems = this.$store.state.currentSite.posts.filter(
                    post => post.id == this.link && post.status.indexOf('draft') > -1
                );
            }

            if (this.type === 'page') {
                draftItems = this.$store.state.currentSite.pages.filter(
                    page => page.id == this.link && page.status.indexOf('draft') > -1
                );
            }

            return draftItems.length > 0;
        },
        addSubmenuItem () {
            this.$bus.$emit('show-menu-item-editor-from-submenu');

            setTimeout(() => {
                this.$bus.$emit('show-menu-item-editor', {
                    menuID: this.menuID,
                    parentID: this.id
                });
            }, 50);
        },
        editMenuItem () {
            this.$bus.$emit('show-menu-item-editor-from-submenu', this.id);

            setTimeout(() => {
                this.$bus.$emit('show-menu-item-editor', {
                    menuID: this.menuID,
                    menuItemID: this.id,
                    label: this.label,
                    title: this.linkTitle,
                    cssClass: this.cssClass,
                    type: this.type,
                    target: this.target,
                    rel: this.rel,
                    isHidden: this.isHidden,
                    link: this.link
                });
            }, 50);
        },
        duplicateMenuItem () {
            this.$store.commit('duplicateMenuItem', {
                menuID: this.menuID,
                menuItemID: this.id
            });

            this.$bus.$emit('save-new-menu-structure');
        },
        removeMenuItem () {
            this.$bus.$emit('confirm-display', {
                message: this.$t('menu.menuItemsRemoveMessage'),
                isDanger: true,
                okClick: this.removeSelectedMenuItem
            });
        },
        removeSelectedMenuItem () {
            this.$store.commit('deleteMenuItem', {
                menuID: this.menuID,
                menuItemID: this.id
            });

            this.$bus.$emit('save-new-menu-structure');
        },
        keepItemOutOfItsAncestors,
        setDragState (state) {
            this.$bus.$emit('menus-manager-drag-state', state);
        },
        listItemUpdated (e) {
            this.$bus.$emit('save-new-menu-structure');
        },
        listItemAdded (e) {
            this.$bus.$emit('save-new-menu-structure');
        },
        findItem(items) {
            if (items) {
                for (var i = 0; i < items.length; i++) {
                    if (items[i].id == this.id) {
                        return items[i].items;
                    }

                    var found = this.findItem(items[i].items);

                    if (found) {
                        return found;
                    }
                }
            }
        },
        hideMenuItem () {
            this.$store.commit('hideMenuItem', {
                itemID: this.id,
                menuID: this.menuID
            });

            this.$bus.$emit('save-new-menu-structure');
        },
        showMenuItem () {
            this.$store.commit('showMenuItem', {
                itemID: this.id,
                menuID: this.menuID
            });

            this.$bus.$emit('save-new-menu-structure');
        },
        selectItem () {
            this.$bus.$emit('menus-manager-selected-item', {
                id: this.id,
                menuID: this.menuID
            });
        },
        unselectItem () {
            this.$bus.$emit('menus-manager-unselect-item');
        },
        insertSelectedItem (position) {
            this.$bus.$emit('menus-manager-move-item', {
                menuID: this.menuID,
                position: position,
                destinationID: this.id
            });
        }
    }
}
</script>

<style scoped>
.menu-item {
    margin: 0;
    padding: 0;
    position: relative;

    & + .menu-item {
        margin-top: var(--space-2);
    }

    &.is-chosen {
        opacity: .75;
    }

    /* The clone that follows the pointer (SortableJS dragClass) */
    &.is-dragging {
        opacity: 1;

        & > .menu-item-row {
            background: var(--collection-bg);
            border-left-color: var(--color-primary);
            box-shadow: var(--shadow-md);
        }
    }

    /* While any item is dragged, keep the other rows quiet and open their drop zones */
    &.is-drag-active > .menu-item-row > .menu-item-actions {
        opacity: 0;
    }

    &.is-drag-active > .menu-item-list:empty {
        pointer-events: auto;
    }

    &.is-ghost {
        border: 1px dashed var(--input-border-focus);
        border-radius: var(--radius-base);

        & > .menu-item-row {
            opacity: 0;
        }
    }

    &.is-selected > .menu-item-row {
        border-color: var(--input-border-focus);
        border-style: dashed;
    }

    &.is-edited > .menu-item-row {
        background: var(--collection-bg-hover);
        border-left-color: var(--color-primary);
    }

    &.is-hidden > .menu-item-row > .menu-item-label,
    &.is-draft > .menu-item-row > .menu-item-label {
        color: var(--text-light-color);
    }
}

.menu-item-row {
    align-items: center;
    background: var(--collection-bg);
    border: 1px solid var(--color-border-muted);
    border-left: 3px solid var(--color-border-default);
    border-radius: var(--radius-base);
    display: flex;
    gap: var(--space-2);
    min-height: 4.4rem;
    padding: var(--space-2) var(--space-3) var(--space-2) var(--space-2);
    position: relative;
    transition: var(--transition-default);

    &:hover,
    &:focus-within {
        background: var(--collection-bg-hover);
        border-left-color: var(--color-primary);
    }
}

.menu-item-handle {
    align-items: center;
    color: var(--icon-secondary-color);
    cursor: grab;
    display: inline-flex;
    flex-shrink: 0;
    justify-content: center;
    padding: var(--space-1);

    & > svg {
        fill: none;
        height: 16px;
        pointer-events: none;
        stroke: currentColor;
        width: 16px;
    }
}

.menu-item-row.is-dnd-disabled .menu-item-handle {
    cursor: default;
    opacity: .4;
}

.menu-item-label {
    appearance: none;
    background: none;
    border: none;
    border-radius: var(--radius-base);
    color: var(--text-primary-color);
    cursor: pointer;
    font-family: var(--font-family-sans);
    font-size: var(--font-size-ui-md);
    font-weight: var(--font-weight-regular);
    margin: 0;
    min-width: 0;
    overflow: hidden;
    padding: var(--space-1) var(--space-2);
    text-align: left;
    text-overflow: ellipsis;
    white-space: nowrap;

    &:hover,
    &:focus-visible {
        color: var(--link-primary-color);
    }

    &:focus-visible {
        outline: 2px solid var(--input-border-focus);
        outline-offset: 2px;
    }

    &:disabled {
        color: var(--text-primary-color);
        cursor: default;
    }
}

.menu-item-badges {
    align-items: center;
    display: inline-flex;
    flex-shrink: 0;
    gap: var(--space-1);
}

.menu-item-badge {
    background: var(--color-surface-notice);
    border-radius: var(--radius-base);
    color: var(--color-text-subtle);
    font-size: var(--font-size-ui-xs);
    line-height: 1.8rem;
    padding: 0 var(--space-2);
    white-space: nowrap;

    &.is-invalid {
        background: oklch(from var(--color-danger) l c h / 12%);
        color: var(--color-danger);
    }
}

/* Text actions sit right after the label, where the pointer already is */
.menu-item-actions {
    align-items: center;
    display: flex;
    flex-shrink: 0;
    margin-left: var(--space-3);
    opacity: 0;
    transition: var(--transition-default);

    &.is-move-mode {
        opacity: 1;
    }
}

.menu-item-row:hover .menu-item-actions,
.menu-item-row:focus-within .menu-item-actions {
    opacity: 1;
}

.menu-item-more {
    flex-shrink: 0;
    margin-left: auto;
}

.menu-item-action {
    align-items: center;
    appearance: none;
    background: none;
    border: none;
    border-radius: var(--radius-base);
    color: var(--link-primary-color);
    cursor: pointer;
    display: inline-flex;
    font-family: var(--font-family-sans);
    font-size: var(--font-size-ui-sm);
    font-weight: var(--font-weight-regular);
    gap: var(--space-1);
    margin: 0;
    padding: var(--space-1) var(--space-2);
    position: relative;
    white-space: nowrap;

    &:hover,
    &:focus-visible {
        color: var(--link-primary-color-hover);
    }

    &:focus-visible {
        outline: 2px solid var(--input-border-focus);
        outline-offset: -2px;
    }

    /* Short centred divider between actions, as on the previous layout */
    &:not(:last-child) {
        padding-right: var(--space-4);

        &::after {
            background: var(--input-border-color);
            content: "";
            display: block;
            height: 14px;
            position: absolute;
            right: 0;
            top: 50%;
            transform: translate(0, -50%);
            width: 1px;
        }
    }

    &.is-danger {
        color: var(--color-danger);
    }
}

.menu-item-action-icon {
    color: currentColor;
    pointer-events: none;

    &.is-stroke {
        fill: none;
        stroke: currentColor;
        stroke-width: 2;
    }
}

.menu-item-insert-actions {
    color: var(--text-light-color);
    font-size: var(--font-size-ui-sm);
    padding: var(--space-1) var(--space-2);
    white-space: nowrap;
}

.menu-item-list {
    list-style-type: none;
    margin: 0;
    padding: 0;

    /* The bottom padding is a real "append to this list" drop area below the
       last child, so an item can land next to it at the same level. Moving the
       pointer further right hits the child's own indented drop zone instead. */
    &:not(:empty) {
        border-left: 1px solid var(--color-border-muted);
        margin: var(--space-2) 0 0 var(--space-8);
        padding: 0 0 var(--space-3) var(--space-4);
    }

    /* Invisible "drop here to nest" zone below an item without children.
       It is indented like real children, sits over the gap to the next row,
       and only takes pointer events while a drag is in progress. */
    &:empty {
        bottom: calc(-1 * (var(--space-2) + var(--space-1)));
        left: var(--space-8);
        min-height: calc(var(--space-2) + var(--space-1));
        pointer-events: none;
        position: absolute;
        right: 0;
        z-index: 10;
    }
}
</style>
