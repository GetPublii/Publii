<template>
    <section :class="{ 'content': true, 'authors': true, 'no-scroll': editorVisible }">
        <p-header title="Authors">
            <header-search
                slot="search"
                placeholder="Filter or search authors..."
                onChangeEventName="authors-filter-value-changed" />

            <p-button
                :onClick="addAuthor"
                slot="buttons"
                type="primary icon"
                icon="add-site-mono">
                Add new author
            </p-button>
        </p-header>

        <collection v-if="!emptySearchResults">
            <collection-header slot="header">
                <collection-cell width="40px">
                    <checkbox
                        value="all"
                        :checked="anyCheckboxIsSelected"
                        :onClick="toggleAllCheckboxes" />
                </collection-cell>

                <collection-cell width="calc(100% - 180px)">
                    <span 
                        class="col-sortable-title"
                        @click="ordering('name')">
                        <template v-if="orderBy === 'name'">
                            <strong>Name</strong>
                        </template>
                        <template v-else>Name</template>

                        <span class="order-descending" v-if="orderBy === 'name' && order === 'DESC'"></span>
                        <span class="order-ascending" v-if="orderBy === 'name' && order === 'ASC'"></span>
                    </span>
                </collection-cell>

                <collection-cell 
                    justifyContent="center"
                    textAlign="center"
                    width="100px">
                    <span
                        class="col-sortable-title"
                        @click="ordering('postsCounter')">
                        <template v-if="orderBy === 'postsCounter'">
                            <strong>Posts</strong>
                        </template>
                        <template v-else>Posts</template>

                        <span class="order-descending" v-if="orderBy === 'postsCounter' && order === 'DESC'"></span>
                        <span class="order-ascending" v-if="orderBy === 'postsCounter' && order === 'ASC'"></span>
                    </span>
                </collection-cell>

                <collection-cell width="40px">
                    <span 
                        class="col-sortable-title"
                        @click="ordering('id')">
                        <template v-if="orderBy === 'id'">
                            <strong>ID</strong>
                        </template>
                        <template v-else>ID</template>

                        <span class="order-descending" v-if="orderBy === 'id' && order === 'DESC'"></span>
                        <span class="order-ascending" v-if="orderBy === 'id' && order === 'ASC'"></span>
                    </span>
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
                        v-if="item.id !== 1"
                        :value="item.id"
                        :checked="isChecked(item.id)"
                        :onClick="toggleSelection" />

                    <span
                        v-if="item.id === 1"
                        class="main-author-icon"
                        title="This is a main author of this website. It cannot be removed.">
                        <icon
                            size="xs"
                            name="padlock"
                            primaryColor="color-3" />
                    </span>
                </collection-cell>

                <collection-cell width="calc(100% - 180px)">
                    <a
                        href="#"
                        @click.prevent.stop="editAuthor(item)">
                        {{ item.name }}

                        <em
                            v-if="item.id === 1"
                            class="is-main-author">
                            (Main author)
                        </em>
                    </a>
                </collection-cell>

                <collection-cell
                    justifyContent="center"
                    textAlign="center"
                    width="100px">
                    <a
                        @click.prevent.stop="showPostsConnectedWithAuthor(item.name)"
                        href="#">
                        {{ item.postsCounter }}
                    </a>
                </collection-cell>

                <collection-cell 
                    width="40px">
                    {{ item.id }}
                </collection-cell>
            </collection-row>
        </collection>

        <transition>
            <author-form v-if="editorVisible" />
        </transition>

        <empty-state
            v-if="emptySearchResults"
            description="There are no authors matching your criteria."></empty-state>
    </section>
</template>

<script>
import { ipcRenderer } from 'electron';
import AuthorForm from './AuthorForm';
import CollectionCheckboxes from './mixins/CollectionCheckboxes.js';

