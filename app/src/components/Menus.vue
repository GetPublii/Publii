<template>
    <section :class="{
        'content': true,
        'menu': true,
        'menus-list-view': true,
        'no-scroll': editorVisible,
        'is-dragging': dragInProgress
    }">
        <p-header
            v-if="!showEmptyState"
            :title="$t('menu.menu')">
            <p-button
                :onClick="showAddMenuForm"
                slot="buttons"
                intent="primary"
                icon="add-site-mono">
                {{ $t('menu.addNewMenu') }}
            </p-button>
        </p-header>

        <collection
            v-if="!showEmptyState"
            :columns="5">
            <collection-header slot="header">
                <collection-cell>
                    <checkbox
                        value="all"
                        :checked="anyCheckboxIsSelected"
                        :onClick="toggleAllCheckboxes.bind(this, true)" />
                </collection-cell>

                <collection-cell>
                    {{ $t('ui.name') }}
                </collection-cell>

                <collection-cell>
                    {{ $t('menu.position') }}
                </collection-cell>

                <collection-cell variant="identifier">
                    {{ $t('menu.items') }}
                </collection-cell>

                <collection-cell variant="menu"></collection-cell>

                <div
                    v-if="anyCheckboxIsSelected"
                    class="tools">
                    <p-button
                        icon="trash"
                        appearance="light"
                        size="small"
                        :onClick="bulkDelete">
                        {{ $t('ui.delete') }}
                    </p-button>
                </div>
            </collection-header>

            <collection-row
                v-for="(item, index) in items"
                slot="content"
                :key="'menu-row-' + index"
                :expanded="menuIsOpened(index)">
                <collection-cell>
                    <checkbox
                        :value="index"
                        :checked="isChecked(index)"
                        :onClick="toggleSelection" />
                </collection-cell>

                <collection-cell
                    variant="titles"
                    justify-content="stretch">
                    <inline-name-editor
                        v-if="isRenaming(index)"
                        :value="item.name"
                        :save-label="$t('menu.saveMenuName')"
                        :validate="name => validateMenuName(name, item.name)"
                        @save="finishRename(index, $event)"
                        @cancel="cancelRename" />

                    <div
                        v-else
                        class="menu-title">
                        <button
                            type="button"
                            class="menu-toggle"
                            :aria-expanded="menuIsOpened(index) ? 'true' : 'false'"
                            :aria-controls="menuIsOpened(index) ? menuContentID(index) : null"
                            @click="toggleMenu(index)">
                            <span class="menu-name">
                                {{ item.name }}
                            </span>
                        </button>
                    </div>
                </collection-cell>

                <collection-cell variant="assignment">
                    <button
                        type="button"
                        :class="{
                            'menu-position': true,
                            'is-unassigned': !item.position
                        }"
                        :title="item.position ? $t('menu.changePosition') : $t('menu.assignPosition')"
                        @click="openMenuPositionPopup(item, index)">
                        <icon
                            v-if="!item.position"
                            name="warning"
                            size="xs"
                            non-interactive
                            class="menu-position-warning" />

                        <span class="menu-position-label">
                            {{ menuPositions(item.position) }}
                        </span>

                        <span
                            class="menu-position-icon"
                            aria-hidden="true"></span>
                    </button>
                </collection-cell>

                <collection-cell variant="identifier">
                    <button
                        type="button"
                        class="menu-count"
                        :aria-expanded="menuIsOpened(index) ? 'true' : 'false'"
                        :aria-controls="menuIsOpened(index) ? menuContentID(index) : null"
                        @click="toggleMenu(index)">
                        {{ countMenuItems(item.items) }}
                    </button>
                </collection-cell>

                <collection-cell
                    variant="menu"
                    justify-content="flex-end">
                    <action-menu
                        :items="menuRowActions(item, index)"
                        :label="$t('ui.otherOptions') + ': ' + item.name" />
                </collection-cell>

                <template v-if="menuIsOpened(index)">
                    <div class="item-content-gutter"></div>

                    <div
                        :id="menuContentID(index)"
                        class="item-content">
                        <div
                            v-if="!item.position"
                            class="menu-notice"
                            role="status">
                            <icon
                                name="warning"
                                size="s"
                                non-interactive
                                class="menu-notice-icon" />

                            <p class="menu-notice-text">
                                {{ $t('menu.unassignedNotice') }}
                            </p>

                            <p-button
                                appearance="outline"
                                size="small"
                                :onClick="openMenuPositionPopup.bind(this, item, index)">
                                {{ $t('menu.assignPosition') }}
                            </p-button>
                        </div>

                        <div class="menu-toolbar">
                            <p-button
                                icon="add-site-mono"
                                appearance="secondary"
                                :onClick="addMenuItem.bind(this, index)">
                                {{ $t('menu.addMenuItem') }}
                            </p-button>
                        </div>

                        <div class="menu-content">
                            <draggable
                                tag="ol"
                                group="menu-items"
                                chosenClass="is-chosen"
                                ghostClass="is-ghost"
                                dragClass="is-dragging"
                                class="menu-item-list"
                                v-model="$store.state.currentSite.menuStructure[index].items"
                                v-bind="dragOptions"
                                :move="keepItemOutOfItsAncestors"
                                :key="'draggable-menu-items-level0-' + index"
                                @start="setDragState(true)"
                                @end="setDragState(false)"
                                @update="listItemUpdated($event, index)"
                                @add="listItemAdded($event, index)">
                                <menu-item
                                    v-for="(subitem, subindex) in item.items"
                                    :key="'menu-item-' + subitem.id"
                                    :itemData="subitem"
                                    :itemMenuID="index"
                                    :itemOrder="subindex"
                                    :editedID="parseInt(editedID, 10)"
                                    :dragging="dragInProgress"
                                    :selectedItem="selectedItemMenuID === index ? selectedItem : null" />
                            </draggable>

                            <button
                                type="button"
                                class="menu-add-item"
                                @click="addMenuItem(index)">
                                <icon
                                    name="plus"
                                    size="xs"
                                    non-interactive />
                                {{ item.items.length ? $t('menu.addMenuItem') : $t('menu.addFirstMenuItem') }}
                            </button>
                        </div>
                    </div>
                </template>
            </collection-row>
        </collection>

        <empty-state
            v-if="showEmptyState"
            illustrationName="menus"
            illustrationWidth="344"
            illustrationHeight="286"
            :title="$t('menu.noMenusAvailable')"
            :description="$t('menu.noMenusCreateNewOne')">
            <p-button
                slot="button"
                icon="add-site-mono"
                :onClick="showAddMenuForm">
                {{ $t('menu.addNewMenu') }}
            </p-button>
        </empty-state>

        <transition>
            <menu-item-editor v-if="editorVisible" />
        </transition>

        <menu-position-popup
            v-if="menuPositionPopupVisible"
            :editedItem="selectedMenuItemToEditPosition"
            :editedItemIndex="selectedMenuItemToEditIndex"
            :menus="items" />
    </section>
