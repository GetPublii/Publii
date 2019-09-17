<template>
    <section :class="{ 'content': true, 'menu': true, 'no-scroll': editorVisible }">
        <p-header
            v-if="!showEmptyState"
            title="Menu">
            <p-button
                :onClick="showAddMenuForm"
                slot="buttons"
                type="primary icon"
                icon="add-site-mono">
                Add new menu
            </p-button>
        </p-header>

        <collection
            v-if="!showEmptyState">
            <collection-header slot="header">
                <collection-cell width="40px">
                    <checkbox
                        value="all"
                        :checked="anyCheckboxIsSelected"
                        :onClick="toggleAllCheckboxes.bind(this, true)" />
                </collection-cell>

                <collection-cell width="calc(100% - 270px)">
                    Name
                </collection-cell>

                <collection-cell width="180px">
                    Assigned menu
                </collection-cell>

                <collection-cell width="50px">
                    Items
                </collection-cell>

                <div
                    v-if="anyCheckboxIsSelected"
                    class="tools">
                    <p-button
                        icon="trash"
                        type="small light icon"
                        :onClick="bulkDelete">
                        Delete
                    </p-button>
                </div>
            </collection-header>

            <collection-row
                v-for="(item, index) in items"
                slot="content"
                :key="index">
                <collection-cell width="40px">
                    <checkbox
                        :value="index"
                        :checked="isChecked(index)"
                        :onClick="toggleSelection" />
                </collection-cell>

                <collection-cell width="calc(100% - 270px)">
                    <a
                        href="#"
                        @click.prevent.stop="toggleMenu(index)">
                        {{ item.name }}
                    </a>
                </collection-cell>

                <collection-cell
                    width="180px"
                    type="assignment">
                    <dropdown
                        :id="'menu-select-' + index"
                        :items="availableMenus"
                        :selected="item.position"
                        :noBorder="true"
                        :disabledValues="usedMenus"
                        @change.native="changeMenu($event, index)">
                    </dropdown>
                </collection-cell>

                <collection-cell
                    textAlign="center"
                    width="50px">
                    <a
                        @click.prevent.stop="toggleMenu(index)"
                        href="#">
                        {{ countMenuItems(item.items) }}
                    </a>
                </collection-cell>

                <div
                    v-if="menuIsOpened(index)"
                    class="item-content">
                    <p-button
                        type="primary small"
                        @click.native="addMenuItem(index)">
                        Add menu item
                    </p-button>
                    <p-button
                        type="small"
                        @click.native="editMenuName(item.name, index)">
                        Edit menu name
                    </p-button>

                    <div class="menu-content">
                        <em
                            v-if="!item.items.length"
                            class="menu-empty-list">
                            There are no menu items; create new ones via the "Add menu item" button above.
                        </em>

                        <draggable
                            v-if="item.items.length"
                            tag="ol"
                            group="menu-items"
                            chosenClass="is-chosen"
                            ghostClass="is-ghost"
                            class="menu-item-list"
                            v-model="$store.state.currentSite.menuStructure[index].items"
                            :key="'draggable-menu-items-levle0-' + index"
                            @update="listItemUpdated($event, index)"
                            @add="listItemAdded($event, index)">
                            <menu-item
                                v-for="(subitem, subindex) in item.items"
                                :key="getUID()"
                                :itemData="subitem"
                                :itemMenuID="index"
                                :itemOrder="subindex" />
                        </draggable>
                    </div>
                </div>
            </collection-row>
        </collection>

        <empty-state
            v-if="showEmptyState"
            imageName="menus.svg"
            imageWidth="344"
            imageHeight="286"
            title="No menus available"
            description="You don't have any menu, yet. Let's create the first one!">
            <p-button
                slot="button"
                icon="add-site-mono"
                type="icon"
                :onClick="showAddMenuForm">
                Add menu
            </p-button>
        </empty-state>

        <transition>
            <menu-item-editor v-if="editorVisible" />
        </transition>
    </section>
</template>

<script>
import { ipcRenderer } from 'electron';
import Draggable from 'vuedraggable';
import MenuItem from './MenuItem.vue';
import MenuItemEditor from './MenuItemEditor.vue';
import CollectionCheckboxes from './mixins/CollectionCheckboxes.js';

