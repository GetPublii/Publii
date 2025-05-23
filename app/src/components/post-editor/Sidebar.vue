<template>
    <div :class="{ 
        'options-sidebar-container': true, 
        'post-editor-sidebar': true, 
        'is-visible': isVisible 
    }">
        <div class="options-sidebar">
            <div class="options-sidebar-item">
                <div
                    :class="{ 'options-sidebar-header': true, 'is-open': openedItem === 'status' }"
                    class="is-first"
                    @click="openItem('status')">
                    <icon
                        class="options-sidebar-icon"
                        size="s"
                        name="sidebar-status"/>

                    <span class="options-sidebar-label">{{ $t('post.status') }}</span>
                </div>

                <div
                    class="post-editor-settings"
                    style="max-height: none;"
                    ref="status-content-wrapper">
                    <div
                        class="post-editor-settings-content"
                        ref="status-content">
                        <div
                            v-if="isEdit"
                            class="post-info">
                            <dl>
                                <dt v-if="itemType === 'post'">{{ $t('post.postState') }}</dt>
                                <dt v-if="itemType === 'page'">{{ $t('page.pageState') }}</dt>
                                <dd id="post-status">
                                    {{ filteredStatus }}
                                </dd>
                            </dl>

                            <dl>
                                <dt>{{ $t('author.author') }}</dt>
                                <dd>
                                    <a
                                        href="#"
                                        @click.prevent="changeAuthor">
                                        {{ authorName }}
                                    </a>
                                </dd>
                            </dl>

                            <dl>
                                <dt>{{ $t('post.published') }}</dt>
                                <dd>
                                    <a
                                        href="#"
                                        @click.prevent="changeDate">
                                        {{ $parent.postData.creationDate.text }}
                                    </a>
                                </dd>
                            </dl>

                            <dl>
                                <dt>{{ $t('post.updatedOn') }}</dt>
                                <dd id="post-date-modified">
                                    {{ $parent.postData.modificationDate.text }}
                                </dd>
                            </dl>

                            <dl 
                                v-if="itemType === 'page' && pagesStructureLoaded"
                                class="page-parent-page-wrapper">
                                <dt>{{ $t('page.parentPage') }}</dt>
                                <dd id="page-parent-page">
                                    <dropdown
                                        key="page-parent-dropdown"
                                        id="page-parent-page-dropdown"
                                        :value="parentPage"
                                        :onChange="changeParentPage"
                                        :items="flatPagesList"></dropdown>
                                </dd>
                            </dl>
                        </div>

                        <div
                            v-if="!isEdit"
                            class="post-info post-info--nogrid">

                            <dl>
                                <dt v-if="itemType === 'post'">{{ $t('post.postAuthor') }}</dt>
                                <dt v-if="itemType === 'page'">{{ $t('page.pageAuthor') }}</dt>
                                <dd>
                                    <dropdown
                                        id="post-author-id"
                                        v-model="$parent.postData.author"
                                        :items="authors"></dropdown>
                                </dd>
                            </dl>

                            <dl class="post-date">
                                <dt>{{ $t('post.published') }}</dt>
                                <dd>
                                    <a
                                        href="#"
                                        @click.prevent="changeDate">

                                        <template v-if="!$parent.postData.creationDate.text">
                                            <template v-if="itemType === 'post'">
                                                {{ $t('post.setCustomPostDate') }}
                                            </template>
                                            <template v-if="itemType === 'page'">
                                                {{ $t('page.setCustomPageDate') }}
                                            </template>
                                        </template>

                                        <template v-if="$parent.postData.creationDate.text">
                                            {{ $t('post.changePostDate') }}

                                            <small>
                                                ({{ $parent.postData.creationDate.text }})
                                            </small>

                                            <span
                                                class="post-date-reset"
                                                @click.stop.prevent="resetCreationDate()">
                                                &times;
                                            </span>

                                        </template>
                                    </a>
                                </dd>
                            </dl>

                            <dl v-if="itemType === 'page' && pagesStructureLoaded">
                                <dt>{{ $t('page.parentPage') }}</dt>
                                <dd id="page-parent-page">
                                    <dropdown
                                        key="page-parent-dropdown"
                                        id="page-parent-page-dropdown"
                                        :value="parentPage"
                                        :onChange="changeParentPage"
                                        :items="flatPagesList"></dropdown>
                                </dd>
                            </dl>
                        </div>

                        <div 
                            v-if="itemType === 'post'"
                            class="post-action">
                            <label id="post-featured-wrapper">
                                <switcher
                                    v-model="$parent.postData.isFeatured" />
                                <icon
                                    :title="$t('post.markAsFeatured')"
                                    class="switcher-item-icon-helper"
                                    name="featured-post"
                                    size="xs"
                                    strokeColor="color-helper-6" />
                                <span>
                                    {{ $t('post.markAsFeatured') }}
                                </span>
                            </label>

                            <label id="post-hidden-wrapper">
                                <switcher
                                    :title="$t('post.postWillNotAppearOnListMsg')"
                                    v-model="$parent.postData.isHidden" />
                                <icon
                                    :title="$t('post.hidePost')"
                                    class="switcher-item-icon-helper"
                                    name="hidden-post"
                                    size="xs"
                                    strokeColor="color-6" />
                                <span :title="$t('post.postWillNotAppearOnListMsg')">
                                    {{ $t('post.hidePost') }}
                                </span>
                            </label>

                            <label id="post-excluded-homepage-wrapper">
                                <switcher
                                    :title="$t('post.postWillNotAppearOnHomepageListMsg')"
                                    v-model="$parent.postData.isExcludedOnHomepage" />
                                <icon
                                    :title="$t('post.excludeFromHomepage')"
                                    class="switcher-item-icon-helper"
                                    name="excluded-post"
                                    size="xs"
                                    strokeColor="color-3"/>
                                <span :title="$t('post.postWillNotAppearOnHomepageListMsg')">
                                    {{ $t('post.excludeFromHomepage') }}
                                </span>
                            </label>
                        </div>
                    </div>
                </div>
            </div>

            <div class="options-sidebar-item">
                <div
                    :class="{ 'options-sidebar-header': true, 'is-open': openedItem === 'image' }"
                    @click="openItem('image')">
                    <icon
                        class="options-sidebar-icon"
                        size="s"
                        name="sidebar-image"/>

                    <span class="options-sidebar-label">{{ $t('ui.featuredImage') }}</span>
                </div>

                <div
                    class="post-editor-settings"
                    ref="image-content-wrapper">
                    <div
                        class="post-editor-settings-content"
                        ref="image-content">
                        <image-upload
                            ref="featured-image"
                            :item-id="$parent.postID"
                            v-model="$parent.postData.featuredImage.path"
                            imageType="featuredImages" />

                        <div
                            v-if="$parent.postData.featuredImage.path"
                            class="image-uploader-settings-form">
                            <label>{{ $t('ui.alternativeText') }}
                                <text-input
                                    ref="featured-image-alt"
                                    :spellcheck="$store.state.currentSite.config.spellchecking"
                                    v-model="$parent.postData.featuredImage.alt" />
                            </label>

                            <label>{{ $t('ui.caption') }}
                                <text-input
                                    ref="featured-image-caption"
                                    :spellcheck="$store.state.currentSite.config.spellchecking"
                                    v-model="$parent.postData.featuredImage.caption" />
                            </label>

                            <label>{{ $t('ui.credits') }}
                                <text-input
                                    ref="featured-image-credits"
                                    :spellcheck="$store.state.currentSite.config.spellchecking"
                                    v-model="$parent.postData.featuredImage.credits" />
                            </label>
                        </div>
                    </div>
                </div>

                <div 
                    v-if="itemType === 'post'"
                    class="options-sidebar-item">
                    <div
                        :class="{ 
                            'options-sidebar-header': true, 
                            'is-open': openedItem === 'tags' 
                        }"
                        @click="openItem('tags')">
                        <icon
                            class="options-sidebar-icon"
                            size="s"
                            name="sidebar-tags"/>

                        <span class="options-sidebar-label">{{ $t('ui.tags') }}</span>
                    </div>

                    <div
                        class="post-editor-settings"
                        ref="tags-content-wrapper">
                        <div
                            class="post-editor-settings-content post-editor-settings-content-tags"
                            ref="tags-content">
                            <div class="post-tags">
                                <label id="post-tags-wrapper">
                                    <v-select
                                        v-model="$parent.postData.tags"
                                        :tag-placeholder="$t('tag.addThisAsNewTag')"
                                        :options="availableTags"
                                        :searchable="true"
                                        :show-labels="false"
                                        placeholder=""
                                        :multiple="true"
                                        :taggable="true"
                                        @remove="removeTag"
                                        @tag="addTag"></v-select>

                                    <small
                                        v-if="tagIsRestricted"
                                        class="post-tags-error">
                                        {{ $t('tag.tagIsNotAllowed') }}
                                    </small>
                                </label>
                            </div>

                            <div
                                v-if="$parent.postData.tags.length > 1"
                                class="post-main-tag">
                                <label>
                                    {{ $t('tag.mainTag') }}:
                                    <dropdown
                                        id="post-main-tag"
                                        v-model="$parent.postData.mainTag"
                                        :items="tagsForDropdown">
                                    </dropdown>

                                    <small class="note">
                                        {{ $t('tag.noMainTagForPostMsg') }}
                                    </small>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="options-sidebar-item">
                    <div
                        :class="{ 'options-sidebar-header': true, 'is-open': openedItem === 'seo' }"
                        @click="openItem('seo')">
                        <icon
                            class="options-sidebar-icon"
                            size="s"
                            name="sidebar-seo"/>

                        <span class="options-sidebar-label">
                            {{ $t('ui.seo') }}

                            <span
                                v-if="$parent.postData.slug.length > 250"
                                class="options-sidebar-label-warning">
                                <template v-if="itemType === 'post'">{{ $t('post.postSlugTooLong') }}</template>
                                <template v-if="itemType === 'page'">{{ $t('page.pageSlugTooLong') }}</template>
                            </span>
                        </span>
                    </div>

                    <div
                        class="post-editor-settings"
                        ref="seo-content-wrapper">
                        <div
                            class="post-editor-settings-content"
                            ref="seo-content">
                            <div class="post-seo">
                                <label>
                                    <template v-if="itemType === 'post'">{{ $t('post.postSlug') }}:</template>
                                    <template v-if="itemType === 'page'">{{ $t('page.pageSlug') }}:</template>
                                    <div class="options-sidebar-item-slug">
                                        <input
                                            type="text"
                                            v-model="$parent.postData.slug"
                                            spellcheck="false"
                                            @keyup="$parent.slugUpdated">
                                        <p-button 
                                            :onClick="updateSlug" 
                                            :title="$t('ui.updateSlug')"
                                            icon="refresh"
                                            type="secondary icon">
                                        </p-button>
                                    </div>
                                    <small
                                        v-if="$parent.postData.slug.length > 250"
                                        class="note is-warning">
                                        {{ $t('post.postSlugLengthWarning') }}
                                    </small>
                                </label>

                                <label class="with-char-counter">
                                    {{ $t('settings.pageTitle') }}:
                                    <text-input
                                        type="text"
                                        v-model="$parent.postData.metaTitle"
                                        :spellcheck="$store.state.currentSite.config.spellchecking"
                                        :placeholder="$t('settings.leaveBlankToUseDefaultPageTitle')"
                                        :charCounter="true"
                                        :preferredCount="70" />
                                    <small class="note">
                                        <template v-if="itemType === 'post'">{{ $t('settings.postPageTitleVariables') }}:</template>
                                        <template v-if="itemType === 'page'">{{ $t('settings.pageTitleVariables') }}:</template>
                                    </small>
                                </label>

                                <label class="with-char-counter">
                                    {{ $t('ui.metaDescription') }}:
                                    <text-area
                                        v-model="$parent.postData.metaDescription"
                                        :charCounter="true"
                                        :spellcheck="$store.state.currentSite.config.spellchecking"
                                        :preferredCount="160"></text-area>
                                    <small class="note">
                                        <template v-if="itemType === 'post'">{{ $t('settings.postPageTitleVariables') }}:</template>
                                        <template v-if="itemType === 'page'">{{ $t('settings.pageTitleVariables') }}:</template>
                                    </small>
                                </label>

                                <label>
                                    {{ $t('ui.metaRobotsIndex') }}:
                                    <dropdown
                                        v-if="!$parent.postData.canonicalUrl"
                                        id="post-meta-robots"
                                        v-model="$parent.postData.metaRobots"
                                        :items="metaRobotsOptions">
                                    </dropdown>
                                    <div v-else>
                                        <small>{{ $t('ui.ifCanonicalUrlIsSetMetaRobotsTagIsIgnored') }}</small>
                                    </div>
                                </label>

                                <label>
                                    {{ $t('ui.canonicalURL') }}:
                                    <input
                                        type="text"
                                        v-model="$parent.postData.canonicalUrl"
                                        spellcheck="false"
                                        :placeholder="$t('tag.leaveBlankToUseDefaultTagPageURL')" />
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="options-sidebar-item">
                <div
                    :class="{ 'options-sidebar-header': true, 'is-open': openedItem === 'other' }"
                    @click="openItem('other')">
                    <icon
                        class="options-sidebar-icon"
                        size="s"
                        name="sidebar-options"/>

                    <span class="options-sidebar-label">{{ $t('ui.otherOptions') }}</span>
                </div>

                <div
                    class="post-editor-settings"
                    ref="other-content-wrapper">
                    <div
                        class="post-editor-settings-content"
                        ref="other-content">
                        <div class="post-other" id="post-view-settings">
                            <label id="post-template-wrapper">
                                <template v-if="itemType === 'post'">
                                    {{ $t('post.postTemplate') }}:
                                </template>
                                <template v-if="itemType === 'page'">
                                    {{ $t('page.pageTemplate') }}:
                                </template>

                                <dropdown
                                    :items="itemType === 'post' ? postTemplates : pageTemplates"
                                    :disabled="!hasTemplates"
                                    v-model="$parent.postData.template"
                                    id="post-template">
                                    <option
                                        v-if="hasTemplates"
                                        value="*"
                                        :selected="$parent.postData.template === '*'"
                                        slot="first-choice">
                                        {{ $t('settings.useGlobalConfiguration') }}
                                    </option>
                                    <option
                                        v-if="hasTemplates"
                                        value=""
                                        :selected="$parent.postData.template === ''"
                                        slot="first-choice">
                                        {{ $t('theme.defaultTemplate') }}
                                    </option>
                                    <option
                                        v-if="!hasTemplates"
                                        value=""
                                        slot="first-choice">
                                        {{ $t('ui.notAvailableInYourTheme') }}
                                    </option>
                                </dropdown>

                                <template v-if="itemType === 'post'">
                                    <small
                                        v-if="$parent.postData.template === '*'"
                                        slot="note">
                                        {{ $t('post.currentDefaultTemplate') }}:
                                        <strong>
                                            {{ $store.state.currentSite.themeSettings.postTemplates[$store.state.currentSite.themeSettings.defaultTemplates.post] }}
                                        </strong>
                                    </small>
                                </template>
                                <template v-else-if="itemType === 'page'">
                                    <small
                                        v-if="$parent.postData.template === '*'"
                                        slot="note">
                                        {{ $t('page.currentDefaultTemplate') }}:
                                        <strong>
                                            {{ $store.state.currentSite.themeSettings.pageTemplates[$store.state.currentSite.themeSettings.defaultTemplates.page] }}
                                        </strong>
                                    </small>
                                </template>
                            </label>

                            <template v-for="(field, index) of viewThemeSettings">
                                <separator
                                    v-if="displayField(field) && field.type === 'separator'"
                                    :label="field.label"
                                    :is-line="true"
                                    :note="field.note" />

                                <label
                                    v-if="displayField(field) && field.type !== 'separator'"
                                    :key="'post-view-field-' + index">
                                    {{ field.label }}

                                    <dropdown
                                        v-if="!field.type || field.type === 'select'"
                                        :id="field.name + '-select'"
                                        class="post-view-settings"
                                        v-model="$parent.postData.viewOptions[field.name]"
                                        :items="generateItems(field.options)">
                                        <option slot="first-choice" value="">{{ $t('settings.useGlobalConfiguration') }}</option>
                                    </dropdown>

                                    <text-input
                                        v-if="field.type === 'text' || field.type === 'number'"
                                        :type="field.type"
                                        class="post-view-settings"
                                        :spellcheck="$store.state.currentSite.config.spellchecking"
                                        :placeholder="fieldPlaceholder(field)"
                                        v-model="$parent.postData.viewOptions[field.name]" />

                                    <text-area
                                        v-if="field.type === 'textarea'"
                                        class="post-view-settings"
                                        :placeholder="fieldPlaceholder(field)"
                                        :spellcheck="$store.state.currentSite.config.spellchecking"
                                        v-model="$parent.postData.viewOptions[field.name]" />

                                    <color-picker
                                        v-if="field.type === 'colorpicker'"
                                        class="post-view-settings"
                                        v-model="$parent.postData.viewOptions[field.name]"
                                        :outputFormat="field.outputFormat ? field.outputFormat : 'RGBAorHEX'">
                                    </color-picker>

                                    <image-upload
                                        v-if="field.type === 'image'"
                                        slot="field"
                                        v-model="$parent.postData.viewOptions[field.name]"
                                        :item-id="$parent.postID"
                                        imageType="contentImages" />

                                    <small
                                        v-if="field.note"
                                        class="note">
                                        {{ field.note }}
                                    </small>
                                </label>
                            </template>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import Vue from 'vue';