</template>

<script>
import Draggable from 'vuedraggable';
import Sortable from 'sortablejs';
import MenuItem from './MenuItem.vue';
import MenuItemEditor from './MenuItemEditor.vue';
import InlineNameEditor from './basic-elements/InlineNameEditor.vue';
import MenuPositionPopup from './MenuPositionPopup.vue';
import CollectionCheckboxes from './mixins/CollectionCheckboxes.js';
import menuDragOptions, { keepItemOutOfItsAncestors } from './configs/menuDragOptions.js';

/*
 * Horizontal nesting while dragging: moving the pointer this far to the right
 * of the dragged row nests it under the row above, moving it this far to the
 * left pulls it out of its parent (when it is the last child).
 */
const NEST_THRESHOLD = 48;
const UNNEST_THRESHOLD = 24;

export default {
    name: 'menus',
    mixins: [
        CollectionCheckboxes
    ],
    components: {
        'draggable': Draggable,
        'menu-item': MenuItem,
        'menu-item-editor': MenuItemEditor,
        'inline-name-editor': InlineNameEditor,
        'menu-position-popup': MenuPositionPopup
    },
    data () {
        return {
            editedID: false,
            editorVisible: false,
            filterValue: '',
            selectedItems: [],
            openedMenus: [],
            renamedMenuIndex: null,
            selectedItem: null,
            selectedItemMenuID: null,
            selectedMenuItemToEditPosition: false,
            selectedMenuItemToEditIndex: false,
            menuPositionPopupVisible: false,
            dragInProgress: false,
            saveTimer: null,
            nestingFrame: null,
            nestingPointer: null
        };
    },
    computed: {
        items () {
            return this.$store.state.currentSite.menuStructure;
        },
        showEmptyState: function() {
            return !this.items.length;
        },
        dragOptions () {
            return menuDragOptions(!!this.selectedItem);
        }
    },
    mounted () {
        this.$bus.$on('hide-menu-item-editor', () => {
            this.editedID = false;
            this.editorVisible = false;
        });

        this.$bus.$on('show-menu-item-editor-from-submenu', itemID => {
            this.editedID = itemID;
            this.editorVisible = true;
        });

        this.$bus.$on('save-new-menu-structure', () => {
            this.saveNewMenuStructure();
        });

        this.$bus.$on('menus-manager-selected-item', itemID => {
            this.selectMenuItem(itemID);
        });

        this.$bus.$on('menus-manager-unselect-item', () => {
            this.unselectMenuItem();
        });

        this.$bus.$on('menus-manager-move-item', config => {
            this.moveMenuItem(config);
        });

        this.$bus.$on('hide-menu-position-popup', () => {
            this.menuPositionPopupVisible = false;
        });

        this.$bus.$on('menus-manager-save-menu-positions', config => {
            this.changeMenu(config.index, config.position, config.maxLevels);
        });

        this.$bus.$on('menus-manager-drag-state', state => {
            this.setDragState(state);
        });
    },
    methods: {
        toggleMenu (index) {
            let menuName = this.items[index].name;
            let position = this.openedMenus.indexOf(menuName);

            if (position === -1) {
                this.openedMenus.push(menuName);
            } else {
                this.openedMenus.splice(position, 1);
            }
        },
        menuIsOpened (index) {
            return this.openedMenus.indexOf(this.items[index].name) > -1;
        },
        menuContentID (index) {
            return 'menu-content-' + this._uid + '-' + index;
        },
        isRenaming (index) {
            return this.renamedMenuIndex === index;
        },
        validateMenuName (name, currentName = null) {
            let trimmedName = (name || '').trim();

            if (trimmedName === '') {
                return this.$t('menu.menuNameRequired');
            }

            if (!this.menuNameIsUnique(trimmedName, currentName)) {
                return this.$t('menu.menuNameTaken');
            }

            return true;
        },
        showAddMenuForm () {
            this.$bus.$emit('confirm-display', {
                hasInput: true,
                message: this.$t('menu.provideNameForNewMenu'),
                okLabel: this.$t('menu.createNewMenu'),
                validate: name => this.validateMenuName(name),
                okClick: result => this.addNewMenu(result)
            });
        },
        addNewMenu (newMenuName) {
            let menuName = (newMenuName || '').trim();

            if (this.validateMenuName(menuName) !== true) {
                return;
            }

            this.$store.commit('addNewMenu', menuName);
            this.saveNewMenuStructure();
            this.openedMenus.push(menuName);

            this.$bus.$emit('message-display', {
                message: this.$t('menu.newMenuCreated'),
                type: 'success',
                lifeTime: 3
            });
        },
        menuNameIsUnique (name, oldName = null) {
            for (let i = 0; i < this.items.length; i++) {
                if (this.items[i].name !== name) {
                    continue;
                }

                if (oldName !== null && name === oldName) {
                    continue;
                }

                return false;
            }

            return true;
        },
        startRename (index) {
            this.renamedMenuIndex = index;
        },
        cancelRename () {
            this.renamedMenuIndex = null;
        },
        finishRename (index, newMenuName) {
            let oldMenuName = this.items[index].name;
            this.renamedMenuIndex = null;

            if (newMenuName === oldMenuName) {
                return;
            }

            this.$store.commit('editMenuName', {
                newName: newMenuName,
                index: index
            });
            this.saveNewMenuStructure();

            let openedPosition = this.openedMenus.indexOf(oldMenuName);

            if (openedPosition > -1) {
                this.$set(this.openedMenus, openedPosition, newMenuName);
            }

            this.$bus.$emit('message-display', {
                message: this.$t('menu.menuNameHasBeenEdited'),
                type: 'success',
                lifeTime: 3
            });
        },
        menuRowActions (item, index) {
            return [
                {
                    label: this.$t('menu.renameMenu'),
                    value: 'rename',
                    icon: 'edit',
                    onClick: () => this.startRename(index)
                },
                {
                    label: item.position ? this.$t('menu.changePosition') : this.$t('menu.assignPosition'),
                    value: 'position',
                    icon: 'settings',
                    onClick: () => this.openMenuPositionPopup(item, index)
                },
                {
                    separator: true
                },
                {
                    label: this.$t('menu.deleteMenu'),
                    value: 'delete',
                    icon: 'trash',
                    intent: 'danger',
                    onClick: () => this.deleteMenu(index)
                }
            ];
        },
        changeMenu (itemIndex, itemPosition, itemMaxLevels) {
            this.$store.commit('setMenuPosition', {
                index: itemIndex,
                position: itemPosition,
                maxLevels: itemMaxLevels
            });

            this.saveNewMenuStructure();
        },
        addMenuItem (index) {
            this.editorVisible = true;

            setTimeout(() => {
                this.$bus.$emit('show-menu-item-editor', {
                    menuID: index
                });
            }, 0);
        },
        deleteMenu (index) {
            this.$bus.$emit('confirm-display', {
                message: this.$t('menu.menuRemoveMessage'),
                isDanger: true,
                okClick: () => this.deleteMenus([index], this.$t('menu.menuRemoveSuccessMessage'))
            });
        },
        bulkDelete () {
            this.$bus.$emit('confirm-display', {
                message: this.$t('menu.menusRemoveMessage'),
                isDanger: true,
                okClick: () => this.deleteMenus(this.getSelectedItems(false), this.$t('menu.menusRemoveSuccessMessage'))
            });
        },
        deleteMenus (indexes, successMessage) {
            let removedNames = indexes
                .map(index => this.items[index] ? this.items[index].name : null)
                .filter(name => name !== null);

            this.$store.commit('deleteMenuByIDs', indexes);
            this.saveNewMenuStructure();
            this.selectedItems = [];
            this.renamedMenuIndex = null;
            this.unselectMenuItem();
            this.openedMenus = this.openedMenus.filter(name => removedNames.indexOf(name) === -1);

            this.$bus.$emit('message-display', {
                message: successMessage,
                type: 'success',
                lifeTime: 3
            });
        },
        keepItemOutOfItsAncestors,
        setDragState (state) {
            this.dragInProgress = !!state;

            if (this.dragInProgress) {
                document.addEventListener('mousemove', this.handleNestingMove);
            } else {
                document.removeEventListener('mousemove', this.handleNestingMove);
            }
        },
        handleNestingMove (event) {
            // Coalesce pointer moves into one check per frame
            this.nestingPointer = { clientX: event.clientX, clientY: event.clientY };

            if (this.nestingFrame) {
                return;
            }

            this.nestingFrame = requestAnimationFrame(() => {
                this.nestingFrame = null;
                this.applyNestingGesture(this.nestingPointer);
            });
        },
        applyNestingGesture (event) {
            let dragEl = Sortable.dragged;

            if (!event || !dragEl || !dragEl.classList.contains('menu-item')) {
                return;
            }

            // Only react while the pointer stays on the dragged row itself;
            // everywhere else SortableJS decides where the row goes
            let rect = dragEl.getBoundingClientRect();

            if (event.clientY < rect.top || event.clientY > rect.bottom) {
                return;
            }

            let offset = event.clientX - rect.left;

            if (offset > NEST_THRESHOLD) {
                this.nestDraggedItem(dragEl, event);
            } else if (offset < -UNNEST_THRESHOLD) {
                this.unnestDraggedItem(dragEl);
            }
        },
        nestDraggedItem (dragEl, event) {
            let previous = dragEl.previousElementSibling;

            while (previous && !previous.classList.contains('menu-item')) {
                previous = previous.previousElementSibling;
            }

            if (!previous) {
                return;
            }

            let childList = previous.querySelector(':scope > .menu-item-list');
            let sortable = childList ? Sortable.get(childList) : null;

            if (!sortable || sortable.options.disabled) {
                return;
            }

            // Plain DOM move: on drop SortableJS reads the row's final parent and
            // index from the DOM and emits add/remove for vuedraggable itself
            childList.appendChild(dragEl);
        },
        unnestDraggedItem (dragEl) {
            let list = dragEl.parentNode;
            let parentItem = list ? list.parentNode : null;

            if (!parentItem || !parentItem.classList || !parentItem.classList.contains('menu-item')) {
                return;
            }

            // Only the last child can be pulled out; otherwise the rows below it
            // would have to travel with it
            let lastItem = list.lastElementChild;

            while (lastItem && !lastItem.classList.contains('menu-item')) {
                lastItem = lastItem.previousElementSibling;
            }

            if (lastItem !== dragEl) {
                return;
            }

            parentItem.parentNode.insertBefore(dragEl, parentItem.nextSibling);
        },
        saveNewMenuStructure () {
            // One drag can trigger several list updates; write the file once
            clearTimeout(this.saveTimer);

            this.saveTimer = setTimeout(() => {
                this.flushMenuStructureSave();
            }, 150);
        },
        flushMenuStructureSave () {
            clearTimeout(this.saveTimer);
            this.saveTimer = null;

            mainProcessAPI.send('app-menu-update', {
                siteName: this.$store.state.currentSite.config.name,
                menuStructure: this.$store.state.currentSite.menuStructure
            });
        },
        countMenuItems(items) {
            let result = items.length;

            for(let i = 0; i < items.length; i++) {
                if(items[i].items.length) {
                    result += this.countMenuItems(items[i].items);
                }
            }

            return result;
        },
        listItemUpdated (e, menuID) {
            this.saveNewMenuStructure();
        },
        listItemAdded (e) {
            this.saveNewMenuStructure();
        },
        selectMenuItem (data) {
            this.selectedItem = data.id;
            this.selectedItemMenuID = data.menuID;
        },
        unselectMenuItem () {
            this.selectedItem = null;
            this.selectedItemMenuID = null;
        },
        moveMenuItem (config) {
            if (!this.selectedItem) {
                return;
            }

            this.$store.commit('moveMenuItem', {
                position: config.position,
                menuID: config.menuID,
                targetID: this.selectedItem,
                destinationID: config.destinationID
            });

            this.saveNewMenuStructure();
            this.unselectMenuItem();
        },
        menuPositions (positions) {
            let menus = JSON.parse(JSON.stringify(this.$store.state.currentSite.themeSettings.menus));
            let output = [];
            positions = (positions || '').split(';');

            if (positions[0] === '') {
                return this.$t('menu.unassigned');
            }

            for (let i = 0; i < positions.length; i++) {
                let position = positions[i];

                if (menus[position]) {
                    if (typeof menus[position] === 'string') {
                        output.push(menus[position]);
                    } else if (menus[position].name) {
                        output.push(menus[position].name);
                    }
                }
            }

            if (!output.length) {
                return this.$t('menu.unassigned');
            }

            return output.join(', ');
        },
        openMenuPositionPopup (item, index) {
            this.selectedMenuItemToEditPosition = item;
            this.selectedMenuItemToEditIndex = index;

            this.$nextTick(() => {
                this.menuPositionPopupVisible = true;
            });
        }
    },
    beforeDestroy () {
        document.removeEventListener('mousemove', this.handleNestingMove);

        if (this.nestingFrame) {
            cancelAnimationFrame(this.nestingFrame);
        }

        if (this.saveTimer) {
            this.flushMenuStructureSave();
        }

        this.$bus.$off('menus-manager-drag-state');
        this.$bus.$off('hide-menu-item-editor');
        this.$bus.$off('show-menu-item-editor-from-submenu');
        this.$bus.$off('save-new-menu-structure');
        this.$bus.$off('menus-manager-selected-item');
        this.$bus.$off('menus-manager-unselect-item');
        this.$bus.$off('menus-manager-move-item');
        this.$bus.$off('hide-menu-position-popup');
        this.$bus.$off('menus-manager-save-menu-positions');
    }
}
</script>

