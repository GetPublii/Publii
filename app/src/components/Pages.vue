<template>
    <section :class="{ 
        'content': true, 
        'hierarchy-mode-enabled': hierarchyMode 
    }">
        <p-header
            v-if="hasPages"
            :title="$t('ui.pages')">
            <header-search
                slot="search"
                ref="search"
                :placeholder="$t('page.filterOrSearchPages')"
                onChangeEventName="pages-filter-value-changed" />

            <btn-dropdown
                slot="buttons"
                buttonColor="green"
                localStorageKey="publii-current-page-editor"
                :previewIcon="true"
                :items="dropdownItems"
                defaultValue="tinymce" />
        </p-header>

        <ul
            v-if="dataLoaded && hasPages"
            class="filters">
            <li
                :class="filterCssClasses('all')"
                @click="setFilter('')">
                {{ $t('page.all') }} <span class="filter-count">({{ counters.all }})</span>
            </li>

            <li
                :class="filterCssClasses('published')"
                @click="setFilter('is:published')">
                {{ $t('page.published') }} <span class="filter-count">({{ counters.published }})</span>
            </li>

            <li
                v-if="counters.drafts"
                :class="filterCssClasses('draft')"
                @click="setFilter('is:draft')">
                {{ $t('page.drafts') }} <span class="filter-count">({{ counters.drafts }})</span>
            </li>

            <li
                v-if="counters.trashed"
                :class="filterCssClasses('trashed')"
                @click="setFilter('is:trashed')">
                {{ $t('page.trashed') }} <span class="filter-count">({{counters.trashed }})</span>
            </li>

            <li
                :class="{
                   'filter-value': true,
                   'is-hierarchy': true,
                   'is-hierarchy-active': !!hierarchyMode
                }">
                <a
                    href="#"
                    class="edit-page-hierarchy"
                    @click="toggleHierarchyMode">
                    <icon
                        name="settings"
                        size="xs" />
                    {{ hierarchyMode ? $t('page.closeHierarchy') : $t('page.editHierarchy') }}
                </a>
            </li>
        </ul>

        <collection
            v-if="dataLoaded && !emptySearchResults && hasPages"
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
                            <strong>{{ $t('page.title') }}</strong>
                        </template>
                        <template v-else>{{ $t('page.title') }}</template>

                        <span class="order-descending" v-if="orderBy === 'title' && order === 'ASC'"></span>
                        <span class="order-ascending" v-if="orderBy === 'title' && order === 'DESC'"></span>
                    </span>
                </collection-cell>

                <collection-cell>
                    <span
                        class="col-sortable-title"
                        @click="ordering('created')">
                        <template v-if="orderBy === 'created'">
                            <strong>{{ $t('page.publicationDate') }}</strong>
                        </template>
                        <template v-else>{{ $t('page.publicationDate') }}</template>

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
                            <strong>{{ $t('page.modificationDate') }}</strong>
                        </template>
                        <template v-else>{{ $t('page.modificationDate') }}</template>

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
                        {{ $t('page.moveToTrash') }}
                    </p-button>

                    <p-button
                        v-if="!trashVisible"
                        icon="duplicate"
                        type="small light icon"
                        :onClick="bulkDuplicate">
                        {{ $t('page.duplicate') }}
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
                                v-if="selectedPagesNeedsStatus('published')"
                                @click="bulkPublish">
                                <icon
                                    size="xs"
                                    name="publish-post" />
                                {{ $t('page.publish') }}
                            </li>
                            <li
                                v-if="selectedPagesNeedsStatus('draft')"
                                @click="bulkUnpublish">
                                <icon
                                    size="xs"
                                    name="draft-post" />
                                {{ $t('page.markAsDraft') }}
                            </li>
                            <li
                                @click="bulkConvertToPost">
                                <icon
                                    size="xs"
                                    name="convert-to-page" />
                                {{ $t('page.convertToPost') }}
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
                    type="titles"
                    :style="'--item-depth: ' + (item.depth || 0)"
                    :data-item-depth="item.depth || 0">

                    <template v-if="item.depth > 0">
                        <span class="collection-nested-arrow"></span>
                    </template>

                    <h2 :class="{
                        'title': true,
                        'is-homepage': homepageID === item.id
                    }"> 
                        <a
                            href="#"
                            @click.prevent.stop="editPage(item.id, item.editor)">

                            {{ item.title }}

                            <strong v-if="homepageID === item.id">
                                &ndash; {{ $t('page.isHomepage') }}
                            </strong>

                            <icon
                                v-if="item.isDraft"
                                size="xs"
                                name="draft-post"
                                primaryColor="color-7"
                                :title="$t('page.thisPageIsADraft')" />
                        </a>
                    </h2>

                    <div
                        v-if="showPageSlugs && !hierarchyMode && !item.isTrashed && !item.isDraft"
                        class="page-slug">
                        {{ $t('page.url') }}: {{ item.fullSlug }}
                    </div>

                    <div v-if="hierarchyMode">
                        <a
                            v-if="!subpageSelected"
                            href="#"
                            class="page-item-select"
                            :title="$t('page.moveItem')"
                            @click.prevent="selectItem(item.id)">
                            {{ $t('page.moveItem') }}
                        </a>
                        
                        <a
                            v-if="subpageSelected && item.id === subpageSelected"
                            href="#"
                            class="page-item-unselect"
                            :title="$t('page.unselectItem')"
                            @click.prevent="unselectItem()">
                            <icon
                                class="page-item-move-icon"
                                customWidth="22"
                                customHeight="22"
                                name="sidebar-close"/> 
                            {{ $t('page.unselectItem') }}
                        </a>

                        <span 
                            v-if="subpageSelected && subpageSelected !== item.id && subpageSelectedChildren.indexOf(item.id) === -1"
                            class="page-item-insert-actions">
                            {{ $t('page.insertActions') }}:
                        </span>

                        <a
                            v-if="subpageSelected && subpageSelected !== item.id && subpageSelectedChildren.indexOf(item.id) === -1"
                            href="#"
                            class="page-item-insert-before"
                            :title="$t('page.insertBefore')"
                            @click.prevent="moveSelectedItem('before', item.id)">
                            <icon
                                class="page-item-move-icon"
                                size="xs"
                                name="move-up"/> 
                            {{ $t('page.insertBefore') }}
                        </a>

                        <a
                            v-if="subpageSelected && subpageSelected !== item.id && subpageSelectedChildren.indexOf(item.id) === -1"
                            href="#"
                            class="page-item-insert-after"
                            :title="$t('page.insertAfter')"
                            @click.prevent="moveSelectedItem('after', item.id)">
                            <icon
                                class="page-item-move-icon"
                                size="xs"
                                name="move-down"/> 
                            {{ $t('page.insertAfter') }}
                        </a>

                        <a
                            v-if="subpageSelected && subpageSelected !== item.id && subpageSelectedChildren.indexOf(item.id) === -1"
                            href="#"
                            class="page-item-insert-as-child"
                            :title="$t('page.insertAsChild')"
                            @click.prevent="moveSelectedItem('child', item.id)">
                            {{ $t('page.insertAsChild') }} 
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
            :description="$t('page.noPagesMatchingYourCriteria')">
        </empty-state>

        <div
            v-if="dataLoaded && !hasPages"
            class="empty-state page">

           <div>
                <img :src="'../src/assets/svg/' + appTheme + '/wysiwyg-editor.svg'" height="286" width="331" />
                <h3>{{ $t('page.editorWYSIWYG') }}</h3>
                <p>{{ $t('page.editorWYSIWYGInfo') }}</p>
                <p-button
                    slot="button"
                    icon="add-site-mono"
                    type="icon"
                    :onClick="addNewPage.bind(this, 'tinymce')">
                    {{ $t('page.addNewPage') }}
                </p-button>
           </div>

           <div>
                <img :src="'../src/assets/svg/' + appTheme + '/block-editor.svg'" height="286" width="331" />
                <h3>{{ $t('page.editorBlock') }}</h3>
                <p>{{ $t('page.editorBlockInfo') }}</p>
                <p-button
                    slot="button"
                    icon="add-site-mono"
                    type="icon"
                    :onClick="addNewPage.bind(this, 'blockeditor')">
                    {{ $t('page.addNewPage') }}
                </p-button>
           </div>

           <div>
                <img :src="'../src/assets/svg/' + appTheme + '/markdown-editor.svg'" height="286" width="331" />
                <h3>{{ $t('page.editorMarkdown') }}</h3>
                <p>{{ $t('page.editorMarkdownInfo') }}</p>
                <p-button
                    slot="button"
                    icon="add-site-mono"
                    type="icon"
                    :onClick="addNewPage.bind(this, 'markdown')">
                    {{ $t('page.addNewPage') }}
                </p-button>
           </div>
        </div>
    </section>
