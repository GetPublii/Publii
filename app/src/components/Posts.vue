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
                buttonColor="green"
                localStorageKey="publii-current-editor"
                :previewIcon="true"
                :items="dropdownItems"
                defaultValue="tinymce" />
        </p-header>

        <ul
            v-if="dataLoaded && hasPosts"
            class="filters">
            <li
                :class="filterCssClasses('all')"
                @click="setFilter('')">
                {{ $t('post.all') }} <span class="filter-count">({{ counters.all }})</span>
            </li>

            <li
                :class="filterCssClasses('published')"
                @click="setFilter('is:published')">
                {{ $t('post.published') }} <span class="filter-count">({{ counters.published }})</span>
            </li>

            <li
                v-if="counters.featured"
                :class="filterCssClasses('featured')"
                @click="setFilter('is:featured')">
                {{ $t('post.featured') }} <span class="filter-count">({{ counters.featured }})</span>
            </li>

            <li
                v-if="counters.hidden"
                :class="filterCssClasses('hidden')"
                @click="setFilter('is:hidden')">
                {{ $t('post.hidden') }} <span class="filter-count">({{ counters.hidden }})</span>
            </li>

            <li
                v-if="counters.excluded"
                :class="filterCssClasses('excluded')"
                @click="setFilter('is:excluded')">
                {{ $t('post.excluded') }} <span class="filter-count">({{ counters.excluded }})</span>
            </li>

            <li
                v-if="counters.drafts"
                :class="filterCssClasses('draft')"
                @click="setFilter('is:draft')">
                {{ $t('post.drafts') }} <span class="filter-count">({{ counters.drafts }})</span>
            </li>

            <li
                v-if="counters.trashed"
                :class="filterCssClasses('trashed')"
                @click="setFilter('is:trashed')">
                {{ $t('post.trashed') }} <span class="filter-count">({{counters.trashed }})</span>
            </li>
        </ul>


        <collection
            v-if="dataLoaded && !emptySearchResults && hasPosts"
            :itemsCount="showModificationDate && showModificationDateAsColumn ? 6 : 5">
            <collection-header slot="header">
                <collection-cell>
                    <checkbox
                        value="all"
                        :checked="anyCheckboxIsSelected"
                        :onClick="toggleAllCheckboxes.bind(this, false)"
                        @click.native="$bus.$emit('document-body-clicked')" />
                </collection-cell>

                <collection-cell>
                    <span
                        class="col-sortable-title"
                        @click="ordering('title')">
                        <template v-if="orderBy === 'title'">
                            <strong>{{ $t('post.title') }}</strong>
                        </template>
                        <template v-else>{{ $t('post.title') }}</template>

                        <span class="order-descending" v-if="orderBy === 'title' && order === 'ASC'"></span>
                        <span class="order-ascending" v-if="orderBy === 'title' && order === 'DESC'"></span>
                    </span>
                </collection-cell>

                <collection-cell>
                    <span
                        class="col-sortable-title"
                        @click="ordering('created')">
                        <template v-if="orderBy === 'created'">
                            <strong>{{ $t('post.publicationDate') }}</strong>
                        </template>
                        <template v-else>{{ $t('post.publicationDate') }}</template>

                        <span class="order-descending" v-if="orderBy === 'created' && order === 'ASC'"></span>
                        <span class="order-ascending" v-if="orderBy === 'created' && order === 'DESC'"></span>
                    </span>
                </collection-cell>

                <collection-cell
                    v-if="showModificationDate && showModificationDateAsColumn">
                    <span
                        class="col-sortable-title"
                        @click="ordering('modified')">
                        <template v-if="orderBy === 'modified'">
                            <strong>{{ $t('post.modificationDate') }}</strong>
                        </template>
                        <template v-else>{{ $t('post.modificationDate') }}</template>

                        <span class="order-descending" v-if="orderBy === 'modified' && order === 'ASC'"></span>
                        <span class="order-ascending" v-if="orderBy === 'modified' && order === 'DESC'"></span>
                    </span>
                </collection-cell>

                <collection-cell min-width="110px">
                    <span
                        class="col-sortable-title"
                        @click="ordering('author')">
                        <template v-if="orderBy === 'author'">
                            <strong>{{ $t('author.author') }}</strong>
                        </template>
                        <template v-else>{{ $t('author.author') }}</template>

                        <span class="order-descending" v-if="orderBy === 'author' && order === 'ASC'"></span>
                        <span class="order-ascending" v-if="orderBy === 'author' && order === 'DESC'"></span>
                    </span>
                </collection-cell>

                <collection-cell min-width="35px">
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
                        v-if="trashVisible"
                        icon="delete"
                        type="small light icon delete"
                        :onClick="bulkDelete">
                        {{ $t('ui.delete') }}
                    </p-button>

                    <p-button
                        v-if="trashVisible"
                        icon="restore"
                        type="small light icon"
                        :onClick="bulkRestore">
                        {{ $t('file.restore') }}
                    </p-button>

                    <p-button
                        v-if="!trashVisible"
                        icon="trash"
                        type="small light icon delete"
                        :onClick="bulkTrash">
                        {{ $t('post.moveToTrash') }}
                    </p-button>

                    <p-button
                        v-if="!trashVisible"
                        icon="duplicate"
                        type="small light icon"
                        :onClick="bulkDuplicate">
                        {{ $t('post.duplicate') }}
                    </p-button>

                    <div
                        v-if="!trashVisible"
                        class="dropdown-wrapper">
                        <p-button
                            icon="more"
                            :type="bulkDropdownVisible ? 'small light icon active' : 'small light icon'"
                            @click.native.stop="toggleBulkDropdown">
                            {{ $t('ui.more') }}
                        </p-button>

                        <ul
                            v-if="bulkDropdownVisible"
                            class="dropdown">
                            <li
                                v-if="selectedPostsNeedsStatus('published')"
                                @click="bulkPublish">
                                <icon
                                    size="xs"
                                    name="publish-post" />
                                {{ $t('post.publish') }}
                            </li>
                            <li
                                v-if="selectedPostsNeedsStatus('draft')"
                                @click="bulkUnpublish">
                                <icon
                                    size="xs"
                                    name="draft-post" />
                                {{ $t('post.markAsDraft') }}
                            </li>
                            <li
                                v-if="selectedPostsNeedsStatus('featured')"
                                @click="bulkFeatured">
                                <icon
                                    size="xs"
                                    name="featured-post"
                                    strokeColor="color-helper-6" />
                                {{ $t('post.markAsFeatured') }}
                            </li>
                            <li
                                v-if="selectedPostsHaveStatus('featured')"
                                @click="bulkUnfeatured">
                                <icon
                                    size="xs"
                                    name="unfeatured-post" 
                                    strokeColor="color-helper-6" />
                                {{ $t('post.markAsUnfeatured') }}
                            </li>
                            <li
                                v-if="selectedPostsNeedsStatus('excluded_homepage')"
                                @click="bulkExclude">
                                <icon
                                    size="xs"
                                    name="excluded-post"
                                    strokeColor="color-3" />
                                {{ $t('post.excludeFromHomepage') }}
                            </li>
                            <li
                                v-if="selectedPostsHaveStatus('excluded_homepage')"
                                @click="bulkInclude">
                                <icon
                                    size="xs"
                                    name="included-post" 
                                    strokeColor="color-3" />
                                {{ $t('post.includeInHomepage') }}
                            </li>
                            <li
                                v-if="selectedPostsNeedsStatus('hidden')"
                                @click="bulkHide">
                                <icon
                                    size="xs"
                                    name="hidden-post" />
                                {{ $t('ui.hide') }}
                            </li>
                            <li
                                v-if="selectedPostsHaveStatus('hidden')"
                                @click="bulkUnhide">
                                <icon
                                    size="xs"
                                    name="unhidden-post" />
                                {{ $t('ui.unhide') }}
                            </li>
                            <li
                                @click="bulkConvertToPage">
                                <icon
                                    size="xs"
                                    name="convert-to-page"/>
                                {{ $t('post.convertToPage') }}
                            </li>
                        </ul>
                    </div>
                </div>
            </collection-header>

            <collection-row
                v-for="(item, index) in items"
                slot="content"
                :data-is-draft="item.isDraft"
                :key="'collection-row-' + index">
                <collection-cell>
                    <checkbox
                        :value="item.id"
                        :checked="isChecked(item.id)"
                        :onClick="toggleSelection"
                        :key="'collection-row-checkbox-' + index" />
                </collection-cell>

                <collection-cell
                    type="titles">
                    <h2 class="title">
                        <a
                            href="#"
                            @click.prevent.stop="editPost(item.id, item.editor)">

                            {{ item.title }}

                            <icon
                                v-if="item.isFeatured"
                                size="xs"
                                name="featured-post"
                                strokeColor="color-helper-6"
                                :title="$t('post.thisPostIsFeatured')" />
                            <icon
                                v-if="item.isHidden"
                                size="xs"
                                name="hidden-post"
                                strokeColor="color-7"
                                :title="$t('post.thisPostIsHidden')" />
                            <icon
                                v-if="item.isExcludedOnHomepage"
                                name="excluded-post"
                                size="xs"
                                strokeColor="color-3"
                                :title="$t('post.thisPostIsExcludedFromHomepage')" />
                            <icon
                                v-if="item.isDraft"
                                size="xs"
                                name="draft-post"
                                strokeColor="color-7"
                                :title="$t('post.thisPostIsADraft')" />
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
                    type="publish-dates">
                    <span class="publish-date">{{ getCreationDate(item.created) }}</span>
                    <span
                        v-if="!showModificationDateAsColumn && showModificationDate"
                        class="modify-date">
                        {{ $t('ui.lastModified') }}: {{ getModificationDate(item.modified) }}
                    </span>
                </collection-cell>

                <collection-cell
                    v-if="showModificationDate && showModificationDateAsColumn"
                    type="modification-dates">
                    <span class="modify-date">
                        {{ getModificationDate(item.modified) }}
                    </span>
                </collection-cell>

                <collection-cell
                    type="authors">
                    <a
                        href="#"
                        @click.prevent.stop="setFilter('author:' + item.author)">
                        {{ item.author }}
                    </a>
                </collection-cell>

                <collection-cell>
                    {{ item.id }}
                </collection-cell>
            </collection-row>
        </collection>

        <empty-state
            v-if="emptySearchResults"
            :description="$t('post.noPostsMatchingYourCriteria')"></empty-state>

        <div
            v-if="dataLoaded && !hasPosts"
            class="empty-state post">

           <div>
                <img :src="'../src/assets/svg/' + appTheme + '/wysiwyg-editor.svg'" height="286" width="331" />
                <h3>{{ $t('post.editorWYSIWYG') }}</h3>
                <p>{{ $t('post.editorWYSIWYGInfo') }}</p>
                <p-button
                    slot="button"
                    icon="add-site-mono"
                    type="icon"
                    :onClick="addNewPost.bind(this, 'tinymce')">
                    {{ $t('post.addNewPost') }}
                </p-button>
           </div>

           <div>
                <img :src="'../src/assets/svg/' + appTheme + '/block-editor.svg'" height="286" width="331" />
                <h3>{{ $t('post.editorBlock') }}</h3>
                <p>{{ $t('post.editorBlockInfo') }}</p>
                <p-button
                    slot="button"
                    icon="add-site-mono"
                    type="icon"
                    :onClick="addNewPost.bind(this, 'blockeditor')">
                    {{ $t('post.addNewPost') }}
                </p-button>
           </div>

           <div>
                <img :src="'../src/assets/svg/' + appTheme + '/markdown-editor.svg'" height="286" width="331" />
                <h3>{{ $t('post.editorMarkdown') }}</h3>
                <p>{{ $t('post.editorMarkdownInfo') }}</p>
                <p-button
                    slot="button"
                    icon="add-site-mono"
                    type="icon"
                    :onClick="addNewPost.bind(this, 'markdown')">
                    {{ $t('post.addNewPost') }}
                </p-button>
           </div>
        </div>
    </section>
