<template>
    <li
        :class="cssClasses"
        :data-id="id"
        :title="titleTooltip">
        <div :class="{
            'menu-item-wrapper': true,
            'is-dnd-disabled': !!selectedItem 
        }">
            <span class="menu-item-label">
                {{ label }}

                <icon
                    v-if="isInvalid"
                    name="trash"
                    size="xs"
                    class="removed-icon"
                    primary-color="color-3"
                    :title="$t('menu.likedItemError')" />

                <icon
                    v-if="isDraft"
                    name="draft-post"
                    size="xs"
                    class="draft-icon"
                    strokeColor="color-7"
                    :title="$t('post.thisPostIsADraft')" />

                <icon
                    v-if="isHidden"
                    size="xs"
                    name="hidden-post"
                    class="hidden-icon"
                    strokeColor="color-7"
                    :title="$t('menu.menuItemIsHidden')" />
            </span>

            <a
                v-if="!selectedItem"
                href="#"
                class="menu-item-duplicate"
                :title="$t('menu.duplicateThisMenuItem')"
                @click.prevent="duplicateMenuItem">
                <icon
                    name="duplicate"
                    size="xs" />
            </a>

            <a
                v-if="!selectedItem"
                href="#"
                class="menu-item-remove"
                :title="$t('menu.deleteThisMenuItem')"
                @click.prevent="removeMenuItem">
                <icon
                    name="trash"
                    size="xs" />
            </a>

            <a
                v-if="!selectedItem"
                href="#"
                class="menu-item-edit"
                :title="$t('menu.editThisMenuItem')"
                @click.prevent="editMenuItem">{{ $t('ui.edit') }}</a>

            <a
                v-if="!isHidden && !selectedItem"
                href="#"
                class="menu-item-hide"
                :title="$t('menu.hideThisMenuItem')"
                @click.prevent="hideMenuItem">{{ $t('ui.hide') }}</a>

            <a
                v-if="isHidden && !selectedItem"
                href="#"
                class="menu-item-show"
                :title="$t('menu.showThisMenuItem')"
                @click.prevent="showMenuItem">{{ $t('ui.show') }}</a>

            <a
                v-if="!selectedItem"
                href="#"
                class="menu-item-submenu"
                :title="$t('menu.addSubmenuItem')"
                @click.prevent="addSubmenuItem()">{{ $t('menu.addSubmenu') }}</a>

            <a
                v-if="!selectedItem"
                href="#"
                class="menu-item-select"
                :title="$t('menu.moveItem')"
                @click.prevent="selectItem()">{{ $t('menu.moveItem') }}</a>
            
            <a
                v-if="selectedItem && isSelected"
                href="#"
                class="menu-item-unselect"
                :title="$t('menu.unselectItem')"
                @click.prevent="unselectItem()">
                <icon
                    class="menu-item-move-icon"
                    customWidth="22"
                    customHeight="22"
                    name="sidebar-close"/> {{ $t('menu.unselectItem') }}</a>

            <span 
                v-if="selectedItem && !isSelected && !parentIsSelected"
                class="menu-item-insert-actions">
                {{ $t('menu.insertActions') }}
            </span>

            <a
                v-if="selectedItem && !isSelected && !parentIsSelected"
                href="#"
                class="menu-item-insert-before"
                :title="$t('menu.insertBefore')"
                @click.prevent="insertSelectedItem('before')">
                <icon
                    class="menu-item-move-icon"
                    size="xs"
                    name="move-up"/> {{ $t('menu.insertBefore') }}</a>

            <a
                v-if="selectedItem && !isSelected && !parentIsSelected"
                href="#"
                class="menu-item-insert-after"
                :title="$t('menu.insertAfter')"
                @click.prevent="insertSelectedItem('after')">
                <icon
                    class="menu-item-move-icon"
                    size="xs"
                    name="move-down"/> {{ $t('menu.insertAfter') }}</a>

            <a
                v-if="selectedItem && !isSelected && !parentIsSelected"
                href="#"
                class="menu-item-insert-as-child"
                :title="$t('menu.insertAsChild')"
                @click.prevent="insertSelectedItem('child')">{{ $t('menu.insertAsChild') }} </a>
        </div>

        <draggable
            tag="ol"
            group="menu-items"
            chosenClass="is-chosen"
            ghostClass="is-ghost"
            :class="{ 'menu-item-list': true }"
            v-model="itemsList"
            v-bind="{
                animation: 0,
                forceFallback: true,
                disabled: !!selectedItem
            }"
            :key="'draggable-menu-items-' + id"
            @update="listItemUpdated"
            @add="listItemAdded">
            <menu-item
                v-for="(item, index) in items"
                :key="'item-' + index + '-' + getUID()"
                :itemData="item"
                :itemMenuID="menuID"
                :itemOrder="index"
                :editedID="parseInt(editedID, 10)"
                :selectedItem="selectedItem"
                :parentIsSelected="isSelected || parentIsSelected" />
        </draggable>
    </li>
</template>