</template>

<script>
import Vue from 'vue';
import CollectionCheckboxes from './mixins/CollectionCheckboxes.js';

export default {
    name: 'pages',
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
            pagesHierarchy: null,
            hierarchyMode: false,
            subpageSelected: false,
            order: 'DESC',
            orderBy: '',
            subpageSelectedChildren: []
        };
    },
    computed: {
        items () {
            let items = this.$store.getters.sitePages(this.filterValue, this.orderBy, this.order).filter(item => item.title !== null);

            if (this.filterValue !== '' || this.orderBy !== '') {
                return items;
            }

            let itemsMap = new Map(items.map(item => [item.id, item]));
            let flatItems = this.hierarchyFlatten();
            let usedItems = [];

            flatItems.forEach(flatItem => {
                let item = itemsMap.get(flatItem.id);

                if (!item) {
                    return;
                }

                usedItems.push(flatItem.id);

                if (item) {
                    item.depth = flatItem.depth;
                    item.parentIds = flatItem.parentIds;
                    item.fullSlug = this.generateSlug(item, itemsMap);
                }
            });

            let results = flatItems.map(flatItem => itemsMap.get(flatItem.id));

            // restore items that are not in hierarchy
            items.forEach(item => {
                if (item && usedItems.indexOf(item.id) === -1) {
                    item.depth = 0;
                    item.parentIds = [];

                    if (this.$store.state.currentSite.config.advanced.urls.cleanUrls) {
                        item.fullSlug = `/` + item.slug;
                    } else {
                        item.fullSlug = `/${item.slug}.html`;
                    }

                    results.push(item);
                }
            });

            return results.filter(item => !!item);
        },
        hasPages () {
            return this.$store.state.currentSite.pages && !!this.$store.state.currentSite.pages.length;
        },
        emptySearchResults () {
            return this.filterValue !== '' && !this.items.length;
        },
        trashVisible () {
            return this.filterValue.indexOf('is:trashed') > -1;
        },
        counters () {
            if(!this.$store.state.currentSite || !this.$store.state.currentSite.pages) {
                return {
                    all: 0,
                    published: 0,
                    drafts: 0,
                    trashed: 0
                };
            }
            return {
                all: this.$store.state.currentSite.pages.filter((page) => page.status.indexOf('trashed') === -1).length,
                published: this.$store.state.currentSite.pages.filter((page) => page.status.indexOf('trashed') === -1 && page.status.indexOf('draft') === -1).length,
                drafts: this.$store.state.currentSite.pages.filter((page) => page.status.indexOf('trashed') === -1 && page.status.indexOf('draft') > -1).length,
                trashed: this.$store.state.currentSite.pages.filter((page) => page.status.indexOf('trashed') > -1).length
            }
        },
        showModificationDate () {
            return this.$store.state.app.config.showModificationDate;
        },
        showModificationDateAsColumn () {
            return this.$store.state.app.config.showModificationDateAsColumn;
        },
        dropdownItems () {
            return [
                {
                    label: this.$t('page.editorWYSIWYGUse'),
                    activeLabel: this.$t('page.addNewPage'),
                    value: 'tinymce',
                    icon: 'wysiwyg',
                    isVisible: () => true,
                    onClick: this.addNewPage.bind(this, 'tinymce')
                },
                {
                    label: this.$t('page.editorBlockUse'),
                    activeLabel: this.$t('page.addNewPage'),
                    value: 'blockeditor',
                    icon: 'block',
                    isVisible: () => true,
                    onClick: this.addNewPage.bind(this, 'blockeditor')
                },
                {
                    label: this.$t('page.editorMarkdownUse'),
                    activeLabel: this.$t('page.addNewPage'),
                    value: 'markdown',
                    icon: 'markdown',
                    isVisible: () => true,
                    onClick: this.addNewPage.bind(this, 'markdown')
                }
            ]
        },
        showPageSlugs () {
            return this.$store.state.app.config.showPostSlugs;
        },
        homepageID () {
            if (this.$store.state.currentSite.config.advanced.usePageAsFrontpage) {
                return this.$store.state.currentSite.config.advanced.pageAsFrontpage;
            }
            
            return false;
        }
    },
    async mounted () {
        this.appTheme = await this.$root.getCurrentAppTheme();
        this.orderBy = this.$store.state.ordering.pages.orderBy;
        this.order = this.$store.state.ordering.pages.order;
        this.$bus.$on('site-loaded', this.whenSiteLoaded);

        this.$bus.$on('pages-filter-value-changed', (newValue) => {
            this.filterValue = newValue.trim().toLowerCase();
        });

        this.$bus.$on('document-body-clicked', this.closeBulkDropdown);

        // It is available when user comes from Tags/Authors views
        let newFilterValue = localStorage.getItem('publii-pages-search-value');

        if(newFilterValue) {
            localStorage.removeItem('publii-pages-search-value');
            setTimeout (() => {
                this.setFilter(newFilterValue);
            }, 0);
        }

        this.$bus.$on('site-switched', () => {
            setTimeout(() => {
                this.saveOrdering(this.$store.state.ordering.pages.orderBy, this.$store.state.ordering.pages.order);
            }, 500);
        });

        this.$bus.$on('app-settings-saved', newSettings => {
            if (this.orderBy + ' ' + this.order !== newSettings.pagesOrdering) {
                let order = newSettings.pagesOrdering.split(' ');
                this.saveOrdering(order[0], order[1]);
            }
        });

        if (this.$store.state.currentSite.pages) {
            this.dataLoaded = true;
        }

        if (this.$route.params.filter === 'trashed') {
            this.setFilter('is:trashed');
        }

        mainProcessAPI.send('app-pages-hierarchy-load', this.$store.state.currentSite.config.name);

        mainProcessAPI.receiveOnce('app-pages-hierarchy-loaded', (data) => {
            if (!data) {
                this.pagesHierarchy = this.$store.getters.sitePages(this.filterValue, this.orderBy, this.order)
                                                            .filter(item => item.title !== null)
                                                            .map(item => ({id: item.id, subpages: []}));
                this.hierarchySave();
                return;
            }

            this.pagesHierarchy = JSON.parse(JSON.stringify(data));
            this.checkHierarchyIntegrity();
        });

        this.checkPagesSupport();
    },
    methods: {
        addNewPage (editorType) {
            if (
                editorType === 'blockeditor' &&
                this.$store.state.currentSite.themeSettings &&
                this.$store.state.currentSite.themeSettings.supportedFeatures &&
                !this.$store.state.currentSite.themeSettings.supportedFeatures.blockEditor
            ) {
                this.$bus.$emit('confirm-display', {
                    message: this.$t('page.editorBlockNotSupportedNewPageInfo'),
                    okLabel: this.$t('page.openEditorAnyway'),
                    isDanger: true,
                    okClick: () => {
                        this.openEditor(false, editorType);
                    }
                });
                return;
            }

            this.openEditor(false, editorType);
        },
        editPage (id, editorType) {
            if (
                editorType === 'blockeditor' &&
                this.$store.state.currentSite.themeSettings &&
                this.$store.state.currentSite.themeSettings.supportedFeatures &&
                !this.$store.state.currentSite.themeSettings.supportedFeatures.blockEditor
            ) {
                this.$bus.$emit('confirm-display', {
                    message: this.$t('page.editorBlockNotSupportedEditPageInfo'),
                    okLabel: this.$t('page.editPageAnyway'),
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
                localStorage.setItem('publii-pages-search-value', this.filterValue);
            }

            this.$store.commit('setEditorOpenState', true);
            this.$router.push('/site/' + siteName + '/pages/editor/' + editorType + '/' + (id !== false ? id : ''));
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
                    'filter-active': this.filterValue.indexOf('is:' + type) === 0,
                    'filter-inactive': !!this.hierarchyMode
                };
            }

            return {
                'filter-all': true,
                'filter-value': true,
                'filter-active': this.filterValue.indexOf('is:') === -1,
                'filter-inactive': !!this.hierarchyMode
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
                message: this.$t('page.removePageMessage'),
                isDanger: true,
                okClick: this.deleteSelected
            });
        },
        bulkConvertToPost () {
            let itemsToChange = this.getSelectedItems();

            this.$store.commit('changePagesToPosts', {
                pageIDs: itemsToChange
            });

            mainProcessAPI.send('app-page-status-change', {
                "site": this.$store.state.currentSite.config.name,
                "ids": itemsToChange,
                "status": 'is-page',
                "inverse": true
            });

            this.updateHierarchyForConvertedPages(itemsToChange);
            
            mainProcessAPI.receiveOnce('app-page-status-changed', () => {
                this.selectedItems = [];
            });

            this.$bus.$emit('message-display', {
                message: this.$t('page.pageStatusChangeSuccessMessage'),
                type: 'success',
                lifeTime: 3
            });
        },
        deleteSelected () {
            let itemsToRemove = this.getSelectedItems();

            mainProcessAPI.send('app-page-delete', {
                "site": this.$store.state.currentSite.config.name,
                "ids": itemsToRemove
            });

            mainProcessAPI.receiveOnce('app-page-deleted', () => {
                this.$store.commit('removePages', itemsToRemove);
                this.selectedItems = [];

                this.$bus.$emit('message-display', {
                    message: this.$t('page.removePageSuccessMessage'),
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
        bulkDuplicate () {
            let itemsToDuplicate = this.getSelectedItems();

            mainProcessAPI.send('app-page-duplicate', {
                "site": this.$store.state.currentSite.config.name,
                "ids": itemsToDuplicate
            });

            mainProcessAPI.receiveOnce('app-page-duplicated', (data) => {
                if(!data) {
                    this.$bus.$emit('message-display', {
                        message: this.$t('page.duplicatePageErrorMessage'),
                        type: 'warning',
                        lifeTime: 3
                    });

                    return;
                } else {
                    this.$bus.$emit('message-display', {
                        message: this.$t('page.duplicatePageSuccessMessage'),
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
                    this.updateHierarchyForDuplicatedPages();
                });
            });
        },
        bulkRestore () {
            this.changeStateForSelected('trashed', true);
        },
        changeStateForSelected (status, inverse = false) {
            let itemsToChange = this.getSelectedItems();

            this.$store.commit('changePagesStatus', {
                pageIDs: itemsToChange,
                status: status,
                inverse: inverse
            });

            if (status === 'trashed' && !inverse) {
                this.updateHierarchyForTrashedPages(itemsToChange);
            } else if (status === 'trashed' && inverse) {
                this.updateHierarchyForRestoredPages(itemsToChange);

                // Skip to the "All" filter when trash is emptied
                Vue.nextTick(() => {
                    if (this.counters.trashed === 0) {
                        this.filterValue = '';
                        this.$refs['search'].close();
                    }
                });
            }

            mainProcessAPI.send('app-page-status-change', {
                "site": this.$store.state.currentSite.config.name,
                "ids": itemsToChange,
                "status": status,
                "inverse": inverse
            });

            mainProcessAPI.receiveOnce('app-page-status-changed', () => {
                this.selectedItems = [];
            });

            this.$bus.$emit('message-display', {
                message: this.$t('page.pageStatusChangeSuccessMessage'),
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
                type: 'pages',
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
        selectedPagesNeedsStatus (status) {
            let selectedPages = this.items.filter(item => this.selectedItems.indexOf(item.id) > -1);

            if (!selectedPages.length) {
                return false;
            }

            let pagesWithoutGivenStatus = selectedPages.filter(item => item.status.indexOf(status) === -1);

            return !!pagesWithoutGivenStatus.length;
        },
        selectedPagesHaveStatus (status) {
            let selectedPages = this.items.filter(item => this.selectedItems.indexOf(item.id) > -1);

            if (!selectedPages.length) {
                return false;
            }

            let pagesWithGivenStatus = selectedPages.filter(item => item.status.indexOf(status) > -1);

            return !!pagesWithGivenStatus.length;
        },
        toggleHierarchyMode () {
            this.subpageSelected = false;
            this.subpageSelectedChildren = [];
            this.hierarchyMode = !this.hierarchyMode;  

            if (this.hierarchyMode && !this.$store.state.currentSite.config.advanced.urls.cleanUrls) {
                this.$bus.$emit('confirm-display', {
                    hasInput: false,
                    message: this.$t('page.cleanUrlsDisabled'),
                    okClick: this.goToSettings,
                    okLabel: this.$t('ui.enablePrettyURLs')
                });
            }

            if (this.hierarchyMode) {
                this.filterValue = '';
                this.selectedItems = [];
                this.orderBy = '';
                this.order = 'DESC';
                this.setFilter('');
                this.saveOrdering(this.orderBy, this.order);
            }
        },
        goToSettings () {
            let siteName = this.$route.params.name;
            this.$router.push('/site/' + siteName + '/settings/');
        },
        selectItem (id) {
            this.subpageSelected = id;
            this.subpageSelectedChildren = this.items.filter(item => item.parentIds.indexOf(id) > -1).map(item => item.id);
        },
        unselectItem () {
            this.subpageSelected = false;
            this.subpageSelectedChildren = [];
        },
        findAndRemoveItem(pages, selectedItem) {
            for (let i = 0; i < pages.length; i++) {
                if (pages[i].id === selectedItem) {
                    return pages.splice(i, 1)[0];
                } else if (pages[i].subpages.length > 0) {
                    let result = this.findAndRemoveItem(pages[i].subpages, selectedItem);
                    
                    if (result) {
                        return result;
                    }
                }
            }

            return null;
        },
        findItemAndParent(pages, id) {
            for (let i = 0; i < pages.length; i++) {
                if (pages[i].id === id) {
                    return { 
                        item: pages[i], 
                        parent: pages 
                    };
                } else if (pages[i].subpages.length > 0) {
                    let result = this.findItemAndParent(pages[i].subpages, id);
                    
                    if (result) {
                        return result;
                    }
                }
            }

            return null;
        },
        moveSelectedItem (position, id) {
            let selectedItem = this.findAndRemoveItem(this.pagesHierarchy, this.subpageSelected);
            let target = this.findItemAndParent(this.pagesHierarchy, id);
            let { item: targetItem, parent: targetParent } = target;

            switch (position) {
                case 'before': targetParent.splice(targetParent.indexOf(targetItem), 0, selectedItem); break;
                case 'after': targetParent.splice(targetParent.indexOf(targetItem) + 1, 0, selectedItem); break;
                case 'child': targetItem.subpages.push(selectedItem); break;
                default: break;
            }

            this.hierarchySave();
            this.unselectItem();
        },
        hierarchySave () {
            mainProcessAPI.send('app-pages-hierarchy-save', {
                siteName: this.$store.state.currentSite.config.name,
                hierarchy: this.pagesHierarchy
            });
        },
        hierarchyFlatten () {
            let flatStructure = [];
            let pagesHierarchy = JSON.parse(JSON.stringify(this.pagesHierarchy));
            this.hierarchyRecursiveFlatten(flatStructure, pagesHierarchy);
            return flatStructure;
        },
        hierarchyRecursiveFlatten (flatStructure, subpages, depth = 0, parentIds = []) {
            if (!Array.isArray(subpages) || subpages.length === 0) {
                return;
            }

            subpages.filter(subpage => !!subpage).forEach((page) => {
                let currentSubpage = {
                    id: page.id,
                    depth: depth,
                    parentIds: [...parentIds]
                };
                flatStructure.push(currentSubpage);

                if (Array.isArray(page.subpages) && page.subpages.length > 0) {
                    this.hierarchyRecursiveFlatten (flatStructure, page.subpages, depth + 1, [...parentIds, page.id]);
                }
            });
        },
        generateSlug (item, items) {
            if (!item.parentIds || item.parentIds.length === 0 || !this.$store.state.currentSite.config.advanced.urls.cleanUrls) {
                if (!this.$store.state.currentSite.config.advanced.urls.cleanUrls) {
                    return `/${item.slug}.html`;
                }

                return `/${item.slug}`;
            }

            let slugs = [];
            item.parentIds.forEach(parentId => {
                let parentItem = items.get(parentId);

                if (parentItem) {
                    slugs.push(parentItem.slug);
                }
            });

            return `/${slugs.join('/')}/${item.slug}`;
        },
        findAllChildrenIdsInItems (parentID) {
            let children = this.hierarchyFlatten().filter(item => item.parentIds.indexOf(parentID) > -1);
            let childrenIDs = children.map(child => child.id);
            return childrenIDs;
        },
        updateHierarchyForRestoredPages (restoredPages) {
            restoredPages.forEach(restoredPage => {
                this.pagesHierarchy.push({ 
                    id: restoredPage, 
                    subpages: []
                });
                this.hierarchySave();
            });
        },
        updateHierarchyForTrashedPages (trashedPages) {
            let childrenIDs = trashedPages.map(trashedPage => this.findAllChildrenIdsInItems(trashedPage));
            let childrenIDsFlat = childrenIDs.flat();
            let childrenIDsUnique = [...new Set(childrenIDsFlat)];
            let childrenToAdd = childrenIDsUnique.filter(childID => !trashedPages.includes(childID));

            trashedPages.forEach(trashedPage => {
                this.findAndRemoveItem(this.pagesHierarchy, trashedPage);
            });

            childrenToAdd.forEach(childID => {
                this.pagesHierarchy.push({ 
                    id: childID, 
                    subpages: []
                });
            });
        
            this.hierarchySave();
        },
        updateHierarchyForPublishPages () {

        },
        updateHierarchyForDraftPages () {

        },
        updateHierarchyForDuplicatedPages () {
            let rootHierarchyItems = this.pagesHierarchy.map(item => item.id);
            let rootItems = this.items.filter(item => item.depth === 0).map(item => item.id);
            let itemsToAdd = rootItems.filter(item => !rootHierarchyItems.includes(item));

            itemsToAdd.forEach(item => {
                this.pagesHierarchy.push({ 
                    id: item, 
                    subpages: []
                });
            });

            this.hierarchySave();
        },
        checkPagesSupport () {
            let sessionStorageName = this.$store.state.currentSite.config.name.replace(/[^a-z\-0-9]/gmi, '');

            if (window.sessionStorage.getItem('pages-info-displayed-for-site-' + sessionStorageName)) {
                return;
            }

            if (
                !this.$store.state.currentSite.themeSettings.supportedFeatures ||
                !this.$store.state.currentSite.themeSettings.supportedFeatures.pages
            ) {
                window.sessionStorage.setItem('pages-info-displayed-for-site-' + sessionStorageName, true);
                this.$bus.$emit('confirm-display', {
                    hasInput: false,
                    message: this.$t('ui.pagesSupportNotEnabledMessage'),
                    isDanger: true,
                    okClick: () => false,
                    cancelClick: this.checkWhatsChanged,
                    okLabel: this.$t('ui.ok'),
                    cancelLabel: this.$t('ui.learnMore'),
                    cancelNotClosePopup: true
                });
            }
        },
        checkWhatsChanged () {
            mainProcessAPI.shellOpenExternal('https://getpublii.com/dev/how-to-add-pages-support-to-your-theme/');
        },
        checkHierarchyIntegrity () {
            let flatStructure = this.hierarchyFlatten();
            let itemsMap = new Map(this.items.map(item => [item.id, item]));
            let usedItems = [];

            flatStructure.forEach(flatItem => {
                let item = itemsMap.get(flatItem.id);

                if (!item) {
                    return;
                }

                usedItems.push(flatItem.id);
            });

            // find items that are not in hierarchy
            this.items.forEach(item => {
                if (usedItems.indexOf(item.id) === -1) {
                    this.pagesHierarchy.push({ 
                        id: item.id, 
                        subpages: []
                    });

                    console.log('Add missing item to hierarchy', item.id);
                }
            });

            this.hierarchySave();
        },
        updateHierarchyForConvertedPages (convertedPages) {
            let childrenIDs = convertedPages.map(convertedPage => this.findAllChildrenIdsInItems(convertedPage));
            let childrenIDsFlat = childrenIDs.flat();
            let childrenIDsUnique = [...new Set(childrenIDsFlat)];
            let childrenToAdd = childrenIDsUnique.filter(childID => !convertedPages.includes(childID));

            convertedPages.forEach(convertedPage => {
                let item = this.findAndRemoveItem(this.pagesHierarchy, convertedPage);

                if (item) {
                    this.hierarchySave();
                }
            });

            childrenToAdd.forEach(childID => {
                this.pagesHierarchy.push({ 
                    id: childID, 
                    subpages: []
                });
            });
        
            this.hierarchySave();
        }
    },
    beforeDestroy () {
        this.$bus.$off('site-loaded', this.whenSiteLoaded);
        this.$bus.$off('pages-filter-value-changed');
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

.content.hierarchy-mode-enabled {
    .heading {
        .search,
        ::v-deep .buttons {
            filter: grayscale(1);
            opacity: .5;
            pointer-events: none;
        }
    }

    .collection-wrapper {
        input[type="checkbox"] {
            pointer-events: none;
        }
    }

    .col.titles .title {
        pointer-events: none;

        a {
            color: var(--text-light-color);
        }
    }
}

.header {
    overflow-y: visible!important;
}

.item {
    .page-slug {
        color: var(--gray-4);
        font-size: 11px;
        margin-top: .2rem;
    }

    .col.titles {
        padding-left: calc(1.8rem + (2.4rem * var(--item-depth)));
        position: relative;
    }

    .page-item-select,
    .page-item-submenu,
    .page-item-insert-before,
    .page-item-insert-after,
    .page-item-insert-as-child,
    .page-item-unselect {
        color: var(--link-primary-color);
        display: inline-block;
        font-size: 1.4rem;
        padding: 0 .5rem;

        &:active,
        &:focus,
        &:hover {
            color: var(--link-primary-color-hover);
        }
        
    }

    .page-item-select,
    .page-item-unselect,
    .page-item-insert-actions{
        &:first-child {
           padding-left: 0;
        }
    }

    .page-item-insert-actions {
        color: var(--text-light-color);
        font-size: 1.4rem;
        padding: 0 .5rem;
    }

    .page-item-unselect {
        color: var(--warning);
        left: -9px;
        position: relative;

        & > svg {
            fill: var(--warning);
            position: relative;
            left: -3px;
            top: 3px;
        }
    }

    .page-item-submenu,
    .page-item-insert-before,
    .page-item-insert-after {
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

    .page-item-move-icon {
        vertical-align: text-bottom;
    }
}

.filters {
    display: flex;
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

        &.is-hierarchy {
            margin-left: auto;
            margin-right: 0;

            a {
                align-items: center;
                display: inline-flex;
                gap: 6px;
                margin-top: 8px;
            }
        }
    }

    .filter-inactive {
        filter: grayscale(1);
        opacity: 0.5;
        pointer-events: none;
    }

    .filter-all::first-letter {
        text-transform: capitalize;
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
.collection-nested-arrow {
    display: block;
    border-radius: 0 0 0 2px;
    width: 11px; 
    height: 8px;
    border-left: 1px solid var(--gray-4);
    border-bottom: 1px solid var(--gray-4);
    position: absolute;
    left: calc(-.6rem + (2.4rem * var(--item-depth)));
    top: 50%;
	transform: translate(0, -50%);
}

.edit-page-hierarchy-warning {
    color: var(--warning);
    padding-right: 1rem;
    position: relative;
    top: -4px;
}

/*
 * Responsive improvements
 */

@media (max-width: 1300px) {
    .item .page-item-insert-actions {
        display: block;
        padding-bottom: 0!important;
    }
    .item .page-item-insert-before {
        margin-left: -4px;
        padding-left: 0;
    }
}
</style>