</template>

<script>
import CollectionCheckboxes from './mixins/CollectionCheckboxes.js';

export default {
    name: 'posts',
    mixins: [
        CollectionCheckboxes
    ],
    data () {
        return {
            appTheme: '',
            bulkDropdownVisible: false,
            dataLoaded: false,
            filterValue: '',
            selectedItems: [],
            orderBy: 'id',
            order: 'DESC'
        };
    },
    computed: {
        items () {
            let items = this.$store.getters.sitePosts(this.filterValue, this.orderBy, this.order);
            items = items.filter(item => item.title !== null);

            items.forEach((item, i) => {
                if (item.tags.length) {
                    item.tags.sort((tagA, tagB) => tagA.name.localeCompare(tagB.name));
                }
            });

            return items;
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
            if(!this.$store.state.currentSite || !this.$store.state.currentSite.posts) {
                return {
                    all: 0,
                    published: 0,
                    featured: 0,
                    hidden: 0,
                    excluded: 0,
                    drafts: 0,
                    trashed: 0
                };
            }

            return {
                all: this.$store.state.currentSite.posts.filter((post) => post.status.indexOf('trashed') === -1).length,
                published: this.$store.state.currentSite.posts.filter((post) => post.status.indexOf('trashed') === -1 && post.status.indexOf('draft') === -1).length,
                featured: this.$store.state.currentSite.posts.filter((post) => post.status.indexOf('trashed') === -1 && post.status.indexOf('featured') > -1).length,
                hidden: this.$store.state.currentSite.posts.filter((post) => post.status.indexOf('trashed') === -1 && post.status.indexOf('hidden') > -1).length,
                excluded: this.$store.state.currentSite.posts.filter((post) => post.status.indexOf('trashed') === -1 && post.status.indexOf('excluded_homepage') > -1).length,
                drafts: this.$store.state.currentSite.posts.filter((post) => post.status.indexOf('trashed') === -1 && post.status.indexOf('draft') > -1).length,
                trashed: this.$store.state.currentSite.posts.filter((post) => post.status.indexOf('trashed') > -1).length
            }
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
    async mounted () {
        this.appTheme = await this.$root.getCurrentAppTheme();
        this.orderBy = this.$store.state.ordering.posts.orderBy;
        this.order = this.$store.state.ordering.posts.order;
        this.$bus.$on('site-loaded', this.whenSiteLoaded);

        this.$bus.$on('posts-filter-value-changed', (newValue) => {
            this.filterValue = newValue.trim().toLowerCase();
        });

        this.$bus.$on('document-body-clicked', this.closeBulkDropdown);

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
    },
    methods: {
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
        filterCssClasses (type) {
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

            mainProcessAPI.send('app-pages-hierarchy-update', itemsToChange);

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
                type: 'posts',
                orderBy: this.orderBy,
                order: this.order
            });
        },
        toggleBulkDropdown () {
            this.bulkDropdownVisible = !this.bulkDropdownVisible;
        },
        closeBulkDropdown () {
            this.bulkDropdownVisible = false;
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
        this.$bus.$off('site-loaded', this.whenSiteLoaded);
        this.$bus.$off('posts-filter-value-changed');
        this.$bus.$off('document-body-clicked', this.closeBulkDropdown);
    }
}
</script>

<style lang="scss" scoped>
@import '../scss/variables.scss';
@import '../scss/empty-states.scss';

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

.header {
    overflow-y: visible!important;
}

.item {
    .post-tags {
        display: flex;
        flex-wrap: wrap;

        a {
            order: 2;
            margin: .2rem .5rem 0 0;

            &.is-main-tag {
                order: 1;
            }
        }
    }

    .post-slug {
        color: var(--gray-4);
        font-size: 11px;
        margin-top: .2rem;
    }
}

.filters {
    font-size: 1.35rem;
    list-style-type: none;
    margin: -2.2rem 0 0 0;
    padding: 0;
    position: relative;
    user-select: none;
    z-index: 1;

    .label {
        color: var(--text-light-color);
        float: left;
        margin-right: 1rem;
    }

    .filter-value {
        color: var(--text-light-color);
        cursor: pointer;
        display: inline-block;
        margin-right: 1rem;
        transition: var(--transition);

        &.filter-active {
            color: var(--link-primary-color);
        }

        &:hover {
            color: var(--link-primary-color);
        }

        &:last-child {
            border-right: none;
        }
    }
}

.tools {
    
    .dropdown-wrapper {
        position: relative;

        .dropdown {
            background: var(--popup-bg);
            border-radius: var(--border-radius);
            box-shadow: var(--box-shadow-medium);
            left: 0;
            list-style-type: none;
            margin: 0;
            padding: 1rem 0;
            position: absolute;
            top: 4rem;
            width: auto;
            z-index: 1;

            li {
                color: var(--text-light-color);
                cursor: pointer;
                display: block;
                font-size: 1.4rem;
                font-weight: var(--font-weight-semibold);
                padding: .8rem 2.4rem;
                white-space: nowrap;

                &:hover {
                    background: var(--gray-1);
                    color: var(--text-primary-color);
                }

                & > svg {
                    margin-right: 4px;
                    vertical-align: text-bottom;
                }
            }
        }
    }
}
</style>
