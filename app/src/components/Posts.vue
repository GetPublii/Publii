<template>
    <section class="content">
        <p-header
            v-if="hasPosts"
            :title="$t('ui.posts')">
            <header-search
                slot="search"
                ref="search"
                :placeholder="$t('post.filterOrSearchPosts')"
                onChangeEventName="posts-filter-value-changed" />

            <btn-dropdown
                slot="buttons"
                intent="primary"
                localStorageKey="publii-current-editor"
                :previewIcon="true"
                :items="dropdownItems"
                defaultValue="tinymce" />
        </p-header>

        <div
            v-if="dataLoaded && hasPosts"
            class="filters collection-filters"
            role="group"
            :aria-label="$t('post.status')">
            <collection-filter-button
                :label="$t('post.all')"
                :count="counters.all"
                :active="isFilterActive('all')"
                @click="setFilter('')" />

            <collection-filter-button
                :label="$t('post.published')"
                :count="counters.published"
                :active="isFilterActive('published')"
                @click="setFilter('is:published')" />

            <collection-filter-button
                v-if="counters.featured"
                :label="$t('post.featured')"
                :count="counters.featured"
                :active="isFilterActive('featured')"
                @click="setFilter('is:featured')" />

            <collection-filter-button
                v-if="counters.hidden"
                :label="$t('post.hidden')"
                :count="counters.hidden"
                :active="isFilterActive('hidden')"
                @click="setFilter('is:hidden')" />

            <collection-filter-button
                v-if="counters.excluded"
                :label="$t('post.excluded')"
                :count="counters.excluded"
                :active="isFilterActive('excluded')"
                @click="setFilter('is:excluded')" />

            <collection-filter-button
                v-if="counters.drafts"
                :label="$t('post.drafts')"
                :count="counters.drafts"
                :active="isFilterActive('draft')"
                @click="setFilter('is:draft')" />

            <collection-filter-button
                v-if="counters.trashed"
                :label="$t('post.trashed')"
                :count="counters.trashed"
                :active="isFilterActive('trashed')"
                @click="setFilter('is:trashed')" />
        </div>


        <collection
            v-if="dataLoaded && !emptySearchResults && hasPosts"
            :columns="showModificationDate && showModificationDateAsColumn ? 6 : 5">
            <collection-header slot="header">
                <collection-cell>
                    <checkbox
                        :aria-label="$t('ui.selectAllVisibleItems')"
                        value="all"
                        :checked="allVisibleSelected"
                        :indeterminate="someVisibleSelected"
                        :onClick="toggleAllCheckboxes"
                        @click.native="$bus.$emit('document-body-clicked')" />
                </collection-cell>

                <collection-cell>
                    <collection-sort-button
                        :label="$t('post.title')"
                        :active="orderBy === 'title'"
                        :order="order"
                        :reserve-width="false"
                        :disabled="anyCheckboxIsSelected"
                        @click="ordering('title')" />
                </collection-cell>

                <collection-cell>
                    <collection-sort-button
                        :label="$t('post.publicationDate')"
                        :active="orderBy === 'created'"
                        :order="order"
                        :reserve-width="false"
                        :disabled="anyCheckboxIsSelected"
                        @click="ordering('created')" />
                </collection-cell>

                <collection-cell
                    v-if="showModificationDate && showModificationDateAsColumn">
                    <collection-sort-button
                        :label="$t('post.modificationDate')"
                        :active="orderBy === 'modified'"
                        :order="order"
                        :reserve-width="false"
                        :disabled="anyCheckboxIsSelected"
                        @click="ordering('modified')" />
                </collection-cell>

                <collection-cell min-width="110px">
                    <collection-sort-button
                        :label="$t('author.author')"
                        :active="orderBy === 'author'"
                        :order="order"
                        :reserve-width="false"
                        :disabled="anyCheckboxIsSelected"
                        @click="ordering('author')" />
                </collection-cell>

                <collection-cell variant="identifier">
                    <collection-sort-button
                        :label="$t('ui.id')"
                        :active="orderBy === 'id'"
                        :order="order"
                        :reserve-width="false"
                        :disabled="anyCheckboxIsSelected"
                        @click="ordering('id')" />
                </collection-cell>

                <div
                    v-if="anyCheckboxIsSelected"
                    class="tools">
                    <p-button
                        v-if="trashVisible"
                        icon="delete"
                        appearance="light"
                        size="small"
                        :onClick="bulkDelete">
                        {{ $t('ui.delete') }}
                    </p-button>

                    <p-button
                        v-if="trashVisible"
                        icon="restore"
                        appearance="light"
                        size="small"
                        :onClick="bulkRestore">
                        {{ $t('file.restore') }}
                    </p-button>

                    <p-button
                        v-if="!trashVisible"
                        icon="trash"
                        appearance="light"
                        size="small"
                        :onClick="bulkTrash">
                        {{ $t('post.moveToTrash') }}
                    </p-button>

                    <p-button
                        v-if="!trashVisible"
                        icon="duplicate"
                        appearance="light"
                        size="small"
                        :onClick="bulkDuplicate">
                        {{ $t('post.duplicate') }}
                    </p-button>

                    <action-menu
                        v-if="!trashVisible"
                        align="left"
                        text-size="medium"
                        :label="$t('ui.more')"
                        :items="bulkActions">
                        <template #trigger="{ attrs, isOpen, toggle, keydown }">
                            <p-button
                                v-bind="attrs"
                                icon="more"
                                appearance="light"
                                size="small"
                                :active="isOpen"
                                @click.native.stop="toggle"
                                @keydown.native="keydown">
                                {{ $t('ui.more') }}
                            </p-button>
                        </template>
                    </action-menu>
                </div>
            </collection-header>

            <collection-row
                v-for="item in renderedItems"
                slot="content"
                :data-is-draft="item.isDraft"
                :key="'collection-row-' + item.id">
                <collection-cell>
                    <checkbox
                        :aria-label="$t('ui.selectItem', { name: item.title })"
                        :value="item.id"
                        :checked="isChecked(item.id)"
                        :onClick="toggleSelection"
                        :key="'collection-row-checkbox-' + item.id" />
                </collection-cell>

                <collection-cell
                    variant="titles">
                    <h2 class="title">
                        <a
                            v-tooltip.focus="postStatusDescription(item)"
                            href="#"
                            @click.prevent.stop="editPost(item.id, item.editor)">

                            {{ item.title }}

                            <icon
                                v-if="item.isFeatured"
                                size="xs"
                                name="featured-post"
                                class="post-status-icon content-status-icon is-featured"
                                v-tooltip.hover="$t('post.thisPostIsFeatured')"
                                aria-hidden="true"
                                focusable="false" />
                            <icon
                                v-if="item.isHidden"
                                size="xs"
                                name="hidden-post"
                                class="post-status-icon content-status-icon"
                                v-tooltip.hover="$t('post.thisPostIsHidden')"
                                aria-hidden="true"
                                focusable="false" />
                            <icon
                                v-if="item.isExcludedOnHomepage"
                                name="excluded-post"
                                size="xs"
                                class="post-status-icon content-status-icon is-excluded"
                                v-tooltip.hover="$t('post.thisPostIsExcludedFromHomepage')"
                                aria-hidden="true"
                                focusable="false" />
                            <icon
                                v-if="item.isDraft"
                                size="xs"
                                name="draft-post"
                                class="post-status-icon content-status-icon"
                                v-tooltip.hover="$t('post.thisPostIsADraft')"
                                aria-hidden="true"
                                focusable="false" />
                        </a>
                    </h2>

                    <div
                        v-if="showPostSlugs"
                        class="post-slug">
                        {{ $t('post.url') }}: /{{ item.slug }}<template v-if="!$store.state.currentSite.config.advanced.urls.cleanUrls">.html</template>
                    </div>

                    <div
                        v-if="showPostTags && item.tags"
                        class="post-tags"
                        style="width: 100%;">
                        <a
                            v-for="tag in item.tags"
                            href="#"
                            :class="{ 'tag': true, 'is-main-tag': tag.id === item.mainTag }"
                            :key="'tag-' + tag.id"
                            @click.stop.prevent="setFilter('tag:' + tag.name)">
                            #{{ tag.name }}
                        </a>
                    </div>
                </collection-cell>

                <collection-cell
                    variant="publish-dates">
                    <span class="publish-date">{{ getCreationDate(item.created) }}</span>
                    <span
                        v-if="!showModificationDateAsColumn && showModificationDate"
                        class="modify-date">
                        {{ $t('ui.lastModified') }}: {{ getModificationDate(item.modified) }}
                    </span>
                </collection-cell>

                <collection-cell
                    v-if="showModificationDate && showModificationDateAsColumn"
                    variant="modification-dates">
                    <span class="modify-date">
                        {{ getModificationDate(item.modified) }}
                    </span>
                </collection-cell>

                <collection-cell
                    variant="authors">
                    <a
                        href="#"
                        @click.prevent.stop="setFilter('author:' + item.author)">
                        {{ item.author }}
                    </a>
                </collection-cell>

                <collection-cell variant="identifier">
                    {{ item.id }}
                </collection-cell>
            </collection-row>

            <div
                v-if="items.length > renderLimit"
                ref="loadMoreSentinel"
                slot="content"
                class="load-more-sentinel">
            </div>
        </collection>

        <empty-state
            v-if="emptySearchResults"
            :description="$t('post.noPostsMatchingYourCriteria')"></empty-state>

        <editor-selection
            v-if="dataLoaded && !hasPosts"
            content-type="post"
            @select="addNewPost" />
    </section>
