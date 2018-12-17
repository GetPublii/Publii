<template>
    <section :class="{ 'content': true, 'no-scroll': editorVisible }">
        <p-header
            v-if="!showEmptyState"
            title="Tags">
            <header-search
                slot="search"
                placeholder="Filter or search tags..."
                onChangeEventName="tags-filter-value-changed" />

            <p-button
                :onClick="addTag"
                slot="buttons"
                type="primary icon"
                icon="add-site-mono">
                Add new tag
            </p-button>
        </p-header>

        <collection
            v-if="!emptySearchResults && hasTags">
            <collection-header slot="header">
                <collection-cell width="40px">
                    <checkbox
                        value="all"
                        :checked="anyCheckboxIsSelected"
                        :onClick="toggleAllCheckboxes.bind(this, false)" />
                </collection-cell>

                <collection-cell 
                    width="calc(100% - 140px)"
                    @click.native="ordering('name')">
                    <template v-if="orderBy === 'name'">
                        <strong>Name</strong>
                    </template>
                    <template v-else>Name</template>

                    <span class="order-descending" v-if="orderBy === 'name' && order === 'DESC'"></span>
                    <span class="order-ascending" v-if="orderBy === 'name' && order === 'ASC'"></span>
                </collection-cell>

                <collection-cell 
                    width="60px"
                    @click.native="ordering('postsCounter')">
                    <template v-if="orderBy === 'postsCounter'">
                        <strong>Posts</strong>
                    </template>
                    <template v-else>Posts</template>

                    <span class="order-descending" v-if="orderBy === 'postsCounter' && order === 'DESC'"></span>
                    <span class="order-ascending" v-if="orderBy === 'postsCounter' && order === 'ASC'"></span>
                </collection-cell>

                <collection-cell 
                    textAlign="right"
                    width="40px"
                    @click.native="ordering('id')">
                    <template v-if="orderBy === 'id'">
                        <strong>ID</strong>
                    </template>
                    <template v-else>ID</template>

                    <span class="order-descending" v-if="orderBy === 'id' && order === 'DESC'"></span>
                    <span class="order-ascending" v-if="orderBy === 'id' && order === 'ASC'"></span>
                </collection-cell>

                <div
                    v-if="anyCheckboxIsSelected"
                    class="tools">
                    <p-button
                        icon="trash"
                        type="small danger icon"
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
                        :value="item.id"
                        :checked="isChecked(item.id)"
                        :onClick="toggleSelection" />
                </collection-cell>

                <collection-cell width="calc(100% - 140px)">
                    <a
                        href="#"
                        @click.prevent.stop="editTag(item)">
                        {{ item.name }}
                    </a>
                </collection-cell>

                <collection-cell
                    textAlign="center"
                    width="60px">
                    <a
                        @click.prevent.stop="showPostsConnectedWithTag(item.name)"
                        href="#">
                        {{ item.postsCounter }}
                    </a>
                </collection-cell>

                <collection-cell
                    textAlign="right"
                    width="40px">
                    {{ item.id }}
                </collection-cell>
            </collection-row>
        </collection>

        <empty-state
            v-if="emptySearchResults"
            description="There are no tags matching your criteria."></empty-state>

        <empty-state
            v-if="showEmptyState"
            imageName="tags.svg"
            imageWidth="254"
            imageHeight="284"
            title="No tags available"
            description="You don't have any tag, yet. Let's fix that!">
            <p-button
                slot="button"
                icon="add-site-mono"
                type="icon"
                :onClick="addTag">
                Add new tag
            </p-button>
        </empty-state>

        <transition>
            <tag-form v-if="editorVisible" />
        </transition>
    </section>
</template>

<script>
import { ipcRenderer } from 'electron';
import TagForm from './TagForm';
import CollectionCheckboxes from './mixins/CollectionCheckboxes.js';