<style scoped>
.menu {
    overflow: auto;
    overflow-x: hidden!important;

    &.no-scroll {
        overflow: hidden;
    }

    .col.assignment {
        display: flex;
        padding-top: 0;
        padding-bottom: 0;
    }

    .item-content-gutter {
        border-bottom: 1px solid var(--border-light-color);
        grid-column: 1 / 2;
    }

    .item-content {
        border-bottom: 1px solid var(--border-light-color);
        grid-column: 2 / -1;
        min-width: 0;
        padding: var(--space-6) 1.8rem var(--space-8) 1.8rem;
        user-select: none;
    }
}

.menu-title {
    align-items: center;
    display: flex;
    gap: var(--space-1);
    min-width: 0;
    width: 100%;
}

.menu-toggle {
    align-items: center;
    appearance: none;
    background: none;
    border: none;
    border-radius: var(--radius-base);
    color: var(--link-invert-color);
    cursor: pointer;
    display: inline-flex;
    font-family: var(--font-family-sans);
    font-size: var(--font-size-ui-md);
    font-weight: var(--font-weight-medium);
    margin: 0;
    min-width: 0;
    padding: var(--space-1) var(--space-2) var(--space-1) 0;
    text-align: left;

    &:hover,
    &:focus-visible {
        color: var(--link-invert-color-hover);
    }

    &:focus-visible {
        outline: 2px solid var(--input-border-focus);
        outline-offset: 2px;
    }
}