</template>

<script>
import CollectionSortButton from './basic-elements/CollectionSortButton.vue';
import EditorSelection from './basic-elements/EditorSelection.vue';
import CollectionFilterButton from './basic-elements/CollectionFilterButton.vue';
import CollectionCheckboxes from './mixins/CollectionCheckboxes.js';
import CollectionOrdering from './mixins/CollectionOrdering.js';
import Tooltip from '../helpers/tooltip.js';

export default {
    components: {
        CollectionSortButton,
        EditorSelection,
        CollectionFilterButton
    },
    directives: {
        tooltip: Tooltip
    },
    name: 'posts',
    mixins: [
        CollectionOrdering,
        CollectionCheckboxes
    ],
    data () {
        return {
            dataLoaded: false,
            filterValue: '',
            selectedItems: [],
            orderBy: 'id',
            order: 'DESC',
            renderLimit: 100
        };
    },
    computed: {
        bulkActions () {
            return [
                {
                    value: 'publish',
                    label: this.$t('post.publish'),
                    icon: 'publish-post',
                    visible: this.selectedPostsNeedsStatus('published'),
                    onClick: this.bulkPublish
                },
                {
                    value: 'draft',
                    label: this.$t('post.markAsDraft'),
                    icon: 'draft-post',
                    visible: this.selectedPostsNeedsStatus('draft'),
                    onClick: this.bulkUnpublish
                },
                {
                    value: 'featured',
                    label: this.$t('post.markAsFeatured'),
                    icon: 'featured-post',
                    iconClass: 'content-status-icon is-featured',
                    visible: this.selectedPostsNeedsStatus('featured'),
                    onClick: this.bulkFeatured
                },
                {
                    value: 'unfeatured',
                    label: this.$t('post.markAsUnfeatured'),
                    icon: 'unfeatured-post',
                    iconClass: 'content-status-icon is-featured',
                    visible: this.selectedPostsHaveStatus('featured'),
                    onClick: this.bulkUnfeatured
                },
                {
                    value: 'exclude',
                    label: this.$t('post.excludeFromHomepage'),
                    icon: 'excluded-post',
                    iconClass: 'content-status-icon is-excluded',
                    visible: this.selectedPostsNeedsStatus('excluded_homepage'),
                    onClick: this.bulkExclude
                },
                {
                    value: 'include',
                    label: this.$t('post.includeInHomepage'),
                    icon: 'included-post',
                    iconClass: 'content-status-icon is-excluded',
                    visible: this.selectedPostsHaveStatus('excluded_homepage'),
                    onClick: this.bulkInclude
                },
                {
                    value: 'hide',
                    label: this.$t('ui.hide'),
                    icon: 'hidden-post',
                    visible: this.selectedPostsNeedsStatus('hidden'),
                    onClick: this.bulkHide
                },
                {
                    value: 'unhide',
                    label: this.$t('ui.unhide'),
                    icon: 'unhidden-post',
                    visible: this.selectedPostsHaveStatus('hidden'),
                    onClick: this.bulkUnhide
                },
                {
                    value: 'convert',
                    label: this.$t('post.convertToPage'),
                    icon: 'convert-to-page',
                    onClick: this.bulkConvertToPage
                }
            ];
        },
        items () {
            return this.$store.getters.sitePosts(this.filterValue, this.orderBy, this.order);
        },
        renderedItems () {
            return this.items.slice(0, this.renderLimit);
        },
        hasPosts () {
            return this.$store.state.currentSite.posts && !!this.$store.state.currentSite.posts.length;
        },
        emptySearchResults () {
            return this.filterValue !== '' && !this.items.length;
        },
        trashVisible () {
            return this.filterValue.indexOf('is:trashed') > -1;
        },
        counters () {
            let counters = {
                all: 0,
                published: 0,
                featured: 0,
                hidden: 0,
                excluded: 0,
                drafts: 0,
                trashed: 0
            };

            if(!this.$store.state.currentSite || !this.$store.state.currentSite.posts) {
                return counters;
            }

            for (let post of this.$store.state.currentSite.posts) {
                if (post.status.indexOf('trashed') > -1) {
                    counters.trashed++;
                    continue;
                }

                counters.all++;

                if (post.status.indexOf('draft') > -1) {
                    counters.drafts++;
                } else {
                    counters.published++;
                }

                if (post.status.indexOf('featured') > -1) {
                    counters.featured++;
                }

                if (post.status.indexOf('hidden') > -1) {
                    counters.hidden++;
                }

                if (post.status.indexOf('excluded_homepage') > -1) {
                    counters.excluded++;
                }
            }

            return counters;
        },
        showModificationDate () {
            return this.$store.state.app.config.showModificationDate;
        },
        showModificationDateAsColumn () {
            return this.$store.state.app.config.showModificationDateAsColumn;
        },
        showPostTags () {
            return this.$store.state.app.config.showPostTags;
        },
        dropdownItems () {
            return [
                {
                    label: this.$t('post.editorWYSIWYGUse'),
                    activeLabel: this.$t('post.addNewPost'),
                    value: 'tinymce',
                    icon: 'wysiwyg',
                    isVisible: () => true,
                    onClick: this.addNewPost.bind(this, 'tinymce')
                },
                {
                    label: this.$t('post.editorBlockUse'),
                    activeLabel: this.$t('post.addNewPost'),
                    value: 'blockeditor',
                    icon: 'block',
                    isVisible: () => true,
                    onClick: this.addNewPost.bind(this, 'blockeditor')
                },
                {
                    label: this.$t('post.editorMarkdownUse'),
                    activeLabel: this.$t('post.addNewPost'),
                    value: 'markdown',
                    icon: 'markdown',
                    isVisible: () => true,
                    onClick: this.addNewPost.bind(this, 'markdown')
                }
            ]
        },
        showPostSlugs () {
            return this.$store.state.app.config.showPostSlugs;
        }
    },
    watch: {
        filterValue () {
            this.renderLimit = 100;
        }
    },
    created () {
        this.loadMoreObserver = new IntersectionObserver(entries => {
            if (entries.some(entry => entry.isIntersecting)) {
                this.renderLimit += 100;
            }
        });
    },
    mounted () {
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
                this.saveOrdering(this.$store.state.ordering.posts.orderBy, this.$store.state.ordering.posts.order);
            }, 500);
        });

        this.$bus.$on('app-settings-saved', newSettings => {
            if (this.orderBy + ' ' + this.order !== newSettings.postsOrdering) {
                let order = newSettings.postsOrdering.split(' ');
                this.saveOrdering(order[0], order[1]);
            }
        });

        if (this.$store.state.currentSite.posts) {
            this.dataLoaded = true;
        }

        if (this.$route.params.filter === 'trashed') {
            this.setFilter('is:trashed');
        }

        this.$nextTick(this.observeLoadMoreSentinel);
    },
    updated () {
        this.observeLoadMoreSentinel();
    },
    methods: {
        postStatusDescription (item) {
            const statuses = [];

            if (item.isFeatured) {
                statuses.push(this.$t('post.thisPostIsFeatured'));
            }

            if (item.isHidden) {
                statuses.push(this.$t('post.thisPostIsHidden'));
            }

            if (item.isExcludedOnHomepage) {
                statuses.push(this.$t('post.thisPostIsExcludedFromHomepage'));
            }

            if (item.isDraft) {
                statuses.push(this.$t('post.thisPostIsADraft'));
            }

            return statuses.join('\n');
        },
        observeLoadMoreSentinel () {
            this.loadMoreObserver.disconnect();

            if (this.$refs.loadMoreSentinel) {
                this.loadMoreObserver.observe(this.$refs.loadMoreSentinel);
            }
        },
        addNewPost (editorType) {
            if (
                editorType === 'blockeditor' &&
                this.$store.state.currentSite.themeSettings &&
                this.$store.state.currentSite.themeSettings.supportedFeatures &&
                !this.$store.state.currentSite.themeSettings.supportedFeatures.blockEditor
            ) {
                this.$bus.$emit('confirm-display', {
                    message: this.$t('post.editorBlockNotSupportedNewPostInfo'),
                    okLabel: this.$t('post.openEditorAnyway'),
                    isDanger: true,
                    okClick: () => {
                        this.openEditor(false, editorType);
                    }
                });
                return;
            }

            this.openEditor(false, editorType);
        },
        editPost (id, editorType) {
            if (
                editorType === 'blockeditor' &&
                this.$store.state.currentSite.themeSettings &&
                this.$store.state.currentSite.themeSettings.supportedFeatures &&
                !this.$store.state.currentSite.themeSettings.supportedFeatures.blockEditor
            ) {
                this.$bus.$emit('confirm-display', {
                    message: this.$t('post.editorBlockNotSupportedEditPostInfo'),
                    okLabel: this.$t('post.editPostAnyway'),
                    isDanger: true,
                    okClick: () => {
                        this.openEditor(id, editorType);
                    }
                });
                return;
            }

            this.openEditor(id, editorType);
        },
        openEditor (id, editorType) {
            let siteName = this.$route.params.name;

            if(this.filterValue.trim() !== '' && this.$store.state.app.config.alwaysSaveSearchState) {
                localStorage.setItem('publii-posts-search-value', this.filterValue);
            }

            this.$store.commit('setEditorOpenState', true);
            this.$router.push('/site/' + siteName + '/posts/editor/' + editorType + '/' + (id !== false ? id : ''));
            return false;
        },
        setFilter (newValue) {
            if (this.$refs.search) {
                this.$refs.search.isOpen = newValue !== '';
                this.$refs.search.value = newValue;
                this.$refs.search.updateValue();
            }
        },
        isFilterActive (type) {
            return type === 'all'
                ? this.filterValue.indexOf('is:') === -1
                : this.filterValue.indexOf('is:' + type) === 0;
        },
        getModificationDate (timestamp) {
            return this.$moment(timestamp).fromNow();
        },
        getCreationDate (timestamp) {
            if(this.$store.state.app.config.timeFormat == 12) {
                return this.$moment(timestamp).format('MMM DD, YYYY  hh:mm a');
            } else {
                return this.$moment(timestamp).format('MMM DD, YYYY  HH:mm');
            }
        },
        bulkDelete () {
            this.$bus.$emit('confirm-display', {
                message: this.$t('post.removePostMessage'),
                okLabel: this.$t('post.deletePosts'),
                isDanger: true,
                okClick: this.deleteSelected
            });
        },
        deleteSelected () {
            let itemsToRemove = this.getSelectedItems();

            mainProcessAPI.send('app-post-delete', {
                "site": this.$store.state.currentSite.config.name,
                "ids": itemsToRemove
            });

            mainProcessAPI.receiveOnce('app-post-deleted', () => {
                this.$store.commit('removePosts', itemsToRemove);
                this.selectedItems = [];

                this.$bus.$emit('message-display', {
                    message: this.$t('post.removePostSuccessMessage'),
                    type: 'success',
                    lifeTime: 3
                });

                if (this.counters.trashed === 0) {
                    this.filterValue = '';
                }
            });
        },
        bulkTrash () {
            this.changeStateForSelected('trashed');
        },
        bulkPublish () {
            this.changeStateForSelected('published');
            this.changeStateForSelected('draft', true);
        },
        bulkUnpublish () {
            this.changeStateForSelected('published', true);
            this.changeStateForSelected('draft');
        },
        bulkFeatured () {
            this.changeStateForSelected('featured');
        },
        bulkUnfeatured () {
            this.changeStateForSelected('featured', true);
        },
        bulkExclude () {
            this.changeStateForSelected('excluded_homepage');
        },
        bulkInclude () {
            this.changeStateForSelected('excluded_homepage', true);
        },
        bulkHide () {
            this.changeStateForSelected('hidden');
        },
        bulkUnhide () {
            this.changeStateForSelected('hidden', true);
        },
        bulkDuplicate () {
            let itemsToDuplicate = this.getSelectedItems();

            mainProcessAPI.send('app-post-duplicate', {
                "site": this.$store.state.currentSite.config.name,
                "ids": itemsToDuplicate
            });

            mainProcessAPI.receiveOnce('app-post-duplicated', (data) => {
                if(!data) {
                    this.$bus.$emit('message-display', {
                        message: this.$t('post.duplicatePostErrorMessage'),
                        type: 'warning',
                        lifeTime: 3
                    });

                    return;
                } else {
                    this.$bus.$emit('message-display', {
                        message: this.$t('post.duplicatePostSuccessMessage'),
                        type: 'success',
                        lifeTime: 3
                    });
                }

                this.selectedItems = [];

                mainProcessAPI.send('app-site-reload', {
                    siteName: this.$store.state.currentSite.config.name
                });

                mainProcessAPI.receiveOnce('app-site-reloaded', (result) => {
                    this.$store.commit('setSiteConfig', result);
                    this.$store.commit('switchSite', result.data);
                });
            });
        },
        bulkRestore () {
            this.changeStateForSelected('trashed', true);
        },
        bulkConvertToPage () {
            let itemsToChange = this.getSelectedItems();

            this.$store.commit('changePostsToPages', {
                postIDs: itemsToChange
            });

            mainProcessAPI.send('app-post-status-change', {
                "site": this.$store.state.currentSite.config.name,
                "ids": itemsToChange,
                "status": 'is-page',
                "inverse": false
            });

            mainProcessAPI.send('app-pages-hierarchy-update', {
                postIDs: itemsToChange,
                siteName: this.$store.state.currentSite.config.name
            });

            mainProcessAPI.receiveOnce('app-post-status-changed', () => {
                this.selectedItems = [];
            });

            this.$bus.$emit('message-display', {
                message: this.$t('post.postStatusChangeSuccessMessage'),
                type: 'success',
                lifeTime: 3
            });
        },
        changeStateForSelected (status, inverse = false) {
            let itemsToChange = this.getSelectedItems();

            this.$store.commit('changePostsStatus', {
                postIDs: itemsToChange,
                status: status,
                inverse: inverse
            });

            mainProcessAPI.send('app-post-status-change', {
                "site": this.$store.state.currentSite.config.name,
                "ids": itemsToChange,
                "status": status,
                "inverse": inverse
            });

            mainProcessAPI.receiveOnce('app-post-status-changed', () => {
                this.selectedItems = [];
            });

            this.$bus.$emit('message-display', {
                message: this.$t('post.postStatusChangeSuccessMessage'),
                type: 'success',
                lifeTime: 3
            });
        },
        whenSiteLoaded () {
            this.dataLoaded = true;

            setTimeout(() => {
                this.setFilter('');
            }, 0);
        },
        saveOrdering (orderBy, order) {
            this.orderBy = orderBy;
            this.order = order;

            this.$store.commit('setOrdering', {
                type: 'posts',
                orderBy: this.orderBy,
                order: this.order
            });
        },
        selectedPostsNeedsStatus (status) {
            let selectedPosts = this.items.filter(item => this.selectedItems.indexOf(item.id) > -1);

            if (!selectedPosts.length) {
                return false;
            }

            let postsWithoutGivenStatus = selectedPosts.filter(item => item.status.indexOf(status) === -1);

            return !!postsWithoutGivenStatus.length;
        },
        selectedPostsHaveStatus (status) {
            let selectedPosts = this.items.filter(item => this.selectedItems.indexOf(item.id) > -1);

            if (!selectedPosts.length) {
                return false;
            }

            let postsWithGivenStatus = selectedPosts.filter(item => item.status.indexOf(status) > -1);

            return !!postsWithGivenStatus.length;
        }
    },
    beforeDestroy () {
        this.loadMoreObserver.disconnect();
        this.$bus.$off('site-loaded', this.whenSiteLoaded);
        this.$bus.$off('posts-filter-value-changed');
    }
}
</script>

<style scoped>
@import '../css/content-status-icon.css';
@import "../css/collection-sorting.css";

/* Status icons inside links must receive hover despite the global SVG rule. */
.title .post-status-icon {
    pointer-events: bounding-box;
}

.title > a:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
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

.header {
    overflow-y: visible!important;
}

.load-more-sentinel {
    grid-column: 1 / -1;
    height: 1px;
}

.item {
    .post-tags {
        display: flex;
        flex-wrap: wrap;

        a {
            order: 2;
            margin: .2rem var(--space-2) 0 0;

            &.is-main-tag {
                order: 1;
            }
        }
    }

    .post-slug {
        color: var(--color-text-muted);
        font-size: 11px;
        margin-top: .2rem;
    }
}

@import "../css/collection-filters.css";


</style>
