<template>
    <section :class="{ 'content': true, 'authors': true, 'authors-list-view': true, 'no-scroll': editorVisible }">
        <p-header :title="$t('ui.authors')">
            <header-search
                slot="search"
                :placeholder="$t('author.filterOrSearchAuthors')"
                onChangeEventName="authors-filter-value-changed" />

            <p-button
                :onClick="addAuthor"
                slot="buttons"
                type="primary icon"
                icon="add-site-mono">
                {{ $t('author.addNewAuthor') }}
            </p-button>
        </p-header>

        <collection
            v-if="!emptySearchResults"
            :itemsCount="4">
            <collection-header slot="header">
                <collection-cell>
                    <checkbox
                        value="all"
                        :checked="anyCheckboxIsSelected"
                        :onClick="toggleAllCheckboxes" />
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
                </div>
            </collection-header>

            <collection-row
                v-for="(item, index) in items"
                slot="content"
                :key="'collection-row-' + index"
                :cssClasses="item.id === 1 ? 'is-main-author' : ''">
                <collection-cell>
                    <checkbox
                        v-if="item.id !== 1"
                        :value="item.id"
                        :checked="isChecked(item.id)"
                        :onClick="toggleSelection"
                        :key="'collection-row-checkbox-' + index" />

                    <span
                        v-if="item.id === 1"
                        class="main-author-icon"
                        :title="$t('author.mainAuthorCannotBeRemoved')">
                        <icon
                            size="s"
                            name="padlock" />
                    </span>
                </collection-cell>

                <collection-cell type="titles">
                    <h2 class="title">
                        <a
                            href="#"
                            @click.prevent.stop="editAuthor(item)">
                            {{ item.name }}

                            <em
                                v-if="item.id === 1"
                                class="is-main-author">
                                ({{ $t('author.mainAuthor') }})
                            </em>
                        </a>
                    </h2>

                    <div
                        v-if="showAuthorSlugs"
                        class="author-slug">
                        {{ $t('author.url') }}: /{{ item.username }}<template v-if="!$store.state.currentSite.config.advanced.urls.cleanUrls">.html</template>
                    </div>
                </collection-cell>

                <collection-cell
                    justifyContent="center"
                    textAlign="center">
                    <a
                        @click.prevent.stop="showPostsConnectedWithAuthor(item.name)"
                        href="#">
                        {{ item.postsCounter }}
                    </a>
                </collection-cell>

                <collection-cell>
                    {{ item.id }}
                </collection-cell>
            </collection-row>
        </collection>

        <transition>
            <author-form
                v-if="editorVisible"
                :form-animation="formAnimation" />
        </transition>

        <empty-state
            v-if="emptySearchResults"
            :description="$t('author.noAuthorsMatchingYourCriteria')"></empty-state>
    </section>
</template>

<script>
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
            formAnimation: false,
            editorVisible: false,
            filterValue: '',
            selectedItems: [],
            orderBy: 'id',
            order: 'DESC'
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
            return this.$store.getters.siteAuthors(this.filterValue, this.orderBy, this.order);
        },
        emptySearchResults: function() {
            return this.filterValue !== '' && !this.items.length;
        },
        showAuthorSlugs () {
            return this.$store.state.app.config.showPostSlugs;
        }
    },
    beforeMount () {
        mainProcessAPI.send('app-authors-load', {
            "site": this.$store.state.currentSite.config.name
        });

        mainProcessAPI.receiveOnce('app-authors-loaded', (data) => {
            this.$store.commit('setAuthors', data.authors);
            this.$store.commit('setPostsAuthors', data.postsAuthors);
        });
    },
    mounted: function() {
        this.orderBy = this.$store.state.ordering.authors.orderBy;
        this.order = this.$store.state.ordering.authors.order;

        this.$bus.$on('authors-filter-value-changed', (newValue) => {
            this.filterValue = newValue.trim().toLowerCase();
        });

        this.$bus.$on('hide-author-item-editor', () => {
            if (document.querySelector('.authors-list-view .item.is-edited')) {
                document.querySelector('.authors-list-view .item.is-edited').classList.remove('is-edited');
            }

            this.editorVisible = false;
        });

        this.$bus.$on('site-switched', () => {
            setTimeout(() => {
                this.saveOrdering(this.$store.state.ordering.authors.orderBy, this.$store.state.ordering.authors.order);
            }, 500);
        });

        this.$bus.$on('app-settings-saved', newSettings => {
            if (this.orderBy + ' ' + this.order !== newSettings.authorsOrdering) {
                let order = newSettings.authorsOrdering.split(' ');
                this.saveOrdering(order[0], order[1]);
            }
        });
    },
    methods: {
        addAuthor () {
            this.$bus.$on('show-author-item-editor', () => ({
                id: 0,
                name: '',
                username: '',
                email: '',
                website: '',
                avatar: '',
                useGravatar: false,
                description: '',
                postsCounter: 0,
                metaTitle: '',
                metaDescription: '',
                template: '',
                authorTemplates: [],
                additionalData: {},
                visibleIndexingOptions: false
            }));

            this.editorVisible = true;
        },
        editAuthor (item) {
            if (document.querySelector('.authors-list-view .item.is-edited')) {
                document.querySelector('.authors-list-view .item.is-edited').classList.remove('is-edited');
            }

            let input = document.querySelector('.authors-list-view .item input[value="' + parseInt(item.id, 10) + '"]');
            
            if (input) {
                input.parentNode.parentNode.classList.add('is-edited');
            } else {
                document.querySelector('.authors-list-view .item.is-main-author').classList.add('is-edited');
            }

            this.editorVisible = true;

            setTimeout(() => {
                this.$bus.$emit('show-author-item-editor', item);
            }, 100);
        },
        bulkDelete: function() {
            this.$bus.$emit('confirm-display', {
                message: this.$t('author.removeAuthorsMessage'),
                isDanger: true,
                okClick: this.deleteSelected
            });
        },
        deleteSelected: function() {
            let itemsToRemove = this.getSelectedItems();
            itemsToRemove = itemsToRemove.filter(item => item !== 1);

            if(itemsToRemove.length === 0) {
                this.$bus.$emit('alert-display', {
                    message: this.$t('author.cannotRemoveMainAuthor')
                });

                return;
            }

            mainProcessAPI.send('app-author-delete', {
                "site": this.$store.state.currentSite.config.name,
                "ids": itemsToRemove
            });

            mainProcessAPI.receiveOnce('app-author-deleted', () => {
                this.$store.commit('removeAuthors', itemsToRemove);
                this.selectedItems = [];

                this.$bus.$emit('message-display', {
                    message: this.$t('author.removeAuthorsSuccessMessage'),
                    type: 'success',
                    lifeTime: 3
                });
            });
        },
        showPostsConnectedWithAuthor: function(name) {
            let siteName = this.$store.state.currentSite.config.name;
            localStorage.setItem('publii-posts-search-value', 'author:' + name);
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
        color: var(--text-light-color);
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

    .author-slug {
        color: var(--gray-4);
        font-size: 11px;
        margin-top: .2rem;
    }
}
</style>