.menu-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.menu-position {
    align-items: center;
    appearance: none;
    background: none;
    border: none;
    border-radius: var(--radius-base);
    color: var(--link-invert-color);
    cursor: pointer;
    display: inline-flex;
    font-family: var(--font-family-sans);
    font-size: var(--font-size-ui-sm);
    font-weight: var(--font-weight-regular);
    gap: var(--space-2);
    margin: 0;
    max-width: 100%;
    padding: var(--space-1) var(--space-16) var(--space-1) 0;
    position: relative;
    text-align: left;
    width: 100%;

    &:hover,
    &:focus-visible {
        color: var(--link-invert-color-hover);

        .menu-position-icon {
            border-top-color: var(--icon-tertiary-color);
        }
    }

    &:focus-visible {
        outline: 2px solid var(--input-border-focus);
        outline-offset: 2px;
    }

    &.is-unassigned {
        color: var(--text-light-color);
    }
}

.menu-position-label {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.menu-position-warning {
    fill: var(--color-warning);
    flex-shrink: 0;
}

/* Same triangle as the site switcher, split buttons and selects,
   pinned to the column edge so every row's arrow lines up */
.menu-position-icon {
    border-color: var(--icon-secondary-color) transparent transparent;
    border-style: solid;
    border-width: 5px;
    height: 0;
    position: absolute;
    right: 0;
    top: calc(50% - 2px);
    transition: var(--transition-default);
    width: 0;
}

.menu-count {
    appearance: none;
    background: none;
    border: none;
    border-radius: var(--radius-base);
    color: var(--link-invert-color);
    cursor: pointer;
    font-family: var(--font-family-sans);
    font-size: var(--font-size-ui-sm);
    font-weight: var(--font-weight-regular);
    margin: 0;
    padding: var(--space-1) var(--space-2);

    &:hover,
    &:focus-visible {
        color: var(--link-invert-color-hover);
    }

    &:focus-visible {
        outline: 2px solid var(--input-border-focus);
        outline-offset: 2px;
    }
}

/* Warning tint from the inline-message recipe, icon matches the unassigned marker */
.menu-notice {
    align-items: center;
    background: oklch(from var(--color-warning) l c h / 12.5%);
    border-radius: var(--radius-base);
    color: var(--text-primary-color);
    display: flex;
    font-size: var(--font-size-ui-sm);
    gap: var(--space-3);
    margin-bottom: var(--space-6);
    padding: var(--space-3) var(--space-4);

    .button {
        flex-shrink: 0;
    }
}

.menu-notice-icon {
    fill: var(--color-warning);
    flex-shrink: 0;
}

.menu-notice-text {
    flex: 1;
    margin: 0;
}

.menu-toolbar {
    margin-bottom: var(--space-4);
}

.menu-content {
    position: relative;
}

.menu-item-list {
    list-style-type: none;
    margin: 0;
    padding: 0;

    /* An empty menu accepts drops over its "add item" row, but only while dragging */
    &:empty {
        inset: 0;
        pointer-events: none;
        position: absolute;
    }
}

.menu.is-dragging .menu-item-list:empty {
    pointer-events: auto;
}

.menu-add-item {
    align-items: center;
    appearance: none;
    background: transparent;
    /* Solid on purpose: a dashed frame reads as a drop placeholder here */
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-base);
    color: var(--text-light-color);
    cursor: pointer;
    display: flex;
    font-family: var(--font-family-sans);
    font-size: var(--font-size-ui-sm);
    font-weight: var(--font-weight-medium);
    gap: var(--space-2);
    justify-content: center;
    margin-top: var(--space-2);
    padding: var(--space-3);
    transition: var(--transition-default);
    width: 100%;

    & > svg {
        fill: currentColor;
        pointer-events: none;
    }

    &:hover,
    &:focus-visible {
        background: var(--collection-bg-hover);
        border-color: var(--color-primary);
        color: var(--link-primary-color);
    }

    &:focus-visible {
        outline: 2px solid var(--input-border-focus);
        outline-offset: 2px;
    }
}
</style>
