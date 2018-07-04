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
                    title="Linked item is not rendered (empty tag/author page), not exists or is trashed" />

                <icon
                    v-if="isDraft"
                    name="draft-post"
                    size="xs"
                    class="draft-icon"
                    primary-color="color-7"
                    title="This post is a draft" />
            </span>

            <a
                href="#"
                class="menu-item-remove"
                title="Delete this menu item"
                @click.prevent="removeMenuItem">
                <icon
                    name="trash"
                    size="xs"
                    primary-color="color-3" />
            </a>

            <a
                href="#"
                class="menu-item-edit"
                title="Edit this menu item"
                @click.prevent="editMenuItem">Edit</a>

            <a
                href="#"
                class="menu-item-submenu"
                title="Add submenu item"
                @click.prevent="addSubmenuItem()">Add submenu</a>
        </div>

        <draggable
            element="ol"
            :options="{ group: 'menu-items', chosenClass: 'is-chosen', ghostClass: 'is-ghost'  }"
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
                return "Linked item is not rendered (empty tag/author page), not exists or is trashed";
            }

            if (this.isDraft) {
                return "Linked item is a draft";
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
    },
    methods: {
        elementExists () {
            if(this.type !== 'post' && this.type !== 'tag'/* && this.type !== 'author'*/) {
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

            /*if(this.type === 'author') {
                validItems = AST.currentSite.authors.filter(
                    author => author.id == elementID
                );

                if(!AST.currentSite.config.advanced.displayEmptyAuthors) {
                    let assignedPosts = AST.currentSite.postsAuthors.filter(
                        postAuthor => postAuthor.authorID == elementID
                    );

                    if (assignedPosts.length === 0) {
                        return false;
                    }
                }
            }*/

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
                    link: this.link
                });
            }, 50);
        },
        removeMenuItem () {
            this.$bus.$emit('confirm-display', {
                message: 'Do you really want to remove selected menu item?',
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
        border: 1px dashed $color-8;

        & > .menu-item-wrapper {
            opacity: 0;
        }
    }

    &.is-invalid {
        & > .menu-item-wrapper > .menu-item-label {
            color: $color-3;
            text-decoration: line-through;
        }
    }

    &.is-draft {
        .menu-item-label {
            color: $color-7;
            font-style: italic;

            svg {
                fill: $color-7;
                position: relative;
                top: 2px;
            }
        }
    }

    & > div {
        background: $color-9;
        border-left: 2px solid $color-8;
        cursor: move !important;
        padding: 4 * $spacing 10 * $spacing;

        .menu-item-remove {
            float: right
        }

        .menu-item-edit {
            margin-left: 2rem;
        }

        .menu-item-submenu {
            margin-left: 1rem;
        }

        .menu-item-edit,
        .menu-item-submenu {
            font-size: 1.4rem;
            padding: 1rem .5rem;
        }

        .menu-item-remove {
            padding-left: 0 0 0 .5rem;
        }

        svg {
            fill: $color-3;
            height: 1.6rem;
            pointer-events: none;
            width: 1.6rem;
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