export default {
    name: 'tags',
    mixins: [
        CollectionCheckboxes
    ],
    components: {
        'tag-form': TagForm
    },
    data: function() {
        return {
            editorVisible: false,
            filterValue: '',
            orderBy: this.$store.state.ordering.tags.orderBy,
            order: this.$store.state.ordering.tags.order,
            selectedItems: []
        };
    },
    computed: {
        items: function() {
            return this.$store.getters.siteTags(this.filterValue, this.orderBy, this.order);
        },
        hasTags: function() {
            return this.$store.state.currentSite.tags && !!this.$store.state.currentSite.tags.length;
        },
        showEmptyState: function() {
            return !this.hasTags;
        },
        emptySearchResults: function() {
            return this.filterValue !== '' && !this.items.length;
        }
    },
    mounted: function() {
        this.orderBy = this.$store.state.ordering.tags.orderBy;
        this.order = this.$store.state.ordering.tags.order;

        this.$bus.$on('tags-filter-value-changed', (newValue) => {
            this.filterValue = newValue.trim().toLowerCase();
        });

        this.$bus.$on('hide-tag-item-editor', () => {
            this.editorVisible = false;
        });

        this.$bus.$on('site-switched', () => {
            setTimeout(() => {
                this.orderBy = this.$store.state.ordering.tags.orderBy;
                this.order = this.$store.state.ordering.tags.order;
            }, 500);
        });
    },
    methods: {
        addTag () {
            this.$bus.$on('show-tag-item-editor', () => ({
                id: 0,
                name: '',
                slug: '',
                description: '',
                additionalData: {
                    metaTitle: '',
                    metaDescription: '',
                    template: ''
                }
            }));

            this.editorVisible = true;
        },
        editTag (item) {
            this.editorVisible = true;

            setTimeout(() => {
                this.$bus.$emit('show-tag-item-editor', item);
            }, 100);
        },
        bulkDelete () {
            this.$bus.$emit('confirm-display', {
                message: 'Do you really want to remove selected tags?',
                okClick: this.deleteSelected
            });
        },
        deleteSelected () {
            let itemsToRemove = this.getSelectedItems();

            ipcRenderer.send('app-tag-delete', {
                "site": this.$store.state.currentSite.config.name,
                "ids": itemsToRemove
            });

            ipcRenderer.once('app-tag-deleted', () => {
                this.$store.commit('removeTags', itemsToRemove);
                this.selectedItems = [];

                this.$bus.$emit('message-display', {
                    message: 'Selected tags have been removed',
                    type: 'success',
                    lifeTime: 3
                });
            });
        },
        showPostsConnectedWithTag (name) {
            let siteName = this.$store.state.currentSite.config.name;
            localStorage.setItem('publii-posts-search-value', 'tag:' + name);
            this.$router.push({ path: '/site/' + siteName + '/posts' });
        },
        ordering (field) {
            if (field !== this.orderBy) {
                this.orderBy = field;
                this.order = 'DESC';
            } else {
                if (this.order === 'DESC') {
                    this.order = 'ASC';
                } else {
                    this.order = 'DESC';
                }
            }

            this.$store.commit('setOrdering', {
                type: 'tags',
                orderBy: this.orderBy,
                order: this.order
            });
        }
    },
    beforeDestroy () {
        this.$bus.$off('tags-filter-value-changed');
        this.$bus.$off('hide-tag-item-editor');
        this.$bus.$off('show-tag-item-editor');
    }
}
</script>

<style lang="scss" scoped>
@import '../scss/variables.scss';

.content {
    overflow-x: hidden!important;

    &.no-scroll {
        overflow: hidden;
    }

    .header {
        .col {
            cursor: pointer;
        }
    }

    .order-ascending,
    .order-descending {
        &:after {
            border: 8px solid $color-7;
            border-left-width: 4px;
            border-right-width: 4px;
            border-left-color: transparent;
            border-right-color: transparent;
            border-top-color: transparent;
            content: "";
            display: inline-block;
            height: 0;
            opacity: .75;
            position: relative;
            top: -2px;
            width: 0;
        }
    }

    .order-descending {
        &:after {
            border-bottom-color: transparent;
            border-top-color: $color-7;
            top: 6px;
        }
    }
}

.tag-form-wrapper {
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
