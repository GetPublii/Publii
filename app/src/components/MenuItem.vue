<template>
    <li
        :class="cssClasses"
        :data-id="id"
        :title="titleTooltip">
        <div class="menu-item-wrapper">
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
                    primary-color="color-7"
                    :title="$t('post.thisPostIsADraft')" />

                <icon
                    v-if="isHidden"
                    size="xs"
                    name="hidden-post"
                    class="hidden-icon"
                    primaryColor="color-7"
                    :title="$t('menu.menuItemIsHidden')" />
            </span>

            <a
                href="#"
                class="menu-item-remove"
                :title="$t('menu.deleteThisMenuItem')"
                @click.prevent="removeMenuItem">
                <icon
                    name="trash"
                    size="xs" />
            </a>

            <a
                href="#"
                class="menu-item-edit"
                :title="$t('menu.editThisMenuItem')"
                @click.prevent="editMenuItem">{{ $t('ui.edit') }}</a>

            <a
                v-if="!isHidden"
                href="#"
                class="menu-item-hide"
                :title="$t('menu.hideThisMenuItem')"
                @click.prevent="hideMenuItem">{{ $t('ui.hide') }}</a>

            <a
                v-if="isHidden"
                href="#"
                class="menu-item-show"
                :title="$t('menu.showThisMenuItem')"
                @click.prevent="showMenuItem">{{ $t('ui.show') }}</a>

            <a
                href="#"
                class="menu-item-submenu"
                :title="$t('menu.addSubmenuItem')"
                @click.prevent="addSubmenuItem()">{{ $t('menu.addSubmenu') }}</a>
        </div>

        <draggable
            tag="ol"
            group="menu-items"
            chosenClass="is-chosen"
            ghostClass="is-ghost"
            :class="{ 'menu-item-list': true }"
            v-model="itemsList"
            :key="'draggable-menu-items-' + id"
            @update="listItemUpdated"
            @add="listItemAdded">
            <menu-item
                v-for="(item, index) in items"
                :key="getUID()"
                :itemData="item"
                :itemMenuID="menuID"
                :itemOrder="index" />
        </draggable>
    </li>
</template>

<script>
import Vue from 'vue';
import Draggable from 'vuedraggable';

export default {
    name: 'menu-item',
    props: {
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
                'is-invalid': this.isInvalid,
                'is-draft': this.isDraft
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
            if(this.type !== 'post' && this.type !== 'tag' && this.type !== 'author') {
                return true;
            }

            let validItems = [];

            if(this.type === 'post') {
                validItems = this.$store.state.currentSite.posts.filter(
                    post => post.id == this.link && post.status.indexOf('trashed') === -1
                );
            }

            if(this.type === 'tag') {
                validItems = this.$store.state.currentSite.tags.filter(
                    tag => tag.id == this.link
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

            if(this.type === 'author') {
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
            if(this.type !== 'post') {
                return false;
            }

            let draftItems = [];

            if(this.type === 'post') {
                draftItems = this.$store.state.currentSite.posts.filter(
                    post => post.id == this.link && post.status.indexOf('draft') > -1
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
            this.$bus.$emit('show-menu-item-editor-from-submenu');

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
        removeMenuItem () {
            this.$bus.$emit('confirm-display', {
                message: this.$t('menu.menuIemsRemoveMessage'),
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
        }
    }
}
</script>

<style lang="scss" scoped>
@import '../scss/variables.scss';

li {
    margin-bottom: 3 * $spacing;
    padding: 0;
    position: relative;

    &.is-chosen {
        opacity: .75;
    }

    &.is-ghost {
        border: 1px dashed #42a5f5;

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

    & > div {
        background: var(--gray-1);
        border-left: 2px solid var(--input-border-color);
        border-radius: 3px;
        cursor: move !important;
        padding: 4 * $spacing 10 * $spacing;
        position: relative;

        &:hover {
            background: var(--gray-6);
        }

        .menu-item-label {
            color: var(--text-primary-color);
            margin-right: 2rem;
        }

        .menu-item-remove {
            background: var(--bg-primary);
            position: relative;
            border-radius: 50%;
            cursor: pointer;
            display: inline-block;
            height: 3rem;
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
                vertical-align: middle;
                width: 1.6rem;
            }
        }

        .menu-item-edit,
        .menu-item-hide,
        .menu-item-show,
        .menu-item-submenu {
            color: var(--link-primary-color);
            font-size: 1.4rem;
            padding: 1rem .5rem;

            &:active,
            &:focus,
            &:hover {
                color: var(--link-primary-hover-color);
            }
        }

        .menu-item-edit,
        .menu-item-hide,
        .menu-item-show {
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

        select {
            height: 2.4rem;
        }
    }

    ol {
        list-style-type: none;
        padding-left: 10 * $spacing;

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
