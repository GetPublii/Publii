<template>
    <section class="content">
        <p-header
            v-if="hasPosts"
            title="Posts">
            <header-search
                slot="search"
                ref="search"
                placeholder="Filter or search posts..."
                onChangeEventName="posts-filter-value-changed" />

            <p-button
                :onClick="addNewPost"
                slot="buttons"
                type="primary icon"
                icon="add-site-mono">
                Add new post
            </p-button>
        </p-header>

        <ul
            v-if="hasPosts"
            class="filters">
            <li
                :class="filterCssClasses('all')"
                @click="setFilter('')">
                All <span class="filter-count">({{ counters.all }})</span>
            </li>

            <li
                :class="filterCssClasses('published')"
                @click="setFilter('is:published')">
                Published <span class="filter-count">({{ counters.published }})</span>
            </li>

            <li
                v-if="counters.featured"
                :class="filterCssClasses('featured')"
                @click="setFilter('is:featured')">
                Featured <span class="filter-count">({{ counters.featured }})</span>
            </li>

            <li
                v-if="counters.hidden"
                :class="filterCssClasses('hidden')"
                @click="setFilter('is:hidden')">
                Hidden <span class="filter-count">({{ counters.hidden }})</span>
            </li>

            <li
                v-if="counters.drafts"
                :class="filterCssClasses('draft')"
                @click="setFilter('is:draft')">
                Drafts <span class="filter-count">({{ counters.drafts }})</span>
            </li>

            <li
                v-if="counters.trashed"
                :class="filterCssClasses('trashed')"
                @click="setFilter('is:trashed')">
                Trashed <span class="filter-count">({{counters.trashed }})</span>
            </li>
        </ul>

        <collection v-if="!emptySearchResults && hasPosts">
            <collection-header slot="header">
                <collection-cell width="40px">
                    <checkbox
                        value="all"
                        :checked="anyCheckboxIsSelected"
                        :onClick="toggleAllCheckboxes.bind(this, false)" />
                </collection-cell>

                <collection-cell 
                    width="calc(100% - 480px)"
                    @click.native="ordering('title')">
                    <template v-if="orderBy === 'title'">
                        <strong>Title</strong>
                    </template>
                    <template v-else>Title</template>

                    <span class="order-descending" v-if="orderBy === 'title' && order === 'DESC'"></span>
                    <span class="order-ascending" v-if="orderBy === 'title' && order === 'ASC'"></span>
                </collection-cell>

                <collection-cell 
                    width="200px"
                    @click.native="ordering('created')">
                    <template v-if="orderBy === 'created'">
                        <strong>Publication date</strong>
                    </template>
                    <template v-else>Publication date</template>

                    <span class="order-descending" v-if="orderBy === 'created' && order === 'DESC'"></span>
                    <span class="order-ascending" v-if="orderBy === 'created' && order === 'ASC'"></span>
                </collection-cell>

                <collection-cell 
                    width="200px"
                    @click.native="ordering('author')">
                    <template v-if="orderBy === 'author'">
                        <strong>Author</strong>
                    </template>
                    <template v-else>Author</template>

                    <span class="order-descending" v-if="orderBy === 'author' && order === 'DESC'"></span>
                    <span class="order-ascending" v-if="orderBy === 'author' && order === 'ASC'"></span>
                </collection-cell>

                <collection-cell 
                    
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
                        v-if="trashVisible"
                        icon="trash"
                        type="small danger icon"
                        :onClick="bulkDelete">
                        Delete
                    </p-button>

                    <p-button
                        v-if="trashVisible"
                        type="small primary"
                        :onClick="bulkRestore">
                        Restore
                    </p-button>

                    <p-button
                        v-if="!trashVisible"
                        icon="trash"
                        type="small danger icon"
                        :onClick="bulkTrash">
                        Move to trash
                    </p-button>

                    <p-button
                        v-if="!trashVisible"
                        type="small primary"
                        :onClick="bulkPublish">
                        Publish
                    </p-button>

                    <p-button
                        v-if="!trashVisible"
                        type="small outline"
                        :onClick="bulkUnpublish">
                        Unpublish
                    </p-button>

                    <p-button
                        v-if="!trashVisible"
                        type="small secondary"
                        :onClick="bulkDuplicate">
                        Duplicate
                    </p-button>
                </div>
            </collection-header>

            <collection-row
                v-for="(item, index) in items"
                slot="content"
                :data-is-draft="item.isDraft"
                :key="index">
                <collection-cell width="40px">
                    <checkbox
                        :value="item.id"
                        :checked="isChecked(item.id)"
                        :onClick="toggleSelection" />
                </collection-cell>

                <collection-cell
                    type="titles"
                    width="calc(100% - 480px)">
                    <h2 class="title">
                        <a
                            href="#"
                            @click.prevent.stop="editPost(item.id)">
                            <icon
                                v-if="item.isTrashed"
                                size="xs"
                                name="trash"
                                primaryColor="color-7"
                                title="This post is trashed" />

                            {{ item.title }}

                            <icon
                                v-if="item.isFeatured"
                                size="xs"
                                name="featured-post"
                                primaryColor="color-helper-6"
                                title="This post is featured" />
                            <icon
                                v-if="item.isHidden"
                                size="xs"
                                name="hidden-post"
                                primaryColor="color-7"
                                title="This post is hidden" />
                            <icon
                                v-if="item.isDraft"
                                size="xs"
                                name="draft-post"
                                primaryColor="color-7"
                                title="This post is a draft" />
                        </a>
                    </h2>

                    <template v-if="item.tags">
                        <a
                            v-for="tag in item.tags"
                            href="#"
                            class="tag"
                            :key="'tag-' + tag.id"
                            @click.post.prevent="setFilter('tag:' + tag.name)">
                            #{{ tag.name }}
                        </a>
                    </template>
                </collection-cell>

                <collection-cell
                    type="publish-dates"
                    width="200px">
                    <span class="publish-date">{{ getCreationDate(item.created) }}</span>
                    <span class="modify-date">
                        Last modified: {{ getModificationDate(item.modified) }}
                    </span>
                </collection-cell>

                <collection-cell
                    type="authors"
                    width="200px">
                    <a
                        href="#"
                        @click.prevent.stop="setFilter('author:' + item.author)">
                        {{ item.author }}
                    </a>
                </collection-cell>

                <collection-cell
                    width="40px">
                    {{ item.id }}
                </collection-cell>
            </collection-row>
        </collection>

        <empty-state
            v-if="emptySearchResults"
            description="There are no posts matching your criteria."></empty-state>

        <empty-state
            v-if="!hasPosts"
            imageName="posts.svg"
            imageWidth="254"
            imageHeight="284"
            title="No posts available"
            description="You don't have any post, yet. Let's fix that!">
            <p-button
                slot="button"
                icon="add-site-mono"
                type="icon"
                :onClick="addNewPost">
                Add new post
            </p-button>
        </empty-state>
    </section>
