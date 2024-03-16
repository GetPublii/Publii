<template>
    <div :class="{ 'options-sidebar-container': true, 'post-editor-sidebar': true, 'is-visible': isVisible }" >
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
                                <dt>{{ $t('post.postState') }}</dt>
                                <dd id="post-status">
                                    {{ $parent.postData.status }}
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
                        </div>

                        <div
                            v-if="!isEdit"
                            class="post-info post-info--nogrid">

                            <dl>
                                <dt>{{ $t('post.postAuthor') }}</dt>
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
                                            {{ $t('post.setCustomPostDate') }}
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
                        </div>

                        <div class="post-action">
                            <label id="post-featured-wrapper">
                                <switcher
                                    v-model="$parent.postData.isFeatured" />
                                <span>
                                    {{ $t('post.markAsFeatured') }}
                                </span>

                                <icon
                                    :title="$t('post.markAsFeatured')"
                                    class="switcher-item-icon-helper"
                                    name="featured-post"
                                    size="xs"
                                    primaryColor="color-helper-1" />
                            </label>

                            <label id="post-hidden-wrapper">
                                <switcher
                                    :title="$t('post.postWillNotAppearOnListMsg')"
                                    v-model="$parent.postData.isHidden" />
                                <span :title="$t('post.postWillNotAppearOnListMsg')">
                                    {{ $t('post.hidePost') }}
                                </span>

                                <icon
                                    :title="$t('post.hidePost')"
                                    class="switcher-item-icon-helper"
                                    name="hidden-post"
                                    size="xs"
                                    primaryColor="color-6" />
                            </label>

                            <label id="post-excluded-homepage-wrapper">
                                <switcher
                                    :title="$t('post.postWillNotAppearOnHomepageListMsg')"
                                    v-model="$parent.postData.isExcludedOnHomepage" />
                                <span :title="$t('post.postWillNotAppearOnHomepageListMsg')">
                                    {{ $t('post.excludeFromHomepage') }}
                                </span>

                                <icon
                                    :title="$t('post.excludeFromHomepage')"
                                    class="switcher-item-icon-helper"
                                    name="excluded-post"
                                    size="xs"
                                    primaryColor="color-3"/>
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

                <div class="options-sidebar-item">
                    <div
                        :class="{ 'options-sidebar-header': true, 'is-open': openedItem === 'tags' }"
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
                                {{ $t('post.postSlugTooLong') }}
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
                                <label>{{ $t('post.postSlug') }}:
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
                                    <small class="note">{{ $t('settings.pageTitleVariables') }}</small>
                                </label>

                                <label class="with-char-counter">
                                    {{ $t('ui.metaDescription') }}:
                                    <text-area
                                        v-model="$parent.postData.metaDescription"
                                        :charCounter="true"
                                        :spellcheck="$store.state.currentSite.config.spellchecking"
                                        :preferredCount="160"></text-area>
                                    <small class="note">{{ $t('settings.pageTitleVariables') }}</small>
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
                                {{ $t('post.postTemplate') }}:

                                <dropdown
                                    :items="postTemplates"
                                    :disabled="!hasPostTemplates"
                                    v-model="$parent.postData.template"
                                    id="post-template">
                                    <option
                                        v-if="hasPostTemplates"
                                        value="*"
                                        :selected="$parent.postData.template === '*'"
                                        slot="first-choice">
                                        {{ $t('settings.useGlobalConfiguration') }}
                                    </option>
                                    <option
                                        v-if="hasPostTemplates"
                                        value=""
                                        :selected="$parent.postData.template === ''"
                                        slot="first-choice">
                                        {{ $t('theme.defaultTemplate') }}
                                    </option>
                                    <option
                                        v-if="!hasPostTemplates"
                                        value=""
                                        slot="first-choice">
                                        {{ $t('ui.notAvailableInYourTheme') }}
                                    </option>
                                </dropdown>

                                <small
                                    v-if="$parent.postData.template === '*'"
                                    slot="note">
                                    {{ $t('post.currentDefaultTemplate') }}:
                                    <strong>
                                        {{ $store.state.currentSite.themeSettings.postTemplates[$store.state.currentSite.themeSettings.defaultTemplates.post] }}
                                    </strong>
                                </small>
                            </label>

                            <template v-for="(field, index) of postViewThemeSettings">
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
                                        v-model="$parent.postData.postViewOptions[field.name]"
                                        :items="generateItems(field.options)">
                                        <option slot="first-choice" value="">{{ $t('settings.useGlobalConfiguration') }}</option>
                                    </dropdown>

                                    <text-input
                                        v-if="field.type === 'text' || field.type === 'number'"
                                        :type="field.type"
                                        class="post-view-settings"
                                        :spellcheck="$store.state.currentSite.config.spellchecking"
                                        :placeholder="fieldPlaceholder(field)"
                                        v-model="$parent.postData.postViewOptions[field.name]" />

                                    <text-area
                                        v-if="field.type === 'textarea'"
                                        class="post-view-settings"
                                        :placeholder="fieldPlaceholder(field)"
                                        :spellcheck="$store.state.currentSite.config.spellchecking"
                                        v-model="$parent.postData.postViewOptions[field.name]" />

                                    <color-picker
                                        v-if="field.type === 'colorpicker'"
                                        class="post-view-settings"
                                        v-model="$parent.postData.postViewOptions[field.name]"
                                        :outputFormat="field.outputFormat ? field.outputFormat : 'RGBAorHEX'">
                                    </color-picker>

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
export default {
    name: 'post-editor-sidebar',
    props: {
        'isVisible': {
            default: false,
            type: Boolean
        }
    },
    data () {
        return {
            openedItem: 'status',
            tagIsRestricted: false
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
        postTemplates () {
            return this.$store.state.currentSite.themeSettings.postTemplates;
        },
        hasPostTemplates () {
            return !!Object.keys(this.postTemplates).length;
        },
        postViewThemeSettings () {
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
        }
    },
    mounted () {
        this.$bus.$on('author-changed', (newAuthor) => {
            this.$parent.postData.author = parseInt(newAuthor, 10);
        });

        if (!this.isEdit) {
            this.$parent.postData.template = this.defaultPostTemplate;
        } else if (!!this.$parent.postData.mainTag) {
            let foundedTag = this.$store.state.currentSite.tags.filter(tag => tag.id === this.$parent.postData.mainTag);

            if (!foundedTag.length) {
                this.$parent.postData.mainTag = '';
            }
        }
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
            if (!field.postTemplates) {
                return true;
            }

            if (field.postTemplates.indexOf('!') === 0) {
                return !(field.postTemplates.replace('!', '').split(',').indexOf(this.$parent.postData.template) > -1);
            }

            return field.postTemplates.split(',').indexOf(this.$parent.postData.template) > -1;
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
        }
    },
    beforeDestroy () {
        this.$bus.$off('post-editor-featured-image-loaded');
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
            height: 10rem;
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
                padding: 0 0 3.6rem;

                .image-uploader {
                    margin-top: 0;
                }
            }

        
            #post-featured-wrapper {
                margin-top: 0;
            }
        }

        .switcher-item-icon-helper {
            margin: 0 .5rem;
            position: relative;
            top: .1rem;
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
