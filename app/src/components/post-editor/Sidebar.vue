<template>
    <div :class="{ 'post-editor-sidebar': true, 'is-visible': isVisible }">
        <div>
            <div class="post-editor-sidebar-header">
                Post settings
            </div>

            <div class="post-editor-settings-wrapper">
                <div
                    :class="{ 'post-editor-settings-header': true, 'is-open': openedItem === 'status' }"
                    @click="openItem('status')">
                    <icon
                        class="post-editor-settings-icon"
                        size="s"
                        name="sidebar-status"/>

                    <span class="post-editor-settings-label">Status</span>
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
                                <dt>Post state</dt>
                                <dd id="post-status">
                                    {{ $parent.postData.status }}
                                </dd>
                            </dl>

                            <dl>
                                <dt>Author</dt>
                                <dd>
                                    <a
                                        href="#"
                                        @click.prevent="changeAuthor">
                                        {{ authorName }}
                                    </a>
                                </dd>
                            </dl>

                            <dl>
                                <dt>Published</dt>
                                <dd>
                                    <a
                                        href="#"
                                        @click.prevent="changeDate">
                                        {{ $parent.postData.creationDate.text }}
                                    </a>
                                </dd>
                            </dl>

                            <dl>
                                <dt>Updated on</dt>
                                <dd id="post-date-modified">
                                    {{ $parent.postData.modificationDate.text }}
                                </dd>
                            </dl>
                        </div>
                        
                        <div
                            v-if="!isEdit"
                            class="post-info post-info--nogrid">
                            
                            <dl>
                                <dt>Post author</dt>
                                <dd>
                                    <dropdown
                                        id="post-author-id"
                                        v-model="$parent.postData.author"
                                        :items="authors"></dropdown>
                                </dd>
                            </dl>
                            
                            <dl class="post-date">
                                <dt>Published</dt>
                                <dd>
                                    <a
                                        href="#"
                                        @click.prevent="changeDate">
                                        
                                        <template v-if="!$parent.postData.creationDate.text">
                                            Set custom post date
                                        </template>

                                        <template v-if="$parent.postData.creationDate.text">
                                            Change post date 

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
                                    Mark as featured 
                                </span>

                                <icon
                                    title="Mark as featured"
                                    class="switcher-item-icon-helper"
                                    name="featured-post"
                                    size="xs"
                                    primaryColor="color-helper-1" />
                            </label>

                            <label id="post-hidden-wrapper">
                                <switcher 
                                    title="Post will not appear in any generated post lists such as tag or author pages"
                                    v-model="$parent.postData.isHidden" />
                                <span title="Post will not appear in any generated post lists such as tag or author pages">
                                    Hide post
                                </span>

                                <icon
                                    title="Hide Post"
                                    class="switcher-item-icon-helper"
                                    name="hidden-post"
                                    size="xs"
                                    primaryColor="color-6" />
                            </label>

                            <label id="post-excluded-homepage-wrapper">
                                <switcher 
                                    title="Post will not appear on homepage listing"
                                    v-model="$parent.postData.isExcludedOnHomepage" />
                                <span title="Post will not appear on homepage listing">
                                    Exclude from homepage
                                </span>

                                <icon
                                    title="Exclude from homepage"
                                    class="switcher-item-icon-helper"
                                    name="excluded-post"
                                    size="xs"
                                    primaryColor="color-3"/>
                            </label>
                        </div>
                    </div>
                </div>
            </div>

            <div class="post-editor-settings-wrapper">
                <div
                    :class="{ 'post-editor-settings-header': true, 'is-open': openedItem === 'image' }"
                    @click="openItem('image')">
                    <icon
                        class="post-editor-settings-icon"
                        size="s"
                        name="sidebar-image"/>

                    <span class="post-editor-settings-label">Featured image</span>
                </div>

                <div
                    class="post-editor-settings"
                    ref="image-content-wrapper">
                    <div
                        class="post-editor-settings-content"
                        ref="image-content">
                        <image-upload
                            ref="featured-image"
                            :post-id="$parent.postID"
                            v-model="$parent.postData.featuredImage.path" />

                        <div
                            v-if="$parent.postData.featuredImage.path"
                            class="image-uploader-settings-form">
                            <label>Alternative text
                                <text-input
                                    ref="featured-image-alt"
                                    v-model="$parent.postData.featuredImage.alt" />
                            </label>

                            <label>Caption
                                <text-input
                                    ref="featured-image-caption"
                                    v-model="$parent.postData.featuredImage.caption" />
                            </label>

                            <label>Credits
                                <text-input
                                    ref="featured-image-credits"
                                    v-model="$parent.postData.featuredImage.credits" />
                            </label>
                        </div>
                    </div>
                </div>

                <div class="post-editor-settings-wrapper">
                    <div
                        :class="{ 'post-editor-settings-header': true, 'is-open': openedItem === 'tags' }"
                        @click="openItem('tags')">
                        <icon
                            class="post-editor-settings-icon"
                            size="s"
                            name="sidebar-tags"/>

                        <span class="post-editor-settings-label">Tags</span>
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
                                        tag-placeholder="Add this as new tag"
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
                                        This tag is not allowed
                                    </small>
                                </label>
                            </div>

                            <div 
                                v-if="$parent.postData.tags.length > 1"
                                class="post-main-tag">
                                <label>
                                    Main tag:
                                    <dropdown
                                        id="post-main-tag"
                                        v-model="$parent.postData.mainTag"
                                        :items="tagsForDropdown">
                                    </dropdown>

                                    <small class="note">                                        
                                        If the post has tags but no main tag has been set, the first tag alphabetically will be used by default.
                                    </small>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="post-editor-settings-wrapper">
                    <div
                        :class="{ 'post-editor-settings-header': true, 'is-open': openedItem === 'seo' }"
                        @click="openItem('seo')">
                        <icon
                            class="post-editor-settings-icon"
                            size="s"
                            name="sidebar-seo"/>

                        <span class="post-editor-settings-label">
                            SEO

                            <span 
                                v-if="$parent.postData.slug.length > 250"
                                class="post-editor-settings-label-warning">
                                Post slug is too long
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
                                <label>Post slug:
                                    <input
                                        type="text"
                                        v-model="$parent.postData.slug"
                                        spellcheck="false"
                                        @keyup="$parent.slugUpdated">
                                    <small 
                                        v-if="$parent.postData.slug.length > 250"
                                        class="note is-warning">
                                        The post slug longer than 250 characters can lead to creation of broken files during the website rendering.
                                    </small>
                                </label>

                                <label class="with-char-counter">
                                    Page title:
                                    <text-input
                                        type="text"
                                        v-model="$parent.postData.metaTitle"
                                        placeholder="Leave blank to use a default Page title"
                                        :charCounter="true"
                                        :preferredCount="70" />
                                    <small class="note">The following variables can be used in the Page Title: %posttitle, %sitename, %authorname </small>
                                </label>

                                <label>
                                    Meta description:
                                    <text-area
                                        v-model="$parent.postData.metaDescription"
                                        :charCounter="true"
                                        :preferredCount="160"></text-area>
                                </label>

                                <label>
                                    Meta robots index:
                                    <dropdown
                                        id="post-meta-robots"
                                        v-model="$parent.postData.metaRobots"
                                        :items="metaRobotsOptions">
                                    </dropdown>
                                </label>

                                <label>
                                    Canonical URL:
                                    <input
                                        type="text"
                                        v-model="$parent.postData.canonicalUrl"
                                        spellcheck="false"
                                        placeholder="Leave blank to use a default Page URL" />
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="post-editor-settings-wrapper">
                <div
                    :class="{ 'post-editor-settings-header': true, 'is-open': openedItem === 'other' }"
                    @click="openItem('other')">
                    <icon
                        class="post-editor-settings-icon"
                        size="s"
                        name="sidebar-options"/>

                    <span class="post-editor-settings-label">Other options</span>
                </div>

                <div
                    class="post-editor-settings"
                    ref="other-content-wrapper">
                    <div
                        class="post-editor-settings-content"
                        ref="other-content">
                        <div class="post-other" id="post-view-settings">
                            <label id="post-template-wrapper">
                                Post template:

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
                                        Use global configuration
                                    </option>
                                    <option
                                        v-if="hasPostTemplates"
                                        value=""
                                        :selected="$parent.postData.template === ''"
                                        slot="first-choice">
                                        Default template
                                    </option>
                                    <option
                                        v-if="!hasPostTemplates"
                                        value=""
                                        slot="first-choice">
                                        Not available in your theme
                                    </option>
                                </dropdown>

                                <small
                                    v-if="$parent.postData.template === '*'"
                                    slot="note">
                                    Current default template: 
                                    <strong>
                                        {{ $store.state.currentSite.themeSettings.postTemplates[$store.state.currentSite.themeSettings.defaultTemplates.post] }}
                                    </strong>
                                </small>
                            </label>

                            <template v-for="(field, index) of postViewThemeSettings">
                                <label
                                    v-if="displayField(field)"
                                    :key="'post-view-field-' + index">
                                    {{ field.label }}

                                    <dropdown
                                        v-if="!field.type || field.type === 'select'"
                                        :id="field.name + '-select'"
                                        class="post-view-settings"
                                        v-model="$parent.postData.postViewOptions[field.name]"
                                        :items="generateItems(field.options)">
                                        <option slot="first-choice" value="">Use global configuration</option>
                                    </dropdown>

                                    <text-input
                                        v-if="field.type === 'text' || field.type === 'number'"
                                        :type="field.type"
                                        class="post-view-settings"
                                        :placeholder="fieldPlaceholder(field)"
                                        v-model="$parent.postData.postViewOptions[field.name]" />

                                    <text-area
                                        v-if="field.type === 'textarea'"
                                        class="post-view-settings"
                                        :placeholder="fieldPlaceholder(field)"
                                        v-model="$parent.postData.postViewOptions[field.name]" />

                                    <color-picker
                                        v-if="field.type === 'colorpicker'"
                                        class="post-view-settings"
                                        v-model="$parent.postData.postViewOptions[field.name]">
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
                'index, follow': 'index, follow',
                'index, nofollow': 'index, nofollow',
                'noindex, follow': 'noindex, follow',
                'noindex, nofollow': 'noindex, nofollow'
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
                label: 'Not set'
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
                'amp',
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

			return 'Leave it blank to use default value';
        },
        resetCreationDate () {
            this.$parent.postData.creationDate.timestamp = 0;
            this.$parent.postData.creationDate.text = '';
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
@import '../../scss/mixins.scss';

.post-editor {
    &-sidebar {
        background: var(--option-sidebar-bg);
        border-left: 1px solid var(--input-border-color);
        height: calc(100vh - 2.2rem);
        overflow: auto;
        opacity: 0;
        pointer-events: none;
        position: absolute;
        right: 0;
        top: 2.2rem;       
        width: 44.2rem;
        z-index: 99999;

        &.is-visible {   
            opacity: 1;
            pointer-events: auto;
        }

        &:before {
            background: linear-gradient(to bottom, var(--option-sidebar-bg) 0%,var(--option-sidebar-bg) 75%,transparent 100%);
            content: "";
            height: 12rem;
            position: fixed;
            top: 2.2rem;
            right: 0;
            width: 44.1rem;
            z-index: 1;
        }

        & > div {
            padding: 12.5rem 0 0 0;
        }

        &-header {
            font-size: 1.8rem;
            margin-top: -3.6rem;
            padding: calc(1rem + 0.6vw) 3.6rem;
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
                font-size: 1.5rem;
                margin: 0 0 .5rem 0;
            }

            dd {
                color: var(--gray-4);
                font-size: 1.4rem;
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
                    font-size: 1.6rem;
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
                  font-weight: 400;
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
                padding: 0 3.6rem 3.6rem;

                .image-uploader {
                    margin-top: 0;
                }
            }

            &-header {
                align-items: center;               
                border-top: 1px solid var(--input-border-color);     
                color: var(--link-tertiary-color);
                cursor: pointer;
                display: flex;
                height: 6.4rem;
                margin-left: 3.6rem;
                margin-top: -1px;
                padding: 0;
                position: relative;
                transition: var(--transition);
                user-select: none;
                width: calc(100% - 7.2rem);
    
                &:hover {
                    color: var(--link-tertiary-hover-color);                    
                }

                &.is-open {
                    .post-editor-settings {
                        &-label {
                            left: -3.6rem;
                        }

                        &-icon {
                            left: -1.6rem;
                            position: relative;
                            opacity: 0;
                        }
                    }
                }
            }

            &-label {                
                font-weight: 600;
                left: 0;
                position: relative;
                transition: left .25s ease-out, color .0s ease-out;
                width: calc(100% - 5.8rem);

                &-warning {
                    color: var(--warning);
                    font-size: 1.2rem;
                    margin-left: 1rem;
                }
            }

            &-icon {
                fill: var(--primary-color); 
                left: 0;
                height: 2.4rem;
                margin-right: 1.6rem;
                opacity: 1;
                position: relative;
                transition: var(--transition);
                width: 2.4rem;
            }

            label {
                color: var(--label-color);
                display: block;
                font-size: 1.5rem;
                font-weight: 500;
                line-height: 2.6;
                margin: 0 0 1.2rem 0;

                input[type="text"],
                input[type="number"],
                select,
                textarea {
                    background-color: var(--input-bg);
                    width: 100%;
                }

                textarea {
                    height: 100px;
                }

                &.with-char-counter {
                    .note {
                        margin-top: -3rem;
                        width: 70%;
                    }
                }
            }            

            #post-featured-wrapper {
                margin-top: 0;
            }
        }

        .note {
            clear: both;
            color: var(--text-light-color);
            display: block;
            font-size: 1.4rem;
            font-style: italic;
            line-height: 1.4;            
            padding-top: .5rem;

            &.is-warning {
                color: var(--warning);
                opacity: 1;
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
 * Special styles for win
 */

body[data-os="win"] {
    .post-editor-sidebar {
        height: calc(100vh - 3.8rem);
        top: 3.8rem;

        &:before {
            top: 3.8rem;
        }
    }
}

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
        background: var(--primary-color);
    }

    .select2-dropdown {
        background-color: var(--white);
        border: 1px solid var(--input-border-color);
        border-radius: 3px;
    }
}
</style>
