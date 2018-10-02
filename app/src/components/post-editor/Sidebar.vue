<template>
    <div class="post-editor-sidebar">
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
                        size="m"
                        name="sidebar-status"
                        primaryColor="grey-icon-color" />

                    <span class="post-editor-settings-label">Status</span>

                    <icon
                        class="post-editor-settings-icon-open"
                        size="m"
                        name="sidebar-arrow"
                        primaryColor="color-1" />

                    <icon
                        class="post-editor-settings-icon-close"
                        size="m"
                        name="sidebar-close"
                        primaryColor="color-3"
                        @click.native="closeItem" />
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

                        <label
                            v-if="!isEdit"
                            class="post-author-selector">
                            Post author:

                            <dropdown
                                id="post-author-id"
                                v-model="$parent.postData.author"
                                :items="authors"></dropdown>
                        </label>


                        <label id="post-featured-wrapper">
                            <switcher
                                v-model="$parent.postData.isFeatured" />
                            Feature this post in listings

                            <icon
                                title="Mark this post as featured"
                                class="switcher-item-icon-helper"
                                name="featured-post"
                                size="xs"
                                primaryColor="color-helper-1" />
                        </label>


                        <label id="post-hidden-wrapper">
                            <switcher
                                v-model="$parent.postData.isHidden" />
                            Hide this post in listings

                            <icon
                                title="Mark this post as hidden"
                                class="switcher-item-icon-helper"
                                name="hidden-post"
                                size="xs"
                                primaryColor="color-6" />
                        </label>
                    </div>
                </div>
            </div>

            <div class="post-editor-settings-wrapper">
                <div
                    :class="{ 'post-editor-settings-header': true, 'is-open': openedItem === 'image' }"
                    @click="openItem('image')">
                    <icon
                        class="post-editor-settings-icon"
                        size="m"
                        name="sidebar-image"
                        primaryColor="grey-icon-color" />

                    <span class="post-editor-settings-label">Featured image</span>

                    <icon
                        class="post-editor-settings-icon-open"
                        size="m"
                        name="sidebar-arrow"
                        primaryColor="color-1" />

                    <icon
                        class="post-editor-settings-icon-close"
                        size="m"
                        name="sidebar-close"
                        primaryColor="color-3"
                        @click.native="closeItem" />
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
                            size="m"
                            name="sidebar-tags"
                            primaryColor="grey-icon-color" />

                        <span class="post-editor-settings-label">Tags</span>

                        <icon
                            class="post-editor-settings-icon-open"
                            size="m"
                            name="sidebar-arrow"
                            primaryColor="color-1" />

                        <icon
                            class="post-editor-settings-icon-close"
                            size="m"
                            name="sidebar-close"
                            primaryColor="color-3"
                            @click.native="closeItem" />
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
                                        @tag="addTag"></v-select>

                                    <small
                                        v-if="tagIsRestricted"
                                        class="post-tags-error">
                                        This tag is not allowed
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
                            size="m"
                            name="sidebar-seo"
                            primaryColor="grey-icon-color" />

                        <span class="post-editor-settings-label">SEO</span>

                        <icon
                            class="post-editor-settings-icon-open"
                            size="m"
                            name="sidebar-arrow"
                            primaryColor="color-1" />

                        <icon
                            class="post-editor-settings-icon-close"
                            size="m"
                            name="sidebar-close"
                            primaryColor="color-3"
                            @click.native="closeItem" />
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
                                        @keyup="$parent.slugUpdated">
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
                        size="m"
                        name="sidebar-options"
                        primaryColor="grey-icon-color" />

                    <span class="post-editor-settings-label">Other options</span>

                    <icon
                        class="post-editor-settings-icon-open"
                        size="m"
                        name="sidebar-arrow"
                        primaryColor="color-1" />

                    <icon
                        class="post-editor-settings-icon-close"
                        size="m"
                        name="sidebar-close"
                        primaryColor="color-3"
                        @click.native="closeItem" />
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
                                        value=""
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
        postTemplates () {
            return this.$store.state.currentSite.themeSettings.postTemplates;
        },
        hasPostTemplates () {
            return !!Object.keys(this.postTemplates).length;
        },
        postViewThemeSettings () {
            return this.$store.state.currentSite.themeSettings.postConfig;
        }
    },
    mounted () {
        this.$bus.$on('author-changed', (newAuthor) => {
            this.$parent.postData.author = parseInt(newAuthor, 10);
        });
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
        background: $color-10;
        height: calc(100vh - 8.4rem);
        overflow: auto;
        position: relative;
        width: 50rem;

        &:after {
            background: linear-gradient(180deg, rgba(255, 255, 255, 0), rgba(255, 255, 255, 1)),
            linear-gradient(180deg, rgba(255, 255, 255, 0), rgba(255, 255, 255, 1));
            bottom: 0;
            content: "";
            height: 40px;
            left: auto;
            pointer-events: none;
            position: fixed;
            right: 5px;
            width: 49.5rem;
            z-index: 1;
        }

        & > div {
            padding: 3.6rem 0 0 0;
        }

        &-header {
            font-size: 1.8rem;
            margin-top: -3.6rem;
            padding: calc(1rem + 0.6vw) 3.6rem;
        }

        .post-info {
            border-bottom: 1px solid rgba($color-8, .4);
            display: grid;
            grid-template-columns: 50% 50%;
            margin-bottom: 3rem;
            padding-bottom: 1rem;

            dl {
                margin: 0 0 3rem 0;
            }

            dt {
                color: $color-4;
                margin: 0 0 .5rem 0;
            }

            dd {
                color: $color-7;
                font-size: 1.4rem;
                margin: 0;
            }
        }

        .post-editor-settings {
            .post-author-selector {
                border-bottom: 1px solid $color-9;
                margin-bottom: 2rem;
                padding-bottom: 3rem;
            }
        }

        .post-tags {
            line-height: 2;
            margin-bottom: 0;

            &-error {
                color: $color-3;
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

            .multiselect__input {
                max-width: 120px;
            }
        }

        .post-editor-settings {
            max-height: 0;
            overflow: hidden;
            transition: max-height .25s ease-out;

            &-content {
                background: $post-editor-sidebar-color;
                padding: 0 3.6rem 3.6rem 3.6rem;

                .image-uploader {
                    margin-top: 0;
                }
            }

            &-header {
                align-items: center;
                border-top: 1px solid rgba($color-8, .25);
                border-bottom: 1px solid rgba($color-8, .25);
                color: $link-color;
                cursor: pointer;
                display: flex;
                height: 6.4rem;
                margin-top: -1px;
                padding: 0 3.6rem;
                position: relative;
                transition: all .25s ease-out;
                user-select: none;

                &:hover {
                    color: $color-4;

                    .post-editor-settings {
                        &-icon {
                            fill: $color-4;

                            &-open,
                            &-close {
                                fill: $color-4;
                            }
                        }
                    }
                }

                &.is-open {
                    background: $post-editor-sidebar-color;
                    border-bottom-color: $post-editor-sidebar-color;

                    .post-editor-settings {
                        &-label {
                            color: $color-4;
                            font-weight: 500;
                            left: -4.8rem;
                        }

                        &-icon {
                            left: -1.6rem;
                            opacity: 0;

                            &-open {
                                opacity: 0;
                            }

                            &-close {
                                opacity: 1;
                            }
                        }
                    }
                }
            }

            &-label {
                font-weight: 400;
                left: 0;
                position: relative;
                transition: left .25s ease-out, color .0s ease-out;
                width: calc(100% - 5.8rem);
            }

            &-icon {
                fill: $grey-icon-color;
                left: 0;
                height: 2.4rem;
                margin-right: 2.4rem;
                opacity: 1;
                position: relative;
                transition: all .25s ease-out;
                width: 2.4rem;

                &-open,
                &-close {
                    position: absolute;
                    height: 2.4rem;
                    right: 3.6rem;
                    top: 2.3rem;
                    width: 2.4rem;

                    &:hover {
                        fill: $color-4;
                    }
                }

                &-open {
                    fill: $color-1;
                    opacity: 1;
                }

                &-close {
                    fill: $danger-color;
                    height: 2.8rem;
                    opacity: 0;
                    right: 3.8rem;
                    top: 1.9rem;
                    pointer-events: none;
                    width: 2.8rem;
                }
            }

            label {
                display: block;
                line-height: 2;
                margin: 0 0 1rem 0;

                input[type="text"],
                input[type="number"],
                select,
                textarea {
                    background-color: $color-10;
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
            display: block;
            font-size: 1.4rem;
            font-style: italic;
            line-height: 1.4;
            opacity: .6;
            padding-top: .5rem;
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
        height: calc(100vh - 10rem);
    }
}

body[data-os="linux"] {
    .post-editor-sidebar {
        height: calc(100vh - 6.2rem);
    }
}

/*
 * Responsive improvements
 */
@media (max-height: 900px) {
    .post-editor-sidebar {
        width: 40rem;

        &:after {
            width: 39.5rem;
        }
    }
}

@media (max-width: 1200px) {
    .post-editor-sidebar {
        width: 40rem;

        &:after {
            width: 39.5rem;
        }

        .post-editor-settings {
            &-header {
                padding: 0 3rem;
            }

            &-content {
                padding: 0 3rem 3rem 3rem;
            }
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
        background: $color-1;
    }

    .select2-dropdown {
        background-color: $color-10;
        border: 1px solid $color-8;
        border-radius: 3px;
    }
}
</style>