</template>

<script>
import { ipcRenderer } from 'electron';
import CollectionCheckboxes from './mixins/CollectionCheckboxes.js';

export default {
    name: 'posts',
    mixins: [
        CollectionCheckboxes
    ],
    data: function() {
        return {
            filterValue: '',
            selectedItems: [],
            orderBy: 'id',
            order: 'DESC'
        };
    },
    computed: {
        items: function() {
            let items = this.$store.getters.sitePosts(this.filterValue, this.orderBy, this.order);

            items.forEach((item, i) => {
                if (item.tags.length) {
                    item.tags.sort((tagA, tagB) => {
                        if(tagA.name.toLowerCase() < tagB.name.toLowerCase()) {
                            return -1;
                        }

                        if(tagA.name.toLowerCase() > tagB.name.toLowerCase()) {
                            return 1;
                        }

                        return 0;
                    });
                }
            });

            return items;
        },
        hasPosts: function() {
            return this.$store.state.currentSite.posts && !!this.$store.state.currentSite.posts.length;
        },
        emptySearchResults: function() {
            return this.filterValue !== '' && !this.items.length;
        },
        trashVisible: function() {
            return this.filterValue.indexOf('is:trashed') > -1;
        },
        counters: function() {
            if(!this.$store.state.currentSite || !this.$store.state.currentSite.posts) {
                return {
                    all: 0,
                    published: 0,
                    featured: 0,
                    hidden: 0,
                    drafts: 0,
                    trashed: 0
                };
            }

            return {
                all: this.$store.state.currentSite.posts.filter((post) => post.status.indexOf('trashed') === -1).length,
                published: this.$store.state.currentSite.posts.filter((post) => post.status.indexOf('trashed') === -1 && post.status.indexOf('draft') === -1).length,
                featured: this.$store.state.currentSite.posts.filter((post) => post.status.indexOf('trashed') === -1 && post.status.indexOf('featured') > -1).length,
                hidden: this.$store.state.currentSite.posts.filter((post) => post.status.indexOf('trashed') === -1 && post.status.indexOf('hidden') > -1).length,
                drafts: this.$store.state.currentSite.posts.filter((post) => post.status.indexOf('trashed') === -1 && post.status.indexOf('draft') > -1).length,
                trashed: this.$store.state.currentSite.posts.filter((post) => post.status.indexOf('trashed') > -1).length
            }
        }
    },
    mounted: function() {
        this.orderBy = this.$store.state.ordering.posts.orderBy;
        this.order = this.$store.state.ordering.posts.order;

        this.$bus.$on('site-loaded', this.whenSiteLoaded);

        this.$bus.$on('posts-filter-value-changed', (newValue) => {
            this.filterValue = newValue.trim().toLowerCase();
        });

        // It is available when user comes from Tags/Authors views
        let newFilterValue = localStorage.getItem('publii-posts-search-value');

        if(newFilterValue) {
            localStorage.removeItem('publii-posts-search-value');
            setTimeout (() => {
                this.setFilter(newFilterValue);
            }, 0);
        }

        this.$bus.$on('site-switched', () => {
            setTimeout(() => {
                this.orderBy = this.$store.state.ordering.posts.orderBy;
                this.order = this.$store.state.ordering.posts.order;
            }, 500);
        });
    },
    methods: {
        addNewPost: function() {
            let siteName = this.$route.params.name;
            this.$store.commit('setEditorOpenState', true);
            this.$router.push('/site/' + siteName + '/posts/editor/');
        },
        editPost: function(id) {
            let siteName = this.$route.params.name;

            if(this.filterValue.trim() !== '') {
                localStorage.setItem('publii-posts-search-value', this.filterValue);
            }

            this.$store.commit('setEditorOpenState', true);
            this.$router.push('/site/' + siteName + '/posts/editor/' + id);

            return false;
        },
        setFilter: function(newValue) {
            if (this.$refs.search) {
                this.$refs.search.isOpen = newValue !== '';
                this.$refs.search.value = newValue;
                this.$refs.search.updateValue();
            }
        },
        filterCssClasses: function(type) {
            if(type !== 'all') {
                return {
                    'filter-value': true,
                    'filter-active': this.filterValue.indexOf('is:' + type) === 0
                };
            }

            return {
                'filter-value': true,
                'filter-active': this.filterValue.indexOf('is:') === -1
            };
        },
        getModificationDate: function(timestamp) {
            return this.$moment(timestamp).fromNow();
        },
        getCreationDate: function(timestamp) {
            if(this.$store.state.app.config.timeFormat == 12) {
                return this.$moment(timestamp).format('MMM DD, YYYY  hh:mm a');
            } else {
                return this.$moment(timestamp).format('MMM DD, YYYY  HH:mm');
            }
        },
        bulkDelete: function() {
            this.$bus.$emit('confirm-display', {
                message: 'Do you really want to remove selected posts? It cannot be undone.',
                okClick: this.deleteSelected
            });
        },
        deleteSelected: function() {
            let itemsToRemove = this.getSelectedItems();

            ipcRenderer.send('app-post-delete', {
                "site": this.$store.state.currentSite.config.name,
                "ids": itemsToRemove
            });

            ipcRenderer.once('app-post-deleted', () => {
                this.$store.commit('removePosts', itemsToRemove);
                this.selectedItems = [];

                this.$bus.$emit('message-display', {
                    message: 'Selected posts have been removed',
                    type: 'success',
                    lifeTime: 3
                });

                if (this.counters.trashed === 0) {
                    this.filterValue = '';
                }
            });
        },
        bulkTrash: function() {
            this.changeStateForSelected('trashed');
        },
        bulkPublish: function() {
            this.changeStateForSelected('published');
            this.changeStateForSelected('draft', true);
        },
        bulkUnpublish: function() {
            this.changeStateForSelected('published', true);
            this.changeStateForSelected('draft');
        },
        bulkDuplicate: function() {
            let itemsToDuplicate = this.getSelectedItems();

            ipcRenderer.send('app-post-duplicate', {
                "site": this.$store.state.currentSite.config.name,
                "ids": itemsToDuplicate
            });

            ipcRenderer.once('app-post-duplicated', (data) => {
                if(!data) {
                    this.$bus.$emit('message-display', {
                        message: 'An error occured during duplicating of selected posts. Please try again.',
                        type: 'warning',
                        lifeTime: 3
                    });

                    return;
                } else {
                    this.$bus.$emit('message-display', {
                        message: 'Selected posts have been duplicated',
                        type: 'success',
                        lifeTime: 3
                    });
                }

                this.selectedItems = [];

                ipcRenderer.send('app-site-reload', {
                    siteName: this.$store.state.currentSite.config.name
                });

                ipcRenderer.once('app-site-reloaded', (event, result) => {
                    this.$store.commit('setSiteConfig', result);
                    this.$store.commit('switchSite', result.data);
                });
            });
        },
        bulkRestore: function() {
            this.changeStateForSelected('trashed', true);
        },
        changeStateForSelected: function(status, inverse = false) {
            let itemsToChange = this.getSelectedItems();

            this.$store.commit('changePostsStatus', {
                postIDs: itemsToChange,
                status: status,
                inverse: inverse
            });

            ipcRenderer.send('app-post-status-change', {
                "site": this.$store.state.currentSite.config.name,
                "ids": itemsToChange,
                "status": status,
                "inverse": inverse
            });

            ipcRenderer.once('app-post-status-changed', () => {
                this.selectedItems = [];
            });

            this.$bus.$emit('message-display', {
                message: 'Status of the selected posts has been changed',
                type: 'success',
                lifeTime: 3
            });
        },
        whenSiteLoaded () {
            setTimeout(() => {
                this.setFilter('');
            }, 0);
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
                type: 'posts',
                orderBy: this.orderBy,
                order: this.order
            });
        }
    },
    beforeDestroy () {
        this.$bus.$off('site-loaded', this.whenSiteLoaded);
        this.$bus.$off('posts-filter-value-changed');
    }
}
</script>

<style lang="scss" scoped>
@import '../scss/variables.scss';

.header {
    .col {
        align-items: center;
        cursor: pointer;
        display: flex;
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

.filters {
    font-size: 1.4rem;
    list-style-type: none;
    margin: -2rem 0 0 0;
    padding: 0;
    position: relative;
    z-index: 1;

    .label {
        color: $color-7;
        float: left;
        margin-right: 1rem;
    }

    .filter-value {
        color: $color-7;
        cursor: pointer;
        display: inline-block;
        margin-right: 1rem;

        &.filter-active {
            color: $link-color;
            cursor: default;
        }

        &:hover {
            color: $link-color;
        }

        &:last-child {
            border-right: none;
        }
    }
}
</style>
