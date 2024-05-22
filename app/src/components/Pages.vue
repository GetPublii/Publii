<template>
    <section class="content">
        <p-header
            v-if="hasPages"
            :title="$t('ui.pages')">
            <header-search
                v-if="!hierarchyMode"
                slot="search"
                ref="search"
                :placeholder="$t('page.filterOrSearchPages')"
                onChangeEventName="pages-filter-value-changed" />

            <btn-dropdown
                v-if="!hierarchyMode"
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
                }"
                @click="toggleHierarchyMode">
                <template v-if="hierarchyMode">
                    {{ $t('page.closeHierarchy') }}
                </template>
                <template v-else>
                    {{ $t('page.configurePagesHierarchy') }}
                </template>
            </li>
        </ul>

        <collection
            v-if="dataLoaded && !emptySearchResults && hasPages"
            :itemsCount="showModificationDate && showModificationDateAsColumn ? 6 : 5">
            <collection-header slot="header">
                <collection-cell>
                    <checkbox
                        v-if="!hierarchyMode"
                        value="all"
                        :checked="anyCheckboxIsSelected"
                        :onClick="toggleAllCheckboxes.bind(this, false)"
                        @click.native="$bus.$emit('document-body-clicked')" />
                </collection-cell>

                <collection-cell>
                    {{ $t('page.title') }}
                </collection-cell>

                <collection-cell>
                    {{ $t('page.publicationDate') }}
                </collection-cell>

                <collection-cell
                    v-if="showModificationDate && showModificationDateAsColumn">
                    {{ $t('page.modificationDate') }}
                </collection-cell>

                <collection-cell min-width="110px">
                    {{ $t('author.author') }}
                </collection-cell>

                <collection-cell min-width="35px">
                    {{ $t('ui.id') }}
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
                                name="draft-page"
                                primaryColor="color-8" />
                                {{ $t('page.publish') }}
                            </li>
                            <li
                                v-if="selectedPagesNeedsStatus('draft')"
                                @click="bulkUnpublish">
                                <icon
                                size="xs"
                                name="draft-page"
                                primaryColor="color-7" />
                                {{ $t('page.markAsDraft') }}
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
                        v-if="!hierarchyMode"
                        :value="item.id"
                        :checked="isChecked(item.id)"
                        :onClick="toggleSelection"
                        :key="'collection-row-checkbox-' + index" />
                </collection-cell>

                <collection-cell
                    type="titles"
                    :style="'--item-depth: ' + item.depth">
                    <h2 class="title">
                        <a
                            href="#"
                            @click.prevent.stop="editPage(item.id, item.editor)">

                            {{ item.title }}

                            <icon
                                v-if="item.isDraft"
                                size="xs"
                                name="draft-page"
                                primaryColor="color-7"
                                :title="$t('page.thisPageIsADraft')" />
                        </a>
                    </h2>

                    <div
                        v-if="showPageSlugs && !hierarchyMode"
                        class="page-slug">
                        {{ $t('page.url') }}: {{ item.fullSlug }}
                    </div>

                    <div v-if="hierarchyMode">
                        <a
                            v-if="!subpageSelected"
                            href="#"
                            class="menu-item-select"
                            :title="$t('menu.moveItem')"
                            @click.prevent="selectItem(item.id)">
                            {{ $t('menu.moveItem') }}
                        </a>
                        
                        <a
                            v-if="subpageSelected && item.id === subpageSelected"
                            href="#"
                            class="menu-item-unselect"
                            :title="$t('menu.unselectItem')"
                            @click.prevent="unselectItem()">
                            <icon
                                class="menu-item-move-icon"
                                customWidth="22"
                                customHeight="22"
                                name="sidebar-close"/> 
                            {{ $t('menu.unselectItem') }}
                        </a>

                        <span 
                            v-if="subpageSelected && subpageSelected !== item.id && subpageSelectedChildren.indexOf(item.id) === -1"
                            class="menu-item-insert-actions">
                            {{ $t('menu.insertActions') }}
                        </span>

                        <a
                            v-if="subpageSelected && subpageSelected !== item.id && subpageSelectedChildren.indexOf(item.id) === -1"
                            href="#"
                            class="menu-item-insert-before"
                            :title="$t('menu.insertBefore')"
                            @click.prevent="moveSelectedItem('before', item.id)">
                            <icon
                                class="menu-item-move-icon"
                                size="xs"
                                name="move-up"/> 
                            {{ $t('menu.insertBefore') }}
                        </a>

                        <a
                            v-if="subpageSelected && subpageSelected !== item.id && subpageSelectedChildren.indexOf(item.id) === -1"
                            href="#"
                            class="menu-item-insert-after"
                            :title="$t('menu.insertAfter')"
                            @click.prevent="moveSelectedItem('after', item.id)">
                            <icon
                                class="menu-item-move-icon"
                                size="xs"
                                name="move-down"/> 
                            {{ $t('menu.insertAfter') }}
                        </a>

                        <a
                            v-if="subpageSelected && subpageSelected !== item.id && subpageSelectedChildren.indexOf(item.id) === -1"
                            href="#"
                            class="menu-item-insert-as-child"
                            :title="$t('menu.insertAsChild')"
                            @click.prevent="moveSelectedItem('child', item.id)">
                            {{ $t('menu.insertAsChild') }} 
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
            subpageSelectedChildren: []
        };
    },
    computed: {
        items () {
            let items = this.$store.getters.sitePages(this.filterValue).filter(item => item.title !== null);
            let itemsMap = new Map(items.map(item => [item.id, item]));
            let flatItems = this.hierarchyFlatten();

            flatItems.forEach(flatItem => {
                let item = itemsMap.get(flatItem.id);

                if (item) {
                    item.depth = flatItem.depth;
                    item.parentIds = flatItem.parentIds;
                    item.fullSlug = this.generateSlug(item, itemsMap);
                }
            });

            return flatItems.map(flatItem => itemsMap.get(flatItem.id));
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
        }
    },
    async mounted () {
        this.appTheme = await this.$root.getCurrentAppTheme();
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

        if (this.$store.state.currentSite.pages) {
            this.dataLoaded = true;
        }

        if (this.$route.params.filter === 'trashed') {
            this.setFilter('is:trashed');
        }

        mainProcessAPI.send('app-pages-hierarchy-load', this.$store.state.currentSite.config.name);

        mainProcessAPI.receiveOnce('app-pages-hierarchy-loaded', (data) => {
            if (!data) {
                this.pagesHierarchy = this.$store.getters.sitePages(this.filterValue)
                                                            .filter(item => item.title !== null)
                                                            .map(item => ({id: item.id, subpages: []}));
                this.hierarchySave();
                return;
            }

            this.pagesHierarchy = JSON.parse(JSON.stringify(data));
        });
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

            if (this.hierarchyMode) {
                this.filterValue = '';
            }
        },
        hierarchyFindParentAndIndex (pages, id, parent = null, parentIndex = null) {
            for (let i = 0; i < pages.length; i++) {
                if (pages[i].id === id) {
                    return { parent, parentIndex, index: i };
                }

                if (pages[i].subpages && pages[i].subpages.length > 0) {
                    let found = this.hierarchyFindParentAndIndex(pages[i].subpages, id, pages, i);

                    if (found) {
                        return found;
                    }
                }
            }

            return null;
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

            subpages.forEach((page) => {
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
            if (!item.parentIds || item.parentIds.length === 0) {
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
        padding-left: calc(2rem + (2rem * var(--item-depth)));
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
        }
    }

    .filter-inactive {
        opacity: 0.25;
        pointer-events: none;
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