export default {
    name: 'menus',
    mixins: [
        CollectionCheckboxes
    ],
    components: {
        'draggable': Draggable,
        'menu-item': MenuItem,
        'menu-item-editor': MenuItemEditor
    },
    data () {
        return {
            editorVisible: false,
            filterValue: '',
            selectedItems: [],
            openedItems: [],
            openedEditForms: []
        };
    },
    computed: {
        items () {
            return this.$store.state.currentSite.menuStructure;
        },
        showEmptyState: function() {
            return !this.items.length;
        },
        availableMenus () {
            let menus = JSON.parse(JSON.stringify(this.$store.state.currentSite.themeSettings.menus));
            menus[''] = 'Unassigned';
            return menus;
        },
        usedMenus () {
            return this.items.map(item => item.position);
        }
    },
    mounted () {
        this.$bus.$on('hide-menu-item-editor', () => {
            this.editorVisible = false;
        });

        this.$bus.$on('show-menu-item-editor-from-submenu', () => {
            this.editorVisible = true;
        });

        this.$bus.$on('save-new-menu-structure', () => {
            this.saveNewMenuStructure();
        });
    },
    methods: {
        toggleMenu (index) {
            if (this.openedItems.indexOf(index) === -1) {
                this.openedItems.push(index);
            } else {
                let position = this.openedItems.indexOf(index);
                this.openedItems.splice(position, 1);
            }
        },
        showAddMenuForm () {
            this.$bus.$emit('confirm-display', {
                hasInput: true,
                message: 'Provide a name for your new menu:',
                okClick: (result) => this.addNewMenu(result),
                okLabel: 'Create new menu'
            });
        },
        addNewMenu (newMenuName) {
            if(newMenuName !== '') {
                if(this.menuNameIsUnique(newMenuName)) {
                    this.$store.commit('addNewMenu', newMenuName);
                    this.saveNewMenuStructure();

                    this.$bus.$emit('message-display', {
                        message: 'New menu has been created',
                        type: 'success',
                        lifeTime: 3
                    });
                } else {
                    this.$bus.$emit('message-display', {
                        message: 'The menu name supplied already exists. Please use a different name.',
                        type: 'warning',
                        lifeTime: 3
                    });
                }
            } else {
                this.$bus.$emit('message-display', {
                    message: 'The menu name field must be non-empty. Please create a new menu again.',
                    type: 'warning',
                    lifeTime: 3
                });
            }
        },
        menuNameIsUnique(name, oldName = false) {
            for(let i = 0; i < this.$store.state.currentSite.menuStructure.length; i++) {
                if(oldName) {
                    if(name === this.$store.state.currentSite.menuStructure[i].name && name !== oldName) {
                        return false;
                    }
                } else if(name === this.$store.state.currentSite.menuStructure[i].name) {
                    return false;
                }
            }

            return true;
        },
        changeMenu (event, menuIndex) {
            let newValue = event.target.value;

            this.$store.commit('setMenuPosition', {
                index: menuIndex,
                position: newValue
            });

            this.saveNewMenuStructure();
        },
        menuIsOpened (index) {
            return this.openedItems.indexOf(index) > -1;
        },
        addMenuItem (index) {
            this.editorVisible = true;

            setTimeout(() => {
                this.$bus.$emit('show-menu-item-editor', {
                    menuID: index
                });
            }, 0);
        },
        editMenuName (oldName, index) {
            this.$bus.$emit('confirm-display', {
                hasInput: true,
                message: 'Provide a new name for the selected menu:',
                okClick: (result) => this.changeMenuName(result, index),
                okLabel: 'Edit menu name',
                defaultText: oldName
            });
        },
        changeMenuName (newMenuName, index) {
            if(newMenuName !== '') {
                if(this.menuNameIsUnique(newMenuName)) {
                    this.$store.commit('editMenuName', {
                        newName: newMenuName,
                        index: index
                    });
                    this.saveNewMenuStructure();

                    this.$bus.$emit('message-display', {
                        message: 'Menu name has been edited',
                        type: 'success',
                        lifeTime: 3
                    });
                } else {
                    this.$bus.$emit('message-display', {
                        message: 'The menu name is in use. Please try to change a menu name again.',
                        type: 'warning',
                        lifeTime: 3
                    });
                }
            } else {
                this.$bus.$emit('message-display', {
                    message: 'The field menu name should not be left empty. Please edit a menu name again.',
                    type: 'warning',
                    lifeTime: 3
                });
            }
        },
        bulkDelete () {
            this.$bus.$emit('confirm-display', {
                message: 'Do you really want to remove selected menus?',
                okClick: this.deleteSelected
            });
        },
        deleteSelected () {
            let itemsToRemove = this.getSelectedItems(false);

            this.$store.commit('deleteMenuByIDs', itemsToRemove);
            this.saveNewMenuStructure();

            this.$bus.$emit('message-display', {
                message: 'Selected menus have been removed',
                type: 'success',
                lifeTime: 3
            });
        },
        saveNewMenuStructure () {
            ipcRenderer.send('app-menu-update', {
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
        getUID () {
            return Math.random().toString(36).substr(2, 9);
        },
        listItemUpdated (e, menuID) {
            this.saveNewMenuStructure();
        },
        listItemAdded (e) {
            this.saveNewMenuStructure();
        }
    },
    beforeDestroy () {
        this.$bus.$off('hide-menu-item-editor');
        this.$bus.$off('show-menu-item-editor-from-submenu');
        this.$bus.$off('save-new-menu-structure');
    }
}
</script>

<style lang="scss" scoped>
@import '../scss/variables.scss';

.menu {
    overflow: auto;
    overflow-x: hidden!important;

    &.no-scroll {
        overflow: hidden;
    }

    select {
        width: 15rem;
    }

    .item-content {
        border-top: 1px solid $color-8;
        overflow: hidden;
        padding: 3rem 0 3rem 3rem;
        width: 100%;
    }

    .col.assignment {
        padding: 0;
    }

    .menu-content {
        margin: 2.5rem 0 0 0;
    }

    .menu-item-list {
        list-style-type: none;
        margin: .25 * $spacing 0;
        padding: 0;
    }

    &-empty-list {
        display: block;
        text-align: center;
    }
}

.menu-item-editor-wrapper {
    right: 0;

    &.v-enter-active,
    &.v-leave-active {
        transition: all .25s ease;
    }

    &.v-enter,
    &.v-leave-to {
        right: -55rem;
    }

    &.v-enter-to,
    &.v-leave {
        right: 0;
    }
}
</style>
