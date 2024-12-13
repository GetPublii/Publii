<template>
    <section :class="{ 'content': true, 'tags-list-view': true, 'no-scroll': editorVisible }">
        <p-header
            v-if="!showEmptyState"
            :title="$t('ui.tags')">
            <header-search
                slot="search"
                :placeholder="$t('tag.filterOrSearchTags')"
                onChangeEventName="tags-filter-value-changed" />

            <p-button
                :onClick="addTag"
                slot="buttons"
                type="primary icon"
                icon="add-site-mono">
                {{ $t('tag.addNewTag') }}
            </p-button>
        </p-header>

        <collection
            v-if="!emptySearchResults && hasTags"
            :itemsCount="4">
            <collection-header slot="header">
                <collection-cell>
                    <checkbox
                        value="all"
                        :checked="anyCheckboxIsSelected"
                        :onClick="toggleAllCheckboxes.bind(this, false)" />
                </collection-cell>

                <collection-cell>
                    <span
                        class="col-sortable-title"
                        @click="ordering('name')">
                        <template v-if="orderBy === 'name'">
                            <strong>{{ $t('ui.name') }}</strong>
                        </template>
                        <template v-else>{{ $t('ui.name') }}</template>

                        <span class="order-descending" v-if="orderBy === 'name' && order === 'ASC'"></span>
                        <span class="order-ascending" v-if="orderBy === 'name' && order === 'DESC'"></span>
                    </span>
                </collection-cell>

                <collection-cell
                    justifyContent="center"
                    textAlign="center"
                    min-width="100px">
                    <span
                        class="col-sortable-title"
                        @click="ordering('postsCounter')">
                        <template v-if="orderBy === 'postsCounter'">
                            <strong>{{ $t('ui.posts') }}</strong>
                        </template>
                        <template v-else>{{ $t('ui.posts') }}</template>

                        <span class="order-descending" v-if="orderBy === 'postsCounter' && order === 'ASC'"></span>
                        <span class="order-ascending" v-if="orderBy === 'postsCounter' && order === 'DESC'"></span>
                    </span>
                </collection-cell>

                <collection-cell min-width="40px">
                    <span
                        class="col-sortable-title"
                        @click="ordering('id')">
                        <template v-if="orderBy === 'id'">
                            <strong>{{ $t('ui.id') }}</strong>
                        </template>
                        <template v-else>{{ $t('ui.id') }}</template>

                        <span class="order-descending" v-if="orderBy === 'id' && order === 'ASC'"></span>
                        <span class="order-ascending" v-if="orderBy === 'id' && order === 'DESC'"></span>
                    </span>
                </collection-cell>

                <div
                    v-if="anyCheckboxIsSelected"
                    class="tools">
                    <p-button
                        icon="trash"
                        type="small light icon"
                        :onClick="bulkDelete">
                        {{ $t('ui.delete') }}
                    </p-button>

                    <p-button
                        v-if="selectedTagsAreNotHidden"
                        icon="hidden-post"
                        type="small light icon"
                        :onClick="bulkHide">
                        {{ $t('ui.hide') }}
                    </p-button>

                    <p-button
                        v-if="selectedTagsAreHidden"
                        icon="unhidden-post"
                        type="small light icon"
                        :onClick="bulkUnhide">
                        {{ $t('ui.unhide') }}
                    </p-button>
                </div>
            </collection-header>

            <collection-row
                v-for="(item, index) in items"
                slot="content"
                :key="'collection-row-' + index">
                <collection-cell>
                    <checkbox
                        :value="item.id"
                        :checked="isChecked(item.id)"
                        :onClick="toggleSelection"
                        :key="'collection-row-checkbox-' + index" />
                </collection-cell>

                <collection-cell type="titles">
                    <h2 class="title">
                        <a
                            href="#"
                            @click.prevent.stop="editTag(item)">
                            {{ item.name }}

                            <icon
                                v-if="item.isHidden"
                                size="xs"
                                name="hidden-post"
                                strokeColor="color-7"
                                :title="$t('tag.thisTagIsHidden')" />
                        </a>
                    </h2>

                    <div
                        v-if="showTagSlugs"
                        class="tag-slug">
                        {{ $t('tag.url') }}: /{{ item.slug }}<template v-if="!$store.state.currentSite.config.advanced.urls.cleanUrls">.html</template>
                    </div>
                </collection-cell>

                <collection-cell
                    justifyContent="center"
                    textAlign="center">
                    <a
                        @click.prevent.stop="showPostsConnectedWithTag(item.name)"
                        href="#">
                        {{ item.postsCounter }}
                    </a>
                </collection-cell>

                <collection-cell>
                    {{ item.id }}
                </collection-cell>
            </collection-row>
        </collection>

        <empty-state
            v-if="emptySearchResults"
            :description="$t('tag.noTagsMatchingYourCriteria')"></empty-state>

        <empty-state
            v-if="showEmptyState"
            imageName="tags.svg"
            imageWidth="344"
            imageHeight="286"
            :title="$t('tag.noTagsAvailable')"
            :description="$t('tag.createFirstTag')">
            <p-button
                slot="button"
                icon="add-site-mono"
                type="icon"
                :onClick="addTag">
                {{ $t('tag.addNewTag') }}
            </p-button>
        </empty-state>

        <transition>
            <tag-form
                v-if="editorVisible"
                :form-animation="formAnimation" />
        </transition>
    </section>