export default {
    name: 'post-editor-sidebar',
    props: {
        'itemType': {
            default: 'post',
            type: String
        },
        'isVisible': {
            default: false,
            type: Boolean
        }
    },
    data () {
        return {
            openedItem: 'status',
            tagIsRestricted: false,
            initialParentPage: null,
            parentPage: 0,
            pagesStructureLoaded: false,
            pagesHierarchy: [],
            flatStructure: []
        };
    },
    computed: {
        isEdit () {
            return !!this.$route.params.post_id;
        },
        authors () {
            let authors = [];
            let sortedAuthors = this.$store.state.currentSite.authors.slice().sort((a, b) => {
                if (a.name.toLowerCase() > b.name.toLowerCase()) {
                    return 1;
                }

                if (a.name.toLowerCase() < b.name.toLowerCase()) {
                    return -1;
                }

                return 0;
            });

            for (let author of sortedAuthors) {
                authors.push({
                    value: author.id,
                    label: author.name
                });
            }

            return authors;
        },
        authorName () {
            return this.$store.state.currentSite.authors.filter(author => author.id === this.$parent.postData.author)[0].name;
        },
        availableTags () {
            return this.$store.state.currentSite.tags.map(tag => tag.name);
        },
        metaRobotsOptions () {
            return {
                'index, follow': this.$t('ui.indexFollow'),
                'index, nofollow': this.$t('ui.indexNofollow'),
                'index, follow, noarchive': this.$t('ui.indexFollowNoArchive'),
                'index, nofollow, noarchive': this.$t('ui.indexNofollowNoArchive'),
                'noindex, follow': this.$t('ui.noindexFollow'),
                'noindex, nofollow': this.$t('ui.noindexNofollow')
            };
        },
        defaultPostTemplate () {
            let defaultTemplate = this.$store.state.currentSite.themeSettings.defaultTemplates.post;

            if (Object.keys(this.postTemplates).indexOf(defaultTemplate) > -1) {
                return defaultTemplate;
            }

            return '';
        },
        defaultPageTemplate () {
            let defaultTemplate = this.$store.state.currentSite.themeSettings.defaultTemplates.page;

            if (Object.keys(this.pageTemplates).indexOf(defaultTemplate) > -1) {
                return defaultTemplate;
            }

            return '';
        },
        postTemplates () {
            return this.$store.state.currentSite.themeSettings.postTemplates || [];
        },
        pageTemplates () {
            return this.$store.state.currentSite.themeSettings.pageTemplates || [];
        },
        hasTemplates () {
            if (this.itemType === 'page') {
                if (!this.pageTemplates) {
                    return false;
                }

                return !!Object.keys(this.pageTemplates).length;
            }

            return !!Object.keys(this.postTemplates).length;
        },
        viewThemeSettings () {
            if (this.itemType === 'page') {
                return this.$store.state.currentSite.themeSettings.pageConfig;
            }

            return this.$store.state.currentSite.themeSettings.postConfig;
        },
        tagsForDropdown () {
            return [{
                value: '',
                label: this.$t('ui.notSet')
            }].concat(this.$parent.postData.tags.map(tag => ({
                value: this.getTagIdByName(tag),
                label: tag
            })));
        },
        flatPagesList () {
            let pages = this.$store.getters.sitePages('');
            let flatPages = this.flatStructure.map(pageItem => {
                let pageData = pages.find(page => page.id === pageItem.id);
                return {
                    value: pageItem.id,
                    label: pageData ? '—'.repeat(pageItem.depth) + ' ' + pageData.title : '??'
                };
            });

            let noParentLabel = this.$t('page.noParentPage');
            return [{
                value: 0, 
                label: noParentLabel, 
            }].concat(flatPages);
        },
        filteredStatus () {
            let originalStatus = this.$parent.postData.status;
            originalStatus = originalStatus.split(',');
            originalStatus = originalStatus.map(status => status.trim());
            originalStatus = originalStatus.filter(status => status !== 'is-page');
            
            return originalStatus.join(', ');
        }
    },
    mounted () {
        this.$bus.$on('author-changed', (newAuthor) => {
            this.$parent.postData.author = parseInt(newAuthor, 10);
        });

        if (!this.isEdit) {
            this.$parent.postData.template = this.defaultPostTemplate;
        } else if (!!this.$parent.postData.mainTag && this.itemType === 'post') {
            let foundedTag = this.$store.state.currentSite.tags.filter(tag => tag.id === this.$parent.postData.mainTag);

            if (!foundedTag.length) {
                this.$parent.postData.mainTag = '';
            }
        }

        if (this.itemType === 'page') {
            mainProcessAPI.send('app-pages-hierarchy-load', this.$store.state.currentSite.config.name);

            mainProcessAPI.receiveOnce('app-pages-hierarchy-loaded', (data) => {
                if (!data) {
                    this.pagesHierarchy = this.$store.getters.sitePages('')
                                                                .filter(item => item.title !== null)
                                                                .map(item => ({id: item.id, subpages: []}));
                    this.hierarchySave();
                    this.flatStructure = this.flattenPages(0, this.pagesHierarchy, 0);
                    this.pagesStructureLoaded = true;
                    return;
                }

                this.pagesHierarchy = JSON.parse(JSON.stringify(data));
                this.flatStructure = this.flattenPages(0, this.pagesHierarchy, 0);
                this.pagesStructureLoaded = true;
            });
        }

        this.$bus.$on('page-data-updated', this.prepareStructureBeforeSave);
    },
    methods: {
        openItem (itemName) {
            if (this.openedItem === itemName) {
                this.closeItem();
                return;
            }

            this.closeItem();
            this.openedItem = itemName;
            let contentWrapper = this.$refs[this.openedItem + '-content-wrapper'];
            let content = this.$refs[this.openedItem + '-content'];
            contentWrapper.style.maxHeight = content.clientHeight + "px";

            setTimeout(function() {
                contentWrapper.style.maxHeight = 'none';

                if (content.classList.contains('post-editor-settings-content-tags')) {
                    contentWrapper.style.overflow = 'visible';
                }
            }, 300);
        },
        closeItem () {
            if (this.openedItem === '') {
                return;
            }

            let contentWrapper = this.$refs[this.openedItem + '-content-wrapper'];
            let content = this.$refs[this.openedItem + '-content'];
            this.openedItem = '';

            if (content.classList.contains('post-editor-settings-content-tags')) {
                contentWrapper.style.overflow = 'hidden';
            }

            contentWrapper.style.maxHeight = content.clientHeight + "px";

            setTimeout(function () {
                contentWrapper.style.maxHeight = 0;
            }, 50);
        },
        addTag (newTag) {
            this.tagIsRestricted = false;

            let restrictedSlugs = [
                'assets',
                'media',
                this.$store.state.currentSite.config.advanced.urls.authorsPrefix,
                this.$store.state.currentSite.config.advanced.urls.pageName
            ];

            if (this.$store.state.currentSite.config.advanced.urls.tagsPrefix !== '') {
                restrictedSlugs = [];
            }

            if (restrictedSlugs.indexOf(newTag.toLowerCase()) >= 0) {
                this.tagIsRestricted = true;
                return;
            }

            this.$parent.postData.tags.push(newTag);
        },
        removeTag (removedTagName) {
            let removedTagID = this.getTagIdByName(removedTagName);
            let mainTagName = this.getTagNameById(this.$parent.postData.mainTag);

            if (typeof removedTagID === 'string') {
                if (mainTagName === removedTagName) {
                    this.$parent.postData.mainTag = '';
                }
            } else {
                if (parseInt(removedTagID, 10) === parseInt(this.$parent.postData.mainTag, 10)) {
                    this.$parent.postData.mainTag = '';
                }
            }
        },
        getTagNameById (tagID) {
            let foundedTag = this.$store.state.currentSite.tags.filter(tag => tag.id === tagID);

            if (foundedTag.length) {
                return foundedTag[0].name;
            }

            return '';
        },
        getTagIdByName (tagName) {
            let foundedTag = this.$store.state.currentSite.tags.filter(tag => tag.name === tagName);

            if (foundedTag.length) {
                return foundedTag[0].id;
            }

            return tagName;
        },
        generateItems (arrayToConvert) {
            let options = {};

            for (let i = 0; i < arrayToConvert.length; i++) {
                options[arrayToConvert[i].value] = arrayToConvert[i].label;
            }

            return options;
        },
        changeAuthor () {
            this.$bus.$emit('author-popup-display', this.$parent.postData.author);
        },
        changeDate () {
            this.$bus.$emit('date-popup-display', this.$parent.postData.creationDate.timestamp);
        },
        displayField (field) {
            let templateField = this.itemType === 'page' ? 'pageTemplates' : 'postTemplates';

            if (!field[templateField]) {
                return true;
            }

            if (field[templateField].indexOf('!') === 0) {
                return !(field[templateField].replace('!', '').split(',').indexOf(this.$parent.postData.template) > -1);
            }

            return field[templateField].split(',').indexOf(this.$parent.postData.template) > -1;
        },
        fieldPlaceholder (field) {
            if (field.placeholder || field.placeholder === '') {
                return field.placeholder;
            }

			return this.$t('theme.leaveBlankToUseDefault');
        },
        resetCreationDate () {
            this.$parent.postData.creationDate.timestamp = 0;
            this.$parent.postData.creationDate.text = '';
        },
        updateSlug () {
            this.$bus.$emit('update-post-slug', true);
        },
        hierarchySave () {
            mainProcessAPI.send('app-pages-hierarchy-save', {
                siteName: this.$store.state.currentSite.config.name,
                hierarchy: this.pagesHierarchy
            });
        },
        flattenPages(parentID = 0, pages, depth = 0) {
            let result = [];
            
            pages.forEach(page => {
                if (this.$parent.postID && parseInt(page.id, 10) === parseInt(this.$parent.postID, 10)) {
                    this.parentPage = parseInt(parentID, 10);

                    if (this.initialParentPage === null) {
                        this.initialParentPage = this.parentPage;
                    }

                    return result;
                }

                result.push({ id: parseInt(page.id, 10), depth });

                if (page.subpages && page.subpages.length > 0) {
                    result = result.concat(this.flattenPages(page.id, page.subpages, depth + 1));
                }
            });

            return result;
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
        prepareStructureBeforeSave (pageID) {
            pageID = parseInt(pageID, 10);

            if (this.initialParentPage === this.parentPage) {
                return;
            }

            if (this.initialParentPage === null && this.parentPage === 0) {
                this.pagesHierarchy.push({ id: pageID, subpages: [] });
                this.hierarchySave();
                this.initialParentPage = this.parentPage;
                return;
            }

            if (this.initialParentPage === null && this.parentPage > 0) {
                let target = this.findItemAndParent(this.pagesHierarchy, this.parentPage);
                let { item: targetItem, parent: targetParent } = target;
                targetItem.subpages.push({ id: pageID, subpages: [] });
                this.hierarchySave();
                this.initialParentPage = this.parentPage;
                return;
            }

            if (this.initialParentPage !== null && this.parentPage === 0) {
                let selectedItem = this.findAndRemoveItem(this.pagesHierarchy, pageID);
                this.pagesHierarchy.push(selectedItem);
                this.hierarchySave();
                this.initialParentPage = this.parentPage;
                return 0;
            }

            let selectedItem = this.findAndRemoveItem(this.pagesHierarchy, pageID);
            let target = this.findItemAndParent(this.pagesHierarchy, this.parentPage);
            let { item: targetItem, parent: targetParent } = target;
            targetItem.subpages.push(selectedItem);
            this.hierarchySave();
            this.initialParentPage = this.parentPage;
        },
        changeParentPage (newParentPage) {
            Vue.set(this, 'parentPage', parseInt(newParentPage, 10));
        }
    },
    beforeDestroy () {
        this.$bus.$off('post-editor-featured-image-loaded');
        this.$bus.$off('page-data-updated');
        this.$bus.$off('author-changed');
    }
};
</script>

<style lang="scss">
@import '../../scss/variables.scss';
@import '../../scss/options-sidebar.scss';
@import '../../scss/mixins.scss';

.post-editor {
    &-sidebar {
        box-shadow: var(--box-shadow-medium);
        height: calc(100vh - var(--topbar-height));
        opacity: 0;
        pointer-events: none;
        top: var(--topbar-height);
        z-index: 99999;

        &.is-visible {
            opacity: 1;
            pointer-events: auto;
        }

        &:before {
            background: linear-gradient(to bottom, var(--option-sidebar-bg) 0%,var(--option-sidebar-bg) 75%,transparent 100%);
            content: "";
            height: 8rem;
            position: fixed;
            top: var(--topbar-height);
            right: 0;
            width: $options-sidebar-width;
            z-index: 1;
        }

        .options-sidebar {
            padding-top: 8rem;
        }

        &-header {
            color: var(--gray-3);
            font-size: 1.2rem;
            font-weight: 600;
            margin-top: 0;
            padding: 0 3.6rem 1.5rem;
            text-transform: uppercase;
        }

        .post-info {
            display: grid;
            grid-template-columns: repeat(2, 49%);
            grid-gap: 0 2%;
            margin-bottom: 1rem;

            &--nogrid {
                 display: block;
            }

            dl {
                margin: 0 0 3rem 0;

                &.page-parent-page-wrapper {
                    grid-column: span 2;
                    margin-bottom: 0;
                }
            }

            dt {
                color: var(--label-color);
                font-size: 1.4rem;
                margin: 0 0 .5rem 0;
            }

            dd {
                color: var(--gray-4);
                font-size: 1.3rem;
                margin: 0;

                a {
                    display: block;
                    position: relative;
                    white-space: nowrap;
                }
            }
        }

        .post-editor-settings {
            .post-author-selector {
                border-bottom: 1px solid var(--gray-1);
                margin-bottom: 2rem;
                padding-bottom: 0;
            }

            .post-date {
                margin-bottom: 2rem;

                dd {
                    font-size: $app-font-base;
                }

                small {
                    color: var(--gray-4);
                    padding: 0 .5rem;
                    position: relative;
                    top: -1px;
                }

                &-reset {
                    border-radius: 50%;
                    color: var(--icon-secondary-color);
                    font-size: 2.4rem;
                    font-weight: 300;
                    height: 3rem;
                    line-height: 1;
                    position: absolute;
                    right: 0;
                    text-align: center;
                    transition: var(--transition);
                    top: 50%;
                    transform: translate(0, -50%);
                    width: 3rem;

                    .icon {
                        cursor: pointer;
                        fill: currentColor;
                    }

                    &:active,
                    &:focus,
                    &:hover {
                        color: var(--headings-color);
                    }

                    &:hover {
                        background: var(--input-border-color);
                    }
                }
            }

            .post-action {
               label {
                  font-size: 1.4rem;
                  font-weight: var(--font-weight-normal);
                  line-height: 1.8;
               }
            }
        }

        .post-tags {
            line-height: 2;
            margin-bottom: 0;

            &-error {
                color: var(--warning);
                display: block;
                font-size: 1.4rem;
                padding: .5rem 0;

                &.is-hidden {
                    display: none;
                }
            }

            .multiselect,
            .multiselect__tags {
                min-height: 52px;
            }

            .multiselect__tags {
                padding: 0 4rem 0 0.5rem;
            }

            .multiselect__input {
                max-width: 120px;
            }
        }

        .post-editor-settings {
            max-height: 0;
            overflow: hidden;
            transition: max-height .25s ease-out;

            &-content {
                padding: 0 0 1rem;

                .image-uploader {
                    margin-top: 0;
                }
            }

        
            #post-featured-wrapper {
                margin-top: 0;
            }
        }

        .switcher-item-icon-helper {
            margin: 0 .5rem 0 0;
            position: relative;
            top: .2rem;
        }
    }
}

/*
 * Special styles for linux
 */

body[data-os="linux"] {
    .post-editor-sidebar {
        height: 100vh;
        top: 0;

        &:before {
            top: 0;
        }
    }
}

/*
 * Select2 adjustments
 */
.tags-dropdown .select2-results__option[aria-selected="true"] {
    display: none;
}

body > .select2-container {
    font-size: 1.4rem;

    .select2-results__option--highlighted[aria-selected] {
        background: var(--color-primary);
    }

    .select2-dropdown {
        background-color: var(--white);
        border: 1px solid var(--input-border-color);
        border-radius: 3px;
    }
}
</style>