<script>
import Draggable from 'vuedraggable';

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
        }
    },
    components: {
        'draggable': Draggable
    },
    data () {
        return {
            menuID: '',
            id: '',
            label: '',
            type: '',
            link: '',
            title: '',
            target: '_self',
            cssClass: '',
            rel: '',
            isHidden: false,
            items: []
        };
    },
    computed: {
        cssClasses () {
            return {
                'menu-item': true,
                'is-edited': this.editedID === this.id,
                'is-invalid': this.isInvalid,
                'is-draft': this.isDraft,
                'is-selected': this.isSelected
            };
        },
        isInvalid () {
            return !this.elementExists();
        },
        isDraft () {
            return this.elementIsDraft();
        },
        titleTooltip () {
            if (this.isInvalid) {
                return this.$t('menu.likedItemError');
            }

            if (this.isDraft) {
                return this.$t('menu.likedItemIsADraft');
            }

            return false;
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
        }
    },
    mounted () {
        this.menuID = this.itemMenuID;
        this.id = this.itemData.id;
        this.label = this.itemData.label;
        this.type = this.itemData.type;
        this.link = this.itemData.link;
        this.title = this.itemData.title;
        this.target = this.itemData.target;
        this.rel = this.itemData.rel;
        this.items = this.itemData.items;
        this.cssClass = this.itemData.cssClass;
        this.isHidden = this.itemData.isHidden || false;
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
        getUID () {
            return Math.random().toString(36).substr(2, 9);
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
                    title: this.title,
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
            this.isHidden = true;

            this.$store.commit('hideMenuItem', {
                itemID: this.id,
                menuID: this.menuID
            });

            this.$bus.$emit('save-new-menu-structure');
        },
        showMenuItem () {
            this.isHidden = false;

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

<style lang="scss" scoped>
@import '../scss/variables.scss';

li {
    border: 1px solid transparent;
    margin-bottom: calc((3 * $spacing) - 2px);
    padding: 0;
    position: relative;
    
    &.is-chosen {
        opacity: .75;
    }

    &.is-selected {
        border: 1px dashed var(--input-border-focus);
    }

    &.is-ghost {
        border: 1px dashed var(--input-border-focus);

        & > .menu-item-wrapper {
            opacity: 0;
        }
    }

    &.is-invalid {
        & > .menu-item-wrapper > .menu-item-label {
            color: var(--warning);
            text-decoration: line-through;
        }
    }

    &.is-draft {
        .menu-item-label {
            color: var(--gray-4);
            font-size: 1.4rem;
            font-style: italic;

            svg {
                fill: var(--gray-4);
                position: relative;
                top: 2px;
            }
        }
    }

    .hidden-icon {
        position: relative;
        top: 2px;
    }

    &.is-edited {
        & > div {
            background: var(--collection-bg-hover);
            border-left: 3px solid var(--color-primary);
        }
    }

    & > div {
        background: var(--collection-bg);
        border: 1px solid var(--border-light-color);
        border-left: 3px solid var(--input-border-color);
        border-radius: 3px;
        cursor: move !important;
        padding: 4 * $spacing 10 * $spacing;
        position: relative;

        &.is-dnd-disabled {
            cursor: auto!important;
        }

        &:hover {
            background: var(--collection-bg-hover);
            border-left: 3px solid var(--color-primary);
        }

        .menu-item-label {
            color: var(--text-primary-color);
            font-size: 1.4rem;
            margin-right: 2rem;
        }

        .menu-item-remove,
        .menu-item-duplicate {
            align-items: center;
            background: var(--bg-primary);
            position: relative;
            border-radius: 50%;
            cursor: pointer;
            display: inline-flex;
            height: 3rem;
            justify-content: center;
            padding: 0;
            position: absolute;
            right: 1.5rem;
            text-align: center;
            transition: all .3s ease-out;
            top: 50%;
            transform: translate(0, -50%);
            width: 3rem;

            &:active,
            &:focus,
            &:hover {
                color: var(--headings-color)
            }

            &:hover {
                & > svg {
                   fill: var(--warning);
                   transform: scale(1);
               }
            }

            svg {
                fill: var(--icon-secondary-color);
                height: 1.6rem;
                pointer-events: none;
                transform: scale(.9);
                transition: var(--transition);
                width: 1.6rem;
            }
        }

        .menu-item-duplicate {
            right: 5rem;

            &:hover {
                & > svg {
                   fill: currentColor;
                   transform: scale(1);
               }
            }
        }

        .menu-item-edit,
        .menu-item-hide,
        .menu-item-show,
        .menu-item-select,
        .menu-item-submenu,
        .menu-item-insert-before,
        .menu-item-insert-after,
        .menu-item-insert-as-child,
        .menu-item-unselect {
            color: var(--link-primary-color);
            display: inline-block;
            font-size: 1.3rem;
            padding: .25rem .5rem;

            &:active,
            &:focus,
            &:hover {
                color: var(--link-primary-color-hover);
            }
        }

        .menu-item-insert-actions {
            color: var(--text-light-color);
            font-size: 1.3rem;
            padding: 1rem .5rem;
        }

        .menu-item-unselect {
            color: var(--warning);

            & > svg {
               fill: var(--warning);
               position: relative;
               right: 3px;
               top: 3px;
            }
        }

        .menu-item-edit,
        .menu-item-hide,
        .menu-item-show,
        .menu-item-submenu,
        .menu-item-insert-before,
        .menu-item-insert-after {
            padding-right: 1rem;
            position: relative;

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

        .menu-item-move-icon {
            vertical-align: text-bottom;
        }

        select {
            height: 2.4rem;
        }
    }

    ol {
        list-style-type: none;
        padding-left: 0;
        margin-left: 15 * $spacing;

        & > li:first-child {
            margin-top: 3 * $spacing;
        }

        &:empty {
            bottom: -6 * $spacing;
            left: 0;
            min-height: 6 * $spacing;
            position: absolute;
            width: 100%;
            z-index: 10;
        }
    }
}
</style>