</template>

<script>
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
            formAnimation: false,
            editorVisible: false,
            filterValue: '',
            orderBy: this.$store.state.ordering.tags.orderBy,
            order: this.$store.state.ordering.tags.order,
            selectedItems: []
        };
    },
    watch: {
        editorVisible (newValue, oldValue) {
            if (newValue !== oldValue) {
                this.formAnimation = true;

                setTimeout(() => {
                    this.formAnimation = false;
                }, 500);
            }
        }
    },
    computed: {
        items: function() {
            return this.$store.getters.siteTags(this.filterValue, this.orderBy, this.order).map(item => {
                if (item.additionalData) {
                    if (typeof item.additionalData === 'string') {
                        item.isHidden = item.additionalData.indexOf('"isHidden":true') > -1;
                    } else {
                        item.isHidden = item.additionalData.isHidden;
                    }
                }

                return item;
            });
        },
        hasTags: function() {
            return this.$store.state.currentSite.tags && !!this.$store.state.currentSite.tags.length;
        },
        showEmptyState: function() {
            return !this.hasTags;
        },
        emptySearchResults: function() {
            return this.filterValue !== '' && !this.items.length;
        },
        selectedTagsAreNotHidden () {
            let selectedTags = this.items.filter(item => this.selectedItems.indexOf(item.id) > -1);

            if (!selectedTags.length) {
                return false;
            }

            let notHiddenTags = selectedTags.filter(item => !item.isHidden);
            return !!notHiddenTags.length;
        },
        selectedTagsAreHidden () {
            let selectedTags = this.items.filter(item => this.selectedItems.indexOf(item.id) > -1);

            if (!selectedTags.length) {
                return false;
            }

            let hiddenTags = selectedTags.filter(item => item.isHidden);
            return !!hiddenTags.length;
        },
        showTagSlugs () {
            return this.$store.state.app.config.showPostSlugs;
        }
    },
    beforeMount () {
        mainProcessAPI.send('app-tags-load', {
            "site": this.$store.state.currentSite.config.name
        });

        mainProcessAPI.receiveOnce('app-tags-loaded', (data) => {
            this.$store.commit('setTags', data.tags);
            this.$store.commit('setPostsTags', data.postsTags);
        });
    },
    mounted: function() {
        this.orderBy = this.$store.state.ordering.tags.orderBy;
        this.order = this.$store.state.ordering.tags.order;

        this.$bus.$on('tags-filter-value-changed', (newValue) => {
            this.filterValue = newValue.trim().toLowerCase();
        });

        this.$bus.$on('hide-tag-item-editor', () => {
            if (document.querySelector('.tags-list-view .item.is-edited')) {
                document.querySelector('.tags-list-view .item.is-edited').classList.remove('is-edited');
            }
            
            this.editorVisible = false;
        });

        this.$bus.$on('site-switched', () => {
            setTimeout(() => {
                this.saveOrdering(this.$store.state.ordering.tags.orderBy, this.$store.state.ordering.tags.order);
            }, 500);
        });

        this.$bus.$on('app-settings-saved', newSettings => {
            if (this.orderBy + ' ' + this.order !== newSettings.tagsOrdering) {
                let order = newSettings.tagsOrdering.split(' ');
                this.saveOrdering(order[0], order[1]);
            }
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
                    isHidden: false,
                    metaTitle: '',
                    metaDescription: '',
                    template: ''
                }
            }));

            this.editorVisible = true;
        },
        editTag (item) {
            if (document.querySelector('.tags-list-view .item.is-edited')) {
                document.querySelector('.tags-list-view .item.is-edited').classList.remove('is-edited');
            }

            document.querySelector('.tags-list-view .item input[value="' + parseInt(item.id, 10) + '"]').parentNode.parentNode.classList.add('is-edited');
            this.editorVisible = true;

            setTimeout(() => {
                this.$bus.$emit('show-tag-item-editor', item);
            }, 100);
        },
        bulkDelete () {
            this.$bus.$emit('confirm-display', {
                message: this.$t('tag.removeTagMessage'),
                isDanger: true,
                okClick: this.deleteSelected
            });
        },
        bulkHide () {
            this.changeStateForSelected('hidden');
        },
        bulkUnhide () {
            this.changeStateForSelected('hidden', true);
        },
        changeStateForSelected (status, inverse = false) {
            let itemsToChange = this.getSelectedItems();

            this.$store.commit('changeTagsVisibility', {
                tagsIDs: itemsToChange,
                status: status,
                inverse: inverse
            });

            mainProcessAPI.send('app-tags-status-change', {
                "site": this.$store.state.currentSite.config.name,
                "ids": itemsToChange,
                "status": status,
                "inverse": inverse
            });

            mainProcessAPI.receiveOnce('app-tags-status-changed', () => {
                this.selectedItems = [];
                this.$forceUpdate();
            });

            this.$bus.$emit('message-display', {
                message: this.$t('tag.tagStatusChangeSuccessMessage'),
                type: 'success',
                lifeTime: 3
            });
        },
        deleteSelected () {
            let itemsToRemove = this.getSelectedItems();

            mainProcessAPI.send('app-tag-delete', {
                "site": this.$store.state.currentSite.config.name,
                "ids": itemsToRemove
            });

            mainProcessAPI.receiveOnce('app-tag-deleted', () => {
                this.$store.commit('removeTags', itemsToRemove);
                this.selectedItems = [];

                this.$bus.$emit('message-display', {
                    message: this.$t('tag.removeTagSuccessMessage'),
                    type: 'success',
                    lifeTime: 3
                });
            });
        },
        showPostsConnectedWithTag (name) {
            let siteName = this.$store.state.currentSite.config.name;
            localStorage.setItem('publii-posts-search-value', 'tag:' + name);
            this.$router.push('/site/' + siteName + '/posts');
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

            this.saveOrdering(this.orderBy, this.order);
        },
        saveOrdering (orderBy, order) {
            this.orderBy = orderBy;
            this.order = order;

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
        overflow: hidden!important;
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
        margin-left: 3px;
        position: relative;
        &:after {
             border-top: solid 5px var(--icon-secondary-color);
             border-left: solid 5px transparent;
             border-right: solid 5px transparent;
             content: "";
             cursor: pointer;
             display: inline-block;
             height: 4px;
             left: 0;
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
            border-bottom: solid 5px var(--icon-secondary-color);
        }
    }

    .tag-slug {
        color: var(--gray-4);
        font-size: 11px;
        margin-top: .2rem;
    }
}

.col > a > .icon {
    margin-left: 10px;
    position: relative;
    top: 2px;
}
</style>