export default {
    name: 'authors',
    mixins: [
        CollectionCheckboxes
    ],
    components: {
        'author-form': AuthorForm
    },
    data: function() {
        return {
            editorVisible: false,
            filterValue: '',
            selectedItems: [],
            orderBy: 'id',
            order: 'DESC'
        };
    },
    computed: {
        items: function() {
            return this.$store.getters.siteAuthors(this.filterValue, this.orderBy, this.order);
        },
        emptySearchResults: function() {
            return this.filterValue !== '' && !this.items.length;
        }
    },
    mounted: function() {
        this.orderBy = this.$store.state.ordering.authors.orderBy;
        this.order = this.$store.state.ordering.authors.order;

        this.$bus.$on('authors-filter-value-changed', (newValue) => {
            this.filterValue = newValue.trim().toLowerCase();
        });

        this.$bus.$on('hide-author-item-editor', () => {
            this.editorVisible = false;
        });

        this.$bus.$on('site-switched', () => {
            setTimeout(() => {
                this.orderBy = this.$store.state.ordering.authors.orderBy;
                this.order = this.$store.state.ordering.authors.order;
            }, 500);
        });
    },
    methods: {
        addAuthor () {
            this.$bus.$on('show-author-item-editor', () => ({
                id: 0,
                name: '',
                username: '',
                email: '',
                avatar: '',
                useGravatar: false,
                description: '',
                postsCounter: 0,
                metaTitle: '',
                metaDescription: '',
                template: '',
                authorTemplates: [],
                visibleIndexingOptions: false
            }));

            this.editorVisible = true;
        },
        editAuthor (item) {
            this.editorVisible = true;

            setTimeout(() => {
                this.$bus.$emit('show-author-item-editor', item);
            }, 100);
        },
        bulkDelete: function() {
            this.$bus.$emit('confirm-display', {
                message: 'Do you really want to remove selected authors?',
                okClick: this.deleteSelected
            });
        },
        deleteSelected: function() {
            let itemsToRemove = this.getSelectedItems();
            itemsToRemove = itemsToRemove.filter(item => item !== 1);

            if(itemsToRemove.length === 0) {
                this.$bus.$emit('alert-display', {
                    message: 'You cannot remove the main author.'
                });

                return;
            }

            ipcRenderer.send('app-author-delete', {
                "site": this.$store.state.currentSite.config.name,
                "ids": itemsToRemove
            });

            ipcRenderer.once('app-author-deleted', () => {
                this.$store.commit('removeAuthors', itemsToRemove);
                this.selectedItems = [];

                this.$bus.$emit('message-display', {
                    message: 'Selected authors have been removed',
                    type: 'success',
                    lifeTime: 3
                });
            });
        },
        showPostsConnectedWithAuthor: function(name) {
            let siteName = this.$store.state.currentSite.config.name;
            localStorage.setItem('publii-posts-search-value', 'author:' + name);
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
                type: 'authors',
                orderBy: this.orderBy,
                order: this.order
            });
        }
    },
    beforeDestroy () {
        this.$bus.$off('authors-filter-value-changed');
        this.$bus.$off('hide-author-item-editor');
        this.$bus.$off('show-author-item-editor');
    }
}
</script>

<style lang="scss" scoped>
@import '../scss/variables.scss';

.authors {
    overflow-x: hidden!important;

    &.no-scroll {
        overflow: hidden;
    }

    .is-main-author {
        color: $color-7;
    }

    .main-author-icon {
        position: relative;
        top: 2px;
    }

    .header {
        .col {
             align-items: center;
             display: flex;

             .col-sortable-title {
                 cursor: pointer;
             }
        }
    }

    .order-ascending,
    .order-descending {
        position: relative;
        &:after {
             border-top: solid 5px rgba($color-7, .7);
             border-left: solid 5px transparent;
             border-right: solid 5px transparent;
             content: "";
             cursor: pointer;
             display: inline-block;
             height: 4px;
             left: 6px;
             line-height: 1.1;
             opacity: 1;
             padding: 0;
             position: relative;
             text-align: center;
             top: 50%;
             transform: translateY(-50%);
             width: 8px;       
        }
    }

    .order-descending {
        &:after {
            border-top-color: transparent; 
            border-bottom: solid 5px rgba($color-7, .7);                     
        }
    }

    .author-form-wrapper {
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
}
</style>
